# S-PAG-4 Remaining Top List Pagination Proof

## Dependency

S-PAG-4 started from clean `main` at S-PAG-3B commit `e0aca066970fab980e7d9990db484b8a97998634`.

Read before code changes:

- `artifacts/S_PAG_3A_top_list_pagination_matrix.json`
- `artifacts/S_PAG_3A_top_list_pagination_proof.md`
- `artifacts/S_PAG_3B_top_list_pagination_matrix.json`
- `artifacts/S_PAG_3B_top_list_pagination_proof.md`

S-PAG-3A and S-PAG-3B fixed call-sites were skipped and not reopened.

## Candidate Classification

Candidate call-sites reviewed before editing:

1. `src/features/supplierShowcase/supplierShowcase.data.ts` / `loadListingsByUserId` / `market_listings` / `FIX_NOW_LIST_QUERY`
2. `src/features/supplierShowcase/supplierShowcase.data.ts` / `loadListingsByCompanyId` / `market_listings` / `FIX_NOW_LIST_QUERY`
3. `src/components/map/CatalogSearchModal.tsx` / `runSearch` / `catalog_items` / `FIX_NOW_LIST_QUERY`
4. `src/features/ai/assistantActions.ts` / `searchMarketListings` / `market_listings` / `FIX_NOW_LIST_QUERY`
5. `src/lib/chat_api.ts` / `fetchListingChatMessages` / `chat_messages` / `FIX_NOW_LIST_QUERY`
6. `src/lib/catalog/catalog.transport.ts` / `loadCatalogSearchFallbackRows` / `rik_items` / `FIX_NOW_LIST_QUERY`
7. `src/lib/catalog/catalog.transport.ts` / `loadRikQuickSearchFallbackRows` / `rik_items` / `FIX_NOW_LIST_QUERY`

These were selected because they are top-list/search windows that were already bounded by `limit(...)`. S-PAG-4 converts them to stable ordering plus `range(...)` without introducing a new silent truncation point.

## Fixed Call-Sites

1. `src/features/supplierShowcase/supplierShowcase.data.ts` / `loadListingsByUserId`
   - Before: `market_listings.select(...).eq("user_id", userId).order("created_at", desc).limit(60)`
   - After: user/status filters preserved, `order("created_at", desc) + order("id", desc) + range(page.from, page.to)`
   - Why list query: supplier showcase listing window for one supplier user.

2. `src/features/supplierShowcase/supplierShowcase.data.ts` / `loadListingsByCompanyId`
   - Before: `market_listings.select(...).eq("company_id", companyId).order("created_at", desc).limit(60)`
   - After: company/status filters preserved, `order("created_at", desc) + order("id", desc) + range(page.from, page.to)`
   - Why list query: supplier showcase listing window for one company.

3. `src/components/map/CatalogSearchModal.tsx` / `runSearch`
   - Before: `catalog_items.select(...).limit(60)` with optional search and kind filters.
   - After: search/kind filters preserved, `order("rik_code", asc) + order("id", asc) + range(page.from, page.to)`
   - Why list query: catalog search result list in the map/catalog picker.

4. `src/features/ai/assistantActions.ts` / `searchMarketListings`
   - Before: active `market_listings` search candidate window ordered by `created_at` with `limit(120)`.
   - After: active filter preserved, `order("created_at", desc) + order("id", desc) + range(page.from, page.to)`
   - Why list query: AI market search candidate list before local relevance filtering.

5. `src/lib/chat_api.ts` / `fetchListingChatMessages`
   - Before: listing-scoped `chat_messages` list ordered by `created_at` with caller `limit`.
   - After: supplier/deleted filters preserved, `order("created_at", asc) + order("id", asc) + range(page.from, page.to)`
   - Why list query: listing chat message window.

