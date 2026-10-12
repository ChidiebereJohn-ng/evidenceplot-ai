import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bot,
  CheckCircle2,
  Cpu,
  Lock,
  ShieldAlert,
  Sliders,
  Sparkles,
} from 'lucide-react';
import type {
  AllowedAnalysis,
  AllowedChart,
  AnalysisPlan,
  ConfirmedDatasetConfig,
  DatasetProfile,
  NormalizationOptions,
} from '../lib/contracts';
import { AnalysisPlanSchema } from '../lib/contracts';

interface AnalysisPlanStepProps {
  fileName: string;
  profile: DatasetProfile;
  normalization: NormalizationOptions;
  confirmedConfig: ConfirmedDatasetConfig;
  onUpdateConfirmedConfig: (next: ConfirmedDatasetConfig) => void;
  runWithoutAi: boolean;
  onToggleRunWithoutAi: (val: boolean) => void;
  activePlan: AnalysisPlan | null;
  onConfirmPlanAndExecute: (
    plan: AnalysisPlan,
    researchObjective: string,
    confirmedAssumptions: string[]
  ) => void;
  onBackToData: () => void;
  isExecutingEngine: boolean;
}

const SAMPLE_OBJECTIVES = [
  {
    label: 'Two-group treatment vs control',
    prompt:
      'Compare treatment vs control enzyme activity in independent assay wells and report mean difference with 95% confidence interval.',
  },
  {
    label: 'Dose-response linear correlation',
    prompt:
      'Test linear correlation between exposure concentration (mg_L) and measured response_index across samples.',
  },
  {
    label: 'Conservative descriptive summary',
    prompt:
      'Summarize group distributions (n, mean, SD, median, IQR, min, max) and plot all raw observations without running an inferential p-value test.',
  },
];

