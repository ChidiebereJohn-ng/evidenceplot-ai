import React, { useEffect, useRef, useState } from 'react';
import { WizardHeader, type WizardStep } from './components/WizardHeader';
import { WelcomeHero } from './components/WelcomeHero';
import { DataInspectorStep } from './components/DataInspectorStep';
import { AnalysisPlanStep } from './components/AnalysisPlanStep';
import { FigureStudioStep } from './components/FigureStudioStep';
import { ExportEvidenceStep } from './components/ExportEvidenceStep';

import {
  parseAndValidateCsvBuffer,
  type ParsedCsvData,
} from './lib/csvParser';
import { profileDataset, isIdLikeColumnName } from './lib/dataProfiler';
import { runStatisticalAnalysis } from './lib/scientificEngine';
import type {
  AllowedChart,
  AnalysisPlan,
  ConfirmedDatasetConfig,
  DatasetProfile,
  FigureStyleConfig,
  FullAnalysisResult,
  NormalizationOptions,
} from './lib/contracts';
import type { SampleFixtureInfo } from './lib/sampleFixtures';

const DEFAULT_NORMALIZATION: NormalizationOptions = {
  trimAndNormalizeCategories: false,
  completeCaseFilter: true,
  redactIdentifiersFromAi: true,
};

const DEFAULT_CONFIRMED_CONFIG: ConfirmedDatasetConfig = {
  unit: 'arbitrary units',
  unitConfirmed: false,
  independentObservations: true,
  designConfirmed: false,
};

const DEFAULT_STYLE_CONFIG: FigureStyleConfig = {
  title: 'Scientific Figure',
  subtitle: 'Raw observations with deterministic summary markers',
  xLabel: 'Group',
  yLabel: 'Response',
  unit: 'arbitrary units',
  palette: 'navy_teal',
  showRawPoints: true,
  showGroupMeans: true,
  showErrorBars: true,
  yAxisMin: null,
  yAxisMax: null,
};

