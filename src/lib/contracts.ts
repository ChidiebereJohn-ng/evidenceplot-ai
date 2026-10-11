import { z } from 'zod';

export const ALLOWED_ANALYSES = ['descriptive', 'welch_t', 'pearson'] as const;
export type AllowedAnalysis = (typeof ALLOWED_ANALYSES)[number];

export const ALLOWED_CHARTS = ['grouped_points', 'scatter', 'time_series'] as const;
export type AllowedChart = (typeof ALLOWED_CHARTS)[number];

export const AnalysisPlanSchema = z
  .object({
    analysis: z.enum(ALLOWED_ANALYSES),
    chart: z.enum(ALLOWED_CHARTS),
    columns: z
      .object({
        group: z.string().optional(),
        value: z.string().optional(),
        x: z.string().optional(),
        y: z.string().optional(),
      })
      .strict(),
    confidence: z.enum(['requires_confirmation', 'cannot_proceed']),
    assumptions_to_confirm: z.array(z.string()).max(8),
    rationale: z.string().max(650),
    warnings: z.array(z.string()).max(8),
  })
  .strict();

export type AnalysisPlan = z.infer<typeof AnalysisPlanSchema> & {
  source?: 'ai' | 'manual';
};

export const AnalysisResultSchema = z
  .object({
    analysis_id: z.string().min(1),
    method: z.enum(ALLOWED_ANALYSES),
    n_total: z.number().int().min(0),
    numbers: z.record(z.string(), z.number().finite()),
    warnings: z.array(z.string()),
    limitations: z.array(z.string()),
    runtime: z
      .object({
        engine: z.string().optional(),
        scipy: z.string().optional(),
        pandas: z.string().optional(),
        numpy: z.string().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export type AnalysisResultContract = z.infer<typeof AnalysisResultSchema>;

export const VerifiedClaimSchema = z
  .object({
    key: z.string().max(70),
    value: z.number().finite(),
  })
  .strict();

export const InterpretationSchema = z
  .object({
    headline: z.string().max(180),
    summary: z.string().max(1200),
    figure_caption: z.string().max(650),
    limitations: z.array(z.string()).max(8),
    verified_claims: z.array(VerifiedClaimSchema).max(16),
  })
  .strict();

export type InterpretationContract = z.infer<typeof InterpretationSchema>;

export interface InterpretationOutput extends InterpretationContract {
  source: 'ai' | 'deterministic_template';
  model_id?: string;
  prompt_version: string;
  generated_at: string;
  fallback_reason?: string;
}

export type InferredColumnType = 'numeric' | 'categorical' | 'datetime' | 'identifier';

export interface CategorySummary {
  label: string;
  count: number;
}

export interface ColumnProfile {
  name: string;
  inferredType: InferredColumnType;
  totalCount: number;
  missingCount: number;
  validCount: number;
  numericCoercionFailures: number;
  numericFailureExamples: string[];
  hasLeadingTrailingWhitespace: boolean;
  caseCollisionGroups: string[][];
  distinctCount: number;
  categories: CategorySummary[];
  isPotentialIdentifier: boolean;
  hasSensitivityFlag: boolean;
  suspiciousSentinelCount: number;
  negativeValueCount: number;
}

export interface DatasetQualityAlert {
  id: string;
  severity: 'ready' | 'warning' | 'error';
  title: string;
  detail: string;
  remedy?: string;
}

export interface DatasetProfile {
  rowCount: number;
  columnCount: number;
  duplicateRowCount: number;
  duplicateSampleIds: string[];
  columns: ColumnProfile[];
  detectedUnits: string[];
  hasUnitConflict: boolean;
  hasPersonalIdentifiers: boolean;
  identifierColumns: string[];
  overallStatus: 'Ready' | 'Needs review' | 'Unsupported';
  alerts: DatasetQualityAlert[];
}

export interface NormalizationOptions {
  trimAndNormalizeCategories: boolean;
  completeCaseFilter: boolean;
  redactIdentifiersFromAi: boolean;
}

export interface ConfirmedDatasetConfig {
  idColumn?: string;
  groupColumn?: string;
  valueColumn?: string;
  xColumn?: string;
  yColumn?: string;
  unit: string;
  unitConfirmed: boolean;
  independentObservations: boolean;
  designConfirmed: boolean;
}

export interface GroupDescriptiveSummary {
  group: string;
  n_total: number;
  n_valid: number;
  n_missing: number;
  mean: number | null;
  sd: number | null;
  median: number | null;
  iqr: number | null;
  min: number | null;
  max: number | null;
}

export interface PlottedObservation {
  rowIndex: number;
  sampleId: string;
  group?: string;
  xValue?: number | string;
  yValue: number;
  unit: string;
}

export interface FullAnalysisResult extends AnalysisResultContract {
  blocked: boolean;
  blockReason?: string;
  groupSummaries: GroupDescriptiveSummary[];
  points: PlottedObservation[];
  droppedForAnalysis: number;
  comparisonOrder?: {
    groupA: string;
    groupB: string;
    directionLabel: string;
  };
}

export type FigurePaletteId = 'navy_teal' | 'slate_gold' | 'monochrome_ink';

export interface FigureStyleConfig {
  title: string;
  subtitle: string;
  xLabel: string;
  yLabel: string;
  unit: string;
  palette: FigurePaletteId;
  showRawPoints: boolean;
  showGroupMeans: boolean;
  showErrorBars: boolean;
  yAxisMin?: number | null;
  yAxisMax?: number | null;
}

export interface EvidencePassport {
  schema_version: '1.0';
  generated_at: string;
  source: {
    name: string;
    sha256: string;
    rows: number;
    columns: number;
  };
  columns: {
    id?: string;
    group?: string;
    value?: string;
    x?: string;
    y?: string;
    units: string;
  };
  handling: {
    missing: string;
    dropped_for_analysis: number;
    outliers_removed: number;
    category_normalization: string;
    duplicate_rows_detected: number;
  };
  method: {
    id: AllowedAnalysis;
    assumptions_confirmed: string[];
    comparison_direction?: string;
  };
  calculation: {
    engine: string;
    library_versions: {
      numpy: string;
      scipy: string;
      pandas: string;
    };
    result: Record<string, number>;
    group_summaries: GroupDescriptiveSummary[];
  };
  figure: {
    kind: AllowedChart;
    plotted_observation_count: number;
    labels: {
      title: string;
      x: string;
      y: string;
      unit: string;
    };
    style: {
      palette: FigurePaletteId;
      show_raw_points: boolean;
      show_group_means: boolean;
      show_error_bars: boolean;
      y_axis_bounds: [number | null, number | null];
    };
  };
  ai_narrative?: {
    source: 'ai' | 'deterministic_template';
    model_id?: string;
    prompt_version: string;
    generated_at: string;
    verified_claims: Array<{ key: string; value: number }>;
  };
  warnings: string[];
  limitations: string[];
}

export const CSV_LIMITS = {
  MAX_BYTES: 5 * 1024 * 1024, // 5 MB
  MAX_ROWS: 10000,
  MAX_COLUMNS: 40,
} as const;
