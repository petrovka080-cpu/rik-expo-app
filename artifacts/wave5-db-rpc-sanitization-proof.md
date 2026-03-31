# Wave 5 Proof

## Scope

- Inventory only
- Governance only
- No product runtime semantics changed
- No RPC deleted
- No fallback chain removed

## Read-current-code-first commands

```powershell
rg -n "director_finance_panel_scope_v|director_finance_supplier_scope_v|warehouse_issue_queue_scope_v|warehouse_stock_scope_v|proposal_creation_boundary_v3" -S src supabase docs
rg -n "supabase\\.rpc\\([^\\n]*(as never|as any)|\\.rpc\\([^\\n\\r]*\\)" -S src | rg -n "as never|as any"
Get-ChildItem supabase\\migrations\\*proposal_creation_boundary_v3*.sql
Get-ChildItem supabase\\migrations\\*placeholder*.sql
```

## Main findings

- `director_finance_panel_scope_*`
  - Canonical runtime version is `v4`
  - `v1`/`v2`/`v3` remain in repo as legacy fetchers, parity references, or payload compatibility
- `director_finance_supplier_scope_*`
  - Canonical runtime version is `v2`
  - `v1` has no active repo caller
- `warehouse_issue_queue_scope_*`
  - The product primary owner moved off the RPC family to canonical request reads
  - `v4` survives as compatibility fallback only
  - `v1`/`v2`/`v3` have no active repo callers
- `warehouse_stock_scope_*`
  - Canonical runtime version is `v2`
  - `v1` is still an active fallback
- `proposal_creation_boundary_v3`
  - One baseline migration followed by eight repeated full-body redeploy migrations
- Typed bypasses
  - Direct RPC `as never` casts still exist in high-value canonical and legacy compatibility paths
  - No direct RPC `as any` call sites were found in `src`
  - `runContainedRpc` already exists and should be the preferred containment pattern
- Placeholder history
  - Nine `remote_history_placeholder.sql` migrations remain in inventory and are intentionally not deleted in this wave

## Artifacts created

- `artifacts/wave5-rpc-family-matrix.json`
- `artifacts/wave5-migration-chain-matrix.json`
- `artifacts/wave5-typed-bypass-inventory.json`
- `docs/architecture/db-rpc-governance-wave5.md`

## Why this is production-safe

- Product code paths were not rewritten
- RPC meaning and payload contracts were not changed
- Fallback behavior was not changed
- The wave introduces ownership, canonical/fallback classification, and governance only
