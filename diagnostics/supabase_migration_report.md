# GOX BUILD – Supabase migration diagnostics (project: `nxrnjywzxxfdpqmzjorh`)

## Scope
Static review of the Expo client after pointing it to the new Supabase project. Focused on marketplace, warehouse, contractor/work_progress, profile/company, auth, SQL/RPC coverage, and legacy Supabase references.

---
## 1. Marketplace
**Findings**
- The tab layout contains only Foreman/Director/Buyer/Accountant/Warehouse/Security. No Marketplace screen or navigation entry survived the migration, so marketplace users cannot reach listings at all.【F:app/(tabs)/_layout.tsx†L13-L19】
- Code search shows no queries for `market_listings`, `items_json`, or marketplace filters, implying the data layer for the marketplace is absent and calls will fail once wired to the new backend.【0ea8d4†L1-L1】

**Proposed fixes**
- Reintroduce a Marketplace tab/screen and route, then recreate queries for `market_listings`, item JSON payloads, and filter RPC/view equivalents in the new project. Add 400/500 guardrails and empty-state handling before shipping.

---
## 2. Warehouse
**Findings**
- Incoming flow depends on legacy compatibility view `wh_incoming_compat` and fallbacks to `purchases` with Russian statuses. These views/tables are not present in the provided migrations, so fetching arrivals will 404 in the new project.【F:app/(tabs)/warehouse.tsx†L169-L199】
- Receipt confirmation and materialization rely on RPCs (`wh_receive_confirm`, `wh_incoming_*`) that are also missing from the migration set, blocking confirmation and alias resolution for `p:<purchase_id>` rows.【F:app/(tabs)/warehouse.tsx†L294-L335】
- Partial/full receipt paths call `wh_receive_item_v2`/`wh_receive_confirm`; without those RPCs inventory updates will silently fail and leave UI stuck in pending state.【F:app/(tabs)/warehouse.tsx†L678-L717】
- Inventory/reporting sections expect accounting RPCs (`acc_inv_list/open/finish`, `acc_report_stock/movement`) and fallback views; none are defined in the checked SQL scripts, so tabs will render empty or error and the modal will keep showing “not supported”.【F:app/(tabs)/warehouse.tsx†L944-L1005】
- Performance risk: load flows make multiple sequential RPCs per expand/receive action (materialize incoming → load items → ensure positions → receive). On mobile this will create noticeable modal lag even after RPCs are restored.【F:app/(tabs)/warehouse.tsx†L666-L740】

**Proposed fixes**
- Port/create the warehouse views and RPCs in the new project (`wh_incoming_compat`, `wh_incoming_*`, `wh_receive_*`, `acc_inv_*`, `acc_report_*`, `list_warehouse_history` or `v_warehouse_history`).
- Replace the sequential RPC chain in `onToggleHead`/receipt handlers with a batched RPC that returns items and availability in one call, and debounce fetches after confirm to cut duplicate network hops.
- Add defensive UI states for “RPC missing/unsupported” instead of silently clearing lists.

---
## 3. Contractor / work_progress
**Findings**
- No contractor or `work_progress` components/RPCs exist in the client. Tabs omit the role entirely, so the “Take job” entry point is missing and logs/materials cannot be viewed.【F:app/(tabs)/_layout.tsx†L13-L19】【0cf129†L1-L1】

**Proposed fixes**
- Add a Contractor tab with a screen that lists active jobs, exposes a “Take job” action, and surfaces work logs/materials tied to the new project’s tables. Define the required RPCs/views (e.g., job listing, progress updates) in Supabase and guard for missing permissions.

---
## 4. Profile / Company
**Findings**
- Profile handling is limited to `ensure_my_profile`/`get_my_role` RPC calls; there is no UI for editing personal or company fields, so migrated profile/company data cannot be verified or corrected from the app.【F:src/lib/rik_api.ts†L392-L402】
- Auto-redirect on app start goes straight to the Foreman tab without checking profile completeness, so incorrect fields or RIK-code leaks in request items would go unnoticed by users.【F:app/index.tsx†L1-L5】【F:src/lib/rik_api.ts†L404-L424】

**Proposed fixes**
- Implement a profile/company settings screen wired to the new project’s tables, with validation for sensitive fields (e.g., hide/store `rik_code` internally, surface user-friendly labels only).
- Add a bootstrap guard that calls `ensure_my_profile` and blocks navigation until required fields are present; show errors if RPCs are missing in the new project.

---
## 5. Auth (login/register/logout/reset)
**Findings**
- The client performs an environment-driven auto-login (`EXPO_PUBLIC_SUPABASE_EMAIL/PASSWORD`) via `ensureSignedIn`; there is no login/register/forgot-password UI, so end users cannot authenticate against the new project without dev-provided credentials.【F:src/lib/supabaseClient.ts†L65-L80】
- Startup redirect bypasses any session check and routes to `/foreman`, meaning expired sessions will just fail later RPCs instead of returning to auth.【F:app/index.tsx†L1-L5】

**Proposed fixes**
- Add proper auth screens using Supabase email/password (and password reset) and wire redirects to session state instead of environment variables.
- Remove reliance on `.env` credentials in production builds; use Supabase Auth providers configured for the new project.

---
## 6. SQL + RPC audit
**Findings**
- Client expects dozens of RPCs (`list_buyer_inbox`, `wh_receive_*`, `acc_*`, director approval functions, etc.).【a6057f†L1-L56】 Only five SQL scripts are present, covering request numbering and a few request-item helpers, leaving most required RPCs undefined in the new project.【F:db/20240528_request_numbering.sql†L1-L120】
- Warehouse history/inventory/report features attempt multiple RPC fallbacks before giving up, indicating missing views/functions will surface as empty data rather than explicit errors.【F:app/(tabs)/warehouse.tsx†L944-L1005】

**Proposed fixes**
- Inventory all `supabase.rpc` calls from the client, create matching functions/views/triggers in `nxrnjywzxxfdpqmzjorh`, and add a migration pack to version control.
- Add feature-flag/`supports_*` probes so UI can explicitly show “RPC missing” instead of silently clearing state when a function is absent.

---
## 7. Legacy Supabase references
**Findings**
- Multiple `.bak` tab screens still ship in the repo and import Supabase; they reference legacy RPC names (`list_accountant_inbox_compat`, etc.) and risk developer confusion during migration work.【F:app/(tabs)/accountant.tsx†L126-L349】【F:app/(tabs)/foreman.tsx.bak†L1-L24】
- PowerShell helper scripts (`fix_deprecated.ps1`, `run_ws5.ps1`) and comments still point to old setups; none mention the new project ref, inviting misconfiguration.

**Proposed fixes**
- Remove or archive the `.bak` screens outside the app bundle and update helper scripts/docs to reference `nxrnjywzxxfdpqmzjorh`.
- Centralize Supabase config in one place and document required env vars for the new project, eliminating reliance on stale compatibility RPCs.

---
## Next steps
1) Stand up missing RPCs/views in the new Supabase project according to the client’s expectations above. 2) Re-enable marketplace/contractor/auth/profile UI so users can exercise the new backend. 3) Add defensive telemetry and “RPC missing” states to surface migration gaps quickly.
