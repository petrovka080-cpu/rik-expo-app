# S-PAG-7 Hotspot List Read Pagination Proof

Status: local code wave, no production/staging access used.

## Baseline And Result

- Baseline tail: 95 unbounded selects / 37 files after S-PAG-6.
- Post-wave tail: 86 unbounded selects / 37 files.
- Fixed call-sites: 10.
- File count remains 37 because target files still contain intentional detail/report/guard reads that are excluded from this wave.

## Call-Sites Bounded

1. `src/screens/contractor/contractor.data.ts` - `fetchRequestScopeRows`, `requests` by `subcontract_id`, page-through-all `.range`, default 100.
2. `src/screens/contractor/contractor.data.ts` - `fetchRequestScopeRows`, fallback `requests` by `contractor_job_id`, page-through-all `.range`, default 100.
3. `src/screens/contractor/contractor.data.ts` - `loadLogIdsByProgressIds`, `work_progress_log` by progress id(s), page-through-all `.range`, default 100.
4. `src/screens/contractor/contractor.data.ts` - `loadConsumedByCode`, `work_progress_log_materials` by log ids, page-through-all `.range`, default 100.
5. `src/screens/contractor/contractor.data.ts` - `loadIssuedByCode`, `v_wh_issue_req_items_ui` by request ids, page-through-all `.range`, default 100.
6. `src/screens/buyer/buyer.repo.ts` - `repoGetProposalItemsForView`, `proposal_items` by proposal id, page-through-all `.range`, explicit page input supported.
7. `src/screens/buyer/buyer.repo.ts` - `repoGetProposalItemLinks`, `proposal_items` by proposal ids, page-through-all `.range`, explicit page input supported.
8. `src/screens/buyer/buyer.repo.ts` - `repoGetRequestItemToRequestMap`, `request_items` by ids, page-through-all `.range`, explicit page input supported.
9. `src/screens/buyer/buyer.fetchers.ts` - `buyer_summary_inbox_scope_v1`, `p_limit` clamped to 100.
10. `src/screens/warehouse/warehouse.requests.read.canonical.ts` - `warehouse_issue_queue_scope_v4`, `p_limit` clamped to 100.

## Skipped

- `src/screens/contractor/contractor.resolvers.ts`: single-row `maybeSingle` resolver lookups, not list/search.
- `src/screens/warehouse/warehouse.issue.repo.ts`: write RPC boundary only.
- `src/screens/warehouse/warehouse.api.repo.ts`: report/export/detail reads excluded.
- `src/lib/api/integrity.guards.ts`: guard reads excluded.
- Warehouse stock calculations: watch target only; not changed.

## Safety

- Production touched: NO
- Staging touched: NO
- Writes: NO
- SQL/RPC/RLS/storage changed: NO
- Business logic changed: NO
- OTA/EAS/Play Market touched: NO

## Test Proof

Targeted tests added/extended:

- `tests/api/contractorDataHotspotPagination.test.ts`
- `tests/api/buyerRepoHotspotPagination.test.ts`
- `src/screens/buyer/buyer.fetchers.test.ts`
- `src/screens/warehouse/warehouse.requests.read.test.ts`
- `tests/api/hotspotListPaginationBatch7.contract.test.ts`

Required gates are recorded in the final task report.
