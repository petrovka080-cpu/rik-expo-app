begin;

create or replace view public.v_contractor_publication_candidates_v1 as
with contractor_registry as (
  select
    c.id::text as contractor_id,
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
    matched.contractor_id as resolved_contractor_id,
    matched.contractor_name as resolved_contractor_name,
    matched.contractor_inn as resolved_contractor_inn
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
'Canonical contractor publication candidates v1. Materializes contractor identity, origin lineage, work snapshot, location snapshot, and publication_state before contractor UI binding.';

create or replace function public.contractor_inbox_scope_v1(
  p_my_contractor_id text default null,
  p_is_staff boolean default false
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with visible_rows as (
  select *
  from public.v_contractor_publication_candidates_v1
  where publication_state = 'ready'
    and (
      p_is_staff
      or (
        nullif(trim(coalesce(p_my_contractor_id, '')), '') is not null
        and contractor_id = nullif(trim(coalesce(p_my_contractor_id, '')), '')
      )
    )
)
select jsonb_build_object(
  'document_type', 'contractor_inbox_scope',
  'version', 'v1',
  'rows', coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'workItemId', vr.work_item_id,
          'progressId', vr.progress_id,
          'publicationState', vr.publication_state,
          'identity', jsonb_build_object(
            'contractorId', vr.contractor_id,
            'contractorName', vr.contractor_name,
            'contractorInn', vr.contractor_inn,
            'contractNumber', vr.contract_number,
            'contractDate', vr.contract_date
          ),
          'origin', jsonb_build_object(
            'sourceKind', vr.source_kind,
            'sourceRequestId', vr.source_request_id,
            'sourceProposalId', vr.source_proposal_id,
            'sourceSubcontractId', vr.source_subcontract_id,
            'directorApprovedAt', vr.director_approved_at
          ),
          'work', jsonb_build_object(
            'workItemId', vr.work_item_id,
            'workName', vr.work_name,
            'workNameSource', vr.work_name_source,
            'quantity', vr.quantity,
            'uom', vr.uom,
            'unitPrice', vr.unit_price,
            'totalAmount', vr.total_amount,
            'isMaterial', vr.is_material
          ),
          'location', jsonb_build_object(
            'objectId', vr.source_request_id,
            'objectName', vr.object_name,
            'systemName', vr.system_name,
            'zoneName', vr.zone_name,
            'floorName', vr.floor_name,
            'locationDisplay', vr.location_display
          ),
          'diagnostics', jsonb_build_object(
            'sourceVersion', vr.source_version
          )
        )
        order by vr.director_approved_at desc nulls last, vr.work_item_id asc
      )
      from visible_rows vr
    ),
    '[]'::jsonb
  ),
  'meta', jsonb_build_object(
    'rowsSource', 'contractor_inbox_scope_v1',
    'candidateView', 'v_contractor_publication_candidates_v1',
    'readyRows', (select count(*)::integer from visible_rows),
    'invalidMissingContractor', (
      select count(*)::integer
      from public.v_contractor_publication_candidates_v1
      where publication_state = 'invalid_missing_contractor'
    ),
    'invalidMissingWorkSnapshot', (
      select count(*)::integer
      from public.v_contractor_publication_candidates_v1
      where publication_state = 'invalid_missing_work_snapshot'
    ),
    'invalidMissingObjectSnapshot', (
      select count(*)::integer
      from public.v_contractor_publication_candidates_v1
      where publication_state = 'invalid_missing_object_snapshot'
    ),
    'invalidMaterialOnly', (
      select count(*)::integer
      from public.v_contractor_publication_candidates_v1
      where publication_state = 'invalid_material_only'
    )
  )
);
$$;

comment on function public.contractor_inbox_scope_v1(text, boolean) is
'Canonical contractor inbox scope v1. Surfaces only ready contractor publications with resolved contractor, work, origin, and location snapshots.';

grant execute on function public.contractor_inbox_scope_v1(text, boolean) to authenticated;

