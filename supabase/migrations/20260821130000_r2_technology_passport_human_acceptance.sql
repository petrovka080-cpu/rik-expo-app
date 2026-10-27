-- MASTER-TZ R2 Phase 4: a structural GREEN is not engineering acceptance.
-- This migration is forward-only, performs no release activation, and preserves history.

begin;

create table if not exists public.estimate_technology_passport_r2 (
  definition_version_id uuid primary key references public.estimate_definition_version(id) on delete restrict,
  release_id uuid not null references public.estimate_definition_release(id) on delete restrict,
  catalog_id text not null,
  technology_variant_id text not null,
  contract_version text not null check (
    contract_version='real-useful-estimates.technology-passport-candidate-r2.v1'
  ),
  passport_content_sha256 text not null check (passport_content_sha256~'^[0-9a-f]{64}$'),
  source_set_sha256 text not null check (source_set_sha256~'^[0-9a-f]{64}$'),
  author_audit_identity text not null,
  author_role text not null check (author_role='ENGINEER'),
  authorship_origin text not null check (authorship_origin='HUMAN_ENGINEERING_WORKFLOW'),
  author_created_by_agent boolean not null check (not author_created_by_agent),
  status text not null check (status in ('DRAFT','ENGINEER_ACCEPTED','REJECTED')),
  passport_payload jsonb not null check (jsonb_typeof(passport_payload)='object'),
  source_claims jsonb not null check (
    jsonb_typeof(source_claims)='array' and jsonb_array_length(source_claims)>0
  ),
  validator_decision jsonb not null check (
    jsonb_typeof(validator_decision)='object'
    and validator_decision->>'contract'='real-useful-estimates.technology-passport-human-acceptance-r2.v1'
    and validator_decision->>'passportContentSha256'=passport_content_sha256
    and validator_decision->>'sourceSetSha256'=source_set_sha256
    and validator_decision->>'status'=status
    and (validator_decision->>'allowed')::boolean=(status='ENGINEER_ACCEPTED')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(release_id,catalog_id),
  check (length(trim(catalog_id))>0),
  check (length(trim(technology_variant_id))>0),
  check (length(trim(author_audit_identity))>0),
  check (
    lower(trim(author_audit_identity)) !~
      '^(unassigned|unknown|pending|agent|codex|ai)([-_: ].*)?$'
  ),
  check (passport_payload->>'catalogId'=catalog_id),
  check (passport_payload->>'technologyVariantId'=technology_variant_id)
);

create table if not exists public.estimate_technology_passport_acceptance_r2 (
  id uuid primary key default gen_random_uuid(),
  definition_version_id uuid not null references public.estimate_technology_passport_r2(definition_version_id) on delete restrict,
  release_id uuid not null references public.estimate_definition_release(id) on delete restrict,
  catalog_id text not null,
  technology_variant_id text not null,
  contract_version text not null check (
    contract_version='real-useful-estimates.technology-passport-human-acceptance-r2.v1'
  ),
  passport_content_sha256 text not null check (passport_content_sha256~'^[0-9a-f]{64}$'),
  source_set_sha256 text not null check (source_set_sha256~'^[0-9a-f]{64}$'),
  reviewer_id text not null,
  reviewer_role text not null check (reviewer_role='engineer'),
  reviewer_scope text not null,
  decision text not null check (decision in ('ACCEPTED','REJECTED','NEEDS_CHANGES')),
  review_comment text not null,
  accepted_at_utc timestamptz not null,
  signature_or_audit_id text not null,
  acceptance_origin text not null check (acceptance_origin='HUMAN_SIGNED_AUDIT'),
  created_by_agent boolean not null check (not created_by_agent),
  manifest_payload jsonb not null check (
    jsonb_typeof(manifest_payload)='object'
    and manifest_payload->>'contract'=contract_version
    and manifest_payload->>'catalogId'=catalog_id
    and manifest_payload->>'technologyVariantId'=technology_variant_id
    and manifest_payload->>'passportContentSha256'=passport_content_sha256
    and manifest_payload->>'sourceSetSha256'=source_set_sha256
    and manifest_payload->>'reviewerId'=reviewer_id
    and manifest_payload->>'reviewerRole'=reviewer_role
    and manifest_payload->>'decision'=decision
    and manifest_payload->>'signatureOrAuditId'=signature_or_audit_id
    and manifest_payload->>'acceptanceOrigin'=acceptance_origin
    and manifest_payload->>'createdByAgent'='false'
  ),
  manifest_sha256 text not null check (manifest_sha256~'^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  unique(definition_version_id,passport_content_sha256,source_set_sha256,decision,signature_or_audit_id),
  check (length(trim(reviewer_id))>0),
  check (length(trim(reviewer_scope))>0),
  check (length(trim(review_comment))>0),
  check (length(trim(signature_or_audit_id))>0),
  check (
    lower(trim(reviewer_id)) !~
      '^(unassigned|unknown|pending|agent|codex|ai)([-_: ].*)?$'
  ),
  check (
    lower(trim(signature_or_audit_id)) !~
      '^(unassigned|unknown|pending|agent|codex|ai)([-_: ].*)?$'
  )
);

alter table public.estimate_technology_passport_r2 enable row level security;
alter table public.estimate_technology_passport_acceptance_r2 enable row level security;
revoke all on table public.estimate_technology_passport_r2 from public,anon,authenticated;
revoke all on table public.estimate_technology_passport_acceptance_r2 from public,anon,authenticated;
grant all on table public.estimate_technology_passport_r2 to service_role;
grant all on table public.estimate_technology_passport_acceptance_r2 to service_role;

create or replace function public.estimate_validate_technology_acceptance_r2()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_passport public.estimate_technology_passport_r2%rowtype;
begin
  select * into v_passport
  from public.estimate_technology_passport_r2 passport
  where passport.definition_version_id=new.definition_version_id;
  if v_passport.definition_version_id is null then
    raise exception using errcode='55000',message='ESTIMATE_TECHNOLOGY_R2_PASSPORT_MISSING';
  end if;
  if new.release_id<>v_passport.release_id
    or new.catalog_id<>v_passport.catalog_id
    or new.technology_variant_id<>v_passport.technology_variant_id
    or new.passport_content_sha256<>v_passport.passport_content_sha256
    or new.source_set_sha256<>v_passport.source_set_sha256 then
    raise exception using errcode='55000',message='ESTIMATE_TECHNOLOGY_R2_ACCEPTANCE_BINDING_MISMATCH';
  end if;
  if new.reviewer_id=v_passport.author_audit_identity then
    raise exception using errcode='55000',message='ESTIMATE_TECHNOLOGY_R2_AUTHOR_REVIEWER_COLLISION';
  end if;
  return new;
end;
$$;

drop trigger if exists estimate_technology_acceptance_validate_r2_trg
  on public.estimate_technology_passport_acceptance_r2;
create trigger estimate_technology_acceptance_validate_r2_trg
before insert on public.estimate_technology_passport_acceptance_r2
for each row execute function public.estimate_validate_technology_acceptance_r2();

create or replace function public.estimate_keep_technology_acceptance_immutable_r2()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  raise exception using errcode='55000',message='ESTIMATE_TECHNOLOGY_R2_ACCEPTANCE_IMMUTABLE';
end;
$$;

drop trigger if exists estimate_technology_acceptance_immutable_r2_trg
  on public.estimate_technology_passport_acceptance_r2;
create trigger estimate_technology_acceptance_immutable_r2_trg
before update or delete on public.estimate_technology_passport_acceptance_r2
for each row execute function public.estimate_keep_technology_acceptance_immutable_r2();

create or replace function public.estimate_enforce_technology_passport_state_r2()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  if not exists(
    select 1
    from public.estimate_definition_version definition
    where definition.id=new.definition_version_id
      and definition.release_id=new.release_id
      and definition.catalog_id=new.catalog_id
  ) then
    raise exception using errcode='55000',message='ESTIMATE_TECHNOLOGY_R2_PASSPORT_DEFINITION_BINDING_MISMATCH';
  end if;
  if tg_op='UPDATE' and old.status='ENGINEER_ACCEPTED' and (
    new.passport_content_sha256<>old.passport_content_sha256
    or new.source_set_sha256<>old.source_set_sha256
  ) then
    new.status := 'DRAFT';
    new.validator_decision := jsonb_set(
      jsonb_set(new.validator_decision,'{allowed}','false'::jsonb,true),
      '{status}',to_jsonb('DRAFT'::text),true
    );
  end if;
  if new.status='ENGINEER_ACCEPTED' and not exists(
    select 1
    from public.estimate_technology_passport_acceptance_r2 acceptance
    where acceptance.definition_version_id=new.definition_version_id
      and acceptance.release_id=new.release_id
      and acceptance.catalog_id=new.catalog_id
      and acceptance.technology_variant_id=new.technology_variant_id
      and acceptance.passport_content_sha256=new.passport_content_sha256
      and acceptance.source_set_sha256=new.source_set_sha256
      and acceptance.decision='ACCEPTED'
      and acceptance.reviewer_id<>new.author_audit_identity
      and not acceptance.created_by_agent
  ) then
    raise exception using errcode='55000',message='ESTIMATE_TECHNOLOGY_R2_HUMAN_ACCEPTANCE_MISSING';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists estimate_technology_passport_state_r2_trg
  on public.estimate_technology_passport_r2;
create trigger estimate_technology_passport_state_r2_trg
before insert or update on public.estimate_technology_passport_r2
for each row execute function public.estimate_enforce_technology_passport_state_r2();

create or replace function public.estimate_technology_passport_exact_accepted_r2(
  p_release_id uuid,
  p_catalog_id text
)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select exists(
    select 1
    from public.estimate_cumulative_manifest_entry manifest
    join public.estimate_technology_passport_r2 passport
      on passport.definition_version_id=manifest.definition_version_id
      and passport.release_id=manifest.release_id
      and passport.catalog_id=manifest.catalog_id
    join public.estimate_technology_passport_acceptance_r2 acceptance
      on acceptance.definition_version_id=passport.definition_version_id
      and acceptance.release_id=passport.release_id
      and acceptance.catalog_id=passport.catalog_id
      and acceptance.technology_variant_id=passport.technology_variant_id
      and acceptance.passport_content_sha256=passport.passport_content_sha256
      and acceptance.source_set_sha256=passport.source_set_sha256
    where manifest.release_id=p_release_id
      and manifest.catalog_id=p_catalog_id
      and passport.status='ENGINEER_ACCEPTED'
      and passport.contract_version='real-useful-estimates.technology-passport-candidate-r2.v1'
      and passport.author_role='ENGINEER'
      and passport.authorship_origin='HUMAN_ENGINEERING_WORKFLOW'
      and passport.validator_decision->>'allowed'='true'
      and passport.validator_decision->>'status'='ENGINEER_ACCEPTED'
      and acceptance.decision='ACCEPTED'
      and acceptance.contract_version='real-useful-estimates.technology-passport-human-acceptance-r2.v1'
      and acceptance.reviewer_role='engineer'
      and acceptance.acceptance_origin='HUMAN_SIGNED_AUDIT'
      and acceptance.reviewer_id<>passport.author_audit_identity
      and not passport.author_created_by_agent
      and not acceptance.created_by_agent
  );
$$;

-- A definition cannot even be promoted to content GREEN until the separate
-- exact human decision exists. Runtime persistence below remains a second,
-- independent fail-closed boundary.
create or replace function public.estimate_enforce_content_gate_promotion_r3()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_passport public.estimate_content_passport_r3%rowtype;
  v_parameter_count integer;
  v_formula_count integer;
  v_resource_count integer;
begin
  if new.content_gate_status<>'GREEN' then
    return new;
  end if;
  if new.content_status not in ('CANDIDATE_READY','PRODUCTION') then
    raise exception using errcode='55000',message='ESTIMATE_CONTENT_R3_GREEN_STATUS_INVALID';
  end if;
  select * into v_passport
  from public.estimate_content_passport_r3 passport
  where passport.definition_version_id=new.id
    and passport.release_id=new.release_id
    and passport.catalog_id=new.catalog_id;
  if v_passport.definition_version_id is null then
    raise exception using errcode='55000',message='ESTIMATE_CONTENT_R3_PASSPORT_MISSING';
  end if;
  select count(*)::integer into v_parameter_count
  from public.estimate_parameter_definition parameter
  where parameter.definition_version_id=new.id;
  select count(*)::integer into v_formula_count
  from public.estimate_formula_graph formula
  where formula.definition_version_id=new.id;
  select count(*)::integer into v_resource_count
  from public.estimate_resource_spec resource
  where resource.definition_version_id=new.id;
  if v_passport.parameter_count<>v_parameter_count
    or v_passport.formula_count<>v_formula_count
    or v_passport.resource_count<>v_resource_count then
    raise exception using errcode='55000',message='ESTIMATE_CONTENT_R3_PASSPORT_COUNT_DRIFT';
  end if;
  if not public.estimate_technology_passport_exact_accepted_r2(new.release_id,new.catalog_id) then
    raise exception using errcode='55000',message='ESTIMATE_TECHNOLOGY_R2_HUMAN_ACCEPTANCE_MISSING';
  end if;
  return new;
end;
$$;

-- Preserve the existing count and content checks and add the independent human gate.
create or replace function public.estimate_content_passport_exact_r3(
  p_release_id uuid,
  p_catalog_id text
)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select exists(
    select 1
    from public.estimate_cumulative_manifest_entry manifest
    join public.estimate_definition_version definition
      on definition.id=manifest.definition_version_id
    join public.estimate_content_passport_r3 passport
      on passport.definition_version_id=definition.id
      and passport.release_id=manifest.release_id
      and passport.catalog_id=manifest.catalog_id
    where manifest.release_id=p_release_id
      and manifest.catalog_id=p_catalog_id
      and manifest.baseline_ready
      and manifest.scenario_ready
      and definition.content_status in ('CANDIDATE_READY','PRODUCTION')
      and definition.content_gate_status='GREEN'
      and passport.decision->>'allowed'='true'
      and passport.decision->>'status'='GREEN'
      and passport.parameter_count=(
        select count(*)::integer from public.estimate_parameter_definition parameter
        where parameter.definition_version_id=definition.id
      )
      and passport.formula_count=(
        select count(*)::integer from public.estimate_formula_graph formula
        where formula.definition_version_id=definition.id
      )
      and passport.resource_count=(
        select count(*)::integer from public.estimate_resource_spec resource
        where resource.definition_version_id=definition.id
      )
      and public.estimate_technology_passport_exact_accepted_r2(p_release_id,p_catalog_id)
  );
$$;

revoke all on function public.estimate_validate_technology_acceptance_r2() from public,anon,authenticated;
revoke all on function public.estimate_keep_technology_acceptance_immutable_r2() from public,anon,authenticated;
revoke all on function public.estimate_enforce_technology_passport_state_r2() from public,anon,authenticated;
revoke all on function public.estimate_technology_passport_exact_accepted_r2(uuid,text) from public,anon,authenticated;
revoke all on function public.estimate_enforce_content_gate_promotion_r3() from public,anon,authenticated;

comment on table public.estimate_technology_passport_r2 is
  'R2 independent technology passport candidate. Structural GREEN alone cannot authorize runtime admission.';
comment on table public.estimate_technology_passport_acceptance_r2 is
  'Append-only human engineering decision bound to exact passport-content and source-set hashes.';
comment on function public.estimate_technology_passport_exact_accepted_r2(uuid,text) is
  'Fail-closed exact human engineering acceptance used by canonical content admission.';

commit;
