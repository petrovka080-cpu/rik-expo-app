-- MASTER-TZ R3 Phase R3-1: tenant-scoped, append-only human engineering acceptance.
-- Forward-only. It neither activates a release nor mutates the historical R2 decision log.

begin;

create table if not exists public.estimate_technology_engineer_authorization_r3 (
  id uuid primary key default gen_random_uuid(),
  event_sequence bigint generated always as identity unique,
  tenant_id uuid not null,
  engineer_user_id uuid not null,
  engineer_role text not null check (engineer_role='engineer'),
  reviewer_scope text not null,
  authorization_event text not null check (authorization_event in ('GRANTED','REVOKED')),
  signature_or_audit_id text not null,
  supersedes_authorization_id uuid references public.estimate_technology_engineer_authorization_r3(id) on delete restrict,
  decided_at_utc timestamptz not null,
  created_at_utc timestamptz not null default clock_timestamp(),
  check (length(trim(reviewer_scope))>0),
  check (length(trim(signature_or_audit_id))>0),
  check (
    lower(trim(signature_or_audit_id)) !~
      '^(unassigned|unknown|pending|agent|codex|ai|service[_ -]?role)([-_: ].*)?$'
  )
);

create index if not exists estimate_technology_engineer_authorization_r3_latest_idx
  on public.estimate_technology_engineer_authorization_r3(
    tenant_id,engineer_user_id,reviewer_scope,event_sequence desc
  );

create table if not exists public.estimate_technology_passport_r3 (
  tenant_id uuid not null,
  definition_version_id uuid not null references public.estimate_definition_version(id) on delete restrict,
  release_id uuid not null references public.estimate_definition_release(id) on delete restrict,
  catalog_id text not null,
  technology_variant_id text not null,
  contract_version text not null check (
    contract_version='real-useful-estimates.technology-passport-candidate-r2.v1'
  ),
  definition_sha256 text not null check (definition_sha256~'^[0-9a-f]{64}$'),
  passport_content_sha256 text not null check (passport_content_sha256~'^[0-9a-f]{64}$'),
  source_set_sha256 text not null check (source_set_sha256~'^[0-9a-f]{64}$'),
  candidate_manifest_sha256 text not null check (candidate_manifest_sha256~'^[0-9a-f]{64}$'),
  author_id uuid not null,
  author_audit_identity text not null,
  author_role text not null check (author_role='ENGINEER'),
  authorship_origin text not null check (authorship_origin='HUMAN_ENGINEERING_WORKFLOW'),
  author_created_by_agent boolean not null check (not author_created_by_agent),
  engineering_scope text not null,
  status text not null check (status in ('DRAFT','ENGINEER_ACCEPTED','REJECTED')),
  passport_payload jsonb not null check (jsonb_typeof(passport_payload)='object'),
  source_claims jsonb not null check (
    jsonb_typeof(source_claims)='array' and jsonb_array_length(source_claims)>0
  ),
  validator_decision jsonb not null check (
    jsonb_typeof(validator_decision)='object'
    and validator_decision->>'contract'='real-useful-estimates.technology-passport-human-acceptance-r3.v1'
    and validator_decision->>'definitionSha256'=definition_sha256
    and validator_decision->>'passportContentSha256'=passport_content_sha256
    and validator_decision->>'sourceSetSha256'=source_set_sha256
    and validator_decision->>'status'=status
    and (validator_decision->>'allowed')::boolean=(status='ENGINEER_ACCEPTED')
  ),
  created_at_utc timestamptz not null default clock_timestamp(),
  updated_at_utc timestamptz not null default clock_timestamp(),
  primary key(tenant_id,definition_version_id,technology_variant_id),
  unique(tenant_id,release_id,catalog_id,technology_variant_id),
  unique(tenant_id,candidate_manifest_sha256),
  check (length(trim(catalog_id))>0),
  check (length(trim(technology_variant_id))>0),
  check (length(trim(author_audit_identity))>0),
  check (length(trim(engineering_scope))>0),
  check (
    lower(trim(author_audit_identity)) !~
      '^(unassigned|unknown|pending|agent|codex|ai|service[_ -]?role)([-_: ].*)?$'
  ),
  check (passport_payload->>'tenantId'=tenant_id::text),
  check (passport_payload->>'catalogId'=catalog_id),
  check (passport_payload->>'technologyVariantId'=technology_variant_id),
  check (passport_payload->>'definitionSha256'=definition_sha256),
  check (passport_payload->>'authorId'=author_id::text),
  check (passport_payload->>'engineeringScope'=engineering_scope)
);

create unique index if not exists estimate_technology_passport_r3_one_accepted_variant_idx
  on public.estimate_technology_passport_r3(tenant_id,release_id,catalog_id)
  where status='ENGINEER_ACCEPTED';

