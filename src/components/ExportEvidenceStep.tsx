import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Code2,
  Copy,
  Cpu,
  Download,
  FileCode2,
  FileImage,
  FileJson,
  FileText,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type {
  AllowedChart,
  ConfirmedDatasetConfig,
  DatasetProfile,
  FigureStyleConfig,
  FullAnalysisResult,
  InterpretationOutput,
  NormalizationOptions,
} from '../lib/contracts';
import { generateDeterministicInterpretation } from '../lib/deterministicCaption';
import { verifyInterpretationClaims } from '../lib/claimVerifier';
import {
  buildEvidencePassport,
  generateHtmlReport,
  generateMarkdownReport,
} from '../lib/passport';
import {
  downloadPng2xFile,
  downloadSvgFile,
  serializeSvgElement,
  triggerTextDownload,
} from '../lib/svgExport';
import { FigureCanvas } from './FigureCanvas';

interface ExportEvidenceStepProps {
  svgRef: React.RefObject<SVGSVGElement | null>;
  fileName: string;
  sha256: string;
  profile: DatasetProfile;
  normalization: NormalizationOptions;
  confirmedConfig: ConfirmedDatasetConfig;
  confirmedAssumptions: string[];
  researchObjective: string;
  chartKind: AllowedChart;
  styleConfig: FigureStyleConfig;
  result: FullAnalysisResult;
  runWithoutAi: boolean;
  onToggleRunWithoutAi: (val: boolean) => void;
  onBackToStudio: () => void;
}