6. `src/lib/catalog/catalog.transport.ts` / `loadCatalogSearchFallbackRows`
   - Before: fallback `rik_items` search with token filters, `limit(limit)`, and `order("rik_code")`.
   - After: token filters preserved, `order("rik_code", asc) + range(page.from, page.to)`
   - Why list query: catalog search fallback result list.

7. `src/lib/catalog/catalog.transport.ts` / `loadRikQuickSearchFallbackRows`
   - Before: quick fallback `rik_items` search with token filters, `limit(limit)`, and `order("rik_code")`.
   - After: token filters preserved, `order("rik_code", asc) + range(page.from, page.to)`
   - Why list query: RIK quick search fallback result list.

## Skipped Because Already Fixed In S-PAG-3A

- `src/lib/api/proposals.ts` / `listDirectorProposalsPending`
- `src/lib/api/buyer.ts` / `listBuyerProposalsByStatus`
- `src/screens/buyer/buyer.buckets.repo.ts` / `fetchBuyerProposalSummaryByStatuses`
- `src/screens/buyer/buyer.buckets.repo.ts` / `fetchBuyerRejectedProposalRows`
- `src/lib/api/director.ts` / `listPending`
- `src/screens/contractor/contractor.loadWorksService.ts` / `loadContractorWorksBundleLegacyInternal`

## Skipped Because Already Fixed In S-PAG-3B

- `src/screens/buyer/hooks/useBuyerCounterpartyRepo.ts` / `fetchBuyerContractorsBasic`
- `src/screens/buyer/hooks/useBuyerCounterpartyRepo.ts` / `fetchBuyerContractorsFallback`
- `src/screens/buyer/hooks/useBuyerCounterpartyRepo.ts` / `fetchBuyerSubcontracts`
- `src/screens/buyer/hooks/useBuyerCounterpartyRepo.ts` / `fetchBuyerProposalSuppliersBasic`
- `src/screens/buyer/hooks/useBuyerCounterpartyRepo.ts` / `fetchBuyerProposalSuppliersFallback`
- `src/lib/api/notifications.ts` / `notifList`

## Intentionally Not Touched

- `src/lib/api/pdf_proposal.ts`: `INTENTIONAL_PDF_REPORT_EXPORT`.
- `src/lib/pdf/pdf.builder.ts`: `INTENTIONAL_PDF_REPORT_EXPORT`.
- `src/screens/warehouse/warehouse.api.repo.ts` / `fetchWarehouseIncomingLedgerRows`: `INTENTIONAL_PDF_REPORT_EXPORT`.
- `src/screens/warehouse/warehouse.api.repo.ts` / `fetchWarehouseIncomingLineRows`: `INTENTIONAL_DETAIL_BY_PARENT`.
- `src/lib/api/proposals.ts` / `proposalItems`: `INTENTIONAL_DETAIL_BY_PARENT`.

## Needs Separate UI Work

- `src/screens/director/director.repository.ts` / `fetchDirectorPendingRows`: main director request rows need explicit UI pagination state before capping.
- `src/components/map/useMapListingsQuery.ts` / `fetchMapListings`: map needs viewport/server pagination before reducing the broad point set.
- `src/features/auctions/auctions.data.ts` / `loadAuctionSummaries`: auction tab needs page/load-more state before changing the query window.
- `src/lib/catalog/catalog.lookup.service.ts` / `listUnifiedCounterparties`: merged counterparty picker filters after combining several sources, so source completeness needs UI/search pagination work before reducing.

## Unknown Do Not Touch

- `src/features/market/marketHome.data.ts` / `loadMarketHomePayload`: legacy market home loader appears superseded by the paged marketplace service and was left unchanged to avoid altering dormant compatibility behavior.

## Tests Run

- `git diff --check` PASS
- `npm test -- --runInBand topListPaginationBatch3` PASS
- `npm test -- --runInBand topListPaginationBatch3 catalog market chat supplierShowcase` PASS
- `npx tsc --noEmit --pretty false` PASS
- `npx expo lint` PASS

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
