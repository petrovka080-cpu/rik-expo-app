# PDF-Z1.1 Boundary Map

## Status

- Wave: PDF-Z1
- Family: Director finance management PDF
- Verdict at artifact time: GREEN candidate, final release gates pending
- Baseline: `main == origin/main` was confirmed before implementation

## Exact Owner Chain

- User action owner: Director finance management report PDF action
- Source owner: `exportDirectorManagementReportPdf`
- Source data owner: `getDirectorFinancePdfSource`
- Model owner: existing management PDF model builder
- Template owner: existing management report HTML renderer
- Render transport owner: `renderDirectorPdf`
- Backend render owner: `supabase/functions/director-pdf-render`
- Durable readiness owner: PDF-Z1 manifest contract
- Artifact owner: Supabase Storage bucket `director_pdf_exports`

## In Scope

- Director finance management PDF only
- Manifest identity for this PDF family
- Deterministic `source_version`
- Deterministic `artifact_version`
- Durable manifest JSON path
- Versioned artifact path
- Backend artifact hit before Puppeteer render
- Backend status transitions: `missing`, `stale`, `building`, `ready`, `failed`
- Client in-flight coalescing for identical render requests so speculative prerender and click cannot create a duplicate backend render storm
- Targeted parity/freshness/reuse tests

## Out Of Scope

- No PDF formula changes
- No management report template rewrite
- No `pdf-viewer` rewrite
- No UI flow change
- No broad PDF family migration
- No SQL/RPC semantic change
- No second source of truth for finance totals

## Source Version Boundary

The `source_version` is derived from business-significant inputs that affect the PDF:

- Period scope
- Top-N scope
- Due/critical day thresholds
- Evaluation date used by existing overdue/critical logic
- Finance source rows after noise stripping
- Spend source rows after noise stripping
- Source family identity

Noise fields are excluded from source identity:

- generated/fetched/loaded timestamps
- trace/request ids
- telemetry/timing/debug fields
- signed URL and transport fields

## Artifact Version Boundary

The `artifact_version` is derived from:

- `source_version`
- `template_version`
- `render_contract_version`
- PDF-Z1 artifact contract version

This keeps artifact reuse deterministic while making template/render contract changes explicit rebuild triggers.

## Residual Boundary

This slice does not introduce a pre-click manifest lookup API. The client still loads current source rows to compute the current `source_version` and preserve exact PDF semantics. The heavy backend render/upload path is no longer the normal repeated-open path once the deterministic artifact exists.
