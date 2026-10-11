---
doc: prd
status: approved
---

# EvidencePlot AI — Product Requirements

A no-code scientific analysis and plotting web application for postgraduate experimental researchers and early-career lab scientists to validate small CSV datasets, run deterministic statistical comparisons, customize publication-minded figures, and export an auditable Figure Evidence Passport.
Source: `scope.md > Who It's For`, `scope.md > The Unique Kernel`.

## The Core Journey
Source: `scope.md > The Core Loop`, `scope.md > What "Working" Looks Like`.

1. **Arrival & Dataset Selection:** The researcher opens EvidencePlot AI and sees the hero message (*"From raw research data to scientific figures you can verify"*), a research-only disclaimer, a primary **Analyze a dataset** button (opening the CSV upload area), and a secondary **Try a sample dataset** selector offering built-in synthetic benchmark datasets (`synthetic_groups.csv`, `synthetic_correlation.csv`, `messy_example.csv`).
2. **Step 1 — Data Upload & Inspection:** Upon selecting or uploading a CSV file (up to 5 MB, 10,000 rows, 40 columns), the browser parses and profiles the table locally without sending raw data over the network. The user inspects a 10-row preview, row/column counts, inferred column types, missing-value counts, exact duplicate row flags, category distributions, and numeric coercion alerts. Before advancing, the researcher confirms the grouping/X column, numeric response/Y column, measurement units (or explicitly confirms `"arbitrary units"` / `"unknown"`), and study-design independence.
3. **Step 2 — Analysis Brief & Plan Approval:** The researcher enters their question in **What do you want to learn from your data?** (or clicks a sample objective chip such as *"Compare the response measurements between the control and treatment groups and create an appropriate scientific figure"*). Either they request an AI-proposed plan—which sends only sanitized column metadata and the objective to propose one allowlisted method (`descriptive`, `welch_t`, or `pearson`) and one allowlisted chart (`grouped_points`, `scatter`, or `time_series`)—or they click **Run without AI** to choose the method and columns manually. Nothing computes until the user checks the required assumption confirmations (e.g., *"Observations belong to independent groups"*) and clicks **Confirm analysis**.
4. **Step 3 — Figure Studio (Compute & Customize):** The local calculation engine computes the statistics from the confirmed dataset and renders an interactive chart alongside a structured **Results** and **Data checks** panel. For the primary two-group slice (`synthetic_groups.csv`), all 12 individual observations are plotted by group (`control` vs `treatment`) alongside group means and the verified Welch two-sample t-test output (`t = 7.3800` for treatment minus control, `df = 9.9988`, two-sided `p = 0.00002371`, mean difference `= 3.55`, 95% CI `[2.4782, 4.6218]`). The researcher can customize the chart title, X/Y axis labels, units, safe axis bounds, color palette, and raw point visibility, seeing the figure update immediately.
5. **Step 4 — Interpretation, Evidence Passport & Export:** The researcher reviews a concise, non-causal narrative caption and limitations section (either generated from verified numeric outputs via AI or rendered from a deterministic template when running without AI). Each numeric claim badge in the narrative maps directly to the underlying calculation field. The researcher expands the **Figure Evidence Passport** to inspect the local SHA-256 file hash, column mappings, missing-data policy, confirmed assumptions, exact outputs, and runtime package versions, then downloads the **SVG**, **PNG**, **`evidence-passport.json`**, and **Markdown/HTML summary report**.

## Screens and Layout
Source: `scope.md > The Core Loop`, `scope.md > Inspiration & Identity`.

