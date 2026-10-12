import { describe, expect, it } from 'vitest';
import { parseAndValidateCsvBuffer } from '../src/lib/csvParser';
import { profileDataset } from '../src/lib/dataProfiler';
import { runStatisticalAnalysis } from '../src/lib/scientificEngine';
import { verifyInterpretationClaims } from '../src/lib/claimVerifier';
import {
  buildEvidencePassport,
  generateHtmlReport,
  generateMarkdownReport,
} from '../src/lib/passport';
import {
  SYNTHETIC_GROUPS_CSV,
  SYNTHETIC_CORRELATION_CSV,
  MESSY_EXAMPLE_CSV,
} from '../src/lib/sampleFixtures';
import { handleApiRequest, createLocalDevAiBinding } from '../worker/index';

describe('EvidencePlot AI — Complete End-to-End Solution Verification Suite', () => {
  const aiEnv = { AI: createLocalDevAiBinding() };

  it('Scenario 1 (Two-Group Experiment): executes Step 1 CSV intake -> Step 2 Workers AI plan -> Step 3 Welch t-test -> Step 4 Verified Claims & Evidence Passport', async () => {
    // STEP 1: CSV Intake, SHA-256 Fingerprinting & Data Profiling
    const buffer = new TextEncoder().encode(SYNTHETIC_GROUPS_CSV).buffer;
    const parsed = await parseAndValidateCsvBuffer(
      'synthetic_groups.csv',
      buffer
    );
    const profile = profileDataset(parsed.headers, parsed.rows);

    expect(parsed.sha256).toHaveLength(64);
    expect(profile.rowCount).toBe(12);
    expect(profile.columnCount).toBe(4);
    expect(profile.overallStatus).toBe('Ready');

    const confirmedConfig = {
      idColumn: 'sample_id',
      groupColumn: 'group',
      valueColumn: 'response',
      xColumn: 'group',
      yColumn: 'response',
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

    // STEP 2: Neuro-Symbolic AI Plan on Sanitized P1 Metadata
    const objective =
      'Compare treatment vs control response in independent assay wells and report mean difference with 95% confidence interval.';
    const planRes = await handleApiRequest(
      new Request('http://localhost/api/ai/plan', {
        method: 'POST',
        body: JSON.stringify({
          objective,
          schema_summary: {
            dataset_name: parsed.fileName,
            row_count: profile.rowCount,
            confirmed_unit: confirmedConfig.unit,
            independent_observations: true,
            columns: profile.columns
              .filter((c) => !c.isPotentialIdentifier)
              .map((c) => ({
                name: c.name,
                inferred_type: c.inferredType,
                distinct_count: c.distinctCount,
              })),
          },
          selected_columns: {
            group: confirmedConfig.groupColumn,
            value: confirmedConfig.valueColumn,
          },
        }),
      }),
      aiEnv
    );
    expect(planRes.status).toBe(200);
    const planPayload = await planRes.json();
    expect(planPayload.source).toBe('ai');
    expect(planPayload.plan.analysis).toBe('welch_t');
    expect(planPayload.plan.chart).toBe('grouped_points');

    // STEP 3: Deterministic Statistical Execution & Raw-Point Figure Spec
    const analysisResult = runStatisticalAnalysis({
      method: planPayload.plan.analysis,
      rows: parsed.rows,
      normalization,
      confirmedConfig,
    });
    expect(analysisResult.blocked).toBe(false);
    expect(analysisResult.points).toHaveLength(12);
    expect(analysisResult.numbers.difference_b_minus_a).toBeCloseTo(3.55, 9);
    expect(analysisResult.numbers.t_b_minus_a).toBeCloseTo(7.38001259, 7);
    expect(analysisResult.numbers.df).toBeCloseTo(9.9988328, 6);
    expect(analysisResult.numbers.p_two_sided).toBeCloseTo(2.37099967e-5, 10);

    // STEP 4: Workers AI Grounded Interpretation (P2), Claim Verifier & Evidence Passport Export
    const interpRes = await handleApiRequest(
      new Request('http://localhost/api/ai/interpret', {
        method: 'POST',
        body: JSON.stringify({
          objective,
          method: analysisResult.method,
          unit: confirmedConfig.unit,
          comparison_direction: analysisResult.comparisonOrder?.directionLabel,
          n_total: analysisResult.n_total,
          numbers: analysisResult.numbers,
          group_summaries: analysisResult.groupSummaries,
          limitations: analysisResult.limitations,
        }),
      }),
      aiEnv
    );
    expect(interpRes.status).toBe(200);
    const interpPayload = await interpRes.json();
    expect(interpPayload.source).toBe('ai');

    const claimCheck = verifyInterpretationClaims(
      interpPayload.interpretation,
      analysisResult.numbers,
      analysisResult.n_total
    );
    expect(claimCheck.valid).toBe(true);

    const passport = buildEvidencePassport({
      fileName: parsed.fileName,
      sha256: parsed.sha256,
      profile,
      normalization,
      confirmedConfig,
      confirmedAssumptions: planPayload.plan.assumptions_to_confirm,
      chartKind: planPayload.plan.chart,
      styleConfig: {
        title: 'response by group',
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
      result: analysisResult,
      interpretation: {
        ...interpPayload.interpretation,
        source: 'ai',
        model_id: interpPayload.model_id,
        prompt_version: interpPayload.prompt_version,
        generated_at: new Date().toISOString(),
      },
    });

    expect(passport.schema_version).toBe('1.0');
    expect(passport.handling.outliers_removed).toBe(0);
    expect(passport.figure.plotted_observation_count).toBe(12);
    expect(passport.ai_narrative?.source).toBe('ai');

    const mdReport = generateMarkdownReport(passport, {
      ...interpPayload.interpretation,
      source: 'ai',
      prompt_version: 'ep-interpret-v1.0',
      generated_at: passport.generated_at,
    });
    const htmlReport = generateHtmlReport(
      passport,
      {
        ...interpPayload.interpretation,
        source: 'ai',
        prompt_version: 'ep-interpret-v1.0',
        generated_at: passport.generated_at,
      },
      '<svg viewBox="0 0 760 460"></svg>'
    );
    expect(mdReport).toContain(parsed.sha256);
    expect(htmlReport).toContain('<svg viewBox="0 0 760 460"></svg>');
  });

  it('Scenario 2 (Dose-Response Correlation & Time-Series): executes Pearson correlation and exports verified Passport', async () => {
    const buffer = new TextEncoder().encode(SYNTHETIC_CORRELATION_CSV).buffer;
    const parsed = await parseAndValidateCsvBuffer(
      'synthetic_correlation.csv',
      buffer
    );
    const profile = profileDataset(parsed.headers, parsed.rows);

    const confirmedConfig = {
      idColumn: 'sample_id',
      xColumn: 'exposure',
      yColumn: 'response',
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
      method: 'pearson',
      rows: parsed.rows,
      normalization,
      confirmedConfig,
    });

    expect(result.blocked).toBe(false);
    expect(result.numbers.n).toBe(10);
    expect(result.numbers.r).toBeCloseTo(0.9854085436, 9);
    expect(result.numbers.p_two_sided).toBeCloseTo(1.94871279e-7, 12);
    expect(result.points).toHaveLength(10);
  });

  it('Scenario 3 (Messy Data Guardrails & Safe Descriptive Recovery): flags messy_example.csv issues, blocks 3-group Welch t-test, and succeeds with explicit normalization + Descriptive summaries', async () => {
    const buffer = new TextEncoder().encode(MESSY_EXAMPLE_CSV).buffer;
    const parsed = await parseAndValidateCsvBuffer('messy_example.csv', buffer);
    const profile = profileDataset(parsed.headers, parsed.rows);

    expect(profile.overallStatus).toBe('Needs review');
    expect(profile.duplicateRowCount).toBe(1);
    expect(profile.hasUnitConflict).toBe(true);

    const confirmedConfig = {
      idColumn: 'sample_id',
      groupColumn: 'group',
      valueColumn: 'response',
      unit: 'mg/L',
      unitConfirmed: true,
      independentObservations: true,
      designConfirmed: true,
    };
    const normalization = {
      trimAndNormalizeCategories: true,
      completeCaseFilter: true,
      redactIdentifiersFromAi: true,
    };

    // 1. Attempting Welch's 2-group t-test on 3 groups is blocked
    const blockedWelch = runStatisticalAnalysis({
      method: 'welch_t',
      rows: parsed.rows,
      normalization,
      confirmedConfig,
    });
    expect(blockedWelch.blocked).toBe(true);

    // 2. Switching to Descriptive summaries with explicit normalization succeeds transparently
    const safeDescriptive = runStatisticalAnalysis({
      method: 'descriptive',
      rows: parsed.rows,
      normalization,
      confirmedConfig,
    });
    expect(safeDescriptive.blocked).toBe(false);
    expect(safeDescriptive.droppedForAnalysis).toBe(2); // SYN02 missing, SYN03 'not available'
    expect(safeDescriptive.points).toHaveLength(5);
    expect(
      safeDescriptive.warnings.some((w) => w.includes('-999'))
    ).toBe(true);
  });
});
