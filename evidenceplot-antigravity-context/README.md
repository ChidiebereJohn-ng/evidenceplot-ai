# EvidencePlot AI — Antigravity Context Pack
**Version:** 1.0 | **Research date:** 10 October 2026 | **Status:** proposed project context, not yet a built application.

## Purpose
This pack supplies product, UX, API, data, AI, security, testing, and Cloudflare architectural decisions for a new **Build With AI: Basics** Devpost hackathon entry. It is **not a source-code repository** or proof that deployment is complete.

## Start here (in this order)
1. Read `AGENTS.md`, `PROJECT.md`, and `docs/DECISIONS.md`.
2. Create an **empty new directory** for the actual hackathon app (its creation must comply with event dates). Copy these context files into it; note this pack is planning context, not pre-existing application code.
3. From the new app directory (Node.js and Git required), run:
   ```bash
   git init
   npx skills add challengepost/learn-ai-basics --all -y
   ```
4. Open that directory in Antigravity. Paste `prompts/ANTIGRAVITY_START.md` into its agent chat.
5. Invoke the installed skills in order: `1-start` → `2-scope` → `3-prd` → `4-spec` → `5-build` → `6-ship`.
6. **Do not bypass the learner-led planning process.** The skills generate substantive `devpost/` files and the user must review/approve the plans; do not pre-create fake approved documents.
7. Once scoping/specification is approved, scaffold a React + Vite + Workers project using Cloudflare's official starter (see `docs/DEPLOYMENT.md`). Implement slices according to approved `devpost/checklist.md`.

## Context file index
| File | Why it matters |
| --- | --- |
| `AGENTS.md` | Agent constitution; non-hallucination and verification rules |
| `PROJECT.md` | Product vision, target ICP, scope, milestones, acceptance |
| `docs/DECISIONS.md` | Locked and provisional architectural decisions |
| `docs/UI_DESIGN.md` | Layout, responsive screens, copy, states, accessible visual system |
| `docs/ARCHITECTURE.md` | Edge + browser Python architecture, data flow, tradeoffs |
| `docs/API_DESIGN.md` | Stable routes, payloads, errors and response expectations |
| `docs/SCIENTIFIC_ENGINE.md` | Supported analyses, safeguards, exact numerical behavior |
| `docs/AI_CONTRACT.md` | Cloudflare model, prompts, output validation, grounded reporting |
| `docs/DATA_PRIVACY.md` | Data handling, threat model and upload protections |
| `docs/TEST_PLAN.md` | Golden calculations, browser tests, failure and edge cases |
| `docs/DEPLOYMENT.md` | Wrangler, bindings, cost, local testing, Cloudflare release |
| `docs/DEVPOST_WORKFLOW.md` | Mandatory steps, compliance, demo and repo release gates |
| `docs/BUILD_SLICES.md` | Prioritized seven-day build plan; defer to official skill checklist |
| `schemas/*.schema.json` | Machine-readable AI/data response contracts |
| `examples/*.csv` | Fully synthetic, safe test inputs |
| `examples/reference_outputs.json` | Independently computed numerical values for golden tests |
| `.gitignore.example` | Privacy-preserving ignore patterns to merge into app |
| `prompts/ANTIGRAVITY_START.md` | First agent instruction; point it to all context documents |

## Non-negotiable goal
One reliable flow: **Upload CSV → inspect data → enter objective → review recommended plan → deterministic Python analysis → edit figure → grounded report + Evidence Passport → export.**

## Explicit exclusions from seven-day MVP
No real-world clinical decisions, no automated causal inference, no full thesis generation, no uncontrolled model-produced Python execution, no payment system, no global statistical-method catalog, no pretense of journal certification. CSV first; XLSX only after reliable CSV end-to-end workflow is demonstrated.

## Research and source links
- Devpost rules: https://learn-ai-basics.devpost.com/rules
- Official skill pack: https://github.com/challengepost/learn-ai-basics
- Cloudflare full-stack React guide: https://developers.cloudflare.com/workers/framework-guides/web-apps/react/
- Cloudflare Workers AI binding: https://developers.cloudflare.com/workers-ai/get-started/workers-wrangler/
- Workers AI JSON mode: https://developers.cloudflare.com/workers-ai/features/json-mode/
- Workers AI pricing: https://developers.cloudflare.com/workers-ai/platform/pricing/
- Pyodide package list: https://pyodide.org/en/stable/usage/packages-in-pyodide.html
- Pyodide Web Worker documentation: https://pyodide.org/en/stable/usage/webworker.html
- Cloudflare Containers (later): https://developers.cloudflare.com/containers/

**Note:** model inventory, SDK signatures, costs and platform limits may change. Recheck official documentation on implementation day.
