import React from 'react';
import {
  CheckCircle2,
  FileSpreadsheet,
  FlaskConical,
  Lock,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { SAMPLE_FIXTURES, type SampleFixtureInfo } from '../lib/sampleFixtures';

interface WelcomeHeroProps {
  onTriggerFileUpload: () => void;
  onSelectSample: (fixture: SampleFixtureInfo) => void;
  hasActiveDataset: boolean;
}

export const WelcomeHero: React.FC<WelcomeHeroProps> = ({
  onTriggerFileUpload,
  onSelectSample,
  hasActiveDataset,
}) => {
  if (hasActiveDataset) {
    return null;
  }

  return (
    <section
      aria-labelledby="welcome-hero-heading"
      className="bg-white border border-[#E3E9EE] rounded-2xl p-6 sm:p-8 shadow-xs mb-6"
    >
      <div className="max-w-3xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#087F73]/10 text-[#087F73] text-xs font-semibold mb-3">
          <ShieldCheck className="w-4 h-4" aria-hidden="true" />
          <span>Neuro-Symbolic Scientific Analysis & Reproducibility Assistant</span>
        </div>

        <h1
          id="welcome-hero-heading"
          className="text-2xl sm:text-4xl font-bold text-[#10233F] tracking-tight leading-tight"
        >
          From raw research data to scientific figures you can verify.
        </h1>

        <p className="mt-2.5 text-base sm:text-lg text-[#536579]">
          Transparent calculations. Publication-minded design. Reproducible exports.
        </p>

        {/* Primary & Secondary CTAs */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onTriggerFileUpload}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E7B84A] hover:bg-[#dca935] text-[#10233F] font-semibold text-sm shadow-xs transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4" aria-hidden="true" />
            <span>Analyze a dataset</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectSample(SAMPLE_FIXTURES[0])}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#142F50] hover:bg-[#1d416d] text-white font-semibold text-sm shadow-xs transition-colors cursor-pointer"
          >
            <FlaskConical className="w-4 h-4" aria-hidden="true" />
            <span>Try a sample dataset (synthetic_groups.csv)</span>
          </button>
        </div>
      </div>

      {/* 3 Value Tiles */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-[#E3E9EE]">
        <div className="p-4 rounded-xl bg-[#F7F9FB] border border-[#E3E9EE]">
          <div className="flex items-center gap-2 font-semibold text-[#10233F] text-sm">
            <FileSpreadsheet className="w-4 h-4 text-[#087F73]" aria-hidden="true" />
            <span>1. Validate</span>
          </div>
          <p className="mt-1.5 text-xs text-[#536579] leading-relaxed">
            Profile CSV columns, missing values, duplicates, category collisions, and measurement units in browser memory—never silently dropping rows.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#F7F9FB] border border-[#E3E9EE]">
          <div className="flex items-center gap-2 font-semibold text-[#10233F] text-sm">
            <CheckCircle2 className="w-4 h-4 text-[#087F73]" aria-hidden="true" />
            <span>2. Analyze</span>
          </div>
          <p className="mt-1.5 text-xs text-[#536579] leading-relaxed">
            Confirm study-design assumptions first. Authoritative statistics (descriptives, Welch&apos;s t-test, Pearson r) come strictly from deterministic Python/SciPy—never guessed by an LLM.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#F7F9FB] border border-[#E3E9EE]">
          <div className="flex items-center gap-2 font-semibold text-[#10233F] text-sm">
            <ShieldCheck className="w-4 h-4 text-[#087F73]" aria-hidden="true" />
            <span>3. Verify &amp; Export</span>
          </div>
          <p className="mt-1.5 text-xs text-[#536579] leading-relaxed">
            Plot every individual observation, trace narrative claims to exact calculations, and export SVG/PNG figures paired with a SHA-256 Figure Evidence Passport.
          </p>
        </div>
      </div>

      {/* Research-only & Privacy Disclaimer */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-xs text-[#536579] bg-[#F7F9FB] px-4 py-2.5 rounded-xl border border-[#E3E9EE]">
        <div className="flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-[#087F73] shrink-0" aria-hidden="true" />
          <span>
            <strong>Privacy &amp; Research Notice:</strong> Your original CSV stays in this browser. This tool supports scientific reporting and reproducibility—not clinical diagnosis or automated journal certification; researchers must verify study design and interpretations.
          </span>
        </div>
      </div>
    </section>
  );
};
