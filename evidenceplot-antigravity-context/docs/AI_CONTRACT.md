# AI_CONTRACT.md — Cloudflare Workers AI layer
## Binding and model
In Cloudflare's React + Vite app, add a Workers AI binding to `wrangler.jsonc`:
```jsonc
{ "ai": { "binding": "AI" } }
```
Use **server-side** `env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {...})`. Do not expose REST tokens to browser. API wrapper should select exact model ID in one config file; fail if binding missing. Current JSON Mode docs support this model, but validate actual output and production availability.

## Safe JSON request shape (illustrative TypeScript)
```ts
const raw = await env.AI.run(MODEL_ID, {
  messages: [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: JSON.stringify(sanitizedPayload) }
  ],
  response_format: {
    type: 'json_schema',
    json_schema: planJsonSchema
  },
  temperature: 0.1,
  max_tokens: 700
});
// Parse actual SDK response variant, validate with Zod, reject unexpected keys/types,
// and handle JSON Mode couldn't be met / quota / timeout errors.
```
Do not assume the example compiles verbatim with every Wrangler SDK release; generate binding types and check installed types.

## Task 1 — analysis plan SYSTEM_PROMPT
```text
You are EvidencePlot's scientific-analysis planner. Return only JSON matching the provided schema.
Choose exactly one analysis and one chart from allowed_analyses and allowed_charts.
You have only a schema profile and research objective, not raw individual observations.
Never invent values, p-values, assumptions, units, counts, variable names or citations.
A proposed method must be blocked pending human confirmation of necessary study design.
If the request exceeds support, select descriptive analysis with a clear warning or return a documented cannot_proceed state.
No executable code, scripts, SQL or external URLs.
```

## Task 2 — grounded interpretation SYSTEM_PROMPT
```text
You are EvidencePlot's scientific figure-caption writer.
The supplied structured result is the only allowed source for empirical numbers.
Write concise, factual, non-causal scientific prose. Preserve method and axis units exactly.
Do not infer significance where the engine has not returned valid p-values.
Do not invent uncertainty bounds, sample sizes, citations or literature facts.
Do not make medical decisions. Include given limitations and state ambiguity plainly.
Return only JSON matching the interpretation schema.
```

## Post-generation safeguards
- Parse model result according to actual Cloudflare response shape; validate with Zod/Ajv.
- Reject any method not in allowlist, unknown variables or charts, missing user confirmation or unsanctioned text field.
- Compare narrative numerical values to engine outputs, including rounded representations. At minimum, limit prose to model-approved textual templates with inserted verified values if strict numeric checking fails.
- If a model writes `p<0.05` but computed p is absent or >= 0.05, reject it.
- Preserve `model_id`, prompt-template version, and a generated timestamp in passport metadata.
- If JSON Mode fails, render manual method selection and deterministic caption. Never block the whole scientific workflow solely because AI is unavailable.

## Privacy budget
- AI planning: only sanitized field names/types, missing counts, optional non-sensitive category labels and research objective.
- AI interpretation: deterministic statistical results and figure metadata, **never full uploaded dataset**.
- Warn that project topic/column labels themselves can contain identifying details; provide rename controls.

## Cost discipline
Cloudflare Workers AI pricing has a 10,000-neuron/day free allocation (as of Oct 2026), and token/use pricing varies by model. Initial app: max one planning call and one interpretation call per analysis action; no automatic model requests while typing. Rate-limit, cache identical sanitized requests only if privacy reviewed, and set simple quotas.

## Real SDK testing checklist
- `npx wrangler types` produces AI binding types.
- Live `/api/ai/plan` tested against actual bound model.
- Malformed JSON and schema error trigger fallback.
- Quota exhausted and network failure show correct UI states.
- No raw CSV contents in network payload or logs.
