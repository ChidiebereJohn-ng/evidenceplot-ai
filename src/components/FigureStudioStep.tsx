import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Cpu,
  RotateCcw,
  ShieldAlert,
  Sliders,
  Table2,
} from 'lucide-react';
import type {
  AllowedChart,
  FigurePaletteId,
  FigureStyleConfig,
  FullAnalysisResult,
} from '../lib/contracts';
import { FigureCanvas } from './FigureCanvas';

interface FigureStudioStepProps {
  svgRef: React.RefObject<SVGSVGElement | null>;
  datasetName: string;
  sha256: string;
  chartKind: AllowedChart;
  onChangeChartKind: (kind: AllowedChart) => void;
  result: FullAnalysisResult;
  styleConfig: FigureStyleConfig;
  onUpdateStyleConfig: (next: FigureStyleConfig) => void;
  onSwitchToDescriptive: () => void;
  onBackToPlan: () => void;
  onProceedToExport: () => void;
}

type StudioTab = 'results' | 'figure' | 'checks';

function fmtNum(val: number | null | undefined, digits = 4): string {
  if (val === null || val === undefined || !Number.isFinite(val)) return '—';
  if (Math.abs(val) > 0 && Math.abs(val) < 0.0001) {
    return val.toExponential(4);
  }
  return Number(val.toFixed(digits)).toString();
}