export function buildDeterministicPlan(
  objective: string,
  profile: DatasetProfile,
  confirmedConfig: ConfirmedDatasetConfig,
  normalization: NormalizationOptions
): AnalysisPlan {
  const lower = objective.toLowerCase();
  const groupCol = confirmedConfig.groupColumn;
  const valueCol = confirmedConfig.valueColumn;
  const xCol = confirmedConfig.xColumn;
  const yCol = confirmedConfig.yColumn || valueCol;

  const groupProfile = profile.columns.find((c) => c.name === groupCol);
  const rawDistinctGroups = groupProfile?.categories.length ?? 0;

  // Estimate effective group count after optional trim/case normalization
  let effectiveGroupCount = rawDistinctGroups;
  if (groupProfile && normalization.trimAndNormalizeCategories) {
    const normalizedSet = new Set(
      groupProfile.categories.map((c) => c.label.trim().toLowerCase())
    );
    effectiveGroupCount = normalizedSet.size;
  }

  const warnings: string[] = [];
  if (
    /anova|multi-group|three groups|kruskal|mann-whitney|paired|mixed model|logistic|survival|cox/i.test(
      objective
    )
  ) {
    warnings.push(
      'Requested method (e.g., ANOVA, non-parametric, paired, or regression modeling) is outside the MVP allowlist. Falling back to an allowlisted method.'
    );
  }
  if (/caus(e|al|ation)|prove/i.test(objective)) {
    warnings.push(
      'Statistical tests measure sample differences or linear association only; causal claims require verified experimental design and controls.'
    );
  }

  const numericCols = profile.columns.filter((c) => c.inferredType === 'numeric');
  const wantsCorrelation =
    /correlat|pearson|scatter|dose|concentration|linear association/i.test(
      lower
    ) ||
    (!groupProfile && numericCols.length >= 2);
  const wantsDescriptiveOnly =
    /descriptive|summarize only|no inferential|without inferential|distribution only/i.test(
      lower
    );

  if (wantsCorrelation && numericCols.length >= 2) {
    const chosenX =
      xCol && numericCols.some((c) => c.name === xCol)
        ? xCol
        : numericCols[0].name;
    const chosenY =
      yCol && numericCols.some((c) => c.name === yCol && c.name !== chosenX)
        ? yCol
        : numericCols.find((c) => c.name !== chosenX)?.name ??
          numericCols[0].name;

    return {
      analysis: 'pearson',
      chart: /time|order|trend line/i.test(lower) ? 'time_series' : 'scatter',
      columns: {
        x: chosenX,
        y: chosenY,
        value: chosenY,
      },
      confidence: 'requires_confirmation',
      assumptions_to_confirm: [
        `Both "${chosenX}" and "${chosenY}" represent continuous quantitative measurements (${confirmedConfig.unit})`,
        'Observations represent independent paired (x, y) sample records',
        'Relationship of interest is linear association (Pearson r does not capture nonlinear curvature or prove causation)',
      ],
      rationale: `Selected two-sided Pearson correlation (r) and raw scatterplot for continuous variables "${chosenX}" and "${chosenY}" (n = ${profile.rowCount} rows).`,
      warnings,
      source: 'manual',
    };
  }

  if (
    !wantsDescriptiveOnly &&
    effectiveGroupCount === 2 &&
    confirmedConfig.independentObservations
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
        `Observations in "${groupCol}" are independent biological/experimental units (no repeated measures or duplicate rows)`,
        `Response variable "${valueCol}" is continuous and measured in consistent units (${confirmedConfig.unit})`,
        'Welch two-sample t-test compares group means without assuming equal group variances',
      ],
      rationale: `Selected Welch's independent two-group t-test (two-sided, unequal-variance safe) with a raw-observation grouped dot & 95% CI plot for "${valueCol}" across the 2 groups in "${groupCol}".`,
      warnings,
      source: 'manual',
    };
  }

  if (effectiveGroupCount !== 2 && groupCol) {
    warnings.push(
      `Column "${groupCol}" currently has ${effectiveGroupCount} distinct group(s). Welch's t-test requires exactly 2 groups; defaulting to Descriptive summaries.`
    );
  }
  if (!confirmedConfig.independentObservations) {
    warnings.push(
      'Independent observations were not confirmed in Step 1; inferential Welch t-test is disabled in favor of Descriptive summaries.'
    );
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
      `Response variable "${valueCol}" is reported in confirmed units (${confirmedConfig.unit})`,
      'Descriptive summary reports n, mean, SD, median, IQR, min, and max without an inferential p-value',
    ],
    rationale: `Selected conservative group descriptive summaries and raw observation plot for "${valueCol}" grouped by "${groupCol || 'dataset'}".`,
    warnings,
    source: 'manual',
  };
}

