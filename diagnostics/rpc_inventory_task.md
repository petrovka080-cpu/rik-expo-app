# Diagnostics task: inventory Supabase RPC calls and views

**Environment:** `GOX BUILD – Diagnostics`

**Title:**
```
Diagnostics: inventory all supabase.rpc calls and required views
```

**Description:**
```
Scan the rik-expo-app client for all Supabase RPC calls and view/table dependencies.

Goals:
1) Find every usage of supabase.rpc(...) and any direct references to Postgres views used via from(...).
2) For each RPC/view:
   - record its name,
   - expected parameters,
   - expected result columns,
   - file + function where it is used.
3) Compare this list with existing SQL migrations in /db and mark which RPCs/views are missing in the new Supabase project (nxrnjywzxxfdpqmzjorh).

Deliverable:
- A Markdown/JSON report under diagnostics/ (e.g. diagnostics/rpc_inventory.md) listing all RPCs/views, with a flag "present/missing" for the new project.
```

**Notes:**
- This task is non-breaking and intended to build a complete inventory of backend dependencies before implementing missing RPCs.
- Use the new Supabase project `nxrnjywzxxfdpqmzjorh` for presence checks.
