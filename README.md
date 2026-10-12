# EvidencePlot AI

Research plotting and statistical analysis web application with a neuro-symbolic trust boundary (`P0` browser-only raw CSV rows, `P1` sanitized column metadata for planning, deterministic Python/SciPy calculation engine, and `P2` verified numeric claim checking + `evidence-passport.json`).

## Architecture & Directory Layout

- `src/lib/` — Browser CSV parser (`csvParser.ts`), SHA-256 fingerprinter, data quality profiler (`dataProfiler.ts`), deterministic statistical engine (`scientificEngine.ts`), numeric claim verifier (`claimVerifier.ts`), Figure Evidence Passport builder (`passport.ts`), and SVG/2x PNG exporter (`svgExport.ts`).
- `src/python/engine.py` & `src/workers/analysis.worker.ts` — Pyodide/SciPy Web Worker runtime (`v0.27.2`).
- `src/components/` — 4-step guided wizard UI (`DataInspectorStep`, `AnalysisPlanStep`, `FigureStudioStep`, `ExportEvidenceStep`, `FigureCanvas`).
- `worker/index.ts` — Cloudflare Worker API (`/api/health`, `/api/ai/plan`, `/api/ai/interpret`) using Workers AI (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`) with Zod schema validation, `RAW_ROWS_PROHIBITED` (`P0`) privacy guard, and deterministic fallback.
- `public/examples/` — Synthetic test fixtures (`synthetic_groups.csv`, `synthetic_correlation.csv`, `messy_example.csv`, and SciPy 1.17.0 golden reference outputs `reference_outputs.json`).
- `tests/` — Automated Vitest test suites (`profiler-edge-cases.test.ts`, `golden-engine.test.ts`, `contracts-and-passport.test.ts`, `end-to-end-journey.test.ts`).
- `devpost/` — Approved planning and architecture documents (`scope.md`, `prd.md`, `spec.md`, `checklist.md`, and standalone `app-map.html`). Note: `devpost/learner-profile.md` is excluded via `.gitignore`.

## Local Development & Verification

### Prerequisites
- Node.js 20+ and npm

### Install Dependencies
```bash
npm install
```

### Run Automated Test Suite (15 Tests Across 4 Suites)
```bash
npm run test
```

### Start Local Development Server
```bash
npm run dev
```
Open `http://localhost:5173/` in your browser.

### Build Production Bundle
```bash
npm run build
```

### Optional Cloudflare Workers Deployment
```bash
npx wrangler deploy
```
Configure any local Wrangler overrides in `.dev.vars` (see `.env.example`; never commit real credentials).
