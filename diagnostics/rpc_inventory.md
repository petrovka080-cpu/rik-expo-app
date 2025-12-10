# Supabase RPC/View Inventory

Inventory of Supabase RPCs and Postgres views referenced by the rik-expo-app client. Presence refers to whether a matching function/view exists in the migrations under `/db` for the new Supabase project `nxrnjywzxxfdpqmzjorh`.

## RPC calls

- **acc_add_payment_min**
  - Params: payment payload collected in Accountant tab (amount, invoice, etc.).
  - Result columns: not read (success/fail only).
  - Usage: `submitPayment` in `app/(tabs)/accountant.tsx`.
  - Status: Missing in migrations.

- **acc_inv_finish**
  - Params: `{ p_invoice_id }` when finishing invoice workflow.
  - Result columns: not read.
  - Usage: invoice completion handler in `app/(tabs)/warehouse.tsx`.
  - Status: Missing.

- **acc_inv_list**
  - Params: none.
  - Result columns: rows displayed in accountant inventory; fields such as invoice id/status are rendered directly from the response.
  - Usage: accountant inventory loader in `app/(tabs)/warehouse.tsx`.
  - Status: Missing.

- **acc_inv_open**
  - Params: `{ p_invoice_id }` to start editing an invoice.
  - Result columns: not read.
  - Usage: invoice open handler in `app/(tabs)/warehouse.tsx`.
  - Status: Missing.

- **acc_issue_add_item**
  - Params: `{ p_issue_id, p_rik_code, p_qty }` (issue item creation).
  - Result columns: not read.
  - Usage: issue item add flow in `app/(tabs)/warehouse.tsx`.
  - Status: Missing.

- **acc_issue_create**
  - Params: `{ p_object, p_comment }` when creating an issue document.
  - Result columns: created issue row with `id` (used to continue flow).
  - Usage: issue creation handler in `app/(tabs)/warehouse.tsx`.
  - Status: Missing.

- **acc_report_movement**
  - Params: `{ p_object_id?, p_rik_code? }` (built from UI filters) for movement report.
  - Result columns: movement rows consumed with `ts`, `direction`, `qty`, `rik_code`.
  - Usage: accountant reports block in `app/(tabs)/warehouse.tsx`.
  - Status: Missing.

- **acc_report_stock**
  - Params: none.
  - Result columns: stock rows read with `rik_code`, `qty_available`.
  - Usage: accountant reports block in `app/(tabs)/warehouse.tsx`.
  - Status: Missing.

- **acc_return_min_auto**
  - Params: `{ p_proposal_id, p_comment }` used when accountant auto-returns.
  - Result columns: not read.
  - Usage: return handler in `app/(tabs)/accountant.tsx`.
  - Status: Missing.

- **add_request_item**
  - Params: `{ p_request_id, p_rik_code, p_qty, p_uom }` from request creation helpers.
  - Result columns: request item record with `id` (used to proceed).
  - Usage: `addRequestItem` in `src/lib/requests.ts`.
  - Status: Missing.

- **approve_one**
  - Params: `{ p_proposal_id }` for director approval of a proposal.
  - Result columns: not read.
  - Usage: approval handler in `app/(tabs)/director.tsx`.
  - Status: Missing.

- **approve_request_all**
  - Params: `{ p_request_id }` bulk-approve items.
  - Result columns: not read.
  - Usage: director bulk approval in `app/(tabs)/director.tsx`.
  - Status: Missing.

- **approve_request_item**
  - Params: `{ p_request_item_id }` approve single request item.
  - Result columns: not read.
  - Usage: per-item approval in `app/(tabs)/director.tsx`.
  - Status: Missing.

- **catalog_search**
  - Params: `{ p_query, p_kind }` from catalog search UI.
  - Result columns: `rik_code`, `name_human_ru/name_human`, `uom_code`, `kind`, `qty_available` used to build search rows.
  - Usage: catalog search in `app/(tabs)/warehouse.tsx` and contractor screen.
  - Status: Missing.

- **create_request**
  - Params: none.
  - Result columns: created request row with `id`.
  - Usage: `createRequest` helper in `src/lib/requests.ts`.
  - Status: Present (covered by `20240530_request_create_draft_fix.sql`).

- **director_decide_request**
  - Params: `{ p_request_id, p_decision }` when director chooses approve/reject.
  - Result columns: not read.
  - Usage: decision handler in `app/(tabs)/director.tsx`.
  - Status: Missing.

- **director_return_min_auto**
  - Params: `{ p_proposal_id, p_reason }` auto-return from director.
  - Result columns: not read.
  - Usage: `returnProposal` helper in `src/lib/rik_api.ts`.
  - Status: Missing.