create table if not exists public.estimate_technology_passport_acceptance_r3 (
  acceptance_id uuid primary key default gen_random_uuid(),
  decision_sequence bigint generated always as identity unique,
  tenant_id uuid not null,
  definition_version_id uuid not null,
  release_id uuid not null references public.estimate_definition_release(id) on delete restrict,
  catalog_id text not null,
  technology_variant_id text not null,
  contract_version text not null check (
    contract_version='real-useful-estimates.technology-passport-human-acceptance-r3.v1'
  ),
  definition_sha256 text not null check (definition_sha256~'^[0-9a-f]{64}$'),
  passport_content_sha256 text not null check (passport_content_sha256~'^[0-9a-f]{64}$'),
  source_set_sha256 text not null check (source_set_sha256~'^[0-9a-f]{64}$'),
  author_id uuid not null,
  reviewer_id uuid not null,
  reviewer_role text not null check (reviewer_role='engineer'),
  reviewer_scope text not null,
  decision text not null check (decision in ('ACCEPTED','REJECTED','NEEDS_CHANGES')),
  review_comment text not null,
  signature_or_audit_id text not null,
  acceptance_origin text not null check (acceptance_origin='HUMAN_SIGNED_AUDIT'),
  created_by_agent boolean not null check (not created_by_agent),
  created_at_utc timestamptz not null default clock_timestamp(),
  decided_at_utc timestamptz not null,
  invalidated_at_utc timestamptz,
  supersedes_acceptance_id uuid references public.estimate_technology_passport_acceptance_r3(acceptance_id) on delete restrict,
  manifest_payload jsonb not null check (jsonb_typeof(manifest_payload)='object'),
  manifest_sha256 text not null check (manifest_sha256~'^[0-9a-f]{64}$'),
  foreign key(tenant_id,definition_version_id,technology_variant_id)
    references public.estimate_technology_passport_r3(
      tenant_id,definition_version_id,technology_variant_id
    ) on delete restrict,
  unique(tenant_id,manifest_sha256),
  check (author_id<>reviewer_id),
  check (length(trim(reviewer_scope))>0),
  check (length(trim(review_comment))>0),
  check (length(trim(signature_or_audit_id))>0),
  check (invalidated_at_utc is null),
  check (
    lower(trim(signature_or_audit_id)) !~
      '^(unassigned|unknown|pending|agent|codex|ai|service[_ -]?role)([-_: ].*)?$'
  ),
  check (manifest_payload->>'contract'=contract_version),
  check (manifest_payload->>'tenantId'=tenant_id::text),
  check (manifest_payload->>'catalogId'=catalog_id),
  check (manifest_payload->>'technologyVariantId'=technology_variant_id),
  check (manifest_payload->>'definitionSha256'=definition_sha256),
  check (manifest_payload->>'passportContentSha256'=passport_content_sha256),
  check (manifest_payload->>'sourceSetSha256'=source_set_sha256),
  check (manifest_payload->>'authorId'=author_id::text),
  check (manifest_payload->>'reviewerId'=reviewer_id::text),
  check (manifest_payload->>'reviewerRole'=reviewer_role),
  check (manifest_payload->>'reviewerScope'=reviewer_scope),
  check (manifest_payload->>'decision'=decision),
  check (manifest_payload->>'signatureOrAuditId'=signature_or_audit_id),
  check (manifest_payload->>'acceptanceOrigin'=acceptance_origin),
  check (manifest_payload->>'createdByAgent'='false'),
  check (
    (supersedes_acceptance_id is null and manifest_payload->>'supersedesAcceptanceId' is null)
    or manifest_payload->>'supersedesAcceptanceId'=supersedes_acceptance_id::text
  )
);

create index if not exists estimate_technology_passport_acceptance_r3_latest_idx
  on public.estimate_technology_passport_acceptance_r3(
    tenant_id,definition_version_id,technology_variant_id,decision_sequence desc
  );

create table if not exists public.estimate_technology_acceptance_security_audit_r3 (
  id bigint generated always as identity primary key,
  tenant_id uuid,
  actor_user_id uuid,
  actor_jwt_role text,
  action text not null,
  outcome text not null check (outcome in ('BLOCKED','ALLOWED')),
  reason text not null,
  request_sha256 text check (request_sha256 is null or request_sha256~'^[0-9a-f]{64}$'),
  created_at_utc timestamptz not null default clock_timestamp()
);

alter table public.estimate_technology_engineer_authorization_r3 enable row level security;
alter table public.estimate_technology_engineer_authorization_r3 force row level security;
alter table public.estimate_technology_passport_r3 enable row level security;
alter table public.estimate_technology_passport_r3 force row level security;
alter table public.estimate_technology_passport_acceptance_r3 enable row level security;
alter table public.estimate_technology_passport_acceptance_r3 force row level security;
alter table public.estimate_technology_acceptance_security_audit_r3 enable row level security;
alter table public.estimate_technology_acceptance_security_audit_r3 force row level security;

revoke all on table public.estimate_technology_engineer_authorization_r3 from public,anon,authenticated,service_role;
revoke all on table public.estimate_technology_passport_r3 from public,anon,authenticated,service_role;
revoke all on table public.estimate_technology_passport_acceptance_r3 from public,anon,authenticated,service_role;
revoke all on table public.estimate_technology_acceptance_security_audit_r3 from public,anon,authenticated,service_role;
grant select on table public.estimate_technology_engineer_authorization_r3 to authenticated;
grant select on table public.estimate_technology_passport_r3 to authenticated;
grant select on table public.estimate_technology_passport_acceptance_r3 to authenticated;

