# S-PAG-3A Top List Pagination Proof

## Scope

S-PAG-3A fixed a small batch of high-volume list query call-sites only. No production access, SQL, RPC, RLS, storage, package, native, release, OTA, EAS build, or EAS submit actions were used.

## Fixed Call-Sites

1. `src/lib/api/proposals.ts` / `listDirectorProposalsPending`
   - Before: `proposals.select(...).not(...).is(...).order("submitted_at")`
   - After: `order("submitted_at", desc) + order("id", desc) + range(page.from, page.to)`
   - Why list query: pending proposal head list for director workflows.

2. `src/lib/api/buyer.ts` / `listBuyerProposalsByStatus`
   - Before: `proposals.select(...).eq("status", status).order("submitted_at")`
   - After: `order("submitted_at", desc) + order("id", desc) + range(page.from, page.to)`
   - Why list query: buyer proposal status list.

3. `src/screens/buyer/buyer.buckets.repo.ts` / `fetchBuyerProposalSummaryByStatuses`
   - Before: `v_proposals_summary.select(...).in("status", statuses).gt("items_cnt", 0).order("submitted_at")`
   - After: `order("submitted_at", desc) + order("proposal_id", desc) + range(page.from, page.to)`
   - Why list query: buyer bucket proposal summary list.

4. `src/screens/buyer/buyer.buckets.repo.ts` / `fetchBuyerRejectedProposalRows`
   - Before: `proposals.select(...).ilike("payment_status", ...).order("submitted_at").order("created_at")`
   - After: `order("submitted_at", desc) + order("created_at", desc) + order("id", desc) + range(page.from, page.to)`
   - Why list query: rejected/rework proposal list.

5. `src/lib/api/director.ts` / `listPending`
   - Before: legacy fallback `requests.select("id, id_old").eq("status", pending)`
   - After: `order("id", asc) + range(page.from, page.to)`
   - Why list query: legacy pending request head list fallback.

6. `src/screens/contractor/contractor.loadWorksService.ts` / `loadContractorWorksBundleLegacyInternal`
   - Before: legacy `v_works_fact.select("*").order("created_at", desc)`
   - After: `order("created_at", desc) + order("progress_id", desc) + range(page.from, page.to)`
   - Why list query: legacy contractor works/history list fallback.

## Pagination Helper

Added the shared helper to existing API core module `src/lib/api/_core.ts`:

- default page size support
- max page size clamp
- non-negative page index
- deterministic `{ from, to }` boundaries

Defaults used:

- 50 rows / max 100 for proposal, buyer, and director list APIs
- 100 rows / max 100 for contractor legacy works fallback

## Intentionally Not Touched

- `src/lib/api/pdf_proposal.ts`: PDF source completeness must remain uncapped.
- `src/lib/pdf/pdf.builder.ts`: request PDF builder completeness must remain uncapped.
- `src/screens/warehouse/warehouse.api.repo.ts` / `fetchWarehouseIncomingLedgerRows`: report aggregation needs complete ledger rows for selected dates.
- `src/screens/warehouse/warehouse.api.repo.ts` / `fetchWarehouseIncomingLineRows`: detail-by-parent read for one incoming document.
- `src/lib/api/proposals.ts` / `proposalItems`: detail-by-parent proposal item reads.
- `src/screens/director/director.repository.ts` / `fetchDirectorPendingRows`: `NEEDS_SEPARATE_UI_WORK`; main director request rows need explicit UI pagination state before capping.

## Tests Run

- `git diff --check` PASS
- `npm test -- --runInBand pagination` PASS
- `npm test -- --runInBand buyerBucketsPagination topListPagination` PASS
- `npm test -- --runInBand contractor.loadWorksService` PASS
- `npx tsc --noEmit --pretty false` PASS
- `npx expo lint` PASS
- `npm test -- --runInBand` PASS
- `npm test` PASS
- `npm run release:verify -- --json` PRE-COMMIT PARTIAL: internal gates PASS (`tsc`, `expo-lint`, `jest --runInBand`, `jest`, `git diff --check`); readiness blocked only because the worktree was intentionally dirty before commit.

Post-commit `release:verify` is run after this artifact is committed and recorded in the final status.

## Safety Confirmations

- PDF/report/export capped: NO
- Detail full reads changed: NO
- Business rules changed: NO
- App/native/package/release config changed: NO
- SQL/RPC/RLS/storage changed: NO
- Production touched: NO
- Production writes: NO
- Secrets committed: NO
- OTA published: NO
- EAS build triggered: NO
- EAS submit triggered: NO
