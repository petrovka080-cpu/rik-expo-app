-- 2026-02-21
-- Warehouse request issue reconciliation (safe/idempotent)
-- Run in Supabase SQL Editor with privileged role.

begin;

-- 1) Data hygiene: request_items.code should mirror rik_code.
update public.request_items
set code = rik_code
where coalesce(trim(code), '') = ''
  and coalesce(trim(rik_code), '') <> '';

commit;

-- 2) Diagnostics: rows where request UI says stock=0 but truth stock has qty > 0.
--    Keep this as a regression check after DB view/function changes.
with ui as (
  select
    v.request_id,
    v.display_no,
    v.request_item_id,
    upper(trim(v.rik_code)) as rik_code,
    coalesce(v.qty_left, 0) as qty_left,
    coalesce(v.qty_available, 0) as qty_available
  from public.v_wh_issue_req_items_ui v
),
ri as (
  select
    id as request_item_id,
    lower(trim(coalesce(status, ''))) as status
  from public.request_items
),
stock as (
  select
    upper(trim(code)) as code,
    sum(coalesce(qty_available, 0)) as qty_available_truth
  from public.v_wh_balance_ledger_truth_ui
  group by upper(trim(code))
)
select
  ui.display_no,
  ui.request_item_id,
  ui.rik_code,
  ui.qty_left,
  ui.qty_available as qty_available_ui,
  coalesce(stock.qty_available_truth, 0) as qty_available_truth
from ui
join ri on ri.request_item_id = ui.request_item_id
left join stock on stock.code = ui.rik_code
where ri.status not in ('отклонено', 'отклонена', 'rejected', 'reject', 'cancelled', 'canceled')
  and ui.qty_left > 0
  and ui.qty_available <= 0
  and coalesce(stock.qty_available_truth, 0) > 0
order by ui.display_no, ui.rik_code;

-- 3) Optional hard DB patch (only if you can modify DB objects):
--    Create fixed overlay view and use it in app instead of v_wh_issue_req_items_ui.
--    This keeps original DB object intact.
--
-- create or replace view public.v_wh_issue_req_items_ui_fixed as
-- with base as (
--   select * from public.v_wh_issue_req_items_ui
-- ),
-- stock as (
--   select
--     upper(trim(code)) as code,
--     sum(coalesce(qty_available, 0)) as qty_available_truth
--   from public.v_wh_balance_ledger_truth_ui
--   group by upper(trim(code))
-- )
-- select
--   b.request_id,
--   b.display_no,
--   b.object_name,
--   b.level_code,
--   b.system_code,
--   b.zone_code,
--   b.level_name,
--   b.system_name,
--   b.zone_name,
--   b.submitted_at,
--   b.request_item_id,
--   b.rik_code,
--   b.name_human,
--   b.uom,
--   b.qty_limit,
--   b.qty_issued,
--   b.qty_left,
--   case
--     when coalesce(b.qty_available, 0) > 0 then b.qty_available
--     when coalesce(stock.qty_available_truth, 0) > 0 then stock.qty_available_truth
--     else coalesce(b.qty_available, 0)
--   end as qty_available,
--   greatest(
--     coalesce(b.qty_can_issue_now, 0),
--     least(
--       greatest(coalesce(b.qty_left, 0), 0),
--       case
--         when coalesce(b.qty_available, 0) > 0 then coalesce(b.qty_available, 0)
--         else coalesce(stock.qty_available_truth, 0)
--       end
--     )
--   ) as qty_can_issue_now
-- from base b
-- left join stock on stock.code = upper(trim(b.rik_code));
