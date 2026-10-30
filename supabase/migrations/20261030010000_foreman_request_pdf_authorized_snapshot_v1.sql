-- PROPOSAL ONLY. Integrate with the reviewed immutable requests.company_id
-- contract and its creation callers before applying. Do not deploy Office v1
-- migrations independently to satisfy this precondition.
begin;
do $precondition$
begin
  if not exists (select 1 from pg_catalog.pg_attribute
    where attrelid='public.requests'::regclass and attname='company_id' and not attisdropped)
    or not exists (select 1 from pg_catalog.pg_trigger
      where tgrelid='public.requests'::regclass and tgname='aaa_office_request_identity_v2'
        and tgfoid=pg_catalog.to_regprocedure('public.office_request_identity_guard_v2()')
        and tgenabled in ('O','A') and not tgisinternal) then
    raise exception 'STOP_PDF_IMMUTABLE_DOCUMENT_SCOPE_REQUIRED';
  end if;
  if pg_catalog.to_regprocedure('public.foreman_request_pdf_snapshot_v1(uuid)') is not null then
    raise exception 'STOP_PDF_EXISTING_SNAPSHOT_REQUIRES_REVIEW';
  end if;
end;
$precondition$;

-- A single STABLE invocation gives authority, head, child rows and labels the
-- same database snapshot. No service-role read follows this check in the Edge.
create function public.foreman_request_pdf_snapshot_v1(p_request_id uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $function$
declare
  v_actor uuid := auth.uid(); v_request public.requests%rowtype;
  v_company uuid; v_mode text; v_items jsonb; v_refs jsonb;
begin
  if v_actor is null then raise exception 'PDF_ACCESS_DENIED' using errcode='42501'; end if;
  -- Current server factor state, not a client AAL hint. Mirrors the existing
  -- reviewed no-factor policy; a factor enrolled after JWT issuance blocks AAL1.
  if coalesce(auth.jwt()->>'aal','') <> 'aal2' and exists (
    select 1 from auth.mfa_factors f where f.user_id=v_actor and f.status='verified'
  ) then raise exception 'MFA_SECOND_FACTOR_REQUIRED' using errcode='42501'; end if;
  select r.* into v_request from public.requests r where r.id=p_request_id;
  if not found then raise exception 'PDF_ACCESS_DENIED' using errcode='42501'; end if;
  v_company := v_request.company_id;
  if v_company is null then
    if v_request.created_by is distinct from v_actor then
      raise exception 'PDF_ACCESS_DENIED' using errcode='42501';
    end if;
    v_mode := 'legacy_creator';
  else
    if not (
      exists (select 1 from public.company_members cm where cm.user_id=v_actor
        and cm.company_id=v_company and (cm.role='director'
          or (cm.role='foreman' and v_request.created_by=v_actor)))
      or exists (select 1 from public.companies c
        where c.id=v_company and c.owner_user_id=v_actor)
    ) then raise exception 'PDF_ACCESS_DENIED' using errcode='42501'; end if;
    v_mode := 'company';
  end if;
  -- Bounded exact child set. Never silently truncate a PDF at a provider cap.
  select coalesce(jsonb_agg(x.item order by x.id),'[]'::jsonb) into v_items from (
    select i.id, jsonb_build_object('id',i.id,'name_human',i.name_human,
      'uom',i.uom,'qty',i.qty,'note',i.note,'status',i.status,
      'app_code',i.app_code,'rik_code',i.rik_code,'item_kind',i.item_kind) item
    from public.request_items i where i.request_id=p_request_id
    order by i.id limit 5001
  ) x;
  if jsonb_array_length(v_items)>5000 then
    raise exception 'PDF_CHILD_LIST_CEILING_EXCEEDED' using errcode='54000';
  end if;
  select jsonb_build_object(
    'object',(select jsonb_build_object('name',x.name,'name_ru',to_jsonb(x)->>'name_ru',
      'name_human_ru',to_jsonb(x)->>'name_human_ru','display_name',to_jsonb(x)->>'display_name',
      'alias_ru',to_jsonb(x)->>'alias_ru') from public.ref_object_types x where x.code=v_request.object_type_code),
    'level',(select jsonb_build_object('name',x.name,'name_ru',to_jsonb(x)->>'name_ru',
      'name_human_ru',to_jsonb(x)->>'name_human_ru','display_name',to_jsonb(x)->>'display_name',
      'alias_ru',to_jsonb(x)->>'alias_ru') from public.ref_levels x where x.code=v_request.level_code),
    'system',(select jsonb_build_object('name',x.name,'name_ru',to_jsonb(x)->>'name_ru',
      'name_human_ru',to_jsonb(x)->>'name_human_ru','display_name',to_jsonb(x)->>'display_name',
      'alias_ru',to_jsonb(x)->>'alias_ru') from public.ref_systems x where x.code=v_request.system_code),
    'zone',(select jsonb_build_object('name',x.name,'name_ru',to_jsonb(x)->>'name_ru',
      'name_human_ru',to_jsonb(x)->>'name_human_ru','display_name',to_jsonb(x)->>'display_name',
      'alias_ru',to_jsonb(x)->>'alias_ru') from public.ref_zones x where x.code=v_request.zone_code)
  ) into v_refs;
  return jsonb_build_object(
    'authority',jsonb_build_object('contract','foreman_request_read_v1',
      'actorId',v_actor,'requestId',p_request_id,'companyId',v_company,'mode',v_mode),
    'request',jsonb_build_object('id',v_request.id,'display_no',v_request.display_no,
      'foreman_name',v_request.foreman_name,'need_by',v_request.need_by,'comment',v_request.comment,
      'status',v_request.status,'created_at',v_request.created_at),
    'items',v_items,'refs',v_refs);
end;
$function$;
revoke all on function public.foreman_request_pdf_snapshot_v1(uuid) from public,anon,authenticated,service_role;
grant execute on function public.foreman_request_pdf_snapshot_v1(uuid) to authenticated;
comment on function public.foreman_request_pdf_snapshot_v1(uuid) is
  'Read-only exact authorized snapshot. No creator-membership inference, mutation, payment, approval or idempotency-result authority.';
commit;