create or replace function public.contractor_fact_scope_v1(
  p_work_item_id text,
  p_my_contractor_id text default null,
  p_is_staff boolean default false
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with target_row as (
  select *
  from public.v_contractor_publication_candidates_v1
  where work_item_id = nullif(trim(coalesce(p_work_item_id, '')), '')
    and publication_state = 'ready'
    and (
      p_is_staff
      or (
        nullif(trim(coalesce(p_my_contractor_id, '')), '') is not null
        and contractor_id = nullif(trim(coalesce(p_my_contractor_id, '')), '')
      )
    )
  limit 1
),
linked_requests as (
  select distinct request_id
  from (
    select tr.source_request_id as request_id
    from target_row tr
    union all
    select r.id::text as request_id
    from target_row tr
    join public.requests r
      on tr.source_subcontract_id is not null
     and (
       r.subcontract_id::text = tr.source_subcontract_id
       or r.contractor_job_id::text = tr.source_subcontract_id
     )
  ) q
  where nullif(trim(coalesce(request_id, '')), '') is not null
),
issue_heads as (
  select
    h.request_id::text as request_id,
    h.submitted_at,
    nullif(trim(h.issue_status), '') as issue_status,
    coalesce(h.qty_issued_sum, 0)::numeric as qty_issued_sum
  from public.v_wh_issue_req_heads_ui h
  where h.request_id::text in (select request_id from linked_requests)
),
issue_scope_requests as (
  select request_id
  from issue_heads
  where submitted_at is null
     or submitted_at::date = current_date
  union
  select request_id
  from linked_requests
  where not exists (
    select 1
    from issue_heads today_issue_heads
    where today_issue_heads.submitted_at is null
       or today_issue_heads.submitted_at::date = current_date
  )
),
consumed_by_code as (
  select
    nullif(trim(wplm.mat_code), '') as mat_code,
    sum(coalesce(wplm.qty_fact, 0))::numeric as qty_used
  from target_row tr
  join public.work_progress_log wpl
    on tr.progress_id is not null
   and wpl.progress_id::text = tr.progress_id
  join public.work_progress_log_materials wplm
    on wplm.log_id = wpl.id
  group by nullif(trim(wplm.mat_code), '')
),
linked_request_cards as (
  select
    r.id::text as request_id,
    coalesce(
      nullif(trim(r.request_no), ''),
      nullif(trim(r.display_no), ''),
      'REQ-' || left(r.id::text, 8)
    ) as req_no,
    coalesce(
      nullif(trim(ih.issue_status), ''),
      nullif(trim(r.status::text), '')
    ) as status,
    coalesce(
      (
        select array_agg(distinct coalesce(nullif(trim(wi.base_no), ''), 'ISSUE-' || left(wi.id::text, 8)) order by coalesce(nullif(trim(wi.base_no), ''), 'ISSUE-' || left(wi.id::text, 8)))
        from public.warehouse_issues wi
        where wi.request_id::text = r.id::text
      ),
      array[]::text[]
    ) as issue_nos
  from linked_requests lr
  join public.requests r
    on r.id::text = lr.request_id
  left join issue_heads ih
    on ih.request_id = r.id::text
),
issued_rows as (
  select
    coalesce(nullif(trim(it.request_item_id::text), ''), it.request_id::text || '-' || row_number() over ()) as issue_item_id,
    nullif(trim(it.rik_code), '') as mat_code,
    it.request_id::text as request_id,
    coalesce(nullif(trim(it.name_human), ''), nullif(trim(it.rik_code), ''), 'Material') as title,
    nullif(trim(it.uom), '') as unit,
    coalesce(it.qty_issued, 0)::numeric as qty,
    greatest(0::numeric, coalesce(it.qty_issued, 0)::numeric - coalesce(cb.qty_used, 0)::numeric) as qty_left,
    coalesce(cb.qty_used, 0)::numeric as qty_used,
    null::numeric as price
  from public.v_wh_issue_req_items_ui it
  left join consumed_by_code cb
    on cb.mat_code = nullif(trim(it.rik_code), '')
  where it.request_id::text in (select request_id from issue_scope_requests)
),
issued_status as (
  select
    case
      when not exists (select 1 from target_row) then 'error'
      when not exists (select 1 from linked_requests) then 'empty'
      when exists (select 1 from issued_rows) then 'ready'
      else 'empty'
    end as status,
    case
      when not exists (select 1 from target_row) then 'not_found'
      when not exists (select 1 from linked_requests) then 'no_approved_requests'
      when exists (select 1 from issued_rows) then null
      when exists (
        select 1
        from public.requests r
        where r.id::text in (select request_id from linked_requests)
          and (
            lower(trim(coalesce(r.status::text, ''))) like '%waiting%'
            or lower(trim(coalesce(r.status::text, ''))) like '%ожидан%'
          )
      ) then 'waiting_requests'
      else 'no_confirmed_warehouse_issues'
    end as message_code
)
select (
  select jsonb_build_object(
    'document_type', 'contractor_fact_scope',
    'version', 'v1',
    'row', jsonb_build_object(
      'workItemId', tr.work_item_id,
      'progressId', tr.progress_id,
      'publicationState', tr.publication_state,
      'identity', jsonb_build_object(
        'contractorId', tr.contractor_id,
        'contractorName', tr.contractor_name,
        'contractorInn', tr.contractor_inn,
        'contractNumber', tr.contract_number,
        'contractDate', tr.contract_date
      ),
      'origin', jsonb_build_object(
        'sourceKind', tr.source_kind,
        'sourceRequestId', tr.source_request_id,
        'sourceProposalId', tr.source_proposal_id,
        'sourceSubcontractId', tr.source_subcontract_id,
        'directorApprovedAt', tr.director_approved_at
      ),
      'work', jsonb_build_object(
        'workItemId', tr.work_item_id,
        'workName', tr.work_name,
        'workNameSource', tr.work_name_source,
        'quantity', tr.quantity,
        'uom', tr.uom,
        'unitPrice', tr.unit_price,
        'totalAmount', tr.total_amount,
        'isMaterial', tr.is_material
      ),
      'location', jsonb_build_object(
        'objectId', tr.source_request_id,
        'objectName', tr.object_name,
        'systemName', tr.system_name,
        'zoneName', tr.zone_name,
        'floorName', tr.floor_name,
        'locationDisplay', tr.location_display
      )
    ),
    'warehouseIssuesPanel', jsonb_build_object(
      'status', (select status from issued_status),
      'messageCode', (select message_code from issued_status),
      'linkedRequestCards', coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'requestId', lrc.request_id,
              'reqNo', lrc.req_no,
              'status', lrc.status,
              'issueNos', to_jsonb(lrc.issue_nos)
            )
            order by lrc.req_no asc
          )
          from linked_request_cards lrc
        ),
        '[]'::jsonb
      ),
      'rows', coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'issueItemId', ir.issue_item_id,
              'matCode', ir.mat_code,
              'requestId', ir.request_id,
              'title', ir.title,
              'unit', ir.unit,
              'qty', ir.qty,
              'qtyLeft', ir.qty_left,
              'qtyUsed', ir.qty_used,
              'price', ir.price,
              'sum', null
            )
            order by ir.title asc, ir.issue_item_id asc
          )
          from issued_rows ir
        ),
        '[]'::jsonb
      )
    ),
    'meta', jsonb_build_object(
      'sourceVersion', tr.source_version,
      'candidateView', 'v_contractor_publication_candidates_v1',
      'linkedRequestCount', (select count(*)::integer from linked_requests),
      'issuedRowCount', (select count(*)::integer from issued_rows)
    )
  )
  from target_row tr
);
$$;

comment on function public.contractor_fact_scope_v1(text, text, boolean) is
'Canonical contractor fact scope v1. Returns one ready contractor publication plus warehouse issues panel state from backend-owned lineage.';

grant execute on function public.contractor_fact_scope_v1(text, text, boolean) to authenticated;

commit;