- **Top Header Bar:** Displays the **EvidencePlot AI** brand mark, active dataset indicator, a quick **Load sample fixture** switcher, a **Run without AI** / AI status badge, and a **Clear project** action that unloads the current dataset from browser memory.
- **Welcome / Start Banner (Screen 0):** Visible before a dataset is loaded (or collapsible once active). Contains the headline, supporting copy (*"Transparent calculations. Publication-minded design. Reproducible exports."*), the **Analyze a dataset** and **Try a sample dataset** CTAs, three concise value cards (**Validate**, **Analyze**, **Verify & export**), and the research-only notice.
- **4-Step Wizard Navigation:** A single-path numbered stepper (`1. Data` → `2. Analysis` → `3. Figure Studio` → `4. Export & Evidence`) with a live status breadcrumb strip (e.g., `12 rows inspected → 2 groups confirmed → Welch plan approved → 12 observations plotted → Ready to export`). No dead or placeholder sidebar links.
- **Responsive Workspace:**
  - Steps 1 and 2 use structured two-panel cards (dataset preview + column/assumption confirmation in Step 1; objective input + proposed plan/manual selector in Step 2).
  - Step 3 (**Figure Studio**) uses a 2/3 figure canvas on the left and a 1/3 tabbed inspector (`Figure`, `Results`, `Data checks`) on the right on desktop (`1440px`), stacking vertically on tablet (`768px`) and mobile (`360px`).
  - Step 4 (**Export & Evidence**) pairs the final figure preview + downloadable action bar on the left with the verified narrative, claim-to-number trace badges, and expandable **Figure Evidence Passport** on the right.

## Look and Feel
Source: `scope.md > Inspiration & Identity`.

- **Visual Character:** Calm scientific precision with generous whitespace, crisp borders, and clear evidence hierarchy—explicitly avoiding dark neon-gradient AI dashboard clichés.
- **Color Palette:**
  - Canvas background: `#F7F9FB`
  - Panel/card surface: `#FFFFFF` with `#E3E9EE` border (`12–16px` border radius)
  - Primary ink: `#10233F`; secondary muted text: `#536579`
  - Brand accent: `#142F50` (deep navy); focus ring: `#2764A4`
  - Verified provenance / pass badge: `#087F73` (teal)
  - Primary CTA button: `#E7B84A` (warm gold with high-contrast dark ink text)
  - Statistical / data-quality warning: `#A86710` (amber)
  - Blocking error / invalid assumption: `#B94046` (crimson)
- **Typography & Accessibility:** `Inter` or clean system UI sans-serif (`16px` minimum body copy, `26–36px` section titles) with `tabular-nums` enabled on all data tables, statistical results, and Passport metrics. Every status indicator combines an icon and text label (never color alone), meeting WCAG 2.2 AA contrast and full keyboard focus navigation.

## Features and Behavior

### 1. CSV Intake, Validation, and Data Profiling
Source: `scope.md > The Core Loop`, `scope.md > The POC Boundary`, `scope.md > Explicitly Cut`.

The researcher can upload a local `.csv` file via drag-and-drop or file picker, or load one of the three bundled synthetic fixtures (`synthetic_groups.csv`, `synthetic_correlation.csv`, `messy_example.csv`). The app computes a local SHA-256 fingerprint of the file and inspects every column without altering original values.

- As an experimental researcher, I want my uploaded CSV profiled for types, missing values, duplicates, and category counts so that I can spot data-quality problems before running any statistical test.
  - [ ] Uploading or selecting `synthetic_groups.csv` displays the file name, SHA-256 hash prefix, `12 rows`, `4 columns`, first 10 rows, `0 missing values`, `0 duplicate rows`, and detected categories `control (6)` and `treatment (6)` with unit `arbitrary units`.
  - [ ] Uploading or selecting `messy_example.csv` flags leading/trailing whitespace and case differences (`" control "`, `"Control"`, `"control"`), `1 missing value` (`SYN02`), `1 non-numeric coercion failure` (`"not available"` on `SYN03`), `1 exact duplicate row` (`SYN04`), extreme negative value warning (`-999` on `SYN05`), a 3rd category (`"treated"`), and unit mismatch (`"mg/L"` vs `"unknown"`).
  - [ ] Original uploaded data is never silently modified; opt-in normalization controls allow the user to explicitly trim/normalize category whitespace and apply transparent complete-case filtering for missing/non-numeric response values, recording exact excluded row counts.
  - [ ] Any column name matching personal-identifier patterns (e.g., `patient_name`, `email`, `address`, `phone`, `ssn`) triggers an inline privacy warning and is automatically redacted/excluded from any AI planning payload.

