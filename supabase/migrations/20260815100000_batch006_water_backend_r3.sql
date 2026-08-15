-- BATCH-006 R3. Backend-native water, sewerage, drainage and plumbing domain.
-- This migration adds generic successor-release admission and an atomic queue
-- transition. It never embeds domain definitions in a client runtime.

begin;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

alter table public.estimate_program_control_state
  add column program_state_version bigint,
  add column state_sha256 text,
  add column water_domain_complete boolean not null default false,
  add column water_domain_remaining integer not null default 845,
  add column global_content_complete boolean not null default false,
  add column batch007_selected boolean not null default false,
  add column batch007_execution_started boolean not null default false;

update public.estimate_program_control_state s
set program_state_version = (select coalesce(max(e.id), 0)::bigint from public.estimate_program_event e),
    state_sha256 = encode(extensions.digest(convert_to((jsonb_build_object(
      'denominator', s.denominator_total,
      'admitted', s.admitted_global_count,
      'remaining', s.queue_remaining,
      'external', s.external_reference_count,
      'batch006Started', s.batch006_started,
      'waterDomainComplete', false,
      'waterDomainRemaining', 845,
      'globalContentComplete', false,
      'batch007Selected', false,
      'batch007ExecutionStarted', false,
      'programStateVersion', (select coalesce(max(e.id), 0)::bigint from public.estimate_program_event e)
    ))::text, 'UTF8'), 'sha256'), 'hex')
where s.singleton = true;

alter table public.estimate_program_control_state
  alter column program_state_version set not null,
  alter column state_sha256 set not null,
  add constraint estimate_program_state_sha256_ck check (state_sha256 ~ '^[0-9a-f]{64}$'),
  add constraint estimate_program_water_remaining_ck check (water_domain_remaining between 0 and denominator_total),
  add constraint estimate_program_batch007_order_ck check (
    not batch007_execution_started or batch007_selected
  ),
  add constraint estimate_program_water_complete_ck check (
    water_domain_complete = (water_domain_remaining = 0)
  );

create table public.estimate_professional_passport (
  definition_version_id uuid primary key references public.estimate_definition_version(id) on delete restrict,
  release_id uuid not null references public.estimate_definition_release(id) on delete restrict,
  catalog_id text not null references public.estimate_work_identity(catalog_id) on delete restrict,
  passport_version text not null,
  passport jsonb not null check (jsonb_typeof(passport) = 'object'),
  parameter_cardinality integer not null check (parameter_cardinality > 0),
  resource_cardinality integer not null check (resource_cardinality > 0),
  passport_sha256 text not null check (passport_sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  unique (release_id, catalog_id)
);

create or replace function public.estimate_validate_professional_passport_v3()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.estimate_definition_version v
    where v.id = new.definition_version_id
      and v.release_id = new.release_id
      and v.catalog_id = new.catalog_id
  ) then
    raise exception using errcode = '23503', message = 'professional passport definition lineage mismatch';
  end if;
  return new;
end;
$$;

create trigger estimate_professional_passport_lineage_trg
before insert on public.estimate_professional_passport
for each row execute function public.estimate_validate_professional_passport_v3();

create trigger estimate_professional_passport_immutable_trg
before update or delete on public.estimate_professional_passport
for each row execute function public.estimate_guard_definition_mutation_v1();

create table public.estimate_domain_release_admission_seal (
  release_id uuid not null references public.estimate_definition_release(id) on delete restrict,
  domain_id text not null check (domain_id ~ '^[a-z][a-z0-9_]*$'),
  proof_sha256 text not null check (proof_sha256 ~ '^[0-9a-f]{64}$'),
  independent_audit_sha256 text not null check (independent_audit_sha256 ~ '^[0-9a-f]{64}$'),
  definition_count integer not null check (definition_count > 0),
  parameter_count integer not null check (parameter_count > 0),
  formula_count integer not null check (formula_count > 0),
  resource_count integer not null check (resource_count > 0),
  compile_count integer not null check (compile_count > 0),
  recalculate_count integer not null check (recalculate_count > 0),
  scenario_count integer not null check (scenario_count > 0),
  reached_resource_count integer not null check (reached_resource_count > 0),
  invalid_parameter_combinations integer not null check (invalid_parameter_combinations = 0),
  mutually_exclusive_simultaneous integer not null check (mutually_exclusive_simultaneous = 0),
  double_count integer not null check (double_count = 0),
  unreachable_rows integer not null check (unreachable_rows = 0),
  padding_rows integer not null check (padding_rows = 0),
  test_runtime_residue integer not null check (test_runtime_residue = 0),
  predecessor_regression jsonb not null check (jsonb_typeof(predecessor_regression) = 'object'),
  sealed_at timestamptz not null default now(),
  primary key (release_id, domain_id)
);

