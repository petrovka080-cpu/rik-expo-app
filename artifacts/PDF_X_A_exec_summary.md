# PDF-X.A Executive Summary

Status: GREEN for read-only audit.

Baseline: `de3b2effe760c661c717daf39e85f480bcb38c18`

Date: 2026-04-20

## What Was Audited

- Director request/proposal PDFs.
- Director finance management and finance supplier summary PDFs.
- Director production and subcontract report PDFs.
- Warehouse issue/incoming forms, registers, material reports, day reports, and object/work PDFs.
- Foreman request/history PDFs.
- Buyer/accountant proposal PDFs.
- Accountant payment order PDF and remote attachment open path.
- Contractor act/work PDF path.
- Reports dashboard PDF export.
- Shared document action, PDF runner, canonical render, and Edge/Puppeteer boundaries.

## Core Finding

The top issue is not that `pdf-viewer` opens too slowly. The main risk is that several report PDFs still start expensive source preparation and render work from the user click path.

The mature architecture should be summary-first:

- DB/read-model layer owns heavy report projection.
- Transport returns a cheap summary with `source_version` and `computed_at`.
- Optional artifact cache uses `artifact_version = source_version + template_version`.
- Viewer opens a prepared URI/source and does not perform raw aggregation.

## Top 3 Worst Paths

1. `director_reports_production_pdf`
   - Edge function re-fetches production report source on click through `pdf_director_production_source_v1`.
   - Source combines production materials and works domains.
   - Backend then adapts, builds HTML, runs Puppeteer, uploads, and returns a signed URL.
   - No durable source reuse, artifact version, or invalidation contract was found.

2. `warehouse_material_pdfs` and `warehouse_object_work_pdf`
   - Active warehouse PDF backend is well isolated, but all-period material/object-work report PDFs can still run report aggregation and Edge render on click.
   - Several source RPCs expose generated/version metadata, but the artifact layer does not yet use a freshness contract.

3. `director_finance_supplier_summary_pdf`
   - Finance source is fetched through the backend, then supplier/kind filtering and render happen per request.
   - The main finance panel has prefetch/prerender mitigation, but supplier summaries do not show the same durable reuse policy.

## Top-1 Offender

`director_reports_production_pdf`

Why this is top-1:

- It is report-scale, not single-document-scale.
- It spans materials and works data.
- It runs source load plus render work from the PDF backend path.
- The UI may already have related report data, but the backend PDF path does not reuse a versioned summary/artifact.
- It is a clean first slice: one report family, one Edge function, one source RPC contract, no viewer rewrite required.

## First Implementation Wave

`PDF-X.B1: Director production report summary-first artifact contract`

Exact target:

- Introduce a production-report summary/projection contract for the PDF path.
- Add a source freshness contract with `source_version` and `computed_at`.
- Add artifact freshness with `artifact_version = source_version + template_version` or equivalent.
- Make repeat requests reuse a fresh summary/artifact instead of starting full raw report work from click.
- Prove parity against the current production report PDF payload.

Required parity checks:

- Materials totals identical.
- Works totals identical.
- Grouping and ordering identical.
- Null/unknown semantics identical.
- Empty state identical.
- Scope/date/object filters identical.

## What Not To Do

- Do not start with `pdf-viewer` refactor.
- Do not build every possible PDF eagerly.
- Do not add a blind TTL cache without version/freshness semantics.
- Do not mix director production, warehouse, finance supplier, proposal, and request PDFs in one implementation wave.
- Do not change templates while moving aggregation.
- Do not keep dual raw-compute and summary-compute paths indefinitely.

## Audit Green Criteria

- Code and SQL not changed.
- PDF paths inventoried.
- Latency pressure mapped.
- Precompute classifications recorded.
- Top-1 implementation slice selected.
- Artifact-only diff verified before commit.
- `PDF_X_A_precompute_matrix.json` parses as valid JSON.