- **ensure_incoming_items**
  - Params: `{ p_purchase_id }` ensure incoming rows when receiving.
  - Result columns: not read.
  - Usage: receive flow in `app/(tabs)/warehouse.tsx`.
  - Status: Missing.

- **ensure_my_profile**
  - Params: none.
  - Result columns: not read (boolean success assumed).
  - Usage: `ensureMyProfile` in `src/lib/rik_api.ts`.
  - Status: Missing.

- **get_my_role**
  - Params: none.
  - Result columns: single text role string.
  - Usage: `getMyRole` in `src/lib/rik_api.ts` and accountant tab role check.
  - Status: Missing.

- **is_accountant**
  - Params: none.
  - Result columns: boolean flag.
  - Usage: role check in `app/(tabs)/accountant.tsx`.
  - Status: Missing.

- **list_accountant_inbox**
  - Params: `{ p_tab }` (normalized tab name).
  - Result columns: inbox rows with proposal/invoice fields displayed in accountant UI.
  - Usage: `loadInbox` in `src/lib/rik_api.ts` and accountant tab.
  - Status: Missing.

- **list_accountant_inbox_compat**
  - Params: none.
  - Result columns: same shape as accountant inbox fallback.
  - Usage: compatibility loader in `src/lib/rik_api.ts`.
  - Status: Missing.

- **list_attachments**
  - Params: `{ p_group_key }` used when fetching grouped files.
  - Result columns: `id`, `file_name`, `file_url`, `created_at`, `group_key`.
  - Usage: `listAttachments` in `src/lib/files.ts`.
  - Status: Missing.

- **list_buyer_inbox**
  - Params: none.
  - Result columns: buyer inbox rows with `request_id`, `request_item_id`, `rik_code`, `name_human`, `qty`, `uom`, `app_code`, `note`, `object_name`, `status`, `created_at`.
  - Usage: `fetchInbox` in `app/(tabs)/buyer.tsx`.
  - Status: Missing.

- **list_director_items_stable**
  - Params: none.
  - Result columns: pending request item rows with `request_id`, `request_item_id`, `name_human`, `qty`, `uom`.
  - Usage: director inbox loader in `app/(tabs)/director.tsx`.
  - Status: Missing.

- **list_director_proposals_pending**
  - Params: none.
  - Result columns: pending proposals list with `id`, `submitted_at`, etc., displayed in director screen.
  - Usage: director proposal list in `src/lib/rik_api.ts`.
  - Status: Missing.

- **list_proposals_pending**
  - Params: none.
  - Result columns: proposals awaiting director review (ids used to display).
  - Usage: proposals list in `src/lib/rik_api.ts`.
  - Status: Missing.

- **list_report_ap_aging**
  - Params: none.
  - Result columns: `counterparty_id`, `total_billed`, `total_paid`, `balance`.
  - Usage: reports screen `app/(tabs)/reports.tsx`.
  - Status: Missing.

- **list_report_costs_by_object**
  - Params: `{ p_start, p_end }`.
  - Result columns: `object_id`, `article`, `fact_qty`, `fact_amount`.
  - Usage: reports screen `app/(tabs)/reports.tsx`.
  - Status: Missing.

- **list_report_purchase_pipeline**
  - Params: `{ p_start, p_end }`.
  - Result columns: `status`, `cnt`.
  - Usage: reports screen `app/(tabs)/reports.tsx`.
  - Status: Missing.

- **list_report_stock_turnover**
  - Params: `{ p_start, p_end }`.
  - Result columns: `rik_code`, `incoming`, `outgoing`, `balance`.
  - Usage: reports screen `app/(tabs)/reports.tsx`.
  - Status: Missing.

- **list_wh_items**
  - Params: `{ p_object?, p_rik_code? }` from warehouse filters.
  - Result columns: warehouse stock rows with `rik_code`, `qty_available`, `object`.
  - Usage: multiple loaders in `app/(tabs)/warehouse.tsx`.
  - Status: Missing.

- **proposal_items_for_web**
  - Params: `{ p_id }` proposal id.
  - Result columns: proposal item rows used for download, including `rik_code`, `name_human`, `uom`, `qty`.
  - Usage: `downloadProposalPdf` in `src/lib/rik_api.ts`.
  - Status: Missing.

- **proposal_return_to_buyer_min**
  - Params: `{ p_proposal_id, p_comment }` when accountant returns to buyer.
  - Result columns: not read.
  - Usage: return flow in `app/(tabs)/accountant.tsx`.
  - Status: Missing.

- **proposal_send_to_accountant_min**
  - Params: `{ p_proposal_id }` when buyer submits to accountant.
  - Result columns: not read.
  - Usage: submission handlers in `app/(tabs)/buyer.tsx` and `src/lib/rik_api.ts`.
  - Status: Missing.

