# PDF-Z1 Execution Summary

## Status

- GREEN candidate before commit/push/OTA
- Implementation, static gates, web runtime, and Android clean-launch sanity are green

## What Changed

- Added Director finance management PDF manifest/version contract inside the existing director PDF platform contract module.
- Added deterministic `source_version` from business-significant PDF inputs with noise stripping.
- Added deterministic `artifact_version` from source/template/render contract versions.
- Passed the finance management manifest through the existing `exportDirectorManagementReportPdf` and `renderDirectorPdf` path.
- Added backend deterministic artifact lookup before Puppeteer render in `director-pdf-render`.
- Added durable manifest JSON writes for `missing`, `stale`, `building`, `ready`, and `failed`.
- Allowed `artifact_cache` as a valid renderer only for the manifest-driven management report path.
- Added in-flight coalescing for identical client render requests so speculative prerender and manual click share one backend result.
- Added targeted PDF-Z1 tests for version stability, business-data bumps, noise immunity, artifact reuse, backend readiness statuses, and duplicate-storm prevention.

## What Did Not Change

- PDF formulas did not change.
- Management report template semantics did not change.
- `pdf-viewer` was not changed.
- UI navigation flow was not changed.
- Other PDF families were not migrated.
- SQL/RPC semantics were not changed.
- No temporary hook, VM, or adapter layer was added.

## Proof

- Targeted Jest: PASS, 3 suites, 19 tests
- `npx tsc --noEmit --pretty false`: PASS
- `npx expo lint`: PASS
- Full Jest: PASS, 1 skipped, 352 passed, 352 of 353 suites; 1 skipped, 2255 passed, 2256 tests
- `git diff --check`: PASS
- Web click smoke: PASS on fresh localhost web bundle at `http://127.0.0.1:19008`
- Web manifest proof: PASS, `manifestStatus=ready`, `cacheStatus=artifact_hit`, deterministic `artifacts/v1` storage path
- Web duplicate-storm proof: PASS, one function POST and `rendered_pdf_inflight_join` observed for the competing speculative/click path
- Android smoke: PASS, `emulator-5554` online, app opens `MainActivity`, login UI reachable, no DevLauncherError, no fresh fatal/ANR after recovery

## Runtime Notes

- A direct unauthenticated `rik://pdf-viewer` deep link into the dev client is not treated as a supported PDF-Z1 user path. It produced a native dev-client crash during probing, then recovered cleanly with a force-stop and normal dev-client launch.
- Android authenticated finance UI was not driven because this wave explicitly avoided seed/login harnesses and UI automation.

## Release

- Commit: pending
- Push: pending
- OTA development: pending
- OTA preview: pending
- OTA production: pending

## Exact Next Step

Commit PDF-Z1 without `--no-verify`, push, publish OTA to `development`, `preview`, and `production`. Do not open PDF-Z2 until those release gates are done.