export const App: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const workerRef = useRef<Worker | null>(null);

  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [maxUnlockedStep, setMaxUnlockedStep] = useState<WizardStep>(1);
  const [runWithoutAi, setRunWithoutAi] = useState<boolean>(false);

  const [parsedData, setParsedData] = useState<ParsedCsvData | null>(null);
  const [profile, setProfile] = useState<DatasetProfile | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [normalization, setNormalization] = useState<NormalizationOptions>(
    DEFAULT_NORMALIZATION
  );
  const [confirmedConfig, setConfirmedConfig] = useState<ConfirmedDatasetConfig>(
    DEFAULT_CONFIRMED_CONFIG
  );

  // Step 2 & Step 3 state
  const [activePlan, setActivePlan] = useState<AnalysisPlan | null>(null);
  const [researchObjective, setResearchObjective] = useState<string>('');
  const [confirmedAssumptions, setConfirmedAssumptions] = useState<string[]>([]);
  const [isExecutingEngine, setIsExecutingEngine] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] =
    useState<FullAnalysisResult | null>(null);
  const [chartKind, setChartKind] = useState<AllowedChart>('grouped_points');
  const [styleConfig, setStyleConfig] =
    useState<FigureStyleConfig>(DEFAULT_STYLE_CONFIG);

  useEffect(() => {
    try {
      const worker = new Worker(
        new URL('./workers/analysis.worker.ts', import.meta.url),
        { type: 'module' }
      );
      workerRef.current = worker;
      return () => {
        worker.terminate();
      };
    } catch {
      workerRef.current = null;
    }
  }, []);

  const loadCsvBuffer = async (fileName: string, buffer: ArrayBuffer) => {
    setUploadError(null);
    try {
      const parsed = await parseAndValidateCsvBuffer(fileName, buffer);
      const prof = profileDataset(parsed.headers, parsed.rows);
      setParsedData(parsed);
      setProfile(prof);

      const idCol = prof.columns.find((c) => isIdLikeColumnName(c.name))?.name;
      const catCol = prof.columns.find(
        (c) => c.inferredType === 'categorical' && !/^units?$/i.test(c.name)
      )?.name;
      const numColumns = prof.columns.filter(
        (c) => c.inferredType === 'numeric'
      );
      const valCol =
        numColumns[numColumns.length - 1]?.name ?? numColumns[0]?.name;
      const xCol = catCol ?? numColumns[0]?.name;
      const detectedUnit =
        prof.detectedUnits.length >= 1
          ? prof.detectedUnits[0]
          : 'arbitrary units';

      setNormalization({
        trimAndNormalizeCategories: false,
        completeCaseFilter: true,
        redactIdentifiersFromAi: true,
      });

      setConfirmedConfig({
        idColumn: idCol,
        groupColumn: catCol ?? xCol,
        valueColumn: valCol,
        xColumn: xCol,
        yColumn: valCol,
        unit: detectedUnit,
        unitConfirmed: !prof.hasUnitConflict && prof.detectedUnits.length <= 1,
        independentObservations: prof.duplicateRowCount === 0,
        designConfirmed: prof.duplicateRowCount === 0 && !prof.hasUnitConflict,
      });

      setActivePlan(null);
      setAnalysisResult(null);
      setCurrentStep(1);
      setMaxUnlockedStep(1);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Unable to parse CSV file.'
      );
    }
  };

  const handleFileSelected = async (file: File) => {
    const buffer = await file.arrayBuffer();
    await loadCsvBuffer(file.name, buffer);
  };

  const handleSelectSample = async (fixture: SampleFixtureInfo) => {
    const buffer = new TextEncoder().encode(fixture.rawCsv).buffer;
    await loadCsvBuffer(fixture.fileName, buffer);
  };

  const handleClearProject = () => {
    setParsedData(null);
    setProfile(null);
    setUploadError(null);
    setActivePlan(null);
    setAnalysisResult(null);
    setCurrentStep(1);
    setMaxUnlockedStep(1);
    setNormalization(DEFAULT_NORMALIZATION);
    setConfirmedConfig(DEFAULT_CONFIRMED_CONFIG);
  };

  const handleProceedToAnalysis = () => {
    setMaxUnlockedStep((prev) => (prev < 2 ? 2 : prev));
    setCurrentStep(2);
  };

  const executeAnalysis = (
    planToRun: AnalysisPlan,
    objectiveText: string,
    assumptionsList: string[]
  ) => {
    if (!parsedData) return;
    setIsExecutingEngine(true);
    setActivePlan(planToRun);
    setResearchObjective(objectiveText);
    setConfirmedAssumptions(assumptionsList);
    setChartKind(planToRun.chart);

    const xAxisName =
      planToRun.analysis === 'pearson'
        ? confirmedConfig.xColumn || 'X'
        : confirmedConfig.groupColumn || 'Group';
    const yAxisName =
      planToRun.analysis === 'pearson'
        ? confirmedConfig.yColumn || confirmedConfig.valueColumn || 'Y'
        : confirmedConfig.valueColumn || 'Value';

    const finishWithResult = (res: FullAnalysisResult) => {
      setAnalysisResult(res);
      const subtitle =
        res.method === 'welch_t' && !res.blocked
          ? `Welch two-group t-test: Δ=${res.numbers.difference_b_minus_a.toFixed(
              3
            )} ${confirmedConfig.unit}, t=${res.numbers.t_b_minus_a.toFixed(
              3
            )}, df=${res.numbers.df.toFixed(2)}, p=${res.numbers.p_two_sided.toExponential(
              3
            )}`
          : res.method === 'pearson' && !res.blocked
          ? `Pearson correlation: r=${res.numbers.r.toFixed(
              4
            )}, n=${res.numbers.n}, p=${res.numbers.p_two_sided.toExponential(3)}`
          : `Descriptive summary across ${res.points.length} valid observations`;

      setStyleConfig({
        title: `${yAxisName} by ${xAxisName}`,
        subtitle,
        xLabel: xAxisName,
        yLabel: yAxisName,
        unit: confirmedConfig.unit,
        palette: 'navy_teal',
        showRawPoints: true,
        showGroupMeans: true,
        showErrorBars: true,
        yAxisMin: null,
        yAxisMax: null,
      });

      setIsExecutingEngine(false);
      setMaxUnlockedStep((prev) => (prev < 3 ? 3 : prev));
      setCurrentStep(3);
    };

    const payload = {
      method: planToRun.analysis,
      rows: parsedData.rows,
      normalization,
      confirmedConfig,
    };

    // Execute via Web Worker with fast fallback to direct engine
    if (workerRef.current) {
      const requestId = `req-${Date.now()}`;
      let settled = false;
      const timer = window.setTimeout(() => {
        if (!settled) {
          settled = true;
          finishWithResult(runStatisticalAnalysis(payload));
        }
      }, 1200);

      const handleMsg = (e: MessageEvent) => {
        if (e.data?.requestId !== requestId) return;
        workerRef.current?.removeEventListener('message', handleMsg);
        window.clearTimeout(timer);
        if (!settled) {
          settled = true;
          if (e.data.type === 'ANALYSIS_COMPLETE' && e.data.result) {
            finishWithResult(e.data.result as FullAnalysisResult);
          } else {
            finishWithResult(runStatisticalAnalysis(payload));
          }
        }
      };

      workerRef.current.addEventListener('message', handleMsg);
      workerRef.current.postMessage({
        type: 'RUN_ANALYSIS',
        requestId,
        payload,
      });
    } else {
      finishWithResult(runStatisticalAnalysis(payload));
    }
  };

  const handleSwitchToDescriptive = () => {
    if (!activePlan) return;
    const descPlan: AnalysisPlan = {
      ...activePlan,
      analysis: 'descriptive',
      chart: 'grouped_points',
      rationale:
        'Switched to conservative Descriptive summaries after inferential precondition block.',
      source: 'manual',
    };
    executeAnalysis(descPlan, researchObjective, confirmedAssumptions);
  };

  const handleProceedToExport = () => {
    setMaxUnlockedStep((prev) => (prev < 4 ? 4 : prev));
    setCurrentStep(4);
  };

  const breadcrumbNarrative = !parsedData
    ? 'Awaiting CSV dataset → Select a sample fixture or upload a local .csv'
    : `${profile?.rowCount ?? 0} rows inspected (SHA-256 ${parsedData.sha256.slice(
        0,
        8
      )}…) → ${
        confirmedConfig.unitConfirmed && confirmedConfig.designConfirmed
          ? `Units (${confirmedConfig.unit}) confirmed`
          : 'Awaiting variable confirmation'
      }${
        analysisResult
          ? ` → ${analysisResult.method} (${analysisResult.points.length} plotted pts)`
          : ''
      }`;

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F9FB] text-[#10233F]">
      <WizardHeader
        currentStep={currentStep}
        maxUnlockedStep={maxUnlockedStep}
        onSelectStep={setCurrentStep}
        activeFileName={parsedData?.fileName}
        rowCount={profile?.rowCount}
        runWithoutAi={runWithoutAi}
        onToggleRunWithoutAi={setRunWithoutAi}
        onSelectSample={handleSelectSample}
        onClearProject={handleClearProject}
        breadcrumbNarrative={breadcrumbNarrative}
      />

      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 py-6">
        <WelcomeHero
          onTriggerFileUpload={() => fileInputRef.current?.click()}
          onSelectSample={handleSelectSample}
          hasActiveDataset={Boolean(parsedData)}
        />

        {currentStep === 1 && (
          <DataInspectorStep
            fileInputRef={fileInputRef}
            parsedData={parsedData}
            profile={profile}
            uploadError={uploadError}
            normalization={normalization}
            onUpdateNormalization={setNormalization}
            confirmedConfig={confirmedConfig}
            onUpdateConfirmedConfig={setConfirmedConfig}
            onFileSelected={handleFileSelected}
            onSelectSample={handleSelectSample}
            onProceedToAnalysis={handleProceedToAnalysis}
          />
        )}

        {currentStep === 2 && parsedData && profile && (
          <AnalysisPlanStep
            fileName={parsedData.fileName}
            profile={profile}
            normalization={normalization}
            confirmedConfig={confirmedConfig}
            onUpdateConfirmedConfig={setConfirmedConfig}
            runWithoutAi={runWithoutAi}
            activePlan={activePlan}
            onConfirmPlanAndExecute={executeAnalysis}
            onBackToData={() => setCurrentStep(1)}
            isExecutingEngine={isExecutingEngine}
          />
        )}

        {currentStep === 3 && parsedData && analysisResult && (
          <FigureStudioStep
            svgRef={svgRef}
            datasetName={parsedData.fileName}
            sha256={parsedData.sha256}
            chartKind={chartKind}
            onChangeChartKind={setChartKind}
            result={analysisResult}
            styleConfig={styleConfig}
            onUpdateStyleConfig={setStyleConfig}
            onSwitchToDescriptive={handleSwitchToDescriptive}
            onBackToPlan={() => setCurrentStep(2)}
            onProceedToExport={handleProceedToExport}
          />
        )}

        {currentStep === 4 && parsedData && profile && analysisResult && (
          <ExportEvidenceStep
            svgRef={svgRef}
            fileName={parsedData.fileName}
            sha256={parsedData.sha256}
            profile={profile}
            normalization={normalization}
            confirmedConfig={confirmedConfig}
            confirmedAssumptions={confirmedAssumptions}
            researchObjective={researchObjective}
            chartKind={chartKind}
            styleConfig={styleConfig}
            result={analysisResult}
            runWithoutAi={runWithoutAi}
            onBackToStudio={() => setCurrentStep(3)}
          />
        )}
      </main>
    </div>
  );
};

