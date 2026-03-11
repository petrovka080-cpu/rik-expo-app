## DB Idempotency Enforcement Plan v1

### Current gaps
- `purchases.proposal_id`: column exists, but DB-level uniqueness is not confirmed from migrations in repo.
- `purchase_items.proposal_item_id`: column is missing in runtime surface; canonical line mapping by proposal line is not enforceable yet.
- `wh_incoming.purchase_id`: column exists, but DB-level uniqueness is not confirmed from migrations in repo.
- `wh_ledger.source_type/source_id`: columns are missing; source-event idempotency is not enforceable yet.
- RPC SQL bodies (`director_approve_min_auto`, `ensure_purchase_and_incoming_strict`, `proposal_send_to_accountant_min`, `work_seed_from_purchase`) are not present in tracked migrations, so retry-safety cannot be proven from code.

### Runtime audit snapshot (service-role read)
- Source: `diagnostics/db_idempotency_runtime_audit.json` (generated `2026-03-10`).
- Observed columns:
  - `purchases.proposal_id` exists.
  - `purchase_items.request_item_id` exists, `purchase_items.proposal_item_id` missing.
  - `wh_incoming.purchase_id` exists.
  - `wh_ledger.source_type/source_id` missing; `incoming_item_id` exists.
- Observed duplicate groups in current data snapshot:
  - `purchases` by `proposal_id`: `0` duplicate groups.
  - `wh_incoming` by `purchase_id`: `0` duplicate groups.
  - `purchase_items` by `(purchase_id, request_item_id)`: `0` duplicate groups.
- Note: no duplicate groups now does **not** guarantee future idempotency without constraints.

### Required invariants
1. `purchases`: one `proposal_id` -> at most one purchase row.
2. `purchase_items`: one source proposal line -> at most one purchase line.
3. `wh_incoming`: one `purchase_id` -> at most one incoming header.
4. `wh_ledger`: one source event -> at most one ledger fact row.

### SQL candidates
- Draft SQL file: `db/20260310_approve_purchase_idempotency_enforcement_v1_draft.sql`.
- Candidate constraints/indexes:
  - unique partial index on `purchases(proposal_id)` where not null.
  - unique partial index on `wh_incoming(purchase_id)` where not null.
  - add `purchase_items.source_proposal_item_id` + unique partial index on it.
  - fallback unique partial index on `purchase_items(purchase_id, request_item_id)` where `request_item_id` not null.
  - add `wh_ledger.source_type/source_id` + unique partial index on `(source_type, source_id)`.

### Affected functions/RPC/services
- RPC path:
  - `director_approve_min_auto`
  - `ensure_purchase_and_incoming_strict`
  - `proposal_send_to_accountant_min`
  - `work_seed_from_purchase`
- Client call site:
  - `src/screens/director/director.proposal.ts`

### Migration order (phased, additive)
1. Audit only (duplicate queries + runtime snapshot script).
2. Cleanup/backfill if any duplicates are found.
3. Additive schema extension (`source_proposal_item_id`, `source_type/source_id`).
4. Add unique indexes/constraints.
5. Align RPC internals to `ON CONFLICT`/early-return idempotent semantics.
6. Re-run duplicate audit and smoke tests.

### Risks
- If historical duplicates exist in production, index creation will fail until cleanup.
- `purchase_items.source_proposal_item_id` backfill may be ambiguous when proposal data is already inconsistent.
- Without RPC SQL hardening, unique indexes alone may shift failures from silent duplicates to runtime constraint exceptions.

### Strict PASS feasibility
- Strict PASS becomes possible **after**:
  - additive constraints are applied successfully,
  - RPC paths are made retry-safe against those constraints,
  - post-rollout duplicate audit returns zero violations.

### Verdict
`READY FOR ADDITIVE DB ENFORCEMENT`

