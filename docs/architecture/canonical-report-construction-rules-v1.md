# Canonical Report Construction Rules v1

## 1. Director

### Allowed fact sources by metric
- Finance metrics:
  - `accounting_invoices`
  - `accounting_payments`
  - optional reconciliation with approved procurement facts: `purchases`, `purchase_items`

- Procurement metrics:
  - `purchases`
  - `purchase_items`

- Stock/warehouse metrics:
  - `wh_ledger`
  - `wh_incoming`, `wh_incoming_items`
  - `warehouse_issues`, `warehouse_issue_items`

- Services/works totals:
  - `subcontracts` (+ `subcontract_items` when present)
  - approved procurement facts (`purchases`, `purchase_items`) where relevant

### Forbidden fact sources for Director final KPIs
- `requests`
- `request_items`
- `proposals`
- `proposal_items`
- `proposal_items_view`
- UI-derived caches/aggregates

### Debt computation
- Debt = payable obligation facts (`accounting_invoices`) minus payment facts (`accounting_payments`).
- Do not derive debt directly from proposal workflow rows.

### Purchase computation
- Count and amount strictly from approved purchase facts (`purchases`, `purchase_items`).

### Stock computation
- On-hand, incoming, issued from ledger/movement facts only (`wh_ledger` + warehouse movement headers/items).

### Service/work totals
- Use contract/procurement approval facts (`subcontracts`, `purchase_items` where scoped to service/work).

## 2. Buyer / supplier proposal screen

### request -> proposal mapping
- Proposal rows must be created from request rows with mandatory `proposal_items.request_item_id`.

### supplier/contractor input selection
- `material` -> supplier picker/input.
- `service` / `work` -> contractor picker/input.

### type rules
- Type must come from canonical typed field when available.
- If canonical field missing, temporary controlled resolver may use stable fallback fields (e.g. existing typed code fields), but migration to explicit DB type is required.

### mandatory fields by type
- material:
  - counterparty (supplier)
  - price
  - qty
- service/work:
  - counterparty (contractor)
  - price
  - qty/scope

## 3. Approval transition

### On director approve
- Workflow transition marks proposal approved.
- Procurement fact generation must be idempotent for each approved business line.

### Purchase row creation
- Each approved request-item should materialize to purchase facts once.

### Idempotency guarantees
- Required server-side guarantees:
  - unique business key per transition stage
  - retry-safe upsert semantics
  - duplicate write prevention for purchase/incoming/ledger facts

### Duplicate prevention rules
- No repeated creation on refresh/retry/re-open.
- Repeated approve calls for same proposal must be no-op after first successful materialization.

## 4. Warehouse transition

### Incoming -> stock
- `wh_incoming(_items)` materializes into `wh_ledger` incoming movements.

### Issue -> stock
- `warehouse_issues(_items)` materializes into `wh_ledger` outgoing movements.

### Stock source of truth
- Final stock quantities and movement analytics must come from `wh_ledger`-based facts.

## 5. Accounting transition

### Payable fact
- Becomes payable only after accounting obligation fact exists (`accounting_invoices`).

### Must not be counted as payable fact
- Requests/proposals and any preparation workflow rows before accounting obligation materialization.
