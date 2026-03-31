# Wave 5: DB/RPC Governance

## Intent

This wave does not delete legacy RPCs and does not change runtime behavior.
It introduces a governance baseline so future database work can distinguish:

- canonical RPC versions
- fallback-only RPC versions
- legacy/no-repo-caller RPC versions
- repeated full-body redeploy debt
- localized typing workarounds versus uncontrolled `as never` spread

## Canonical family decisions

### `director_finance_panel_scope_*`

- Canonical runtime version: `director_finance_panel_scope_v4`
- Active primary caller: `src/lib/api/directorFinanceScope.service.ts`
- Downstream consumers: `src/screens/director/useDirectorScreenController.ts`, `src/features/ai/assistantScopeContext.ts`
- Legacy retained:
  - `v3` kept as exported fetch helper plus payload compatibility parser support
  - `v2` kept for parity/reference surfaces
  - `v1` kept as legacy fetch helper only
- Governance rule: new panel scope versions require an explicit incompatibility note plus caller migration plan. Do not grow `v5` simply for incremental fixes.

### `director_finance_supplier_scope_*`

- Canonical runtime version: `director_finance_supplier_scope_v2`
- Active primary caller: `src/screens/director/director.finance.panel.ts`
- Legacy retained:
  - `v1` kept as exported compatibility fetch helper with no active repo caller
- Governance rule: supplier scope stays on `v2` until a real contract incompatibility is documented.

### `warehouse_issue_queue_scope_*`

- Product primary owner is no longer the RPC family. The primary runtime path is canonical request reads in `src/screens/warehouse/warehouse.requests.read.ts`.
- Canonical version inside the RPC family: `warehouse_issue_queue_scope_v4`
- Runtime role of the family today: compatibility fallback only
- Active fallback caller: `apiFetchReqHeadsCompatibilityRaw` in `src/screens/warehouse/warehouse.requests.read.ts`
- Legacy retained:
  - `v1`/`v2`/`v3` have no active repo callers
- Governance rule: keep `v4` as the only maintained compatibility RPC. Do not add `v5` unless canonical reads cannot cover an incompatible requirement.

### `warehouse_stock_scope_*`

- Canonical runtime version: `warehouse_stock_scope_v2`
- Active primary caller: `apiFetchStockRpcV2` via `apiFetchStock` in `src/screens/warehouse/warehouse.stockReports.service.ts`
- Active fallback: `warehouse_stock_scope_v1`
- Legacy retained:
  - `v1` still participates in runtime fallback
- Governance rule: `v1` cannot be deleted until `apiFetchStock` no longer falls back to it and proof shows no product regression.

## Migration discipline

### Repeated full-body redeploys

The `proposal_creation_boundary_v3` chain shows the debt pattern to stop:

- baseline function introduced once
- multiple follow-up migrations each re-declare the full `rpc_proposal_submit_v3` body
- grants/comments get replayed every time
- fixes are encoded in file names, but caller ownership and final canonical body are not documented next to the chain

### New standard

- No repeated full-body `create or replace function` redeploy migration unless the body truly must change and the reason is documented in the migration header.
- Every function-body redeploy must name:
  - target canonical function
  - exact incompatibility or bug being fixed
  - why a wrapper/grant-only migration is not enough
  - local proof command or artifact
- For a multi-step fix chain, add/update a chain inventory artifact in the same batch.
- If only grants/comments/search_path/owner change, do not ship a full-body redeploy.

## RPC version discipline

- No new RPC version unless there is an explicit contract incompatibility.
- Each RPC family must have a documented canonical version.
- Each fallback version must have:
  - an owner
  - a caller inventory
  - an exit condition
- `legacy/no active repo caller` is not the same as safe-to-delete. Deletion needs repo caller proof plus environment/runtime proof if external consumers are possible.
- When a product path moves away from an RPC family, record whether the family becomes:
  - fallback-only
  - deprecated-but-retained
  - deletion candidate pending proof

## Typed bypass discipline

- Preferred pattern: localized containment via `src/lib/api/queryBoundary.ts`.
- Direct `supabase.rpc(... as never, ... as never)` is temporary debt and must not spread without explanation.
- New RPC call sites should prefer one of:
  - generated typed RPC args/returns
  - localized boundary helper such as `runContainedRpc`
- High-value canonical mutations must not keep permanent direct `as never` casts without an owner note and a removal plan.
- `as any` in RPC call sites is not allowed. Current Wave 5 inventory found zero `supabase.rpc(... as any)` or `client.rpc(... as any)` call sites in `src`.

## Placeholder migration discipline

- `remote_history_placeholder.sql` files remain historical inventory, not cleanup targets in this wave.
- Do not delete placeholder migrations unless migration order/history policy is handled explicitly in a dedicated batch.
- New placeholder migrations should not be introduced for feature delivery.

## Exit-plan guidance for future cleanup

- First remove active fallback callers.
- Then prove no internal callers remain.
- Then, if needed, validate there are no external/runtime dependencies.
- Only after that can a legacy RPC be marked deletion-ready.