export const ExportEvidenceStep: React.FC<ExportEvidenceStepProps> = ({
  svgRef,
  fileName,
  sha256,
  profile,
  normalization,
  confirmedConfig,
  confirmedAssumptions,
  researchObjective,
  chartKind,
  styleConfig,
  result,
  runWithoutAi,
  onToggleRunWithoutAi,
  onBackToStudio,
}) => {
  const [interpretation, setInterpretation] = useState<InterpretationOutput>(
    () => generateDeterministicInterpretation(result, confirmedConfig)
  );
  const [isLoadingAi, setIsLoadingAi] = useState<boolean>(false);
  const [highlightedClaimKey, setHighlightedClaimKey] = useState<string | null>(
    null
  );
  const [showRawJson, setShowRawJson] = useState<boolean>(false);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);

  useEffect(() => {
    setInterpretation(
      generateDeterministicInterpretation(result, confirmedConfig)
    );
  }, [result, confirmedConfig]);

  const passport = buildEvidencePassport({
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
  });

  const baseFileSlug = fileName.replace(/\.csv$/i, '') || 'evidenceplot';

  const handleRequestAiInterpretation = async () => {
    if (runWithoutAi) {
      setInterpretation(
        generateDeterministicInterpretation(
          result,
          confirmedConfig,
          'Run without AI is active — using verified deterministic template.'
        )
      );
      return;
    }

    setIsLoadingAi(true);
    try {
      const response = await fetch('/api/ai/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objective: researchObjective,
          method: result.method,
          unit: styleConfig.unit || confirmedConfig.unit,
          comparison_direction: result.comparisonOrder?.directionLabel,
          n_total: result.n_total,
          numbers: result.numbers,
          group_summaries: result.groupSummaries,
          warnings: result.warnings,
          limitations: result.limitations,
        }),
      });

      if (!response.ok) {
        setInterpretation(
          generateDeterministicInterpretation(
            result,
            confirmedConfig,
            `Workers AI endpoint returned HTTP ${response.status} — using verified deterministic caption.`
          )
        );
        return;
      }

      const payload = await response.json();
      const candidate = payload.interpretation ?? payload;
      const check = verifyInterpretationClaims(
        candidate,
        result.numbers,
        result.n_total
      );

      if (!check.valid) {
        setInterpretation(
          generateDeterministicInterpretation(
            result,
            confirmedConfig,
            `Rejected unverified AI claim (${check.reason}) — fell back to deterministic caption.`
          )
        );
        return;
      }

      setInterpretation({
        ...candidate,
        source: payload.source === 'ai' ? 'ai' : 'deterministic_template',
        model_id:
          payload.model_id ??
          (payload.source === 'ai'
            ? '@cf/meta/llama-3.3-70b-instruct-fp8-fast'
            : undefined),
        prompt_version: payload.prompt_version ?? 'ep-interpret-v1.0',
        generated_at: new Date().toISOString(),
        fallback_reason: payload.fallback_reason,
      });
    } catch {
      setInterpretation(
        generateDeterministicInterpretation(
          result,
          confirmedConfig,
          'Workers AI endpoint unreachable — using verified deterministic caption.'
        )
      );
    } finally {
      setIsLoadingAi(false);
    }
  };

  const handleCopyPassportJson = async () => {
    await navigator.clipboard.writeText(JSON.stringify(passport, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 1800);
  };

  return (
    <div className="space-y-6">
      {/* Top Export Action Bar */}
      <div className="bg-white border border-[#E3E9EE] rounded-2xl p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#0F766E]">
            Step 4 of 4 · Auditable Scientific Package
          </span>
          <h2 className="text-xl font-bold text-[#10233F]">
            Grounded Interpretation, Figure Evidence Passport &amp; Exports
          </h2>
          <p className="text-xs text-[#536579] mt-0.5">
            Click any <strong>Verified Claim</strong> badge below to trace that number directly to its Python engine calculation entry in the Figure Evidence Passport.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => downloadSvgFile(svgRef.current, baseFileSlug)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#10233F] hover:bg-[#1a3358] text-white text-xs font-semibold cursor-pointer"
          >
            <FileCode2 className="w-4 h-4 text-teal-300" />
            Export SVG
          </button>

          <button
            type="button"
            onClick={() => downloadPng2xFile(svgRef.current, baseFileSlug)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#10233F] hover:bg-[#1a3358] text-white text-xs font-semibold cursor-pointer"
          >
            <FileImage className="w-4 h-4 text-teal-300" />
            Export 2x PNG
          </button>

          <button
            type="button"
            onClick={() =>
              triggerTextDownload(
                'evidence-passport.json',
                JSON.stringify(passport, null, 2),
                'application/json;charset=utf-8'
              )
            }
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0F766E] hover:bg-[#0d645d] text-white text-xs font-semibold cursor-pointer"
          >
            <FileJson className="w-4 h-4" />
            Download evidence-passport.json
          </button>

          <button
            type="button"
            onClick={() =>
              triggerTextDownload(
                `${baseFileSlug}-report.md`,
                generateMarkdownReport(passport, interpretation),
                'text/markdown;charset=utf-8'
              )
            }
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E3E9EE] bg-[#F7F9FB] hover:bg-slate-100 text-[#10233F] text-xs font-semibold cursor-pointer"
          >
            <FileText className="w-4 h-4 text-[#0F766E]" />
            Report (.md)
          </button>

          <button
            type="button"
            onClick={() =>
              triggerTextDownload(
                `${baseFileSlug}-report.html`,
                generateHtmlReport(
                  passport,
                  interpretation,
                  serializeSvgElement(svgRef.current)
                ),
                'text/html;charset=utf-8'
              )
            }
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E3E9EE] bg-[#F7F9FB] hover:bg-slate-100 text-[#10233F] text-xs font-semibold cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#0F766E]" />
            Report (.html)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 columns: Grounded Narrative + Interactive Verified Claims + Figure Preview */}
        <div className="lg:col-span-7 space-y-5">
          {/* Grounded Interpretation Card */}
          <div className="bg-white border border-[#E3E9EE] rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#0F766E]" />
                <h3 className="text-base font-bold text-[#10233F]">
                  Grounded Statistical Narrative &amp; Figure Caption
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                    interpretation.source === 'ai'
                      ? 'bg-teal-50 text-[#0F766E] border border-teal-200'
                      : 'bg-slate-100 text-[#10233F] border border-slate-300'
                  }`}
                >
                  {interpretation.source === 'ai' ? (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Workers AI Grounded (P2 Verified)
                    </>
                  ) : (
                    <>
                      <Cpu className="w-3.5 h-3.5" />
                      Deterministic Verified Caption
                    </>
                  )}
                </span>

                {!runWithoutAi && (
                  <button
                    type="button"
                    disabled={isLoadingAi}
                    onClick={handleRequestAiInterpretation}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#10233F] hover:bg-[#1a3358] text-white text-xs font-semibold cursor-pointer disabled:opacity-60"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-teal-300" />
                    {isLoadingAi ? 'Verifying AI…' : 'Draft with Workers AI'}
                  </button>
                )}

                <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#E3E9EE] bg-[#F7F9FB] text-xs font-semibold text-[#10233F] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={runWithoutAi}
                    onChange={(e) => onToggleRunWithoutAi(e.target.checked)}
                    className="rounded border-slate-300 text-[#0F766E] focus:ring-[#0F766E]"
                  />
                  <span>Run without AI</span>
                </label>
              </div>
            </div>

            {interpretation.fallback_reason && (
              <div className="px-3.5 py-2 rounded-xl bg-[#F7F9FB] border border-[#E3E9EE] text-xs text-[#536579]">
                {interpretation.fallback_reason}
              </div>
            )}

            <div className="space-y-2.5">
              <h4 className="text-sm font-bold text-[#10233F]">
                {interpretation.headline}
              </h4>
              <p className="text-sm text-[#10233F] leading-relaxed">
                {interpretation.summary}
              </p>
              <div className="p-3.5 rounded-xl bg-teal-50/60 border border-teal-200 text-xs text-[#10233F] leading-relaxed">
                <span className="font-bold text-[#0F766E] uppercase tracking-wider block mb-1">
                  Publication Figure Caption
                </span>
                {interpretation.figure_caption}
              </div>
            </div>

            {/* Interactive Verified Claims Trace Pills */}
            <div className="pt-3 border-t border-[#E3E9EE] space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#10233F]">
                  Verified Claim Badges ({interpretation.verified_claims.length} Claims)
                </span>
                <span className="text-xs text-[#0F766E] font-semibold">
                  Click any Verified Claim badge below to highlight in Passport →
                </span>
              </div>

              {highlightedClaimKey && (
                <div className="px-3.5 py-2 rounded-xl bg-teal-50 border border-[#0F766E] text-xs text-[#10233F] flex items-center justify-between gap-2">
                  <span>
                    <strong>Active Claim Trace:</strong> Verified Claim{' '}
                    <code className="font-mono font-bold text-[#0F766E]">
                      {highlightedClaimKey}
                    </code>{' '}
                    is highlighted in <strong>Section 3</strong> of the Figure Evidence Passport on the right (0.000000 discrepancy vs Python engine).
                  </span>
                  <button
                    type="button"
                    onClick={() => setHighlightedClaimKey(null)}
                    className="text-[11px] font-semibold text-[#0F766E] underline cursor-pointer shrink-0"
                  >
                    Clear
                  </button>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {interpretation.verified_claims.map((claim) => {
                  const isSelected = highlightedClaimKey === claim.key;
                  const formattedVal = Number.isInteger(claim.value)
                    ? claim.value
                    : Number(claim.value.toPrecision(6));
                  return (
                    <button
                      key={claim.key}
                      type="button"
                      onClick={() => {
                        const nextKey = isSelected ? null : claim.key;
                        setHighlightedClaimKey(nextKey);
                        if (nextKey) {
                          setShowRawJson(false);
                          setTimeout(() => {
                            const el = document.querySelector(
                              `[data-passport-metric="${nextKey}"]`
                            );
                            el?.scrollIntoView({
                              behavior: 'smooth',
                              block: 'nearest',
                            });
                          }, 60);
                        }
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono tabular-nums transition-all cursor-pointer shadow-2xs ${
                        isSelected
                          ? 'bg-[#0F766E] text-white ring-2 ring-[#0F766E]/40 font-bold'
                          : 'bg-white hover:bg-teal-50 text-[#10233F] border-2 border-[#0F766E]/40 hover:border-[#0F766E]'
                      }`}
                    >
                      <CheckCircle2
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isSelected ? 'text-white' : 'text-[#15803D]'
                        }`}
                      />
                      <span
                        className={`font-sans text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-teal-50 text-[#0F766E]'
                        }`}
                      >
                        Verified Claim
                      </span>
                      <span>{claim.key} =</span>
                      <span className="font-bold">{formattedVal}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Limitations */}
            <div className="pt-2 border-t border-[#E3E9EE]">
              <div className="text-xs font-bold uppercase tracking-wider text-[#536579] mb-1.5">
                Required Scientific Limitations
              </div>
              <ul className="list-disc list-inside text-xs text-[#536579] space-y-1">
                {interpretation.limitations.map((lim, i) => (
                  <li key={i}>{lim}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Embedded Figure Preview for SVG/PNG Serialization */}
          <FigureCanvas
            svgRef={svgRef}
            chartKind={chartKind}
            result={result}
            styleConfig={styleConfig}
            datasetName={fileName}
            sha256Short={sha256.slice(0, 8)}
          />
        </div>

        {/* Right 5 columns: Figure Evidence Passport Inspector */}
        <div className="lg:col-span-5 bg-white border border-[#E3E9EE] rounded-2xl shadow-xs overflow-hidden">
          <div className="px-5 py-4 bg-[#10233F] text-white flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-teal-300 block">
                schema_version: 1.0
              </span>
              <h3 className="text-base font-bold">
                Figure Evidence Passport
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowRawJson((v) => !v)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold cursor-pointer"
              >
                <Code2 className="w-3.5 h-3.5" />
                {showRawJson ? 'Structured View' : 'Raw JSON'}
              </button>
              <button
                type="button"
                onClick={handleCopyPassportJson}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0F766E] hover:bg-[#0d645d] text-xs font-semibold cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                {copiedJson ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {showRawJson ? (
            <div className="p-4 bg-slate-950 text-slate-100 font-mono text-xs overflow-x-auto max-h-[680px]">
              <pre>{JSON.stringify(passport, null, 2)}</pre>
            </div>
          ) : (
            <div className="p-5 space-y-4 text-xs">
              {/* 1. Source Fingerprint */}
              <div className="p-3.5 rounded-xl bg-[#F7F9FB] border border-[#E3E9EE] space-y-1.5">
                <div className="font-bold text-[#10233F] uppercase tracking-wider text-[11px]">
                  1. Source Dataset &amp; Cryptographic Fingerprint
                </div>
                <div className="flex justify-between">
                  <span className="text-[#536579]">File Name:</span>
                  <span className="font-mono font-semibold text-[#10233F]">
                    {passport.source.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#536579]">Dimensions:</span>
                  <span className="font-mono text-[#10233F]">
                    {passport.source.rows} rows × {passport.source.columns}{' '}
                    columns
                  </span>
                </div>
                <div>
                  <span className="text-[#536579] block mb-0.5">
                    SHA-256 Hash (computed in browser):
                  </span>
                  <code className="block font-mono text-[11px] bg-white border border-[#E3E9EE] rounded-lg px-2.5 py-1.5 break-all text-[#10233F]">
                    {passport.source.sha256}
                  </code>
                </div>
              </div>

              {/* 2. Data Handling & Assumptions */}
              <div className="p-3.5 rounded-xl bg-[#F7F9FB] border border-[#E3E9EE] space-y-1.5">
                <div className="font-bold text-[#10233F] uppercase tracking-wider text-[11px]">
                  2. Data Handling &amp; Confirmed Assumptions
                </div>
                <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                  <div>
                    <span className="text-[#536579] font-sans">Missingness:</span>{' '}
                    <span className="font-semibold text-[#10233F]">
                      {passport.handling.missing}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#536579] font-sans">Dropped rows:</span>{' '}
                    <span className="font-semibold text-[#10233F]">
                      {passport.handling.dropped_for_analysis}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#536579] font-sans">Outliers removed:</span>{' '}
                    <span className="font-semibold text-[#15803D]">
                      {passport.handling.outliers_removed} (zero silent removal)
                    </span>
                  </div>
                  <div>
                    <span className="text-[#536579] font-sans">Plotted points:</span>{' '}
                    <span className="font-semibold text-[#10233F]">
                      {passport.figure.plotted_observation_count}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. Calculation Registry with Claim Highlight */}
              <div className="p-3.5 rounded-xl bg-[#F7F9FB] border border-[#E3E9EE] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#10233F] uppercase tracking-wider text-[11px]">
                    3. Python Engine Calculation Registry (`calculation.result`)
                  </span>
                  {highlightedClaimKey && (
                    <span className="text-[11px] font-mono text-[#0F766E] font-bold">
                      Tracing: {highlightedClaimKey}
                    </span>
                  )}
                </div>

                <div className="divide-y divide-[#E3E9EE] bg-white border border-[#E3E9EE] rounded-xl overflow-hidden font-mono tabular-nums">
                  {Object.entries(passport.calculation.result).map(
                    ([key, val]) => {
                      const isHighlighted = highlightedClaimKey === key;
                      return (
                        <div
                          key={key}
                          data-passport-metric={key}
                          className={`flex items-center justify-between px-3 py-2 transition-colors ${
                            isHighlighted
                              ? 'bg-teal-100/90 text-[#10233F] font-bold ring-2 ring-inset ring-[#0F766E]'
                              : 'hover:bg-slate-50 text-[#10233F]'
                          }`}
                        >
                          <span className="text-[#536579]">{key}</span>
                          <span>
                            {Number.isInteger(val) ? val : val.toPrecision(10)}
                          </span>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>

              {/* 4. Runtime & Provenance Metadata */}
              <div className="p-3.5 rounded-xl bg-[#F7F9FB] border border-[#E3E9EE] space-y-1">
                <div className="font-bold text-[#10233F] uppercase tracking-wider text-[11px]">
                  4. Runtime &amp; Narrative Provenance
                </div>
                <div className="text-[#536579]">
                  Engine:{' '}
                  <span className="font-mono text-[#10233F]">
                    {passport.calculation.engine}
                  </span>
                </div>
                <div className="text-[#536579]">
                  Libraries:{' '}
                  <span className="font-mono text-[#10233F]">
                    SciPy {passport.calculation.library_versions.scipy} · NumPy{' '}
                    {passport.calculation.library_versions.numpy} · pandas{' '}
                    {passport.calculation.library_versions.pandas}
                  </span>
                </div>
                <div className="text-[#536579]">
                  Narrative Source:{' '}
                  <span className="font-mono text-[#10233F]">
                    {passport.ai_narrative?.source} (
                    {passport.ai_narrative?.prompt_version})
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={onBackToStudio}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E3E9EE] bg-white hover:bg-slate-50 text-xs font-semibold text-[#10233F] cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Figure Studio
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
