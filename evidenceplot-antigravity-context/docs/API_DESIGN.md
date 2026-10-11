# API_DESIGN.md — Stable Cloudflare Worker Routes
**Format:** JSON over HTTPS; same-origin `/api/*` only. No original dataset uploads in MVP.

## Endpoints
### `GET /api/health`
200 response: `{ "ok": true, "service": "evidenceplot-ai", "aiConfigured": true, "version": "0.1.0" }`.
This route must never trigger paid inference. `aiConfigured` reflects binding configuration, not guaranteed live model availability.

### `POST /api/ai/plan`
User-approved objective + **non-sensitive** schema profile; never the raw rows.
Request example:
```json
{
  "objective": "Compare the response between treatment and control groups",
  "dataset_profile": {
    "row_count": 12,
    "columns": [
      {"name":"group", "type":"categorical", "missing_count":0, "categories":["control","treatment"]},
      {"name":"response", "type":"numeric", "missing_count":0, "unit":"units"}
    ]
  },
  "allowed_analyses": ["descriptive", "welch_t", "pearson"],
  "allowed_charts": ["grouped_points", "scatter", "time_series"]
}
```
Success `200`: response conforms to `schemas/analysis-plan.schema.json`, e.g.:
```json
{
  "analysis":"welch_t",
  "chart":"grouped_points",
  "columns":{"group":"group","value":"response"},
  "confidence":"requires_confirmation",
  "assumptions_to_confirm":["Observations belong to independent groups"],
  "rationale":"Two separate groups and one numeric response are present.",
  "warnings":[]
}
```
`confidence` is **not** a statistical probability or score; it is a UI workflow marker.

### `POST /api/ai/interpret`
This endpoint accepts **only verified analysis result JSON** from deterministic engine and sanitized goal. It cannot run or request new analyses.
```json
{
  "objective": "Compare independent groups",
  "analysis_result": {
    "analysis_id":"abc123",
    "method":"welch_t",
    "n_total":12,
    "numbers":{"mean_a":10.5,"mean_b":15.4,"difference_b_minus_a":4.9,"p_value":0.028},
    "limitations":["Small sample; verify independence and distribution"]
  },
  "figure":{"x":"group","y":"response","unit":"units"}
}
```
The above **numbers are API shape illustrations, not validated results from the supplied examples**. No clinical or causal claims.
Response conforms to `schemas/interpretation.schema.json`:
```json
{
  "headline":"Treatment observations are higher in the sample",
  "summary":"The model summary must reference only permitted engine-derived values.",
  "figure_caption":"Individual response values by treatment group (units).",
  "limitations":["Small sample size and an observational interpretation limit generalization"],
  "verified_claims":[{"key":"difference_b_minus_a", "value":4.9}]
}
```
Any `verified_claims` must be **identical** to the engine's `numbers` fields; validate programmatically. Reject output that introduces new unverified numerals/p-values. If model fails, return non-AI deterministic caption template.

## Auth, abuse prevention and network behavior
- Same-origin only, valid JSON `Content-Type`, POST body <= 16KB, field-length checks, per-IP coarse rate controls where feasible. API tokens remain in Workers bindings, never exposed to users.
- CORS disabled for other origins initially; add only if justified.
- Model calls may take seconds; UI has cancel/retry affordance but do not promise canceling a request already in flight.
- Avoid raw request logging. Never include prompts or source data in error monitoring.

## Error contract
```json
{ "error": { "code": "AI_INVALID_RESPONSE", "message": "AI planning is unavailable. Choose a supported analysis manually.", "retryable": true } }
```
Recommended codes: `INVALID_INPUT` (400), `PAYLOAD_TOO_LARGE` (413), `RATE_LIMITED` (429), `AI_UNAVAILABLE` (503), `AI_INVALID_RESPONSE` (502), `INTERNAL_ERROR` (500).

## Python engine interface (in-browser, not an HTTP API)
Worker message types: `INIT`, `PROFILE`, `RUN_ANALYSIS`, `CANCEL_OR_RESET`, with `requestId`; responses `READY`, `PROFILE_RESULT`, `ANALYSIS_RESULT`, `PROGRESS`, `ERROR`. Strict structured cloning of arrays/JSON only. If interrupted, terminate/recreate Worker.

## Compatibility
- Version result JSON contracts. Treat any new field, inference method, or chart type as requiring schema and test updates.
- No LLM-generated code, SQL or arbitrary JavaScript is accepted from model output.
