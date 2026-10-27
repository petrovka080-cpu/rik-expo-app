begin;

create or replace view public.v_contractor_publication_candidates_v1 as
with contractor_registry as (
  select
    c.id::text as contractor_id,
    c.user_id::text as contractor_user_id,
    nullif(trim(c.company_name), '') as contractor_name,
    nullif(trim(c.inn), '') as contractor_inn,
    regexp_replace(coalesce(c.inn, ''), '\D', '', 'g') as contractor_inn_digits,
    lower(regexp_replace(trim(coalesce(c.company_name, '')), E'\s+', ' ', 'g')) as contractor_key
  from public.contractors c
),
approved_subcontracts as (
  select
    s.id::text as subcontract_id,
    s.created_at,
    s.approved_at,
    nullif(trim(s.contractor_org), '') as contractor_org,
    nullif(trim(s.contractor_inn), '') as contractor_inn,
    regexp_replace(coalesce(s.contractor_inn, ''), '\D', '', 'g') as contractor_inn_digits,
    lower(regexp_replace(trim(coalesce(s.contractor_org, '')), E'\s+', ' ', 'g')) as contractor_key,
    nullif(trim(s.contract_number), '') as contract_number,
    s.contract_date::text as contract_date,
    nullif(trim(s.object_name), '') as object_name,
    nullif(trim(s.work_type), '') as work_type,
    nullif(trim(s.work_zone), '') as work_zone,
    coalesce(s.qty_planned, 0)::numeric as qty_planned,
    nullif(trim(s.uom), '') as uom,
    s.price_per_unit::numeric as price_per_unit,
    s.total_price::numeric as total_price,
    nullif(trim(s.work_mode), '') as work_mode,
    s.created_by,
    creator.role as creator_role
  from public.subcontracts s
  left join public.profiles creator
    on creator.user_id = s.created_by
  where lower(trim(coalesce(s.status, ''))) = 'approved'
),
approved_subcontracts_resolved as (
  select
    aps.*,
    coalesce(matched.contractor_id, creator_ctr.contractor_id) as resolved_contractor_id,
    coalesce(matched.contractor_name, creator_ctr.contractor_name) as resolved_contractor_name,
    coalesce(matched.contractor_inn, creator_ctr.contractor_inn) as resolved_contractor_inn
  from approved_subcontracts aps
  left join lateral (
    select
      cr.contractor_id,
      cr.contractor_name,
      cr.contractor_inn
    from contractor_registry cr
    where (
      aps.contractor_inn_digits <> ''
      and cr.contractor_inn_digits = aps.contractor_inn_digits
    ) or (
      aps.contractor_key <> ''
      and cr.contractor_key = aps.contractor_key
    )
    order by
      case
        when aps.contractor_inn_digits <> ''
          and cr.contractor_inn_digits = aps.contractor_inn_digits then 0
        when aps.contractor_key <> ''
          and cr.contractor_key = aps.contractor_key then 1
        else 2
      end,
      cr.contractor_name asc nulls last,
      cr.contractor_id asc
    limit 1
  ) matched on true
  left join contractor_registry creator_ctr
    on creator_ctr.contractor_user_id = aps.created_by::text
),
progress_candidates as (
  select
    'progress:' || coalesce(vw.progress_id::text, wp.id::text) as work_item_id,
    coalesce(vw.progress_id::text, wp.id::text) as progress_id,
    req.id::text as source_request_id,
    null::text as source_proposal_id,
    coalesce(req.subcontract_id::text, req.contractor_job_id::text, aps.subcontract_id) as source_subcontract_id,
    case
      when lower(trim(coalesce(req.role, ''))) = 'buyer' then 'buyer_subcontract'
      when lower(trim(coalesce(req.role, ''))) = 'foreman'
        and coalesce(req.subcontract_id::text, req.contractor_job_id::text, aps.subcontract_id) is not null
        then 'foreman_subcontract_request'
      when lower(trim(coalesce(req.role, ''))) = 'foreman' then 'foreman_material_request'
      when lower(trim(coalesce(aps.creator_role, ''))) = 'buyer' then 'buyer_subcontract'
      when aps.subcontract_id is not null then 'foreman_subcontract_request'
      else 'foreman_material_request'
    end as source_kind,
    coalesce(aps.approved_at, req.submitted_at, vw.created_at, wp.created_at)::text as director_approved_at,
    coalesce(direct_ctr.contractor_id, aps.resolved_contractor_id, matched_ctr.contractor_id) as contractor_id,
    coalesce(direct_ctr.contractor_name, aps.resolved_contractor_name, matched_ctr.contractor_name) as contractor_name,
    coalesce(
      direct_ctr.contractor_inn,
      aps.contractor_inn,
      aps.resolved_contractor_inn,
      matched_ctr.contractor_inn,
      nullif(trim(req.company_inn_snapshot), '')
    ) as contractor_inn,
    aps.contract_number,
    aps.contract_date,
    coalesce(
      nullif(trim(vw.work_name), ''),
      nullif(trim(ri.name_human), ''),
      nullif(trim(aps.work_type), ''),
      nullif(trim(vw.work_code), '')
    ) as work_name,
    case
      when nullif(trim(vw.work_name), '') is not null
        or nullif(trim(ri.name_human), '') is not null
        or nullif(trim(aps.work_type), '') is not null
        then 'snapshot'
      when nullif(trim(vw.work_code), '') is not null then 'raw_code'
      else 'resolver'
    end as work_name_source,
    coalesce(
      ri.qty::numeric,
      vw.qty_planned::numeric,
      wp.qty_planned::numeric,
      aps.qty_planned::numeric
    ) as quantity,
    coalesce(
      nullif(trim(ri.uom), ''),
      nullif(trim(vw.uom_id), ''),
      nullif(trim(wp.uom), ''),
      aps.uom
    ) as uom,
    coalesce(pi.price_per_unit::numeric, aps.price_per_unit) as unit_price,
    coalesce(
      pi.amount::numeric,
      aps.total_price,
      coalesce(pi.price_per_unit::numeric, aps.price_per_unit)
        * coalesce(ri.qty::numeric, vw.qty_planned::numeric, wp.qty_planned::numeric, aps.qty_planned::numeric, 0::numeric)
    ) as total_amount,
    coalesce(
      nullif(trim(req.object_name), ''),
      nullif(trim(vw.object_name), ''),
      nullif(trim(aps.object_name), ''),
      nullif(trim(rot.display_name), ''),
      nullif(trim(rot.name_human_ru), ''),
      nullif(trim(rot.name_ru), ''),
      nullif(trim(rot.name), ''),
      nullif(trim(req.object_type_code), '')
    ) as object_name,
    coalesce(
      nullif(trim(rs.display_name), ''),
      nullif(trim(rs.name_human_ru), ''),
      nullif(trim(rs.name_ru), ''),
      nullif(trim(rs.name), ''),
      nullif(trim(req.system_code), '')
    ) as system_name,
    coalesce(
      nullif(trim(rz.display_name), ''),
      nullif(trim(rz.name_human_ru), ''),
      nullif(trim(rz.name_ru), ''),
      nullif(trim(rz.name), ''),
      nullif(trim(req.zone_code), ''),
      aps.work_zone
    ) as zone_name,
    coalesce(
      nullif(trim(rl.display_name), ''),
      nullif(trim(rl.name_human_ru), ''),
      nullif(trim(rl.name_ru), ''),
      nullif(trim(rl.name), ''),
      nullif(trim(req.level_code), '')
    ) as floor_name,
    nullif(
      trim(
        concat_ws(
          ' / ',
          coalesce(
            nullif(trim(req.object_name), ''),
            nullif(trim(vw.object_name), ''),
            nullif(trim(aps.object_name), ''),
            nullif(trim(rot.display_name), ''),
            nullif(trim(rot.name_human_ru), ''),
            nullif(trim(rot.name_ru), ''),
            nullif(trim(rot.name), ''),
            nullif(trim(req.object_type_code), '')
          ),
          coalesce(
            nullif(trim(rs.display_name), ''),
            nullif(trim(rs.name_human_ru), ''),
            nullif(trim(rs.name_ru), ''),
            nullif(trim(rs.name), ''),
            nullif(trim(req.system_code), '')
          ),
          coalesce(
            nullif(trim(rz.display_name), ''),
            nullif(trim(rz.name_human_ru), ''),
            nullif(trim(rz.name_ru), ''),
            nullif(trim(rz.name), ''),
            nullif(trim(req.zone_code), ''),
            aps.work_zone
          ),
          coalesce(
            nullif(trim(rl.display_name), ''),
            nullif(trim(rl.name_human_ru), ''),
            nullif(trim(rl.name_ru), ''),
            nullif(trim(rl.name), ''),
            nullif(trim(req.level_code), '')
          )
        )
      ),
      ''
    ) as location_display,
    case
      when lower(trim(coalesce(ri.kind, ri.item_kind, ''))) = 'material' then true
      when lower(trim(coalesce(ri.kind, ri.item_kind, ''))) in ('work', 'service') then false
      when upper(coalesce(vw.work_code, '')) like 'MAT-%'
        or upper(coalesce(vw.work_code, '')) like 'KIT-%'
        or upper(coalesce(vw.work_code, '')) like 'FACTOR-%'
        or upper(coalesce(vw.work_code, '')) like 'GENERIC-%'
        or upper(coalesce(vw.work_code, '')) like 'AUX-%'
        or upper(coalesce(vw.work_code, '')) like 'SUP-%'
        or upper(coalesce(vw.work_code, '')) like 'TEST-%'
        or upper(coalesce(vw.work_code, '')) like 'WRK-META-K-%'
        then true
      else false
    end as is_material,
    'v1'::text as source_version
  from public.v_works_fact vw
  left join public.work_progress wp
    on wp.id::text = vw.progress_id::text
  left join public.purchase_items pi
    on pi.id::text = coalesce(vw.purchase_item_id::text, wp.purchase_item_id::text)
  left join public.request_items ri
    on ri.id::text = pi.request_item_id::text
  left join public.requests req
    on req.id::text = ri.request_id::text
  left join approved_subcontracts_resolved aps
    on aps.subcontract_id = coalesce(req.subcontract_id::text, req.contractor_job_id::text)
  left join contractor_registry direct_ctr
    on direct_ctr.contractor_id = coalesce(vw.contractor_id::text, wp.contractor_id::text)
  left join lateral (
    select
      cr.contractor_id,
      cr.contractor_name,
      cr.contractor_inn
    from contractor_registry cr
    where (
      regexp_replace(coalesce(req.company_inn_snapshot, ''), '\D', '', 'g') <> ''
      and cr.contractor_inn_digits = regexp_replace(coalesce(req.company_inn_snapshot, ''), '\D', '', 'g')
    ) or (
      lower(regexp_replace(trim(coalesce(req.company_name_snapshot, '')), E'\s+', ' ', 'g')) <> ''
      and cr.contractor_key = lower(regexp_replace(trim(coalesce(req.company_name_snapshot, '')), E'\s+', ' ', 'g'))
    )
    order by
      case
        when regexp_replace(coalesce(req.company_inn_snapshot, ''), '\D', '', 'g') <> ''
          and cr.contractor_inn_digits = regexp_replace(coalesce(req.company_inn_snapshot, ''), '\D', '', 'g') then 0
        when lower(regexp_replace(trim(coalesce(req.company_name_snapshot, '')), E'\s+', ' ', 'g')) <> ''
          and cr.contractor_key = lower(regexp_replace(trim(coalesce(req.company_name_snapshot, '')), E'\s+', ' ', 'g')) then 1
        else 2
      end,
      cr.contractor_name asc nulls last,
      cr.contractor_id asc
    limit 1
  ) matched_ctr on true
  left join public.ref_object_types rot
    on rot.code = req.object_type_code
  left join public.ref_systems rs
    on rs.code = req.system_code
  left join public.ref_zones rz
    on rz.code = req.zone_code
  left join public.ref_levels rl
    on rl.code = req.level_code
  where coalesce(vw.progress_id::text, wp.id::text, '') <> ''
),
progress_scored as (
  select
    pc.*,
    case
      when pc.is_material then 'invalid_material_only'
      when coalesce(trim(pc.contractor_id), '') = '' or coalesce(trim(pc.contractor_name), '') = '' then 'invalid_missing_contractor'
      when coalesce(trim(pc.work_name), '') = '' then 'invalid_missing_work_snapshot'
      when coalesce(trim(pc.object_name), '') = '' and coalesce(trim(pc.location_display), '') = '' then 'invalid_missing_object_snapshot'
      else 'ready'
    end as publication_state
  from progress_candidates pc
),
ready_progress_subcontracts as (
  select distinct source_subcontract_id
  from progress_scored
  where publication_state = 'ready'
    and source_subcontract_id is not null
),
synthetic_subcontract_candidates as (
  select
    'subcontract:' || aps.subcontract_id as work_item_id,
    null::text as progress_id,
    linked_req.id::text as source_request_id,
    null::text as source_proposal_id,
    aps.subcontract_id as source_subcontract_id,
    case
      when lower(trim(coalesce(linked_req.role, aps.creator_role, ''))) = 'buyer' then 'buyer_subcontract'
      else 'foreman_subcontract_request'
    end as source_kind,
    coalesce(aps.approved_at, linked_req.submitted_at, aps.created_at)::text as director_approved_at,
    aps.resolved_contractor_id as contractor_id,
    aps.resolved_contractor_name as contractor_name,
    coalesce(aps.contractor_inn, aps.resolved_contractor_inn) as contractor_inn,
    aps.contract_number,
    aps.contract_date,
    coalesce(aps.work_type, 'Work') as work_name,
    'snapshot'::text as work_name_source,
    aps.qty_planned as quantity,
    aps.uom,
    aps.price_per_unit as unit_price,
    aps.total_price as total_amount,
    aps.object_name,
    null::text as system_name,
    aps.work_zone as zone_name,
    null::text as floor_name,
    nullif(trim(concat_ws(' / ', aps.object_name, aps.work_zone)), '') as location_display,
    case
      when lower(trim(coalesce(aps.work_mode, ''))) in ('material_only', 'materials', 'material') then true
      else false
    end as is_material,
    'v1'::text as source_version
  from approved_subcontracts_resolved aps
  left join lateral (
    select
      r.id,
      r.role,
      r.submitted_at
    from public.requests r
    where r.subcontract_id::text = aps.subcontract_id
       or r.contractor_job_id::text = aps.subcontract_id
    order by r.submitted_at desc nulls last, r.created_at desc nulls last, r.id desc
    limit 1
  ) linked_req on true
  left join ready_progress_subcontracts ready_progress
    on ready_progress.source_subcontract_id = aps.subcontract_id
  where ready_progress.source_subcontract_id is null
),
synthetic_scored as (
  select
    sc.*,
    case
      when sc.is_material then 'invalid_material_only'
      when coalesce(trim(sc.contractor_id), '') = '' or coalesce(trim(sc.contractor_name), '') = '' then 'invalid_missing_contractor'
      when coalesce(trim(sc.work_name), '') = '' then 'invalid_missing_work_snapshot'
      when coalesce(trim(sc.object_name), '') = '' and coalesce(trim(sc.location_display), '') = '' then 'invalid_missing_object_snapshot'
      else 'ready'
    end as publication_state
  from synthetic_subcontract_candidates sc
)
select *
from progress_scored
union all
select *
from synthetic_scored;

comment on view public.v_contractor_publication_candidates_v1 is
'Canonical contractor publication candidates v1 with creator-owned contractor recovery for approved subcontracts.';

commit;