export const AnalysisPlanStep: React.FC<AnalysisPlanStepProps> = ({
  fileName,
  profile,
  normalization,
  confirmedConfig,
  onUpdateConfirmedConfig,
  runWithoutAi,
  onToggleRunWithoutAi,
  activePlan,
  onConfirmPlanAndExecute,
  onBackToData,
  isExecutingEngine,
}) => {
  const defaultObjective =
    profile.columns.some(
      (c) => c.name === 'exposure' || c.name === 'concentration_mg_L'
    )
      ? SAMPLE_OBJECTIVES[1].prompt
      : SAMPLE_OBJECTIVES[0].prompt;

  const [objective, setObjective] = useState<string>(defaultObjective);
  const [plan, setPlan] = useState<AnalysisPlan>(() =>
    activePlan ??
    buildDeterministicPlan(
      defaultObjective,
      profile,
      confirmedConfig,
      normalization
    )
  );
  const [checkedAssumptions, setCheckedAssumptions] = useState<
    Record<string, boolean>
  >(() => {
    const initial: Record<string, boolean> = {};
    plan.assumptions_to_confirm.forEach((a) => {
      initial[a] = true;
    });
    return initial;
  });
  const [isLoadingAiPlan, setIsLoadingAiPlan] = useState<boolean>(false);
  const [aiStatusNotice, setAiStatusNotice] = useState<string | null>(null);

  useEffect(() => {
    const nextChecks: Record<string, boolean> = {};
    plan.assumptions_to_confirm.forEach((a) => {
      nextChecks[a] = checkedAssumptions[a] ?? true;
    });
    setCheckedAssumptions(nextChecks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.assumptions_to_confirm.join('|')]);

  const sanitizedP1Payload = {
    dataset_name: fileName,
    row_count: profile.rowCount,
    column_count: profile.columnCount,
    duplicate_row_count: profile.duplicateRowCount,
    confirmed_unit: confirmedConfig.unit,
    independent_observations: confirmedConfig.independentObservations,
    normalization: {
      trim_and_normalize_categories: normalization.trimAndNormalizeCategories,
      complete_case_filter: normalization.completeCaseFilter,
    },
    columns: profile.columns
      .filter(
        (col) =>
          !(normalization.redactIdentifiersFromAi && col.isPotentialIdentifier)
      )
      .map((col) => ({
        name: col.name,
        inferred_type: col.inferredType,
        valid_count: col.validCount,
        missing_count: col.missingCount,
        distinct_count: col.distinctCount,
      })),
  };

  const handleRequestPlan = async () => {
    setAiStatusNotice(null);
    const fallbackPlan = buildDeterministicPlan(
      objective,
      profile,
      confirmedConfig,
      normalization
    );

    if (runWithoutAi) {
      setPlan({ ...fallbackPlan, source: 'manual' });
      setAiStatusNotice(
        'Run without AI is active — generated deterministic analysis plan locally.'
      );
      return;
    }

    setIsLoadingAiPlan(true);
    try {
      const response = await fetch('/api/ai/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objective,
          schema_summary: sanitizedP1Payload,
          selected_columns: {
            group: confirmedConfig.groupColumn,
            value: confirmedConfig.valueColumn,
            x: confirmedConfig.xColumn,
            y: confirmedConfig.yColumn,
          },
        }),
      });

      if (!response.ok) {
        setPlan({ ...fallbackPlan, source: 'manual' });
        setAiStatusNotice(
          `AI planner returned HTTP ${response.status} — using deterministic local analysis plan.`
        );
        return;
      }

      const data = await response.json();
      const parsed = AnalysisPlanSchema.safeParse(data.plan ?? data);
      if (!parsed.success) {
        setPlan({ ...fallbackPlan, source: 'manual' });
        setAiStatusNotice(
          'AI planner response did not match strict schema contract — using deterministic local analysis plan.'
        );
        return;
      }

      setPlan({
        ...parsed.data,
        source: data.source === 'ai' ? 'ai' : 'manual',
      });
      if (data.fallback_reason) {
        setAiStatusNotice(data.fallback_reason);
      } else {
        setAiStatusNotice(
          'Workers AI structured plan validated against AnalysisPlanSchema.'
        );
      }
    } catch {
      setPlan({ ...fallbackPlan, source: 'manual' });
      setAiStatusNotice(
        'AI planner endpoint unreachable — using deterministic local analysis plan.'
      );
    } finally {
      setIsLoadingAiPlan(false);
    }
  };

  const handleMethodOverride = (nextAnalysis: AllowedAnalysis) => {
    const nextChart: AllowedChart =
      nextAnalysis === 'pearson'
        ? plan.chart === 'time_series'
          ? 'time_series'
          : 'scatter'
        : 'grouped_points';

    const basePlan = buildDeterministicPlan(
      objective,
      profile,
      confirmedConfig,
      normalization
    );

    const customAssumptions =
      nextAnalysis === 'welch_t'
        ? [
            `Observations across groups in "${confirmedConfig.groupColumn}" are independent`,
            `Response variable "${confirmedConfig.valueColumn}" has confirmed units (${confirmedConfig.unit})`,
            'Two-group unequal-variance Welch t-test is appropriate for comparing group means',
          ]
        : nextAnalysis === 'pearson'
        ? [
            `Both "${confirmedConfig.xColumn}" and "${confirmedConfig.yColumn}" are continuous numeric variables (${confirmedConfig.unit})`,
            'Observations are independent (x, y) pairs',
            'Pearson r evaluates linear association only (does not prove causation)',
          ]
        : [
            `Response variable "${confirmedConfig.valueColumn}" is reported in confirmed units (${confirmedConfig.unit})`,
            'Descriptive summary reports n, mean, SD, median, IQR, min, and max without a hypothesis test p-value',
          ];

    setPlan({
      ...basePlan,
      analysis: nextAnalysis,
      chart: nextChart,
      assumptions_to_confirm: customAssumptions,
      rationale:
        nextAnalysis === 'welch_t'
          ? `Researcher selected Welch's independent two-group t-test on "${confirmedConfig.valueColumn}" by "${confirmedConfig.groupColumn}".`
          : nextAnalysis === 'pearson'
          ? `Researcher selected two-sided Pearson correlation between "${confirmedConfig.xColumn}" and "${confirmedConfig.yColumn}".`
          : `Researcher selected conservative Descriptive summaries for "${confirmedConfig.valueColumn}".`,
      source: 'manual',
    });
  };

  const allAssumptionsConfirmed = plan.assumptions_to_confirm.every(
    (a) => checkedAssumptions[a]
  );

  const numericColumns = profile.columns.filter(
    (c) => c.inferredType === 'numeric'
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 columns: Research Objective + Privacy P1 Preview */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-white border border-[#E3E9EE] rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#0F766E]">
                  Step 2 of 4 · Neuro-Symbolic Planning
                </span>
                <h2 className="text-xl font-bold text-[#10233F]">
                  Research Objective &amp; Analysis Brief
                </h2>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#0F766E]/10 text-[#0F766E]">
                <Lock className="w-3.5 h-3.5" />
                P1 Schema-Only Boundary
              </span>
            </div>

            <p className="text-sm text-[#536579] mb-3">
              Describe your research question in plain language, or choose a template below. AI only proposes a structured plan from allowlisted methods—you confirm the method and statistical assumptions before Python executes.
            </p>

            <div className="flex flex-wrap gap-2 mb-3">
              {SAMPLE_OBJECTIVES.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    setObjective(item.prompt);
                    const updated = buildDeterministicPlan(
                      item.prompt,
                      profile,
                      confirmedConfig,
                      normalization
                    );
                    setPlan(updated);
                  }}
                  className="text-xs px-2.5 py-1.5 rounded-lg border border-[#E3E9EE] bg-[#F7F9FB] hover:border-[#0F766E] hover:bg-[#0F766E]/5 text-[#10233F] font-medium transition-colors"
                >
                  {item.label}
                </button>
              ))}
            </div>

            <label
              htmlFor="research-objective-input"
              className="block text-xs font-semibold text-[#536579] mb-1.5"
            >
              Research Question / Objective
            </label>
            <textarea
              id="research-objective-input"
              rows={3}
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="e.g., Compare treatment vs control enzyme activity in independent assay wells..."
              className="w-full rounded-xl border border-[#E3E9EE] bg-[#F7F9FB] px-3.5 py-2.5 text-sm text-[#10233F] focus:outline-none focus:border-[#10233F]"
            />

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleRequestPlan}
                  disabled={isLoadingAiPlan}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#10233F] hover:bg-[#1a3358] text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60"
                >
                  {runWithoutAi ? (
                    <>
                      <Sliders className="w-4 h-4 text-teal-300" />
                      Update Deterministic Plan (No AI)
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-teal-300" />
                      {isLoadingAiPlan
                        ? 'Requesting Workers AI Plan…'
                        : 'Propose Analysis Plan (Workers AI)'}
                    </>
                  )}
                </button>

                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[#E3E9EE] bg-[#F7F9FB] hover:border-[#10233F]/30 text-xs font-semibold text-[#10233F] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={runWithoutAi}
                    onChange={(e) => onToggleRunWithoutAi(e.target.checked)}
                    className="rounded border-slate-300 text-[#0F766E] focus:ring-[#0F766E]"
                  />
                  <span>Run without AI</span>
                </label>
              </div>

              <span className="text-xs text-[#536579]">
                Allowlist: <code className="font-mono text-[#10233F]">descriptive</code> ·{' '}
                <code className="font-mono text-[#10233F]">welch_t</code> ·{' '}
                <code className="font-mono text-[#10233F]">pearson</code>
              </span>
            </div>

            {aiStatusNotice && (
              <div className="mt-3 px-3.5 py-2.5 rounded-xl bg-teal-50/70 border border-teal-200 text-xs text-[#10233F] flex items-center gap-2">
                <Bot className="w-4 h-4 text-[#0F766E] shrink-0" />
                <span>{aiStatusNotice}</span>
              </div>
            )}
          </div>

          {/* Sanitized P1 Metadata Inspector */}
          <div className="bg-white border border-[#E3E9EE] rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#536579]">
                Auditable P1 Metadata Payload (Raw P0 Rows Never Sent)
              </span>
              <span className="text-xs font-mono text-[#0F766E]">
                {sanitizedP1Payload.columns.length} non-ID columns exposed
              </span>
            </div>
            <pre className="text-xs font-mono bg-[#F7F9FB] border border-[#E3E9EE] rounded-xl p-3 overflow-x-auto max-h-44 text-[#10233F]">
              {JSON.stringify(sanitizedP1Payload, null, 2)}
            </pre>
          </div>
        </div>

        {/* Right 5 columns: Structured Plan Card, Manual Override & Assumption Gate */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white border border-[#E3E9EE] rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-bold text-[#10233F]">
                Proposed Analysis Plan
              </h3>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                  plan.source === 'ai'
                    ? 'bg-teal-50 text-[#0F766E] border border-teal-200'
                    : 'bg-slate-100 text-[#10233F] border border-slate-300'
                }`}
              >
                {plan.source === 'ai' ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Workers AI Plan
                  </>
                ) : (
                  <>
                    <Cpu className="w-3.5 h-3.5" />
                    Deterministic Rule Plan
                  </>
                )}
              </span>
            </div>

            <p className="text-xs text-[#536579] leading-relaxed bg-[#F7F9FB] p-3 rounded-xl border border-[#E3E9EE]">
              {plan.rationale}
            </p>

            {/* Manual Method & Chart Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label
                  htmlFor="manual-method-select"
                  className="block text-xs font-semibold text-[#536579] mb-1"
                >
                  Statistical Method (Allowlisted)
                </label>
                <select
                  id="manual-method-select"
                  value={plan.analysis}
                  onChange={(e) =>
                    handleMethodOverride(e.target.value as AllowedAnalysis)
                  }
                  className="w-full rounded-lg border border-[#E3E9EE] bg-white px-3 py-2 text-xs font-semibold text-[#10233F]"
                >
                  <option value="welch_t">
                    Welch&apos;s Two-Group t-Test (welch_t)
                  </option>
                  <option value="descriptive">
                    Descriptive Summaries Only (descriptive)
                  </option>
                  <option value="pearson">
                    Pearson Correlation (pearson)
                  </option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="manual-chart-select"
                  className="block text-xs font-semibold text-[#536579] mb-1"
                >
                  Scientific Figure Type
                </label>
                <select
                  id="manual-chart-select"
                  value={plan.chart}
                  onChange={(e) =>
                    setPlan({
                      ...plan,
                      chart: e.target.value as AllowedChart,
                      source: 'manual',
                    })
                  }
                  className="w-full rounded-lg border border-[#E3E9EE] bg-white px-3 py-2 text-xs font-semibold text-[#10233F]"
                >
                  <option value="grouped_points">
                    Grouped Raw Points + Mean &amp; 95% CI
                  </option>
                  <option value="scatter">
                    Scatterplot + Linear Trend
                  </option>
                  <option value="time_series">
                    Ordered Line / Time-Series Plot
                  </option>
                </select>
              </div>
            </div>

            {/* If Pearson is selected, allow choosing X and Y numeric columns */}
            {plan.analysis === 'pearson' && numericColumns.length >= 2 && (
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-[#F7F9FB] border border-[#E3E9EE]">
                <div>
                  <label className="block text-[11px] font-semibold text-[#536579] mb-1">
                    X Numeric Variable
                  </label>
                  <select
                    value={confirmedConfig.xColumn || numericColumns[0].name}
                    onChange={(e) =>
                      onUpdateConfirmedConfig({
                        ...confirmedConfig,
                        xColumn: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-[#E3E9EE] bg-white px-2.5 py-1.5 text-xs text-[#10233F]"
                  >
                    {numericColumns.map((col) => (
                      <option key={col.name} value={col.name}>
                        {col.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#536579] mb-1">
                    Y Numeric Variable
                  </label>
                  <select
                    value={
                      confirmedConfig.yColumn ||
                      confirmedConfig.valueColumn ||
                      numericColumns[1]?.name
                    }
                    onChange={(e) =>
                      onUpdateConfirmedConfig({
                        ...confirmedConfig,
                        yColumn: e.target.value,
                        valueColumn: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-[#E3E9EE] bg-white px-2.5 py-1.5 text-xs text-[#10233F]"
                  >
                    {numericColumns.map((col) => (
                      <option key={col.name} value={col.name}>
                        {col.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Plan Warnings */}
            {plan.warnings.length > 0 && (
              <div className="rounded-xl bg-amber-50/90 border border-amber-300 p-3.5 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#B45309]">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Method &amp; Scope Guardrails
                </div>
                <ul className="text-xs text-amber-900 space-y-1 list-disc list-inside">
                  {plan.warnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Mandatory Assumption Confirmation Checkboxes */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#10233F]">
                  Confirm Statistical Assumptions
                </span>
                <span className="text-[11px] text-[#536579]">
                  Required to unlock execution
                </span>
              </div>

              <div className="space-y-2">
                {plan.assumptions_to_confirm.map((assumption) => (
                  <label
                    key={assumption}
                    className="flex items-start gap-2.5 p-2.5 rounded-xl border border-[#E3E9EE] bg-[#F7F9FB] hover:border-[#10233F]/30 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(checkedAssumptions[assumption])}
                      onChange={(e) =>
                        setCheckedAssumptions((prev) => ({
                          ...prev,
                          [assumption]: e.target.checked,
                        }))
                      }
                      className="mt-0.5 rounded border-slate-300 text-[#0F766E] focus:ring-[#0F766E]"
                    />
                    <span className="text-xs text-[#10233F] leading-snug">
                      {assumption}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {!allAssumptionsConfirmed && (
              <div className="flex items-center gap-2 text-xs text-[#B45309] bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>
                  Confirm all statistical assumptions above, or switch to Descriptive summaries if assumptions do not hold.
                </span>
              </div>
            )}

            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onBackToData}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[#E3E9EE] bg-white hover:bg-slate-50 text-xs font-semibold text-[#10233F] cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Data
              </button>

              <button
                type="button"
                disabled={!allAssumptionsConfirmed || isExecutingEngine}
                onClick={() => {
                  const confirmedList = plan.assumptions_to_confirm.filter(
                    (a) => checkedAssumptions[a]
                  );
                  onConfirmPlanAndExecute(plan, objective, confirmedList);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#0d645d] text-white text-xs sm:text-sm font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isExecutingEngine
                  ? 'Executing Python Engine…'
                  : 'Confirm Analysis & Run Engine'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
