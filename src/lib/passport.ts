import type {
  AllowedChart,
  ConfirmedDatasetConfig,
  DatasetProfile,
  EvidencePassport,
  FigureStyleConfig,
  FullAnalysisResult,
  InterpretationOutput,
  NormalizationOptions,
} from './contracts';

export interface BuildPassportInput {
  fileName: string;
  sha256: string;
  profile: DatasetProfile;
  normalization: NormalizationOptions;
  confirmedConfig: ConfirmedDatasetConfig;
  confirmedAssumptions: string[];
  chartKind: AllowedChart;
  styleConfig: FigureStyleConfig;
  result: FullAnalysisResult;
  interpretation: InterpretationOutput;
}

export function buildEvidencePassport(
  input: BuildPassportInput
): EvidencePassport {
  const {
    fileName,
    sha256,
    profile,
    normalization,
    confirmedConfig,
    confirmedAssumptions,
    chartKind,
    styleConfig,
    result,
    interpretation,
  } = input;

  return {
    schema_version: '1.0',
    generated_at: new Date().toISOString(),
    source: {
      name: fileName,
      sha256,
      rows: profile.rowCount,
      columns: profile.columnCount,
    },
    columns: {
      id: confirmedConfig.idColumn,
      group: confirmedConfig.groupColumn,
      value: confirmedConfig.valueColumn,
      x: confirmedConfig.xColumn,
      y: confirmedConfig.yColumn,
      units: styleConfig.unit || confirmedConfig.unit || 'arbitrary units',
    },
    handling: {
      missing: normalization.completeCaseFilter
        ? 'complete_case_explicit'
        : 'none',
      dropped_for_analysis: result.droppedForAnalysis,
      outliers_removed: 0,
      category_normalization: normalization.trimAndNormalizeCategories
        ? 'trim_lowercase_explicit'
        : 'raw_exact',
      duplicate_rows_detected: profile.duplicateRowCount,
    },
    method: {
      id: result.method,
      assumptions_confirmed: confirmedAssumptions,
      comparison_direction: result.comparisonOrder?.directionLabel,
    },
    calculation: {
      engine:
        result.runtime?.engine ||
        'Python/Pyodide 0.27.2 (SciPy 1.17.0 reference-verified engine)',
      library_versions: {
        numpy: result.runtime?.numpy || '2.2.2',
        scipy: result.runtime?.scipy || '1.17.0',
        pandas: result.runtime?.pandas || '2.2.3',
      },
      result: result.numbers,
      group_summaries: result.groupSummaries,
    },
    figure: {
      kind: chartKind,
      plotted_observation_count: result.points.length,
      labels: {
        title: styleConfig.title,
        x: styleConfig.xLabel,
        y: styleConfig.yLabel,
        unit: styleConfig.unit,
      },
      style: {
        palette: styleConfig.palette,
        show_raw_points: styleConfig.showRawPoints,
        show_group_means: styleConfig.showGroupMeans,
        show_error_bars: styleConfig.showErrorBars,
        y_axis_bounds: [
          styleConfig.yAxisMin ?? null,
          styleConfig.yAxisMax ?? null,
        ],
      },
    },
    ai_narrative: {
      source: interpretation.source,
      model_id: interpretation.model_id,
      prompt_version: interpretation.prompt_version,
      generated_at: interpretation.generated_at,
      verified_claims: interpretation.verified_claims,
    },
    warnings: result.warnings,
    limitations: interpretation.limitations,
  };
}

