# BUILD_SLICES.md — Proposed seven-day roadmap
**IMPORTANT:** This is pre-planning context, not an official `devpost/checklist.md`. The `5-build` skill creates the approved implementation checklist.

| Day | Slice | Acceptance |
| --- | --- | --- |
| 1 | User-led Devpost skills 1–4, setup, choose method fixture | Approved `devpost` planning artifacts; no skipped steps |
| 2 | Cloudflare React/Vite UI, CSV upload + table profiling | Shows real synthetic CSV counts/missingness; browser smoke test |
| 3 | Pyodide Web Worker + descriptive and Welch calculation | Matches independent SciPy numerical results; no UI freeze |
| 4 | Chart Studio: grouped points, scatter or line as relevant | Figure uses actual data, labels/units editable, axes safe |
| 5 | Cloudflare Workers AI plan/interpret + JSON validation | One live model call works; fallback works offline / error |
| 6 | Evidence Passport + SVG/PNG exports; QA | Valid exported files + numerical and privacy tests |
| 7 | Deployment, demo, official `6-ship` compliance | Public URL, public source, license, correct skill docs, <3m video |

## Slice sequencing principle
Complete one vertical end-to-end path with synthetic two-group data **before** adding a second statistical method. Stretch: Pearson scatter plot and Excel import. Drop stretch features if they jeopardize judged workflow reliability.

## Acceptable deferred features
Payments, SaaS pricing, authentication, R2 uploads, collaborative workspaces, journal presets, batch plot generation, ANOVA, regression, lab-specific domain templates, container-backed Python.
