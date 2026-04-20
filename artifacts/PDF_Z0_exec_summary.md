# PDF-Z0 Executive Summary

Status: GREEN audit artifact.

Baseline: `a105e8738e55d4a81f20c1031e5c1b1147578fc8`

Mode: read-only foundation wave.

## What Was Done

- Built a full inventory of PDF paths across Director, Warehouse, Foreman, Buyer, Accountant, Contractor, and shared Reports.
- Mapped latency by layer: source load, aggregation, adaptation, HTML, render, upload/sign, open/share, viewer/bootstrap.
- Designed a backend-owned document manifest contract for heavy PDFs.
- Designed strict freshness/invalidation rules so cached PDFs are never "stale forever" and are not rebuilt blindly.
- Tiered PDF families into:
  - Tier 1: always-prebuilt
  - Tier 2: summary-first
  - Tier 3: on-demand acceptable
- Selected one exact first implementation slice.

## What Did Not Change

- No PDF calculation logic changed.
- No SQL changed.
- No Edge function changed.
- No viewer changed.
- No template changed.
- No UI flow changed.
- No hooks, adapters, VM layers, or temporary cache were added.

## Top 3 Findings

1. `director_finance_management_pdf`
   - Critical Director report.
   - Existing source prefetch and HTML-hash render cache prove hot-path pressure.
   - Still lacks durable manifest, source version, deterministic artifact identity, and backend-owned readiness.

2. `warehouse_material_pdfs` and `warehouse_object_work_pdf`
   - Operational report families with repeated period/day/object scopes.
   - Backend boundary is clean, but cold clicks can still trigger source work plus render/upload.

3. `proposal_pdf_shared`
   - Used by Buyer, Director, and Accountant.
   - Still has client-side source fanout and fallback pressure.
   - Should become summary-first, not full prebuilt by default.

## First Implementation Slice

`PDF-Z1: Director finance management manifest and deterministic artifact materialization`

Exact scope:

- `director_finance_management_pdf` only.
- Keep existing formulas, grouping, ordering, null/unknown behavior, empty state, template, viewer, and UI flow.
- Introduce a durable manifest/freshness/artifact lifecycle around the existing source/render semantics.
- Do not include supplier summary in the first slice. It is the next sibling after management report proves stable.

Why this slice:

- It is hot and business-critical.
- It already has partial local mitigation, so the need is proven.
- It has a clean source/RPC boundary through `pdf_director_finance_source_v1`.
- It can move from session-local cache to production-grade reuse without broad PDF rewrite.
- PDF-X.B1 already handled Director production artifact cache, so repeating that exact slice is not the best next move.

## Explicit Non-Goals

- Do not refactor `app/pdf-viewer.tsx` first.
- Do not prebuild every PDF family blindly.
- Do not introduce TTL-only cache.
- Do not change templates while changing artifact lifecycle.
- Do not merge Director finance, Warehouse, Proposal, Payment, and Foreman PDFs into one implementation wave.
- Do not store business totals in the manifest as a second source of truth.

## Required Proof For PDF-Z1

- Parity with current Director finance management report:
  - totals identical
  - grouping identical
  - ordering identical
  - null/unknown semantics identical
  - empty-state identical
  - visible metadata identical
- Freshness proof:
  - source-affecting mutations change `source_version`
  - template/render contract changes change `artifact_version`
  - signed URL refresh does not change document identity
  - stale artifacts are not served as fresh
- Reuse proof:
  - repeat open uses fresh manifest/artifact path
  - no full raw factory starts from click when a fresh artifact exists

## Audit Artifacts

- `artifacts/PDF_Z0_1_inventory.md`
- `artifacts/PDF_Z0_2_latency_map.md`
- `artifacts/PDF_Z0_3_manifest_contract.md`
- `artifacts/PDF_Z0_4_invalidation_model.md`
- `artifacts/PDF_Z0_5_tiering_matrix.json`
- `artifacts/PDF_Z0_exec_summary.md`

## Checks

- Baseline clean before artifact creation: confirmed.
- `main == origin/main` before artifact creation: confirmed.
- JSON parse required for `PDF_Z0_5_tiering_matrix.json`.
- `git diff --check` required.
- Commit must be without `--no-verify`.
- Push required.
- OTA not required because this wave changes audit artifacts only, not app bundle/runtime code.