create trigger estimate_domain_release_admission_seal_immutable_trg
before update or delete on public.estimate_domain_release_admission_seal
for each row execute function public.estimate_reject_mutation_v1();

create table public.estimate_program_control_transition (
  id bigint generated always as identity primary key,
  transition_key text not null unique,
  release_id uuid not null references public.estimate_definition_release(id) on delete restrict,
  predecessor_release_id uuid not null references public.estimate_definition_release(id) on delete restrict,
  state_version_before bigint not null,
  state_version_after bigint not null check (state_version_after = state_version_before + 1),
  state_hash_before text not null check (state_hash_before ~ '^[0-9a-f]{64}$'),
  state_hash_after text not null check (state_hash_after ~ '^[0-9a-f]{64}$'),
  state_before jsonb not null check (jsonb_typeof(state_before) = 'object'),
  state_after jsonb not null check (jsonb_typeof(state_after) = 'object'),
  admitted_catalog_id_set_sha256 text not null check (admitted_catalog_id_set_sha256 ~ '^[0-9a-f]{64}$'),
  newly_admitted_count integer not null check (newly_admitted_count > 0),
  admission_proof_sha256 text not null check (admission_proof_sha256 ~ '^[0-9a-f]{64}$'),
  independent_audit_sha256 text not null check (independent_audit_sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);

create trigger estimate_program_control_transition_immutable_trg
before update or delete on public.estimate_program_control_transition
for each row execute function public.estimate_reject_mutation_v1();

create or replace function public.estimate_create_release_admission_job_v3(
  p_release_id uuid,
  p_domain_id text,
  p_admission_run_id text,
  p_test_owner_user_id uuid,
  p_test_organization_id uuid,
  p_idempotency_key text,
  p_operation text,
  p_catalog_id text,
  p_parent_revision_id uuid,
  p_input_payload jsonb
)
returns table(job_id uuid, job_status text, created boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.estimate_compile_job%rowtype;
  v_payload jsonb;
begin
  if current_user not in ('postgres', 'service_role') then
    raise exception using errcode = '42501', message = 'service role required';
  end if;
  if p_domain_id !~ '^[a-z][a-z0-9_]*$'
    or nullif(trim(p_admission_run_id), '') is null or length(p_admission_run_id) > 200
    or p_test_owner_user_id is null or p_test_organization_id is null
    or nullif(trim(p_idempotency_key), '') is null or length(p_idempotency_key) > 200
    or p_operation not in ('compile', 'recalculate')
    or jsonb_typeof(p_input_payload) <> 'object'
    or jsonb_typeof(p_input_payload -> 'parameters') <> 'object'
    or not exists (
      select 1 from public.estimate_definition_release r
      where r.id = p_release_id and r.status = 'prepared' and r.schema_version = 5
    )
    or exists (
      select 1 from public.estimate_domain_release_admission_seal a
      where a.release_id = p_release_id and a.domain_id = p_domain_id
    )
    or not exists (
      select 1 from public.estimate_definition_version v
      join public.estimate_work_identity w on w.catalog_id = v.catalog_id
      where v.release_id = p_release_id and v.catalog_id = p_catalog_id
        and w.domain = p_domain_id
    ) then
    raise exception using errcode = '22023', message = 'invalid prepared domain release admission request';
  end if;
  if p_operation = 'compile' and p_parent_revision_id is not null then
    raise exception using errcode = '22023', message = 'admission compile cannot have a parent';
  end if;
  if p_operation = 'recalculate' and not exists (
    select 1 from public.estimate_revision r
    where r.id = p_parent_revision_id
      and r.release_id = p_release_id
      and r.owner_user_id = p_test_owner_user_id
      and r.organization_id = p_test_organization_id
      and r.catalog_id = p_catalog_id
  ) then
    raise exception using errcode = '22023', message = 'admission recalculate parent mismatch';
  end if;
  v_payload := p_input_payload || jsonb_build_object(
    'releaseAdmission', true,
    'admissionRunId', trim(p_admission_run_id),
    'admissionDomainId', p_domain_id
  );
  insert into public.estimate_compile_job (
    idempotency_key, organization_id, owner_user_id, operation, catalog_id,
    parent_revision_id, input_payload, target_release_id
  ) values (
    trim(p_idempotency_key), p_test_organization_id, p_test_owner_user_id, p_operation,
    p_catalog_id, p_parent_revision_id, v_payload, p_release_id
  )
  on conflict (owner_user_id, idempotency_key) do nothing
  returning * into v_job;
  if v_job.id is null then
    select * into v_job from public.estimate_compile_job j
    where j.owner_user_id = p_test_owner_user_id and j.idempotency_key = trim(p_idempotency_key);
    if v_job.target_release_id <> p_release_id or v_job.operation <> p_operation
      or v_job.catalog_id <> p_catalog_id
      or v_job.parent_revision_id is distinct from p_parent_revision_id
      or v_job.organization_id <> p_test_organization_id
      or v_job.input_payload <> v_payload then
      raise exception using errcode = '23505', message = 'domain admission idempotency conflict';
    end if;
    return query select v_job.id, v_job.status, false;
    return;
  end if;
  return query select v_job.id, v_job.status, true;
end;
$$;

create or replace function public.estimate_cleanup_release_admission_runtime_v3(
  p_release_id uuid,
  p_test_owner_user_id uuid,
  p_test_organization_id uuid
)
returns table(
  deleted_jobs integer,
  deleted_artifacts integer,
  deleted_row_prices integer,
  deleted_rows integer,
  deleted_revisions integer,
  residue integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_jobs integer := 0;
  v_artifacts integer := 0;
  v_row_prices integer := 0;
  v_rows integer := 0;
  v_revisions integer := 0;
  v_residue integer := 0;
begin
  if current_user not in ('postgres', 'service_role') then
    raise exception using errcode = '42501', message = 'service role required';
  end if;
  if p_test_owner_user_id is null or p_test_organization_id is null
    or not exists (
      select 1 from public.estimate_definition_release r
      where r.id = p_release_id and r.status = 'prepared' and r.schema_version = 5
    )
    or exists (
      select 1 from public.estimate_domain_release_admission_seal a
      where a.release_id = p_release_id
    ) then
    raise exception using errcode = '22023', message = 'prepared unsealed release required for admission cleanup';
  end if;
  if exists (
    select 1 from public.estimate_revision r
    where r.release_id = p_release_id
      and (r.owner_user_id <> p_test_owner_user_id
        or r.organization_id is distinct from p_test_organization_id)
  ) or exists (
    select 1 from public.estimate_compile_job j
    where j.target_release_id = p_release_id
      and (j.owner_user_id <> p_test_owner_user_id
        or j.organization_id is distinct from p_test_organization_id)
  ) then
    raise exception using errcode = '55000', message = 'release contains runtime outside the exact admission owner';
  end if;

  alter table public.estimate_revision disable trigger estimate_revision_immutable_trg;
  alter table public.estimate_revision_row disable trigger estimate_revision_row_immutable_trg;
  alter table public.estimate_revision_row_price disable trigger estimate_revision_row_price_immutable_trg;
  begin
    delete from public.estimate_legacy_revision_import l
    where l.job_id in (select j.id from public.estimate_compile_job j where j.target_release_id = p_release_id);

    delete from public.estimate_revision_artifact a
    using public.estimate_revision r
    where a.revision_id = r.id and r.release_id = p_release_id;
    get diagnostics v_artifacts = row_count;

    delete from public.estimate_compile_job j where j.target_release_id = p_release_id;
    get diagnostics v_jobs = row_count;

    delete from public.estimate_revision_row_price rp
    using public.estimate_revision r
    where rp.revision_id = r.id and r.release_id = p_release_id;
    get diagnostics v_row_prices = row_count;

    delete from public.estimate_revision_row rr
    using public.estimate_revision r
    where rr.revision_id = r.id and r.release_id = p_release_id;
    get diagnostics v_rows = row_count;

    delete from public.estimate_revision r where r.release_id = p_release_id;
    get diagnostics v_revisions = row_count;
  exception when others then
    alter table public.estimate_revision enable trigger estimate_revision_immutable_trg;
    alter table public.estimate_revision_row enable trigger estimate_revision_row_immutable_trg;
    alter table public.estimate_revision_row_price enable trigger estimate_revision_row_price_immutable_trg;
    raise;
  end;
  alter table public.estimate_revision enable trigger estimate_revision_immutable_trg;
  alter table public.estimate_revision_row enable trigger estimate_revision_row_immutable_trg;
  alter table public.estimate_revision_row_price enable trigger estimate_revision_row_price_immutable_trg;

  select
    (select count(*) from public.estimate_compile_job j where j.target_release_id = p_release_id)
    + (select count(*) from public.estimate_revision r where r.release_id = p_release_id)
    + (select count(*) from public.estimate_revision_row rr join public.estimate_revision r on r.id = rr.revision_id where r.release_id = p_release_id)
    + (select count(*) from public.estimate_revision_artifact a join public.estimate_revision r on r.id = a.revision_id where r.release_id = p_release_id)
  into v_residue;
  return query select v_jobs, v_artifacts, v_row_prices, v_rows, v_revisions, v_residue;
end;
$$;

create or replace function public.estimate_seal_domain_release_admission_v3(
  p_release_id uuid,
  p_domain_id text,
  p_proof_sha256 text,
  p_independent_audit_sha256 text,
  p_definition_count integer,
  p_parameter_count integer,
  p_formula_count integer,
  p_resource_count integer,
  p_compile_count integer,
  p_recalculate_count integer,
  p_scenario_count integer,
  p_reached_resource_count integer,
  p_invalid_parameter_combinations integer,
  p_mutually_exclusive_simultaneous integer,
  p_double_count integer,
  p_unreachable_rows integer,
  p_padding_rows integer,
  p_predecessor_regression jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_expected record;
begin
  if current_user not in ('postgres', 'service_role') then
    raise exception using errcode = '42501', message = 'service role required';
  end if;
  select
    (select count(*)::integer from public.estimate_definition_version v
      join public.estimate_work_identity w on w.catalog_id = v.catalog_id
      where v.release_id = p_release_id and w.domain = p_domain_id) definitions,
    (select count(*)::integer from public.estimate_parameter_definition p
      join public.estimate_definition_version v on v.id = p.definition_version_id
      join public.estimate_work_identity w on w.catalog_id = v.catalog_id
      where v.release_id = p_release_id and w.domain = p_domain_id) parameters,
    (select count(*)::integer from public.estimate_formula_graph f
      join public.estimate_definition_version v on v.id = f.definition_version_id
      join public.estimate_work_identity w on w.catalog_id = v.catalog_id
      where v.release_id = p_release_id and w.domain = p_domain_id) formulas,
    (select count(*)::integer from public.estimate_resource_spec s
      join public.estimate_definition_version v on v.id = s.definition_version_id
      join public.estimate_work_identity w on w.catalog_id = v.catalog_id
      where v.release_id = p_release_id and w.domain = p_domain_id) resources
  into v_expected;

  if p_proof_sha256 !~ '^[0-9a-f]{64}$'
    or p_independent_audit_sha256 !~ '^[0-9a-f]{64}$'
    or jsonb_typeof(p_predecessor_regression) <> 'object'
    or (p_definition_count, p_parameter_count, p_formula_count, p_resource_count)
      is distinct from (v_expected.definitions, v_expected.parameters, v_expected.formulas, v_expected.resources)
    or p_compile_count <> p_definition_count
    or p_recalculate_count <> p_definition_count
    or p_reached_resource_count <> p_resource_count
    or p_scenario_count < p_definition_count
    or (p_invalid_parameter_combinations, p_mutually_exclusive_simultaneous, p_double_count, p_unreachable_rows, p_padding_rows)
      is distinct from (0, 0, 0, 0, 0)
    or p_predecessor_regression ->> 'status' <> 'GREEN'
    or not exists (
      select 1 from public.estimate_definition_release r
      where r.id = p_release_id and r.status = 'prepared' and r.schema_version = 5
    ) then
    raise exception using errcode = '22023', message = 'domain release admission proof is not exact green';
  end if;
  if exists (
    select 1 from public.estimate_compile_job j
    where j.target_release_id = p_release_id and j.input_payload ->> 'releaseAdmission' = 'true'
  ) or exists (
    select 1 from public.estimate_revision r where r.release_id = p_release_id
  ) then
    raise exception using errcode = '55000', message = 'domain admission runtime residue is not zero';
  end if;
  insert into public.estimate_domain_release_admission_seal (
    release_id, domain_id, proof_sha256, independent_audit_sha256,
    definition_count, parameter_count, formula_count, resource_count,
    compile_count, recalculate_count, scenario_count, reached_resource_count,
    invalid_parameter_combinations, mutually_exclusive_simultaneous, double_count,
    unreachable_rows, padding_rows, test_runtime_residue, predecessor_regression
  ) values (
    p_release_id, p_domain_id, p_proof_sha256, p_independent_audit_sha256,
    p_definition_count, p_parameter_count, p_formula_count, p_resource_count,
    p_compile_count, p_recalculate_count, p_scenario_count, p_reached_resource_count,
    p_invalid_parameter_combinations, p_mutually_exclusive_simultaneous, p_double_count,
    p_unreachable_rows, p_padding_rows, 0, p_predecessor_regression
  );
end;
$$;

create or replace function public.estimate_activate_water_release_and_rebase_v3(
  p_release_id uuid,
  p_admission_proof_sha256 text,
  p_independent_audit_sha256 text,
  p_independent_audit_status text,
  p_admitted_catalog_id_set_sha256 text,
  p_expected_newly_admitted integer
)
returns table(release_id uuid, program_state_version bigint, program_state_sha256 text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target public.estimate_definition_release%rowtype;
  v_predecessor public.estimate_definition_release%rowtype;
  v_seal public.estimate_domain_release_admission_seal%rowtype;
  v_state public.estimate_program_control_state%rowtype;
  v_state_before jsonb;
  v_state_after jsonb;
  v_counts record;
  v_domain_definition_count integer;
  v_admitted_ids text[];
  v_computed_id_hash text;
  v_next_hash text;
begin
  if current_user not in ('postgres', 'service_role') then
    raise exception using errcode = '42501', message = 'service role required';
  end if;
  if p_admission_proof_sha256 !~ '^[0-9a-f]{64}$'
    or p_independent_audit_sha256 !~ '^[0-9a-f]{64}$'
    or p_admitted_catalog_id_set_sha256 !~ '^[0-9a-f]{64}$'
    or p_independent_audit_status <> 'GREEN'
    or p_expected_newly_admitted <= 0 then
    raise exception using errcode = '22023', message = 'activation inputs are not independent green';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('estimate-water-release-activation-and-queue-rebase', 0));
  select * into v_target from public.estimate_definition_release r where r.id = p_release_id for update;
  select * into v_predecessor from public.estimate_definition_release r where r.status = 'active' for update;
  select * into v_seal from public.estimate_domain_release_admission_seal a
    where a.release_id = p_release_id and a.domain_id = 'water_supply_sewerage';
  select * into v_state from public.estimate_program_control_state s where s.singleton = true for update;

  if v_target.id is null or v_target.status <> 'prepared' or v_target.schema_version <> 5
    or v_target.source_package_sha256 is null or v_predecessor.id is null
    or v_target.parent_release_id <> v_predecessor.id
    or v_seal.release_id is null
    or v_seal.proof_sha256 <> p_admission_proof_sha256
    or v_seal.independent_audit_sha256 <> p_independent_audit_sha256
    or v_seal.test_runtime_residue <> 0 then
    raise exception using errcode = '55000', message = 'water release lineage or admission seal is not activatable';
  end if;

  select
    count(*)::integer definitions,
    (select count(*)::integer from public.estimate_parameter_definition p
      join public.estimate_definition_version v on v.id = p.definition_version_id where v.release_id = p_release_id) parameters,
    (select count(*)::integer from public.estimate_formula_graph f
      join public.estimate_definition_version v on v.id = f.definition_version_id where v.release_id = p_release_id) formulas,
    (select count(*)::integer from public.estimate_resource_spec s
      join public.estimate_definition_version v on v.id = s.definition_version_id where v.release_id = p_release_id) resources
  into v_counts
  from public.estimate_definition_version v where v.release_id = p_release_id;
  if (v_target.definition_count, v_target.parameter_count, v_target.formula_count, v_target.resource_row_count)
    is distinct from (v_counts.definitions, v_counts.parameters, v_counts.formulas, v_counts.resources) then
    raise exception using errcode = '55000', message = 'water successor release cardinality mismatch';
  end if;

  select count(*)::integer into v_domain_definition_count
  from public.estimate_definition_version v
  join public.estimate_work_identity w on w.catalog_id = v.catalog_id
  where v.release_id = p_release_id and w.domain = 'water_supply_sewerage';

  select array_agg(v.catalog_id order by v.catalog_id) into v_admitted_ids
  from public.estimate_definition_version v
  join public.estimate_work_identity w on w.catalog_id = v.catalog_id
  where v.release_id = p_release_id and w.domain = 'water_supply_sewerage' and w.denominator_eligible;
  v_computed_id_hash := encode(extensions.digest(convert_to(array_to_string(v_admitted_ids, E'\n'), 'UTF8'), 'sha256'), 'hex');
  if coalesce(array_length(v_admitted_ids, 1), 0) <> p_expected_newly_admitted
    or v_domain_definition_count <> v_seal.definition_count
    or v_domain_definition_count < p_expected_newly_admitted
    or v_computed_id_hash <> p_admitted_catalog_id_set_sha256 then
    raise exception using errcode = '55000', message = 'water admitted ID set mismatch';
  end if;
  if v_state.denominator_total <> 11610
    or v_state.admitted_global_count <> 1160
    or v_state.queue_remaining <> 10450
    or v_state.external_reference_count <> 8
    or v_state.batch006_started
    or v_state.water_domain_complete
    or v_state.water_domain_remaining <> p_expected_newly_admitted
    or v_state.global_content_complete
    or v_state.batch007_selected
    or v_state.batch007_execution_started then
    raise exception using errcode = '55000', message = 'predecessor program control state drift';
  end if;
  v_state_before := to_jsonb(v_state);

  update public.estimate_definition_release set status = 'retired'
  where id = v_predecessor.id and status = 'active';
  if not found then raise exception using errcode = '40001', message = 'predecessor retirement conflict'; end if;
  update public.estimate_definition_release set status = 'active', activated_at = now()
  where id = v_target.id and status = 'prepared';
  if not found then raise exception using errcode = '40001', message = 'target activation conflict'; end if;

  v_next_hash := encode(extensions.digest(convert_to((jsonb_build_object(
    'denominator', v_state.denominator_total,
    'admitted', v_state.admitted_global_count + p_expected_newly_admitted,
    'remaining', v_state.queue_remaining - p_expected_newly_admitted,
    'external', v_state.external_reference_count,
    'batch006Started', true,
    'waterDomainComplete', true,
    'waterDomainRemaining', 0,
    'globalContentComplete', false,
    'batch007Selected', false,
    'batch007ExecutionStarted', false,
    'programStateVersion', v_state.program_state_version + 1
  ))::text, 'UTF8'), 'sha256'), 'hex');
  update public.estimate_program_control_state
  set admitted_global_count = admitted_global_count + p_expected_newly_admitted,
      queue_remaining = queue_remaining - p_expected_newly_admitted,
      batch006_started = true,
      water_domain_complete = true,
      water_domain_remaining = 0,
      global_content_complete = false,
      batch007_selected = false,
      batch007_execution_started = false,
      program_state_version = program_state_version + 1,
      state_sha256 = v_next_hash,
      updated_at = now()
  where singleton = true
    and program_state_version = v_state.program_state_version
    and state_sha256 = v_state.state_sha256;
  if not found then raise exception using errcode = '40001', message = 'program control compare-and-swap conflict'; end if;

  select to_jsonb(s) into v_state_after from public.estimate_program_control_state s where s.singleton = true;
  if (v_state_after ->> 'admitted_global_count')::integer
       + (v_state_after ->> 'queue_remaining')::integer <> 11610
    or (v_state_after ->> 'external_reference_count')::integer <> 8 then
    raise exception using errcode = '55000', message = 'program control arithmetic failed';
  end if;

  insert into public.estimate_program_event (
    event_kind, event_key, catalog_id, denominator_delta, queue_delta, payload
  )
  select 'admission', 'batch006-water-r5:' || catalog_id, catalog_id, 0, -1,
    jsonb_build_object(
      'releaseId', v_target.id,
      'predecessorReleaseId', v_predecessor.id,
      'programStateVersion', v_state.program_state_version + 1,
      'admissionProofSha256', p_admission_proof_sha256,
      'independentAuditSha256', p_independent_audit_sha256
    )
  from unnest(v_admitted_ids) as ids(catalog_id);

  insert into public.estimate_definition_release_activation (
    release_id, predecessor_release_id, admission_proof_sha256,
    independent_audit_sha256, program_state_before, program_state_after
  ) values (
    v_target.id, v_predecessor.id, p_admission_proof_sha256,
    p_independent_audit_sha256, v_state_before, v_state_after
  );
  insert into public.estimate_program_control_transition (
    transition_key, release_id, predecessor_release_id,
    state_version_before, state_version_after, state_hash_before, state_hash_after,
    state_before, state_after, admitted_catalog_id_set_sha256, newly_admitted_count,
    admission_proof_sha256, independent_audit_sha256
  ) values (
    'batch006-water-r5:' || v_target.id::text, v_target.id, v_predecessor.id,
    v_state.program_state_version, v_state.program_state_version + 1,
    v_state.state_sha256, v_next_hash, v_state_before, v_state_after,
    p_admitted_catalog_id_set_sha256, p_expected_newly_admitted,
    p_admission_proof_sha256, p_independent_audit_sha256
  );
  return query select v_target.id, v_state.program_state_version + 1, v_next_hash;
end;
$$;

alter table public.estimate_professional_passport enable row level security;
alter table public.estimate_domain_release_admission_seal enable row level security;
alter table public.estimate_program_control_transition enable row level security;

create policy estimate_professional_passport_read_v3 on public.estimate_professional_passport
for select to authenticated using (exists (
  select 1 from public.estimate_definition_release r
  where r.id = release_id and r.status in ('active', 'retired')
));

revoke all on table public.estimate_professional_passport from public, anon, authenticated;
revoke all on table public.estimate_domain_release_admission_seal from public, anon, authenticated;
revoke all on table public.estimate_program_control_transition from public, anon, authenticated;
grant select on table public.estimate_professional_passport to authenticated, service_role;
grant select, insert on table public.estimate_domain_release_admission_seal to service_role;
grant select, insert on table public.estimate_program_control_transition to service_role;

revoke all on function public.estimate_create_release_admission_job_v3(uuid, text, text, uuid, uuid, text, text, text, uuid, jsonb) from public;
revoke all on function public.estimate_cleanup_release_admission_runtime_v3(uuid, uuid, uuid) from public;
revoke all on function public.estimate_seal_domain_release_admission_v3(uuid, text, text, text, integer, integer, integer, integer, integer, integer, integer, integer, integer, integer, integer, integer, integer, jsonb) from public;
revoke all on function public.estimate_activate_water_release_and_rebase_v3(uuid, text, text, text, text, integer) from public;
grant execute on function public.estimate_create_release_admission_job_v3(uuid, text, text, uuid, uuid, text, text, text, uuid, jsonb) to service_role;
grant execute on function public.estimate_cleanup_release_admission_runtime_v3(uuid, uuid, uuid) to service_role;
grant execute on function public.estimate_seal_domain_release_admission_v3(uuid, text, text, text, integer, integer, integer, integer, integer, integer, integer, integer, integer, integer, integer, integer, integer, jsonb) to service_role;
grant execute on function public.estimate_activate_water_release_and_rebase_v3(uuid, text, text, text, text, integer) to service_role;

comment on table public.estimate_professional_passport is
  'Normalized backend-owned professional passport. Full domain definitions never belong to Web or Android bundles.';
comment on function public.estimate_cleanup_release_admission_runtime_v3(uuid, uuid, uuid) is
  'Deletes only runtime owned by the exact disposable admission tenant of one prepared unsealed R5 release and restores immutable triggers before returning.';
comment on function public.estimate_activate_water_release_and_rebase_v3(uuid, text, text, text, text, integer) is
  'Atomically activates an independently admitted water successor release and subtracts each newly admitted global ID exactly once.';

commit;
