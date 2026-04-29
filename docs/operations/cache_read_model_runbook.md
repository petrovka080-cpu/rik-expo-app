# Cache Read Model Runbook

## Current State

S-50K-CACHE-INTEGRATION-1 is disabled by default. It provides cache adapters, route policies, key safety, and invalidation metadata only.

Do not enable this boundary in mobile runtime. Do not replace existing Supabase client flows in this wave.

## Safe Defaults

- `NoopCacheAdapter` is the default operational adapter.
- `InMemoryCacheAdapter` is for tests and local proof only.
- `ExternalCacheAdapterContract` has no Redis/CDN implementation yet.
- All policies have `defaultEnabled: false`.
- Invalidation execution is disabled by default.

## Operator Checks Before Future Enablement

1. Confirm the BFF server boundary is deployed outside the mobile app.
2. Confirm read routes have cache policies.
3. Confirm keys reject raw email, phone, address, token, JWT, and signed URL values.
4. Confirm external cache credentials are server-only.
5. Confirm payment and stock policies keep conservative TTLs.
6. Confirm invalidation tags are mapped before enabling live cache writes.
7. Run full gates and shadow parity before routing traffic.

## Redis/CDN Plug-In Plan

Future adapter work should implement the existing `CacheAdapter` contract without changing app runtime:

- `get`
- `set`
- `delete`
- `invalidateByTag`
- `getStatus`

The adapter must not print connection strings, tokens, URLs with credentials, or raw cached payloads.

## Disable Strategy

Switch the server to `NoopCacheAdapter` and leave all policies disabled. Existing app flows still read Supabase directly, so rollback does not require mobile client migration.
