# Wave 10: Catalog Search Compat Hardening

## What changed
- `src/lib/api/rik.ts` is now a thin compat boundary that keeps the old `rikQuickSearch(q, limit = 50, apps?)` contract but routes active callers through the canonical catalog search service.
- `src/lib/catalog/catalog.search.service.ts` now accepts the optional `apps` argument for `rikQuickSearch`, clamps limit safely, and keeps one-character query compatibility for legacy callers.

## What did not change
- No request/proposal business logic.
- No UI flow or modal behavior.
- No RPC payload/schema changes.
- No offline/auth semantics.

## Why this is a real improvement
- The active legacy search shim no longer carries its own silent `catch {}` fallback chain.
- Fallback/error ownership now stays in the canonical catalog service where observability already exists.
- Existing callers keep the same compat signature and default limit.

## Proof
- `node node_modules/typescript/bin/tsc --noEmit --pretty false`
- `node node_modules/jest/bin/jest.js src/lib/catalog/catalog.search.service.test.ts src/lib/api/rik.test.ts --runInBand --json --outputFile artifacts/wave10-catalog-search-jest.json`

## Result
- `GREEN`