### 2. Research Objective, AI Planning, and Assumption Confirmation
Source: `scope.md > The Unique Kernel`, `scope.md > The Core Loop`.

The researcher states their analysis goal and either requests an AI-proposed analysis plan or manually selects from the closed allowlist.

- As a researcher, I want the assistant to suggest a defensible analysis plan from a closed allowlist—and require my explicit confirmation of study assumptions—so that no inappropriate statistical test runs automatically.
  - [ ] Clicking **Propose analysis plan** sends only the user's objective and sanitized column profile (never raw data rows) and displays the proposed analysis (`descriptive`, `welch_t`, or `pearson`), chart type (`grouped_points`, `scatter`, or `time_series`), target columns, rationale, and required assumptions to confirm.
  - [ ] Clicking **Run without AI** lets the user select the analysis method, chart type, and column mappings directly with zero network dependency on AI.
  - [ ] **Confirm analysis** remains disabled until required study-design checkboxes (e.g., *"Observations are independent across groups"* and unit confirmation) are checked by the user.
  - [ ] If the user asks for an unsupported method (e.g., ANOVA, logistic regression, multivariate regression, Kaplan-Meier, or causal inference), the UI clearly declines the unsupported test and offers a supported descriptive or two-variable alternative.

### 3. Deterministic Statistical Engine & Safeguards
Source: `scope.md > The Unique Kernel`, `scope.md > What "Working" Looks Like`, `scope.md > The POC Boundary`.

All numeric calculations run locally in Python and enforce strict statistical pre-conditions:
- **Primary Slice — Descriptive Summaries & Welch's Independent Two-Group t-Test:**
  - Computes per-group `n_total`, `n_valid`, `n_missing`, `mean`, sample `sd` (`ddof=1` for `n >= 2`; `null` if `n = 1`), `median`, `IQR`, `min`, and `max`.
  - When `welch_t` is selected and confirmed on exactly two independent groups with `n >= 2` valid values per group and non-zero variance, computes `t`, Welch-Satterthwaite `df`, two-sided `p`, difference of means (**Group B minus Group A** consistently), standard error, and 95% CI.
- **Secondary Slice — Pearson Correlation:**
  - When `pearson` is selected on two numeric columns with `n >= 3` complete pairs and non-zero variance, computes `n`, Pearson `r`, and two-sided `p`.

- As a researcher, I want every number in my results panel to come from deterministic scientific calculations—and be blocked when statistical conditions fail—so that I never publish fabricated or invalid p-values.
  - [ ] On `synthetic_groups.csv` (`control` as Group A, `treatment` as Group B), the engine outputs `n_a = 6`, `n_b = 6`, `mean_a = 9.4833`, `mean_b = 13.0333`, `difference_b_minus_a = 3.5500`, `t_b_minus_a = 7.3800`, `df = 9.9988`, `p_two_sided = 0.00002371`, and 95% CI `[2.4782, 4.6218]`, matching `examples/reference_outputs.json` within tolerance.
  - [ ] On `synthetic_correlation.csv`, Pearson correlation outputs `n = 10`, `r = 0.9854`, and `p_two_sided = 1.9487e-7`, matching `examples/reference_outputs.json`.
  - [ ] Attempting `welch_t` when there are 3 or more groups, fewer than 2 valid observations in a group, paired/repeated observations, or zero variance blocks inferential output and displays descriptive statistics with an explicit explanation.

### 4. Figure Studio & Interactive Customization
Source: `scope.md > The Core Loop`, `scope.md > What "Working" Looks Like`.

