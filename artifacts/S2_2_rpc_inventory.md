# S2.2 Critical RPC Inventory

Status: ROOT GAPS FOUND

| RPC / helper | Protects | Auth guard | Role guard | Company / ownership guard | S2 risk |
| --- | --- | --- | --- | --- | --- |
| `buyer_rfq_create_and_publish_v1` | RFQ creation and publish | `auth.uid()` required | `buyer_rfq_actor_is_buyer_v1()` | item scope checked through `list_buyer_inbox(null)` and source row count | Role helper priority is not canonical; `search_path = public`. |
| `buyer_rfq_actor_is_buyer_v1` | Buyer RFQ role truth | `auth.uid()` required | profile -> membership -> app metadata -> `get_my_role()` | none | Profile can override membership; no shared contract. |
| `rpc_proposal_submit_v3` | Atomic proposal create/submit | `auth.uid()` recorded and idempotency locked | no standalone role helper | request items, request scope, duplicate item/meta checks | Security-definer with `search_path = public`; relies on request item state/scope more than explicit buyer role. |
| `rpc_proposal_submit_v3_existing_replay_h1_4` | Duplicate submit replay | inherited authenticated execute | no standalone role helper | request/proposal/item match replay checks | Replay must not become cross-user replay; idempotency ledger primary key is client mutation id. |
| `director_approve_pipeline_v1` | Director approve + purchase + accountant handoff | called as authenticated | underlying approve function owns role guard | proposal existence/idempotent sent-to-accountant guard | Wrapper is typed, but S2 inventory should keep role/ownership proof around underlying approve functions. |
| `proposal_attachment_evidence_attach_v1` | Bind storage object to proposal evidence row | `auth.uid()` branch; service role allowed | `proposal_attachment_actor_role_v1()` or proposal creator | proposal exists, storage object exists, creator continuation | Role helper priority drift; owner continuation is narrow and should remain. |
| `proposal_attachment_evidence_scope_v1` | Read attachment evidence rows | authenticated execute | viewer role via helper / explicit viewer role | proposal id scope + visibility scope | Compatibility table fallback on client can still issue signed URLs directly after a scope failure. |
| `accounting_pay_invoice_v1` | Accounting payment mutation | `auth.uid()` in function body | accountant/business guards inside function | invoice/proposal/payment scopes | Security-definer with public search path; outside S2 narrow change unless proven broken. |
| `pdf_director_*_source_v1` | Director PDF read models | authenticated execute | implicitly director source RPC / edge auth | source-specific filters | Edge auth is mixed; storage URL issuance must match source access. |
| `warehouse_*_scope_v*` | Warehouse read queues/stock | authenticated execute | warehouse/director checks in source RPC | queue/stock scopes | Numerous security-definer functions use public search path; inventory risk, not current narrow patch target. |

## Search Path Snapshot

Many historical security-definer functions use `set search_path = public`. S2 narrow hardening should use `set search_path = ''` for new shared security helpers and schema-qualify `public` / `auth` references. Broad migration of every historical RPC is out of scope for this wave.

## Payload Trust Snapshot

Critical actions must not trust client payload for:

- role;
- authenticated actor id;
- company membership;
- cross-company ownership.

Observed better patterns: `auth.uid()`, server-side request/proposal readback, scope checks against source tables, storage object existence checks.

Observed remaining risks: direct client storage signed URL creation in attachment compatibility paths and mixed role source priority in legacy helpers.
