## DB Idempotency Conflict Audit v1

### Scope
- Runtime read-only audit from production-like surface via service-role.
- Source artifact: `diagnostics/db_idempotency_runtime_audit.json`.
- Date: 2026-03-10.

### Checked conflict vectors
1. `purchases` duplicates by `proposal_id`.
2. `wh_incoming` duplicates by `purchase_id`.
3. `purchase_items` duplicates by candidate source mapping:
  - current fallback: `(purchase_id, request_item_id)`.
  - optional future canonical: `source_proposal_item_id` (column currently missing).
4. `wh_ledger` source identity duplicates:
  - canonical `(source_type, source_id)` cannot be checked because columns are missing.
  - fallback proxy checked where possible.

### Results (current snapshot)
- `purchases_by_proposal_id`:
  - total rows scanned: `1`
  - duplicate groups: `0`
- `wh_incoming_by_purchase_id`:
  - total rows scanned: `1`
  - duplicate groups: `0`
- `purchase_items_by_request_item_id`:
  - total rows scanned: `2`
  - duplicate groups: `0`
- `purchase_items_by_purchase_request_item`:
  - total rows scanned: `2`
  - duplicate groups: `0`

### Schema gaps discovered during audit
- `purchase_items.proposal_item_id` is not present.
- `wh_ledger.source_type` is not present.
- `wh_ledger.source_id` is not present.

### Backfill / cleanup need
- Immediate duplicate cleanup is **not required** for currently scanned rows.
- Backfill is required before strict canonical constraints:
  - `purchase_items.source_proposal_item_id` (new additive mapping column).
  - `wh_ledger.source_type/source_id` (new additive source identity columns).

### Risk note
- Current zero-duplicate result reflects existing sample volume and current data state.
- Strict guarantee is still impossible without:
  - additive columns,
  - unique indexes/constraints,
  - RPC idempotent contract alignment.

