# DEPLOYMENT.md — Cloudflare setup and budgets
## Intended hosting topology
**One Cloudflare Worker** serves React/Vite static assets and `/api/ai/*`; browser Pyodide does CPU-heavy scientific calculations. Optional persistent resources deliberately excluded from v1.

## Preconditions
- Node.js/npm, Git, Cloudflare account, modern desktop Chrome/Firefox.
- Check Workers AI model support and local/production usage; Devpost requires actual new code developed during allowed dates.

## Scaffold AFTER official skills approve scope/spec
```bash
npm create cloudflare@latest -- evidenceplot-ai --framework=react
cd evidenceplot-ai
# Or create the hackathon directory first, install skill pack and use a compatible Cloudflare template within it.
npm install
```
The exact CLI prompts and generated paths vary. Follow Cloudflare's current React+Vite guide at:
https://developers.cloudflare.com/workers/framework-guides/web-apps/react/

## Wrangler configuration minimum
The Cloudflare CLI command creates an application subdirectory named `evidenceplot-ai`. **If you have already created the hackathon repository and installed skills/context in its root, do not leave a nested app/repository**: instead scaffold in a temporary sibling directory, transfer template files (including hidden config files) into the approved project root, or use an official in-place scaffolding option if verified. Preserve git history, installed skills and the `devpost/` directory.

After template generation, preserve its `main`, `assets`, and Vite plugin settings; **merge** binding rather than replacing the entire file:
```jsonc
{
  "ai": { "binding": "AI" }
}
```
Regenerate binding types:
```bash
npx wrangler types
```

## Worker AI call
Only backend `worker/index.ts` may invoke `env.AI.run(modelId, input)`. Use primary `@cf/meta/llama-3.3-70b-instruct-fp8-fast`, JSON Mode with schema, error handling. Use model ID in code, no API token in frontend. Verify current SDK schema/return shapes.

## Pyodide in the browser
Use a pinned **stable** release, load once lazily in `type: 'module'` Web Worker. Load packages only when needed (`numpy`, `pandas`, `scipy`, optionally `matplotlib`); keep sensitive data local. Official docs:
https://pyodide.org/en/stable/usage/webworker.html
https://pyodide.org/en/stable/usage/packages-in-pyodide.html
Do not use `dev` or floating CDN tags. Test CORS/CDN caching, browser memory and failure handling. For `.xlsx`, use a compatible verified in-browser parser only after CSV works.

## Local development
```bash
npm run dev
# To test production-like build:
npm run build
npm run preview
# Deploy when verified:
npx wrangler login
npm run deploy
```
Scripts depend on generated template; adapt to its actual `package.json`, do not invent scripts.

## Cloudflare cost constraints (as of 2026-10-10)
- Workers AI: 10,000 free neurons/day account allocation, model-dependent usage pricing and limits; no guarantee every model is free beyond quota.
- Workers Free: limited request/CPU usage; compare with current pricing and account dashboard.
- Containers: requires Workers Paid plan (~$5/month minimum) and container usage billing; **not** selected for MVP.
- D1 and R2: optional later; avoid adding complexity and data retention responsibilities now.
References:
https://developers.cloudflare.com/workers-ai/platform/pricing/
https://developers.cloudflare.com/workers/platform/pricing/
https://developers.cloudflare.com/containers/platform/pricing/

## Pre-release checklist
- Use public synthetic dataset only.
- Configure safe default rate controls before sharing publicly.
- Verify AI binding deployed in correct environment.
- Monitor Workers AI neuron usage / quota before public demo.
- No `.env`, `.dev.vars`, API keys, research participant data in Git history.
- Test clear-data operation and public no-login judged workflow.
- Choose license (e.g. MIT if suitable) and include it in submitted public repo.
