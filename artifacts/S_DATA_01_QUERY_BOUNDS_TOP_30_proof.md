# S_DATA_01_QUERY_BOUNDS_TOP_30 Proof

final_status: GREEN_QUERY_BOUNDS_TOP_30_REDUCED

## Scope

Resolved the top 30 query-bound items from the supplied 92 potentially unbounded select audit bucket. This wave made code changes only where the safe shape was clear: assistant market by-id fallback reads for companies and user profiles.

## Selected Files

- src/features/ai/assistantActions.transport.ts
- docs/architecture/transport_ownership_map.md
- tests/api/queryBoundsTop30.contract.test.ts
- artifacts/S_DATA_01_QUERY_BOUNDS_TOP_30_inventory_delta.json
- artifacts/S_DATA_01_QUERY_BOUNDS_TOP_30_matrix.json
- artifacts/S_DATA_01_QUERY_BOUNDS_TOP_30_proof.md

Classified reference files:

- src/lib/api/buyer.ts
- src/features/auctions/auctions.data.ts
- src/components/foreman/useCalcFields.ts
- src/components/map/CatalogSearchModal.tsx
- src/lib/api/requestCanonical.read.ts
- src/lib/api/proposalAttachments.service.ts
- src/lib/api/proposals.ts

## Reason Selected

The selection covers the user-priority files plus scanner-listed broad reads (`select("*")`) and request/proposal item reads. Most priority call sites were already protected by existing range, limit, page-through ceiling, or single-scope semantics. The two assistant by-id fallback reads were true residual risk and now use explicit reference ceilings.

## Before/After Metrics

- Potentially unbounded selects from audit: 92 -> 62 unresolved after top-30 resolution
- Selected call sites: 30
- Fixed in code: 2
- Classified as already safe/false-positive/single-scope: 28
- DB writes/migrations/production calls: 0

## Fixes

- `loadAssistantCompanyRowsByIds`: normalized/deduped ids, enforces maxRows 5000, adds stable `id` ordering, wraps Supabase fallback in `loadPagedRowsWithCeiling`.
- `loadAssistantProfileRowsByUserIds`: normalized/deduped ids, enforces maxRows 5000, adds stable `user_id` ordering, wraps Supabase fallback in `loadPagedRowsWithCeiling`.

## Query-Shape Proof

- Buyer broad reads are page-through via `loadPagedBuyerApiRows`.
- Auctions summary reads have `limit(120)` and child reads use `loadPagedAuctionRows`.
- `useCalcFields` dictionary rows use `loadPagedRowsWithCeiling`; the family lookup is single-scope `maybeSingle`.
- Catalog modal delegates to bounded catalog transport.
- Request/proposal item broad reads are already behind page-through helpers with stable ordering and ceilings.
- New focused contract test verifies the top-30 inventory and source-level query shapes.

## Gates

- focused tests: PASS
  - npm test -- --runInBand tests/api/queryBoundsTop30.contract.test.ts tests/api/topListPaginationBatch3.contract.test.ts tests/api/riskClassifiedRemainingSelectsBatch9.contract.test.ts src/features/ai/assistantActions.fanout.test.ts tests/api/assistantStoreBffRouting.contract.test.ts tests/scale/assistantStoreBffReadonlyDbPort.test.ts
  - 6 suites passed, 24 tests passed
- TypeScript: PASS (`npx tsc --noEmit --pretty false`)
- lint: PASS (`npx expo lint`)
- full Jest: PASS (`685` suites passed, `1` skipped; `4049` tests passed, `1` skipped)
- architecture scanner: PASS (`serviceBypassFindings=0`, `transportControlledFindings=173`, `totalFindings=220`)
- git diff check: PASS
- artifact JSON parse: PASS
- post-push release verify: PASS (`npm run release:verify -- --json`)

## Negative Confirmations

- No production calls.
- No DB writes.
- No migrations.
- No Supabase project changes.
- No destructive or unbounded DML.
- No force push.
- No tags.
- No secrets printed.
- No new TypeScript ignore comments.
- No new unsafe any casts.
- No empty catch.
- No broad rewrite.
- No cache enablement.
- No rate-limit changes.
- No Realtime load.
- No OTA/EAS/TestFlight/native builds.

Supabase Realtime status: WAITING_FOR_SUPABASE_SUPPORT_RESPONSE
