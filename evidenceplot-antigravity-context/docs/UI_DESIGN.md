# UI_DESIGN.md — Premium Scientific SaaS Interface
## Design direction
**Visual language:** calm scientific precision, generous white space, restrained color and clear evidence hierarchy. Not a generic neon gradient AI dashboard.

### Visual tokens (proposal)
- Canvas: `#F7F9FB`; panel: `#FFFFFF`; ink: `#10233F`; secondary: `#536579`.
- Navy brand: `#142F50`; teal for verified indicators: `#087F73`; gold for one primary CTA: `#E7B84A`; amber warnings: `#A86710`; error: `#B94046`.
- Border: `#E3E9EE`; focus ring `#2764A4`; radius 12–16px.
- Typography: Inter or system UI, 16px min for primary text; titles 26–36px; tabular nums for statistics.
- No color-only meaning; icons plus readable labels; WCAG 2.2 AA contrast, keyboard focus, reduced motion support.

## Navigation
Desktop sidebar (collapse on mobile): **Workspace**, **Data**, **Analysis**, **Figures**, **Evidence Passport**, **Help**. For POC, the primary work is a numbered **four-step wizard**; do not create dead nav destinations. Header: project title, demo mode, export action disabled until ready.

## Primary screens
### 1. Welcome / demo
- Hero: `From raw research data to figures you can verify.`
- Small line: `Transparent calculations. Publication-minded design. Reproducible exports.`
- Main CTA `Analyze a dataset`; secondary `Try a sample dataset`.
- Show 3 cards: Validate, Analyze, Publish. Include clear research-only disclaimer.

### 2. Data Upload & Inspection
- Drag/drop + file picker; note CSV max 5 MB and no automatic cloud upload.
- On upload show preview table (first 10 rows), row/column count, inferred type, missing count, duplicates flagged, distinct categories.
- Confirmation controls for numeric variables, categorical group, units, row ID and pairing/independence.
- Status: `Ready`, `Needs review`, `Unsupported`. Use concise actionable errors.

### 3. Analysis Brief & Plan
- Structured prompt area labeled `What do you want to learn from your data?`
- Sample objectives (selectable chips, not prefilled interpretation).
- AI can suggest **one plan from allowlist**; display type, variables, assumptions, limitations and suggested chart.
- Strong `Confirm analysis` button, `Change variables`, and `Run without AI` path.
- Never default to formal hypothesis testing without method choice/design confirmation.

### 4. Figure Studio
- Desktop two-column layout: graph 2/3 and controls 1/3; mobile stacked.
- Figure card: chart title, axis labels including units, legend, sample sizes, points.
- Controls: chart type (only compatible), X/Y mapping, point display, label and unit edits, bounded axes, color palette.
- Sidebar tabs: `Figure`, `Results`, `Data checks`.
- Results include n, missingness, descriptive stats, test method, effect estimate and p-value/CI **only if actually computed**.
- Banner clearly notes small sample or assumption caveats.

### 5. Interpretation & Export
- Two columns: figure preview + verified narrative with one-click trace from claim to number.
- `Evidence Passport` expandable detail: filename, checksum/hash, analysis config, package versions, warnings.
- Buttons: `Download SVG`, `Download PNG`, `Download Passport JSON`, `Download summary`.
- If AI unavailable: show deterministic results and human-editable caption template; no fake narrative.

## UI state matrix
| State | Design behavior |
| --- | --- |
| Pyodide loading | Progress message, busy state; no frozen UI |
| Wrong extension / oversize | Actionable inline error and retry |
| File contains identifiers | Prompt to de-identify; do not send labels to AI |
| Missing data | Warning with affected columns and explicit handling choice |
| Unsupported analysis | Explain available supported methods; change objective |
| AI JSON validation fails | Show manual method selection; safe retry |
| Low memory / worker crashed | Preserve interface; allow re-upload and reduced dataset |
| Export fails | Error toast with retry; don't claim file created |
| No internet after loading | Local calculations continue if packages cached; AI unavailable |

## UX accessibility and quality gates
- No tiny labels; keyboard-operable controls; accessible chart text alternatives.
- Data points and legend information available as table, not only graphic color.
- Support 360px mobile width, 768px tablet and 1440px desktop.
- Always show progress and *actual* server/analysis statuses.
- Avoid demo-only fake controls or placeholders that appear functional.
