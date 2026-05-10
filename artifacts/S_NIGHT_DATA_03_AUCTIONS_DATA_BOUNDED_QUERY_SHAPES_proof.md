# S_NIGHT_DATA_03_AUCTIONS_DATA_BOUNDED_QUERY_SHAPES

final_status: GREEN_AUCTIONS_DATA_BOUNDED_QUERY_SHAPES
generated_at: 2026-05-10T16:31:00.000Z

## Selection

Selected file: `src/features/auctions/auctions.data.ts`

Reason selected: user requested WAVE 03 for the audit risk around all tender items and all auction rows. The file has six Supabase select calls across list, detail/status lookup, and tender-item child reads.

## Query Classification

| function | table | type | bounded proof |
| --- | --- | --- | --- |
| loadAuctionSummaries | tenders | list | `limit(AUCTION_LIST_PAGE_SIZE)`, `order(created_at desc)`, `order(id desc)` |
| loadAuctionSummaries | tender_items | tender items | `normalizeAuctionTenderIds`, `in(tender_id, tenderIds)`, `loadPagedRowsWithCeiling` maxRows 5000 |
| loadAuctionSummaries | auctions | list | `limit(AUCTION_LIST_PAGE_SIZE)`, `order(created_at desc)`, `order(id desc)` |
| loadAuctionDetail | tenders | detail/status lookup | `eq(id, id).maybeSingle()` |
| loadAuctionDetail | tender_items | tender items | `eq(tender_id, id)`, `loadPagedRowsWithCeiling` maxRows 5000 |
| loadAuctionDetail | auctions | detail/status lookup | `eq(id, id).maybeSingle()` |
| none | none | aggregation | no aggregation select exists in `auctions.data.ts` |

## Metrics

| metric | before | after | delta |
| --- | ---: | ---: | ---: |
| global unresolved unbounded selects | 0 | 0 | 0 |
| global select("*") count | 28 | 28 | 0 |
| auctions.data.ts select calls | 6 | 6 | 0 |
| auctions.data.ts unbounded list selects | 0 | 0 | 0 |
| auctions list stable order proof | false | true | true |
| tender-id input ceiling proof | false | true | true |

## Gates

- focused tests: PASS
- existing auction-related contracts: PASS
- `npx tsc --noEmit --pretty false`: PASS
- `npx expo lint`: PASS
- `npm test -- --runInBand`: PASS
- architecture scanner: PASS, serviceBypassFindings=0
- `git diff --check`: PASS
- artifact JSON parse: PASS
- post-push release verify: pending_post_push

## Negative Confirmations

- no force push
- no tags
- no secrets printed
- no `@ts-ignore`
- no `as any`
- no `catch {}`
- no broad rewrite
- no Supabase project changes
- no spend cap changes
- no Realtime 50K/60K load
- no destructive/unbounded DML
- no OTA/EAS/TestFlight/native builds
- no production mutation broad enablement
- no broad cache enablement
- no broad rate-limit enablement
- no DB writes
- no migrations

## Supabase Realtime

WAITING_FOR_SUPABASE_SUPPORT_RESPONSE
