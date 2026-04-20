# P3-A.1 Boundary Map

## Baseline

- `main` and `origin/main` both point to `0c6eaa4`.
- Worktree was clean before P3-A started.
- N1.SEC1 was already GREEN and OTA was published to development, preview, and production.
- P1-A, P1-C, P2-A, P2-B, P2-C, and N1.SEC1 were not reopened.

## Canonical Source

- `src/lib/database.types.ts` remains the only generated database schema source.
- New domain contracts use `import type` from the canonical generated file through `src/types/contracts/shared.ts`.
- No SQL, migration, RPC semantics, runtime fallback, or business logic changed.

## Domain Boundaries

### Shared

- File: `src/types/contracts/shared.ts`
- Owns generic derived helpers:
  - `AppDatabase`
  - `AppSupabaseClient`
  - `DbJson`
  - `PublicTableRow`
  - `PublicTableInsert`
  - `PublicTableUpdate`
  - `PublicViewRow`
  - `PublicFunctionArgs`
  - `PublicFunctionReturns`

This keeps generated schema indexing in one DB-adjacent type boundary.

### Director

- File: `src/types/contracts/director.ts`
- First slice:
  - finance RPC args
  - pending proposal scope RPC args/returns
  - director-owned request/request item row aliases

Chosen because `director.finance.rpc.ts` had repeated deep indexed access into the generated `Functions` map and is an RPC-heavy hot path.

### Warehouse

- File: `src/types/contracts/warehouse.ts`
- First slice:
  - warehouse issue atomic RPC args/returns
  - issue line payload shapes already used at the warehouse boundary
  - warehouse Supabase client alias

Chosen because issue atomic RPC calls are a stable warehouse write boundary.

### Foreman

- File: `src/types/contracts/foreman.ts`
- First slice:
  - request row/update aliases
  - request item row alias
  - reference dictionary row aliases

Chosen because request metadata and dictionary reads are stable foreman read/write contracts.

### Catalog

- File: `src/types/contracts/catalog.ts`
- First slice:
  - supplier/counterparty/read-model rows
  - request/request item update aliases
  - catalog request RPC args
  - `CatalogRikItemRow` derived from the canonical `rik_items` view row

Chosen because catalog request service and catalog types previously mixed table, view, and RPC indexed access in hot request flows.

## First Usage Slice

The first extraction slice moved these files off direct generated-type imports:

- `src/lib/api/_core.ts`
- `src/lib/catalog/catalog.request.service.ts`
- `src/lib/catalog/catalog.types.ts`
- `src/lib/dbContract.types.ts`
- `src/screens/director/director.finance.rpc.ts`
- `src/screens/director/director.proposals.repo.ts`
- `src/screens/director/director.repository.ts`
- `src/screens/foreman/foreman.dicts.repo.ts`
- `src/screens/foreman/foreman.requests.ts`
- `src/screens/warehouse/warehouse.issue.repo.ts`

## Why This Improves Scaling

- Hot files no longer repeat deep `Database["public"][...]` indexing.
- Generated schema churn is absorbed by domain entrypoints.
- Ownership is clearer: Director, Warehouse, Foreman, Catalog, and Shared contracts can evolve independently.
- The app still has one canonical schema source; the new files are derived type boundaries, not copied schema.

## Deferred On Purpose

- Buyer, Contractor, Accountant, PDF, Market, and Subcontracts direct imports remain outside this first slice.
- No broad import sweep was done.
- No generated type file rewrite was done.