The Figure Studio renders the raw observations alongside summary overlays and provides non-destructive editing controls.

- As a researcher, I want to see all underlying data points on my chart and edit titles, axis labels, units, and styling without altering the underlying data.
  - [ ] The grouped individual-value plot for `synthetic_groups.csv` renders all 12 individual data points separated by group alongside group mean/summary markers and sample sizes (`n = 6` per group).
  - [ ] Editing the chart title, X-axis label, Y-axis label, unit string, color theme, or raw-point display immediately updates both the on-screen figure and the exported SVG/PNG.
  - [ ] Custom axis bounds that would hide actual data points are blocked or trigger a prominent truncation warning banner.

### 5. Grounded Interpretation, Figure Evidence Passport & Exports
Source: `scope.md > The Unique Kernel`, `scope.md > What "Working" Looks Like`.

Step 4 combines the verified narrative caption, interactive claim verification, the expandable Figure Evidence Passport, and file downloads.

- As a researcher, I want an exportable Figure Evidence Passport and a caption whose numbers trace directly to my calculation outputs so that anyone reviewing my figure can audit how it was produced.
  - [ ] The narrative panel displays a headline, summary, figure caption, limitations list, and interactive **Verified Claims** badges (e.g., `difference_b_minus_a: 3.55`, `p_two_sided: 0.00002371`); clicking a badge highlights the matching field in the Results/Passport view.
  - [ ] If the AI narrative contains any number not matching the deterministic engine output—or if the user is in **Run without AI** mode—the app automatically displays the deterministic caption template instead.
  - [ ] Expanding the **Figure Evidence Passport** displays the source filename, local SHA-256 hash, row count, selected columns and units, missingness/exclusion counts, confirmed assumptions, exact calculation outputs, library versions, figure configuration, and limitations.
  - [ ] Clicking **Download SVG**, **Download PNG**, **Download Passport JSON** (`evidence-passport.json`), and **Download Summary Report** (`.md` / `.html`) generates and downloads real, non-empty files matching the on-screen figure and results.

## States and Boundaries
Source: `scope.md > The Unique Kernel`, `scope.md > The POC Boundary`, `scope.md > Explicitly Cut`.

- **First Use / Empty State:** Displays the Welcome hero, the 3 value cards (**Validate**, **Analyze**, **Verify & export**), the research-only disclaimer, the CSV dropzone, and one-click sample dataset buttons (`synthetic_groups.csv`, `synthetic_correlation.csv`, `messy_example.csv`). Steps 2–4 in the stepper are locked until a dataset is loaded.
- **Python Engine Loading State:** While the browser Python worker initializes on first calculation, displays a non-blocking progress banner (*"Initializing local Python scientific engine..."*) without freezing the UI.
- **Data Needs Review / Blocked Inference State:** When a dataset has missing values, coercion failures, duplicate rows, conflicting units, or violated test preconditions (e.g., 3 groups for a 2-group Welch test), displays an amber (`#A86710`) or crimson (`#B94046`) status banner explaining the exact issue and offering either explicit opt-in filtering or Descriptive summaries.
- **Invalid File / Oversize Error State:** Files that are not `.csv`, exceed 5 MB / 10,000 rows / 40 columns, or are empty/binary are rejected immediately in the browser with an actionable error message and retry button.
- **No-AI / AI Fallback State:** If Cloudflare Workers AI is unreachable, rate-limited, returns invalid JSON, or if the user toggles **Run without AI**, an informative banner explains that manual method selection and deterministic captioning are active; the full statistical, plotting, and Passport export workflow completes without interruption.
- **Session Persistence & Privacy Boundary:** Raw CSV rows remain strictly in transient browser memory (`P0`) and are never uploaded to any server or stored in a database. Clicking **Clear project** or closing the tab unloads the dataset. Before any AI call, a visible privacy notice states that only the research objective, sanitized column metadata (`P1`), or aggregate statistical outputs (`P2`) are sent to Cloudflare's AI service.

