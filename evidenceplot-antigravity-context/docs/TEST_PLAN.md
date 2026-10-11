# TEST_PLAN.md — Scientific and product verification
## Test philosophy
Every supported statistical result must be reproducible from deterministic code, independent of LLM. Visual tests alone are not enough.

## Test fixtures included
- `examples/synthetic_groups.csv` — two independent groups with a continuous response, 12 fully synthetic observations.
- `examples/synthetic_correlation.csv` — 10 synthetic numeric pairs.
- `examples/messy_example.csv` — missing values, duplicate rows, inconsistent labels, non-numeric values; no real people.

`examples/reference_outputs.json` contains SciPy independently computed expected values for both synthetic groups and synthetic correlation fixtures. Compare Python-in-browser output against these references with explicit tolerances.

## Numerical tests
- Read each fixture using Python reference SciPy/Pandas and independently compare web engine outputs.
- For descriptive stats verify counts, mean, sample SD (`ddof=1`), median, quartiles/min/max and missing counts.
- Welch t: test t, df, 95% CI, p, difference sign; ensure p-values do not come from LLM.
- Pearson: test r, p, pairs used; reject zero-variance input.
- Reject unsupported group count, missing required columns, empty/constant arrays, invalid date values, non-finite values.
- Tolerances must be explicitly configured; e.g. abs tolerance 1e-9 on reference numeric calculation; avoid asserting identical floating-point byte strings.

## Required negative cases
1. Empty file, binary file, renamed `.exe`, invalid UTF-8, oversized input.
2. One group vs two groups, three groups with Welch requested, n=1 per group.
3. Duplicates, category case/spacing variants, comma decimal conventions.
4. Constant arrays for Pearson, nonlinear relationship, extreme outlier.
5. Missing values in one variable; complete-case count and warnings accurate.
6. Two subjects with same ID vs repeated measures: must not silently treat as independent.
7. User asks for ANOVA/logistic regression: reject or offer supportable scope.
8. AI returns invalid JSON, wrong column names, invented p-value, refusal, rate-limit, timeout.
9. Pyodide fails to load or low-memory crash: UI shows recovery path.
10. SVG export and Passport JSON validate; figure shows correct sample count and units.

## Browser acceptance tests
- Chrome recent desktop; Firefox desktop; Android Chrome at least basic input/load UX.
- Responsive at widths 360/768/1440; keyboard navigation/labels; no clipped plots.
- No obvious visual overflows; loading and errors clear; users can use sample dataset without account.

## Deployment acceptance
- `npm run build` and `npx wrangler deploy` exit successfully.
- Deployed URL loads front-end, pyodide, plots and exports.
- `/api/health` responds; a real AI request works or documented fallback engages.
- Inspect browser Network tab: no original CSV uploaded by default.
- Public demo can complete flow using samples without external paid login.
- Screenshots/video reflect genuinely implemented behavior, never staged outcomes.

## QA report template
```
Test ID | Fixture | Expected | Actual | Pass/Fail | Source ref | Notes
```
Record exact browser, model, library and git commit SHA of judged version.
