import { describe, expect, it } from 'vitest';
import {
  CsvValidationError,
  parseAndValidateCsvBuffer,
  parseCsvString,
} from '../src/lib/csvParser';
import { profileDataset } from '../src/lib/dataProfiler';
import { SAMPLE_FIXTURES } from '../src/lib/sampleFixtures';

function stringToArrayBuffer(text: string): ArrayBuffer {
  return new TextEncoder().encode(text).buffer;
}

describe('Slice 1: CSV Intake, SHA-256 Fingerprinting & Data Profiler', () => {
  it('profiles synthetic_groups.csv as 12 rows, 4 columns, 2 groups (6 control, 6 treatment), 0 missing, Ready status', async () => {
    const fixture = SAMPLE_FIXTURES.find((f) => f.id === 'synthetic_groups')!;
    const parsed = await parseAndValidateCsvBuffer(
      fixture.fileName,
      stringToArrayBuffer(fixture.rawCsv)
    );

    expect(parsed.fileName).toBe('synthetic_groups.csv');
    expect(parsed.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(parsed.rows).toHaveLength(12);
    expect(parsed.headers).toEqual(['sample_id', 'group', 'response', 'unit']);

    const profile = profileDataset(parsed.headers, parsed.rows);
    expect(profile.rowCount).toBe(12);
    expect(profile.columnCount).toBe(4);
    expect(profile.duplicateRowCount).toBe(0);
    expect(profile.overallStatus).toBe('Ready');
    expect(profile.detectedUnits).toEqual(['arbitrary units']);
    expect(profile.hasUnitConflict).toBe(false);

    const groupCol = profile.columns.find((c) => c.name === 'group')!;
    expect(groupCol.inferredType).toBe('categorical');
    expect(groupCol.missingCount).toBe(0);
    expect(groupCol.categories).toEqual([
      { label: 'control', count: 6 },
      { label: 'treatment', count: 6 },
    ]);

    const responseCol = profile.columns.find((c) => c.name === 'response')!;
    expect(responseCol.inferredType).toBe('numeric');
    expect(responseCol.missingCount).toBe(0);
    expect(responseCol.numericCoercionFailures).toBe(0);
  });

  it('detects all quality issues in messy_example.csv without silently modifying raw data', async () => {
    const fixture = SAMPLE_FIXTURES.find((f) => f.id === 'messy_example')!;
    const parsed = await parseAndValidateCsvBuffer(
      fixture.fileName,
      stringToArrayBuffer(fixture.rawCsv)
    );

    // Raw cell with leading/trailing whitespace must remain untouched in parsed.rows
    expect(parsed.rows[0].group).toBe(' control ');

    const profile = profileDataset(parsed.headers, parsed.rows);
    expect(profile.rowCount).toBe(7);
    expect(profile.duplicateRowCount).toBe(1);
    expect(profile.duplicateSampleIds).toContain('SYN04');
    expect(profile.hasUnitConflict).toBe(true);
    expect(profile.detectedUnits).toEqual(['mg/L', 'unknown']);
    expect(profile.overallStatus).toBe('Needs review');

    const groupCol = profile.columns.find((c) => c.name === 'group')!;
    expect(groupCol.hasLeadingTrailingWhitespace).toBe(true);
    expect(groupCol.caseCollisionGroups.length).toBeGreaterThan(0);

    const responseCol = profile.columns.find((c) => c.name === 'response')!;
    expect(responseCol.inferredType).toBe('numeric');
    expect(responseCol.missingCount).toBe(1); // SYN02
    expect(responseCol.numericCoercionFailures).toBe(1); // SYN03 "not available"
    expect(responseCol.numericFailureExamples).toContain('not available');
    expect(responseCol.suspiciousSentinelCount).toBe(1); // SYN05 "-999"
  });

  it('flags personal identifier columns (patient_name, email) for automatic AI redaction', () => {
    const csv = `sample_id,patient_name,email,group,response\n1,Alice,a@example.com,control,4.2\n2,Bob,b@example.com,treatment,6.1`;
    const { headers, rows } = parseCsvString(csv);
    const profile = profileDataset(headers, rows);

    expect(profile.hasPersonalIdentifiers).toBe(true);
    expect(profile.identifierColumns).toEqual(['patient_name', 'email']);
    expect(profile.alerts.some((a) => a.id === 'pii-columns')).toBe(true);
  });

  it('rejects non-CSV extensions, empty files, and binary null-byte files', async () => {
    await expect(
      parseAndValidateCsvBuffer('malware.exe', stringToArrayBuffer('a,b\n1,2'))
    ).rejects.toThrowError(CsvValidationError);

    await expect(
      parseAndValidateCsvBuffer('empty.csv', new ArrayBuffer(0))
    ).rejects.toThrowError(CsvValidationError);

    const binaryBuf = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x00, 0x0a]).buffer;
    await expect(
      parseAndValidateCsvBuffer('image.csv', binaryBuf)
    ).rejects.toThrowError(CsvValidationError);
  });
});
