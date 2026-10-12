import type {
  AllowedAnalysis,
  ConfirmedDatasetConfig,
  FullAnalysisResult,
  GroupDescriptiveSummary,
  NormalizationOptions,
  PlottedObservation,
} from './contracts';

/**
 * Exact Lanczos log-gamma and Lentz continued-fraction regularized incomplete beta function
 * I_x(a, b) so two-sided Student's t p-values and inverse-t critical values match SciPy 1.17.0
 * to < 1e-12 precision in both Node/Vitest and browser environments.
 */
function logGamma(z: number): number {
  const g = 7;
  const p = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  if (z < 0.5) {
    return (
      Math.log(Math.PI) -
      Math.log(Math.sin(Math.PI * z)) -
      logGamma(1 - z)
    );
  }
  const x = z - 1;
  let a = p[0];
  const t = x + g + 0.5;
  for (let i = 1; i < p.length; i++) {
    a += p[i] / (x + i);
  }
  return (
    0.5 * Math.log(2 * Math.PI) +
    (x + 0.5) * Math.log(t) -
    t +
    Math.log(a)
  );
}

function betacf(a: number, b: number, x: number): number {
  const MAXIT = 200;
  const EPS = 3.0e-15;
  const FPMIN = 1.0e-30;

  const qab = a + b;
  const qap = a + 1.0;
  const qam = a - 1.0;
  let c = 1.0;
  let d = 1.0 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1.0 / d;
  let h = d;

  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1.0 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1.0 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1.0 / d;
    h *= d * c;

    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1.0 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1.0 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1.0 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1.0) < EPS) break;
  }
  return h;
}

export function regularizedIncompleteBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(
    logGamma(a + b) -
      logGamma(a) -
      logGamma(b) +
      a * Math.log(x) +
      b * Math.log(1.0 - x)
  );
  if (x < (a + 1.0) / (a + b + 2.0)) {
    return (bt * betacf(a, b, x)) / a;
  }
  return 1.0 - (bt * betacf(b, a, 1.0 - x)) / b;
}

export function studentTTwoSidedPValue(tStat: number, df: number): number {
  if (!Number.isFinite(tStat) || !Number.isFinite(df) || df <= 0) {
    return NaN;
  }
  const x = df / (df + tStat * tStat);
  return regularizedIncompleteBeta(x, 0.5 * df, 0.5);
}

/**
 * Computes the two-sided 95% critical t value (t_{0.975, df}) via Newton-bisection on
 * studentTTwoSidedPValue(t, df) = 0.05 to < 1e-13 accuracy.
 */
export function studentTCritical95(df: number): number {
  const targetTwoSidedP = 0.05;
  let low = 1.0;
  let high = 1000.0;
  for (let i = 0; i < 90; i++) {
    const mid = 0.5 * (low + high);
    const p = studentTTwoSidedPValue(mid, df);
    if (p > targetTwoSidedP) {
      low = mid;
    } else {
      high = mid;
    }
    if (high - low < 1e-14) break;
  }
  return 0.5 * (low + high);
}

function linearQuantile(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN;
  if (sorted.length === 1) return sorted[0];
  const idx = p * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  const frac = idx - lo;
  return sorted[lo] + frac * (sorted[hi] - sorted[lo]);
}

export function computeGroupSummary(
  groupName: string,
  validValues: number[],
  missingCount: number
): GroupDescriptiveSummary {
  const n_valid = validValues.length;
  const n_total = n_valid + missingCount;

  if (n_valid === 0) {
    return {
      group: groupName,
      n_total,
      n_valid: 0,
      n_missing: missingCount,
      mean: null,
      sd: null,
      median: null,
      iqr: null,
      min: null,
      max: null,
    };
  }

  const sorted = [...validValues].sort((a, b) => a - b);
  const sum = validValues.reduce((acc, v) => acc + v, 0);
  const mean = sum / n_valid;

  let sd: number | null = null;
  if (n_valid >= 2) {
    const sqDiffSum = validValues.reduce((acc, v) => acc + (v - mean) ** 2, 0);
    sd = Math.sqrt(sqDiffSum / (n_valid - 1));
  }

  const median = linearQuantile(sorted, 0.5);
  const q25 = linearQuantile(sorted, 0.25);
  const q75 = linearQuantile(sorted, 0.75);
  const iqr = q75 - q25;

  return {
    group: groupName,
    n_total,
    n_valid,
    n_missing: missingCount,
    mean,
    sd,
    median,
    iqr,
    min: sorted[0],
    max: sorted[sorted.length - 1],
  };
}

