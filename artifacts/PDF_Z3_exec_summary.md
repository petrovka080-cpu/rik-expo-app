# PDF-Z3 Exec Summary

Status: GREEN with Android environment BLOCKED.

## Selected Path

Warehouse `incoming_register` all-period register PDF.

Selection measurement picked this path as top-1: `13772 ms`, slower than issue register, issue materials, object/work, and incoming materials.

## What Changed

- Added deterministic manifest/version contract for warehouse incoming register.
- Added deterministic `source_version` and `artifact_version`.
- Added server-side artifact lookup before render.
- Added in-flight registration before any await.
- Added client memory reuse for repeat clicks.
- Added TTL-bound persistent signed-artifact handoff for warm opens after reload.
- Kept formulas, totals, ordering, grouping, templates, and UI semantics unchanged.

## Runtime Proof

Web: PASS.

- Cold/artifact-hit sample: `4720 ms` telemetry, backendCalls `1`.
- Warm after full web reload: median `150 ms`, max `174 ms`, backendCalls `0`.
- Repeat in same session: median `137 ms`, max `139 ms`, backendCalls `0`.
- Page errors: `0`.
- Viewer errors: `0`.
- 5xx responses: `0`.

Android: ENV BLOCKED.

- `adb devices` returned no devices.
- One recovery attempt failed because `emulator` CLI is unavailable in PATH.

## Gates

- Targeted PDF-Z3 tests: PASS, 4 suites, 13 tests.
- `npx tsc --noEmit --pretty false`: PASS.
- `npx expo lint`: PASS.
- `npx jest --runInBand --no-coverage`: PASS, 356 suites passed, 1 skipped.
- `git diff --check`: PASS.
- `warehouse-pdf` Edge Function deploy: PASS.

## Verdict

PDF-Z3 is release-ready under the wave rule: all code/static/web gates are GREEN, Android is honestly environment BLOCKED after one recovery attempt.
