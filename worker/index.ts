import {
  ALLOWED_ANALYSES,
  ALLOWED_CHARTS,
  AnalysisPlanSchema,
  type AllowedAnalysis,
  type AnalysisPlan,
  type GroupDescriptiveSummary,
  type InterpretationContract,
} from '../src/lib/contracts';
import { verifyInterpretationClaims } from '../src/lib/claimVerifier';

export const WORKERS_AI_MODEL =
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast' as const;
const MAX_PAYLOAD_BYTES = 32 * 1024; // 32 KB strict cap (blocks raw CSV uploads)

export interface Env {
  AI?: {
    run: (model: string, input: Record<string, unknown>) => Promise<unknown>;
  };
  ASSETS?: {
    fetch: (request: Request) => Promise<Response>;
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function extractJsonObject(raw: unknown): unknown {
  if (!raw) return null;
  if (typeof raw === 'object') {
    const r = raw as Record<string, unknown>;
    if (r.response !== undefined) {
      if (typeof r.response === 'object') return r.response;
      if (typeof r.response === 'string') {
        try {
          return JSON.parse(r.response);
        } catch {
          const match = r.response.match(/\{[\s\S]*\}/);
          if (match) {
            try {
              return JSON.parse(match[0]);
            } catch {
              return null;
            }
          }
        }
      }
    }
    return raw;
  }
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function buildWorkerFallbackPlan(body: Record<string, unknown>): AnalysisPlan {
  const objective = String(body.objective ?? '').toLowerCase();
  const selected = (body.selected_columns ?? {}) as Record<
    string,
    string | undefined
  >;
  const schemaSummary = (body.schema_summary ?? {}) as Record<string, unknown>;
  const unit = String(schemaSummary.confirmed_unit ?? 'arbitrary units');
  const independent = schemaSummary.independent_observations !== false;
  const cols = Array.isArray(schemaSummary.columns)
    ? (schemaSummary.columns as Array<Record<string, unknown>>)
    : [];

  const groupCol = selected.group || String(cols[0]?.name ?? 'group');
  const valueCol =
    selected.value ||
    selected.y ||
    String(cols[cols.length - 1]?.name ?? 'response');
  const xCol = selected.x || groupCol;
  const yCol = selected.y || valueCol;

  const warnings: string[] = [];
  if (/anova|kruskal|mann-whitney|logistic|mixed model|survival/i.test(objective)) {
    warnings.push(
      'Requested method is outside the MVP allowlist; selected closest allowlisted method.'
    );
  }
  if (/caus(e|al|ation)|prove/i.test(objective)) {
    warnings.push(
      'Statistical tests evaluate sample differences or linear association and cannot by themselves prove causation.'
    );
  }

  if (/correlat|pearson|scatter|exposure|dose/i.test(objective)) {
    return {
      analysis: 'pearson',
      chart: /time|order/i.test(objective) ? 'time_series' : 'scatter',
      columns: { x: xCol, y: yCol, value: yCol },
      confidence: 'requires_confirmation',
      assumptions_to_confirm: [
        `Variables "${xCol}" and "${yCol}" are continuous measurements (${unit})`,
        'Observations are independent paired records',
        'Pearson r measures linear association only',
      ],
      rationale: `Selected two-sided Pearson correlation and scatterplot for "${xCol}" and "${yCol}".`,
      warnings,
    };
  }

  const groupMeta = cols.find((c) => c.name === groupCol);
  const distinctCount = Number(groupMeta?.distinct_count ?? 2);

  if (
    !/descriptive|summarize only/i.test(objective) &&
    distinctCount === 2 &&
    independent
  ) {
    return {
      analysis: 'welch_t',
      chart: 'grouped_points',
      columns: {
        group: groupCol,
        value: valueCol,
        x: groupCol,
        y: valueCol,
      },
      confidence: 'requires_confirmation',
      assumptions_to_confirm: [
        `Observations across "${groupCol}" are independent`,
        `Response "${valueCol}" is continuous in ${unit}`,
        'Welch two-sample t-test compares group means without assuming equal variance',
      ],
      rationale: `Selected two-sided Welch's independent two-group t-test and grouped raw-point plot for "${valueCol}" across "${groupCol}".`,
      warnings,
    };
  }

  return {
    analysis: 'descriptive',
    chart: 'grouped_points',
    columns: {
      group: groupCol,
      value: valueCol,
      x: groupCol,
      y: valueCol,
    },
    confidence: 'requires_confirmation',
    assumptions_to_confirm: [
      `Response "${valueCol}" is reported in confirmed units (${unit})`,
      'Descriptive summary reports n, mean, SD, median, IQR, min, and max without a p-value',
    ],
    rationale: `Selected conservative Descriptive summaries and grouped observation plot for "${valueCol}".`,
    warnings,
  };
}

function buildWorkerFallbackInterpretation(
  body: Record<string, unknown>
): InterpretationContract {
  const method = (body.method as AllowedAnalysis) || 'descriptive';
  const unit = String(body.unit ?? 'arbitrary units');
  const direction = String(body.comparison_direction ?? 'Group B minus Group A');
  const nTotal = Number(body.n_total ?? 0);
  const numbers = (body.numbers ?? {}) as Record<string, number>;
  const limitations = Array.isArray(body.limitations)
    ? (body.limitations as string[]).slice(0, 8)
    : [
        'Statistical summaries and tests do not by themselves establish causal mechanism.',
      ];

  const verified_claims = Object.entries(numbers)
    .filter(([, v]) => typeof v === 'number' && Number.isFinite(v))
    .slice(0, 12)
    .map(([key, value]) => ({ key, value }));

  if (method === 'welch_t' && Number.isFinite(numbers.t_b_minus_a)) {
    const diff = numbers.difference_b_minus_a;
    const tVal = numbers.t_b_minus_a;
    const df = numbers.df;
    const pVal = numbers.p_two_sided;
    const ciLow = numbers.ci95_low;
    const ciHigh = numbers.ci95_high;
    return {
      headline: `Welch two-group comparison (${direction}): Δ = ${diff?.toFixed(
        3
      )} ${unit} (p = ${pVal?.toExponential(3)})`,
      summary: `Two-sided Welch's t-test (${direction}, n = ${nTotal} total) yielded a mean difference of ${diff?.toFixed(
        4
      )} ${unit} (95% CI [${ciLow?.toFixed(4)}, ${ciHigh?.toFixed(
        4
      )}], t = ${tVal?.toFixed(4)}, df = ${df?.toFixed(
        3
      )}, p = ${pVal?.toExponential(4)}).`,
      figure_caption: `Figure: Individual observations (n = ${nTotal}) with group means and 95% confidence intervals (${unit}). Welch's t-test: t(${df?.toFixed(
        2
      )}) = ${tVal?.toFixed(3)}, p = ${pVal?.toExponential(3)}.`,
      limitations:
        limitations.length > 0
          ? limitations
          : [
              'Two-group comparison does not by itself establish causal mechanism.',
            ],
      verified_claims,
    };
  }

  if (method === 'pearson' && Number.isFinite(numbers.r)) {
    return {
      headline: `Pearson linear correlation: r = ${numbers.r.toFixed(
        4
      )} (n = ${numbers.n}, p = ${numbers.p_two_sided?.toExponential(3)})`,
      summary: `Across n = ${numbers.n} complete pairs, Pearson correlation was r = ${numbers.r.toFixed(
        4
      )} (two-sided p = ${numbers.p_two_sided?.toExponential(
        4
      )}). Correlation measures linear association only and does not prove causation.`,
      figure_caption: `Figure: Paired observations (n = ${numbers.n}) with linear trend (${unit}). Pearson r = ${numbers.r.toFixed(
        4
      )}, p = ${numbers.p_two_sided?.toExponential(3)}.`,
      limitations:
        limitations.length > 0
          ? limitations
          : [
              'Pearson correlation measures linear association and does not establish causation.',
            ],
      verified_claims,
    };
  }

  const groupSummaries = Array.isArray(body.group_summaries)
    ? (body.group_summaries as GroupDescriptiveSummary[])
    : [];

  return {
    headline: `Descriptive statistical summary (n = ${nTotal}, ${unit})`,
    summary: `Summarized ${nTotal} valid observations across ${
      groupSummaries.length || 1
    } group(s) in ${unit} without running a formal hypothesis test.`,
    figure_caption: `Figure: Individual observations (n = ${nTotal}) plotted in ${unit} with group summary markers.`,
    limitations:
      limitations.length > 0
        ? limitations
        : ['Descriptive summary only; no inferential p-value was computed.'],
    verified_claims,
  };
}

export async function handleApiRequest(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname === '/api/health' && request.method === 'GET') {
    return jsonResponse({
      ok: true,
      service: 'evidenceplot-ai',
      aiConfigured: Boolean(env?.AI),
      model: WORKERS_AI_MODEL,
      version: '0.1.0',
    });
  }

  if (
    (url.pathname === '/api/ai/plan' || url.pathname === '/api/ai/interpret') &&
    request.method === 'POST'
  ) {
    const rawText = await request.text();
    if (rawText.length > MAX_PAYLOAD_BYTES) {
      return jsonResponse(
        {
          error: {
            code: 'PAYLOAD_TOO_LARGE',
            message:
              'Request payload exceeds 32 KB limit. Raw CSV datasets must never be sent to AI endpoints.',
            retryable: false,
          },
        },
        413
      );
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawText) as Record<string, unknown>;
    } catch {
      return jsonResponse(
        {
          error: {
            code: 'INVALID_JSON',
            message: 'Request body must be valid JSON.',
            retryable: false,
          },
        },
        400
      );
    }

    // Privacy Boundary P0 Guard: Reject any request that includes raw CSV rows
    if (
      Array.isArray(body.rows) ||
      typeof body.rawCsv === 'string' ||
      typeof body.raw_csv === 'string'
    ) {
      return jsonResponse(
        {
          error: {
            code: 'RAW_ROWS_PROHIBITED',
            message:
              'Privacy boundary violation: Raw dataset rows (P0) are prohibited on AI endpoints. Send sanitized P1 schema metadata or P2 verified statistics only.',
            retryable: false,
          },
        },
        400
      );
    }

    // Route 1: POST /api/ai/plan
    if (url.pathname === '/api/ai/plan') {
      const fallbackPlan = buildWorkerFallbackPlan(body);

      if (!env?.AI) {
        return jsonResponse({
          source: 'deterministic_fallback',
          prompt_version: 'ep-plan-v1.0',
          fallback_reason:
            'Cloudflare Workers AI binding not active in current environment — using deterministic rule planner.',
          plan: fallbackPlan,
        });
      }

      try {
        const aiRaw = await env.AI.run(WORKERS_AI_MODEL, {
          messages: [
            {
              role: 'system',
              content: `You are the scientific analysis planner for EvidencePlot AI.
You ONLY select from allowlisted analyses: ${ALLOWED_ANALYSES.join(', ')}.
You ONLY select from allowlisted charts: ${ALLOWED_CHARTS.join(', ')}.
Never invent columns or numbers. Always set confidence to "requires_confirmation" or "cannot_proceed".
Return strict JSON matching the schema: { analysis, chart, columns: { group?, value?, x?, y? }, confidence, assumptions_to_confirm: string[], rationale: string, warnings: string[] }.`,
            },
            {
              role: 'user',
              content: JSON.stringify({
                objective: body.objective,
                schema_summary: body.schema_summary,
                selected_columns: body.selected_columns,
              }),
            },
          ],
          temperature: 0.1,
          max_tokens: 600,
        });

        const candidate = extractJsonObject(aiRaw);
        const parsed = AnalysisPlanSchema.safeParse(candidate);
        if (!parsed.success) {
          return jsonResponse({
            source: 'deterministic_fallback',
            prompt_version: 'ep-plan-v1.0',
            fallback_reason:
              'Workers AI output did not pass strict AnalysisPlanSchema validation — fell back to deterministic plan.',
            plan: fallbackPlan,
          });
        }

        return jsonResponse({
          source: 'ai',
          model_id: WORKERS_AI_MODEL,
          prompt_version: 'ep-plan-v1.0',
          plan: parsed.data,
        });
      } catch (err) {
        return jsonResponse({
          source: 'deterministic_fallback',
          prompt_version: 'ep-plan-v1.0',
          fallback_reason: `Workers AI call failed (${
            err instanceof Error ? err.message : 'runtime error'
          }) — using deterministic rule planner.`,
          plan: fallbackPlan,
        });
      }
    }

    // Route 2: POST /api/ai/interpret
    if (url.pathname === '/api/ai/interpret') {
      const fallbackInterp = buildWorkerFallbackInterpretation(body);
      const verifiedNumbers = (body.numbers ?? {}) as Record<string, number>;
      const nTotal =
        typeof body.n_total === 'number' ? body.n_total : undefined;

      if (!env?.AI) {
        return jsonResponse({
          source: 'deterministic_template',
          prompt_version: 'ep-interpret-v1.0',
          fallback_reason:
            'Cloudflare Workers AI binding not active in current environment — using verified deterministic template.',
          interpretation: fallbackInterp,
        });
      }

      try {
        const aiRaw = await env.AI.run(WORKERS_AI_MODEL, {
          messages: [
            {
              role: 'system',
              content: `You are the scientific figure caption and statistical narrator for EvidencePlot AI.
CRITICAL RULES:
1. You may ONLY cite numbers that appear in the provided "numbers" dictionary. Never compute or invent any number.
2. Every number you cite in verified_claims MUST use the exact key and value from "numbers".
3. Never claim that a statistical test proves causation ("proves causation", "directly caused", "definitive proof").
4. Return strict JSON matching: { headline: string, summary: string, figure_caption: string, limitations: string[], verified_claims: Array<{ key: string, value: number }> }.`,
            },
            {
              role: 'user',
              content: JSON.stringify({
                objective: body.objective,
                method: body.method,
                unit: body.unit,
                comparison_direction: body.comparison_direction,
                n_total: body.n_total,
                numbers: verifiedNumbers,
                group_summaries: body.group_summaries,
                limitations: body.limitations,
              }),
            },
          ],
          temperature: 0.1,
          max_tokens: 800,
        });

        const candidate = extractJsonObject(aiRaw);
        const verification = verifyInterpretationClaims(
          candidate,
          verifiedNumbers,
          nTotal
        );

        if (!verification.valid) {
          return jsonResponse({
            source: 'deterministic_template',
            prompt_version: 'ep-interpret-v1.0',
            fallback_reason: `Workers AI response rejected by claim verifier (${verification.reason}) — fell back to deterministic caption.`,
            interpretation: fallbackInterp,
          });
        }

        return jsonResponse({
          source: 'ai',
          model_id: WORKERS_AI_MODEL,
          prompt_version: 'ep-interpret-v1.0',
          interpretation: candidate,
        });
      } catch (err) {
        return jsonResponse({
          source: 'deterministic_template',
          prompt_version: 'ep-interpret-v1.0',
          fallback_reason: `Workers AI call failed (${
            err instanceof Error ? err.message : 'runtime error'
          }) — using verified deterministic caption.`,
          interpretation: fallbackInterp,
        });
      }
    }
  }

  return jsonResponse(
    {
      error: {
        code: 'NOT_FOUND',
        message: `Endpoint ${url.pathname} not found.`,
        retryable: false,
      },
    },
    404
  );
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      return handleApiRequest(request, env);
    }
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }
    return new Response('Not Found', { status: 404 });
  },
};
