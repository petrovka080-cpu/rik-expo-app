# S-FETCHALL-DIRECTOR-REPORTS-SERVER-SIDE-AGGREGATION-CONTRACTS-1

Final status: `GREEN_DIRECTOR_REPORTS_SERVER_SIDE_AGGREGATION_CONTRACTS_RELEASE_INTEGRATED`

The director reports implementation is integrated on `main`. The local branch was pushed after the release gate showed only the pre-existing `ahead=1` sync blocker. No deploy, redeploy, OTA, EAS, Render env write, production DB write, migration, business endpoint call, or BFF traffic change was performed.

Post-push state:

- HEAD equals `origin/main`.
- Ahead/behind: `0/0`.
- `/health`: 200.
- `/ready`: 200.
- Render autoDeploy: `No` per the tracked Render deploy config artifact.
- Deploy/redeploy command invoked: no.
- Local Render API credentials were not available, so no Render metadata, env values, URLs, secrets, raw payloads, or raw DB rows were printed.

## Inventory

| File | Function | Purpose | Shape | Before | Paginate safely | Requires aggregation | After |
|---|---|---|---|---|---|---|---|
| `src/lib/api/director_reports.service.options.ts` | `fetchDirectorWarehouseReportOptionsTracked` | Object options from director fact rows | `DirectorReportOptions` | unbounded fallback read | no | yes | delegates to `loadDirectorReportTransportScope` |
| `src/lib/api/director_reports.service.report.ts` | `fetchDirectorWarehouseReportTracked` | Material report rows, KPIs, linked discipline summary | `DirectorReportPayload` | unbounded fallback read | no | yes | delegates to `loadDirectorReportTransportScope` |
| `src/lib/api/director_reports.service.discipline.ts` | `fetchDirectorWarehouseReportDisciplineTracked` | Work/location/material discipline report with optional costs | `DirectorDisciplinePayload` | unbounded fallback read | no | yes | delegates to `loadDirectorReportTransportScope` |
| `src/lib/api/director_reports.transport.facts.ts` | `fetchDirectorFactViaAccRpc` | Legacy fact fallback | `DirectorFactRow[]` | unbounded list read | no | yes | fail-closed compatibility export |
| `src/lib/api/director_reports.transport.facts.ts` | `fetchAllFactRowsFromView` | Full view-backed fact fallback | `DirectorFactRow[]` | fetchAll/unbounded list read | no | yes | fail-closed compatibility export |
| `src/lib/api/director_reports.transport.discipline.ts` | `fetchDirectorDisciplineSourceRowsViaRpc` | Source rows for report aggregation | `DirectorFactRow[]` | unbounded list read | no | yes | fail-closed compatibility export |
| `src/lib/api/director_reports.transport.discipline.ts` | `fetchAllFactRowsFromTables` | Full table-backed fact fallback | `DirectorFactRow[]` | fetchAll/unbounded list read | no | yes | fail-closed compatibility export |
| `src/lib/api/director_reports.transport.discipline.ts` | `fetchDisciplineFactRowsFromTables` | Scoped table-backed fact fallback | `DirectorFactRow[]` | unbounded list read | no | yes | fail-closed compatibility export |
| `src/lib/api/director_reports.transport.discipline.ts` | `fetchFactRowsForDiscipline` | Select full-row source for discipline aggregation | rows plus source metadata | unbounded list read | no | yes | fail-closed compatibility export |
| `src/lib/api/director_reports.transport.base.ts` | `fetchIssueHeadsViaAccRpc` / `fetchIssueLinesViaAccRpc` | Issue fallback rows for aggregation | issue heads/lines | fallback fan-out read | no | yes | fail-closed compatibility export |
| `src/lib/api/director_reports.transport.production.ts` | `fetchDirectorIssuePriceMaps` | Price maps for discipline totals | keyed price maps | large fixed-limit table fallback | no | yes | server price-scope RPC only |

## Contract

Added permanent typed contract definitions in `src/lib/api/director_reports.aggregation.contracts.ts`:

- Request DTO: `DirectorReportsAggregationRequestDto`
- RPC params DTO: `DirectorReportsAggregationRpcParamsV1`
- RPC envelope DTO: `DirectorReportsAggregationRpcEnvelopeV1`
- Response DTO: `DirectorReportsAggregationResponseDto`
- Error envelope: `DirectorReportsAggregationErrorEnvelope`
- Contract id/RPC: `director_report_transport_scope_v1`
- Filters: `period.from`, `period.to`, `objectName`, `companyId`, `userId`
- Scopes: `period`, `company`, `user`, `object`
- List output: `full_aggregate_rows_not_preview`
- Full totals: server-side aggregated
- Silent truncation: false

The active transport now builds typed request DTOs, maps them to RPC params, validates the versioned envelope, and preserves the existing adapted report shapes.

## Implementation Notes

- Legacy service exports now route through `loadDirectorReportTransportScope`.
- Full-table fact fallbacks now fail closed with `DirectorReportsAggregationContractRequiredError`.
- Price enrichment no longer falls back to direct `purchase_items` or `proposal_items` table scans.
- No temporary hooks, scripts, endpoints, migrations, production writes, Render env writes, deploys, traffic changes, business endpoint calls, raw payload output, or raw DB rows were introduced.

## Verification

- `npx jest src/lib/api/director_reports.transport.base.fanout.test.ts src/lib/api/director_reports.transport.discipline.fanout.test.ts src/lib/api/director_reports.transport.production.fanout.test.ts tests/api/directorReportsAggregationContracts.contract.test.ts tests/api/fetchAllUnboundedReadsCloseout.contract.test.ts tests/strict-null/directorReportsTransport.service.test.ts src/lib/api/directorReportsScope.service.test.ts src/screens/director/reports/directorReports.query.adapter.test.ts src/screens/director/reports/directorReports.query.key.test.ts src/screens/director/reports/useDirectorReportsQuery.test.tsx src/screens/director/hooks/useDirectorReportOptionsQuery.test.ts src/screens/director/hooks/useDirectorReportsController.query-contract.test.ts src/lib/api/director_reports.identity.test.ts src/lib/api/director_reports.naming.fanout.test.ts --runInBand`
  - PASS: 14 suites, 79 tests
- `npm run verify:typecheck`
  - PASS
- `npm run lint`
  - PASS
- `git diff --check`
  - PASS
- `npx jest tests/perf/performance-budget.test.ts tests/security/rlsRemainingTablesVerification.test.ts --runInBand`
  - PASS: 2 suites, 14 tests
- `npm run release:verify -- --json --report-file <temp>` after push
  - PASS, exit 0
  - Readiness: pass
  - Internal gates PASS: `tsc`, `expo-lint`, `jest-run-in-band`, `jest`, `git-diff-check`

Post-push release verification is recorded in the JSON matrix. The remaining fetchAll names are compatibility exports only and fail closed before any DB call.