create or replace function public.estimate_request_jwt_role_r3()
returns text
language sql
stable
security invoker
set search_path=''
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role',true),''),
    nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role',
    ''
  );
$$;

revoke all on function public.estimate_request_jwt_role_r3()
  from public,anon,authenticated,service_role;
grant execute on function public.estimate_request_jwt_role_r3()
  to authenticated,service_role;

create or replace function public.estimate_technology_engineer_authorized_r3(
  p_tenant_id uuid,
  p_engineer_user_id uuid,
  p_reviewer_scope text
)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select coalesce((
    select auth_event.authorization_event='GRANTED'
    from public.estimate_technology_engineer_authorization_r3 auth_event
    where auth_event.tenant_id=p_tenant_id
      and auth_event.engineer_user_id=p_engineer_user_id
      and auth_event.reviewer_scope in ('*',p_reviewer_scope)
    order by auth_event.event_sequence desc
    limit 1
  ),false);
$$;

revoke all on function public.estimate_technology_engineer_authorized_r3(uuid,uuid,text)
  from public,anon,authenticated,service_role;
grant execute on function public.estimate_technology_engineer_authorized_r3(uuid,uuid,text)
  to authenticated;

drop policy if exists estimate_technology_engineer_authorization_r3_tenant_select
  on public.estimate_technology_engineer_authorization_r3;
create policy estimate_technology_engineer_authorization_r3_tenant_select
  on public.estimate_technology_engineer_authorization_r3
  for select to authenticated
  using (
    public.estimate_technology_engineer_authorized_r3(
      tenant_id,auth.uid(),reviewer_scope
    )
  );

drop policy if exists estimate_technology_passport_r3_tenant_select
  on public.estimate_technology_passport_r3;
create policy estimate_technology_passport_r3_tenant_select
  on public.estimate_technology_passport_r3
  for select to authenticated
  using (
    public.estimate_technology_engineer_authorized_r3(
      tenant_id,auth.uid(),engineering_scope
    )
  );

drop policy if exists estimate_technology_acceptance_r3_tenant_select
  on public.estimate_technology_passport_acceptance_r3;
create policy estimate_technology_acceptance_r3_tenant_select
  on public.estimate_technology_passport_acceptance_r3
  for select to authenticated
  using (
    public.estimate_technology_engineer_authorized_r3(
      tenant_id,auth.uid(),reviewer_scope
    )
  );

create or replace function public.estimate_keep_technology_r3_audit_append_only()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  raise exception using errcode='55000',message='ESTIMATE_TECHNOLOGY_R3_AUDIT_APPEND_ONLY';
end;
$$;

drop trigger if exists estimate_technology_engineer_authorization_r3_immutable_trg
  on public.estimate_technology_engineer_authorization_r3;
create trigger estimate_technology_engineer_authorization_r3_immutable_trg
before update or delete on public.estimate_technology_engineer_authorization_r3
for each row execute function public.estimate_keep_technology_r3_audit_append_only();

drop trigger if exists estimate_technology_acceptance_r3_immutable_trg
  on public.estimate_technology_passport_acceptance_r3;
create trigger estimate_technology_acceptance_r3_immutable_trg
before update or delete on public.estimate_technology_passport_acceptance_r3
for each row execute function public.estimate_keep_technology_r3_audit_append_only();

drop trigger if exists estimate_technology_acceptance_security_audit_r3_immutable_trg
  on public.estimate_technology_acceptance_security_audit_r3;
create trigger estimate_technology_acceptance_security_audit_r3_immutable_trg
before update or delete on public.estimate_technology_acceptance_security_audit_r3
for each row execute function public.estimate_keep_technology_r3_audit_append_only();

create or replace function public.estimate_validate_engineer_authorization_event_r3()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_previous_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(
    new.tenant_id::text||':'||new.engineer_user_id::text||':'||new.reviewer_scope,0
  ));
  select auth_event.id into v_previous_id
  from public.estimate_technology_engineer_authorization_r3 auth_event
  where auth_event.tenant_id=new.tenant_id
    and auth_event.engineer_user_id=new.engineer_user_id
    and auth_event.reviewer_scope=new.reviewer_scope
  order by auth_event.event_sequence desc
  limit 1;
  if v_previous_id is distinct from new.supersedes_authorization_id then
    raise exception using errcode='40001',message='ESTIMATE_TECHNOLOGY_R3_AUTHORIZATION_STALE_SUPERSEDES';
  end if;
  return new;
end;
$$;

drop trigger if exists estimate_technology_engineer_authorization_r3_validate_trg
  on public.estimate_technology_engineer_authorization_r3;
create trigger estimate_technology_engineer_authorization_r3_validate_trg
before insert on public.estimate_technology_engineer_authorization_r3
for each row execute function public.estimate_validate_engineer_authorization_event_r3();

