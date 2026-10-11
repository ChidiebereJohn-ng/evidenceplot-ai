# EvidencePlot AI — Product Experience and Demo Acceptance Blueprint

> Status: PROPOSED, awaiting learner review in the official Devpost planning sequence. This file explains the intended product behavior and DOES NOT replace Devpost-generated `scope.md`, `prd.md`, or `spec.md`. If an approved skill-generated document differs, stop and reconcile the conflict with the learner. Never silently override an approved decision.

**Product promise:** From raw research data to scientific figures you can verify.

**Audience:** Postgraduate experimental researchers and early-career lab scientists in environmental, chemical, or biomedical research, typically working with small CSV datasets and one clear scientific question. No coding required.

**Job to be done:** Given my own measurements and research question, help me check the data, choose an appropriate *supported* method, calculate defensible results, make an editable publication-minded figure, explain it carefully, and retain a reproducibility record.

**Signature differentiator:** The **Figure Evidence Passport**. The app connects an exported figure to its input file fingerprint, selected columns, assumptions, missingness handling, exact computation outputs, plot configuration, versions, and limitations. It is a reproducibility record, not evidence the scientific conclusions are true or that a journal will accept the figure.

## 1. The one sentence demo

A researcher clicks **Try sample dataset**, confirms a two-group experimental design, asks to compare responses, sees a validated AI-proposed Welch analysis, runs deterministic Python, edits a plot of the **actual 12 observations**, and exports an SVG/PNG plus a Figure Evidence Passport and brief grounded report.

## 2. The core demo, screen by screen

### Screen 0 — Welcome / start
- Heading: **From raw research data to scientific figures you can verify.**
- Supporting copy: **Transparent calculations. Publication-minded design. Reproducible exports.**
- Primary button **Analyze a dataset** and secondary button **Try a sample dataset**.
- Three concise value tiles: **Validate**, **Analyze**, **Verify & export**.
- Research-only disclaimer: the tool assists scientific analysis; the researcher must verify methods and interpretations.
- No login, pricing form, or inaccessible showcase modules in the hackathon MVP.

**Accept:** Both start buttons work. Sample loads an actual bundled CSV and proceeds to data inspection. No fake static dashboard metrics.

### Screen 1 — Data: upload, preview, profile, resolve issues
- Primary upload type is **CSV**, configurable initial maximum **5 MB, 10,000 rows, 40 columns**. Excel `.xlsx` is a stretch goal only *after* CSV works.
- Show actual file name, record/column counts, first 10 rows, inferred types, counts of missing values and exact duplicates, categories, and numeric coercion problems.
- Preserve original uploaded values; **do not silently drop or correct rows**.
- User must identify or confirm row identifier (if present), grouping column, numeric response column, measured units (or explicitly unknown), and whether observations are independent for inferential testing.
- Alerts have **Ready**, **Needs review**, **Unsupported** states and specific remedies.

**Demo fixture:** `examples/synthetic_groups.csv`. Exactly 12 rows and 4 columns (`sample_id`, `group`, `response`, `unit`), 6 control, 6 treatment, no missing data. Units are literally `arbitrary units`; never relabel them as clinical or physical units.

**Accept:** Preview, group counts and data-quality summaries are computed from the actual uploaded CSV and correct for fixtures. No original CSV upload to the AI endpoint.

### Screen 2 — Analysis: goal, proposed plan, assumption approval
- Field label: **What do you want to learn from your data?**
- Default *demo* user prompt: **Compare the response measurements between the control and treatment groups and create an appropriate scientific figure.**
- AI planner receives a **sanitized schema/profile and the research objective**, not the raw data. It can propose only an allowed method and compatible chart. Its rationale cites detected columns and the user's stated objective.
- For this demo it may propose **Welch's independent two-sample t-test** plus **grouped individual-value plot**, subject to confirmed independence and other assumptions.
- UI displays columns, intended comparison order, assumptions to confirm, warnings, and **Confirm analysis**. User can edit variables and select supported method manually.
- A **Run without AI** path must work when inference is unavailable, rate-limited, or invalid.
- If user asks for logistic regression, ANOVA, broad multivariate analysis, or unspecified research design, the system explicitly declines unsupported testing and offers a supported method; it must not hallucinate a new capability.

