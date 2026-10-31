-- Explicit read-only report of an already stored snapshot. No source promotion,
-- passport, estimate admission, revision write, payment or procurement grant.
begin;
alter table public.estimate_revision_artifact drop constraint estimate_revision_artifact_artifact_kind_check;
alter table public.estimate_revision_artifact add constraint estimate_revision_artifact_artifact_kind_check
  check (artifact_kind in ('pdf','professional_pdf','professional_pdf_review','procurement','xlsx','archive'));
create or replace function public.estimate_professional_report_readable_v1(
  p_revision_id uuid,p_owner_id uuid,p_organization_id uuid,p_catalog_id text,p_payload jsonb
) returns boolean language plpgsql stable security definer set search_path='' as $$
declare v_revision public.estimate_revision%rowtype;v_owner text;v_ack jsonb;v_read jsonb;
begin
  select r.rolname into v_owner from pg_catalog.pg_database d join pg_catalog.pg_roles r on r.oid=d.datdba
    where d.datname=current_database();
  if session_user is distinct from v_owner or p_owner_id is null
    or jsonb_typeof(p_payload) is distinct from 'object'
    or p_payload->>'issuancePurpose' is distinct from 'PRELIMINARY_REVIEW'
    or p_payload->>'artifactKind' is distinct from 'professional_pdf'
    or p_payload ? 'estimateAdmission' then return false;end if;
  select * into v_revision from public.estimate_revision where id=p_revision_id;
  if v_revision.id is null or p_catalog_id is distinct from v_revision.catalog_id
    or p_organization_id is distinct from v_revision.organization_id
    or not (v_revision.owner_user_id=p_owner_id or (p_organization_id is not null and v_revision.organization_id=p_organization_id))
    or p_payload->>'revisionId' is distinct from v_revision.id::text then return false;end if;
  v_ack:=p_payload->'reviewAcknowledgmentV1';v_read:=p_payload->'snapshotReadReportV1';
  if jsonb_typeof(v_ack) is distinct from 'object' or jsonb_typeof(v_read) is distinct from 'object'
    or v_ack->>'contractVersion' is distinct from 'canonical-professional-pdf-review-ack/v1'
    or v_ack->>'issuancePurpose' is distinct from 'PRELIMINARY_REVIEW'
    or v_ack->'acknowledgedPreliminaryReview' is distinct from 'true'::jsonb
    or v_ack->>'actorUserId' is distinct from p_owner_id::text
    or v_ack->>'revisionId' is distinct from v_revision.id::text
    or v_ack->>'releaseId' is distinct from v_revision.release_id::text
    or v_ack->>'definitionVersionId' is distinct from v_revision.definition_version_id::text
    or v_ack->>'checksumSha256' is distinct from v_revision.checksum_sha256
    or coalesce(v_ack->>'auditSha256','') !~ '^[a-f0-9]{64}$'
    or coalesce(v_ack->>'acknowledgedAt','')=''
    or coalesce(v_ack->>'unknownQuantityCount','') !~ '^(0|[1-9][0-9]*)$'
    or v_read->>'contractVersion' is distinct from 'canonical-saved-snapshot-read-report/v1'
    or v_read->'readOnly' is distinct from 'true'::jsonb
    or v_read->>'revisionId' is distinct from v_revision.id::text
    or v_read->>'releaseId' is distinct from v_revision.release_id::text
    or v_read->>'definitionVersionId' is distinct from v_revision.definition_version_id::text
    or v_read->>'checksumSha256' is distinct from v_revision.checksum_sha256
    or v_read->>'auditSha256' is distinct from v_ack->>'auditSha256'
    or v_read->>'sourceRowCount' is distinct from v_revision.row_count::text
    or v_revision.row_count is distinct from (select count(*)::integer from public.estimate_revision_row where revision_id=p_revision_id)
    then return false;end if;
  return true;
end;
$$;
revoke all on function public.estimate_professional_report_readable_v1(uuid,uuid,uuid,text,jsonb) from public,anon,authenticated,service_role;
create or replace function public.estimate_enforce_job_admission_r3()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_release public.estimate_definition_release%rowtype;
  v_manifest public.estimate_cumulative_manifest_entry%rowtype;
  v_definition public.estimate_definition_version%rowtype;
  v_revision public.estimate_revision%rowtype;
  v_search_release_id uuid;
  v_capability public.estimate_candidate_capability_r3%rowtype;
  v_capability_id uuid;
  v_mode text;