create or replace function public.estimate_enforce_technology_passport_state_r3()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_definition public.estimate_definition_version%rowtype;
begin
  select * into v_definition
  from public.estimate_definition_version definition
  where definition.id=new.definition_version_id;
  if v_definition.id is null
    or v_definition.release_id<>new.release_id
    or v_definition.catalog_id<>new.catalog_id
    or v_definition.definition_sha256<>new.definition_sha256 then
    raise exception using errcode='55000',message='ESTIMATE_TECHNOLOGY_R3_DEFINITION_BINDING_MISMATCH';
  end if;
  if tg_op='UPDATE' and (
    new.definition_sha256<>old.definition_sha256
    or new.passport_content_sha256<>old.passport_content_sha256
    or new.source_set_sha256<>old.source_set_sha256
  ) then
    new.status := 'DRAFT';
    new.validator_decision := jsonb_build_object(
      'contract','real-useful-estimates.technology-passport-human-acceptance-r3.v1',
      'allowed',false,
      'status','DRAFT',
      'definitionSha256',new.definition_sha256,
      'passportContentSha256',new.passport_content_sha256,
      'sourceSetSha256',new.source_set_sha256
    );
  end if;
  new.updated_at_utc := clock_timestamp();
  return new;
end;
$$;

drop trigger if exists estimate_technology_passport_state_r3_trg
  on public.estimate_technology_passport_r3;
create trigger estimate_technology_passport_state_r3_trg
before insert or update on public.estimate_technology_passport_r3
for each row execute function public.estimate_enforce_technology_passport_state_r3();

create or replace function public.estimate_validate_technology_acceptance_r3()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_passport public.estimate_technology_passport_r3%rowtype;
  v_previous_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(
    new.tenant_id::text||':'||new.definition_version_id::text||':'||new.technology_variant_id,0
  ));
  select * into v_passport
  from public.estimate_technology_passport_r3 passport
  where passport.tenant_id=new.tenant_id
    and passport.definition_version_id=new.definition_version_id
    and passport.technology_variant_id=new.technology_variant_id;
  if v_passport.definition_version_id is null then
    raise exception using errcode='55000',message='ESTIMATE_TECHNOLOGY_R3_PASSPORT_MISSING';
  end if;
  if new.release_id<>v_passport.release_id
    or new.catalog_id<>v_passport.catalog_id
    or new.definition_sha256<>v_passport.definition_sha256
    or new.passport_content_sha256<>v_passport.passport_content_sha256
    or new.source_set_sha256<>v_passport.source_set_sha256
    or new.author_id<>v_passport.author_id then
    raise exception using errcode='55000',message='ESTIMATE_TECHNOLOGY_R3_ACCEPTANCE_BINDING_MISMATCH';
  end if;
  if new.author_id=new.reviewer_id then
    raise exception using errcode='55000',message='ESTIMATE_TECHNOLOGY_R3_AUTHOR_REVIEWER_COLLISION';
  end if;
  if new.reviewer_id is distinct from auth.uid()
    or public.estimate_request_jwt_role_r3()<>'authenticated' then
    raise exception using errcode='42501',message='ESTIMATE_TECHNOLOGY_R3_REVIEWER_IDENTITY_MISMATCH';
  end if;
  if not public.estimate_technology_engineer_authorized_r3(
    new.tenant_id,new.reviewer_id,new.reviewer_scope
  ) then
    raise exception using errcode='42501',message='ESTIMATE_TECHNOLOGY_R3_REVIEWER_NOT_AUTHORIZED';
  end if;
  select acceptance.acceptance_id into v_previous_id
  from public.estimate_technology_passport_acceptance_r3 acceptance
  where acceptance.tenant_id=new.tenant_id
    and acceptance.definition_version_id=new.definition_version_id
    and acceptance.technology_variant_id=new.technology_variant_id
  order by acceptance.decision_sequence desc
  limit 1;
  if v_previous_id is distinct from new.supersedes_acceptance_id then
    raise exception using errcode='40001',message='ESTIMATE_TECHNOLOGY_R3_STALE_SUPERSEDES';
  end if;
  return new;
end;
$$;

drop trigger if exists estimate_technology_acceptance_validate_r3_trg
  on public.estimate_technology_passport_acceptance_r3;
create trigger estimate_technology_acceptance_validate_r3_trg
before insert on public.estimate_technology_passport_acceptance_r3
for each row execute function public.estimate_validate_technology_acceptance_r3();

create or replace function public.estimate_project_technology_acceptance_state_r3()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  update public.estimate_technology_passport_r3
  set status=case
      when new.decision='ACCEPTED' then 'ENGINEER_ACCEPTED'
      when new.decision='REJECTED' then 'REJECTED'
      else 'DRAFT'
    end,
    validator_decision=jsonb_build_object(
      'contract','real-useful-estimates.technology-passport-human-acceptance-r3.v1',
      'allowed',new.decision='ACCEPTED',
      'status',case
        when new.decision='ACCEPTED' then 'ENGINEER_ACCEPTED'
        when new.decision='REJECTED' then 'REJECTED'
        else 'DRAFT'
      end,
      'definitionSha256',new.definition_sha256,
      'passportContentSha256',new.passport_content_sha256,
      'sourceSetSha256',new.source_set_sha256,
      'acceptanceManifestSha256',new.manifest_sha256
    )
  where tenant_id=new.tenant_id
    and definition_version_id=new.definition_version_id
    and technology_variant_id=new.technology_variant_id;
  return new;
