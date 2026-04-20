# PDF-X.B1 Executive Summary

Status: GREEN.

Baseline: `5c21275e36c8cd0f36998c934d5c86b1ec365f0e`

Scope: `director_reports_production_pdf` only.

## Goal

Move the Director production report PDF path away from "tap starts the full PDF factory" and toward a production-grade hot path:

- same report semantics
- same viewer boundary
- same template
- repeat opens reuse prepared work
- stale artifacts are not served as fresh forever

## What Changed

### Client hot path

`src/lib/api/directorProductionReportPdfBackend.service.ts`

- Adds bounded in-memory hot cache for production report PDF backend results.
- Adds in-flight coalescing for concurrent identical PDF taps.
- Uses a request key that includes period, object, price stage, company, generated-by, and `clientSourceFingerprint`.
- Persistent hot-cache reuse is enabled only when `clientSourceFingerprint` is present.
- Without a fingerprint, only in-flight coalescing remains, so the app does not cache by params alone.

`src/screens/director/director.reports.pdfService.ts`

- Builds `clientSourceFingerprint` from the already-loaded `repData` and `repDiscipline`.
- Passes the fingerprint to the production PDF backend request.
- Does not pass raw data as the PDF source of truth. The backend remains authoritative.

### Backend artifact path

`supabase/functions/director-production-report-pdf/index.ts`

- Adds deterministic artifact versioning for Director production report PDFs.
- Builds `sourceVersion` from the normalized request identity plus authoritative backend source payload.
- Builds `artifactVersion` from `sourceVersion` plus template/cache contract version.
- Checks the deterministic storage artifact before starting model/HTML/Puppeteer/render/upload work.
- Returns `renderer: "artifact_cache"` with telemetry on artifact hits.
- Uploads new PDFs to the deterministic artifact path on misses.
- Handles upload races by signing the already-created artifact if storage reports duplicate upload.

## Freshness Contract

The client does not trust params alone. Hot-cache reuse requires a screen data fingerprint.

The backend does not trust TTL alone. Artifact reuse requires the same authoritative source payload hash and template version.

Invalidation happens when any of these change:

- period/from/to
- object filter
- price stage
- company/generated-by visible PDF metadata
- report payload
- discipline payload
- production report template version
- artifact cache contract version

Old artifacts may remain in storage, but they are not selected by the new source version.

## What Did Not Change

- No `pdf-viewer` refactor.
- No PDF template rewrite.
- No Director reports UI flow change.
- No Warehouse/Finance/Supplier/Subcontract/Foreman PDF changes.
- No SQL semantics change.
- No business logic change.

## Top-Level Result

Expected path behavior after this wave:

- First open for a new source: source load + render + deterministic artifact upload.
- Repeat backend open for the same source: source load + artifact sign, no Puppeteer/upload.
- Repeat app-session open with same loaded report data: client hot-cache hit, no backend call.
- Duplicate rapid taps: one backend request, shared result.

## Proof

- Targeted Jest: PASS
- TypeScript: PASS (`npx tsc --noEmit --pretty false`)
- Lint: PASS (`npx expo lint`)
- Full Jest: PASS (`npx jest --runInBand`)
- JSON artifact parse: PASS
- Diff hygiene: PASS (`git diff --check`)
- Runtime scope: viewer/template/UI flow unchanged; PDF hot path now reuses client-session results and backend deterministic artifacts.

## Exact Next Step

If this proves stable in runtime, the next production-grade slice is not viewer work. It is a DB/source-side freshness probe or prewarm policy for the same Director production report source so the backend artifact hit can skip even more source work when the report projection version is already known.
