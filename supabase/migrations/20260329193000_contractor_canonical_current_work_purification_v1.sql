begin;

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
with base_rows as (
  select
    vr.work_item_id,
    vr.progress_id,
    vr.publication_state,
    vr.source_kind,
    vr.source_request_id,
    vr.source_proposal_id,
    vr.source_subcontract_id,
    vr.director_approved_at,
    vr.contractor_id,
    coalesce(
      nullif(trim(sub.contractor_org), ''),
      nullif(trim(req.company_name_snapshot), ''),
      nullif(trim(vr.contractor_name), '')
    ) as contractor_name,
    case
      when nullif(trim(sub.contractor_org), '') is not null then 'subcontract_snapshot'
      when nullif(trim(req.company_name_snapshot), '') is not null then 'request_snapshot'
      else 'canonical_view'
    end as contractor_name_source,
    coalesce(
      nullif(trim(sub.contractor_inn), ''),
      nullif(trim(req.company_inn_snapshot), ''),
      nullif(trim(vr.contractor_inn), '')
    ) as contractor_inn,
    vr.contract_number,
    vr.contract_date,
    coalesce(
      case
        when vr.progress_id is not null
          and nullif(trim(vr.work_name), '') is not null
          and not (nullif(trim(vr.work_name), '') ~ '^[A-Z0-9]+(?:-[A-Z0-9]+)+$')
          then nullif(trim(vr.work_name), '')
        else null
      end,
      case
        when nullif(trim(req_item.name_human), '') is not null
          and not (nullif(trim(req_item.name_human), '') ~ '^[A-Z0-9]+(?:-[A-Z0-9]+)+$')
          then nullif(trim(req_item.name_human), '')
        else null
      end,
      case
        when nullif(trim(sub.work_type), '') is not null
          and not (nullif(trim(sub.work_type), '') ~ '^[A-Z0-9]+(?:-[A-Z0-9]+)+$')
          then nullif(trim(sub.work_type), '')
        else null
      end,
      nullif(trim(sys_req.display_name), ''),
      nullif(trim(sys_req.name_human_ru), ''),
      nullif(trim(sys_req.name_ru), ''),
      nullif(trim(sys_req.name), ''),
      nullif(trim(sys_sub.display_name), ''),
      nullif(trim(sys_sub.name_human_ru), ''),
      nullif(trim(sys_sub.name_ru), ''),
      nullif(trim(sys_sub.name), ''),
      nullif(trim(vr.work_name), ''),
      nullif(trim(sub.work_type), '')
    ) as work_name,
    case
      when vr.progress_id is not null
        and nullif(trim(vr.work_name), '') is not null
        and not (nullif(trim(vr.work_name), '') ~ '^[A-Z0-9]+(?:-[A-Z0-9]+)+$')
        then coalesce(nullif(trim(vr.work_name_source), ''), 'snapshot')
      when nullif(trim(req_item.name_human), '') is not null
        and not (nullif(trim(req_item.name_human), '') ~ '^[A-Z0-9]+(?:-[A-Z0-9]+)+$')
        then 'snapshot'
      when nullif(trim(sub.work_type), '') is not null
        and not (nullif(trim(sub.work_type), '') ~ '^[A-Z0-9]+(?:-[A-Z0-9]+)+$')
        then 'snapshot'
      when coalesce(
        nullif(trim(sys_req.display_name), ''),
        nullif(trim(sys_req.name_human_ru), ''),
        nullif(trim(sys_req.name_ru), ''),
        nullif(trim(sys_req.name), ''),
        nullif(trim(sys_sub.display_name), ''),
        nullif(trim(sys_sub.name_human_ru), ''),
        nullif(trim(sys_sub.name_ru), ''),
        nullif(trim(sys_sub.name), '')
      ) is not null then 'resolver'
      else 'raw_code'
    end as work_name_source,
    coalesce(req_item.qty, vr.quantity, sub.qty_planned::numeric) as quantity,
    coalesce(nullif(trim(req_item.uom), ''), nullif(trim(vr.uom), ''), nullif(trim(sub.uom), '')) as uom,
    coalesce(vr.unit_price, sub.price_per_unit::numeric) as unit_price,
    coalesce(vr.total_amount, sub.total_price::numeric) as total_amount,
    coalesce(
      case
        when nullif(trim(req.object_name), '') is not null
          and not (nullif(trim(req.object_name), '') ~ '^[A-Z0-9]+(?:-[A-Z0-9]+)+$')
          then nullif(trim(req.object_name), '')
        else null
      end,
      case
        when nullif(trim(vr.object_name), '') is not null
          and not (nullif(trim(vr.object_name), '') ~ '^[A-Z0-9]+(?:-[A-Z0-9]+)+$')
          then nullif(trim(vr.object_name), '')
        else null
      end,
      case
        when nullif(trim(sub.object_name), '') is not null
          and not (nullif(trim(sub.object_name), '') ~ '^[A-Z0-9]+(?:-[A-Z0-9]+)+$')
          then nullif(trim(sub.object_name), '')
        else null
      end,
      nullif(trim(obj_req.display_name), ''),
      nullif(trim(obj_req.name_human_ru), ''),
      nullif(trim(obj_req.name_ru), ''),
      nullif(trim(obj_req.name), ''),
      nullif(trim(obj_sub.display_name), ''),
      nullif(trim(obj_sub.name_human_ru), ''),
      nullif(trim(obj_sub.name_ru), ''),
      nullif(trim(obj_sub.name), ''),
      nullif(trim(vr.object_name), ''),
      nullif(trim(sub.object_name), '')
    ) as object_name,
    case
      when nullif(trim(req.object_name), '') is not null
        and not (nullif(trim(req.object_name), '') ~ '^[A-Z0-9]+(?:-[A-Z0-9]+)+$')
        then 'request_snapshot'
      when nullif(trim(vr.object_name), '') is not null
        and not (nullif(trim(vr.object_name), '') ~ '^[A-Z0-9]+(?:-[A-Z0-9]+)+$')
        then 'canonical_view'
      when nullif(trim(sub.object_name), '') is not null
        and not (nullif(trim(sub.object_name), '') ~ '^[A-Z0-9]+(?:-[A-Z0-9]+)+$')
        then 'subcontract_snapshot'
      when coalesce(
        nullif(trim(obj_req.display_name), ''),
        nullif(trim(obj_req.name_human_ru), ''),
        nullif(trim(obj_req.name_ru), ''),
        nullif(trim(obj_req.name), ''),
        nullif(trim(obj_sub.display_name), ''),
        nullif(trim(obj_sub.name_human_ru), ''),
        nullif(trim(obj_sub.name_ru), ''),
        nullif(trim(obj_sub.name), '')
      ) is not null then 'resolver'
      else 'raw_code'
    end as object_name_source,
    coalesce(
      case
        when nullif(trim(vr.system_name), '') is not null
          and not (nullif(trim(vr.system_name), '') ~ '^[A-Z0-9]+(?:-[A-Z0-9]+)+$')
          then nullif(trim(vr.system_name), '')
        else null
      end,
      nullif(trim(sys_req.display_name), ''),
      nullif(trim(sys_req.name_human_ru), ''),
      nullif(trim(sys_req.name_ru), ''),
      nullif(trim(sys_req.name), ''),
      nullif(trim(sys_sub.display_name), ''),
      nullif(trim(sys_sub.name_human_ru), ''),
      nullif(trim(sys_sub.name_ru), ''),
      nullif(trim(sys_sub.name), '')
    ) as system_name,
    coalesce(
      case
        when nullif(trim(vr.zone_name), '') is not null
          and not (nullif(trim(vr.zone_name), '') ~ '^[A-Z0-9]+(?:-[A-Z0-9]+)+$')
          then nullif(trim(vr.zone_name), '')
        else null
      end,
      nullif(trim(zone_req.display_name), ''),
      nullif(trim(zone_req.name_human_ru), ''),
      nullif(trim(zone_req.name_ru), ''),
      nullif(trim(zone_req.name), ''),
      nullif(trim(zone_sub.display_name), ''),
      nullif(trim(zone_sub.name_human_ru), ''),
      nullif(trim(zone_sub.name_ru), ''),
      nullif(trim(zone_sub.name), ''),
      nullif(trim(level_req.display_name), ''),
      nullif(trim(level_req.name_human_ru), ''),
      nullif(trim(level_req.name_ru), ''),
      nullif(trim(level_req.name), ''),
      nullif(trim(level_sub.display_name), ''),
      nullif(trim(level_sub.name_human_ru), ''),
      nullif(trim(level_sub.name_ru), ''),
      nullif(trim(level_sub.name), '')
    ) as zone_name,
    coalesce(
      case
        when nullif(trim(vr.floor_name), '') is not null
          and not (nullif(trim(vr.floor_name), '') ~ '^[A-Z0-9]+(?:-[A-Z0-9]+)+$')
          then nullif(trim(vr.floor_name), '')
        else null
      end,
      nullif(trim(level_req.display_name), ''),
      nullif(trim(level_req.name_human_ru), ''),
      nullif(trim(level_req.name_ru), ''),
      nullif(trim(level_req.name), ''),
      nullif(trim(level_sub.display_name), ''),
      nullif(trim(level_sub.name_human_ru), ''),
      nullif(trim(level_sub.name_ru), ''),
      nullif(trim(level_sub.name), '')
    ) as floor_name,
    vr.is_material,
    nullif(trim(req.status::text), '') as linked_request_status,
    'v2'::text as source_version
  from public.v_contractor_publication_candidates_v1 vr
  left join public.subcontracts sub
    on sub.id::text = vr.source_subcontract_id
  left join lateral (
    select
      r.id,
      r.status,
      r.object_type_code,
      r.object_name,
      r.system_code,
      r.zone_code,
      r.level_code,
      r.company_name_snapshot,
      r.company_inn_snapshot
    from public.requests r
    where (
      vr.source_request_id is not null
      and r.id::text = vr.source_request_id
    ) or (
      vr.source_request_id is null
      and vr.source_subcontract_id is not null
      and (
        r.subcontract_id::text = vr.source_subcontract_id
        or r.contractor_job_id::text = vr.source_subcontract_id
      )
    )
    order by
      case
        when lower(trim(coalesce(r.status::text, ''))) in ('утверждено', 'approved') then 0
        when lower(trim(coalesce(r.status::text, ''))) like '%закуп%' then 1
        when lower(trim(coalesce(r.status::text, ''))) like '%утвержд%' then 2
        when lower(trim(coalesce(r.status::text, ''))) like '%чернов%' then 4
        else 3
      end,
      r.submitted_at desc nulls last,
      r.created_at desc nulls last,
      r.id desc
    limit 1
  ) req on true
  left join lateral (
    select
      nullif(trim(ri.name_human), '') as name_human,
      ri.qty::numeric as qty,
      nullif(trim(ri.uom), '') as uom
    from public.request_items ri
    where req.id is not null
      and ri.request_id::text = req.id::text
    order by
      case
        when nullif(trim(ri.name_human), '') is not null
          and not (nullif(trim(ri.name_human), '') ~ '^[A-Z0-9]+(?:-[A-Z0-9]+)+$') then 0
        else 1
      end,
      ri.id desc
    limit 1
  ) req_item on true
  left join public.ref_object_types obj_req
    on obj_req.code = req.object_type_code
  left join public.ref_object_types obj_sub
    on obj_sub.code = sub.object_name
  left join public.ref_systems sys_req
    on sys_req.code = req.system_code
  left join public.ref_systems sys_sub
    on sys_sub.code = sub.work_type
  left join public.ref_zones zone_req
    on zone_req.code = req.zone_code
  left join public.ref_zones zone_sub
    on zone_sub.code = sub.work_zone
  left join public.ref_levels level_req
    on level_req.code = req.level_code
  left join public.ref_levels level_sub
    on level_sub.code = sub.work_zone
  where vr.publication_state = 'ready'
    and (
      p_is_staff
      or (
        nullif(trim(coalesce(p_my_contractor_id, '')), '') is not null
        and vr.contractor_id = nullif(trim(coalesce(p_my_contractor_id, '')), '')
      )
    )
),
classified_rows as (
  select
    br.*,
    nullif(
      trim(
        concat_ws(
          ' / ',
          br.object_name,
          br.system_name,
          br.zone_name,
          br.floor_name
        )
      ),
      ''
    ) as location_display,
    case
      when br.work_name_source <> 'raw_code'
        and coalesce(trim(br.work_name), '') <> '' then true
      else false
    end as has_human_title,
    case
      when br.object_name_source <> 'raw_code'
        and coalesce(trim(br.object_name), '') <> '' then true
      else false
    end as has_current_object_context
  from base_rows br
),
scoped_rows as (
  select
    cr.*,
    case
      when cr.progress_id is not null and cr.has_current_object_context and cr.has_human_title then 'ready_current'
      when cr.progress_id is not null and cr.has_current_object_context then 'ready_current_degraded_title'
      when lower(trim(coalesce(cr.linked_request_status, ''))) like '%чернов%' then 'historical_excluded'
      when lower(trim(coalesce(cr.linked_request_status, ''))) = 'draft' then 'historical_excluded'
      when cr.has_current_object_context and cr.has_human_title then 'ready_current'
      when cr.has_current_object_context then 'ready_current_degraded_title'
      else 'legacy_filtered_out'
    end as current_work_state,
    case
      when (
        case
          when cr.progress_id is not null and cr.has_current_object_context and cr.has_human_title then 'ready_current'
          when cr.progress_id is not null and cr.has_current_object_context then 'ready_current_degraded_title'
          when lower(trim(coalesce(cr.linked_request_status, ''))) like '%чернов%' then 'historical_excluded'
          when lower(trim(coalesce(cr.linked_request_status, ''))) = 'draft' then 'historical_excluded'
          when cr.has_current_object_context and cr.has_human_title then 'ready_current'
          when cr.has_current_object_context then 'ready_current_degraded_title'
          else 'legacy_filtered_out'
        end
      ) in ('ready_current', 'ready_current_degraded_title') then true
      else false
    end as is_current_visible_work
  from classified_rows cr
),
visible_rows as (
  select *
  from scoped_rows
  where is_current_visible_work = true
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
          'publicationState', 'ready',
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
            'locationDisplay', coalesce(vr.location_display, vr.object_name)
          ),
          'diagnostics', jsonb_build_object(
            'sourceVersion', vr.source_version,
            'currentWorkState', vr.current_work_state,
            'contractorNameSource', vr.contractor_name_source,
            'objectNameSource', vr.object_name_source,
            'eligibility', jsonb_build_object(
              'isApprovedWork', true,
              'isCurrentVisibleWork', vr.is_current_visible_work,
              'isLegacyHistoricalRow', vr.current_work_state in ('legacy_filtered_out', 'historical_excluded'),
              'hasHumanTitle', vr.has_human_title,
              'hasCurrentObjectContext', vr.has_current_object_context
            )
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
    'candidateView', 'contractor_inbox_scope_v1/purified',
    'readyRows', (select count(*)::integer from visible_rows),
    'scopeReadyCandidates', (select count(*)::integer from scoped_rows),
    'readyCurrentRows', (
      select count(*)::integer
      from scoped_rows
      where current_work_state = 'ready_current'
    ),
    'readyCurrentDegradedTitle', (
      select count(*)::integer
      from scoped_rows
      where current_work_state = 'ready_current_degraded_title'
    ),
    'legacyFilteredOut', (
      select count(*)::integer
      from scoped_rows
      where current_work_state = 'legacy_filtered_out'
    ),
    'historicalExcluded', (
      select count(*)::integer
      from scoped_rows
      where current_work_state = 'historical_excluded'
    ),
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
'Canonical contractor inbox scope v1 purified for current approved works. Publishes only current contractor rows, resolves human contractor/title/object fields from subcontract/request snapshots and resolvers, and keeps legacy/historical rows out of the primary screen source.';

grant execute on function public.contractor_inbox_scope_v1(text, boolean) to authenticated;

commit;