end;
$$;

drop trigger if exists estimate_technology_acceptance_project_state_r3_trg
  on public.estimate_technology_passport_acceptance_r3;
create trigger estimate_technology_acceptance_project_state_r3_trg
after insert on public.estimate_technology_passport_acceptance_r3
for each row execute function public.estimate_project_technology_acceptance_state_r3();

create or replace view public.estimate_technology_passport_acceptance_history_r3
with (security_invoker=true)
as
select
  acceptance.*,
  lead(acceptance.decided_at_utc) over (
    partition by acceptance.tenant_id,acceptance.definition_version_id,acceptance.technology_variant_id
    order by acceptance.decision_sequence
  ) as effective_invalidated_at_utc
from public.estimate_technology_passport_acceptance_r3 acceptance;

create or replace view public.estimate_technology_passport_acceptance_current_r3
with (security_invoker=true)
as
select ranked.*
from (
  select acceptance.*,
    row_number() over (
      partition by acceptance.tenant_id,acceptance.definition_version_id,acceptance.technology_variant_id
      order by acceptance.decision_sequence desc
    ) as current_rank
  from public.estimate_technology_passport_acceptance_r3 acceptance
) ranked
where ranked.current_rank=1;

revoke all on public.estimate_technology_passport_acceptance_history_r3 from public,anon,authenticated,service_role;
revoke all on public.estimate_technology_passport_acceptance_current_r3 from public,anon,authenticated,service_role;
grant select on public.estimate_technology_passport_acceptance_history_r3 to authenticated;
grant select on public.estimate_technology_passport_acceptance_current_r3 to authenticated;

create or replace function public.estimate_submit_technology_passport_candidate_r3(
  p_candidate jsonb,
  p_candidate_manifest_sha256 text
)
returns table(definition_version_id uuid,technology_variant_id text,status text,created boolean)
language plpgsql
security definer
set search_path=''
as $$
declare
  v_tenant_id uuid;
  v_definition_version_id uuid;
  v_release_id uuid;
  v_author_id uuid;
  v_existing public.estimate_technology_passport_r3%rowtype;
begin
  begin
    v_tenant_id := nullif(p_candidate->>'tenantId','')::uuid;
    v_definition_version_id := nullif(p_candidate->>'definitionVersionId','')::uuid;
    v_release_id := nullif(p_candidate->>'releaseId','')::uuid;
    v_author_id := nullif(p_candidate->>'authorId','')::uuid;
  exception when others then
    raise exception using errcode='22023',message='ESTIMATE_TECHNOLOGY_R3_CANDIDATE_IDENTITY_INVALID';
  end;
  if public.estimate_request_jwt_role_r3()='service_role' then
    insert into public.estimate_technology_acceptance_security_audit_r3(
      tenant_id,actor_user_id,actor_jwt_role,action,outcome,reason,request_sha256
    ) values (
      v_tenant_id,auth.uid(),public.estimate_request_jwt_role_r3(),'SUBMIT_CANDIDATE','BLOCKED',
      'SERVICE_ROLE_PRODUCT_PATH_FORBIDDEN',p_candidate_manifest_sha256
    );
    return query select null::uuid,null::text,'SERVICE_ROLE_BLOCKED'::text,false;
    return;
  end if;
  if public.estimate_request_jwt_role_r3()<>'authenticated' or auth.uid() is null or auth.uid()<>v_author_id then
    raise exception using errcode='42501',message='ESTIMATE_TECHNOLOGY_R3_AUTHOR_IDENTITY_MISMATCH';
  end if;
  if p_candidate_manifest_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception using errcode='22023',message='ESTIMATE_TECHNOLOGY_R3_CANDIDATE_MANIFEST_SHA_INVALID';
  end if;
  if not public.estimate_technology_engineer_authorized_r3(
    v_tenant_id,v_author_id,p_candidate->>'engineeringScope'
  ) then
    raise exception using errcode='42501',message='ESTIMATE_TECHNOLOGY_R3_AUTHOR_NOT_AUTHORIZED';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(
    v_tenant_id::text||':'||v_definition_version_id::text||':'||(p_candidate->>'technologyVariantId'),0
  ));
  select * into v_existing
  from public.estimate_technology_passport_r3 passport
  where passport.tenant_id=v_tenant_id
    and passport.definition_version_id=v_definition_version_id
    and passport.technology_variant_id=p_candidate->>'technologyVariantId';
  if v_existing.definition_version_id is not null
    and v_existing.candidate_manifest_sha256=p_candidate_manifest_sha256 then
    return query select v_existing.definition_version_id,v_existing.technology_variant_id,v_existing.status,false;
    return;
  end if;
  if v_existing.definition_version_id is not null and v_existing.author_id<>v_author_id then
    raise exception using errcode='42501',message='ESTIMATE_TECHNOLOGY_R3_CANDIDATE_AUTHOR_CHANGE_FORBIDDEN';
  end if;
  insert into public.estimate_technology_passport_r3(
    tenant_id,definition_version_id,release_id,catalog_id,technology_variant_id,
    contract_version,definition_sha256,passport_content_sha256,source_set_sha256,
    candidate_manifest_sha256,author_id,author_audit_identity,author_role,
    authorship_origin,author_created_by_agent,engineering_scope,status,
    passport_payload,source_claims,validator_decision
  ) values (
    v_tenant_id,v_definition_version_id,v_release_id,p_candidate->>'catalogId',
    p_candidate->>'technologyVariantId',p_candidate->>'contract',
    p_candidate->>'definitionSha256',p_candidate->>'passportContentSha256',
    p_candidate->>'sourceSetSha256',p_candidate_manifest_sha256,v_author_id,
    p_candidate->>'authorAuditIdentity','ENGINEER','HUMAN_ENGINEERING_WORKFLOW',false,
    p_candidate->>'engineeringScope','DRAFT',p_candidate->'passportPayload',
    p_candidate->'sourceClaims',jsonb_build_object(
      'contract','real-useful-estimates.technology-passport-human-acceptance-r3.v1',
      'allowed',false,'status','DRAFT','definitionSha256',p_candidate->>'definitionSha256',
      'passportContentSha256',p_candidate->>'passportContentSha256',
      'sourceSetSha256',p_candidate->>'sourceSetSha256'
    )
  )
  on conflict on constraint estimate_technology_passport_r3_pkey do update set
    definition_sha256=excluded.definition_sha256,
    passport_content_sha256=excluded.passport_content_sha256,
    source_set_sha256=excluded.source_set_sha256,
    candidate_manifest_sha256=excluded.candidate_manifest_sha256,
    passport_payload=excluded.passport_payload,
    source_claims=excluded.source_claims
  returning estimate_technology_passport_r3.definition_version_id,
    estimate_technology_passport_r3.technology_variant_id,
    estimate_technology_passport_r3.status,(v_existing.definition_version_id is null)
  into definition_version_id,technology_variant_id,status,created;
  return next;