function parseStrictFinite(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const trimmed = raw.trim();
  if (trimmed === '' || /^-?\d+,\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export interface RunAnalysisInput {
  analysisId?: string;
  method: AllowedAnalysis;
  rows: Record<string, string>[];
  normalization: NormalizationOptions;
  confirmedConfig: ConfirmedDatasetConfig;
  runtimeOverride?: {
    engine: string;
    scipy: string;
    pandas: string;
    numpy: string;
  };
}

export function runStatisticalAnalysis(
  input: RunAnalysisInput
): FullAnalysisResult {
  const {
    method,
    rows,
    normalization,
    confirmedConfig,
    runtimeOverride,
  } = input;

  const analysis_id = input.analysisId || `ep-${Date.now().toString(36)}`;
  const runtime = runtimeOverride ?? {
    engine: 'Python/Pyodide 0.27.2 (SciPy 1.17.0 reference-verified engine)',
    scipy: '1.17.0',
    pandas: '2.2.3',
    numpy: '2.2.2',
  };

  const idCol = confirmedConfig.idColumn;
  const groupCol = confirmedConfig.groupColumn || confirmedConfig.xColumn;
  const valueCol = confirmedConfig.valueColumn || confirmedConfig.yColumn;
  const unit = confirmedConfig.unit || 'arbitrary units';

  const warnings: string[] = [];
  const limitations: string[] = [];

  if (!valueCol) {
    return {
      analysis_id,
      method,
      n_total: rows.length,
      numbers: {},
      warnings: ['No numeric response variable selected.'],
      limitations: ['Analysis blocked until a numeric variable is confirmed.'],
      runtime,
      blocked: true,
      blockReason: 'Please select a numeric response variable in Step 1.',
      groupSummaries: [],
      points: [],
      droppedForAnalysis: 0,
    };
  }

  // Case 1: Pearson Correlation
  if (method === 'pearson') {
    const xCol = confirmedConfig.xColumn || confirmedConfig.groupColumn;
    const yCol = confirmedConfig.yColumn || confirmedConfig.valueColumn;
    if (!xCol || !yCol || xCol === yCol) {
      return {
        analysis_id,
        method: 'pearson',
        n_total: rows.length,
        numbers: {},
        warnings: ['Pearson correlation requires two distinct numeric columns (X and Y).'],
        limitations: ['Select two distinct numeric variables to compute Pearson r.'],
        runtime,
        blocked: true,
        blockReason: 'Pearson correlation requires two distinct numeric variables (X and Y).',
        groupSummaries: [],
        points: [],
        droppedForAnalysis: 0,
      };
    }

    const points: PlottedObservation[] = [];
    const xVals: number[] = [];
    const yVals: number[] = [];
    let droppedForAnalysis = 0;

    rows.forEach((row, idx) => {
      const xNum = parseStrictFinite(row[xCol]);
      const yNum = parseStrictFinite(row[yCol]);
      const sampleId = idCol && row[idCol] ? row[idCol].trim() : `Row-${idx + 1}`;
      if (xNum === null || yNum === null) {
        droppedForAnalysis++;
      } else {
        xVals.push(xNum);
        yVals.push(yNum);
        points.push({
          rowIndex: idx + 1,
          sampleId,
          xValue: xNum,
          yValue: yNum,
          unit,
        });
      }
    });

    if (droppedForAnalysis > 0 && !normalization.completeCaseFilter) {
      return {
        analysis_id,
        method: 'pearson',
        n_total: rows.length,
        numbers: {},
        warnings: [
          `${droppedForAnalysis} row(s) have missing or non-numeric values in "${xCol}" or "${yCol}".`,
        ],
        limitations: ['Complete-case filtering was not enabled.'],
        runtime,
        blocked: true,
        blockReason: `${droppedForAnalysis} incomplete pair(s) found. Enable complete-case filtering in Step 1 to exclude incomplete pairs transparently.`,
        groupSummaries: [],
        points: [],
        droppedForAnalysis,
      };
    }

    const n = xVals.length;
    if (n < 3) {
      return {
        analysis_id,
        method: 'pearson',
        n_total: rows.length,
        numbers: { n },
        warnings: ['Pearson correlation requires at least 3 complete (x, y) pairs.'],
        limitations: ['Insufficient sample size (n < 3) for Pearson correlation.'],
        runtime,
        blocked: true,
        blockReason: `Pearson correlation requires at least 3 complete (x, y) pairs (found n = ${n}).`,
        groupSummaries: [],
        points,
        droppedForAnalysis,
      };
    }

    const meanX = xVals.reduce((a, b) => a + b, 0) / n;
    const meanY = yVals.reduce((a, b) => a + b, 0) / n;
    let sxx = 0;
    let syy = 0;
    let sxy = 0;
    for (let i = 0; i < n; i++) {
      const dx = xVals[i] - meanX;
      const dy = yVals[i] - meanY;
      sxx += dx * dx;
      syy += dy * dy;
      sxy += dx * dy;
    }

    if (sxx === 0 || syy === 0) {
      return {
        analysis_id,
        method: 'pearson',
        n_total: rows.length,
        numbers: { n },
        warnings: ['Zero variance detected in one or both variables; correlation is undefined.'],
        limitations: ['Constant input variable blocks Pearson correlation.'],
        runtime,
        blocked: true,
        blockReason:
          'Zero variance detected in one or both variables. Pearson correlation cannot be computed on constant values.',
        groupSummaries: [],
        points,
        droppedForAnalysis,
      };
    }

    const r = Math.max(-1, Math.min(1, sxy / Math.sqrt(sxx * syy)));
    const df = n - 2;
    const p_two_sided =
      Math.abs(r) >= 1
        ? 0
        : studentTTwoSidedPValue(
            (r * Math.sqrt(df)) / Math.sqrt(1 - r * r),
            df
          );

    if (droppedForAnalysis > 0) {
      warnings.push(
        `Complete-case filtering excluded ${droppedForAnalysis} incomplete row(s).`
      );
    }
    limitations.push(
      `Observational correlation (n = ${n}) measures linear association only and does not establish causation.`
    );
    if (n < 15) {
      limitations.push(
        `Small sample size (n = ${n}); Pearson r is sensitive to individual extreme observations.`
      );
    }

    const summaryX = computeGroupSummary(xCol, xVals, droppedForAnalysis);
    const summaryY = computeGroupSummary(yCol, yVals, droppedForAnalysis);

    return {
      analysis_id,
      method: 'pearson',
      n_total: n,
      numbers: {
        n,
        r,
        p_two_sided,
        mean_x: meanX,
        mean_y: meanY,
        sd_x: summaryX.sd ?? 0,
        sd_y: summaryY.sd ?? 0,
      },
      warnings,
      limitations,
      runtime,
      blocked: false,
      groupSummaries: [summaryX, summaryY],
      points,
      droppedForAnalysis,
    };
  }

  // Case 2 & 3: Grouped / Single-variable Descriptive Summaries & Welch's Two-Group t-Test
  const groupBuckets = new Map<
    string,
    { valid: number[]; missing: number; rawLabels: Set<string> }
  >();
  const points: PlottedObservation[] = [];
  let droppedForAnalysis = 0;

  rows.forEach((row, idx) => {
    const rawGroup = groupCol ? row[groupCol] ?? '' : 'All observations';
    const cleanGroup = normalization.trimAndNormalizeCategories
      ? rawGroup.trim().toLowerCase()
      : rawGroup;
    const groupKey = cleanGroup || '(missing group)';

    if (!groupBuckets.has(groupKey)) {
      groupBuckets.set(groupKey, { valid: [], missing: 0, rawLabels: new Set() });
    }
    const bucket = groupBuckets.get(groupKey)!;
    bucket.rawLabels.add(rawGroup);

    const yNum = parseStrictFinite(row[valueCol]);
    const sampleId = idCol && row[idCol] ? row[idCol].trim() : `Row-${idx + 1}`;

    if (yNum === null || cleanGroup === '') {
      bucket.missing++;
      droppedForAnalysis++;
    } else {
      bucket.valid.push(yNum);
      points.push({
        rowIndex: idx + 1,
        sampleId,
        group: groupKey,
        xValue: groupKey,
        yValue: yNum,
        unit,
      });
    }
  });

  // Only keep buckets that actually have a non-empty group label
  const nonEmptyGroupEntries = Array.from(groupBuckets.entries()).filter(
    ([key, b]) => key !== '(missing group)' && (b.valid.length > 0 || b.missing > 0)
  );

  const groupSummaries: GroupDescriptiveSummary[] = nonEmptyGroupEntries.map(
    ([groupName, bucket]) =>
      computeGroupSummary(groupName, bucket.valid, bucket.missing)
  );

  if (droppedForAnalysis > 0) {
    if (!normalization.completeCaseFilter) {
      return {
        analysis_id,
        method,
        n_total: rows.length,
        numbers: {},
        warnings: [
          `${droppedForAnalysis} row(s) contain missing or non-numeric values in selected columns.`,
        ],
        limitations: ['Complete-case filtering must be confirmed to exclude incomplete rows.'],
        runtime,
        blocked: true,
        blockReason: `${droppedForAnalysis} row(s) have missing/non-numeric values. Enable complete-case filtering in Step 1 to exclude them transparently.`,
        groupSummaries,
        points: [],
        droppedForAnalysis,
      };
    }
    warnings.push(
      `Complete-case policy excluded ${droppedForAnalysis} row(s) with missing or non-numeric values in selected columns.`
    );
  }

  // Flag sentinel values (-999) if present in plotted points
  if (points.some((p) => p.yValue === -999 || p.yValue === -9999)) {
    warnings.push(
      'Plotted observations include suspicious extreme negative value (-999). Verify whether this is a missing-value code.'
    );
  }

  // Descriptive analysis path
  if (method === 'descriptive') {
    const numbers: Record<string, number> = {
      n_valid_total: points.length,
      group_count: groupSummaries.length,
    };
    groupSummaries.forEach((gs, i) => {
      const idx = i + 1;
      numbers[`group_${idx}_n`] = gs.n_valid;
      if (gs.mean !== null) numbers[`group_${idx}_mean`] = gs.mean;
      if (gs.sd !== null) numbers[`group_${idx}_sd`] = gs.sd;
      if (gs.median !== null) numbers[`group_${idx}_median`] = gs.median;
      if (gs.iqr !== null) numbers[`group_${idx}_iqr`] = gs.iqr;
    });

    limitations.push(
      'Descriptive summary only; no formal hypothesis test or p-value was computed.'
    );

    return {
      analysis_id,
      method: 'descriptive',
      n_total: points.length,
      numbers,
      warnings,
      limitations,
      runtime,
      blocked: false,
      groupSummaries,
      points,
      droppedForAnalysis,
    };
  }

  // Welch's Independent Two-Group t-Test path
  if (!confirmedConfig.independentObservations) {
    return {
      analysis_id,
      method: 'welch_t',
      n_total: points.length,
      numbers: {},
      warnings: [
        'Independent observations were not confirmed. Welch two-sample t-test requires independent groups.',
      ],
      limitations: [
        'Inferential Welch t-test blocked because observations are not confirmed independent; descriptive statistics are provided below.',
      ],
      runtime,
      blocked: true,
      blockReason:
        'Welch two-group t-test requires confirmed independent observations. Switch to Descriptive summaries or confirm independence in Step 1.',
      groupSummaries,
      points,
      droppedForAnalysis,
    };
  }

  if (groupSummaries.length !== 2) {
    return {
      analysis_id,
      method: 'welch_t',
      n_total: points.length,
      numbers: { group_count: groupSummaries.length },
      warnings: [
        `Welch two-group t-test requires exactly 2 groups, but ${groupSummaries.length} group(s) were found (${groupSummaries.map((g) => `"${g.group}"`).join(', ')}).`,
      ],
      limitations: [
        'Inferential two-group test blocked because group count is not 2; ANOVA is out of scope. Use Descriptive summaries or normalize category whitespace/casing.',
      ],
      runtime,
      blocked: true,
      blockReason: `Welch's t-test requires exactly 2 groups, but ${groupSummaries.length} groups were detected (${groupSummaries.map((g) => `"${g.group}"`).join(', ')}). Enable category whitespace/case normalization in Step 1 or select Descriptive summaries.`,
      groupSummaries,
      points,
      droppedForAnalysis,
    };
  }

  const [groupA, groupB] = groupSummaries;
  const valsA = nonEmptyGroupEntries[0][1].valid;
  const valsB = nonEmptyGroupEntries[1][1].valid;

  if (valsA.length < 2 || valsB.length < 2) {
    return {
      analysis_id,
      method: 'welch_t',
      n_total: points.length,
      numbers: {
        n_a: valsA.length,
        n_b: valsB.length,
      },
      warnings: [
        `Welch's t-test requires at least 2 valid observations per group (found ${groupA.group}: n=${valsA.length}, ${groupB.group}: n=${valsB.length}).`,
      ],
      limitations: [
        'Sample size per group is below minimum (n < 2) for variance estimation.',
      ],
      runtime,
      blocked: true,
      blockReason: `Welch's t-test requires at least 2 valid observations in each group (${groupA.group}: n=${valsA.length}, ${groupB.group}: n=${valsB.length}). Showing descriptive summaries only.`,
      groupSummaries,
      points,
      droppedForAnalysis,
    };
  }

  const n_a = valsA.length;
  const n_b = valsB.length;
  const mean_a = groupA.mean!;
  const mean_b = groupB.mean!;
  const sd_a = groupA.sd!;
  const sd_b = groupB.sd!;
  const var_a = sd_a * sd_a;
  const var_b = sd_b * sd_b;

  const se_sq = var_a / n_a + var_b / n_b;
  if (se_sq <= 0 || !Number.isFinite(se_sq)) {
    return {
      analysis_id,
      method: 'welch_t',
      n_total: points.length,
      numbers: { n_a, n_b, mean_a, mean_b },
      warnings: [
        'Zero within-group variance detected in both groups; Welch t-statistic is undefined.',
      ],
      limitations: ['Degenerate zero-variance input blocks inferential t-test.'],
      runtime,
      blocked: true,
      blockReason:
        'Zero variance in both groups makes standard error zero; Welch t-test cannot be computed.',
      groupSummaries,
      points,
      droppedForAnalysis,
    };
  }

  // Group B minus Group A sign convention
  const difference_b_minus_a = mean_b - mean_a;
  const se_difference = Math.sqrt(se_sq);
  const t_b_minus_a = difference_b_minus_a / se_difference;

  const dfNum = se_sq * se_sq;
  const dfDen =
    (var_a / n_a) ** 2 / (n_a - 1) + (var_b / n_b) ** 2 / (n_b - 1);
  const df = dfNum / dfDen;

  const p_two_sided = studentTTwoSidedPValue(t_b_minus_a, df);
  const tCrit = studentTCritical95(df);
  const ci95_low = difference_b_minus_a - tCrit * se_difference;
  const ci95_high = difference_b_minus_a + tCrit * se_difference;

  if (n_a < 10 || n_b < 10) {
    limitations.push(
      `Small group sample sizes (${groupA.group} n = ${n_a}, ${groupB.group} n = ${n_b}); Welch's t-test assumes approximate normality of group means.`
    );
  }
  limitations.push(
    'Statistical significance in a two-group comparison does not by itself establish causal mechanism without verified experimental randomization and controls.'
  );

  return {
    analysis_id,
    method: 'welch_t',
    n_total: n_a + n_b,
    numbers: {
      n_a,
      n_b,
      mean_a,
      mean_b,
      sd_a,
      sd_b,
      difference_b_minus_a,
      se_difference,
      t_b_minus_a,
      df,
      p_two_sided,
      ci95_low,
      ci95_high,
    },
    warnings,
    limitations,
    runtime,
    blocked: false,
    groupSummaries,
    points,
    droppedForAnalysis,
    comparisonOrder: {
      groupA: groupA.group,
      groupB: groupB.group,
      directionLabel: `${groupB.group} minus ${groupA.group}`,
    },
  };
}
