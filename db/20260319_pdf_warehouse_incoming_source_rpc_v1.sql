begin;

create or replace function public.pdf_warehouse_incoming_source_v1(
  p_incoming_id text
)
returns jsonb
language sql
stable
set search_path = public
as $$
with normalized_args as (
  select nullif(btrim(coalesce(p_incoming_id, '')), '')::uuid as incoming_id_arg
),
report_head as (
  select
    r.incoming_id,
    r.event_dt,
    r.display_no,
    r.note,
    r.who
  from normalized_args a
  cross join public.acc_report_incoming_v2(null, null) r
  where r.incoming_id = a.incoming_id_arg
  limit 1
),
base_head as (
  select
    wi.id as incoming_id,
    coalesce(wi.confirmed_at, max(wl.moved_at), wi.created_at) as event_dt,
    concat('PR-', wi.id_short::text) as display_no,
    coalesce(
      nullif(btrim(wi.note), ''),
      max(nullif(btrim(wl.note), ''))
    ) as note,
    coalesce(
      nullif(btrim(wi.warehouseman_fio), ''),
      max(nullif(btrim(wl.warehouseman_fio), ''))
    ) as who
  from normalized_args a
  cross join public.wh_incoming wi
  left join public.wh_ledger wl
    on wl.incoming_id = wi.id
   and wl.direction = 'in'
  where wi.id = a.incoming_id_arg
  group by wi.id, wi.confirmed_at, wi.created_at, wi.id_short, wi.note, wi.warehouseman_fio
),
header_data as (
  select jsonb_build_object(
    'incoming_id', p_incoming_id,
    'id', p_incoming_id,
    'event_dt', coalesce(rh.event_dt, bh.event_dt),
    'display_no', coalesce(
      nullif(btrim(rh.display_no), ''),
      nullif(btrim(bh.display_no), ''),
      concat('PR-', substring(p_incoming_id from 1 for 8))
    ),
    'note', coalesce(rh.note, bh.note),
    'warehouseman_fio', coalesce(rh.who, bh.who),
    'who', coalesce(rh.who, bh.who)
  ) as value,
  case
    when rh.incoming_id is not null then 'acc_report_incoming_v2'
    when bh.incoming_id is not null then 'wh_incoming'
    else 'synthetic'
  end as head_source
  from (select 1) seed
  left join report_head rh on true
  left join base_head bh on true
),
line_rows as (
  select
    row_number() over () as line_ord,
    wl.code,
    wl.uom_id,
    wl.qty,
    coalesce(
      nullif(btrim(cno.name_ru), ''),
      nullif(btrim(vrr.name_ru), ''),
      nullif(btrim(vui.name), ''),
      nullif(btrim(wl.code), ''),
      'Позиция'
    ) as display_name
  from public.wh_ledger wl
  left join lateral (
    select c.name_ru
    from public.catalog_name_overrides c
    where upper(btrim(c.code)) = upper(btrim(wl.code))
      and nullif(btrim(c.name_ru), '') is not null
    limit 1
  ) cno on true
  left join lateral (
    select v.name_ru
    from public.v_rik_names_ru v
    where upper(btrim(v.code)) = upper(btrim(wl.code))
      and nullif(btrim(v.name_ru), '') is not null
    limit 1
  ) vrr on true
  left join lateral (
    select ui.name
    from public.v_wh_balance_ledger_ui ui
    where upper(btrim(ui.code)) = upper(btrim(wl.code))
      and nullif(btrim(ui.name), '') is not null
    limit 1
  ) vui on true
  cross join normalized_args a
  where wl.incoming_id = a.incoming_id_arg
    and wl.direction = 'in'
),
rows_data as (
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'code', lr.code,
        'uom_id', lr.uom_id,
        'qty', lr.qty,
        'name_ru', lr.display_name,
        'material_name', lr.display_name,
        'name', lr.display_name,
        'uom', lr.uom_id,
        'qty_received', lr.qty
      )
      order by lr.line_ord
    ),
    '[]'::jsonb
  ) as value
  from line_rows lr
),
totals_data as (
  select jsonb_build_object(
    'lines_count', count(*),
    'qty_total', coalesce(sum(lr.qty), 0)
  ) as value
  from line_rows lr
)
select jsonb_build_object(
  'document_type', 'warehouse_incoming_form',
  'version', 'v1',
  'generated_at', timezone('utc', now()),
  'document_id', p_incoming_id,
  'source_branch', 'canonical',
  'header', hd.value,
  'rows', rd.value,
  'totals', td.value,
  'meta', jsonb_build_object(
    'incoming_id', p_incoming_id,
    'head_source', hd.head_source,
    'rows_source', 'wh_ledger',
    'payload_shape_version', 'v1'
  )
)
from header_data hd
cross join rows_data rd
cross join totals_data td;
$$;

comment on function public.pdf_warehouse_incoming_source_v1(text) is
'Warehouse incoming form PDF canonical source envelope v1. Collapses head lookup, line rows, and name-resolution fan-out into one read-only RPC while leaving contract shaping, HTML render, and preview/export semantics on the client.';

grant execute on function public.pdf_warehouse_incoming_source_v1(text) to authenticated;

commit;