end;
$$;

create or replace function public.estimate_record_technology_acceptance_r3(
  p_manifest jsonb,
  p_manifest_sha256 text
)
returns table(acceptance_id uuid,decision_sequence bigint,outcome text,created boolean)
language plpgsql
security definer
set search_path=''
as $$
declare
  v_tenant_id uuid;
  v_definition_version_id uuid;
  v_release_id uuid;
  v_author_id uuid;
  v_reviewer_id uuid;
  v_supersedes_id uuid;
  v_existing public.estimate_technology_passport_acceptance_r3%rowtype;
begin
  begin
    v_tenant_id := nullif(p_manifest->>'tenantId','')::uuid;
    v_definition_version_id := nullif(p_manifest->>'definitionVersionId','')::uuid;
    v_release_id := nullif(p_manifest->>'releaseId','')::uuid;
    v_author_id := nullif(p_manifest->>'authorId','')::uuid;
    v_reviewer_id := nullif(p_manifest->>'reviewerId','')::uuid;
    v_supersedes_id := nullif(p_manifest->>'supersedesAcceptanceId','')::uuid;
  exception when others then
    raise exception using errcode='22023',message='ESTIMATE_TECHNOLOGY_R3_ACCEPTANCE_IDENTITY_INVALID';
  end;
  if public.estimate_request_jwt_role_r3()='service_role' then
    insert into public.estimate_technology_acceptance_security_audit_r3(
      tenant_id,actor_user_id,actor_jwt_role,action,outcome,reason,request_sha256
    ) values (
      v_tenant_id,auth.uid(),public.estimate_request_jwt_role_r3(),'RECORD_ACCEPTANCE','BLOCKED',
      'SERVICE_ROLE_PRODUCT_PATH_FORBIDDEN',p_manifest_sha256
    );
    return query select null::uuid,null::bigint,'SERVICE_ROLE_BLOCKED'::text,false;
    return;
  end if;
  if public.estimate_request_jwt_role_r3()<>'authenticated' or auth.uid() is null or auth.uid()<>v_reviewer_id then
    raise exception using errcode='42501',message='ESTIMATE_TECHNOLOGY_R3_REVIEWER_IDENTITY_MISMATCH';
  end if;
  if p_manifest_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception using errcode='22023',message='ESTIMATE_TECHNOLOGY_R3_MANIFEST_SHA_INVALID';
  end if;
  if p_manifest->>'reviewerRole'<>'engineer'
    or p_manifest->>'acceptanceOrigin'<>'HUMAN_SIGNED_AUDIT'
    or p_manifest->>'createdByAgent'<>'false' then
    raise exception using errcode='42501',message='ESTIMATE_TECHNOLOGY_R3_HUMAN_ENGINEER_REQUIRED';
  end if;
  if not public.estimate_technology_engineer_authorized_r3(
    v_tenant_id,v_reviewer_id,p_manifest->>'reviewerScope'
  ) then
    raise exception using errcode='42501',message='ESTIMATE_TECHNOLOGY_R3_REVIEWER_NOT_AUTHORIZED';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(
    v_tenant_id::text||':'||v_definition_version_id::text||':'||(p_manifest->>'technologyVariantId'),0
  ));
  select * into v_existing
  from public.estimate_technology_passport_acceptance_r3 acceptance
  where acceptance.tenant_id=v_tenant_id
    and acceptance.manifest_sha256=p_manifest_sha256;
  if v_existing.acceptance_id is not null then
    if v_existing.manifest_payload<>p_manifest then
      raise exception using errcode='23505',message='ESTIMATE_TECHNOLOGY_R3_MANIFEST_SHA_COLLISION';
    end if;
    return query select v_existing.acceptance_id,v_existing.decision_sequence,
      'IDEMPOTENT_REPLAY'::text,false;
    return;
  end if;
  insert into public.estimate_technology_passport_acceptance_r3(
    tenant_id,definition_version_id,release_id,catalog_id,technology_variant_id,
    contract_version,definition_sha256,passport_content_sha256,source_set_sha256,
    author_id,reviewer_id,reviewer_role,reviewer_scope,decision,review_comment,
    signature_or_audit_id,acceptance_origin,created_by_agent,created_at_utc,
    decided_at_utc,invalidated_at_utc,supersedes_acceptance_id,manifest_payload,manifest_sha256
  ) values (
    v_tenant_id,v_definition_version_id,v_release_id,p_manifest->>'catalogId',
    p_manifest->>'technologyVariantId',p_manifest->>'contract',
    p_manifest->>'definitionSha256',p_manifest->>'passportContentSha256',
    p_manifest->>'sourceSetSha256',v_author_id,v_reviewer_id,
    p_manifest->>'reviewerRole',p_manifest->>'reviewerScope',p_manifest->>'decision',
    p_manifest->>'comment',p_manifest->>'signatureOrAuditId',
    p_manifest->>'acceptanceOrigin',false,
    (p_manifest->>'createdAtUtc')::timestamptz,(p_manifest->>'decidedAtUtc')::timestamptz,
    null,v_supersedes_id,p_manifest,p_manifest_sha256
  )
  returning estimate_technology_passport_acceptance_r3.acceptance_id,
    estimate_technology_passport_acceptance_r3.decision_sequence,
    'RECORDED'::text,true
  into acceptance_id,decision_sequence,outcome,created;
  return next;
