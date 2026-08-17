-- P0 ONE MONOLITH R5.7: logical cumulative release without copying accepted model rows.
-- Historical r54 object suffixes are retained for forward-only compatibility.

begin;

create table public.estimate_cumulative_manifest_entry (
  release_id uuid not null references public.estimate_definition_release(id) on delete restrict,
  catalog_id text not null references public.estimate_work_identity(catalog_id) on delete restrict,
  definition_version_id uuid not null references public.estimate_definition_version(id) on delete restrict,
  source_batch text not null,
  check (upper(source_batch) not like 'BATCH009%'),
  source_release_id uuid not null references public.estimate_definition_release(id) on delete restrict,
  domain_id text not null,
  publication_state text not null check (publication_state in ('ACCEPTED_INHERITED','CANONICAL_SUCCESSOR')),
  approved_template_baseline_id uuid references public.estimate_approved_template_baseline(id) on delete restrict,
  baseline_ready boolean not null default false,
  scenario_ready boolean not null default false,
  definition_hash text not null check (definition_hash ~ '^[0-9a-f]{64}$'),
  entry_sha256 text not null check (entry_sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  primary key (release_id,catalog_id),
  unique (release_id,definition_version_id)
);

create index estimate_cumulative_manifest_definition_idx
  on public.estimate_cumulative_manifest_entry(definition_version_id,release_id);

create or replace function public.estimate_guard_cumulative_manifest_r54()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_release_id uuid;
  v_sealed_at timestamptz;
begin
  v_release_id := case when tg_op='DELETE' then old.release_id else new.release_id end;
  select sealed_at into v_sealed_at from public.estimate_definition_release where id=v_release_id;
  if v_sealed_at is not null then
    raise exception using errcode='55000',message='sealed cumulative manifest is immutable';
  end if;
  return case when tg_op='DELETE' then old else new end;
end;
$$;

create trigger estimate_cumulative_manifest_immutable_r54_trg
before insert or update or delete on public.estimate_cumulative_manifest_entry
for each row execute function public.estimate_guard_cumulative_manifest_r54();

create or replace function public.estimate_effective_semantic_owner_r54(p_row_id text,p_semantic_owner text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  -- Never manufacture uniqueness here. Candidate admission must repair only
  -- census-proven blank/duplicate owners and preserve every valid owner.
  select nullif(trim(p_semantic_owner),'');
$$;

create or replace view public.estimate_effective_resource_spec_r54 as
select
  r.id,r.definition_version_id,r.row_id,r.ordinal,r.section,r.category,r.title_ru,r.row_type,
  r.unit_id,r.formula_id,r.inclusion_ast,r.resource_graph,
  public.estimate_effective_semantic_owner_r54(r.row_id,r.semantic_owner) semantic_owner,
  r.semantic_owner source_semantic_owner,r.cost_owner_id,r.procurement_eligible,r.source_metadata,
  r.row_sha256,r.created_at
from public.estimate_resource_spec r;

create or replace function public.estimate_revision_row_semantic_owner_r3()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_resource public.estimate_resource_spec%rowtype;
begin
  if new.resource_spec_id is not null then
    select * into strict v_resource from public.estimate_resource_spec where id=new.resource_spec_id;
    new.semantic_owner := public.estimate_effective_semantic_owner_r54(v_resource.row_id,v_resource.semantic_owner);
    if new.semantic_owner is null then
      raise exception using errcode='23502',message='revision resource semantic owner is missing';
    end if;
    new.physical_row_type := v_resource.row_type;
  elsif jsonb_typeof(new.calculation_trace)='object' then
    new.semantic_owner := public.estimate_effective_semantic_owner_r54(
      coalesce(new.calculation_trace->>'rowId',new.id::text),
      new.calculation_trace->>'semanticOwner'
    );
    if new.semantic_owner is null then
      raise exception using errcode='23502',message='revision trace semantic owner is missing';
    end if;
    new.physical_row_type := nullif(trim(new.calculation_trace->>'physicalRowType'),'');
  end if;
  return new;
end;
$$;

create or replace function public.estimate_bind_revision_truth_r1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_definition public.estimate_definition_version%rowtype;
  v_parameter_schema_hash text;
begin
  select v.* into v_definition
  from public.estimate_definition_version v
  where v.catalog_id=new.catalog_id and (
    v.release_id=new.release_id or exists(
      select 1 from public.estimate_cumulative_manifest_entry m
      where m.release_id=new.release_id and m.catalog_id=new.catalog_id and m.definition_version_id=v.id
    )
  )
  order by (v.release_id=new.release_id) desc
  limit 1;
  if v_definition.id is null then
    raise exception using errcode='55000',message='revision cumulative definition/release binding is missing';
  end if;
  select encode(extensions.digest(convert_to(coalesce(string_agg(
    jsonb_build_array(p.parameter_id,p.ordinal,p.value_type,p.unit_id,p.title_ru,p.required,
      p.default_value,p.constraints_json,p.truth_metadata)::text,E'\n' order by p.ordinal,p.parameter_id
  ),''),'UTF8'),'sha256'),'hex')
  into v_parameter_schema_hash
  from public.estimate_parameter_definition p where p.definition_version_id=v_definition.id;
  new.definition_version := v_definition.definition_version;
  new.compiler_owner := 'backend';
  new.parameter_schema_hash := v_parameter_schema_hash;
  new.input_hash := encode(extensions.digest(convert_to(new.input_parameters::text,'UTF8'),'sha256'),'hex');
  new.output_hash := new.checksum_sha256;
  return new;
end;
$$;

create or replace function public.estimate_create_cumulative_admission_job_r54(
  p_release_id uuid,
  p_admission_run_id text,
  p_test_owner_user_id uuid,
  p_test_organization_id uuid,
  p_idempotency_key text,
  p_operation text,
  p_catalog_id text,
  p_parent_revision_id uuid,
  p_input_payload jsonb
)
returns table(job_id uuid,job_status text,created boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.estimate_compile_job%rowtype;
  v_payload jsonb;
begin
  if current_user not in ('postgres','service_role') then
    raise exception using errcode='42501',message='service role required';
  end if;
  if nullif(trim(p_admission_run_id),'') is null or length(p_admission_run_id)>200
    or p_test_owner_user_id is null or p_test_organization_id is null
    or nullif(trim(p_idempotency_key),'') is null or length(p_idempotency_key)>200
    or p_operation not in ('compile','recalculate')
    or jsonb_typeof(p_input_payload)<>'object'
    or jsonb_typeof(p_input_payload->'parameters')<>'object'
    or not exists(select 1 from public.estimate_definition_release r where r.id=p_release_id and r.status='prepared')
    or exists(select 1 from public.estimate_definition_release_admission_seal a where a.release_id=p_release_id)
    or not exists(
      select 1 from public.estimate_cumulative_manifest_entry m
      where m.release_id=p_release_id and m.catalog_id=p_catalog_id
        and m.baseline_ready and m.scenario_ready
    ) then
    raise exception using errcode='22023',message='invalid cumulative release admission request';
  end if;
  if p_operation='compile' and p_parent_revision_id is not null then
    raise exception using errcode='22023',message='cumulative compile cannot have a parent';
  end if;
  if p_operation='recalculate' and not exists(
    select 1 from public.estimate_revision r where r.id=p_parent_revision_id
      and r.release_id=p_release_id and r.owner_user_id=p_test_owner_user_id
      and r.organization_id=p_test_organization_id and r.catalog_id=p_catalog_id
  ) then
    raise exception using errcode='22023',message='cumulative recalculate parent mismatch';
  end if;
  v_payload := p_input_payload || jsonb_build_object(
    'releaseAdmission',true,'cumulativeManifest',true,'admissionRunId',trim(p_admission_run_id)
  );
  insert into public.estimate_compile_job(
    idempotency_key,organization_id,owner_user_id,operation,catalog_id,parent_revision_id,input_payload,target_release_id
  ) values(
    trim(p_idempotency_key),p_test_organization_id,p_test_owner_user_id,p_operation,p_catalog_id,
    p_parent_revision_id,v_payload,p_release_id
  ) on conflict(owner_user_id,idempotency_key) do nothing returning * into v_job;
  if v_job.id is null then
    select * into v_job from public.estimate_compile_job j
    where j.owner_user_id=p_test_owner_user_id and j.idempotency_key=trim(p_idempotency_key);
    if v_job.target_release_id<>p_release_id or v_job.operation<>p_operation
      or v_job.catalog_id<>p_catalog_id or v_job.parent_revision_id is distinct from p_parent_revision_id
      or v_job.organization_id<>p_test_organization_id or v_job.input_payload<>v_payload then
      raise exception using errcode='23505',message='cumulative admission idempotency conflict';
    end if;
    return query select v_job.id,v_job.status,false;
    return;
  end if;
  return query select v_job.id,v_job.status,true;
end;
$$;

alter table public.estimate_cumulative_manifest_entry enable row level security;
revoke all on public.estimate_cumulative_manifest_entry from anon,authenticated;
grant select on public.estimate_cumulative_manifest_entry to authenticated;
grant all on public.estimate_cumulative_manifest_entry to service_role;
revoke all on function public.estimate_create_cumulative_admission_job_r54(uuid,text,uuid,uuid,text,text,text,uuid,jsonb) from public;
grant execute on function public.estimate_create_cumulative_admission_job_r54(uuid,text,uuid,uuid,text,text,text,uuid,jsonb) to service_role;

create policy estimate_cumulative_manifest_read_r54
on public.estimate_cumulative_manifest_entry for select
using (exists(
  select 1 from public.estimate_definition_release r
  where r.id=release_id and r.status in ('active','retired')
));

commit;
