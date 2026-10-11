---
doc: scope
status: approved
---

# EvidencePlot AI

A research plotting and statistical analysis assistant that turns raw CSV datasets into publication-minded figures backed by deterministic Python calculations and an auditable Figure Evidence Passport.

## The Unique Kernel
Every figure is paired with a **Figure Evidence Passport** (`evidence-passport.json`) and a strict neuro-symbolic trust boundary: **AI never computes statistics or executes arbitrary code.** A vetted Python scientific engine running locally in a browser Web Worker (`Pyodide` + `Pandas`/`SciPy`) performs all data profiling and statistical calculations, while `Cloudflare Workers AI` is restricted to proposing an analysis plan from a closed allowlist and drafting a grounded narrative strictly bound to verified numeric outputs. Every exported chart carries a cryptographic SHA-256 fingerprint of the source file, confirmed variable mappings and statistical assumptions, missing-data handling, exact calculation outputs, chart specification, and runtime library versions—and the entire workflow remains functional even when AI is offline or bypassed.

## Who It's For
Postgraduate experimental researchers and early-career laboratory scientists in environmental, chemical, and biomedical fields working with small tabular CSV datasets. Today, they either stitch together charts in spreadsheets (where plotted bars or points easily lose their link to raw observations, missing-data handling, and statistical assumptions) or paste data into generic chatbots (which risk hallucinating p-values, silently dropping rows, or generating non-reproducible code). They need a fast, no-code way to validate their dataset, choose a defensible analysis, inspect individual data points alongside summary statistics, and export a figure whose methodology can be verified.

## The Core Loop
1. **Upload & Validate:** The researcher uploads a CSV dataset (or loads a built-in synthetic benchmark fixture) in the browser; local Python profiles columns, types, duplicates, and missingness without uploading raw rows to any server.
2. **State Objective & Confirm Plan:** They enter a research question (e.g., *"Compare the groups and create an appropriate figure"*), review the AI-proposed allowlisted analysis plan (or choose a method manually), and explicitly confirm required study-design assumptions (such as independent observations) and measurement units.
3. **Compute & Refine:** Deterministic Python in a Web Worker computes the statistics (`Descriptive summaries`, `Welch's independent two-group t-test`, or `Pearson correlation`), renders a publication-style plot showing raw observations (`grouped individual-value plot`, `scatterplot`, or `time-series line`), and lets the researcher refine titles, axis labels, units, safe axis bounds, and color theme in the Figure Studio.
4. **Verify & Export:** Cloudflare Workers AI drafts a non-causal figure caption and limitations section verified against the exact Python numbers, and the researcher exports the figure (`SVG` and `PNG`), `evidence-passport.json`, and a reproducible summary report.

## Inspiration & Identity
- **Aesthetic & Mood:** Calm scientific precision—generous whitespace, crisp tabular typography (`Inter` / system UI with tabular numerals), and clear evidence hierarchy rather than a neon-gradient AI dashboard.
- **Palette:** `#F7F9FB` canvas, `#FFFFFF` cards/panels, `#10233F` deep ink text, `#142F50` navy primary brand, `#087F73` teal for verified provenance indicators, `#E7B84A` warm gold for the primary call-to-action, `#A86710` amber for statistical/assumption warnings, and `#B94046` crimson for blocking errors.
- **References:**
  - Cloudflare Workers Full-Stack React Architecture: https://developers.cloudflare.com/workers/framework-guides/web-apps/react/
  - Cloudflare Workers AI Structured JSON Mode: https://developers.cloudflare.com/workers-ai/features/json-mode/
  - Pyodide in a Web Worker: https://pyodide.org/en/stable/usage/webworker.html

## Why This Matters to the Learner
Coming from a background in Chemistry Education and Environmental Research, I have seen firsthand how challenging it is for researchers to transform raw experimental datasets into scientifically accurate analyses, professional visualizations, and defensible research reports. I am building EvidencePlot AI to make this workflow accessible, reliable, reproducible, and easy to use—while sharpening my own expertise in building production-quality Cloudflare AI applications that combine LLM reasoning with deterministic Python scientific computing and rigorous modular testing.