**Accept:** Invalid or unknown column suggestions are rejected; no Python inference runs until confirmation; fallback works without Cloudflare AI.

### Screen 3 — Figure Studio: Python output and editable plot
- Pyodide runs inside a dedicated browser **Web Worker** so that the UI remains responsive. Pandas/NumPy/SciPy calculate the statistics; AI never supplies numerical results.
- For demo, display an individual-value grouped plot with all 12 raw observations, clearly separated into control vs treatment, with readable labels and `response (arbitrary units)`.
- A results panel shows sample counts, summary statistics and—only if the chosen test completed correctly—the Welch test statistic, degrees of freedom, p-value, difference, confidence interval, and limitations.
- Allow edits to title, x/y labels, axis units, compatible palette and raw point visibility. Prevent misleading/truncated axes or flag them. Result count and chart data must remain sourced from the real calculations.
- If there is only one observation in a group, unknown independence, zero-variance degeneracy, or non-finite test outputs, show descriptives and a helpful block/warning instead of a fabricated inferential result.

**Reference values for supplied fixture** (from `examples/reference_outputs.json`):
- control n = 6; mean ≈ **9.4833333333**
- treatment n = 6; mean ≈ **13.0333333333**
- difference treatment minus control ≈ **3.55**
- Welch *t* for treatment minus control ≈ **7.3800125904**
- Welch df ≈ **9.9988328026**
- two-sided p ≈ **0.00002370999671**
- 95% CI of treatment minus control ≈ **[2.4781836599, 4.6218163401]**

**Sign convention rule:** Difference is always **B minus A**; report test statistic in same B-minus-A direction. Do not confuse SciPy argument ordering. The fixture's values are fictional and do not imply treatment efficacy.

**Accept:** These values agree with independent SciPy references within declared tolerance; all 12 individual points correspond to source rows; edit actions visibly update the actual figure; no hardcoded analytical result in production path.

### Screen 4 — Interpret, inspect evidence, export
- Cloudflare Workers AI receives the **verified statistical results and sanitized figure metadata**, never the original rows. It returns a concise evidence-bounded caption and interpretation with explicit limitations.
- The app validates AI JSON and any stated numerical claims against deterministic engine output. If that verification fails, show a **deterministic caption template** rather than invented results.
- The user can revise the textual caption manually and inspect how each numerical claim maps to actual output. Do not claim observational association proves causation.
- Show an expandable **Figure Evidence Passport**:
  - Original file name, number of rows and locally computed SHA-256 checksum;
  - Selected columns and confirmed units;
  - Analysis method, exclusions/missingness policy, assumption approvals;
  - Exact computed numerical outputs and calculation/library versions;
  - Figure type, axes, labels, style, and warnings;
  - AI model/template/version/time as an ancillary narrative record if used.
- Minimum downloadable outputs: **SVG**, **PNG**, **`evidence-passport.json`**, and a short **Markdown or HTML results summary**. PDF export is optional and must not block shipping.
- File names and actual file contents must match advertised buttons. Never claim an export occurred if it failed.

**Accept:** Downloaded SVG/PNG render the real figure; JSON is parseable and contains real analysis metadata; the summary is faithful to verified results; failure paths are comprehensible.

## 3. Product navigation and visual standard

Use the calm scientific visual language in `docs/UI_DESIGN.md`: off-white background `#F7F9FB`, white cards, navy text `#10233F`, navy brand `#142F50`, teal `#087F73` for verified status, amber for warnings and a restrained gold primary CTA. Modern typography, substantial whitespace, no neon-gradient generic AI styling.

**Core workflow is a 4-step wizard** after the landing page: **Data → Analysis → Figure Studio → Export & Evidence**. Any desktop sidebar is secondary and may not contain fake or inaccessible destinations. Mobile uses vertically stacked content and usable controls. Ensure text contrast, visible keyboard focus, data labels and plot text equivalents. Make actual work visible; avoid empty marketing dashboards.

**Example on-screen narrative:** `12 rows inspected → 2 groups confirmed → Welch plan approved → Python calculated 12 observations → figure edited → SVG + Evidence Passport exported.`

## 4. Correct responsibility boundaries

