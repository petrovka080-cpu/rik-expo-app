-- Source proposal only. ROOT-governed rollout; no trigger changes or historical writes.
begin;

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
  v_previous jsonb;
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
  if v_artifact.id is not null and
    (case when v_artifact.metadata ? 'issuancePurpose' then v_artifact.metadata->>'issuancePurpose' else 'STANDARD' end)
      is distinct from 'STANDARD' then
    raise exception using errcode='55000',message='ARTIFACT_PURPOSE_CONFLICT';
  end if;
  if v_artifact.status='ready' then
    v_previous:=jsonb_build_object('artifactId',v_artifact.id,'storageBucket',v_artifact.storage_bucket,
      'storageKey',v_artifact.storage_key,'sha256',v_artifact.sha256,'metadata',v_artifact.metadata,'readyAt',v_artifact.ready_at);
  end if;
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
    || case when jsonb_typeof(v_admission)='object' then jsonb_build_object('estimateAdmission',v_admission) else '{}'::jsonb end
    ||case when v_previous is not null then jsonb_build_object('previousPresentation',v_previous) else '{}'::jsonb end;
  insert into public.estimate_compile_job(idempotency_key,organization_id,owner_user_id,operation,catalog_id,parent_revision_id,input_payload)
    values(trim(p_idempotency_key),v_revision.organization_id,v_actor,p_artifact_kind,v_revision.catalog_id,p_revision_id,v_payload)
    on conflict(owner_user_id,idempotency_key) do nothing returning * into v_job;
  v_created := v_job.id is not null;
  if not v_created then
    select * into v_job from public.estimate_compile_job j where j.owner_user_id=v_actor and j.idempotency_key=trim(p_idempotency_key);
    if v_job.parent_revision_id is distinct from p_revision_id or v_job.operation<>p_artifact_kind or (v_job.input_payload-'previousPresentation')<>(v_payload-'previousPresentation') then
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

-- Same professional_pdf artifact slot and original strict content/admission triggers.
-- This overload is callable only by the database-owner local backend session.
-- It records review intent, never approval, source authority or procurement readiness.
create or replace function public.estimate_create_professional_pdf_job_v2(
  p_idempotency_key text,p_revision_id uuid,p_renderer_version text,p_review jsonb
)
returns table(job_id uuid,artifact_id uuid,job_status text,artifact_status text,created boolean)
language plpgsql security definer set search_path='' as $$
declare
  v_actor uuid:=auth.uid(); v_revision public.estimate_revision%rowtype;
  v_artifact public.estimate_revision_artifact%rowtype;v_job public.estimate_compile_job%rowtype;
  v_ack jsonb;v_payload jsonb;v_admission jsonb;v_created boolean;
  v_database_owner text;
  v_previous jsonb;
