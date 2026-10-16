-- WORK candidate, not applied. Existing source/revisions remain immutable.
-- This gate reads compiler-owned saved block markers; it does not calculate a
-- second purchase balance or grant a legacy-to-new-release migration.
begin;
-- Canonical database only. The separate 15-argument whole_app_staging bridge
-- has no trusted canonical revision store and is deliberately NOT altered here.
do $$ begin
  if to_regclass('public.estimate_revision') is null or to_regclass('public.estimate_revision_row') is null
    or to_regclass('public.estimate_compile_job') is null or to_regclass('public.estimate_revision_artifact') is null then
    raise exception using errcode='55000',message='CANONICAL_PURCHASE_SUPPLY_DATABASE_REQUIRED';
  end if;
end $$;
create or replace function public.estimate_assert_purchase_supply_ready_v1(p_revision_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_amendment jsonb;
begin
  select amendment_contract into v_amendment from public.estimate_revision where id=p_revision_id;
  if not found then raise exception using errcode='22023',message='ARTIFACT_SOURCE_INVALID'; end if;
  -- Presence also rejects malformed/null markers, rather than treating a
  -- damaged new contract as a legacy ready revision.
  if coalesce(v_amendment->'parameterSources','{}'::jsonb) ? 'purchaseSupplyIndexV1'
    or exists(select 1 from public.estimate_revision_row r where r.revision_id=p_revision_id
      and (coalesce(r.calculation_trace,'{}'::jsonb) ? 'purchaseSupplyBlocksV1'
        or r.calculation_trace#>>'{manualPurchaseSupplyAssessmentV1,blocked}'='true'))
    or exists(select 1 from jsonb_array_elements(case
      when jsonb_typeof(v_amendment#>'{parameterSources,preliminaryNeeds}')='array'
      then v_amendment#>'{parameterSources,preliminaryNeeds}' else '[]'::jsonb end) n
      where coalesce(n->'calculation_trace','{}'::jsonb) ? 'purchaseSupplyBlocksV1'
        or n#>>'{calculation_trace,manualPurchaseSupplyAssessmentV1,blocked}'='true'
        or n->>'need_state'='SUPPLY_CONFIRMATION_REQUIRED') then
    raise exception using errcode='55000',message='PROCUREMENT_SUPPLY_QUANTUM_BLOCKED',
      detail='Сохранённое ручное количество требует подтверждения условий поставки. Закупка не готова.';
  end if;
end;
$$;
revoke all on function public.estimate_assert_purchase_supply_ready_v1(uuid) from public,anon,authenticated;

create or replace function public.estimate_create_versioned_artifact_job_v2(
  p_idempotency_key text, p_revision_id uuid, p_artifact_kind text, p_renderer_version text
)
returns table(job_id uuid, artifact_id uuid, job_status text, artifact_status text, created boolean)
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_revision public.estimate_revision%rowtype;
  v_artifact public.estimate_revision_artifact%rowtype;
  v_job public.estimate_compile_job%rowtype;
  v_admission jsonb;
  v_payload jsonb;
  v_created boolean;
begin
  if v_actor is null then raise exception using errcode='28000',message='authentication required'; end if;
  if nullif(trim(p_idempotency_key),'') is null or length(p_idempotency_key)>200
    or p_artifact_kind is null or p_artifact_kind not in ('professional_pdf','procurement')
    or (p_artifact_kind='professional_pdf' and p_renderer_version !~ '^canonical-professional-pdf\.[A-Za-z0-9._-]+$')
    or (p_artifact_kind='procurement' and p_renderer_version !~ '^canonical-procurement(-local|-projection)?\.[A-Za-z0-9._-]+$')
    or length(p_renderer_version)>160 or p_renderer_version is null then
    raise exception using errcode='22023',message='invalid versioned artifact renderer request';
  end if;
  -- The revision lock serializes requests even before the first artifact exists.
  select * into v_revision from public.estimate_revision r
    where r.id=p_revision_id and public.estimate_revision_visible_v1(r.id) for update;
  if v_revision.id is null then raise exception using errcode='42501',message='revision access denied'; end if;
  if p_artifact_kind='procurement' then perform public.estimate_assert_purchase_supply_ready_v1(p_revision_id); end if;
  select * into v_artifact from public.estimate_revision_artifact a
    where a.revision_id=p_revision_id and a.artifact_kind=p_artifact_kind for update;
  if v_artifact.status='ready'
    and coalesce(v_artifact.metadata->>'generatorVersion',v_artifact.metadata->>'renderer')=p_renderer_version then
    return query select null::uuid,v_artifact.id,'succeeded'::text,'ready'::text,false;
    return;
  end if;
  -- Do not replace an active render lease or enqueue a second job for one file.
  if v_artifact.status in ('queued','building') then
    select * into v_job from public.estimate_compile_job j
      where j.id::text=v_artifact.metadata->>'jobId';
    if v_job.status in ('queued','running','retry_wait') then
      if v_job.input_payload->>'rendererVersion' is distinct from p_renderer_version then
        raise exception using errcode='55000',message='another artifact renderer is already building';
      end if;
      return query select v_job.id,v_artifact.id,v_job.status,v_artifact.status,false;
      return;
    end if;
  end if;
  begin
    v_admission := nullif(current_setting('request.estimate_admission_r3',true),'')::jsonb;
  exception when others then v_admission := null;
  end;
  v_payload := jsonb_build_object('revisionId',p_revision_id,'artifactKind',p_artifact_kind,'rendererVersion',p_renderer_version)
    || case when jsonb_typeof(v_admission)='object' then jsonb_build_object('estimateAdmission',v_admission) else '{}'::jsonb end;
  insert into public.estimate_compile_job(idempotency_key,organization_id,owner_user_id,operation,catalog_id,parent_revision_id,input_payload)
    values(trim(p_idempotency_key),v_revision.organization_id,v_actor,p_artifact_kind,v_revision.catalog_id,p_revision_id,v_payload)
    on conflict(owner_user_id,idempotency_key) do nothing returning * into v_job;
  v_created := v_job.id is not null;
  if not v_created then
    select * into v_job from public.estimate_compile_job j where j.owner_user_id=v_actor and j.idempotency_key=trim(p_idempotency_key);
    if v_job.parent_revision_id is distinct from p_revision_id or v_job.operation<>p_artifact_kind or v_job.input_payload<>v_payload then
      raise exception using errcode='23505',message='idempotency key conflicts with another request';
    end if;
    if v_job.status='succeeded' then
      raise exception using errcode='55000',message='completed renderer request cannot replace a different ready version';
    end if;
  end if;
  -- Existing access, candidate capability and exact Content Passport triggers
  -- remain active on both writes. Failure rolls back the entire request.
  insert into public.estimate_revision_artifact(revision_id,artifact_kind,status,metadata)
    values(p_revision_id,p_artifact_kind,'queued',jsonb_build_object('jobId',v_job.id,'requestedRendererVersion',p_renderer_version))
    on conflict(revision_id,artifact_kind) do update set status='queued',error_code=null,updated_at=now(),
      metadata=public.estimate_revision_artifact.metadata||jsonb_build_object('jobId',v_job.id,'requestedRendererVersion',p_renderer_version)
    returning * into v_artifact;
  return query select v_job.id,v_artifact.id,v_job.status,v_artifact.status,v_created;
end;
$$;
revoke all on function public.estimate_create_versioned_artifact_job_v2(text,uuid,text,text) from public,anon;
grant execute on function public.estimate_create_versioned_artifact_job_v2(text,uuid,text,text) to authenticated;

create or replace function public.estimate_create_artifact_job_v1(
  p_idempotency_key text,
  p_revision_id uuid,
  p_artifact_kind text
)
returns table(job_id uuid, artifact_id uuid, job_status text, artifact_status text, created boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_revision public.estimate_revision%rowtype;
  v_job public.estimate_compile_job%rowtype;
  v_artifact public.estimate_revision_artifact%rowtype;
  v_estimate_admission jsonb;
  v_input_payload jsonb;
begin
  if v_actor is null then raise exception using errcode = '28000', message = 'authentication required'; end if;
  if nullif(trim(p_idempotency_key), '') is null or length(p_idempotency_key) > 200
    or p_artifact_kind not in ('pdf', 'professional_pdf', 'procurement') then
    raise exception using errcode = '22023', message = 'invalid artifact request';
  end if;
  select * into v_revision from public.estimate_revision r
  where r.id = p_revision_id and public.estimate_revision_visible_v1(r.id);
  if v_revision.id is null then raise exception using errcode = '42501', message = 'revision access denied'; end if;
  if p_artifact_kind='procurement' then perform public.estimate_assert_purchase_supply_ready_v1(p_revision_id); end if;

  select * into v_artifact from public.estimate_revision_artifact a
  where a.revision_id = p_revision_id and a.artifact_kind = p_artifact_kind;
  if v_artifact.id is not null and v_artifact.status = 'ready' then
    return query select null::uuid, v_artifact.id, 'succeeded'::text, v_artifact.status, false;
    return;
  end if;

  begin
    v_estimate_admission := nullif(current_setting('request.estimate_admission_r3',true),'')::jsonb;
  exception when others then
    v_estimate_admission := null;
  end;
  v_input_payload := jsonb_build_object(
    'revisionId',p_revision_id,
    'artifactKind',p_artifact_kind
  ) || case
    when jsonb_typeof(v_estimate_admission)='object'
      then jsonb_build_object('estimateAdmission',v_estimate_admission)
    else '{}'::jsonb
  end;

  insert into public.estimate_compile_job (
    idempotency_key, organization_id, owner_user_id, operation, catalog_id,
    parent_revision_id, input_payload
  ) values (
    trim(p_idempotency_key), v_revision.organization_id, v_actor, p_artifact_kind,
    v_revision.catalog_id, p_revision_id, v_input_payload
  )
  on conflict (owner_user_id, idempotency_key) do nothing
  returning * into v_job;
  if v_job.id is null then
    select * into v_job from public.estimate_compile_job j
    where j.owner_user_id = v_actor and j.idempotency_key = trim(p_idempotency_key);
    if v_job.parent_revision_id is distinct from p_revision_id
      or v_job.operation <> p_artifact_kind
      or v_job.input_payload <> v_input_payload then
      raise exception using errcode = '23505', message = 'idempotency key conflicts with another request';
    end if;
  end if;

  insert into public.estimate_revision_artifact (revision_id, artifact_kind, status, metadata)
  values (p_revision_id, p_artifact_kind, 'queued', jsonb_build_object('jobId', v_job.id))
  on conflict (revision_id, artifact_kind) do update
  set status = case when public.estimate_revision_artifact.status = 'ready' then 'ready' else 'queued' end,
      error_code = null, updated_at = now(),
      metadata = public.estimate_revision_artifact.metadata || jsonb_build_object('jobId', v_job.id)
  returning * into v_artifact;
  return query select v_job.id, v_artifact.id, v_job.status, v_artifact.status, true;
end;
$$;


create or replace function public.consumer_estimate_marketplace_publish_v1(
  p_local_request_id text,
  p_revision_id uuid,
  p_artifact_id uuid,
  p_idempotency_key text,
  p_expected_revision_checksum_sha256 text,
  p_expected_artifact_sha256 text,
  p_description text,
  p_city text,
  p_address_text text,
  p_contact_phone text
)
returns table (
  listing_id uuid,
  created boolean,
  server_status text,
  revision_id uuid,
  release_id uuid,
  artifact_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_role text := nullif(lower(trim(coalesce(auth.jwt() -> 'app_metadata' ->> 'role', ''))), '');
  v_tenant_text text := nullif(trim(coalesce(auth.jwt() -> 'app_metadata' ->> 'tenant_id', '')), '');
  v_tenant uuid;
  v_revision public.estimate_revision%rowtype;
  v_artifact public.estimate_revision_artifact%rowtype;
  v_existing public.consumer_estimate_marketplace_handoffs%rowtype;
  v_listing_id uuid;
  v_title text;
  v_items jsonb;
  v_total numeric;
  v_projected_row_count integer;
  v_selected_row_count integer;
begin
  if v_actor is null then
    raise exception using errcode = '28000', message = 'authentication required';
  end if;
  if v_role is distinct from 'consumer' then
    raise exception using errcode = '42501', message = 'consumer role required';
  end if;
  if v_tenant_text is null or v_tenant_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    raise exception using errcode = '42501', message = 'tenant context required';
  end if;
  v_tenant := v_tenant_text::uuid;

  if nullif(trim(coalesce(p_local_request_id, '')), '') is null
    or length(p_local_request_id) > 240
    or nullif(trim(coalesce(p_idempotency_key, '')), '') is null
    or length(p_idempotency_key) > 240
    or coalesce(p_expected_revision_checksum_sha256, '') !~ '^[0-9a-f]{64}$'
    or coalesce(p_expected_artifact_sha256, '') !~ '^[0-9a-f]{64}$'
    or length(trim(coalesce(p_description, ''))) < 20
    or nullif(trim(coalesce(p_city, '')), '') is null
    or nullif(trim(coalesce(p_address_text, '')), '') is null
    or length(regexp_replace(coalesce(p_contact_phone, ''), '\D', '', 'g')) < 7 then
    raise exception using errcode = '22023', message = 'invalid consumer marketplace handoff input';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(v_actor::text || ':' || trim(p_idempotency_key), 0)
  );

  select handoff.*
    into v_existing
    from public.consumer_estimate_marketplace_handoffs handoff
   where handoff.owner_user_id = v_actor
     and (
       handoff.idempotency_key = trim(p_idempotency_key)
       or handoff.local_request_id = trim(p_local_request_id)
     )
   order by handoff.created_at
   limit 1;

  if found then
    if v_existing.organization_id <> v_tenant
      or v_existing.revision_id <> p_revision_id
      or v_existing.artifact_id <> p_artifact_id
      or v_existing.revision_checksum_sha256 <> p_expected_revision_checksum_sha256
      or v_existing.artifact_sha256 <> p_expected_artifact_sha256 then
      raise exception using errcode = '23505', message = 'consumer marketplace idempotency identity conflict';
    end if;
    return query
      select v_existing.listing_id, false, 'active'::text,
        v_existing.revision_id, revision.release_id, v_existing.artifact_id
      from public.estimate_revision revision
      where revision.id = v_existing.revision_id;
    return;
  end if;

  select revision.*
    into v_revision
    from public.estimate_revision revision
   where revision.id = p_revision_id
   for share;

  if not found
    or v_revision.owner_user_id <> v_actor
    or v_revision.organization_id is distinct from v_tenant
    or v_revision.status <> 'ready'
    or v_revision.checksum_sha256 <> p_expected_revision_checksum_sha256 then
    raise exception using errcode = '42501', message = 'current estimate revision identity is not publishable';
  end if;
  perform public.estimate_assert_purchase_supply_ready_v1(p_revision_id);

  select artifact.*
    into v_artifact
    from public.estimate_revision_artifact artifact
   where artifact.id = p_artifact_id
     and artifact.revision_id = p_revision_id
   for share;

  if not found
    or v_artifact.artifact_kind <> 'procurement'
    or v_artifact.status <> 'ready'
    or v_artifact.sha256 is distinct from p_expected_artifact_sha256 then
    raise exception using errcode = '22023', message = 'ready procurement artifact identity required';
  end if;

  if not exists (
    select 1
    from public.estimate_revision_photo_attachment attachment
    join lateral (
      select event.event_kind
      from public.estimate_revision_photo_attachment_event event
      where event.attachment_id = attachment.attachment_id
      order by event.created_at desc, event.event_id desc
      limit 1
    ) latest on latest.event_kind = 'attached'
    where attachment.parent_revision_id = p_revision_id
      and attachment.owner_user_id = v_actor
      and attachment.tenant_id = v_tenant
  ) then
    raise exception using errcode = '22023', message = 'committed canonical photo required';
  end if;

  select count(*)::integer,
         coalesce(jsonb_agg(jsonb_build_object(
           'rik_code', row.row_id,
           'name', row.title_ru,
           'uom', row.unit_id,
           'qty', row.quantity,
           'price', row.unit_price,
           'kind', case
             when row.category in ('material', 'work', 'service') then row.category
             when row.category = 'transport' then 'delivery'
             when row.category = 'equipment' then 'rent'
             else 'service'
           end,
           'canonical_revision_id', v_revision.id,
           'canonical_release_id', v_revision.release_id,
           'canonical_artifact_id', v_artifact.id
         ) order by row.ordinal), '[]'::jsonb)
    into v_selected_row_count, v_items
    from public.estimate_revision_row row
   where row.revision_id = p_revision_id
     and row.procurement_eligible
     and row.quantity is not null;

  v_projected_row_count := case
    when coalesce(v_artifact.metadata ->> 'projectedRowCount', '') ~ '^[0-9]+$'
      then (v_artifact.metadata ->> 'projectedRowCount')::integer
    else null
  end;
  if v_selected_row_count < 1
    or (v_projected_row_count is not null and v_projected_row_count <> v_selected_row_count) then
    raise exception using errcode = '22023', message = 'procurement artifact row projection mismatch';
  end if;

  v_title := coalesce(
    nullif(trim(v_artifact.metadata ->> 'displayTitleRu'), ''),
    nullif(trim(v_revision.catalog_id), ''),
    'Заявка по смете'
  );
  v_total := case
    when coalesce(v_revision.totals ->> 'amount', '') ~ '^[0-9]+([.][0-9]+)?$'
      then (v_revision.totals ->> 'amount')::numeric
    else null
  end;

  insert into public.market_listings (
    title, user_id, company_id, city, price, kind, side, description,
    contacts_phone, contacts_whatsapp, contacts_email, items_json,
    uom, uom_code, rik_code, status, created_at, updated_at, client_mutation_id
  ) values (
    v_title, v_actor, null, trim(p_city), v_total, 'work', 'demand', trim(p_description),
    trim(p_contact_phone), null, null, v_items,
    null, null, v_revision.catalog_id, 'active', now(), now(), trim(p_idempotency_key)
  )
  returning id into v_listing_id;

  insert into public.consumer_estimate_marketplace_handoffs (
    owner_user_id, organization_id, local_request_id,
    revision_id, revision_checksum_sha256, artifact_id, artifact_sha256,
    listing_id, idempotency_key, state
  ) values (
    v_actor, v_tenant, trim(p_local_request_id),
    v_revision.id, v_revision.checksum_sha256, v_artifact.id, v_artifact.sha256,
    v_listing_id, trim(p_idempotency_key), 'sent'
  );

  return query select v_listing_id, true, 'active'::text,
    v_revision.id, v_revision.release_id, v_artifact.id;
end;
$$;
-- Direct job/artifact writes receive the same saved-state boundary. Existing
-- access, Content Passport and candidate capability triggers remain in force.
create or replace function public.estimate_purchase_supply_job_guard_v1()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.operation='procurement' then perform public.estimate_assert_purchase_supply_ready_v1(new.parent_revision_id); end if;
  return new;
end;
$$;
create trigger estimate_purchase_supply_job_guard_v1 before insert on public.estimate_compile_job
for each row execute function public.estimate_purchase_supply_job_guard_v1();
create or replace function public.estimate_purchase_supply_artifact_guard_v1()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.artifact_kind='procurement' and new.status in ('queued','building','ready') then
    perform public.estimate_assert_purchase_supply_ready_v1(new.revision_id);
  end if;
  return new;
end;
$$;
create trigger estimate_purchase_supply_artifact_guard_v1 before insert or update on public.estimate_revision_artifact
for each row execute function public.estimate_purchase_supply_artifact_guard_v1();
revoke all on function public.estimate_purchase_supply_job_guard_v1() from public,anon,authenticated;
revoke all on function public.estimate_purchase_supply_artifact_guard_v1() from public,anon,authenticated;
-- CREATE OR REPLACE preserves the existing V1/send function ACLs. The explicit
-- versioned V2 ACL above is copied unchanged from its current migration.
commit;
