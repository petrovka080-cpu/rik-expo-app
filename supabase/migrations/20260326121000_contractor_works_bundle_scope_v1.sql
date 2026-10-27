begin;

create or replace function public.contractor_works_bundle_scope_v1(
  p_my_contractor_id text default null,
  p_is_staff boolean default false
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with approved_subcontracts as (
  select
    s.id::text as id,
    nullif(trim(s.status), '') as status,
    nullif(trim(s.object_name), '') as object_name,
    nullif(trim(s.work_type), '') as work_type,
    coalesce(s.qty_planned, 0)::numeric as qty_planned,
    nullif(trim(s.uom), '') as uom,
    nullif(trim(s.contractor_org), '') as contractor_org,
    nullif(trim(s.contractor_inn), '') as contractor_inn,
    nullif(trim(s.contractor_phone), '') as contractor_phone,
    s.created_at
  from public.subcontracts s
  where lower(trim(coalesce(s.status, ''))) = 'approved'
),
approved_subcontracts_keyed as (
  select
    aps.*,
    lower(regexp_replace(trim(coalesce(aps.object_name, '')), E'\\s+', ' ', 'g')) as object_key,
    lower(regexp_replace(trim(coalesce(aps.work_type, '')), E'\\s+', ' ', 'g')) as work_key
  from approved_subcontracts aps
),
subcontract_lookup_obj_work as (
  select distinct on (object_key, work_key)
    object_key,
    work_key,
    id as matched_job_id
  from approved_subcontracts_keyed
  where object_key <> ''
    and work_key <> ''
  order by object_key, work_key, created_at asc nulls last, id asc
),
subcontract_lookup_work as (
  select
    work_key,
    case
      when count(distinct id) = 1 then max(id)
      else null
    end as unique_job_id
  from approved_subcontracts_keyed
  where work_key <> ''
  group by work_key
),
base_rows as (
  select
    coalesce(vw.progress_id::text, wp.id::text, '') as progress_id,
    vw.created_at,
    coalesce(vw.purchase_item_id::text, wp.purchase_item_id::text) as purchase_item_id,
    nullif(trim(vw.work_code), '') as work_code,
    nullif(trim(vw.work_name), '') as work_name,
    nullif(trim(vw.object_name), '') as base_object_name,
    vw.contractor_id::text as contractor_id,
    vw.started_at,
    vw.finished_at,
    coalesce(vw.qty_planned, 0)::numeric as qty_planned,
    coalesce(vw.qty_done, 0)::numeric as qty_done,
    coalesce(vw.qty_left, 0)::numeric as qty_left,
    vw.uom_id::text as uom_id,
    nullif(trim(vw.work_status), '') as work_status,
    ri.request_id::text as request_id,
    nullif(trim(req.status::text), '') as request_status,
    coalesce(req.contractor_job_id::text, req.subcontract_id::text) as contractor_job_id,
    nullif(trim(req.object_name), '') as request_object_name,
    nullif(
      trim(
        concat_ws(
          ' / ',
          nullif(trim(req.object_type_code), ''),
          nullif(trim(req.level_code), ''),
          nullif(trim(req.system_code), '')
        )
      ),
      ''
    ) as request_object_path
  from public.v_works_fact vw
  left join public.work_progress wp
    on wp.id::text = vw.progress_id::text
  left join public.purchase_items pi
    on pi.id::text = coalesce(vw.purchase_item_id::text, wp.purchase_item_id::text)
  left join public.request_items ri
    on ri.id::text = pi.request_item_id::text
  left join public.requests req
    on req.id::text = ri.request_id::text
),
resolved_rows as (
  select
    br.*,
    coalesce(br.base_object_name, br.request_object_name, br.request_object_path) as object_name_seed,
    lower(regexp_replace(trim(coalesce(br.work_name, br.work_code, '')), E'\\s+', ' ', 'g')) as work_key,
    lower(
      regexp_replace(
        trim(coalesce(coalesce(br.base_object_name, br.request_object_name, br.request_object_path), '')),
        E'\\s+',
        ' ',
        'g'
      )
    ) as object_key
  from base_rows br
),
attached_rows as (
  select
    rr.progress_id,
    rr.created_at,
    rr.purchase_item_id,
    rr.work_code,
    rr.work_name,
    coalesce(rr.object_name_seed, matched_subcontract.object_name, unique_subcontract.object_name) as object_name,
    rr.request_id,
    rr.request_status,
    coalesce(rr.contractor_job_id, obj_work_lookup.matched_job_id, work_lookup.unique_job_id) as contractor_job_id,
    rr.uom_id,
    rr.qty_planned,
    rr.qty_done,
    rr.qty_left,
    null::numeric as unit_price,
    coalesce(rr.work_status, '') as work_status,
    rr.contractor_id,
    rr.started_at,
    rr.finished_at,
    coalesce(matched_subcontract.contractor_org, unique_subcontract.contractor_org) as contractor_org,
    coalesce(matched_subcontract.contractor_inn, unique_subcontract.contractor_inn) as contractor_inn,
    coalesce(matched_subcontract.contractor_phone, unique_subcontract.contractor_phone) as contractor_phone
  from resolved_rows rr
  left join subcontract_lookup_obj_work obj_work_lookup
    on rr.contractor_job_id is null
    and rr.object_key <> ''
    and rr.work_key <> ''
    and obj_work_lookup.object_key = rr.object_key
    and obj_work_lookup.work_key = rr.work_key
  left join subcontract_lookup_work work_lookup
    on rr.contractor_job_id is null
    and rr.work_key <> ''
    and obj_work_lookup.matched_job_id is null
    and work_lookup.work_key = rr.work_key
  left join approved_subcontracts matched_subcontract
    on matched_subcontract.id = coalesce(rr.contractor_job_id, obj_work_lookup.matched_job_id)
  left join approved_subcontracts unique_subcontract
    on unique_subcontract.id = work_lookup.unique_job_id
),
filtered_rows as (
  select ar.*
  from attached_rows ar
  where not (
    upper(coalesce(ar.work_code, '')) like 'MAT-%'
    or upper(coalesce(ar.work_code, '')) like 'KIT-%'
    or upper(coalesce(ar.work_code, '')) like 'FACTOR-%'
    or upper(coalesce(ar.work_code, '')) like 'GENERIC-%'
    or upper(coalesce(ar.work_code, '')) like 'AUX-%'
    or upper(coalesce(ar.work_code, '')) like 'SUP-%'
    or upper(coalesce(ar.work_code, '')) like 'TEST-%'
    or upper(coalesce(ar.work_code, '')) like 'WRK-META-K-%'
  )
    and (
      p_is_staff
      or (
        nullif(trim(coalesce(p_my_contractor_id, '')), '') is not null
        and ar.contractor_id = nullif(trim(coalesce(p_my_contractor_id, '')), '')
      )
      or (
        ar.contractor_job_id is not null
        and exists (
          select 1
          from approved_subcontracts aps
          where aps.id = ar.contractor_job_id
        )
      )
      or (
        ar.contractor_job_id is null
        and (
          coalesce(trim(ar.request_status), '') = ''
          or lower(ar.request_status) like '%ready%'
          or lower(ar.request_status) like '%approved%'
          or lower(ar.request_status) like '%waiting_stock%'
          or lower(ar.request_status) like '%stock%'
          or lower(ar.request_status) like '%утвержд%'
          or lower(ar.request_status) like '%готов%'
        )
      )
    )
),
existing_job_ids as (
  select distinct ar.contractor_job_id
  from filtered_rows ar
  where ar.contractor_job_id is not null
),
synthetic_rows as (
  select
    'subcontract:' || aps.id as progress_id,
    null::timestamptz as created_at,
    null::text as purchase_item_id,
    'WRK-SUBCONTRACT'::text as work_code,
    coalesce(aps.work_type, 'Работа') as work_name,
    aps.object_name,
    null::text as request_id,
    null::text as request_status,
    aps.id as contractor_job_id,
    aps.uom as uom_id,
    coalesce(aps.qty_planned, 0)::numeric as qty_planned,
    0::numeric as qty_done,
    coalesce(aps.qty_planned, 0)::numeric as qty_left,
    null::numeric as unit_price,
    'не назначено'::text as work_status,
    null::text as contractor_id,
    null::timestamptz as started_at,
    null::timestamptz as finished_at,
    aps.contractor_org,
    aps.contractor_inn,
    aps.contractor_phone,
    aps.created_at as sort_created_at
  from approved_subcontracts aps
  left join existing_job_ids ej
    on ej.contractor_job_id = aps.id
  where ej.contractor_job_id is null
),
combined_rows as (
  select
    0 as sort_group,
    sr.sort_created_at,
    sr.progress_id,
    sr.created_at,
    sr.purchase_item_id,
    sr.work_code,
    sr.work_name,
    sr.object_name,
    sr.contractor_org,
    sr.contractor_inn,
    sr.contractor_phone,
    sr.request_id,
    sr.request_status,
    sr.contractor_job_id,
    sr.uom_id,
    sr.qty_planned,
    sr.qty_done,
    sr.qty_left,
    sr.unit_price,
    sr.work_status,
    sr.contractor_id,
    sr.started_at,
    sr.finished_at
  from synthetic_rows sr

  union all

  select
    1 as sort_group,
    fr.created_at as sort_created_at,
    fr.progress_id,
    fr.created_at,
    fr.purchase_item_id,
    fr.work_code,
    fr.work_name,
    fr.object_name,
    fr.contractor_org,
    fr.contractor_inn,
    fr.contractor_phone,
    fr.request_id,
    fr.request_status,
    fr.contractor_job_id,
    fr.uom_id,
    fr.qty_planned,
    fr.qty_done,
    fr.qty_left,
    fr.unit_price,
    fr.work_status,
    fr.contractor_id,
    fr.started_at,
    fr.finished_at
  from filtered_rows fr
)
select jsonb_build_object(
  'document_type', 'contractor_works_bundle_scope',
  'version', 'v1',
  'rows', coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'progress_id', cr.progress_id,
          'created_at', cr.created_at,
          'purchase_item_id', cr.purchase_item_id,
          'work_code', cr.work_code,
          'work_name', cr.work_name,
          'object_name', cr.object_name,
          'contractor_org', cr.contractor_org,
          'contractor_inn', cr.contractor_inn,
          'contractor_phone', cr.contractor_phone,
          'request_id', cr.request_id,
          'request_status', cr.request_status,
          'contractor_job_id', cr.contractor_job_id,
          'uom_id', cr.uom_id,
          'qty_planned', cr.qty_planned,
          'qty_done', cr.qty_done,
          'qty_left', cr.qty_left,
          'unit_price', cr.unit_price,
          'work_status', cr.work_status,
          'contractor_id', cr.contractor_id,
          'started_at', cr.started_at,
          'finished_at', cr.finished_at
        )
        order by cr.sort_group asc, cr.sort_created_at desc nulls last, cr.progress_id asc
      )
      from combined_rows cr
    ),
    '[]'::jsonb
  ),
  'subcontract_cards', coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', aps.id,
          'status', aps.status,
          'object_name', aps.object_name,
          'work_type', aps.work_type,
          'qty_planned', aps.qty_planned,
          'uom', aps.uom,
          'contractor_org', aps.contractor_org,
          'contractor_inn', aps.contractor_inn,
          'contractor_phone', aps.contractor_phone,
          'created_at', aps.created_at
        )
        order by aps.created_at desc nulls last, aps.id asc
      )
      from approved_subcontracts aps
    ),
    '[]'::jsonb
  ),
  'meta', jsonb_build_object(
    'rows_source', 'contractor_works_bundle_scope_v1',
    'base_rows_source', 'v_works_fact',
    'approved_source', 'subcontracts',
    'visibility_owner', 'backend',
    'payload_shape_version', 'v1',
    'primary_owner', 'rpc_scope_v1',
    'total_approved', (select count(*)::integer from approved_subcontracts),
    'visible_rows', (select count(*)::integer from filtered_rows),
    'synthetic_rows', (select count(*)::integer from synthetic_rows)
  )
);
$$;

comment on function public.contractor_works_bundle_scope_v1(text, boolean) is
'Contractor works bundle scope v1. Moves contractor works rows, approved subcontract cards, visibility filtering, and synthetic subcontract rows into a backend-owned read contract for first-paint contractor screen loading.';

grant execute on function public.contractor_works_bundle_scope_v1(text, boolean) to authenticated;

commit;
