import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  Fingerprint,
  Info,
  XCircle,
} from 'lucide-react';
import type {
  ConfirmedDatasetConfig,
  DatasetProfile,
  NormalizationOptions,
} from '../lib/contracts';
import type { ParsedCsvData } from '../lib/csvParser';
import { SAMPLE_FIXTURES, type SampleFixtureInfo } from '../lib/sampleFixtures';

interface DataInspectorStepProps {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  parsedData: ParsedCsvData | null;
  profile: DatasetProfile | null;
  uploadError: string | null;
  normalization: NormalizationOptions;
  onUpdateNormalization: (next: NormalizationOptions) => void;
  confirmedConfig: ConfirmedDatasetConfig;
  onUpdateConfirmedConfig: (next: ConfirmedDatasetConfig) => void;
  onFileSelected: (file: File) => void;
  onSelectSample: (fixture: SampleFixtureInfo) => void;
  onProceedToAnalysis: () => void;
}

export const DataInspectorStep: React.FC<DataInspectorStepProps> = ({
  fileInputRef,
  parsedData,
  profile,
  uploadError,
  normalization,
  onUpdateNormalization,
  confirmedConfig,
  onUpdateConfirmedConfig,
  onFileSelected,
  onSelectSample,
  onProceedToAnalysis,
}) => {
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onFileSelected(file);
    }
  };

  const numericColumns =
    profile?.columns.filter((c) => c.inferredType === 'numeric') ?? [];
  const nonIdColumns =
    profile?.columns.filter((c) => c.inferredType !== 'identifier') ?? [];

  const canProceed =
    Boolean(parsedData) &&
    Boolean(profile) &&
    profile?.overallStatus !== 'Unsupported' &&
    Boolean(confirmedConfig.valueColumn || confirmedConfig.yColumn) &&
    confirmedConfig.unit.trim().length > 0 &&
    confirmedConfig.unitConfirmed &&
    confirmedConfig.designConfirmed;

  return (
    <div className="space-y-6">
      {/* Upload & Sample Selection Card */}
      <div className="bg-white border border-[#E3E9EE] rounded-2xl p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold text-[#10233F]">
              Step 1 — Data Upload &amp; Quality Inspection
            </h2>
            <p className="text-sm text-[#536579]">
              Upload a UTF-8 CSV (max 5 MB, 10,000 rows, 40 columns) or load a synthetic benchmark dataset. Raw rows remain in local browser memory.
            </p>
          </div>
          {profile && (
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                profile.overallStatus === 'Ready'
                  ? 'bg-[#087F73]/10 text-[#087F73] border-[#087F73]/30'
                  : profile.overallStatus === 'Needs review'
                  ? 'bg-[#A86710]/10 text-[#A86710] border-[#A86710]/30'
                  : 'bg-[#B94046]/10 text-[#B94046] border-[#B94046]/30'
              }`}
            >
              {profile.overallStatus === 'Ready' && (
                <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
              )}
              {profile.overallStatus === 'Needs review' && (
                <AlertTriangle className="w-4 h-4" aria-hidden="true" />
              )}
              {profile.overallStatus === 'Unsupported' && (
                <XCircle className="w-4 h-4" aria-hidden="true" />
              )}
              <span>Dataset Status: {profile.overallStatus}</span>
            </div>
          )}
        </div>

        {/* Drag and Drop Zone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="border-2 border-dashed border-[#CBD5E1] hover:border-[#142F50] rounded-xl p-6 text-center bg-[#F7F9FB] transition-colors"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFileSelected(file);
              e.target.value = '';
            }}
            className="hidden"
            id="csv-file-upload-input"
          />
          <FileSpreadsheet
            className="w-8 h-8 text-[#142F50] mx-auto mb-2"
            aria-hidden="true"
          />
          <p className="text-sm font-medium text-[#10233F]">
            Drag and drop a research <code className="font-mono">.csv</code> file here, or{' '}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-[#142F50] underline font-semibold hover:text-[#087F73] cursor-pointer"
            >
              browse from your computer
            </button>
          </p>
          <p className="text-xs text-[#536579] mt-1">
            CSV up to 5 MB · UTF-8 (with or without BOM) · No automatic cloud upload
          </p>
        </div>

        {/* Bundled Sample Fixtures */}
        <div className="mt-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#536579] mb-2">
            Or load a verified synthetic benchmark fixture:
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {SAMPLE_FIXTURES.map((fixture) => {
              const isSelected = parsedData?.fileName === fixture.fileName;
              return (
                <button
                  key={fixture.id}
                  type="button"
                  onClick={() => onSelectSample(fixture)}
                  className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#142F50]/5 border-[#142F50] ring-1 ring-[#142F50]'
                      : 'bg-white hover:bg-[#F7F9FB] border-[#E3E9EE]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-[#10233F]">
                      {fixture.fileName}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#087F73]/10 text-[#087F73] font-medium">
                      {fixture.badge}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#536579] line-clamp-2">
                    {fixture.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Upload Error Banner */}
        {uploadError && (
          <div
            role="alert"
            className="mt-4 p-4 rounded-xl bg-[#B94046]/10 border border-[#B94046]/30 text-[#B94046] flex items-start gap-3"
          >
            <XCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="text-sm">
              <div className="font-semibold">CSV Validation Error</div>
              <p className="mt-0.5">{uploadError}</p>
            </div>
          </div>
        )}
      </div>

      {/* Dataset Profile & Preview when loaded */}
      {parsedData && profile && (
        <>
          {/* File Summary & SHA-256 Provenance Bar */}
          <div className="bg-white border border-[#E3E9EE] rounded-2xl p-5 shadow-xs">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div className="p-3 rounded-xl bg-[#F7F9FB] border border-[#E3E9EE]">
                <div className="text-xs text-[#536579]">Source File</div>
                <div className="font-semibold text-sm text-[#10233F] truncate mt-0.5">
                  {parsedData.fileName}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#F7F9FB] border border-[#E3E9EE] tabular-nums">
                <div className="text-xs text-[#536579]">Observations (Rows)</div>
                <div className="font-bold text-lg text-[#10233F] mt-0.5">
                  {profile.rowCount}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#F7F9FB] border border-[#E3E9EE] tabular-nums">
                <div className="text-xs text-[#536579]">Variables (Columns)</div>
                <div className="font-bold text-lg text-[#10233F] mt-0.5">
                  {profile.columnCount}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#F7F9FB] border border-[#E3E9EE] tabular-nums">
                <div className="text-xs text-[#536579]">Exact Duplicate Rows</div>
                <div
                  className={`font-bold text-lg mt-0.5 ${
                    profile.duplicateRowCount > 0 ? 'text-[#A86710]' : 'text-[#087F73]'
                  }`}
                >
                  {profile.duplicateRowCount}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#F7F9FB] border border-[#E3E9EE] col-span-2 sm:col-span-1">
                <div className="flex items-center gap-1 text-xs text-[#536579]">
                  <Fingerprint className="w-3.5 h-3.5 text-[#087F73]" aria-hidden="true" />
                  <span>SHA-256 Fingerprint</span>
                </div>
                <div
                  className="font-mono text-xs text-[#10233F] truncate mt-1"
                  title={parsedData.sha256}
                >
                  {parsedData.sha256.slice(0, 16)}…
                </div>
              </div>
            </div>

            {/* Quality Alerts */}
            {profile.alerts.length > 0 ? (
              <div className="mt-4 space-y-2.5">
                {profile.alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs ${
                      alert.severity === 'error'
                        ? 'bg-[#B94046]/10 border-[#B94046]/30 text-[#B94046]'
                        : 'bg-[#A86710]/10 border-[#A86710]/30 text-[#10233F]'
                    }`}
                  >
                    {alert.severity === 'error' ? (
                      <XCircle className="w-4 h-4 text-[#B94046] shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-[#A86710] shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="font-semibold">{alert.title}</div>
                      <p className="text-[#536579] mt-0.5">{alert.detail}</p>
                      {alert.remedy && (
                        <p className="mt-1 font-medium text-[#142F50]">
                          Remedy: {alert.remedy}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 p-3 rounded-xl bg-[#087F73]/10 border border-[#087F73]/30 text-xs text-[#087F73] flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>
                  Zero missing values, zero coercion failures, and zero duplicate rows detected.
                </span>
              </div>
            )}
          </div>

          {/* Column Inspector & Preview Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Column Inspector Table */}
            <div className="bg-white border border-[#E3E9EE] rounded-2xl p-5 shadow-xs">
              <h3 className="text-base font-bold text-[#10233F] mb-3">
                Column Health &amp; Inferred Types
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs tabular-nums">
                  <thead>
                    <tr className="border-b border-[#E3E9EE] text-[#536579]">
                      <th className="py-2 pr-3 font-semibold">Column</th>
                      <th className="py-2 px-2 font-semibold">Type</th>
                      <th className="py-2 px-2 font-semibold">Valid / Total</th>
                      <th className="py-2 px-2 font-semibold">Missing</th>
                      <th className="py-2 pl-2 font-semibold">Categories / Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E3E9EE]">
                    {profile.columns.map((col) => (
                      <tr key={col.name}>
                        <td className="py-2.5 pr-3 font-mono font-semibold text-[#10233F]">
                          {col.name}
                          {col.hasSensitivityFlag && (
                            <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded bg-[#B94046]/15 text-[#B94046] text-[10px]">
                              PII Redacted
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-2">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full font-medium text-[11px] ${
                              col.inferredType === 'numeric'
                                ? 'bg-[#142F50]/10 text-[#142F50]'
                                : col.inferredType === 'categorical'
                                ? 'bg-[#087F73]/10 text-[#087F73]'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {col.inferredType}
                          </span>
                        </td>
                        <td className="py-2.5 px-2">
                          {col.validCount} / {col.totalCount}
                        </td>
                        <td
                          className={`py-2.5 px-2 font-semibold ${
                            col.missingCount > 0 || col.numericCoercionFailures > 0
                              ? 'text-[#A86710]'
                              : 'text-[#536579]'
                          }`}
                        >
                          {col.missingCount}
                          {col.numericCoercionFailures > 0 &&
                            ` (+${col.numericCoercionFailures} non-numeric)`}
                        </td>
                        <td className="py-2.5 pl-2 text-[#536579]">
                          {col.inferredType === 'categorical' ? (
                            <div className="flex flex-wrap gap-1">
                              {col.categories.slice(0, 5).map((cat) => (
                                <span
                                  key={cat.label}
                                  className="px-1.5 py-0.5 rounded bg-[#F7F9FB] border border-[#E3E9EE] font-mono text-[11px]"
                                >
                                  &quot;{cat.label}&quot; ({cat.count})
                                </span>
                              ))}
                            </div>
                          ) : col.inferredType === 'numeric' ? (
                            <span>
                              {col.suspiciousSentinelCount > 0
                                ? `Contains sentinel value (-999)`
                                : 'Continuous numeric'}
                            </span>
                          ) : (
                            <span>Row identifier / metadata</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* First 10 Rows Preview */}
            <div className="bg-white border border-[#E3E9EE] rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-[#10233F]">
                  Source Data Preview (First {Math.min(10, parsedData.rows.length)} Rows)
                </h3>
                <span className="text-xs text-[#536579]">
                  Unmodified raw values shown
                </span>
              </div>
              <div className="overflow-x-auto max-h-64">
                <table className="w-full text-left border-collapse text-xs tabular-nums">
                  <thead>
                    <tr className="border-b border-[#E3E9EE] text-[#536579] bg-[#F7F9FB]">
                      <th className="py-2 px-2 font-mono">#</th>
                      {parsedData.headers.map((h) => (
                        <th key={h} className="py-2 px-2.5 font-mono font-semibold">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E3E9EE]">
                    {parsedData.rows.slice(0, 10).map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-[#F7F9FB]">
                        <td className="py-1.5 px-2 font-mono text-[#536579]">
                          {rIdx + 1}
                        </td>
                        {parsedData.headers.map((h) => {
                          const cell = row[h] ?? '';
                          const isEmpty = cell.trim() === '';
                          const hasSpace = cell !== cell.trim() && !isEmpty;
                          return (
                            <td key={h} className="py-1.5 px-2.5 font-mono">
                              {isEmpty ? (
                                <span className="text-[#A86710] italic">[missing]</span>
                              ) : hasSpace ? (
                                <span
                                  className="bg-[#A86710]/15 px-1 rounded"
                                  title="Contains leading or trailing whitespace"
                                >
                                  &quot;{cell}&quot;
                                </span>
                              ) : (
                                cell
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Explicit Researcher Confirmation & Normalization Card */}
          <div className="bg-white border border-[#E3E9EE] rounded-2xl p-6 shadow-xs">
            <h3 className="text-lg font-bold text-[#10233F]">
              Confirm Variables, Units &amp; Data Handling Policy
            </h3>
            <p className="text-xs text-[#536579] mt-0.5">
              Every selection below is recorded in your exported <code className="font-mono">evidence-passport.json</code>. Nothing is inferred or cleaned without your confirmation.
            </p>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Grouping / X Column */}
              <div>
                <label
                  htmlFor="select-group-col"
                  className="block text-xs font-semibold text-[#10233F] mb-1"
                >
                  Grouping / X Variable
                </label>
                <select
                  id="select-group-col"
                  value={confirmedConfig.groupColumn ?? ''}
                  onChange={(e) =>
                    onUpdateConfirmedConfig({
                      ...confirmedConfig,
                      groupColumn: e.target.value || undefined,
                      xColumn: e.target.value || undefined,
                    })
                  }
                  className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#10233F]"
                >
                  <option value="">(None — single variable)</option>
                  {nonIdColumns.map((col) => (
                    <option key={col.name} value={col.name}>
                      {col.name} ({col.inferredType})
                    </option>
                  ))}
                </select>
              </div>

              {/* Numeric Response / Y Column */}
              <div>
                <label
                  htmlFor="select-value-col"
                  className="block text-xs font-semibold text-[#10233F] mb-1"
                >
                  Numeric Response / Y Variable
                </label>
                <select
                  id="select-value-col"
                  value={confirmedConfig.valueColumn ?? ''}
                  onChange={(e) =>
                    onUpdateConfirmedConfig({
                      ...confirmedConfig,
                      valueColumn: e.target.value || undefined,
                      yColumn: e.target.value || undefined,
                    })
                  }
                  className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#10233F]"
                >
                  <option value="">Select numeric response...</option>
                  {numericColumns.map((col) => (
                    <option key={col.name} value={col.name}>
                      {col.name} (numeric)
                    </option>
                  ))}
                </select>
              </div>

              {/* Row Identifier Column */}
              <div>
                <label
                  htmlFor="select-id-col"
                  className="block text-xs font-semibold text-[#10233F] mb-1"
                >
                  Sample / Row ID Column
                </label>
                <select
                  id="select-id-col"
                  value={confirmedConfig.idColumn ?? ''}
                  onChange={(e) =>
                    onUpdateConfirmedConfig({
                      ...confirmedConfig,
                      idColumn: e.target.value || undefined,
                    })
                  }
                  className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#10233F]"
                >
                  <option value="">(Row index)</option>
                  {profile.columns.map((col) => (
                    <option key={col.name} value={col.name}>
                      {col.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Measurement Units */}
              <div>
                <label
                  htmlFor="input-measurement-unit"
                  className="block text-xs font-semibold text-[#10233F] mb-1"
                >
                  Measurement Units (never invented)
                </label>
                <input
                  id="input-measurement-unit"
                  type="text"
                  value={confirmedConfig.unit}
                  onChange={(e) =>
                    onUpdateConfirmedConfig({
                      ...confirmedConfig,
                      unit: e.target.value,
                    })
                  }
                  placeholder="e.g., arbitrary units, mg/L, unknown"
                  className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#10233F]"
                />
              </div>
            </div>

            {/* Opt-In Data Normalization & Study Design Checkboxes */}
            <div className="mt-5 pt-4 border-t border-[#E3E9EE] grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2.5 bg-[#F7F9FB] p-4 rounded-xl border border-[#E3E9EE]">
                <div className="text-xs font-bold uppercase tracking-wider text-[#142F50]">
                  Transparent Data Handling Policy (Opt-In)
                </div>

                <label className="flex items-start gap-2.5 text-xs text-[#10233F] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={normalization.completeCaseFilter}
                    onChange={(e) =>
                      onUpdateNormalization({
                        ...normalization,
                        completeCaseFilter: e.target.checked,
                      })
                    }
                    className="mt-0.5 rounded border-slate-300"
                  />
                  <span>
                    <strong>Apply complete-case filtering for selected variables:</strong> exclude rows with missing or non-numeric values in the selected columns and log exact excluded counts in the Evidence Passport.
                  </span>
                </label>

                <label className="flex items-start gap-2.5 text-xs text-[#10233F] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={normalization.trimAndNormalizeCategories}
                    onChange={(e) =>
                      onUpdateNormalization({
                        ...normalization,
                        trimAndNormalizeCategories: e.target.checked,
                      })
                    }
                    className="mt-0.5 rounded border-slate-300"
                  />
                  <span>
                    <strong>Trim category whitespace &amp; normalize capitalization:</strong> merge category labels that differ only by leading/trailing spaces or case (e.g., <code className="font-mono">&quot; control &quot;</code> and <code className="font-mono">&quot;Control&quot;</code> → <code className="font-mono">&quot;control&quot;</code>).
                  </span>
                </label>
              </div>

              <div className="space-y-2.5 bg-[#F7F9FB] p-4 rounded-xl border border-[#E3E9EE]">
                <div className="text-xs font-bold uppercase tracking-wider text-[#142F50]">
                  Required Researcher Confirmations
                </div>

                <label className="flex items-start gap-2.5 text-xs text-[#10233F] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmedConfig.unitConfirmed}
                    onChange={(e) =>
                      onUpdateConfirmedConfig({
                        ...confirmedConfig,
                        unitConfirmed: e.target.checked,
                      })
                    }
                    className="mt-0.5 rounded border-slate-300"
                  />
                  <span>
                    <strong>Confirm measurement units:</strong> I verify the response variable is measured in{' '}
                    <code className="font-mono font-semibold">
                      {confirmedConfig.unit || 'unspecified'}
                    </code>{' '}
                    (or explicitly marked as <code className="font-mono">arbitrary units</code> / <code className="font-mono">unknown</code>).
                  </span>
                </label>

                <label className="flex items-start gap-2.5 text-xs text-[#10233F] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmedConfig.independentObservations}
                    onChange={(e) =>
                      onUpdateConfirmedConfig({
                        ...confirmedConfig,
                        independentObservations: e.target.checked,
                        designConfirmed: true,
                      })
                    }
                    className="mt-0.5 rounded border-slate-300"
                  />
                  <span>
                    <strong>Independent observations:</strong> Rows represent independent experimental units (not repeated measures on the same subject). <em>(Uncheck if paired/repeated; inferential Welch testing requires confirmed independence.)</em>
                  </span>
                </label>

                {!confirmedConfig.independentObservations && (
                  <label className="flex items-start gap-2.5 text-xs text-[#A86710] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmedConfig.designConfirmed}
                      onChange={(e) =>
                        onUpdateConfirmedConfig({
                          ...confirmedConfig,
                          designConfirmed: e.target.checked,
                        })
                      }
                      className="mt-0.5 rounded border-slate-300"
                    />
                    <span>
                      I acknowledge observations are not confirmed independent; limit analysis to Descriptive summaries.
                    </span>
                  </label>
                )}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-[#536579]">
                <Info className="w-4 h-4 text-[#087F73] shrink-0" aria-hidden="true" />
                <span>
                  Original CSV data is never modified in memory or uploaded to Cloudflare servers.
                </span>
              </div>

              <button
                type="button"
                disabled={!canProceed}
                onClick={onProceedToAnalysis}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                  canProceed
                    ? 'bg-[#E7B84A] hover:bg-[#dca935] text-[#10233F] shadow-xs cursor-pointer'
                    : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                }`}
              >
                <span>Continue to Step 2: Analysis Plan</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
