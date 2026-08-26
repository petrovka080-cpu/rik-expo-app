-- MASTER PRODUCTION-TZ R3 sections 36-38: a GREEN content state requires an immutable,
-- count-bound Content Passport decision. Alias/redirect identities remain search-only.

begin;

create table if not exists public.estimate_content_passport_r3 (
  definition_version_id uuid primary key references public.estimate_definition_version(id) on delete restrict,
  release_id uuid not null references public.estimate_definition_release(id) on delete restrict,
  catalog_id text not null,
  contract_version text not null check (contract_version='real-professional-estimates-r3.content-passport.v1'),
  identity_mode text not null check (identity_mode in ('WORK','ALIAS_ONLY','REDIRECT')),
  redirect_catalog_id text,
  physical_result_ru text not null,
  included_scope_ru jsonb not null default '[]'::jsonb,
  excluded_scope_ru jsonb not null default '[]'::jsonb,
  capability_matrix jsonb not null,
  parameter_count integer not null check (parameter_count>=0),
  formula_count integer not null check (formula_count>=0),
  resource_count integer not null check (resource_count>=0),
  decision jsonb not null,
  payload_sha256 text not null check (payload_sha256~'^[0-9a-f]{64}$'),
  source_head text not null,
  source_tree text not null,
  created_at timestamptz not null default now(),
  unique(release_id,catalog_id),
  check (jsonb_typeof(included_scope_ru)='array'),
  check (jsonb_typeof(excluded_scope_ru)='array'),
  check (jsonb_typeof(capability_matrix)='array' and jsonb_array_length(capability_matrix)=4),
  check (jsonb_typeof(decision)='object'),
  check (decision->>'contract'='real-professional-estimates-r3.content-passport.v1'),
  check (decision->>'allowed'='true' and decision->>'status'='GREEN'),
  check (
    (identity_mode='REDIRECT' and length(trim(coalesce(redirect_catalog_id,'')))>0)
    or (identity_mode<>'REDIRECT' and redirect_catalog_id is null)
  ),
  check (
    (identity_mode='WORK' and length(trim(physical_result_ru))>0 and resource_count>0)
    or (identity_mode in ('ALIAS_ONLY','REDIRECT') and resource_count=0 and parameter_count=0 and formula_count=0)
  )
);

alter table public.estimate_content_passport_r3 enable row level security;
revoke all on table public.estimate_content_passport_r3 from public,anon,authenticated;
grant all on table public.estimate_content_passport_r3 to service_role;

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
  return new;
end;
$$;

drop trigger if exists estimate_definition_content_gate_insert_r3_trg on public.estimate_definition_version;
create trigger estimate_definition_content_gate_insert_r3_trg
before insert on public.estimate_definition_version
for each row execute function public.estimate_enforce_content_gate_promotion_r3();

drop trigger if exists estimate_definition_content_gate_update_r3_trg on public.estimate_definition_version;
create trigger estimate_definition_content_gate_update_r3_trg
before update of content_status,content_gate_status on public.estimate_definition_version
for each row execute function public.estimate_enforce_content_gate_promotion_r3();

create or replace function public.estimate_enforce_content_passport_immutability_r3()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_release_id uuid;
  v_release_status text;
begin
  v_release_id := case when tg_op='DELETE' then old.release_id else new.release_id end;
  select release.status into v_release_status
  from public.estimate_definition_release release
  where release.id=v_release_id;
  if v_release_status in ('prepared','active') then
    raise exception using errcode='55000',message='ESTIMATE_CONTENT_R3_PASSPORT_IMMUTABLE';
  end if;
  return case when tg_op='DELETE' then old else new end;
end;
$$;

drop trigger if exists estimate_content_passport_immutable_r3_trg on public.estimate_content_passport_r3;
create trigger estimate_content_passport_immutable_r3_trg
before update or delete on public.estimate_content_passport_r3
for each row execute function public.estimate_enforce_content_passport_immutability_r3();

revoke all on function public.estimate_enforce_content_gate_promotion_r3() from public,anon,authenticated;
revoke all on function public.estimate_enforce_content_passport_immutability_r3() from public,anon,authenticated;

comment on table public.estimate_content_passport_r3 is
  'Immutable R3 technology/content decision. A definition cannot become content GREEN unless row, formula and parameter counts match it exactly.';

commit;
