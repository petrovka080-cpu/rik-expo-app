# S-DIRECTOR-REPORTS-FETCHALL-SAFE-ROUTING-2

Final status: `GREEN_DIRECTOR_REPORTS_FETCHALL_SAFE_ROUTING_2_RELEASE_INTEGRATED`

## Scope

Closed the remaining director-adjacent full report read found by inventory:

- `src/lib/api/pdf_director.data.ts`
- `loadDirectorSubcontractReportPdfModel`

Before this wave, the legacy helper built the director subcontract PDF model from a direct `subcontracts` table select without `limit`, `range`, or `maxRows`. That was unsafe for a full report because adding an arbitrary limit would silently change report totals.

## Change

The helper now uses the existing typed server source contract:

- source function: `getDirectorSubcontractPdfSource`
- RPC contract: `pdf_director_subcontract_source_v1`
- filters preserved: `periodFrom`, `periodTo`, `objectName`
- model builder preserved: `prepareDirectorSubcontractReportPdfModelFromRows`

No report output shape was changed. The active export path already used this source contract; this wave aligned the legacy model loader with that same safe path.

## Safety

- No arbitrary limit.
- No silent truncation.
- No temporary hook, script, endpoint, or compatibility bypass.
- No production DB write.
- No migration.
- No deploy/redeploy.
- No OTA/EAS/native/store action.
- No Render env write.
- No BFF traffic change.
- No business endpoint calls.
- No secrets, env values, URLs, raw payloads, raw DB rows, or business rows printed.

## Verification

- `npx jest tests/api/fetchAllUnboundedReadsCloseout.contract.test.ts src/lib/api/pdf_director.test.ts src/lib/api/directorPdfSource.service.test.ts tests/strict-null/directorPdfSource.service.phase3.test.ts --runInBand`
  - PASS: 4 suites, 15 tests
- `npm run verify:typecheck`
  - PASS
- `npm run lint`
  - PASS
- `git diff --check`
  - PASS
- artifact JSON parse
  - PASS
- final `release:verify -- --json`
  - PASS after push

## Result

Director subcontract PDF model loading no longer performs a client full-table report read. It uses the permanent server-owned PDF source contract while preserving the existing report model semantics.