end;
$$;

revoke all on function public.estimate_submit_technology_passport_candidate_r3(jsonb,text)
  from public,anon,authenticated,service_role;
revoke all on function public.estimate_record_technology_acceptance_r3(jsonb,text)
  from public,anon,authenticated,service_role;
grant execute on function public.estimate_submit_technology_passport_candidate_r3(jsonb,text)
  to authenticated,service_role;
grant execute on function public.estimate_record_technology_acceptance_r3(jsonb,text)
  to authenticated,service_role;

create or replace function public.estimate_technology_passport_exact_accepted_r3(
  p_tenant_id uuid,
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
    join public.estimate_technology_passport_r3 passport
      on passport.tenant_id=p_tenant_id
      and passport.definition_version_id=manifest.definition_version_id
      and passport.release_id=manifest.release_id
      and passport.catalog_id=manifest.catalog_id
    join lateral (
      select decision.*
      from public.estimate_technology_passport_acceptance_r3 decision
      where decision.tenant_id=passport.tenant_id
        and decision.definition_version_id=passport.definition_version_id
        and decision.technology_variant_id=passport.technology_variant_id
      order by decision.decision_sequence desc
      limit 1
    ) acceptance on true
    where manifest.release_id=p_release_id
      and manifest.catalog_id=p_catalog_id
      and passport.status='ENGINEER_ACCEPTED'
      and passport.definition_sha256=definition.definition_sha256
      and passport.validator_decision->>'allowed'='true'
      and passport.validator_decision->>'status'='ENGINEER_ACCEPTED'
      and acceptance.decision='ACCEPTED'
      and acceptance.invalidated_at_utc is null
      and acceptance.definition_sha256=passport.definition_sha256
      and acceptance.passport_content_sha256=passport.passport_content_sha256
      and acceptance.source_set_sha256=passport.source_set_sha256
      and acceptance.author_id=passport.author_id
      and acceptance.reviewer_id<>passport.author_id
      and public.estimate_technology_engineer_authorized_r3(
        passport.tenant_id,acceptance.reviewer_id,acceptance.reviewer_scope
      )
  );
$$;