| Component | Responsibilities | Must not do |
| --- | --- | --- |
| Browser CSV parser | Validate size/encoding/schema; preserve original | Quietly rewrite source measurements |
| Python via Pyodide worker | Descriptives; confirmed Welch test; optional tested Pearson; numerical source of truth | Execute arbitrary AI-generated Python |
| Cloudflare Workers AI | Suggest allowlisted plan, draft grounded explanation, identify questions | Return authoritative p-values, invent units, read full source rows |
| Analysis validator | Enforce schema, allowed methods, assumptions, numeric claim consistency | Treat a model rationale as scientific proof |
| Figure editor | Render raw points, labels, safe transformations, export | Hide points or skew scales without explanation |
| Passport | Preserve source fingerprint and computation config | Claim authenticity, peer review, or journal acceptance |

The user retains responsibility for research design and ultimate interpretation.

## 5. MVP scope versus later product

### MUST SHIP
- Anonymous sample demo and CSV upload.
- Actual profiling, column selection, missing/duplicate alerts.
- Research-objective field, AI analysis suggestion with schema validation, user confirmation, manual fallback.
- Descriptives and a *tested* Welch two-group flow.
- One finished grouped raw-point visualization with meaningful editing.
- Actual numeric results, grounded caption, limitations and downloadable figure/Passport/summary.
- Secure same-origin Cloudflare AI proxy endpoint and deployed functional website.
- Browser and numerical tests, official Devpost docs and <3-minute demo.

### ONLY IF CORE IS ALREADY GREEN
- Pearson correlation plus scatterplot with tested fixture.
- Time-series with validated timestamps and valid study context.
- `.xlsx` import.
- Additional export formats such as PDF.

### OUT OF SCOPE DURING HACKATHON
- Arbitrary natural-language statistical coding, complex ANOVA/regression, SPSS replacement, independent study-design inference, automatic outlier removal, document literature research, generated journal citations, journal acceptance promises, accounts, billing, persistent R2 upload, collaborations, medical diagnostic advice, and guaranteed conclusions.

## 6. Notable error and edge-case behaviors

1. **Messy CSV:** show issues; allow explicit decisions. Never silently clean, overwrite or delete the original.
2. **Wrong types / mixed decimal format:** request user confirmation before coercion.
3. **Missing, duplicate or outlier measurements:** accurately report counts; no silent exclusion. If complete-case filtering is applied to a specific calculation, state exactly how many records were excluded and why.
4. **Data from paired subjects:** do not apply independent Welch testing; ask for design confirmation and explain unsupported paired inferential workflow.
5. **3+ groups:** refuse Welch two-group inference; offer descriptives and explain why ANOVA is not yet supported.
6. **Too-small groups or constant Pearson variable:** block relevant inference; show supported descriptive result only.
7. **Personal identifiers:** warn and support label redaction; raw CSV stays local by default, sanitized metadata only goes to AI.
8. **Model unavailable / returns bad JSON / makes unsupported numerical claim:** use manual plan and deterministic caption; no fake AI success.
9. **Pyodide slow to initialize / cannot load:** clear loading progress and recovery; no frozen UI.
10. **Export or Cloudflare failure:** state real error and offer retry; never show a false success indicator.

## 7. Technology architecture

- **Cloudflare Worker + Static Assets** host React/Vite/TypeScript/Tailwind UI and same-origin API.
- **Browser Web Worker + Pyodide**, with Pandas/NumPy/SciPy, for authoritative deterministic computation. Do not use unrestricted LLM-generated scripts.
- **Cloudflare Workers AI** server-side binding `env.AI` for sanitized analysis plan and interpretation. Proposed model is `@cf/meta/llama-3.3-70b-instruct-fp8-fast` subject to actual availability and checked schemas.
- **Plotly.js** or suitable compatible chart library for interactive figures and actual SVG/PNG exports.
- **No D1 or R2** required for the hackathon's anonymous, nonpersistent demo; add persistence in commercial phase after privacy and retention design.
- See `docs/API_DESIGN.md`, `docs/AI_CONTRACT.md`, `docs/ARCHITECTURE.md`, and `docs/DATA_PRIVACY.md` for contracts; these govern implementation details.

API endpoints for MVP: `GET /api/health`, `POST /api/ai/plan`, `POST /api/ai/interpret`; Python processing occurs locally inside the browser worker.

## 8. Modular implementation and verification