## Product Decisions
- **4-step wizard over multi-page sidebar navigation:** Keeps the proof of concept focused on a single verifiable flow (`Data → Analysis → Figure Studio → Export & Evidence`) with zero dead links.
- **Welch two-group vertical slice first:** Delivers and verifies the complete end-to-end loop (`synthetic_groups.csv` → Welch's t-test + descriptives → grouped raw-point plot → Evidence Passport export) before adding Pearson correlation and time-series line plots.
- **Group B minus Group A sign convention:** Standardizes Welch two-group mean difference, `t`-statistic, and 95% CI as `Group B minus Group A` (`treatment minus control` = `+3.55`, `t = +7.3800`) so effect direction and narrative claims are never inverted.
- **Explicit opt-in handling for messy data:** Preserves raw uploaded measurements by default; requires explicit user confirmation for whitespace/case normalization or complete-case row exclusion, and records every excluded row in `evidence-passport.json`.
- **Mandatory deterministic fallback:** Treats AI planning and narration as helpful assistants rather than single points of failure—every step has a first-class deterministic path.

## What We're Building
1. Landing view with CSV upload (<=5 MB, <=10,000 rows, <=40 columns) and one-click loading for bundled synthetic fixtures (`synthetic_groups.csv`, `synthetic_correlation.csv`, `messy_example.csv`).
2. Step 1 Data Inspector: SHA-256 file fingerprinting, 10-row preview, column type/missing/duplicate/category/unit profiling, identifier redaction check, opt-in whitespace/complete-case controls, and variable/unit/independence confirmation.
3. Step 2 Analysis Planner: Research objective input, AI-assisted plan proposal from closed allowlist, manual **Run without AI** selector, and mandatory assumption confirmation gate.
4. Step 3 Figure Studio: Local Python statistical engine (`Descriptive summaries`, `Welch's independent two-group t-test`, and `Pearson correlation`) + interactive chart renderer (`grouped individual-value plot`, `scatterplot`, and `time-series line`) with editable title, labels, units, safe bounds, palette, and raw-point display.
5. Step 4 Export & Evidence: Grounded AI interpretation with numeric claim verification (plus deterministic caption fallback), interactive claim-to-number trace badges, expandable **Figure Evidence Passport**, and real downloads for `SVG`, `PNG`, `evidence-passport.json`, and Markdown/HTML summary report.

## Deferred From the POC
Source: `scope.md > Later`.

- **Excel (`.xlsx`) file uploads:** Deferred until the CSV workflow is verified end-to-end to avoid spreadsheet multi-sheet and formula-parsing complexity in the initial slice.
- **PDF report export:** Deferred in favor of SVG, PNG, `evidence-passport.json`, and Markdown/HTML summary so browser export stays fast and dependency-light.
- **User accounts and cloud project storage (D1/R2):** Deferred because anonymous, in-browser session processing is safer for research privacy and sufficient to prove the core loop.

## Possible Later Enhancements
- Server-side Python execution via Cloudflare Containers for large datasets exceeding browser memory.
- Multi-user laboratory workspace and supervisor sign-off workflows for research groups.

## Non-Goals
Source: `scope.md > Explicitly Cut`.

- **No arbitrary AI-generated or user-entered Python execution:** The app will never run `exec`/`eval` on LLM output or user scripts.
- **No unverified or hallucinated statistics:** The LLM never computes means, standard deviations, p-values, or confidence intervals.
- **No silent row deletion, outlier removal, or imputation:** Data anomalies are surfaced to the researcher, never hidden.
- **No raw dataset upload to cloud servers or AI models:** Original rows stay in browser memory.
- **No clinical diagnosis, medical advice, causal claims from observational data, or claims of journal certification:** The app is strictly a research visualization and reproducibility assistant.

## Open Questions
- None blocking `4-spec`. All core user flows, statistical conventions, and edge-case behaviors are defined.
