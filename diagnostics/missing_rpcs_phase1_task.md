# GOX BUILD – Diagnostics task

**Title:**
```
Backend: implement core missing RPCs from diagnostics/rpc_inventory.md (phase 1)
```

**Description:**
```
Use diagnostics/rpc_inventory.md as the source of truth for missing RPCs and views.

Goal for phase 1:
Implement SQL functions for the most critical missing RPCs used by live tabs:
- warehouse.tsx
- director.tsx
- buyer.tsx
- accountant.tsx
- contractor tab (work_* RPCs)
- catalog/roles helpers in src/lib (catalog_search, get_my_role, ensure_my_profile, is_accountant, list_buyer_inbox, suppliers_list, etc.)

Tasks:
1) For each RPC marked "Status: Missing" and referenced by these tabs/helpers, design a PostgreSQL function in the new Supabase project schema.
2) Use the parameter and result descriptions from diagnostics/rpc_inventory.md to match the expected interface.
3) Reuse existing tables/views under /db where possible; do not break current migrations.
4) Create a new migration under /db/migrations/, e.g.
   db/migrations/20251210_missing_rpcs_phase1.sql
   with all function definitions (CREATE OR REPLACE FUNCTION ...).
5) Add comments to each function referencing the RPC name and the client usage (file + function).

Deliverable:
- A migration file under /db/migrations/ implementing the phase 1 missing RPCs.
- If some RPC cannot be implemented due to unknown schema, add TODO comments with questions.
```

**Notes:**
- Создаёшь новую задачу в GOX BUILD – Diagnostics, вставляешь это ТЗ → пусть Codex пишет SQL.
