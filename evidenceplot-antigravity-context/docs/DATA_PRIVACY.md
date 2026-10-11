# DATA_PRIVACY.md — Data handling & security

## Default policy
EvidencePlot AI is a research figure tool, not a medical decision-support system. For the hackathon, use synthetic sample data and an explicit research-only notice. Original uploaded CSV data should remain in browser memory; do not persist it in Cloudflare by default.

## Data flow labels
- P0: raw research rows, potentially sensitive → **local browser only**.
- P1: column metadata, row/column counts, non-identifying categories → sent for AI planning only with explicit notice.
- P2: aggregate test results, figure metadata → sent for AI caption only with explicit notice.
- P3: log events → count requests, timings/error codes; never log prompts, rows or personally identifying fields.

## Threats and mitigation
| Threat | Defense |
| --- | --- |
| CSV formula injection on exported CSV | Escape spreadsheet formula-leading cells if CSV export is later added; no automatic spreadsheet export in MVP |
| Prototype pollution or malformed JSON | Strict schemas, reject unknown fields, output encoding |
| Huge upload freezing browser | 5 MB/10k rows/40 columns guardrails; perform parsing in worker |
| Prompt injection in column names | Treat schema field values as untrusted data; never as instructions |
| LLM makes clinical advice | Research-only framing, strict prompts and human review |
| Leaked model credentials | Workers AI binding only, no frontend secrets, `.dev.vars` ignored |
| AI spend abuse | Same origin, body limits, rate caps, Cloudflare account quota monitoring |
| Insecure saved data | No persistence by default; future auth and retention policy required |
| Sensitive screenshots in public submission | Demo with synthetic, non-identifying fixtures only |

## Data governance UX copy
`Your original dataset stays in this browser. When you ask for AI planning or interpretation, we send the research objective, selected non-sensitive column information, and/or calculated summaries to Cloudflare's AI service. Review field labels before sending.`

## Deletion and retention
In hackathon MVP, data lives in transient browser session (unless a user explicitly exports a file). `Clear project` should unload dataset and reset Web Worker. Browser package caching may remain and is not research-data storage. No claim of regulatory compliance without independent review.

## Public-repository controls
Add `.gitignore` rules for `.dev.vars*`, `.env*`, local CSVs containing personal information, private test data, generated log files and build caches. License the project only after choosing an appropriate open-source license and recording third-party licenses.
