import React from 'react';
import {
  CheckCircle2,
  Cpu,
  Database,
  FileBarChart2,
  FlaskConical,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { SAMPLE_FIXTURES, type SampleFixtureInfo } from '../lib/sampleFixtures';

export type WizardStep = 1 | 2 | 3 | 4;

interface WizardHeaderProps {
  currentStep: WizardStep;
  maxUnlockedStep: WizardStep;
  onSelectStep: (step: WizardStep) => void;
  activeFileName?: string;
  rowCount?: number;
  runWithoutAi: boolean;
  onToggleRunWithoutAi: (val: boolean) => void;
  onSelectSample: (fixture: SampleFixtureInfo) => void;
  onClearProject: () => void;
  breadcrumbNarrative: string;
}

const STEPS: Array<{
  step: WizardStep;
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { step: 1, label: '1. Data', subtitle: 'Inspect & confirm', icon: Database },
  { step: 2, label: '2. Analysis', subtitle: 'Plan & assumptions', icon: Cpu },
  { step: 3, label: '3. Figure Studio', subtitle: 'Compute & plot', icon: FileBarChart2 },
  { step: 4, label: '4. Export & Evidence', subtitle: 'Passport & files', icon: ShieldCheck },
];

export const WizardHeader: React.FC<WizardHeaderProps> = ({
  currentStep,
  maxUnlockedStep,
  onSelectStep,
  activeFileName,
  rowCount,
  runWithoutAi,
  onToggleRunWithoutAi,
  onSelectSample,
  onClearProject,
  breadcrumbNarrative,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#142F50] text-white border-b border-[#0d2038] shadow-sm">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#087F73] flex items-center justify-center shadow-inner">
              <FlaskConical className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white">
                  EvidencePlot AI
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#087F73]/30 border border-[#087F73] text-[#8CF0E4] font-medium">
                  Research Provenance Engine
                </span>
              </div>
              <p className="text-xs text-slate-300 hidden sm:block">
                Turn raw research data into scientific figures you can verify
              </p>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Sample dataset quick selector */}
            <div className="relative">
              <label htmlFor="header-sample-select" className="sr-only">
                Load synthetic sample dataset
              </label>
              <select
                id="header-sample-select"
                value=""
                onChange={(e) => {
                  const found = SAMPLE_FIXTURES.find((f) => f.id === e.target.value);
                  if (found) onSelectSample(found);
                }}
                className="text-xs bg-[#1E3E66] hover:bg-[#264c7a] text-white border border-slate-500/50 rounded-lg px-2.5 py-1.5 font-medium cursor-pointer"
              >
                <option value="" disabled>
                  Try a sample dataset...
                </option>
                {SAMPLE_FIXTURES.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Run without AI deterministic mode toggle */}
            <button
              type="button"
              id="run-without-ai-toggle"
              aria-pressed={runWithoutAi}
              onClick={() => onToggleRunWithoutAi(!runWithoutAi)}
              className={`inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                runWithoutAi
                  ? 'bg-[#A86710]/35 border-[#E7B84A] text-[#FFE08A]'
                  : 'bg-[#1E3E66] border-teal-400/50 text-white hover:bg-[#264c7a]'
              }`}
              title="Toggle Run without AI to switch between Cloudflare Workers AI and 100% deterministic offline mode"
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-300" aria-hidden="true" />
              <span>Run without AI:</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                  runWithoutAi
                    ? 'bg-[#E7B84A] text-[#10233F]'
                    : 'bg-slate-900/60 text-teal-300'
                }`}
              >
                {runWithoutAi ? 'ON (Deterministic)' : 'OFF (Workers AI)'}
              </span>
            </button>

            {activeFileName && (
              <button
                type="button"
                onClick={onClearProject}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/15 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Clear project</span>
              </button>
            )}
          </div>
        </div>

        {/* 4-Step Wizard Stepper */}
        <nav
          aria-label="Analysis workflow steps"
          className="mt-3 pt-3 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-2"
        >
          {STEPS.map(({ step, label, subtitle, icon: Icon }) => {
            const isCurrent = currentStep === step;
            const isUnlocked = step <= maxUnlockedStep;
            const isCompleted = step < currentStep && isUnlocked;

            return (
              <button
                key={step}
                type="button"
                disabled={!isUnlocked}
                onClick={() => isUnlocked && onSelectStep(step)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all ${
                  isCurrent
                    ? 'bg-[#E7B84A] text-[#10233F] font-semibold shadow-sm cursor-pointer'
                    : isUnlocked
                    ? 'bg-[#1E3E66]/80 hover:bg-[#264c7a] text-white cursor-pointer'
                    : 'bg-[#10233F]/50 text-slate-400 opacity-60 cursor-not-allowed'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2
                    className={`w-4 h-4 shrink-0 ${
                      isCurrent ? 'text-[#10233F]' : 'text-[#34D399]'
                    }`}
                    aria-hidden="true"
                  />
                ) : (
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isCurrent ? 'text-[#10233F]' : 'text-slate-300'
                    }`}
                    aria-hidden="true"
                  />
                )}
                <div className="min-w-0">
                  <div className="text-xs font-semibold truncate">{label}</div>
                  <div
                    className={`text-[11px] truncate ${
                      isCurrent ? 'text-[#10233F]/80' : 'text-slate-300'
                    }`}
                  >
                    {subtitle}
                  </div>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Live Provenance Breadcrumb Bar */}
      <div className="bg-[#0E223B] border-t border-white/10 px-4 sm:px-6 py-1.5 text-xs text-slate-300">
        <div className="max-w-[1400px] mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-[#087F73]" />
            <span className="font-mono text-[11px] text-slate-200">
              {breadcrumbNarrative}
            </span>
          </div>
          {activeFileName && (
            <div className="text-[11px] text-slate-300 tabular-nums">
              Active dataset: <strong className="text-white">{activeFileName}</strong> (
              {rowCount ?? 0} rows · local browser memory only)
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
