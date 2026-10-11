# Decisions, assumptions and open questions

## Confirmed planning decisions (to be reviewed inside official Devpost skill process)
- A narrow scientific figure MVP beats a broad data-analysis platform.
- All authoritative numerical work is deterministic Python, not a model.
- Primary host: Cloudflare Workers Static Assets + Worker endpoints.
- Use Cloudflare Workers AI binding to call an available Cloudflare-hosted model.
- Prefer browser Pyodide (module Worker) in MVP to avoid mandatory paid Cloudflare Containers.
- No D1/R2 persistence by default; synthetic demo data.
- CSV-first; .xlsx extension after working vertical slice and verified parser.

## Model decision
- Primary: `@cf/meta/llama-3.3-70b-instruct-fp8-fast`. Confirm current availability, JSON Mode behavior, rate limits and model pricing before deploy.
- Failover: deterministic user-selectable analysis; do not secretly switch to unknown providers.
- Worker provides authenticated service boundary / rate controls; `env.AI` is not exposed to the browser.

## Explicit compromises
- Pyodide requires a first-load package download and capable browser; show initialization progress and avoid loading heavy packages until analysis is requested.
- Interactive graph uses Plotly.js or equivalent; export data/method provenance. If a plotting library silently aggregates, remove aggregation or document exactly how it works.
- Browser-side dataset confidentiality is possible, but **network requests for AI still transfer summary fields**; communicate precisely.

## Items requiring user approval in `2-scope`/`3-prd`/`4-spec`
- Main user's first analysis type (default example: two independent groups).
- Exact UI copy/name, colors and export formats.
- File size limits and supported browsers.
- Need for future user accounts and saved projects.
- Model cost allowance and policy for paid Workers AI usage.

## No-hallucination checkpoints
1. Agent quotes the official skill source and exact required `devpost` paths; never presumes their contents.
2. Agent tests actual `env.AI.run` JSON Mode response and handles inconsistent shapes.
3. Agent tests pyodide CDN pinned release and module-worker loading in browser.
4. Agent tests actual CSV parser, English decimal/quoted values and BOM.
5. Agent independently reproduces any p-value/CI with SciPy or trusted reference.
6. Agent verifies published static site can contact deployed Worker AI.
