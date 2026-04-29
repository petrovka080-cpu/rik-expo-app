# 50K Cache Integration Boundary

S-50K-CACHE-INTEGRATION-1 adds a disabled server-side read-model cache boundary for future BFF read routes.

## Why 50K Needs Cache

At 50K+ users, repeated direct reads against the same Supabase list and dashboard surfaces become one of the main pressure sources. The cache boundary prepares server-side read-model caching for BFF routes without changing app traffic, deploying Redis/CDN, or enabling cache execution.

## Default State

- Cache enabled by default: NO.
- App runtime cache enabled: NO.
- Existing Supabase client flows replaced: NO.
- External Redis/CDN calls: NO.
- Production/staging access: NO.

## Policy Table

| Route | TTL | Stale window | Default | Notes |
| --- | ---: | ---: | --- | --- |
| `request.proposal.list` | 60s | 120s | disabled | proposal/request list pressure |
| `marketplace.catalog.search` | 120s | 300s | disabled | catalog search is cache-friendly |
| `warehouse.ledger.list` | 30s | 30s | disabled | freshness-sensitive warehouse data |
| `accountant.invoice.list` | 15s | 15s | disabled | finance-sensitive, conservative TTL |
| `director.pending.list` | 45s | 60s | disabled | approval dashboard pressure |
| `warehouse.issue.queue` | 20s | 20s | disabled | S-LOAD hotspot, needs DB/RPC wave before live enablement |
| `buyer.summary.inbox` | 30s | 30s | disabled | S-LOAD hotspot, needs DB/RPC wave before live enablement |
| `warehouse.stock.page` | 5s | 0s | disabled | S-LOAD watch target, freshness proof required |

## Key Safety

Cache keys are deterministic and bounded. Raw emails, phones, addresses, tokens, JWTs, signed URL values, and secret-like fields are rejected before key creation. Sensitive identifiers are represented only through stable hashes.

## Invalidation Mapping

Mutation operations map to tags only. Invalidation execution remains disabled by default.

- `proposal.submit`: proposal/request/director/buyer inbox tags
- `warehouse.receive.apply`: warehouse/stock/ledger tags
- `accountant.payment.apply`: accountant/invoice/payment/director tags
- `director.approval.apply`: director/approval/proposal/request tags
- `request.item.update`: request/proposal/buyer summary tags
- `notification.fanout`: notification/inbox tags

## Future Redis/CDN Adapter

The current `ExternalCacheAdapterContract` is interface-only. A later owner-approved wave can implement Redis/CDN using the same methods: `get`, `set`, `delete`, `invalidateByTag`, and `getStatus`.

## Rollback

Keep all policy `defaultEnabled` values false. If a future cache adapter is enabled and needs rollback, switch the server boundary back to `NoopCacheAdapter` and leave app Supabase flows unchanged.