Follow official skill pack planning **first**. This table is a proposed map, not authorization to skip skill interviews or approvals.

| Module | Observable result | Pass check |
| --- | --- | --- |
| M0: planning/environment | Approved skill-generated plan; Cloudflare scaffold | Repo, config, build, docs approved before features |
| M1: data intake | Sample and CSV upload, real preview | 12×4 sample; invalid CSV behavior tested |
| M2: profiler | Missingness, type and group inspection | Exact expected fixture counts and edge cases |
| M3: Python engine | Descriptives + Welch results | Independent numeric reference matches |
| M4: Figure Studio | Grouped raw-value plot + edits | 12 real data marks; axes and export style correct |
| M5: AI plan & interpretation | Live model calls with fallback | Validated allowlist; numerical claims check |
| M6: Passport/export | Real SVG/PNG/JSON/summary files | Verify artifact contents and reproducibility metadata |
| M7: deployed E2E | All steps work on Cloudflare URL | Desktop/mobile, outage and privacy smoke tests |
| M8: Devpost ship | 2:40 video, repo and skill pack deliverables | Official 6-ship checklist complete |

After each module: tests, browser verification for UI, security/scientific review, descriptive local commit, and update `MODULE_PROGRESS.md`. Do not push without user approval. Record a resulting commit hash only once it exists (do not attempt to commit a file containing its own hash).

## 9. Demo script: target 2 min 40 sec

| Time | What judges should see | Talking point |
| --- | --- | --- |
| 0:00–0:20 | Welcome + key problem | Research figures can be hard to verify and reproduce |
| 0:20–0:40 | Load actual synthetic CSV, see 12 rows and group counts | Real data validation, no coding |
| 0:40–1:05 | Type comparison objective; review AI plan; confirm independence | Human-in-the-loop analytical planning |
| 1:05–1:35 | Run Python, show 12 plotted observations and verified Welch result | Python calculates; AI does not invent p-values |
| 1:35–2:00 | Change chart title, labels and plot style; inspect limits | Real figure editability and scientific clarity |
| 2:00–2:25 | Show grounded interpretation, passport, download SVG + JSON | Scientific provenance and reproducibility |
| 2:25–2:40 | Summarize research value and show live app URL | Outcome, potential impact, differentiation |

**Narration example:** "This is a synthetic experiment with six control and six treatment measurements. EvidencePlot validates the file and asks me to confirm the study design. The AI suggests a supported method, but our Python engine calculates the values. I can inspect every plotted observation, customize the graph, and download both the visual and its Evidence Passport. That makes the figure easier to verify and reproduce."

## 10. Release-level acceptance checklist

- [ ] Landing page and sample dataset launch a genuine workflow.
- [ ] Sample CSV reports 12 records, 4 columns, two groups and zero missing observations.
- [ ] No inference without confirmation of independent groups.
- [ ] Welch results match `examples/reference_outputs.json` and B-minus-A sign.
- [ ] Plot contains the 12 source observations (not invented summary values).
- [ ] Chart controls genuinely change exported figure.
- [ ] AI claims are validated; manual fallback works when AI endpoint is disabled.
- [ ] Browser Network confirms no uploaded raw research CSV leaves browser by default.
- [ ] SVG, PNG, summary and Passport JSON are downloadable and readable.
- [ ] Deploy works on an actual public Cloudflare URL.
- [ ] Tests/typecheck/build pass and known limitations are recorded.
- [ ] Official `devpost` docs, source/license and public demo satisfy installed skill instructions.

## 11. How the learner should use this document

1. Save it in the repository at `docs/PRODUCT_DEMO_BLUEPRINT.md`.
2. Ask Antigravity to read it alongside `PROJECT.md`, `AGENTS.md`, the UI/API/scientific contracts and the official Devpost Skill Pack.
3. Approve any reconciliation between this proposed blueprint and the Devpost-generated scope, PRD and spec.
4. Use screen acceptance criteria as a live review script. If Antigravity shows a fake chart, invented result, missing point or export that does not download, mark that module incomplete.
5. Keep scope narrow until the user journey is fully functional and verified.

**Golden product rule:** EvidencePlot is not an autonomous scientist; it is a trustworthy assistant that makes the researcher's data, calculations, figure and reasoning inspectable.
