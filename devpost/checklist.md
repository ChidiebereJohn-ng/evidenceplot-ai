---
doc: checklist
status: approved
---

# Build Checklist

Build mode: fast

## Slices

- [x] **1. Load or upload a CSV dataset, inspect its SHA-256 fingerprint and quality profile, and confirm variables/assumptions**
  Becomes usable: A running React + Vite + Tailwind + Cloudflare Worker app where you can click **Try a sample dataset** (`synthetic_groups.csv`, `synthetic_correlation.csv`, `messy_example.csv`) or upload a `.csv`, see the local SHA-256 hash, 10-row preview, missing/duplicate/coercion/identifier flags, opt-in whitespace and complete-case normalization controls, and confirm columns, units, and independent observations to unlock Step 2.
  Why now: Bootstraps the project per the spec and proves browser-only CSV intake, SHA-256 provenance fingerprinting, and messy-data guardrails end to end on the first step.
  PRD ref: `prd.md > The Core Journey` (steps 1-2), `prd.md > Screens and Layout`, `prd.md > Look and Feel`, `prd.md > 1. CSV Intake, Validation, and Data Profiling`
  Spec ref: `spec.md > Stack`, `spec.md > Look and Feel`, `spec.md > 1. App Shell, Welcome Banner & 4-Step Wizard (\`src/App.tsx\`, \`src/components/WizardHeader.tsx\`, \`src/components/WelcomeHero.tsx\`)`, `spec.md > 2. CSV Parser, SHA-256 Fingerprinter & Data Inspector (\`src/lib/csvParser.ts\`, \`src/components/DataInspectorStep.tsx\`)`, `spec.md > File Structure`
  Build: Scaffold the React + Vite + TypeScript + Tailwind + Cloudflare Worker project in root, bundle the synthetic CSV fixtures under `public/examples/`, implement `src/lib/contracts.ts`, `src/lib/csvParser.ts`, `src/lib/dataProfiler.ts`, the Welcome hero, the 4-step wizard header, and `src/components/DataInspectorStep.tsx`, plus unit tests in `tests/profiler-edge-cases.test.ts`.
  Verify (mechanical): Run `npm run test` and `npm run build` to confirm all TypeScript types and profiler tests (`synthetic_groups.csv` 12x4 profile and `messy_example.csv` flags/PII detection) pass with zero errors, and start the dev server to confirm Step 1 renders and validates datasets.
  Learner check: Open the app, click **Try a sample dataset** to load both `synthetic_groups.csv` and `messy_example.csv`, inspect the preview and quality flags, and confirm the calm scientific look and feel matches your vision.
  Commit: `Scaffold app and add CSV intake, SHA-256 hashing, and Step 1 data inspector`

- [x] **2. Run deterministic Welch two-group and descriptive analyses in the Python worker and customize the grouped raw-point plot in Figure Studio**
  Becomes usable: You can enter a research objective in Step 2, select or confirm **Welch's independent two-group t-test** or **Descriptive summaries**, check the required assumption gate, run the deterministic calculation via the Pyodide Web Worker (`src/python/engine.py` + `src/lib/scientificEngine.ts`), and use **Step 3 (Figure Studio)** to inspect all 12 plotted observations (`synthetic_groups.csv`), view exact statistics (`t = 7.3800`, `df = 9.9988`, `p = 0.00002371`, `difference = 3.55`, 95% CI `[2.4782, 4.6218]`), and edit title, axis labels, units, safe bounds, palette, and point display.
  Why now: Delivers the core scientific kernel and primary vertical slice early—proving 100% numerical parity against `examples/reference_outputs.json`, assumption blocking (`3+ groups`, `n < 2`, unconfirmed independence), and raw-point SVG visualization before adding AI calls.
  PRD ref: `prd.md > The Core Journey` (steps 3-4), `prd.md > 2. Research Objective, AI Planning, and Assumption Confirmation`, `prd.md > 3. Deterministic Statistical Engine & Safeguards`, `prd.md > 4. Figure Studio & Interactive Customization`
  Spec ref: `spec.md > 3. Analysis Planner & Assumption Gate (\`src/components/AnalysisPlanStep.tsx\`)`, `spec.md > 4. Pyodide Scientific Engine & Web Worker (\`src/workers/analysis.worker.ts\`, \`src/python/engine.py\`, \`src/lib/scientificEngine.ts\`)`, `spec.md > 5. Figure Studio & Deterministic SVG Renderer (\`src/components/FigureStudioStep.tsx\`, \`src/components/FigureCanvas.tsx\`, \`src/lib/svgExport.ts\`)`
  Build: Implement `src/python/engine.py`, `src/lib/scientificEngine.ts`, `src/workers/analysis.worker.ts`, `src/components/AnalysisPlanStep.tsx`, `src/components/FigureCanvas.tsx`, and `src/components/FigureStudioStep.tsx`, plus golden numerical parity tests in `tests/golden-engine.test.ts` verifying exact agreement with `examples/reference_outputs.json`.
  Verify (mechanical): Run `npm run test` to verify `tests/golden-engine.test.ts` matches `examples/reference_outputs.json` within `< 1e-9` tolerance and blocks invalid preconditions (3 groups, `n < 2`, zero variance), and verify in the running app that confirming `welch_t` on `synthetic_groups.csv` renders all 12 data points and live Figure Studio edits.
  Learner check: Load `synthetic_groups.csv`, confirm independent observations in Step 2, inspect the 12 plotted points and Welch's t-test numbers in Step 3, and try editing the chart title, units, and color theme.
  Commit: `Add Pyodide/SciPy statistical engine, assumption gate, and Figure Studio`