## What "Working" Looks Like
In a live under-3-minute demo on the deployed Cloudflare application:
1. A researcher loads `synthetic_groups.csv` (or uploads a local CSV) and immediately sees an in-browser data quality profile (row/column counts, inferred types, missing values, and duplicate checks) with a clear notice that raw data stays in the browser.
2. They enter *"Compare the groups and create an appropriate figure."* Cloudflare Workers AI proposes a schema-validated plan from the closed allowlist (`welch_t` + `grouped_points`), and the UI pauses until the researcher explicitly confirms **independent observations** and measurement units.
3. The browser Pyodide Web Worker executes the vetted SciPy calculation and renders a grouped individual-value plot displaying all 12 raw data points alongside group means and exact test statistics (`t = 7.3800` for treatment minus control, Welch-Satterthwaite `df = 9.9988`, two-sided `p = 0.00002371`, mean difference `= 3.55`, 95% CI `[2.4782, 4.6218]`).
4. The researcher edits axis labels/units in the Figure Studio, reviews the grounded AI interpretation and assumption caveats—the **"oh, that's cool" beat** where every claim in the caption traces directly to an immutable Python output—and downloads the `SVG`, `PNG`, `evidence-passport.json` (with the local SHA-256 dataset hash and library versions), and Markdown/HTML summary report.
5. Toggling **"Run without AI"** (or simulating an AI error) proves that the entire deterministic analysis, plotting, and Evidence Passport export workflow still succeeds end-to-end without model dependency.

## The POC Boundary
- **Primary Vertical Slice (Built & Verified First):**
  - Browser-side CSV upload (up to 5 MB, 10,000 rows, 40 columns) + synthetic demo fixtures (`synthetic_groups.csv`, `synthetic_correlation.csv`, `messy_example.csv`).
  - Local column profiling, missingness/duplicate inspection, and explicit user confirmation of variables, units, and statistical assumptions.
  - Closed analysis allowlist starting with **Descriptive summaries by category** and **Welch's independent two-group t-test**, paired with a **grouped individual-value distribution plot**.
  - Cloudflare Workers AI (`/api/ai/plan` and `/api/ai/interpret`) using `@cf/meta/llama-3.3-70b-instruct-fp8-fast` with strict JSON schema/Zod validation, post-generation numeric verification, and a complete **"Run without AI"** deterministic fallback.
  - Interactive Figure Studio controls (title, axis labels, units, safe axis bounds, color palette, raw points display) and verified exports (`SVG`, `PNG`, `evidence-passport.json`, and Markdown/HTML report).
- **Secondary In-Scope Capabilities (Added After Primary Slice Passes Acceptance Tests):**
  - **Pearson correlation** (`pearsonr`) for two numeric variables with sample-size/variance checks and a **scatterplot** view.
  - **Time-series line chart** when a valid, sorted date/time axis is confirmed.

## Later
- **Excel (`.xlsx`) file import** once the CSV pipeline and parser edge cases are fully verified.
- **PDF report export** alongside SVG, PNG, JSON, and Markdown/HTML.
- **User accounts and saved project history** using Cloudflare D1 and R2 with formal data-retention controls.
- **Server-side Python compute via Cloudflare Containers (FastAPI)** for large datasets that exceed browser memory limits.
- **Multi-user supervisor/lab team review workflows.**

## Explicitly Cut
- **Arbitrary AI-generated or user-supplied Python code execution (`exec`/`eval`):** Cut to guarantee security and prevent hallucinated or unverifiable statistical logic.
- **Automatic ANOVA, logistic regression, non-parametric auto-substitution, or causal inference claims:** Cut to keep the statistical engine small, transparent, and safeguarded against misinterpretation.
- **Silent data cleaning (auto-dropping outliers, silent imputation, or guessing experimental pairings):** Cut because altering observations without explicit researcher confirmation violates scientific integrity.
- **Uploading raw CSV datasets to Cloudflare servers or LLM prompts:** Cut to protect research data privacy and keep inference payloads lightweight.
- **Authentication, billing, paywalls, and journal-certification or clinical/medical claims:** Cut so the proof of concept stays focused on the core reproducible figure workflow.
