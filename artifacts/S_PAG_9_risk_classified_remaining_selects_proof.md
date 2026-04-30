# S-PAG-9 Risk-Classified Remaining Selects Proof

Status: repo-only production-safe pagination wave. No production, staging, load test, SQL/RPC/RLS, storage, package, native, OTA, EAS, or Play Market action was used.

## Why This Wave

S-LOAD-FIX-3 is source-patch ready, but S-LOAD-6 is blocked until that migration is applied to staging. Running staging load before staging has the new source patch would be an invalid proof. This wave therefore takes the next safe platform step: reduce remaining DB read pressure in repo-only list/enrichment paths.

## Baseline And Result

- Baseline from S-PAG-8: 80 unbounded selects / 37 files.
- Post-wave estimate: 74 unbounded selects / 37 files.
- Fixed call-sites: 6.
- File count remains conservative because remaining static tail includes excluded report, PDF, export, detail, guard, accounting, and warehouse stock surfaces.

## Call-Sites Bounded

1. `src/lib/api/buyer.ts` - `loadLatestProposalLifecycleByRequestItem`, `proposal_items_view` lookup by visible request item ids, page-through `.range`, default 100, order `request_item_id`, `proposal_id`.
2. `src/lib/api/buyer.ts` - `loadLatestProposalLifecycleByRequestItem`, `v_proposals_summary` lookup by proposal ids, page-through `.range`, default 100, order `proposal_id`.
3. `src/lib/api/buyer.ts` - `enrichRejectedRows`, rejected proposal item context lookup, page-through `.range`, default 100, order `id`, existing timestamp JS sort preserved.
4. `src/lib/api/buyer.ts` - `filterInboxByRequestStatus`, request status gate lookup by visible inbox request ids, page-through `.range`, default 100, order `id`.
5. `src/lib/api/constructionObjectIdentity.read.ts` - `loadConstructionObjectCodesByNames`, construction object identity lookup by input names, page-through `.range`, default 100, order `construction_object_name`, `construction_object_code`, abort signal preserved.
6. `src/lib/api/constructionObjectIdentity.read.ts` - `loadRequestObjectIdentityByRequestIds`, request object identity lookup by request ids, page-through `.range`, default 100, order `request_id`.

## Skipped

- PDF/report/export reads: excluded.
- Detail reads and guard semantics: excluded.
- Finance/accounting and warehouse stock calculations: excluded without dedicated calculation tests.
- Attachment/open-file behavior: excluded.
- SQL/RPC/RLS/storage and live staging migration application: not touched.

## Tests

- `tests/api/riskClassifiedRemainingSelectsBatch9.contract.test.ts`

## Safety

- Production touched: NO
- Staging touched: NO
- Writes: NO
- Load tests run: NO
- SQL/RPC/RLS/storage changed: NO
- Package/native config changed: NO
- Business logic changed: NO
- Finance/accounting calculations changed: NO
- Warehouse stock math changed: NO
- OTA/EAS/Play Market touched: NO
- Raw payload/PII/secrets logged: NO
- Secrets printed/committed: NO
