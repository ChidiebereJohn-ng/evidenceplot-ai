import React, { useRef, useState } from 'react';
import { WizardHeader, type WizardStep } from './components/WizardHeader';
import { WelcomeHero } from './components/WelcomeHero';
import { DataInspectorStep } from './components/DataInspectorStep';
import {
  parseAndValidateCsvBuffer,
  type ParsedCsvData,
} from './lib/csvParser';
import { profileDataset, isIdLikeColumnName } from './lib/dataProfiler';
import type {
  ConfirmedDatasetConfig,
  DatasetProfile,
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

export const App: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
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

  const loadCsvBuffer = async (fileName: string, buffer: ArrayBuffer) => {
    setUploadError(null);
    try {
      const parsed = await parseAndValidateCsvBuffer(fileName, buffer);
      const prof = profileDataset(parsed.headers, parsed.rows);
      setParsedData(parsed);
      setProfile(prof);

      const idCol = prof.columns.find((c) => isIdLikeColumnName(c.name))?.name;
      const catCol = prof.columns.find((c) => c.inferredType === 'categorical' && ! /^units?$/i.test(c.name))?.name;
      const numColumns = prof.columns.filter((c) => c.inferredType === 'numeric');
      const valCol = numColumns[numColumns.length - 1]?.name ?? numColumns[0]?.name;
      const xCol = catCol ?? numColumns[0]?.name;
      const detectedUnit =
        prof.detectedUnits.length === 1
          ? prof.detectedUnits[0]
          : prof.detectedUnits.length > 1
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
    setCurrentStep(1);
    setMaxUnlockedStep(1);
    setNormalization(DEFAULT_NORMALIZATION);
    setConfirmedConfig(DEFAULT_CONFIRMED_CONFIG);
  };

  const handleProceedToAnalysis = () => {
    setMaxUnlockedStep((prev) => (prev < 2 ? 2 : prev));
    setCurrentStep(2);
  };

  const breadcrumbNarrative = !parsedData
    ? 'Awaiting CSV dataset → Select a sample fixture or upload a local .csv'
    : `${profile?.rowCount ?? 0} rows inspected (SHA-256 ${parsedData.sha256.slice(0, 8)}…) → ${
        confirmedConfig.unitConfirmed && confirmedConfig.designConfirmed
          ? `Variables & units (${confirmedConfig.unit}) confirmed`
          : 'Awaiting variable & assumption confirmation'
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

        {currentStep === 2 && (
          <div className="bg-white border border-[#E3E9EE] rounded-2xl p-6 shadow-xs">
            <h2 className="text-xl font-bold text-[#10233F]">
              Step 2 — Analysis Brief &amp; Plan
            </h2>
            <p className="text-sm text-[#536579] mt-1">
              Dataset confirmed ({parsedData?.fileName}, {profile?.rowCount} rows). Proceeding to Slice 2 statistical engine &amp; planner.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};
