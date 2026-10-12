import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { parseAndValidateCsvBuffer } from '../src/lib/csvParser';
import { runStatisticalAnalysis } from '../src/lib/scientificEngine';
import {
  SYNTHETIC_GROUPS_CSV,
  SYNTHETIC_CORRELATION_CSV,
  MESSY_EXAMPLE_CSV,
} from '../src/lib/sampleFixtures';

const referencePath = path.resolve(
  __dirname,
  '../public/examples/reference_outputs.json'
);
const referenceOutputs = JSON.parse(fs.readFileSync(referencePath, 'utf-8'));

describe('Deterministic Statistical Engine — Golden SciPy 1.17.0 Parity & Preconditions', () => {
  it('matches SciPy 1.17.0 reference_outputs.json for Welch two-group t-test on synthetic_groups.csv within < 1e-9', async () => {
    const buffer = new TextEncoder().encode(SYNTHETIC_GROUPS_CSV).buffer;
    const parsed = await parseAndValidateCsvBuffer(
      'synthetic_groups.csv',
      buffer
    );

    const result = runStatisticalAnalysis({
      method: 'welch_t',
      rows: parsed.rows,
      normalization: {
        trimAndNormalizeCategories: false,
        completeCaseFilter: true,
        redactIdentifiersFromAi: true,
      },
      confirmedConfig: {
        idColumn: 'sample_id',
        groupColumn: 'group',
        valueColumn: 'response',
        unit: 'arbitrary units',
        unitConfirmed: true,
        independentObservations: true,
        designConfirmed: true,
      },
    });

    expect(result.blocked).toBe(false);
    expect(result.comparisonOrder?.groupA).toBe(referenceOutputs.welch_t.group_a);
    expect(result.comparisonOrder?.groupB).toBe(referenceOutputs.welch_t.group_b);
    expect(result.numbers.n_a).toBe(referenceOutputs.welch_t.n_a);
    expect(result.numbers.n_b).toBe(referenceOutputs.welch_t.n_b);

    expect(
      Math.abs(result.numbers.mean_a - referenceOutputs.welch_t.mean_a)
    ).toBeLessThan(1e-9);
    expect(
      Math.abs(result.numbers.mean_b - referenceOutputs.welch_t.mean_b)
    ).toBeLessThan(1e-9);
    expect(
      Math.abs(
        result.numbers.difference_b_minus_a -
          referenceOutputs.welch_t.difference_b_minus_a
      )
    ).toBeLessThan(1e-9);
    expect(
      Math.abs(
        result.numbers.t_b_minus_a - referenceOutputs.welch_t.t_b_minus_a
      )
    ).toBeLessThan(1e-9);
    expect(
      Math.abs(result.numbers.df - referenceOutputs.welch_t.df)
    ).toBeLessThan(1e-9);
    expect(
      Math.abs(
        result.numbers.p_two_sided - referenceOutputs.welch_t.p_two_sided
      )
    ).toBeLessThan(1e-9);
    expect(
      Math.abs(
        result.numbers.ci95_low -
          referenceOutputs.welch_t.ci95_difference_b_minus_a[0]
      )
    ).toBeLessThan(1e-9);
    expect(
      Math.abs(
        result.numbers.ci95_high -
          referenceOutputs.welch_t.ci95_difference_b_minus_a[1]
      )
    ).toBeLessThan(1e-9);
    expect(result.points.length).toBe(12);
  });

  it('matches SciPy 1.17.0 reference_outputs.json for Pearson correlation on synthetic_correlation.csv within < 1e-9', async () => {
    const buffer = new TextEncoder().encode(SYNTHETIC_CORRELATION_CSV).buffer;
    const parsed = await parseAndValidateCsvBuffer(
      'synthetic_correlation.csv',
      buffer
    );

    const result = runStatisticalAnalysis({
      method: 'pearson',
      rows: parsed.rows,
      normalization: {
        trimAndNormalizeCategories: false,
        completeCaseFilter: true,
        redactIdentifiersFromAi: true,
      },
      confirmedConfig: {
        idColumn: 'sample_id',
        xColumn: 'exposure',
        yColumn: 'response',
        valueColumn: 'response',
        unit: 'arbitrary units',
        unitConfirmed: true,
        independentObservations: true,
        designConfirmed: true,
      },
    });

    expect(result.blocked).toBe(false);
    expect(result.numbers.n).toBe(referenceOutputs.pearson.n);
    expect(
      Math.abs(result.numbers.r - referenceOutputs.pearson.r)
    ).toBeLessThan(1e-9);
    expect(
      Math.abs(
        result.numbers.p_two_sided - referenceOutputs.pearson.p_two_sided
      )
    ).toBeLessThan(1e-9);
    expect(result.points.length).toBe(10);
  });

  it('blocks Welch two-group t-test when 3+ distinct groups are present (messy_example.csv)', async () => {
    const buffer = new TextEncoder().encode(MESSY_EXAMPLE_CSV).buffer;
    const parsed = await parseAndValidateCsvBuffer('messy_example.csv', buffer);

    const result = runStatisticalAnalysis({
      method: 'welch_t',
      rows: parsed.rows,
      normalization: {
        trimAndNormalizeCategories: true, // even after normalizing Control/treatment, "treated" is a 3rd group
        completeCaseFilter: true,
        redactIdentifiersFromAi: true,
      },
      confirmedConfig: {
        idColumn: 'sample_id',
        groupColumn: 'group',
        valueColumn: 'response',
        unit: 'mg/L',
        unitConfirmed: true,
        independentObservations: true,
        designConfirmed: true,
      },
    });

    expect(result.blocked).toBe(true);
    expect(result.blockReason).toMatch(/exactly 2 groups/i);
    expect(result.groupSummaries.length).toBe(3);
  });

  it('blocks Welch t-test when independentObservations is false or group n < 2', () => {
    const nonIndependent = runStatisticalAnalysis({
      method: 'welch_t',
      rows: [
        { group: 'A', val: '10' },
        { group: 'A', val: '12' },
        { group: 'B', val: '15' },
        { group: 'B', val: '18' },
      ],
      normalization: {
        trimAndNormalizeCategories: true,
        completeCaseFilter: true,
        redactIdentifiersFromAi: true,
      },
      confirmedConfig: {
        groupColumn: 'group',
        valueColumn: 'val',
        unit: 'U/mL',
        unitConfirmed: true,
        independentObservations: false,
        designConfirmed: true,
      },
    });

    expect(nonIndependent.blocked).toBe(true);
    expect(nonIndependent.blockReason).toMatch(/independent observations/i);

    const tinySample = runStatisticalAnalysis({
      method: 'welch_t',
      rows: [
        { group: 'A', val: '10' },
        { group: 'B', val: '15' },
        { group: 'B', val: '18' },
      ],
      normalization: {
        trimAndNormalizeCategories: true,
        completeCaseFilter: true,
        redactIdentifiersFromAi: true,
      },
      confirmedConfig: {
        groupColumn: 'group',
        valueColumn: 'val',
        unit: 'U/mL',
        unitConfirmed: true,
        independentObservations: true,
        designConfirmed: true,
      },
    });

    expect(tinySample.blocked).toBe(true);
    expect(tinySample.blockReason).toMatch(/at least 2 valid observations/i);
  });
});