- **purchase_approve**
  - Params: `{ p_purchase_id }` director approves purchase.
  - Result columns: not read.
  - Usage: director flow in `app/(tabs)/director.tsx`.
  - Status: Missing.

- **purchase_upsert_from_proposal**
  - Params: `{ p_proposal_id }` convert proposal to purchase.
  - Result columns: not read.
  - Usage: director flow in `app/(tabs)/director.tsx`.
  - Status: Missing.

- **reject_one**
  - Params: `{ p_proposal_id }` reject proposal.
  - Result columns: not read.
  - Usage: rejection handler in `app/(tabs)/director.tsx`.
  - Status: Missing.

- **reject_request_all**
  - Params: `{ p_request_id, p_reason }` bulk reject.
  - Result columns: not read.
  - Usage: director bulk reject in `app/(tabs)/director.tsx`.
  - Status: Missing.

- **reject_request_item**
  - Params: `{ p_request_item_id, p_reason }` reject single item.
  - Result columns: not read.
  - Usage: per-item rejection in `app/(tabs)/director.tsx`.
  - Status: Missing.

- **request_item_update_qty**
  - Params: `{ p_request_item_id, p_qty }`.
  - Result columns: updated request item row (`id`, `qty`, etc.).
  - Usage: `updateRequestItemQty` in `src/lib/catalog_api.ts`.
  - Status: Present (defined in `20240529_request_item_update_qty.sql`).

- **request_items_by_request**
  - Params: `{ p_request_id }`.
  - Result columns: request items with `id`, `request_id`, `name_human`, `qty`, `uom`, `status`, `supplier_hint`, `app_code`, `note`.
  - Usage: `listRequestItems` in `src/lib/rik_api.ts`.
  - Status: Missing.

- **request_items_set_status**
  - Params: `{ p_request_item_ids, p_status }`.
  - Result columns: not read.
  - Usage: status update helper in `src/lib/catalog_api.ts`.
  - Status: Missing.

- **rpc_calc_kit_basic**
  - Params: work calculator payload `{ p_work_type_code, p_area_m2, p_perimeter_m, p_length_m, p_points, p_height_m?, p_complexity?, p_prep? }`.
  - Result columns: kit calculation rows consumed with `rik_code`, `name`, `qty`, `uom`, `unit_price`.
  - Usage: `CalcModal` in `app/(tabs)/foreman/CalcModal.tsx`.
  - Status: Present (backed by `patch_fn_calc_kit_basic.sql`).

- **suppliers_list**
  - Params: optional search filters `{ p_q?, p_limit?, p_offset? }`.
  - Result columns: supplier rows with `id`, `name`, `inn`, `specialization`.
  - Usage: `listSuppliersRpc` in `src/lib/catalog_api.ts`.
  - Status: Missing.

- **wh_receive_confirm**
  - Params: `{ p_receive_id }` to close receiving document.
  - Result columns: not read.
  - Usage: receive confirmation in `app/(tabs)/warehouse.tsx`.
  - Status: Missing.

- **wh_receive_item_v2**
  - Params: `{ p_receive_id, p_rik_code, p_qty, p_price }` when scanning items.
  - Result columns: receive item row with `id`, `rik_code`, `qty`.
  - Usage: receiving flows in `app/(tabs)/warehouse.tsx`.
  - Status: Missing.

- **work_finish**
  - Params: `{ p_work_id, p_comment? }`.
  - Result columns: not read.
  - Usage: finish work handlers in `app/(tabs)/warehouse.tsx` and contractor tab.
  - Status: Missing.

- **work_seed_from_purchase**
  - Params: `{ p_purchase_id }` pre-fill work items.
  - Result columns: seed rows with `rik_code`, `qty`, etc.
  - Usage: work creation flow in `app/(tabs)/warehouse.tsx` and contractor tab.
  - Status: Missing.

- **work_start**
  - Params: `{ p_object, p_comment, p_code?, p_started_at? }`.
  - Result columns: work row with `id` used to continue flow.
  - Usage: work start in `app/(tabs)/warehouse.tsx` and contractor tab.
  - Status: Missing.

## View/table dependencies via `from` calls

- **v_requests_display**
  - Accessed columns: `id`, `display_no` (resolved labels for requests).
  - Usage: director inbox preload in `app/(tabs)/director.tsx`.
  - Status: Missing from migrations (no view definition under `/db`).

- **v_proposals_display**
  - Accessed columns: `id`, `display_no` (proposal labels for downloads).
  - Usage: `getProposalDisplay` helper in `src/lib/rik_api.ts`.
  - Status: Missing from migrations.
