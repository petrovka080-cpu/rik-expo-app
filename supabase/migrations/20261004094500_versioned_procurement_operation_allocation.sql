-- Extend the existing versioned derived-artifact lifecycle to procurement.
-- One shared lock/job/artifact path; original revisions, rows and raw PDFs stay immutable.
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
-- Preserve the public professional PDF RPC as an identity-preserving delegate.
create or replace function public.estimate_create_professional_pdf_job_v2(
  p_idempotency_key text, p_revision_id uuid, p_renderer_version text
)
returns table(job_id uuid, artifact_id uuid, job_status text, artifact_status text, created boolean)
language sql security definer set search_path = '' as $$
  select * from public.estimate_create_versioned_artifact_job_v2(p_idempotency_key,p_revision_id,'professional_pdf',p_renderer_version);
$$;
revoke all on function public.estimate_create_professional_pdf_job_v2(text,uuid,text) from public,anon;
grant execute on function public.estimate_create_professional_pdf_job_v2(text,uuid,text) to authenticated;
commit;