begin
  if new.input_payload->>'issuancePurpose'='PRELIMINARY_REVIEW' then
    if new.operation is distinct from 'professional_pdf' or not public.estimate_professional_report_readable_v1(
      new.parent_revision_id,new.owner_user_id,new.organization_id,new.catalog_id,new.input_payload
    ) then raise exception using errcode='42501',message='ARTIFACT_REPORT_READ_PROOF_INVALID';end if;
    new.estimate_admission_decision:=null;
    return new;
  end if;
  if new.operation not in (
    'compile','recalculate','legacy_revision_migration','pdf','professional_pdf','procurement'
  ) then
    return new;
  end if;

  if new.operation in ('pdf','professional_pdf','procurement') then
    select * into v_revision
    from public.estimate_revision revision
    where revision.id=new.parent_revision_id;
    if v_revision.id is null or v_revision.catalog_id<>new.catalog_id then
      raise exception using errcode='55000',message='ESTIMATE_ADMISSION_R3_REVISION_BINDING_MISSING';
    end if;
    select * into v_release from public.estimate_definition_release release where release.id=v_revision.release_id;
  else
    select * into v_release
    from public.estimate_definition_release release
    where release.id=coalesce(new.target_release_id,(
      select active_release.id from public.estimate_definition_release active_release
      where active_release.status='active'
      order by active_release.activated_at desc nulls last,active_release.created_at desc
      limit 1
    ));
  end if;

  if v_release.id is null then
    raise exception using errcode='55000',message='ESTIMATE_ADMISSION_R3_RELEASE_MISSING';
  end if;

  select * into v_manifest
  from public.estimate_cumulative_manifest_entry manifest
  where manifest.release_id=v_release.id and manifest.catalog_id=new.catalog_id;
  if v_manifest.release_id is null then
    raise exception using errcode='55000',message='ESTIMATE_ADMISSION_R3_MANIFEST_MISSING';
  end if;
  select * into v_definition
  from public.estimate_definition_version definition
  where definition.id=v_manifest.definition_version_id;
  if v_definition.id is null then
    raise exception using errcode='55000',message='ESTIMATE_ADMISSION_R3_DEFINITION_MISSING';
  end if;

  if v_release.status='prepared' then
    v_mode := 'isolated_candidate_test';
    begin
      v_capability_id := nullif(new.input_payload#>>'{estimateAdmission,capabilityId}','')::uuid;
    exception when others then
      v_capability_id := null;
    end;
    select * into v_capability
    from public.estimate_candidate_capability_r3 capability
    where capability.id=v_capability_id
      and capability.revoked_at is null
      and capability.expires_at>clock_timestamp()
      and capability.purpose='estimate_candidate_admission_r3'
      and capability.tenant_id=new.organization_id
      and capability.release_id=v_release.id
      and capability.environment=new.input_payload#>>'{estimateAdmission,environment}'
      and capability.source_head=new.input_payload#>>'{estimateAdmission,sourceHead}'
      and capability.source_tree=new.input_payload#>>'{estimateAdmission,sourceTree}';
    if v_capability.id is null then
      raise exception using errcode='42501',message='ESTIMATE_ADMISSION_R3_CANDIDATE_CAPABILITY_INVALID';
    end if;
    v_search_release_id := v_capability.search_release_id;
    if v_manifest.runtime_publication_state<>'CANDIDATE'
      or not v_manifest.baseline_ready or not v_manifest.scenario_ready
      or v_definition.content_status not in ('CANDIDATE_READY','PRODUCTION')
      or v_definition.content_gate_status<>'GREEN' then
      raise exception using errcode='55000',message='ESTIMATE_ADMISSION_R3_CANDIDATE_CONTENT_BLOCKED';
    end if;
  else
    v_mode := 'production';
    if v_release.status<>'active'
      or v_manifest.runtime_publication_state<>'PRODUCTION'
      or not v_manifest.baseline_ready or not v_manifest.scenario_ready
      or v_definition.content_status<>'PRODUCTION'
      or v_definition.content_gate_status<>'GREEN' then
      raise exception using errcode='55000',message='ESTIMATE_ADMISSION_R3_PRODUCTION_CONTENT_BLOCKED';
    end if;
    select search_release.id into v_search_release_id
    from public.estimate_search_index_release search_release
    where search_release.status='active';
  end if;

  if v_search_release_id is null or not exists(
    select 1 from public.estimate_search_document document
    where document.search_release_id=v_search_release_id
      and document.catalog_id=new.catalog_id
      and document.definition_version_id=v_definition.id
      and document.adjudication_class='EFFECTIVE_WORK'
      and document.selectable
      and document.canonical_target_catalog_id is null
      and document.replacement_catalog_id is null
  ) then
    raise exception using errcode='55000',message='ESTIMATE_ADMISSION_R3_SEARCH_BINDING_BLOCKED';
  end if;

  new.estimate_admission_decision := jsonb_build_object(
    'allowed',true,
    'mode',v_mode,
    'releaseId',v_release.id,
    'definitionVersionId',v_definition.id,
    'catalogId',new.catalog_id,
    'reasons','[]'::jsonb,
    'evaluatedAt',clock_timestamp(),
    'contractVersion','estimate-admission-r3'
  );
  return new;
end;
$$;

create or replace function public.estimate_enforce_job_content_passport_r3()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_release_id uuid;
begin
  if new.input_payload->>'issuancePurpose'='PRELIMINARY_REVIEW' then
    if new.operation is distinct from 'professional_pdf' or not public.estimate_professional_report_readable_v1(
      new.parent_revision_id,new.owner_user_id,new.organization_id,new.catalog_id,new.input_payload
    ) then raise exception using errcode='42501',message='ARTIFACT_REPORT_READ_PROOF_INVALID';end if;
    new.estimate_admission_decision:=null;
    return new;
  end if;
  if new.operation not in (
    'compile','recalculate','legacy_revision_migration','pdf','professional_pdf','procurement'
  ) then return new; end if;
  if new.operation in ('pdf','professional_pdf','procurement') then
    select revision.release_id into v_release_id
    from public.estimate_revision revision where revision.id=new.parent_revision_id;
  else
    v_release_id := new.target_release_id;
    if v_release_id is null then
      select release.id into v_release_id from public.estimate_definition_release release
      where release.status='active'
      order by release.activated_at desc nulls last,release.created_at desc limit 1;
    end if;
  end if;
  if v_release_id is null or new.organization_id is null
    or not public.estimate_content_passport_exact_r3(
      v_release_id,new.catalog_id,new.organization_id
    ) then
    raise exception using errcode='55000',message='ESTIMATE_CONTENT_R3_RUNTIME_PASSPORT_BLOCKED';
  end if;
  return new;
end;
$$;

create or replace function public.estimate_enforce_definition_withdrawal_v1()
returns trigger language plpgsql security definer set search_path=''
as $$
declare v_definition_id uuid; v_release_id uuid;
begin
  if tg_table_name='estimate_compile_job' then
  if new.input_payload->>'issuancePurpose'='PRELIMINARY_REVIEW' then
    if new.operation is distinct from 'professional_pdf' or not public.estimate_professional_report_readable_v1(
      new.parent_revision_id,new.owner_user_id,new.organization_id,new.catalog_id,new.input_payload
    ) then raise exception using errcode='42501',message='ARTIFACT_REPORT_READ_PROOF_INVALID';end if;
    new.estimate_admission_decision:=null;
    return new;
  end if;
    if new.operation in ('pdf','professional_pdf','procurement') then
      select r.definition_version_id into v_definition_id
      from public.estimate_revision r where r.id=new.parent_revision_id;
    else
      v_release_id:=new.target_release_id;
      select m.definition_version_id into v_definition_id
      from public.estimate_cumulative_manifest_entry m
      where m.release_id=v_release_id and m.catalog_id=new.catalog_id;
    end if;
  else
    v_definition_id:=new.definition_version_id;
  end if;
  if public.estimate_definition_withdrawal_reason_v1(v_definition_id) is not null then
    raise exception using errcode='55000',message='DEFINITION_CONTENT_WITHDRAWN';
  end if;
  return new;
end;
$$;

create or replace function public.estimate_enforce_artifact_content_passport_r3()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_revision public.estimate_revision%rowtype;
  v_report_job public.estimate_compile_job%rowtype;
begin
  if new.artifact_kind='professional_pdf_review' or new.metadata->>'issuancePurpose'='PRELIMINARY_REVIEW' then
    select * into v_report_job from public.estimate_compile_job where id::text=new.metadata->>'jobId';
    if new.artifact_kind is distinct from 'professional_pdf_review'
      or new.metadata->>'issuancePurpose' is distinct from 'PRELIMINARY_REVIEW' or v_report_job.id is null
      or v_report_job.operation is distinct from 'professional_pdf'
      or v_report_job.parent_revision_id is distinct from new.revision_id
      or new.metadata->'reviewAcknowledgmentV1' is distinct from v_report_job.input_payload->'reviewAcknowledgmentV1'
      or new.metadata->'snapshotReadReportV1' is distinct from v_report_job.input_payload->'snapshotReadReportV1'
      or not public.estimate_professional_report_readable_v1(v_report_job.parent_revision_id,v_report_job.owner_user_id,
        v_report_job.organization_id,v_report_job.catalog_id,v_report_job.input_payload)
      then raise exception using errcode='42501',message='ARTIFACT_REPORT_READ_PROOF_INVALID';end if;
    return new;
  end if;
  select * into v_revision from public.estimate_revision revision where revision.id=new.revision_id;
  if v_revision.id is null or v_revision.organization_id is null
    or not public.estimate_content_passport_exact_r3(
      v_revision.release_id,v_revision.catalog_id,v_revision.organization_id
    ) then
    raise exception using errcode='55000',message='ESTIMATE_CONTENT_R3_ARTIFACT_PERSISTENCE_BLOCKED';
  end if;
  return new;
end;
$$;

create or replace function public.estimate_create_professional_pdf_job_v2(
  p_idempotency_key text,p_revision_id uuid,p_renderer_version text,p_review jsonb
)
returns table(job_id uuid,artifact_id uuid,job_status text,artifact_status text,created boolean)
language plpgsql security definer set search_path='' as $$
declare
  v_actor uuid:=auth.uid(); v_revision public.estimate_revision%rowtype;
  v_artifact public.estimate_revision_artifact%rowtype;v_job public.estimate_compile_job%rowtype;
  v_ack jsonb;v_payload jsonb;v_read jsonb;v_created boolean;
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
    then
    raise exception using errcode='55000',message='ARTIFACT_REVIEW_ACKNOWLEDGMENT_INVALID';
  end if;
  v_read:=jsonb_build_object('contractVersion','canonical-saved-snapshot-read-report/v1','readOnly',true,
    'revisionId',v_revision.id,'releaseId',v_revision.release_id,'definitionVersionId',v_revision.definition_version_id,
    'checksumSha256',v_revision.checksum_sha256,'sourceRowCount',v_revision.row_count,'auditSha256',v_ack->>'auditSha256');
  select * into v_artifact from public.estimate_revision_artifact a
    where a.revision_id=p_revision_id and a.artifact_kind='professional_pdf_review' for update;
  if v_artifact.status='ready' then
    if v_artifact.metadata->>'issuancePurpose'='PRELIMINARY_REVIEW'
      and coalesce(v_artifact.metadata->>'generatorVersion',v_artifact.metadata->>'renderer') is not distinct from p_renderer_version
      and v_artifact.metadata#>>'{reviewAcknowledgmentV1,auditSha256}' is not distinct from v_ack->>'auditSha256'
      and v_artifact.metadata->'snapshotReadReportV1' is not distinct from v_read then
      return query select null::uuid,v_artifact.id,'succeeded'::text,'ready'::text,false;return;
    end if;
    -- Explicit requested representation refresh. Preserve the old exact bytes,
    -- metadata and checksum of the earlier report. STANDARD has its own unchanged slot.
    v_previous:=jsonb_build_object('artifactId',v_artifact.id,'storageBucket',v_artifact.storage_bucket,
      'storageKey',v_artifact.storage_key,'sha256',v_artifact.sha256,'metadata',v_artifact.metadata,'readyAt',v_artifact.ready_at);
  end if;
  if v_artifact.status in ('queued','building') then
    select * into v_job from public.estimate_compile_job j where j.id::text=v_artifact.metadata->>'jobId';
    if v_job.status in ('queued','running','retry_wait') then
      if v_job.input_payload->>'issuancePurpose' is distinct from 'PRELIMINARY_REVIEW'
        or v_job.input_payload->>'rendererVersion' is distinct from p_renderer_version
        or v_job.input_payload#>>'{reviewAcknowledgmentV1,auditSha256}' is distinct from v_ack->>'auditSha256' then
        raise exception using errcode='55000',message='ARTIFACT_PURPOSE_CONFLICT';
      end if;
      return query select v_job.id,v_artifact.id,v_job.status,v_artifact.status,false;return;
    end if;
  end if;
  v_payload:=jsonb_build_object('revisionId',p_revision_id,'artifactKind','professional_pdf','rendererVersion',p_renderer_version,
    'issuancePurpose','PRELIMINARY_REVIEW','reviewAcknowledgmentV1',v_ack,'snapshotReadReportV1',v_read)
    ||case when v_previous is not null then jsonb_build_object('previousPresentation',v_previous) else '{}'::jsonb end;
  if not public.estimate_professional_report_readable_v1(v_revision.id,v_actor,v_revision.organization_id,v_revision.catalog_id,v_payload)
    then raise exception using errcode='42501',message='ARTIFACT_REPORT_READ_PROOF_INVALID';end if;
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
  -- Typed report proof is checked independently by every affected trigger.
  insert into public.estimate_revision_artifact(revision_id,artifact_kind,status,metadata)
    values(p_revision_id,'professional_pdf_review','queued',jsonb_build_object('jobId',v_job.id,'requestedRendererVersion',p_renderer_version,
      'issuancePurpose','PRELIMINARY_REVIEW','reviewAcknowledgmentV1',v_payload->'reviewAcknowledgmentV1',
      'snapshotReadReportV1',v_payload->'snapshotReadReportV1'))
    on conflict(revision_id,artifact_kind) do update set status='queued',error_code=null,updated_at=now(),
      metadata=public.estimate_revision_artifact.metadata||excluded.metadata returning * into v_artifact;
  return query select v_job.id,v_artifact.id,v_job.status,v_artifact.status,v_created;
end;
$$;
revoke all on function public.estimate_create_professional_pdf_job_v2(text,uuid,text,jsonb) from public,anon,authenticated,service_role;
comment on function public.estimate_create_professional_pdf_job_v2(text,uuid,text,jsonb) is
  'DB-owner-only exact stored snapshot report; no admission or source promotion; STANDARD overload stays strict.';

CREATE OR REPLACE FUNCTION public.estimate_commit_artifact_job_v1(p_job_id uuid, p_worker_id text, p_artifact jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_job public.estimate_compile_job%rowtype;
  v_artifact_id uuid;
begin
  if current_user not in ('postgres', 'service_role') then
    raise exception using errcode = '42501', message = 'worker role required';
  end if;
  if jsonb_typeof(p_artifact) <> 'object' then
    raise exception using errcode = '22023', message = 'invalid artifact commit payload';
  end if;
  select * into v_job from public.estimate_compile_job where id = p_job_id for update;
  if v_job.id is null or v_job.operation not in ('pdf', 'professional_pdf', 'procurement') then
    raise exception using errcode = '22023', message = 'artifact job not found';
  end if;
  if v_job.status <> 'running' or v_job.lease_owner is distinct from trim(p_worker_id)
    or v_job.lease_expires_at <= now() then
    raise exception using errcode = '55000', message = 'artifact job lease is not owned by worker';
  end if;
  if p_artifact ->> 'kind' <> v_job.operation
    or p_artifact ->> 'sha256' !~ '^[0-9a-f]{64}$'
    or coalesce((p_artifact ->> 'byteSize')::bigint, -1) < 0
    or nullif(p_artifact ->> 'storageBucket', '') is null
    or nullif(p_artifact ->> 'storageKey', '') is null then
    raise exception using errcode = '22023', message = 'artifact result is incomplete';
  end if;

  if v_job.input_payload->>'issuancePurpose'='PRELIMINARY_REVIEW' then
    if v_job.operation is distinct from 'professional_pdf'
      or p_artifact#>>'{metadata,jobId}' is distinct from v_job.id::text
      or p_artifact#>'{metadata,reviewAcknowledgmentV1}' is distinct from v_job.input_payload->'reviewAcknowledgmentV1'
      or p_artifact#>'{metadata,snapshotReadReportV1}' is distinct from v_job.input_payload->'snapshotReadReportV1'
      or not public.estimate_professional_report_readable_v1(v_job.parent_revision_id,v_job.owner_user_id,
        v_job.organization_id,v_job.catalog_id,v_job.input_payload)
      then raise exception using errcode='42501',message='ARTIFACT_REPORT_READ_PROOF_INVALID';end if;
  end if;
  update public.estimate_revision_artifact
  set status = 'ready', storage_bucket = p_artifact ->> 'storageBucket',
      storage_key = p_artifact ->> 'storageKey', content_type = p_artifact ->> 'contentType',
      byte_size = (p_artifact ->> 'byteSize')::bigint, sha256 = p_artifact ->> 'sha256',
      metadata = coalesce(p_artifact -> 'metadata', '{}'::jsonb), error_code = null,
      ready_at = now(), updated_at = now()
  where revision_id = v_job.parent_revision_id and artifact_kind = case when v_job.operation='professional_pdf' and v_job.input_payload->>'issuancePurpose'='PRELIMINARY_REVIEW' then 'professional_pdf_review' else v_job.operation end
  returning id into v_artifact_id;
  if v_artifact_id is null then
    raise exception using errcode = 'P0002', message = 'artifact record not found';
  end if;

  update public.estimate_compile_job
  set status = 'succeeded', stage = 'complete', progress = 100,
      completed_at = now(), updated_at = now(), lease_owner = null,
      lease_expires_at = null, error_code = null, error_detail = null
  where id = p_job_id;
  return v_artifact_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.estimate_fail_compile_job_v2(p_job_id uuid, p_worker_id text, p_error_code text, p_error_detail jsonb, p_retryable boolean, p_retry_delay_seconds integer DEFAULT 5)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_job public.estimate_compile_job%rowtype;
  v_next_status text;
begin
  if current_user not in ('postgres', 'service_role') then
    raise exception using errcode = '42501', message = 'worker role required';
  end if;
  select * into v_job from public.estimate_compile_job where id = p_job_id for update;
  if v_job.status <> 'running' or v_job.lease_owner is distinct from trim(p_worker_id) then
    raise exception using errcode = '55000', message = 'compile job lease is not owned by worker';
  end if;
  v_next_status := case
    when p_retryable and v_job.attempt < v_job.max_attempts then 'retry_wait'
    else 'failed'
  end;
  update public.estimate_compile_job
  set status = v_next_status,
      stage = case when v_next_status = 'failed' then 'failed' else 'retry_wait' end,
      available_at = case when v_next_status = 'retry_wait'
        then now() + make_interval(secs => greatest(1, least(p_retry_delay_seconds, 3600))) else available_at end,
      error_code = left(coalesce(nullif(trim(p_error_code), ''), 'COMPILER_FAILED'), 100),
      error_detail = coalesce(p_error_detail, '{}'::jsonb),
      completed_at = case when v_next_status = 'failed' then now() else null end,
      lease_owner = null, lease_expires_at = null, updated_at = now()
  where id = p_job_id;
  if v_job.operation = 'legacy_revision_migration' then
    update public.estimate_legacy_revision_import
    set status = case when v_next_status = 'failed' then 'failed' else 'queued' end,
        completed_at = case when v_next_status = 'failed' then now() else null end
    where job_id = p_job_id;
  elsif v_job.operation in ('pdf', 'professional_pdf', 'procurement') then
    update public.estimate_revision_artifact
    set status = case when v_next_status = 'failed' then 'failed' else 'queued' end,
        error_code = left(coalesce(nullif(trim(p_error_code), ''), 'ARTIFACT_FAILED'), 100),
        updated_at = now()
    where revision_id = v_job.parent_revision_id and artifact_kind = case when v_job.operation='professional_pdf' and v_job.input_payload->>'issuancePurpose'='PRELIMINARY_REVIEW' then 'professional_pdf_review' else v_job.operation end;
  end if;
  return v_next_status;
end;
$function$
;

commit;
