# S-BUYER-INBOX-FULL-SCAN-SAFE-ROUTING-1 Proof

Final status: `GREEN_BUYER_INBOX_FULL_SCAN_SAFE_ROUTING_RELEASE_INTEGRATED`

## Scope

This wave closes the buyer inbox compatibility full scan in `src/screens/buyer/buyer.fetchers.ts`.

The existing path already used the typed `buyer_summary_inbox_scope_v1` RPC window contract with:

- `p_offset`
- `p_limit`
- `p_search`
- `p_company_id`
- validated rows envelope
- bounded per-window rows

The remaining risk was the compatibility full scan loop in `loadBuyerInboxData`, which kept requesting windows until `hasMore=false` without a total group or page ceiling.

## Contract

The full scan is now bounded by:

- group page size: 100
- max groups: 5000
- max pages: 50

If the RPC reports more groups than the ceiling or keeps `hasMore=true` past the max page count, the function throws. It does not silently truncate and does not downgrade the full scan into a preview.

The window contract and output shape are preserved for within-ceiling results:

- rows
- requestIds
- meta
- sourceMeta

Window mapping is unchanged:

- offset -> `p_offset`
- limit -> `p_limit`
- search -> `p_search`
- company scope remains `p_company_id: null`

## Gates

- Targeted Jest:
  - `src/screens/buyer/buyer.fetchers.test.ts`
  - `tests/api/buyerInboxFullScanSafeRouting.contract.test.ts`
  - `tests/load/sLoadFix1Hotspots.contract.test.ts`
  - `tests/load/sLoadFix2Hotspots.contract.test.ts`
- Typecheck: passed
- Lint: passed
- `git diff --check`: passed
- Artifact JSON parse: passed
- `release:verify -- --json`: pass after integration

## Safety

No production DB writes, migrations, deploy, redeploy, Render env writes, BFF traffic changes, business endpoint calls, temporary hooks, temporary scripts, or temporary endpoints were performed. No raw DB rows, raw business rows, raw payloads, secrets, tokens, env values, or service URLs are included in this artifact.
