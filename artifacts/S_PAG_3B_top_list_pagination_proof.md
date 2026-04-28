# S-PAG-3B Top List Pagination Proof

## Dependency

S-PAG-3B started from clean `main` at S-PAG-3A commit `58546ebcc6bd9507535a7ab316752dd3c60205ba`.

Read before code changes:

- `artifacts/S_PAG_3A_top_list_pagination_matrix.json`
- `artifacts/S_PAG_3A_top_list_pagination_proof.md`

S-PAG-3A fixed call-sites were skipped and not reopened.

## Fixed Call-Sites

1. `src/screens/buyer/hooks/useBuyerCounterpartyRepo.ts` / `fetchBuyerContractorsBasic`
   - Before: `contractors.select(id,company_name,phone,inn).order(company_name)` without a range window.
   - After: `order(company_name, asc) + order(id, asc) + range(page.from, page.to)`.
   - Why list query: buyer counterparty contractor suggestion list.

2. `src/screens/buyer/hooks/useBuyerCounterpartyRepo.ts` / `fetchBuyerContractorsFallback`
   - Before: fallback `contractors.select(...).limit(3000)`.
   - After: `order(company_name, asc) + order(id, asc) + range(page.from, page.to)`.
   - Why list query: fallback buyer counterparty contractor suggestion list.

3. `src/screens/buyer/hooks/useBuyerCounterpartyRepo.ts` / `fetchBuyerSubcontracts`
   - Before: `subcontracts.select(...).limit(2000)`.
   - After: `order(contractor_org, asc) + order(id, asc) + range(page.from, page.to)`.
   - Why list query: buyer counterparty suggestions sourced from subcontract heads.

4. `src/screens/buyer/hooks/useBuyerCounterpartyRepo.ts` / `fetchBuyerProposalSuppliersBasic`
   - Before: `proposal_items.select(supplier).not(supplier, is, null).limit(3000)`.
   - After: supplier filter preserved, `order(supplier, asc) + order(id, asc) + range(page.from, page.to)`.
   - Why list query: buyer supplier suggestion list sourced from proposal items.

5. `src/screens/buyer/hooks/useBuyerCounterpartyRepo.ts` / `fetchBuyerProposalSuppliersFallback`
   - Before: fallback `proposal_items.select(supplier,supplier_name,company_name).limit(3000)`.
   - After: `order(supplier, asc) + order(id, asc) + range(page.from, page.to)`.
   - Why list query: fallback buyer supplier suggestion list.

6. `src/lib/api/notifications.ts` / `notifList`
   - Before: role-scoped `notifications` list ordered by `created_at` with `.limit(...)`.
   - After: role filter preserved, `order(created_at, desc) + order(id, desc) + range(page.from, page.to)`.
   - Why list query: notification inbox list by app role.

## Pagination Helper

Reused the S-PAG-3A helper from `src/lib/api/_core.ts`.

Defaults used:

- buyer counterparty suggestions: 100 rows / max 100
- notifications: caller-provided `limit` normalized as page size, default 20 / max 100

## Skipped Because Already Fixed In S-PAG-3A

- `src/lib/api/proposals.ts` / `listDirectorProposalsPending`
- `src/lib/api/buyer.ts` / `listBuyerProposalsByStatus`
- `src/screens/buyer/buyer.buckets.repo.ts` / `fetchBuyerProposalSummaryByStatuses`
- `src/screens/buyer/buyer.buckets.repo.ts` / `fetchBuyerRejectedProposalRows`
- `src/lib/api/director.ts` / `listPending`
- `src/screens/contractor/contractor.loadWorksService.ts` / `loadContractorWorksBundleLegacyInternal`

## Intentionally Not Touched

- `src/lib/api/pdf_proposal.ts`: `INTENTIONAL_PDF_REPORT_EXPORT`.
- `src/lib/pdf/pdf.builder.ts`: `INTENTIONAL_PDF_REPORT_EXPORT`.
- `src/screens/warehouse/warehouse.api.repo.ts` / `fetchWarehouseIncomingLedgerRows`: `INTENTIONAL_PDF_REPORT_EXPORT`.
- `src/screens/warehouse/warehouse.api.repo.ts` / `fetchWarehouseIncomingLineRows`: `INTENTIONAL_DETAIL_BY_PARENT`.
- `src/lib/api/proposals.ts` / `proposalItems`: `INTENTIONAL_DETAIL_BY_PARENT`.
- `src/screens/director/director.repository.ts` / `fetchDirectorPendingRows`: `NEEDS_SEPARATE_UI_WORK`.
- `src/components/map/useMapListingsQuery.ts` / `fetchMapListings`: `NEEDS_SEPARATE_UI_WORK`.
- `src/features/auctions/auctions.data.ts` / `loadAuctionSummaries`: `NEEDS_SEPARATE_UI_WORK`.

## Tests Run

- `git diff --check` PASS
- `npm test -- --runInBand buyerCounterpartyPagination topListPaginationBatch2` PASS
- `npx tsc --noEmit --pretty false` PASS

Full gates are run after this proof is created and recorded in the final status.

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
