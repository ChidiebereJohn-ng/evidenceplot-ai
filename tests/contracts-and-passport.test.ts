import { describe, expect, it } from 'vitest';
import { parseAndValidateCsvBuffer } from '../src/lib/csvParser';
import { profileDataset } from '../src/lib/dataProfiler';
import { runStatisticalAnalysis } from '../src/lib/scientificEngine';
import { generateDeterministicInterpretation } from '../src/lib/deterministicCaption';
import { verifyInterpretationClaims } from '../src/lib/claimVerifier';
import {
  buildEvidencePassport,
  generateHtmlReport,
  generateMarkdownReport,
} from '../src/lib/passport';
import { AnalysisPlanSchema } from '../src/lib/contracts';
import { SYNTHETIC_GROUPS_CSV } from '../src/lib/sampleFixtures';

describe('Figure Evidence Passport, Claim Verifier & Schema Contracts', () => {
  it('builds a complete Figure Evidence Passport with SHA-256, zero silent outlier removal, and verified claims', async () => {
    const buffer = new TextEncoder().encode(SYNTHETIC_GROUPS_CSV).buffer;
    const parsed = await parseAndValidateCsvBuffer(
      'synthetic_groups.csv',
      buffer
    );
    const profile = profileDataset(parsed.headers, parsed.rows);

    const confirmedConfig = {
      idColumn: 'sample_id',
      groupColumn: 'group',
      valueColumn: 'response',
      unit: 'arbitrary units',
      unitConfirmed: true,
      independentObservations: true,
      designConfirmed: true,
    };
    const normalization = {
      trimAndNormalizeCategories: false,
      completeCaseFilter: true,
      redactIdentifiersFromAi: true,
    };

    const result = runStatisticalAnalysis({
      method: 'welch_t',
      rows: parsed.rows,
      normalization,
      confirmedConfig,
    });

    const interpretation = generateDeterministicInterpretation(
      result,
      confirmedConfig
    );

    const check = verifyInterpretationClaims(
      interpretation,
      result.numbers,
      result.n_total
    );
    expect(check.valid).toBe(true);

    const passport = buildEvidencePassport({
      fileName: parsed.fileName,
      sha256: parsed.sha256,
      profile,
      normalization,
      confirmedConfig,
      confirmedAssumptions: [
        'Independent observations across control and treatment groups',
      ],
      chartKind: 'grouped_points',
      styleConfig: {
        title: 'Response by Group',
        subtitle: 'Welch two-group t-test',
        xLabel: 'group',
        yLabel: 'response',
        unit: 'arbitrary units',
        palette: 'navy_teal',
        showRawPoints: true,
        showGroupMeans: true,
        showErrorBars: true,
        yAxisMin: null,
        yAxisMax: null,
      },
      result,
      interpretation,
    });

    expect(passport.schema_version).toBe('1.0');
    expect(passport.source.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(passport.source.rows).toBe(12);
    expect(passport.handling.outliers_removed).toBe(0);
    expect(passport.figure.plotted_observation_count).toBe(12);
    expect(passport.calculation.result.t_b_minus_a).toBeCloseTo(7.38001259, 6);
    expect(passport.ai_narrative?.verified_claims.length).toBeGreaterThanOrEqual(
      8
    );

    const md = generateMarkdownReport(passport, interpretation);
    expect(md).toContain(passport.source.sha256);
    expect(md).toContain('t_b_minus_a');

    const html = generateHtmlReport(
      passport,
      interpretation,
      '<svg id="test-svg"></svg>'
    );
    expect(html).toContain(passport.source.sha256);
    expect(html).toContain('<svg id="test-svg"></svg>');
  });

  it('rejects fabricated numeric claims and causal overclaims in verifyInterpretationClaims', () => {
    const engineNumbers = {
      n_a: 6,
      n_b: 6,
      difference_b_minus_a: 3.55,
      t_b_minus_a: 7.38001259,
      p_two_sided: 0.00002371,
    };

    // 1. Fabricated number (wrong p_two_sided)
    const fabricated = verifyInterpretationClaims(
      {
        headline: 'Treatment vs control comparison',
        summary: 'Mean difference was 3.55 units.',
        figure_caption: 'Grouped comparison plot.',
        limitations: ['Small sample size (n=6 per group).'],
        verified_claims: [
          { key: 'difference_b_minus_a', value: 3.55 },
          { key: 'p_two_sided', value: 0.049 }, // wrong!
        ],
      },
      engineNumbers,
      12
    );
    expect(fabricated.valid).toBe(false);
    expect(fabricated.reason).toMatch(/Numeric mismatch/i);

    // 2. Prohibited causal overclaim
    const causalOverclaim = verifyInterpretationClaims(
      {
        headline: 'Treatment proves causation of higher response',
        summary: 'This experiment proves that treatment directly caused the gain.',
        figure_caption: 'Grouped comparison plot.',
        limitations: ['Small sample size.'],
        verified_claims: [{ key: 'difference_b_minus_a', value: 3.55 }],
      },
      engineNumbers,
      12
    );
    expect(causalOverclaim.valid).toBe(false);
    expect(causalOverclaim.reason).toMatch(/causal overclaim/i);
  });

  it('rejects out-of-scope statistical methods in AnalysisPlanSchema', () => {
    const invalidPlan = AnalysisPlanSchema.safeParse({
      analysis: 'anova',
      chart: 'grouped_points',
      columns: { group: 'group', value: 'response' },
      confidence: 'requires_confirmation',
      assumptions_to_confirm: ['Independent observations'],
      rationale: 'Run one-way ANOVA',
      warnings: [],
    });
    expect(invalidPlan.success).toBe(false);
  });

  it('enforces P0 privacy boundary, Zod schema guard, and claim verifier on Cloudflare Worker AI endpoints', async () => {
    const { handleApiRequest } = await import('../worker/index');

    // 1. Health endpoint
    const healthRes = await handleApiRequest(
      new Request('http://localhost/api/health', { method: 'GET' }),
      {}
    );
    expect(healthRes.status).toBe(200);
    const healthJson = await healthRes.json();
    expect(healthJson.ok).toBe(true);
    expect(healthJson.model).toBe('@cf/meta/llama-3.3-70b-instruct-fp8-fast');

    // 2. Rejects raw CSV rows (P0 violation)
    const rawRowsRes = await handleApiRequest(
      new Request('http://localhost/api/ai/plan', {
        method: 'POST',
        body: JSON.stringify({
          objective: 'Compare groups',
          rows: [{ sample_id: 'SYN01', response: '8.2' }],
        }),
      }),
      {}
    );
    expect(rawRowsRes.status).toBe(400);
    const rawRowsJson = await rawRowsRes.json();
    expect(rawRowsJson.error.code).toBe('RAW_ROWS_PROHIBITED');

    // 3. Valid Workers AI plan response
    const validPlanRes = await handleApiRequest(
      new Request('http://localhost/api/ai/plan', {
        method: 'POST',
        body: JSON.stringify({
          objective: 'Compare control vs treatment response',
          schema_summary: {
            confirmed_unit: 'arbitrary units',
            independent_observations: true,
            columns: [
              { name: 'group', distinct_count: 2 },
              { name: 'response', distinct_count: 12 },
            ],
          },
          selected_columns: { group: 'group', value: 'response' },
        }),
      }),
      {
        AI: {
          run: async () => ({
            response: JSON.stringify({
              analysis: 'welch_t',
              chart: 'grouped_points',
              columns: { group: 'group', value: 'response' },
              confidence: 'requires_confirmation',
              assumptions_to_confirm: ['Independent observations'],
              rationale: 'Two independent groups with continuous response.',
              warnings: [],
            }),
          }),
        },
      }
    );
    expect(validPlanRes.status).toBe(200);
    const validPlanJson = await validPlanRes.json();
    expect(validPlanJson.source).toBe('ai');
    expect(validPlanJson.plan.analysis).toBe('welch_t');

    // 4. Rejects unverified AI claim in /api/ai/interpret and falls back deterministically
    const unverifiedInterpRes = await handleApiRequest(
      new Request('http://localhost/api/ai/interpret', {
        method: 'POST',
        body: JSON.stringify({
          objective: 'Compare groups',
          method: 'welch_t',
          unit: 'arbitrary units',
          comparison_direction: 'treatment minus control',
          n_total: 12,
          numbers: {
            n_a: 6,
            n_b: 6,
            difference_b_minus_a: 3.55,
            t_b_minus_a: 7.38001259,
            df: 9.9988,
            p_two_sided: 0.00002371,
            ci95_low: 2.4782,
            ci95_high: 4.6218,
          },
          limitations: ['Small sample size.'],
        }),
      }),
      {
        AI: {
          run: async () => ({
            response: JSON.stringify({
              headline: 'Hallucinated p-value headline',
              summary: 'Summary with fabricated number.',
              figure_caption: 'Caption.',
              limitations: ['Small sample size.'],
              verified_claims: [{ key: 'p_two_sided', value: 0.555 }], // Mismatch!
            }),
          }),
        },
      }
    );
    expect(unverifiedInterpRes.status).toBe(200);
    const unverifiedInterpJson = await unverifiedInterpRes.json();
    expect(unverifiedInterpJson.source).toBe('deterministic_template');
    expect(unverifiedInterpJson.fallback_reason).toMatch(/Numeric mismatch/i);
  });
});

