import type {
  CategorySummary,
  ColumnProfile,
  DatasetProfile,
  DatasetQualityAlert,
  InferredColumnType,
} from './contracts';

const SENSITIVE_IDENTIFIER_PATTERNS = [
  /patient[_\s-]*name/i,
  /full[_\s-]*name/i,
  /first[_\s-]*name/i,
  /last[_\s-]*name/i,
  /\bemail\b/i,
  /\baddress\b/i,
  /\bphone\b/i,
  /\bssn\b/i,
  /\bdob\b/i,
  /birth[_\s-]*date/i,
  /medical[_\s-]*record/i,
  /\bmrn\b/i,
];

const ID_COLUMN_PATTERNS = [
  /^id$/i,
  /sample[_\s-]*id/i,
  /subject[_\s-]*id/i,
  /record[_\s-]*id/i,
  /observation[_\s-]*id/i,
];

const SENTINEL_VALUES = new Set([-999, -9999, 999, 9999]);

function isStrictFiniteNumber(str: string): boolean {
  const trimmed = str.trim();
  if (trimmed === '') return false;
  // Guard against comma decimal ambiguity (e.g. "12,5")
  if (/^-?\d+,\d+$/.test(trimmed)) return false;
  const num = Number(trimmed);
  return Number.isFinite(num);
}

function isIsoDateLike(str: string): boolean {
  const trimmed = str.trim();
  if (trimmed.length < 6) return false;
  // Match YYYY-MM-DD, YYYY/MM/DD, or ISO-8601 timestamps
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(trimmed)) {
    const parsed = Date.parse(trimmed);
    return !Number.isNaN(parsed);
  }
  return false;
}

export function isSensitiveColumnName(colName: string): boolean {
  return SENSITIVE_IDENTIFIER_PATTERNS.some((re) => re.test(colName.trim()));
}

export function isIdLikeColumnName(colName: string): boolean {
  return ID_COLUMN_PATTERNS.some((re) => re.test(colName.trim()));
}

