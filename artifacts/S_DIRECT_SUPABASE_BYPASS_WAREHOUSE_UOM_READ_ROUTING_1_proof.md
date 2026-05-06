# S-DIRECT-SUPABASE-BYPASS-WAREHOUSE-UOM-READ-ROUTING-1 Proof

Final status: `GREEN_DIRECT_SUPABASE_BYPASS_WAREHOUSE_UOM_READS_ROUTED_RELEASE_INTEGRATED`

## Scope

- Routed two warehouse UOM single-row reads through the permanent `warehouse_api_read_scope_v1` BFF-aware boundary.
- Moved direct Supabase compatibility fallback out of `warehouse.uom.repo.ts` into `warehouse.uom.repo.transport.ts`.
- Preserved the existing cache wrapper, return shape, null behavior, and error message shape.

## Contract

- `warehouse.api.uom.material_unit`: read-only single-row lookup from `rik_materials` by material code.
- `warehouse.api.uom.code`: read-only single-row lookup from `rik_uoms` by unit id.
- Response envelope: existing `WarehouseApiBffEnvelope` with `kind: "single"`.
- Traffic: disabled by default; no production traffic or runtime percentage changed.

## Gates So Far

- `npx tsc --noEmit --pretty false`: PASS
- `npx expo lint`: PASS
- Targeted Warehouse BFF/UOM contract tests: PASS
- `git diff --check`: PASS
- Pre-push `release:verify -- --json`: all gates PASS; readiness blocked only by local ahead before approved push.

## Safety

- No production DB writes.
- No migrations.
- No deploy or redeploy.
- No Render env writes.
- No BFF traffic changes.
- No business endpoint calls.
- No raw payloads, raw DB rows, or business rows printed.