create or replace function public.estimate_technology_passport_any_exact_accepted_r3(
  p_definition_version_id uuid
)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select exists(
    select 1
    from public.estimate_technology_passport_r3 passport
    join lateral (
      select decision.*
      from public.estimate_technology_passport_acceptance_r3 decision
      where decision.tenant_id=passport.tenant_id
        and decision.definition_version_id=passport.definition_version_id
        and decision.technology_variant_id=passport.technology_variant_id
      order by decision.decision_sequence desc
      limit 1
    ) acceptance on true
    where passport.definition_version_id=p_definition_version_id
      and passport.status='ENGINEER_ACCEPTED'
      and acceptance.decision='ACCEPTED'
      and acceptance.definition_sha256=passport.definition_sha256
      and acceptance.passport_content_sha256=passport.passport_content_sha256
      and acceptance.source_set_sha256=passport.source_set_sha256
      and acceptance.author_id<>acceptance.reviewer_id
      and public.estimate_technology_engineer_authorized_r3(
        passport.tenant_id,acceptance.reviewer_id,acceptance.reviewer_scope
      )
  );
$$;

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
  select false;
$$;

create or replace function public.estimate_content_passport_exact_r3(
  p_release_id uuid,
  p_catalog_id text,
  p_tenant_id uuid
)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select p_tenant_id is not null and exists(
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
      and public.estimate_technology_passport_exact_accepted_r3(
        p_tenant_id,p_release_id,p_catalog_id
      )
  );
$$;

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
  select false;
$$;

create or replace function public.estimate_enforce_content_gate_promotion_r3()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_passport public.estimate_content_passport_r3%rowtype;
begin
  if new.content_gate_status<>'GREEN' then return new; end if;
  if new.content_status not in ('CANDIDATE_READY','PRODUCTION') then
    raise exception using errcode='55000',message='ESTIMATE_CONTENT_R3_GREEN_STATUS_INVALID';
  end if;
  select * into v_passport from public.estimate_content_passport_r3 passport
  where passport.definition_version_id=new.id
    and passport.release_id=new.release_id
    and passport.catalog_id=new.catalog_id;
  if v_passport.definition_version_id is null then
    raise exception using errcode='55000',message='ESTIMATE_CONTENT_R3_PASSPORT_MISSING';
  end if;
  if v_passport.parameter_count<>(
      select count(*)::integer from public.estimate_parameter_definition parameter
      where parameter.definition_version_id=new.id
    ) or v_passport.formula_count<>(
      select count(*)::integer from public.estimate_formula_graph formula
      where formula.definition_version_id=new.id
    ) or v_passport.resource_count<>(
      select count(*)::integer from public.estimate_resource_spec resource
      where resource.definition_version_id=new.id
    ) then
    raise exception using errcode='55000',message='ESTIMATE_CONTENT_R3_PASSPORT_COUNT_DRIFT';
  end if;
  if not public.estimate_technology_passport_any_exact_accepted_r3(new.id) then
    raise exception using errcode='55000',message='ESTIMATE_TECHNOLOGY_R3_HUMAN_ACCEPTANCE_MISSING';
  end if;
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

create or replace function public.estimate_enforce_revision_content_passport_r3()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  if new.organization_id is null or not public.estimate_content_passport_exact_r3(
    new.release_id,new.catalog_id,new.organization_id
  ) then
    raise exception using errcode='55000',message='ESTIMATE_CONTENT_R3_REVISION_PERSISTENCE_BLOCKED';
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
begin
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

revoke all on function public.estimate_keep_technology_r3_audit_append_only() from public,anon,authenticated,service_role;
revoke all on function public.estimate_validate_engineer_authorization_event_r3() from public,anon,authenticated,service_role;
revoke all on function public.estimate_enforce_technology_passport_state_r3() from public,anon,authenticated,service_role;
revoke all on function public.estimate_validate_technology_acceptance_r3() from public,anon,authenticated,service_role;
revoke all on function public.estimate_project_technology_acceptance_state_r3() from public,anon,authenticated,service_role;
revoke all on function public.estimate_technology_passport_exact_accepted_r3(uuid,uuid,text) from public,anon,authenticated,service_role;
revoke all on function public.estimate_technology_passport_any_exact_accepted_r3(uuid) from public,anon,authenticated,service_role;
revoke all on function public.estimate_technology_passport_exact_accepted_r2(uuid,text) from public,anon,authenticated,service_role;
revoke all on function public.estimate_content_passport_exact_r3(uuid,text,uuid) from public,anon,authenticated,service_role;
revoke all on function public.estimate_content_passport_exact_r3(uuid,text) from public,anon,authenticated,service_role;
revoke all on function public.estimate_enforce_content_gate_promotion_r3() from public,anon,authenticated,service_role;
revoke all on function public.estimate_enforce_job_content_passport_r3() from public,anon,authenticated,service_role;
revoke all on function public.estimate_enforce_revision_content_passport_r3() from public,anon,authenticated,service_role;
revoke all on function public.estimate_enforce_artifact_content_passport_r3() from public,anon,authenticated,service_role;

comment on table public.estimate_technology_passport_acceptance_r3 is
  'R3 immutable tenant-scoped engineering decision event log. Current state is the highest decision_sequence.';
comment on function public.estimate_record_technology_acceptance_r3(jsonb,text) is
  'Authenticated engineer-only idempotent decision command. Service-role product calls are logged and rejected.';
comment on function public.estimate_content_passport_exact_r3(uuid,text) is
  'Deprecated unscoped overload. Always false; runtime callers must supply tenant_id.';

commit;
