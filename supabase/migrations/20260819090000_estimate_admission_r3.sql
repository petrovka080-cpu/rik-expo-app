-- MASTER PRODUCTION-TZ R3 section 34: fail-closed estimate admission at the database boundary.
-- Existing rows remain immutable; every pre-R3 definition starts quarantined until its 100% audit is accepted.

begin;

alter table public.estimate_definition_version
  add column if not exists content_status text not null default 'QUARANTINED',
  add column if not exists content_gate_status text not null default 'RED';

alter table public.estimate_definition_version
  drop constraint if exists estimate_definition_version_content_status_r3_ck,
  add constraint estimate_definition_version_content_status_r3_ck check (
    content_status in ('PRODUCTION','CANDIDATE_READY','QUARANTINED','REAL_WORK_BLOCKED')
  ),
  drop constraint if exists estimate_definition_version_content_gate_status_r3_ck,
  add constraint estimate_definition_version_content_gate_status_r3_ck check (
    content_gate_status in ('GREEN','RED')
  );

alter table public.estimate_cumulative_manifest_entry
  add column if not exists runtime_publication_state text not null default 'QUARANTINED';

alter table public.estimate_cumulative_manifest_entry
  drop constraint if exists estimate_cumulative_manifest_runtime_publication_state_r3_ck,
  add constraint estimate_cumulative_manifest_runtime_publication_state_r3_ck check (
    runtime_publication_state in ('PRODUCTION','CANDIDATE','QUARANTINED')
  );

create table if not exists public.estimate_candidate_capability_r3 (
  id uuid primary key default gen_random_uuid(),
  environment text not null,
  tenant_id uuid not null,
  release_id uuid not null references public.estimate_definition_release(id) on delete restrict,
  search_release_id uuid not null references public.estimate_search_index_release(id) on delete restrict,
  expires_at timestamptz not null,
  purpose text not null check (purpose = 'estimate_candidate_admission_r3'),
  source_head text not null,
  source_tree text not null,
  issued_by text not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (length(trim(environment)) between 1 and 120),
  check (length(trim(source_head)) between 7 and 80),
  check (length(trim(source_tree)) between 7 and 80),
  check (length(trim(issued_by)) between 1 and 200)
);

alter table public.estimate_candidate_capability_r3 enable row level security;
revoke all on table public.estimate_candidate_capability_r3 from public,anon,authenticated;
grant all on table public.estimate_candidate_capability_r3 to service_role;

alter table public.estimate_compile_job
  add column if not exists estimate_admission_decision jsonb;

alter table public.estimate_compile_job
  drop constraint if exists estimate_compile_job_admission_decision_r3_ck,
  add constraint estimate_compile_job_admission_decision_r3_ck check (
    estimate_admission_decision is null
    or (
      jsonb_typeof(estimate_admission_decision) = 'object'
      and estimate_admission_decision->>'contractVersion' = 'estimate-admission-r3'
      and estimate_admission_decision->>'allowed' = 'true'
    )
  );

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

drop trigger if exists estimate_compile_job_admission_r3_trg on public.estimate_compile_job;
create trigger estimate_compile_job_admission_r3_trg
before insert on public.estimate_compile_job
for each row execute function public.estimate_enforce_job_admission_r3();

revoke all on function public.estimate_enforce_job_admission_r3() from public,anon,authenticated;

comment on column public.estimate_definition_version.content_status is
  'R3 content state. Defaults QUARANTINED; only the exhaustive content gate may set PRODUCTION.';
comment on column public.estimate_definition_version.content_gate_status is
  'R3 technology/content gate. GREEN is necessary but not sufficient for runtime admission.';
comment on column public.estimate_cumulative_manifest_entry.runtime_publication_state is
  'R3 runtime publication state, separate from the preserved lineage publication_state.';
comment on table public.estimate_candidate_capability_r3 is
  'Server-only exact prepared-release capability bound to environment, tenant, release, search release, expiry, purpose and source HEAD/TREE.';

commit;