export const FigureStudioStep: React.FC<FigureStudioStepProps> = ({
  svgRef,
  datasetName,
  sha256,
  chartKind,
  onChangeChartKind,
  result,
  styleConfig,
  onUpdateStyleConfig,
  onSwitchToDescriptive,
  onBackToPlan,
  onProceedToExport,
}) => {
  const [activeTab, setActiveTab] = useState<StudioTab>('results');

  return (
    <div className="space-y-6">
      {/* Blocked Precondition Alert Banner */}
      {result.blocked && (
        <div className="bg-red-50 border border-red-300 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-6 h-6 text-[#B91C1C] shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-[#B91C1C]">
                Inferential Test Blocked by Scientific Precondition Gate
              </h3>
              <p className="text-xs text-red-900 mt-1 leading-relaxed">
                {result.blockReason}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onSwitchToDescriptive}
              className="px-3.5 py-2 rounded-xl bg-[#10233F] hover:bg-[#1a3358] text-white text-xs font-semibold cursor-pointer"
            >
              Run Descriptive Summaries Instead
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Primary 2/3 Column: Deterministic SVG Figure Canvas */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-[#E3E9EE] rounded-2xl px-4 py-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#0F766E]/10 text-[#0F766E]">
                <Cpu className="w-3.5 h-3.5" />
                Deterministic Engine Verified
              </span>
              <span className="text-xs text-[#536579] font-mono">
                {result.runtime?.engine || 'Python/SciPy 1.17.0'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <label
                htmlFor="studio-chart-kind"
                className="text-xs font-semibold text-[#536579]"
              >
                Chart view:
              </label>
              <select
                id="studio-chart-kind"
                value={chartKind}
                onChange={(e) =>
                  onChangeChartKind(e.target.value as AllowedChart)
                }
                className="rounded-lg border border-[#E3E9EE] bg-[#F7F9FB] px-2.5 py-1 text-xs font-semibold text-[#10233F]"
              >
                <option value="grouped_points">
                  Grouped Raw Points + Mean &amp; 95% CI
                </option>
                <option value="scatter">Scatterplot + Linear Trend</option>
                <option value="time_series">Ordered Line / Time-Series</option>
              </select>
            </div>
          </div>

          <FigureCanvas
            svgRef={svgRef}
            chartKind={chartKind}
            result={result}
            styleConfig={styleConfig}
            datasetName={datasetName}
            sha256Short={sha256.slice(0, 8)}
          />

          {/* Group Descriptive Table beneath figure */}
          {result.groupSummaries.length > 0 && (
            <div className="bg-white border border-[#E3E9EE] rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-[#10233F] flex items-center gap-2">
                  <Table2 className="w-4 h-4 text-[#0F766E]" />
                  Group Descriptive Statistics (Parametric &amp; Non-Parametric)
                </h3>
                <span className="text-xs font-mono text-[#536579]">
                  Units: {styleConfig.unit}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E3E9EE] text-[#536579] uppercase tracking-wider text-[11px]">
                      <th className="py-2 pr-3">Group / Variable</th>
                      <th className="py-2 px-2 text-right">n (valid)</th>
                      <th className="py-2 px-2 text-right">Missing</th>
                      <th className="py-2 px-2 text-right">Mean</th>
                      <th className="py-2 px-2 text-right">SD</th>
                      <th className="py-2 px-2 text-right">Median</th>
                      <th className="py-2 px-2 text-right">IQR</th>
                      <th className="py-2 pl-2 text-right">Min – Max</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E3E9EE] font-mono tabular-nums text-[#10233F]">
                    {result.groupSummaries.map((g) => (
                      <tr key={g.group} className="hover:bg-[#F7F9FB]">
                        <td className="py-2.5 pr-3 font-sans font-semibold">
                          {g.group}
                        </td>
                        <td className="py-2.5 px-2 text-right">{g.n_valid}</td>
                        <td className="py-2.5 px-2 text-right text-[#536579]">
                          {g.n_missing}
                        </td>
                        <td className="py-2.5 px-2 text-right font-semibold">
                          {fmtNum(g.mean, 4)}
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          {fmtNum(g.sd, 4)}
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          {fmtNum(g.median, 4)}
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          {fmtNum(g.iqr, 4)}
                        </td>
                        <td className="py-2.5 pl-2 text-right">
                          {fmtNum(g.min, 3)} – {fmtNum(g.max, 3)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right 1/3 Column: Tabbed Inspector (Results, Figure, Data checks) */}
        <div className="lg:col-span-4 bg-white border border-[#E3E9EE] rounded-2xl shadow-xs overflow-hidden">
          <div className="grid grid-cols-3 border-b border-[#E3E9EE] bg-[#F7F9FB]">
            <button
              type="button"
              onClick={() => setActiveTab('results')}
              className={`py-3 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'results'
                  ? 'border-[#0F766E] text-[#10233F] bg-white'
                  : 'border-transparent text-[#536579] hover:text-[#10233F]'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Results
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('figure')}
              className={`py-3 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'figure'
                  ? 'border-[#0F766E] text-[#10233F] bg-white'
                  : 'border-transparent text-[#536579] hover:text-[#10233F]'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              Figure
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('checks')}
              className={`py-3 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'checks'
                  ? 'border-[#0F766E] text-[#10233F] bg-white'
                  : 'border-transparent text-[#536579] hover:text-[#10233F]'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Data Checks
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* TAB 1: RESULTS */}
            {activeTab === 'results' && (
              <div className="space-y-4">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#0F766E]">
                    Verified Statistical Output (P2)
                  </span>
                  <h3 className="text-base font-bold text-[#10233F]">
                    {result.method === 'welch_t'
                      ? "Welch's Two-Group t-Test"
                      : result.method === 'pearson'
                      ? 'Pearson Linear Correlation'
                      : 'Descriptive Statistical Summary'}
                  </h3>
                  {result.comparisonOrder && (
                    <p className="text-xs text-[#536579] mt-0.5">
                      Direction:{' '}
                      <span className="font-mono font-semibold text-[#10233F]">
                        {result.comparisonOrder.directionLabel}
                      </span>
                    </p>
                  )}
                </div>

                {!result.blocked && result.method === 'welch_t' && (
                  <div className="grid grid-cols-2 gap-2.5 font-mono tabular-nums">
                    <div className="p-3 rounded-xl bg-[#F7F9FB] border border-[#E3E9EE]">
                      <div className="text-[11px] font-sans text-[#536579]">
                        Mean Diff (B - A)
                      </div>
                      <div className="text-sm font-bold text-[#10233F] mt-0.5">
                        {fmtNum(result.numbers.difference_b_minus_a, 4)}{' '}
                        <span className="text-[11px] font-normal">
                          {styleConfig.unit}
                        </span>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-[#F7F9FB] border border-[#E3E9EE]">
                      <div className="text-[11px] font-sans text-[#536579]">
                        95% CI of Diff
                      </div>
                      <div className="text-xs font-bold text-[#10233F] mt-1">
                        [{fmtNum(result.numbers.ci95_low, 4)},{' '}
                        {fmtNum(result.numbers.ci95_high, 4)}]
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-[#F7F9FB] border border-[#E3E9EE]">
                      <div className="text-[11px] font-sans text-[#536579]">
                        Welch t-statistic
                      </div>
                      <div className="text-sm font-bold text-[#10233F] mt-0.5">
                        t = {fmtNum(result.numbers.t_b_minus_a, 4)}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-[#F7F9FB] border border-[#E3E9EE]">
                      <div className="text-[11px] font-sans text-[#536579]">
                        Degrees of freedom
                      </div>
                      <div className="text-sm font-bold text-[#10233F] mt-0.5">
                        df = {fmtNum(result.numbers.df, 4)}
                      </div>
                    </div>
                    <div className="col-span-2 p-3 rounded-xl bg-teal-50/70 border border-teal-200">
                      <div className="text-[11px] font-sans text-[#0F766E] font-semibold">
                        Two-sided p-value (exact Welch-Satterthwaite)
                      </div>
                      <div className="text-base font-bold text-[#10233F] mt-0.5">
                        p = {fmtNum(result.numbers.p_two_sided, 6)}
                      </div>
                    </div>
                  </div>
                )}

                {!result.blocked && result.method === 'pearson' && (
                  <div className="grid grid-cols-2 gap-2.5 font-mono tabular-nums">
                    <div className="p-3 rounded-xl bg-[#F7F9FB] border border-[#E3E9EE]">
                      <div className="text-[11px] font-sans text-[#536579]">
                        Pearson r
                      </div>
                      <div className="text-base font-bold text-[#10233F] mt-0.5">
                        r = {fmtNum(result.numbers.r, 4)}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-[#F7F9FB] border border-[#E3E9EE]">
                      <div className="text-[11px] font-sans text-[#536579]">
                        Complete Pairs (n)
                      </div>
                      <div className="text-base font-bold text-[#10233F] mt-0.5">
                        n = {result.numbers.n}
                      </div>
                    </div>
                    <div className="col-span-2 p-3 rounded-xl bg-teal-50/70 border border-teal-200">
                      <div className="text-[11px] font-sans text-[#0F766E] font-semibold">
                        Two-sided p-value
                      </div>
                      <div className="text-base font-bold text-[#10233F] mt-0.5">
                        p = {fmtNum(result.numbers.p_two_sided, 6)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Raw Key-Value Dictionary */}
                <div>
                  <div className="text-xs font-semibold text-[#536579] mb-1.5">
                    Full Deterministic Number Registry (`result.numbers`)
                  </div>
                  <div className="bg-[#F7F9FB] border border-[#E3E9EE] rounded-xl p-3 max-h-48 overflow-y-auto space-y-1 font-mono text-xs tabular-nums">
                    {Object.entries(result.numbers).map(([k, v]) => (
                      <div
                        key={k}
                        className="flex items-center justify-between gap-2 py-0.5 border-b border-slate-200/60 last:border-0"
                      >
                        <span className="text-[#536579]">{k}</span>
                        <span className="font-semibold text-[#10233F]">
                          {Number.isInteger(v) ? v : v.toPrecision(8)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: FIGURE CUSTOMIZATION */}
            {activeTab === 'figure' && (
              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#536579] mb-1">
                    Figure Title
                  </label>
                  <input
                    type="text"
                    value={styleConfig.title}
                    onChange={(e) =>
                      onUpdateStyleConfig({
                        ...styleConfig,
                        title: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-[#E3E9EE] px-3 py-1.5 text-xs text-[#10233F]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-[#536579] mb-1">
                      X-Axis Label
                    </label>
                    <input
                      type="text"
                      value={styleConfig.xLabel}
                      onChange={(e) =>
                        onUpdateStyleConfig({
                          ...styleConfig,
                          xLabel: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-[#E3E9EE] px-2.5 py-1.5 text-xs text-[#10233F]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#536579] mb-1">
                      Y-Axis Label
                    </label>
                    <input
                      type="text"
                      value={styleConfig.yLabel}
                      onChange={(e) =>
                        onUpdateStyleConfig({
                          ...styleConfig,
                          yLabel: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-[#E3E9EE] px-2.5 py-1.5 text-xs text-[#10233F]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-[#536579] mb-1">
                      Measurement Unit
                    </label>
                    <input
                      type="text"
                      value={styleConfig.unit}
                      onChange={(e) =>
                        onUpdateStyleConfig({
                          ...styleConfig,
                          unit: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-[#E3E9EE] px-2.5 py-1.5 text-xs text-[#10233F]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#536579] mb-1">
                      Color Palette
                    </label>
                    <select
                      value={styleConfig.palette}
                      onChange={(e) =>
                        onUpdateStyleConfig({
                          ...styleConfig,
                          palette: e.target.value as FigurePaletteId,
                        })
                      }
                      className="w-full rounded-lg border border-[#E3E9EE] px-2.5 py-1.5 text-xs text-[#10233F]"
                    >
                      <option value="navy_teal">Navy &amp; Teal (Default)</option>
                      <option value="slate_gold">Slate &amp; Ochre</option>
                      <option value="monochrome_ink">Monochrome Ink</option>
                    </select>
                  </div>
                </div>

                {/* Layer Toggles */}
                <div className="space-y-2 pt-1">
                  <label className="flex items-center gap-2 text-xs text-[#10233F] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={styleConfig.showRawPoints}
                      onChange={(e) =>
                        onUpdateStyleConfig({
                          ...styleConfig,
                          showRawPoints: e.target.checked,
                        })
                      }
                    />
                    Show all individual raw observations (recommended)
                  </label>
                  <label className="flex items-center gap-2 text-xs text-[#10233F] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={styleConfig.showGroupMeans}
                      onChange={(e) =>
                        onUpdateStyleConfig({
                          ...styleConfig,
                          showGroupMeans: e.target.checked,
                        })
                      }
                    />
                    Show group mean markers / linear regression line
                  </label>
                  <label className="flex items-center gap-2 text-xs text-[#10233F] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={styleConfig.showErrorBars}
                      onChange={(e) =>
                        onUpdateStyleConfig({
                          ...styleConfig,
                          showErrorBars: e.target.checked,
                        })
                      }
                    />
                    Show 95% confidence interval error bars
                  </label>
                </div>

                {/* Custom Y-Axis Bounds */}
                <div className="pt-2 border-t border-[#E3E9EE]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-[#536579]">
                      Y-Axis Bounds (Optional)
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateStyleConfig({
                          ...styleConfig,
                          yAxisMin: null,
                          yAxisMax: null,
                        })
                      }
                      className="inline-flex items-center gap-1 text-[11px] text-[#0F766E] hover:underline cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Auto-fit
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="any"
                      placeholder="Auto Y min"
                      value={styleConfig.yAxisMin ?? ''}
                      onChange={(e) =>
                        onUpdateStyleConfig({
                          ...styleConfig,
                          yAxisMin:
                            e.target.value === ''
                              ? null
                              : Number(e.target.value),
                        })
                      }
                      className="w-full rounded-lg border border-[#E3E9EE] px-2.5 py-1.5 text-xs font-mono"
                    />
                    <input
                      type="number"
                      step="any"
                      placeholder="Auto Y max"
                      value={styleConfig.yAxisMax ?? ''}
                      onChange={(e) =>
                        onUpdateStyleConfig({
                          ...styleConfig,
                          yAxisMax:
                            e.target.value === ''
                              ? null
                              : Number(e.target.value),
                        })
                      }
                      className="w-full rounded-lg border border-[#E3E9EE] px-2.5 py-1.5 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: DATA CHECKS & LIMITATIONS */}
            {activeTab === 'checks' && (
              <div className="space-y-3.5 text-xs">
                <div className="p-3 rounded-xl bg-[#F7F9FB] border border-[#E3E9EE] space-y-1">
                  <div className="font-bold text-[#10233F]">
                    Execution Audit Summary
                  </div>
                  <div className="text-[#536579]">
                    Plotted observations:{' '}
                    <span className="font-mono font-semibold text-[#10233F]">
                      {result.points.length}
                    </span>
                  </div>
                  <div className="text-[#536579]">
                    Excluded incomplete rows:{' '}
                    <span className="font-mono font-semibold text-[#10233F]">
                      {result.droppedForAnalysis}
                    </span>
                  </div>
                  <div className="text-[#536579]">
                    Library versions:{' '}
                    <span className="font-mono text-[#10233F]">
                      SciPy {result.runtime?.scipy ?? '1.17.0'}, NumPy{' '}
                      {result.runtime?.numpy ?? '2.2.2'}
                    </span>
                  </div>
                </div>

                {result.warnings.length > 0 && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-1">
                    <div className="font-bold text-[#B45309] flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Warnings ({result.warnings.length})
                    </div>
                    <ul className="list-disc list-inside text-amber-900 space-y-1">
                      {result.warnings.map((w, idx) => (
                        <li key={idx}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="p-3 rounded-xl bg-slate-50 border border-[#E3E9EE] space-y-1">
                  <div className="font-bold text-[#10233F]">
                    Scientific Limitations ({result.limitations.length})
                  </div>
                  <ul className="list-disc list-inside text-[#536579] space-y-1">
                    {result.limitations.map((lim, idx) => (
                      <li key={idx}>{lim}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Step Navigation Footer inside Inspector */}
            <div className="pt-4 border-t border-[#E3E9EE] flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={onBackToPlan}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E3E9EE] bg-white hover:bg-slate-50 text-xs font-semibold text-[#10233F] cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Plan
              </button>

              <button
                type="button"
                disabled={result.blocked}
                onClick={onProceedToExport}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0F766E] hover:bg-[#0d645d] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Export &amp; Evidence Passport
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