begin
  select r.rolname into v_database_owner from pg_catalog.pg_database d
    join pg_catalog.pg_roles r on r.oid=d.datdba where d.datname=current_database();
  if session_user is distinct from v_database_owner or v_actor is null then
    raise exception using errcode='42501',message='ARTIFACT_REVIEW_SERVER_ONLY';
  end if;
  if nullif(trim(p_idempotency_key),'') is null or length(p_idempotency_key)>200
    or p_renderer_version is null or p_renderer_version !~ '^canonical-professional-pdf\.[A-Za-z0-9._-]+$'
    or length(p_renderer_version)>160 or jsonb_typeof(p_review) is distinct from 'object'
    or p_review->>'issuancePurpose' is distinct from 'PRELIMINARY_REVIEW' then
    raise exception using errcode='22023',message='ARTIFACT_REVIEW_REQUEST_INVALID';
  end if;
  select * into v_revision from public.estimate_revision r
    where r.id=p_revision_id and public.estimate_revision_visible_v1(r.id) for update;
  if v_revision.id is null then raise exception using errcode='42501',message='revision access denied';end if;
  v_ack:=p_review->'reviewAcknowledgmentV1';
  if jsonb_typeof(v_ack) is distinct from 'object'
    or v_ack->>'contractVersion' is distinct from 'canonical-professional-pdf-review-ack/v1'
    or v_ack->>'issuancePurpose' is distinct from 'PRELIMINARY_REVIEW'
    or v_ack->'acknowledgedPreliminaryReview' is distinct from 'true'::jsonb
    or v_ack->>'revisionId' is distinct from v_revision.id::text
    or v_ack->>'releaseId' is distinct from v_revision.release_id::text
    or v_ack->>'definitionVersionId' is distinct from v_revision.definition_version_id::text
    or v_ack->>'checksumSha256' is distinct from v_revision.checksum_sha256
    or v_ack->>'actorUserId' is distinct from v_actor::text
    or coalesce(v_ack->>'acknowledgedAt','')=''
    or coalesce(v_ack->>'auditSha256','') !~ '^[a-f0-9]{64}$'
    or coalesce(v_ack->>'unknownQuantityCount','') !~ '^(0|[1-9][0-9]*)$'
    or public.estimate_definition_withdrawal_reason_v1(v_revision.definition_version_id) is not null then
    raise exception using errcode='55000',message='ARTIFACT_REVIEW_ACKNOWLEDGMENT_INVALID';
  end if;
  select * into v_artifact from public.estimate_revision_artifact a
    where a.revision_id=p_revision_id and a.artifact_kind='professional_pdf' for update;
  if v_artifact.id is not null and v_artifact.metadata->>'issuancePurpose' is distinct from 'PRELIMINARY_REVIEW' then
    raise exception using errcode='55000',message='ARTIFACT_PURPOSE_CONFLICT';
  end if;
  if v_artifact.status='ready' then
    if v_artifact.metadata#>>'{reviewAcknowledgmentV1,contractVersion}' is distinct from 'canonical-professional-pdf-review-ack/v1'
      or v_artifact.metadata#>>'{reviewAcknowledgmentV1,checksumSha256}' is distinct from v_revision.checksum_sha256 then
      raise exception using errcode='55000',message='ARTIFACT_REVIEW_ACKNOWLEDGMENT_INVALID';
    end if;
    if coalesce(v_artifact.metadata->>'generatorVersion',v_artifact.metadata->>'renderer') is not distinct from p_renderer_version then
      if v_artifact.metadata#>>'{reviewAcknowledgmentV1,auditSha256}' is distinct from v_ack->>'auditSha256' then
        raise exception using errcode='55000',message='ARTIFACT_REVIEW_ACKNOWLEDGMENT_INVALID';
      end if;
      return query select null::uuid,v_artifact.id,'succeeded'::text,'ready'::text,false;return;
    end if;
    -- Explicit same-purpose refresh. Old bytes and the entire old metadata/ack
    -- remain in the next job input; old jobs and files are not updated/deleted.
    v_previous:=jsonb_build_object('artifactId',v_artifact.id,'storageBucket',v_artifact.storage_bucket,
      'storageKey',v_artifact.storage_key,'sha256',v_artifact.sha256,'metadata',v_artifact.metadata,'readyAt',v_artifact.ready_at);
  end if;
  if v_artifact.status in ('queued','building') then
    select * into v_job from public.estimate_compile_job j where j.id::text=v_artifact.metadata->>'jobId';
    if v_job.status in ('queued','running','retry_wait') then
      if v_job.input_payload->>'rendererVersion' is distinct from p_renderer_version
        or v_job.input_payload#>>'{reviewAcknowledgmentV1,auditSha256}' is distinct from v_ack->>'auditSha256' then
        raise exception using errcode='55000',message='ARTIFACT_PURPOSE_CONFLICT';
      end if;
      return query select v_job.id,v_artifact.id,v_job.status,v_artifact.status,false;return;
    end if;
  end if;
  begin v_admission:=nullif(current_setting('request.estimate_admission_r3',true),'')::jsonb;
    exception when others then v_admission:=null;end;
  v_payload:=jsonb_build_object('revisionId',p_revision_id,'artifactKind','professional_pdf','rendererVersion',p_renderer_version,
    'issuancePurpose','PRELIMINARY_REVIEW','reviewAcknowledgmentV1',v_ack)
    ||case when jsonb_typeof(v_admission)='object' then jsonb_build_object('estimateAdmission',v_admission) else '{}'::jsonb end
    ||case when v_previous is not null then jsonb_build_object('previousPresentation',v_previous) else '{}'::jsonb end;
  insert into public.estimate_compile_job(idempotency_key,organization_id,owner_user_id,operation,catalog_id,parent_revision_id,input_payload)
    values(trim(p_idempotency_key),v_revision.organization_id,v_actor,'professional_pdf',v_revision.catalog_id,p_revision_id,v_payload)
    on conflict(owner_user_id,idempotency_key) do nothing returning * into v_job;
  v_created:=v_job.id is not null;
  if not v_created then
    select * into v_job from public.estimate_compile_job j where j.owner_user_id=v_actor and j.idempotency_key=trim(p_idempotency_key);
    if v_job.parent_revision_id is distinct from p_revision_id or v_job.operation<>'professional_pdf'
      or ((v_job.input_payload-'previousPresentation')#-'{reviewAcknowledgmentV1,acknowledgedAt}')<>((v_payload-'previousPresentation')#-'{reviewAcknowledgmentV1,acknowledgedAt}') then
      raise exception using errcode='23505',message='idempotency key conflicts with another request';
    end if;
    v_payload:=v_job.input_payload;
    if v_job.status='succeeded' then raise exception using errcode='55000',message='completed renderer request cannot replace a different ready version';end if;
  end if;
  -- Existing passport and admission triggers execute normally on both writes.
  insert into public.estimate_revision_artifact(revision_id,artifact_kind,status,metadata)
    values(p_revision_id,'professional_pdf','queued',jsonb_build_object('jobId',v_job.id,'requestedRendererVersion',p_renderer_version,
      'issuancePurpose','PRELIMINARY_REVIEW','reviewAcknowledgmentV1',v_payload->'reviewAcknowledgmentV1'))
    on conflict(revision_id,artifact_kind) do update set status='queued',error_code=null,updated_at=now(),
      metadata=public.estimate_revision_artifact.metadata||excluded.metadata returning * into v_artifact;
  return query select v_job.id,v_artifact.id,v_job.status,v_artifact.status,v_created;
end;
$$;
revoke all on function public.estimate_create_professional_pdf_job_v2(text,uuid,text,jsonb) from public,anon,authenticated,service_role;
comment on function public.estimate_create_professional_pdf_job_v2(text,uuid,text,jsonb) is
  'Local DB-owner-only explicit preliminary review intent; unchanged strict passport/admission triggers remain mandatory.';
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
  where r.id = p_revision_id and public.estimate_revision_visible_v1(r.id) for update;
  if v_revision.id is null then raise exception using errcode = '42501', message = 'revision access denied'; end if;
  if p_artifact_kind='procurement' then perform public.estimate_assert_purchase_supply_ready_v1(p_revision_id); end if;

  select * into v_artifact from public.estimate_revision_artifact a
  where a.revision_id = p_revision_id and a.artifact_kind = p_artifact_kind for update;
  if v_artifact.id is not null and
    (case when v_artifact.metadata ? 'issuancePurpose' then v_artifact.metadata->>'issuancePurpose' else 'STANDARD' end)
      is distinct from 'STANDARD' then
    raise exception using errcode='55000',message='ARTIFACT_PURPOSE_CONFLICT';
  end if;
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
commit;