- [x] **3. Generate the Figure Evidence Passport, trace claims to verified numbers, and export SVG, PNG, Passport JSON, and summary report**
  Becomes usable: In **Step 4 (Export & Evidence)**, you can review the grounded figure caption and limitations, click interactive **Verified Claims** badges to highlight the matching calculation row in the expandable **Figure Evidence Passport**, and download real `.svg`, `2x` `.png`, `evidence-passport.json`, and `.md`/`.html` summary report files—completing the primary two-group workflow end to end.
  Why now: Completes the signature differentiator (**Figure Evidence Passport** + verified exports) so the primary two-group vertical slice is 100% functional end to end, including full **Run without AI** deterministic operation.
  PRD ref: `prd.md > The Core Journey` (step 5), `prd.md > 5. Grounded Interpretation, Figure Evidence Passport & Exports`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > 6. Interpretation Verifier, Evidence Passport & Exporter (\`src/components/ExportEvidenceStep.tsx\`, \`src/lib/passport.ts\`, \`src/lib/deterministicCaption.ts\`)`, `spec.md > Data Model`
  Build: Implement `src/lib/deterministicCaption.ts`, `src/lib/claimVerifier.ts`, `src/lib/passport.ts`, `src/lib/svgExport.ts`, and `src/components/ExportEvidenceStep.tsx`, plus schema and Passport tests in `tests/contracts-and-passport.test.ts`.
  Verify (mechanical): Run `npm run test` to confirm `evidence-passport.json` schema completeness and claim verification, and verify in the browser that clicking **Verified Claims** badges highlights the Passport row and all 4 download buttons (`SVG`, `PNG`, `Passport JSON`, `Summary Report`) produce valid files.
  Learner check: Complete the 4-step flow on `synthetic_groups.csv`, click a verified claim badge in Step 4, expand the Figure Evidence Passport, and download the SVG, PNG, and `evidence-passport.json`.
  Commit: `Add Figure Evidence Passport, claim-to-number trace, and SVG/PNG/JSON/report exports`

- [x] **4. Connect Cloudflare Workers AI (`/api/ai/plan` and `/api/ai/interpret`) with Zod schema validation and deterministic fallback**
  Becomes usable: Clicking **Propose analysis plan** in Step 2 calls the same-origin Cloudflare Worker (`POST /api/ai/plan`) with sanitized column metadata (`P1`) to suggest an allowlisted method and chart, and Step 4 calls `POST /api/ai/interpret` with verified calculation outputs (`P2`) to generate an AI narrative whose numbers are programmatically checked against the Python engine (with automatic fallback if AI is offline or returns an unverified claim).
  Why now: Connects live Cloudflare Workers AI (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`) to the proven deterministic pipeline while verifying that privacy boundaries (`P0` never sent) and fallback paths hold under all conditions.
  PRD ref: `prd.md > 2. Research Objective, AI Planning, and Assumption Confirmation`, `prd.md > 5. Grounded Interpretation, Figure Evidence Passport & Exports`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > 7. Cloudflare Worker API & Schema Guard (\`worker/index.ts\`, \`src/lib/contracts.ts\`)`, `spec.md > External Services and Dependencies`, `spec.md > Important Failure Modes`
  Build: Implement `worker/index.ts` (`GET /api/health`, `POST /api/ai/plan`, `POST /api/ai/interpret`) with `env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast')` JSON schema mode, Zod validation, payload size/PII guards, and `claimVerifier` enforcement, and wire the frontend planner and interpretation steps with live AI status and fallback banners.
  Verify (mechanical): Run `npm run test` and `npm run build` to verify Worker route handlers, Zod validation, and unverified-claim rejection tests pass, and test `/api/health`, `/api/ai/plan`, and `/api/ai/interpret` (including fallback behavior when AI is unavailable or bypassed).
  Learner check: Enter a research objective in Step 2, test **Propose analysis plan** and the **Run without AI** toggle, and confirm the privacy notice and fallback behavior work cleanly.
  Commit: `Add Cloudflare Workers AI plan and interpret endpoints with schema and claim guards`

- [x] **5. Add Pearson correlation scatterplot and validated time-series line chart**
  Becomes usable: You can load `synthetic_correlation.csv` (or a time-indexed CSV), run **Pearson correlation** (`n = 10`, `r = 0.9854`, `p = 1.9487e-7`) or a validated **time-series line chart**, customize the **scatterplot** or **time-series line** in Figure Studio, and export its verified Figure Evidence Passport and graphics.
  Why now: Completes the secondary in-scope allowlisted analyses and chart types on top of the verified primary vertical slice.
  PRD ref: `prd.md > 3. Deterministic Statistical Engine & Safeguards`, `prd.md > 4. Figure Studio & Interactive Customization`, `prd.md > What We're Building`
  Spec ref: `spec.md > 4. Pyodide Scientific Engine & Web Worker (\`src/workers/analysis.worker.ts\`, \`src/python/engine.py\`, \`src/lib/scientificEngine.ts\`)`, `spec.md > 5. Figure Studio & Deterministic SVG Renderer (\`src/components/FigureStudioStep.tsx\`, \`src/components/FigureCanvas.tsx\`, \`src/lib/svgExport.ts\`)`
  Build: Complete the `pearson` and `time_series` paths in `src/components/DataInspectorStep.tsx`, `src/components/AnalysisPlanStep.tsx`, `src/components/FigureCanvas.tsx`, and `src/components/FigureStudioStep.tsx`, and verify end-to-end against `synthetic_correlation.csv` (`examples/reference_outputs.json`).
  Verify (mechanical): Run `npm run test` and `npm run build`, and verify in the browser that `synthetic_correlation.csv` computes `n = 10`, `r = 0.9854`, `p = 1.9487e-7`, renders all 10 `(x, y)` points on the scatterplot, and exports a valid Evidence Passport.
  Learner check: Load `synthetic_correlation.csv`, run the Pearson correlation workflow through Step 4, and inspect the resulting scatterplot and Evidence Passport.
  Commit: `Complete Pearson correlation scatterplot and time-series line chart workflows`

## Hands-on Checkpoints

- [x] Early usable behavior explored — after Slice 4 (complete primary two-group Welch's t-test + Workers AI + Figure Studio + Evidence Passport vertical slice; learner also tested `synthetic_correlation.csv` Pearson correlation scatterplot and exports)
- [ ] Final kick-the-tires exploration and feedback completed

## Final Review

- [ ] Verify local Vite dev Workers AI binding (`createLocalDevAiBinding` in `worker/index.ts` and `vite.config.ts`) so **Propose Analysis Plan (Workers AI)** in Step 2 and **Draft with Workers AI** in Step 4 work out of the box in `npm run dev`
- [ ] Verify sticky header **Run without AI** toggle (`Run without AI: OFF (Workers AI)` / `ON (Deterministic)`) and inline **Run without AI** checkboxes in Step 2 and Step 4
- [ ] Verify explicitly labeled **Verified Claim** badges (`Verified Claim · key = value`) and active claim trace banner + Section 3 row highlight in Step 4
- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [ ] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [ ] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [ ] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: [what actually happened; real document/test/code references; unfinished work if interrupted]
Route and stops: [actual paths and symbols; guided stops completed, or reference-only route]
Edit outcome: [tried/kept/reverted/declined/not applicable; verification if changed]
Reflection: [offered/answered/declined/already covered — personal answer belongs only in the ignored profile]
Activity mode: [live app and editor, explicit static fallback, focused alternative, prior practice, or recap]

## Revisions

- Added `createLocalDevAiBinding()` in `worker/index.ts` and wired it into `vite.config.ts` local SSR middleware after hands-on testing showed `handleApiRequest(request, {})` was missing an `AI` binding during local `npm run dev`.
- Made `WizardHeader` sticky (`sticky top-0 z-30`), renamed the mode toggle explicitly to `Run without AI: OFF (Workers AI)` / `ON (Deterministic)`, and added inline `Run without AI` checkboxes directly next to the AI action buttons in Step 2 and Step 4.
- Added an explicit `Verified Claim` label badge on each clickable claim chip in `ExportEvidenceStep.tsx`, plus an active trace confirmation banner and smooth scroll to Section 3 of the Figure Evidence Passport.

