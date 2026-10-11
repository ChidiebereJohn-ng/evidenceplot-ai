# PROJECT.md — EvidencePlot AI
**Working title:** EvidencePlot AI (name not trademark cleared)
**Product type:** Research plotting and analysis assistant
**ICP:** Postgraduate experimental researchers and early-career laboratory scientists in environmental, chemical and biomedical research who have small CSV datasets and need publication-quality charts with explainable methodology.
**Secondary user (later):** Research supervisors and laboratory teams.

## Problem statement
Researchers can often generate a chart in Excel or a chatbot, but may struggle to choose a defensible analysis, keep plotted values linked to source rows, confirm labels/units, and reproduce exported figures. Bad plots can misrepresent data or require manual rework.

## Job to be done
"Given my measurements and research question, help me validate the data, produce an appropriate figure, explain the results accurately, and preserve a reproducible record—without coding."

## Product promise
**Turn raw data into figures you can verify.**

## Signature differentiator
**Figure Evidence Passport:** Every plot has source filename/fingerprint, column mapping, analysis choice, exclusion/missingness handling, calculation values, chart spec, export metadata and library versions. Results are auditable and reproducible; do not claim it is journal-certified.

## Primary demo scenario
A researcher uploads a *synthetic* experiment CSV: independent treatment/control groups and a continuous response variable. Enters "Compare the groups and create an appropriate figure." Product profiles the data, asks them to confirm independence/units, recommends a grouped individual-value plot and Welch's t-test where appropriate, performs Python calculations, renders edit controls, grounds a concise summary on numeric output, and exports chart + Passport.

## MVP scope (must deliver one end-to-end path)
1. CSV upload with file and schema validation (initial max: 5MB, 10,000 rows, 40 columns; configurable).
2. Column inspector, missing/duplicate count, detected types, preview and explicit column selection.
3. Goal entry by user, optional AI-proposed analysis plan. Explicit confirmation before running.
4. Analysis allowlist:
   - Descriptive summaries of a numeric variable by category.
   - Welch independent two-group t-test when independence and other required conditions are confirmed.
   - Pearson correlation for two numeric variables when appropriate and expressly selected.
5. Three chart types: grouped distribution (individual values + optional summary), scatterplot, time-series line (only when time axis is valid).
6. User edits title, axis labels, units, axis bounds when safe, color theme, and display of raw points.
7. AI-generated caption and limitations with only verified numeric outputs.
8. Export chart (SVG and PNG); PDF if time, plus `evidence-passport.json` and short report Markdown/HTML.
9. Loading, invalid-data, no-AI, low-memory and error paths.

## Out of scope
Automatic ANOVA, logistic regression, causal claims, arbitrary scientific domain engines, user-generated code execution, multiuser collaboration, researcher login/paywall, billing, guaranteed publication acceptance, medical decision support, automated literature citation discovery, uploading originals to Cloudflare, production billing.

## Product KPIs
- 100% of test figures numerically match independently computed Python reference values within published tolerance.
- >= 4 of 5 recruited users can finish demo workflow with minimal help (validation target, not achieved).
- Export contains valid reproducibility metadata; missing assumptions block relevant inferential method.
- Functional demo works after simulated AI outage via manual analysis selection and deterministic plotting.

## Success criteria for judged release
- One end-to-end workflow functioning on hosted Cloudflare deployment.
- No fabricated statistical outputs; all numerical tests pass.
- Tested static assets, live AI endpoint, usable figure editor and downloadable artifact.
- Public Git repo and approved skill-generated Devpost planning docs; short public demo video.

## Important deadline
Build With AI: Basics submission due **2026-10-26 17:00 EDT** (verify immediately before submission).
