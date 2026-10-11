# SCIENTIFIC_ENGINE.md — Verified analysis policy
## Responsibility
Scientific results come from a fixed Python engine with Pandas/NumPy/SciPy in a **browser Web Worker**. AI only proposes allowlisted methods, labels and grounded narrative.

## CSV validation
- Reject unsupported file type, oversize, binary/invalid encoding or empty tables.
- Support UTF-8 with optional BOM, quoted cells, commas inside quoted strings, blank cells. For alternative delimiters show preview + user-selected delimiter; never guess silently.
- Show original column names, inferred type, numeric coercion failure count and leading/trailing whitespace.
- Detect missingness, exact duplicate rows and near-identical category labels; do not delete or coerce silently.
- Check non-finite values (`NaN`, `Inf`), unit conflicts, suspicious dates and grouped sample sizes.
- Exclude records from a specific computation only according to transparent analysis-specific complete-case policy and report counts. Never rewrite uploaded original.
- Large numbers/scientific notation must preserve numeric meaning; guard against locale comma decimals.

## Supported analyses
### A. Descriptive summaries
- User selects numeric `y`, optional category `group`.
- Return per group `n_total`, `n_valid`, `n_missing`, `mean`, sample `sd` (ddof=1 for n>=2), median, IQR, min, max.
- If n=1, no sample SD; return null, not zero.
- Primary figure: points/jitter with simple summary or time series (for valid time axis).

### B. Welch independent two-group t-test
- Requires exactly **two** groups, numeric response, user-confirmed independent observations; at least 2 valid values/group for computation, recommend caution for very small n.
- SciPy `ttest_ind(group_a, group_b, equal_var=False, nan_policy='omit')` on explicitly filtered valid values; direction and sign of difference must be documented.
- Return both group summaries, `t`, Welch-Satterthwaite df, `p`, difference of means, standard error and 95% CI computed with Welch formula. Define difference as **B minus A** consistently; t sign must reflect chosen order.
- Check zero variance/degenerate conditions; if output non-finite, stop inferential interpretation.
- No automatic normality claim. If strong concerns or n too small, give descriptives + explain test limitations; do not silently substitute Mann–Whitney.
- Do not infer causation from randomized-looking labels; design must be confirmed.

### C. Pearson correlation
- Requires 2 numeric variables, >=3 complete (x,y) pairs, non-zero variance; confirm independent observations and interpretation caveats.
- SciPy `pearsonr(x, y)`; return n, r, two-sided p, and a CI **only if correctly implemented and tested** (otherwise omit CI).
- Warn if extreme outliers, clusters/nonlinearity, obvious time dependence; use scatter + raw points. No fabricated regression line or causal explanation.

## Chart implementation
- All charts preserve raw underlying observation values unless explicitly a documented aggregate view.
- Grouped plot: individual point marks and group summaries, n printed. For invalid sample size never show invented error bars.
- Scatter: raw numeric x,y points, accurate axis origin and units, labels editable; if trendline later added, computation must be defined.
- Time-series line: sorted confirmed date/time axis, missing intervals visibly documented; never connect unrelated subjects as if longitudinal.
- Charts cannot silently truncate axes to exaggerate effect; warn on nonzero bar baselines if bars are ever introduced.

## Figure Evidence Passport contract
```json
{
 "schema_version":"1.0",
 "source":{"name":"synthetic_groups.csv", "sha256":"<computed locally>", "rows":12},
 "columns":{"group":"group", "value":"response", "units":"arbitrary units"},
 "handling":{"missing":"complete-case for selected variables only", "dropped_for_analysis":0,"outliers_removed":0},
 "method":{"id":"welch_t", "assumptions_confirmed":["independent observations"]},
 "calculation":{"engine":"Python/Pyodide", "library_versions":{"numpy":"<runtime>","scipy":"<runtime>"},"result":{}},
 "figure":{"kind":"grouped_points", "labels":{}, "style":{}},
 "limitations":[]
}
```
- Hash the original file locally using `crypto.subtle.digest('SHA-256', arrayBuffer)`; fingerprint is not a claim of data authenticity.
- Generated textual interpretation is ancillary and stored separately as `ai_narrative` with model ID and created timestamp.

## Edge cases that must block or warn
- Two-group test attempted with 3 groups => block and suggest descriptives.
- One empty group or n<2 => block inferential result.
- Zero variance in Pearson inputs => block.
- Dataset field `patient_name`, `email`, `address`, or identifiers => privacy notice and redact from AI payload.
- Missing unit => label as unknown, request confirmation, never invent mg/dL, kg etc.
- Numeric strings contain mixture of commas/decimal points => ask for convention.
- Negative values in normally positive physical measurement => flag, not auto-delete.
- Outliers may be real measurements; never auto-remove.
- User request for unimplemented logistic regression, ANOVA, Kaplan-Meier, multivariate regression => politely explain unavailable and limit to supported methods.
- Research prompts with multiple tests => select one supported plan or request user choice.
- Insufficient evidence of design => do not assert statistical conclusion.
- All inferential results include method name, sample counts and a limitations section.

## Reproducibility
Golden test fixtures must compare outputs with independent SciPy calculations and recorded expected values/tolerances. A successful screenshot without numerical tests is insufficient.