export function profileDataset(
  headers: string[],
  rows: Record<string, string>[]
): DatasetProfile {
  const rowCount = rows.length;
  const columnCount = headers.length;

  // Detect exact duplicate rows
  const seenRowSignatures = new Map<string, number>();
  let duplicateRowCount = 0;
  const duplicateSampleIds: string[] = [];
  const idHeader = headers.find((h) => isIdLikeColumnName(h));

  rows.forEach((row, idx) => {
    const sig = headers.map((h) => row[h] ?? '').join('\u001f');
    if (seenRowSignatures.has(sig)) {
      duplicateRowCount++;
      const sampleLabel = idHeader ? row[idHeader] || `Row ${idx + 1}` : `Row ${idx + 1}`;
      duplicateSampleIds.push(sampleLabel);
    } else {
      seenRowSignatures.set(sig, idx);
    }
  });

  // Check if a single ID appears multiple times (repeated measures / duplicate ID)
  const idCounts = new Map<string, number>();
  if (idHeader) {
    for (const row of rows) {
      const val = (row[idHeader] ?? '').trim();
      if (val) {
        idCounts.set(val, (idCounts.get(val) ?? 0) + 1);
      }
    }
  }
  const repeatedIds = Array.from(idCounts.entries())
    .filter(([, count]) => count > 1)
    .map(([id]) => id);

  const columns: ColumnProfile[] = headers.map((header) => {
    const rawValues = rows.map((r) => r[header] ?? '');
    let missingCount = 0;
    let numericCount = 0;
    let dateCount = 0;
    let hasLeadingTrailingWhitespace = false;
    let suspiciousSentinelCount = 0;
    let negativeValueCount = 0;
    const nonEmptyRawValues: string[] = [];
    const numericFailureExamples: string[] = [];

    for (const raw of rawValues) {
      if (raw !== raw.trim() && raw.trim().length > 0) {
        hasLeadingTrailingWhitespace = true;
      }
      const trimmed = raw.trim();
      if (trimmed === '') {
        missingCount++;
        continue;
      }
      nonEmptyRawValues.push(raw);

      if (isStrictFiniteNumber(trimmed)) {
        numericCount++;
        const num = Number(trimmed);
        if (SENTINEL_VALUES.has(num)) {
          suspiciousSentinelCount++;
        }
        if (num < 0) {
          negativeValueCount++;
        }
      } else {
        if (numericFailureExamples.length < 3) {
          numericFailureExamples.push(trimmed);
        }
        if (isIsoDateLike(trimmed)) {
          dateCount++;
        }
      }
    }

    const nonEmptyCount = nonEmptyRawValues.length;
    const hasSensitivityFlag = isSensitiveColumnName(header);
    const idNameMatch = isIdLikeColumnName(header);

    // Determine inferred type
    let inferredType: InferredColumnType = 'categorical';
    let numericCoercionFailures = 0;

    if (idNameMatch || hasSensitivityFlag) {
      inferredType = 'identifier';
    } else if (
      nonEmptyCount > 0 &&
      numericCount > 0 &&
      numericCount / nonEmptyCount >= 0.6
    ) {
      inferredType = 'numeric';
      numericCoercionFailures = nonEmptyCount - numericCount;
    } else if (nonEmptyCount > 0 && dateCount / nonEmptyCount >= 0.8) {
      inferredType = 'datetime';
    } else {
      inferredType = 'categorical';
    }

    // Category distribution (preserving raw trimmed strings first so collisions are visible)
    const categoryCountMap = new Map<string, number>();
    const normalizedToVariants = new Map<string, Set<string>>();

    for (const raw of nonEmptyRawValues) {
      categoryCountMap.set(raw, (categoryCountMap.get(raw) ?? 0) + 1);
      const normKey = raw.trim().toLowerCase();
      if (!normalizedToVariants.has(normKey)) {
        normalizedToVariants.set(normKey, new Set());
      }
      normalizedToVariants.get(normKey)!.add(raw);
    }

    const caseCollisionGroups: string[][] = [];
    for (const variants of normalizedToVariants.values()) {
      if (variants.size > 1) {
        caseCollisionGroups.push(Array.from(variants));
      }
    }

    const categories: CategorySummary[] = Array.from(categoryCountMap.entries()).map(
      ([label, count]) => ({ label, count })
    );

    const validCount =
      inferredType === 'numeric' ? numericCount : nonEmptyCount;

    return {
      name: header,
      inferredType,
      totalCount: rowCount,
      missingCount,
      validCount,
      numericCoercionFailures,
      numericFailureExamples,
      hasLeadingTrailingWhitespace,
      caseCollisionGroups,
      distinctCount: categoryCountMap.size,
      categories,
      isPotentialIdentifier: idNameMatch || hasSensitivityFlag,
      hasSensitivityFlag,
      suspiciousSentinelCount,
      negativeValueCount,
    };
  });

  // Detect units column if present
  const unitCol = columns.find((c) => /^units?$/i.test(c.name.trim()));
  const detectedUnits = unitCol
    ? Array.from(
        new Set(
          unitCol.categories
            .map((cat) => cat.label.trim())
            .filter((u) => u.length > 0)
        )
      )
    : [];
  const hasUnitConflict = detectedUnits.length > 1;

  const identifierColumns = columns
    .filter((c) => c.hasSensitivityFlag)
    .map((c) => c.name);
  const hasPersonalIdentifiers = identifierColumns.length > 0;

  const alerts: DatasetQualityAlert[] = [];

  if (hasPersonalIdentifiers) {
    alerts.push({
      id: 'pii-columns',
      severity: 'warning',
      title: `Personal identifier column(s) detected: ${identifierColumns.join(', ')}`,
      detail:
        'Columns that may contain identifying details are automatically redacted from AI planning requests.',
      remedy: 'Keep identifier redaction enabled or remove identifying columns before sharing.',
    });
  }

  if (duplicateRowCount > 0) {
    alerts.push({
      id: 'duplicate-rows',
      severity: 'warning',
      title: `${duplicateRowCount} exact duplicate row(s) detected (${duplicateSampleIds.join(', ')})`,
      detail:
        'Duplicate records can artificially inflate sample size or violate observation independence.',
      remedy: 'Verify whether duplicate rows represent repeated measurements or data-entry duplicates.',
    });
  } else if (repeatedIds.length > 0) {
    alerts.push({
      id: 'repeated-ids',
      severity: 'warning',
      title: `Repeated sample ID(s) detected: ${repeatedIds.join(', ')}`,
      detail:
        'Multiple rows share the same identifier, which may indicate paired or repeated-measures data.',
      remedy: 'Confirm whether observations are independent before running Welch two-group test.',
    });
  }

  for (const col of columns) {
    if (col.missingCount > 0) {
      alerts.push({
        id: `missing-${col.name}`,
        severity: 'warning',
        title: `Column "${col.name}" has ${col.missingCount} missing value(s)`,
        detail:
          'Missing values are never imputed silently. Complete-case filtering can exclude incomplete rows for analysis.',
        remedy: 'Enable complete-case filtering to exclude rows with missing values in selected columns.',
      });
    }
    if (col.numericCoercionFailures > 0) {
      alerts.push({
        id: `coercion-${col.name}`,
        severity: 'warning',
        title: `Column "${col.name}" has ${col.numericCoercionFailures} non-numeric entry(ies) (${col.numericFailureExamples.map((e) => `"${e}"`).join(', ')})`,
        detail:
          'Text entries in a numeric response column cannot be included in statistical calculations.',
        remedy: 'Enable complete-case filtering to exclude non-numeric rows and record the count in the Evidence Passport.',
      });
    }
    if (col.hasLeadingTrailingWhitespace || col.caseCollisionGroups.length > 0) {
      const collisionDesc = col.caseCollisionGroups
        .map((g) => g.map((v) => `"${v}"`).join(' vs '))
        .join('; ');
      alerts.push({
        id: `whitespace-case-${col.name}`,
        severity: 'warning',
        title: `Inconsistent category formatting in "${col.name}" (${collisionDesc || 'leading/trailing whitespace'})`,
        detail:
          'Whitespace or capitalization differences split identical experimental groups into separate categories.',
        remedy: 'Enable opt-in category whitespace & capitalization normalization below.',
      });
    }
    if (col.suspiciousSentinelCount > 0) {
      alerts.push({
        id: `sentinel-${col.name}`,
        severity: 'warning',
        title: `Suspicious sentinel/extreme value(s) in "${col.name}" (e.g., -999)`,
        detail:
          'Extreme negative values like -999 often represent missing-value codes rather than physical measurements. Outliers are never auto-deleted.',
        remedy: 'Inspect raw observations in the preview and Figure Studio before drawing conclusions.',
      });
    }
  }

  if (hasUnitConflict) {
    alerts.push({
      id: 'unit-conflict',
      severity: 'warning',
      title: `Multiple unit labels found: ${detectedUnits.map((u) => `"${u}"`).join(', ')}`,
      detail:
        'Combining observations recorded in different or unknown units can invalidate group comparisons.',
      remedy: 'Confirm the measurement unit convention before running inferential tests.',
    });
  }

  const hasNumeric = columns.some((c) => c.inferredType === 'numeric');
  let overallStatus: DatasetProfile['overallStatus'] = 'Ready';
  if (!hasNumeric) {
    overallStatus = 'Unsupported';
    alerts.push({
      id: 'no-numeric-column',
      severity: 'error',
      title: 'No numeric measurement column detected',
      detail:
        'EvidencePlot AI requires at least one numeric response column for statistical summaries and plotting.',
      remedy: 'Upload a CSV containing at least one numeric variable.',
    });
  } else if (alerts.length > 0) {
    overallStatus = 'Needs review';
  }

  return {
    rowCount,
    columnCount,
    duplicateRowCount,
    duplicateSampleIds,
    columns,
    detectedUnits,
    hasUnitConflict,
    hasPersonalIdentifiers,
    identifierColumns,
    overallStatus,
    alerts,
  };
}
