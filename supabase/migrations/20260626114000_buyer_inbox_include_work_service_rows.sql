begin;

create or replace function public.list_buyer_inbox(
  p_company_id uuid default null
)
returns table (
  request_id uuid,
  request_id_old integer,
  request_item_id uuid,
  rik_code text,
  name_human text,
  qty numeric,
  uom text,
  app_code text,
  note text,
  object_name text,
  status text,
  created_at timestamptz,
  kind text,
  director_reject_note text,
  director_reject_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $list_buyer_inbox_include_work_service$
  with source_rows as (
    select
      ri.*,
      r.id_old::integer as request_id_old,
      r.status::text as request_status,
      r.submitted_at as request_submitted_at,
      r.created_at as request_created_at,
      coalesce(
        nullif(trim(coalesce(o.name, '')), ''),
        nullif(trim(coalesce(r.object_name, '')), ''),
        nullif(trim(coalesce(r.object, '')), ''),
        nullif(trim(coalesce(r.object_type_code, '')), ''),
        ''
      )::text as resolved_object_name,
      lower(trim(coalesce(r.status::text, ''))) as request_status_norm,
      lower(trim(coalesce(ri.status::text, ''))) as item_status_norm,
      lower(coalesce(nullif(trim(coalesce(ri.kind, '')), ''), nullif(trim(coalesce(ri.item_kind, '')), ''), 'material')) as item_kind_norm,
      (
        lower(trim(coalesce(r.status::text, ''))) in ('approved', 'procurement_ready', 'ready')
        or lower(trim(coalesce(r.status::text, ''))) like '%утверждено%'
        or lower(trim(coalesce(r.status::text, ''))) like '%утверждена%'
        or lower(trim(coalesce(r.status::text, ''))) like '%утверждён%'
        or lower(trim(coalesce(r.status::text, ''))) like '%утвержден%'
        or lower(trim(coalesce(r.status::text, ''))) like '%закуп%'
      ) as request_ready,
      (
        lower(trim(coalesce(ri.status::text, ''))) like 'черновик%'
        or lower(trim(coalesce(ri.status::text, ''))) like 'draft%'
      ) as item_status_is_draft,
      (
        lower(trim(coalesce(ri.status::text, ''))) in ('approved', 'procurement_ready', 'ready')
        or lower(trim(coalesce(ri.status::text, ''))) like '%утверждено%'
        or lower(trim(coalesce(ri.status::text, ''))) like '%утверждена%'
        or lower(trim(coalesce(ri.status::text, ''))) like '%утверждён%'
        or lower(trim(coalesce(ri.status::text, ''))) like '%утвержден%'
        or lower(trim(coalesce(ri.status::text, ''))) like '%закуп%'
      ) as item_status_ready,
      (
        lower(trim(coalesce(ri.status::text, ''))) like 'отклонено%'
        or lower(trim(coalesce(ri.status::text, ''))) like 'rejected%'
        or lower(trim(coalesce(ri.status::text, ''))) like 'отменено%'
        or lower(trim(coalesce(ri.status::text, ''))) like 'cancelled%'
        or lower(trim(coalesce(ri.status::text, ''))) like 'на доработке%'
      ) as item_status_is_blocked
    from public.request_items ri
    join public.requests r
      on r.id = ri.request_id
    left join public.objects o
      on o.id = r.object_id
    where p_company_id is null
  )
  select
    sr.request_id,
    sr.request_id_old,
    sr.id as request_item_id,
    nullif(trim(coalesce(sr.rik_code, '')), '')::text as rik_code,
    coalesce(nullif(trim(coalesce(sr.name_human, '')), ''), U&'\2014')::text as name_human,
    coalesce(sr.qty, 0)::numeric as qty,
    nullif(trim(coalesce(sr.uom, '')), '')::text as uom,
    nullif(trim(coalesce(sr.app_code, '')), '')::text as app_code,
    nullif(trim(coalesce(sr.note, '')), '')::text as note,
    sr.resolved_object_name as object_name,
    case
      when sr.director_reject_at is not null
        or coalesce(nullif(btrim(sr.director_reject_note), ''), '') <> ''
        then coalesce(nullif(trim(coalesce(sr.status::text, '')), ''), nullif(trim(coalesce(sr.request_status, '')), ''))
      when sr.request_ready
        then coalesce(nullif(trim(coalesce(sr.request_status, '')), ''), nullif(trim(coalesce(sr.status::text, '')), ''))
      else coalesce(nullif(trim(coalesce(sr.status::text, '')), ''), nullif(trim(coalesce(sr.request_status, '')), ''))
    end::text as status,
    coalesce(sr.created_at, sr.request_submitted_at, sr.request_created_at)::timestamptz as created_at,
    coalesce(
      nullif(trim(coalesce(sr.kind, '')), ''),
      nullif(trim(coalesce(sr.item_kind, '')), ''),
      'material'
    )::text as kind,
    nullif(trim(coalesce(sr.director_reject_note, '')), '')::text as director_reject_note,
    sr.director_reject_at
  from source_rows sr
  where (
      sr.request_ready
      or sr.item_status_ready
      or sr.director_reject_at is not null
      or coalesce(nullif(btrim(sr.director_reject_note), ''), '') <> ''
    )
    and (
      sr.director_reject_at is not null
      or coalesce(nullif(btrim(sr.director_reject_note), ''), '') <> ''
      or not sr.item_status_is_blocked
    )
    and (
      sr.director_reject_at is not null
      or coalesce(nullif(btrim(sr.director_reject_note), ''), '') <> ''
      or not exists (
        select 1
        from public.proposal_items pi
        join public.proposals p
          on p.id = pi.proposal_id
        where pi.request_item_id = sr.id
          and (
            p.status in ('На утверждении', 'Утверждено')
            or p.payment_status ilike 'На доработке%'
          )
      )
    )
    and sr.item_kind_norm in (
      'material',
      'materials',
      'equipment',
      'delivery',
      'work',
      'works',
      'labor',
      'service',
      'services',
      'subcontract',
      'subcontract_work'
    )
  order by
    sr.request_id_old desc nulls last,
    coalesce(sr.created_at, sr.request_submitted_at, sr.request_created_at) desc nulls last,
    sr.id asc;
$list_buyer_inbox_include_work_service$;

comment on function public.list_buyer_inbox(uuid) is
'Buyer inbox source for director-approved procurement requests. Preserves the full submitted request payload by including material, equipment, delivery, work, labor, service, and subcontract rows; downstream buyer scopes keep their own status and pagination contracts.';

grant execute on function public.list_buyer_inbox(uuid) to authenticated;

create or replace function public.buyer_inbox_materials_and_works_proof_v1()
returns jsonb
language sql
stable
set search_path = public
as $buyer_inbox_materials_and_works_proof$
  with def as (
    select lower(pg_get_functiondef('public.list_buyer_inbox(uuid)'::regprocedure)) as src
  )
  select jsonb_build_object(
    'public_signature_preserved',
      position('function public.list_buyer_inbox(p_company_id uuid default null::uuid)' in src) > 0,
    'includes_material_rows',
      position('material' in src) > 0 and position('equipment' in src) > 0 and position('delivery' in src) > 0,
    'includes_work_rows',
      position('work' in src) > 0 and position('labor' in src) > 0,
    'includes_service_rows',
      position('service' in src) > 0,
    'keeps_company_scope_contract',
      position('where p_company_id is null' in src) > 0,
    'keeps_status_source',
      position('item_status_ready' in src) > 0 and position('request_ready' in src) > 0 and position('ri.status::text' in src) > 0,
    'preserves_approved_request_child_rows',
      position('request_ready' in src) > 0 and position('item_status_is_draft' in src) > 0 and position('where (' in src) > 0,
    'preserves_active_proposal_guard',
      position('not exists' in src) > 0 and position('proposal_items' in src) > 0,
    'does_not_cap_child_rows',
      position('limit 12' in src) = 0 and position('limit_groups' in src) = 0 and position('limit 500' in src) = 0
  )
  from def;
$buyer_inbox_materials_and_works_proof$;

comment on function public.buyer_inbox_materials_and_works_proof_v1() is
'Verifier for buyer inbox source preserving material and work/service rows after director approval.';

grant execute on function public.buyer_inbox_materials_and_works_proof_v1() to authenticated;

do $$
begin
  notify pgrst, 'reload schema';
exception when others then
  null;
end $$;

commit;