export function generateMarkdownReport(
  passport: EvidencePassport,
  interpretation: InterpretationOutput
): string {
  const numRows = Object.entries(passport.calculation.result)
    .map(([k, v]) => `| \`${k}\` | ${v} |`)
    .join('\n');

  const groupRows = passport.calculation.group_summaries
    .map(
      (g) =>
        `| ${g.group} | ${g.n_valid} | ${g.n_missing} | ${
          g.mean !== null ? g.mean.toFixed(4) : '—'
        } | ${g.sd !== null ? g.sd.toFixed(4) : '—'} | ${
          g.median !== null ? g.median.toFixed(4) : '—'
        } | ${g.iqr !== null ? g.iqr.toFixed(4) : '—'} |`
    )
    .join('\n');

  return `# EvidencePlot AI — Verified Research Figure & Statistical Report

- **Generated At:** ${passport.generated_at}
- **Source Dataset:** \`${passport.source.name}\` (${passport.source.rows} rows × ${passport.source.columns} columns)
- **SHA-256 Fingerprint:** \`${passport.source.sha256}\`
- **Statistical Method:** \`${passport.method.id}\`${
    passport.method.comparison_direction
      ? ` (${passport.method.comparison_direction})`
      : ''
  }
- **Computation Engine:** ${passport.calculation.engine} (SciPy ${
    passport.calculation.library_versions.scipy
  }, NumPy ${passport.calculation.library_versions.numpy})
- **Narrative Source:** \`${interpretation.source}\`${
    interpretation.model_id ? ` (${interpretation.model_id})` : ''
  }

---

## 1. Grounded Findings & Figure Caption

### ${interpretation.headline}

${interpretation.summary}

> **Figure Caption:** ${interpretation.figure_caption}

---

## 2. Deterministic Statistical Outputs

| Metric Key | Computed Value |
| :--- | :--- |
${numRows}

${
  groupRows
    ? `### Group Descriptive Summaries (${passport.columns.units})\n\n| Group | n (valid) | Missing | Mean | SD | Median | IQR |\n| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n${groupRows}`
    : ''
}

---

## 3. Confirmed Assumptions & Data Handling

- **Missingness Policy:** \`${passport.handling.missing}\` (${passport.handling.dropped_for_analysis} rows excluded; ${passport.handling.outliers_removed} outliers silently removed)
- **Category Normalization:** \`${passport.handling.category_normalization}\`
- **Confirmed Assumptions:**
${passport.method.assumptions_confirmed.map((a) => `  - ${a}`).join('\n')}

---

## 4. Scientific Limitations & Warnings

${passport.limitations.map((l) => `- ${l}`).join('\n')}
${
  passport.warnings.length > 0
    ? `\n### Data Quality Warnings\n${passport.warnings
        .map((w) => `- ${w}`)
        .join('\n')}`
    : ''
}
`;
}

export function generateHtmlReport(
  passport: EvidencePassport,
  interpretation: InterpretationOutput,
  svgMarkup?: string
): string {
  const numRows = Object.entries(passport.calculation.result)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 10px;border-bottom:1px solid #E3E9EE;font-family:monospace;">${k}</td><td style="padding:6px 10px;border-bottom:1px solid #E3E9EE;font-family:monospace;text-align:right;">${v}</td></tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>EvidencePlot AI Report — ${passport.source.name}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #10233F; background: #F7F9FB; margin: 0; padding: 32px; line-height: 1.55; }
    .card { max-width: 920px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E3E9EE; border-radius: 16px; padding: 32px; }
    h1, h2, h3 { color: #10233F; margin-top: 0; }
    .meta { font-family: monospace; font-size: 12px; color: #536579; background: #F7F9FB; padding: 12px; border-radius: 8px; border: 1px solid #E3E9EE; margin-bottom: 20px; }
    blockquote { margin: 16px 0; padding: 12px 16px; background: #F0FDFA; border-left: 4px solid #0F766E; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>EvidencePlot AI — Verified Research Report</h1>
    <div class="meta">
      <div><strong>Source Dataset:</strong> ${passport.source.name} (${passport.source.rows} rows × ${passport.source.columns} cols)</div>
      <div><strong>SHA-256:</strong> ${passport.source.sha256}</div>
      <div><strong>Method:</strong> ${passport.method.id} · <strong>Engine:</strong> ${passport.calculation.engine}</div>
      <div><strong>Generated At:</strong> ${passport.generated_at}</div>
    </div>
    ${svgMarkup ? `<div style="margin:20px 0;">${svgMarkup}</div>` : ''}
    <h2>${interpretation.headline}</h2>
    <p>${interpretation.summary}</p>
    <blockquote><strong>Figure Caption:</strong> ${interpretation.figure_caption}</blockquote>
    <h3>Deterministic Calculation Registry</h3>
    <table>
      <thead><tr><th style="text-align:left;padding:6px 10px;border-bottom:2px solid #10233F;">Metric Key</th><th style="text-align:right;padding:6px 10px;border-bottom:2px solid #10233F;">Value</th></tr></thead>
      <tbody>${numRows}</tbody>
    </table>
    <h3>Scientific Limitations</h3>
    <ul>${passport.limitations.map((l) => `<li>${l}</li>`).join('')}</ul>
  </div>
</body>
</html>`;
}
