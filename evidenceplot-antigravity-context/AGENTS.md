# AGENTS.md — Antigravity Project Constitution
Applies to every AI agent and subagent touching the EvidencePlot AI repository.

## Source-of-truth order
1. Mandatory Devpost Learn Skill Pack instructions, once installed. **Never override their learner-led workflow.**
2. User-approved `devpost/scope.md`, `devpost/prd.md`, and `devpost/spec.md` as they are generated.
3. `PROJECT.md`, `docs/DECISIONS.md`, and detailed `docs/*` context.
4. Tested code and schemas.
5. Chat instructions, provided they do not conflict with the above; ask the user to reconcile contradictions.

## Before writing code
- Read all relevant context files, list the exact current phase, provide an implementation plan, and state blockers.
- If `devpost/learner-profile.md` is absent, initiate `1-start`. Do **not** skip `2-scope`, `3-prd`, or `4-spec`.
- Never manufacture the user's approvals, pretend a plan was reviewed, or mark an untested function complete.
- Never create or edit `devpost/` required planning files as if official skills had produced them outside their process.

## Scientific accuracy rules
- **LLM never computes authoritative figures**. It may only propose from a closed allowlist and explain numerical output emitted by deterministic code.
- **No arbitrary AI-generated Python** and no user-supplied Python execution. Call only reviewed functions of a fixed local Python analysis engine.
- Do not auto-delete duplicates/outliers, infer pairings or experimental design, or impute missing data without user review.
- Never invent sample sizes, group means, CI values, p-values, effect sizes, units, citations, references or statistical significance.
- If assumptions are not met, stop, warn or offer supported descriptive analysis.
- Never call correlations causal.
- Captions must bind to real plot metadata and actual results; if values are absent, state they are unavailable.

## Coding and reliability rules
- TypeScript strict mode; Zod or equivalent for every Worker input and model output.
- Test-first on numerical calculations and critical data conversions. Regression-test when fixing a bug.
- Define stable typed JSON contracts before building front-end bindings.
- Prefer smallest useful vertical slice over implementing every screen at once.
- Check package versions, Cloudflare capability and SDK interfaces against official documentation; **no invented APIs**.
- Deploy regularly and test on real deployed URLs. `works in dev` is not a deployment acceptance test.
- Show only genuine test evidence and working screenshots; never mock success behind a nonfunctional button.
- Do not silently introduce new infrastructure, subscriptions or expensive APIs.

## Security / privacy / ethics
- Default: raw datasets stay in browser memory, never uploaded to R2, D1, Workers AI or logs.
- Explicitly disclose that the **research prompt and selected summary statistics** are sent to Cloudflare AI for inference when the user requests AI assistance.
- Remove labels that may contain identifying patient details before constructing AI input; request consent for any non-synthetic upload.
- Limit dataset size, number of rows/columns, AI payloads and response sizes; implement error states and throttling.
- Protect secrets in Worker bindings; never ship tokens inside frontend JS or commit `.dev.vars` / `.env`.
- If the result looks like medical guidance, explain the tool supports research reporting, not diagnosis.

## Architecture freeze for MVP
- UI: React + Vite + TypeScript + Tailwind CSS, Cloudflare Worker serving static assets.
- Server: Cloudflare Worker with Workers AI binding. No independent Python backend in MVP.
- Math: vetted Python code in Pyodide in a **module Web Worker** (never on the main UI thread).
- Chart presentation: Plotly.js or a lightweight SVG renderer, with reviewed export behavior.
- Persistent user data: not needed for judged demo; no D1/R2 until approved in `devpost/spec.md`.
- Primary LLM candidate: `@cf/meta/llama-3.3-70b-instruct-fp8-fast` via `env.AI.run` with JSON schema (must validate and handle JSON mode errors).

## Definition of done per slice
Compilation, type check, numerical tests, browser interaction, failure-path review, deployed check (when applicable), and git commit with meaningful message. Report remaining limitations honestly.
