-- MASTER 11 610 canonical estimate platform R2 closeout.
-- Forward-only extension: row ownership/inclusion semantics and hardened revision commits.

begin;

alter table public.estimate_definition_release
  drop constraint estimate_definition_release_status_check,
  drop constraint estimate_definition_release_seal_ck,
  add column parent_release_id uuid references public.estimate_definition_release(id) on delete restrict,
  add column source_package_sha256 text check (
    source_package_sha256 is null or source_package_sha256 ~ '^[0-9a-f]{64}$'
  ),
  add column parameter_count integer check (parameter_count is null or parameter_count >= 0),
  add column formula_count integer check (formula_count is null or formula_count >= 0),
  add constraint estimate_definition_release_status_check check (
    status in ('draft', 'prepared', 'active', 'retired')
  ),
  add constraint estimate_definition_release_seal_ck check (
    (status = 'draft' and sealed_at is null)
    or (status in ('prepared', 'active', 'retired') and sealed_at is not null)
  ),
  add constraint estimate_definition_release_parent_not_self_ck check (
    parent_release_id is null or parent_release_id <> id
  );

create or replace function public.estimate_guard_definition_mutation_v1()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_release_id uuid;
  v_sealed_at timestamptz;
  v_release_lifecycle_only boolean := false;
begin
  v_release_id := case
    when tg_table_name = 'estimate_definition_release' then old.id
    else (to_jsonb(old) ->> 'release_id')::uuid
  end;
  select r.sealed_at into v_sealed_at
  from public.estimate_definition_release r
  where r.id = v_release_id;
  if v_sealed_at is not null then
    if tg_table_name = 'estimate_definition_release' and tg_op = 'UPDATE' then
      v_release_lifecycle_only := (
        ((old.status = 'active' and new.status = 'retired'
            and old.activated_at is not distinct from new.activated_at)
          or (old.status = 'prepared' and new.status = 'active'
            and old.activated_at is null and new.activated_at is not null))
        and old.id = new.id
        and old.release_key = new.release_key
        and old.schema_version = new.schema_version
        and old.source_commit = new.source_commit
        and old.source_tree = new.source_tree
        and old.source_manifest_sha256 = new.source_manifest_sha256
        and old.source_package_sha256 is not distinct from new.source_package_sha256
        and old.parent_release_id is not distinct from new.parent_release_id
        and old.definition_count = new.definition_count
        and old.parameter_count is not distinct from new.parameter_count
        and old.formula_count is not distinct from new.formula_count
        and old.resource_row_count = new.resource_row_count
        and old.metadata = new.metadata
        and old.created_at = new.created_at
        and old.sealed_at = new.sealed_at
      );
      if v_release_lifecycle_only then return new; end if;
    end if;
    raise exception using errcode = '55000', message = 'sealed estimate definition release is immutable';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

alter table public.estimate_compile_job
  add column target_release_id uuid references public.estimate_definition_release(id) on delete restrict;

update public.estimate_compile_job j
set target_release_id = coalesce(
  (select r.release_id from public.estimate_revision r where r.id = j.result_revision_id),
  (select r.release_id from public.estimate_revision r where r.id = j.parent_revision_id),
  (select r.id from public.estimate_definition_release r where r.status = 'active')
);

alter table public.estimate_compile_job
  alter column target_release_id set not null;

create index estimate_compile_job_target_release_idx
  on public.estimate_compile_job (target_release_id, status, created_at);

create or replace function public.estimate_current_active_release_id_v2()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select r.id from public.estimate_definition_release r where r.status = 'active';
$$;

alter table public.estimate_compile_job
  alter column target_release_id set default public.estimate_current_active_release_id_v2();

create or replace function public.estimate_assign_compile_job_release_v2()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.operation in ('pdf', 'procurement') then
    select r.release_id into new.target_release_id
    from public.estimate_revision r where r.id = new.parent_revision_id;
  elsif new.target_release_id is null then
    new.target_release_id := public.estimate_current_active_release_id_v2();
  end if;
  if new.target_release_id is null then
    raise exception using errcode = '55000', message = 'compile job target release is unavailable';
  end if;
  return new;
end;
$$;

create trigger estimate_compile_job_release_binding_trg
before insert on public.estimate_compile_job
for each row execute function public.estimate_assign_compile_job_release_v2();

create or replace function public.estimate_cancel_compile_job_v1(p_job_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare v_updated integer;
begin
  if auth.uid() is null then raise exception using errcode = '28000', message = 'authentication required'; end if;
  update public.estimate_compile_job
  set status = 'cancelled', stage = 'cancelled', completed_at = now(), updated_at = now(),
      lease_owner = null, lease_expires_at = null
  where id = p_job_id and owner_user_id = auth.uid()
    and status in ('queued', 'retry_wait', 'running');
  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

create or replace function public.estimate_fail_compile_job_v2(
  p_job_id uuid,
  p_worker_id text,
  p_error_code text,
  p_error_detail jsonb,
  p_retryable boolean,
  p_retry_delay_seconds integer default 5
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
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
  elsif v_job.operation in ('pdf', 'procurement') then
    update public.estimate_revision_artifact
    set status = case when v_next_status = 'failed' then 'failed' else 'queued' end,
        error_code = left(coalesce(nullif(trim(p_error_code), ''), 'ARTIFACT_FAILED'), 100),
        updated_at = now()
    where revision_id = v_job.parent_revision_id and artifact_kind = v_job.operation;
  end if;
  return v_next_status;
end;
$$;

create table public.estimate_definition_release_admission_seal (
  release_id uuid primary key references public.estimate_definition_release(id) on delete restrict,
  proof_sha256 text not null check (proof_sha256 ~ '^[0-9a-f]{64}$'),
  compile_count integer not null check (compile_count = 1168),
  recalculate_count integer not null check (recalculate_count = 1168),
  scenario_count integer not null check (scenario_count = 3684),
  reached_resource_count integer not null check (reached_resource_count = 101416),
  total_resource_count integer not null check (total_resource_count = 101416),
  invalid_parameter_combinations integer not null check (invalid_parameter_combinations = 0),
  mutually_exclusive_simultaneous integer not null check (mutually_exclusive_simultaneous = 0),
  double_count integer not null check (double_count = 0),
  test_runtime_residue integer not null check (test_runtime_residue = 0),
  sealed_at timestamptz not null default now()
);

create trigger estimate_definition_release_admission_seal_immutable_trg
before update or delete on public.estimate_definition_release_admission_seal
for each row execute function public.estimate_reject_mutation_v1();

create table public.estimate_definition_release_activation (
  release_id uuid primary key references public.estimate_definition_release(id) on delete restrict,
  predecessor_release_id uuid not null references public.estimate_definition_release(id) on delete restrict,
  admission_proof_sha256 text not null check (admission_proof_sha256 ~ '^[0-9a-f]{64}$'),
  independent_audit_sha256 text not null check (independent_audit_sha256 ~ '^[0-9a-f]{64}$'),
  program_state_before jsonb not null check (jsonb_typeof(program_state_before) = 'object'),
  program_state_after jsonb not null check (jsonb_typeof(program_state_after) = 'object'),
  activated_at timestamptz not null default now()
);

create trigger estimate_definition_release_activation_immutable_trg
before update or delete on public.estimate_definition_release_activation
for each row execute function public.estimate_reject_mutation_v1();

alter table public.estimate_revision
  add column amendment_contract jsonb not null default jsonb_build_object(
    'rowOverrides', '{}'::jsonb,
    'customRows', '[]'::jsonb,
    'releaseMigration', null
  ),
  add constraint estimate_revision_amendment_contract_ck check (
    jsonb_typeof(amendment_contract) = 'object'
    and jsonb_typeof(amendment_contract -> 'rowOverrides') = 'object'
    and jsonb_typeof(amendment_contract -> 'customRows') = 'array'
    and (amendment_contract -> 'releaseMigration' = 'null'::jsonb
      or jsonb_typeof(amendment_contract -> 'releaseMigration') = 'object')
  );

alter table public.estimate_revision_row
  add column ownership_status text not null default 'OWNED',
  add column included_in_estimate boolean not null default true,
  add column included_in_procurement boolean not null default false;

alter table public.estimate_revision_row
  add constraint estimate_revision_row_ownership_status_ck check (
    ownership_status in (
      'OWNED',
      'OWNED_EXCLUDED',
      'MANUAL_SERVER_OWNED',
      'MIGRATED_UNOWNED_EXCLUDED_FROM_TOTAL'
    )
  ) not valid,
  add constraint estimate_revision_row_ownership_shape_ck check (
    (ownership_status = 'OWNED'
      and resource_spec_id is not null
      and included_in_estimate)
    or (ownership_status = 'OWNED_EXCLUDED'
      and resource_spec_id is not null
      and not included_in_estimate)
    or (ownership_status = 'MANUAL_SERVER_OWNED'
      and resource_spec_id is null
      and legacy_row_payload is not null)
    or (ownership_status = 'MIGRATED_UNOWNED_EXCLUDED_FROM_TOTAL'
      and resource_spec_id is null
      and legacy_row_payload is not null
      and not included_in_estimate
      and not included_in_procurement)
  ) not valid,
  add constraint estimate_revision_row_procurement_inclusion_ck check (
    not included_in_procurement or (included_in_estimate and procurement_eligible)
  ) not valid;

create index estimate_revision_row_projection_idx
  on public.estimate_revision_row (revision_id, included_in_estimate, included_in_procurement, ordinal);

-- Existing R1 revision payload/totals/checksum remain byte-for-byte unchanged.
-- The added projection flags give unmatched legacy rows an explicit disposition
-- without silently rewriting immutable historical revisions.
alter table public.estimate_revision_row disable trigger estimate_revision_row_immutable_trg;

update public.estimate_revision_row
set ownership_status = case
      when resource_spec_id is null then 'MIGRATED_UNOWNED_EXCLUDED_FROM_TOTAL'
      else 'OWNED'
    end,
    included_in_estimate = resource_spec_id is not null,
    included_in_procurement = resource_spec_id is not null and procurement_eligible;

alter table public.estimate_revision_row enable trigger estimate_revision_row_immutable_trg;

alter table public.estimate_revision_row
  validate constraint estimate_revision_row_ownership_status_ck,
  validate constraint estimate_revision_row_ownership_shape_ck,
  validate constraint estimate_revision_row_procurement_inclusion_ck;

create or replace function public.estimate_create_compile_job_v1(
  p_idempotency_key text,
  p_operation text,
  p_catalog_id text,
  p_parent_revision_id uuid,
  p_organization_id uuid,
  p_input_payload jsonb
)
returns table(job_id uuid, job_status text, created boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_job public.estimate_compile_job%rowtype;
  v_parent public.estimate_revision%rowtype;
  v_target_release_id uuid;
  v_release_migration jsonb;
begin
  if v_actor is null then raise exception using errcode = '28000', message = 'authentication required'; end if;
  if nullif(trim(p_idempotency_key), '') is null or length(p_idempotency_key) > 200 then
    raise exception using errcode = '22023', message = 'invalid idempotency key';
  end if;
  if p_operation not in ('compile', 'recalculate')
    or jsonb_typeof(p_input_payload) <> 'object'
    or jsonb_typeof(p_input_payload -> 'parameters') <> 'object'
    or jsonb_typeof(p_input_payload -> 'priceSnapshotIds') <> 'array'
    or jsonb_array_length(p_input_payload -> 'priceSnapshotIds') > 64
    or octet_length(p_input_payload::text) > 8388608 then
    raise exception using errcode = '22023', message = 'invalid compile payload';
  end if;
  if p_organization_id is not null and not public.rls_current_user_company_member_v1(p_organization_id) then
    raise exception using errcode = '42501', message = 'organization access denied';
  end if;
  if p_operation = 'compile' and p_parent_revision_id is not null then
    raise exception using errcode = '22023', message = 'compile cannot have a parent revision';
  end if;
  if p_operation = 'compile' and (
    exists (select 1 from jsonb_object_keys(coalesce(p_input_payload -> 'rowOverrides', '{}'::jsonb)))
    or coalesce(jsonb_array_length(coalesce(p_input_payload -> 'customRows', '[]'::jsonb)), 0) > 0
  ) then
    raise exception using errcode = '22023', message = 'row amendments require recalculate';
  end if;
  if p_operation = 'recalculate' then
    if p_parent_revision_id is null then
      raise exception using errcode = '22023', message = 'recalculate requires a parent revision';
    end if;
    select * into v_parent
    from public.estimate_revision r
    where r.id = p_parent_revision_id and public.estimate_revision_visible_v1(r.id);
    if v_parent.id is null then
      raise exception using errcode = '42501', message = 'parent revision access denied';
    end if;
    if v_parent.status <> 'ready' or v_parent.catalog_id <> p_catalog_id
      or v_parent.organization_id is distinct from p_organization_id then
      raise exception using errcode = '22023', message = 'parent revision scope mismatch';
    end if;
  end if;
  select r.id into v_target_release_id
  from public.estimate_definition_release r where r.status = 'active';
  if v_target_release_id is null then
    raise exception using errcode = '55000', message = 'active definition release is unavailable';
  end if;
  if p_operation = 'recalculate' and v_parent.release_id <> v_target_release_id then
    v_release_migration := p_input_payload -> 'releaseMigration';
    if v_release_migration is null
      or jsonb_typeof(v_release_migration) <> 'object'
      or v_release_migration ->> 'contractVersion' <> 'canonical_revision_release_migration.r2'
      or v_release_migration -> 'acknowledged' <> 'true'::jsonb
      or v_release_migration ->> 'fromReleaseId' <> v_parent.release_id::text
      or v_release_migration ->> 'toReleaseId' <> v_target_release_id::text then
      raise exception using errcode = '22023', message = 'explicit revision release migration contract required';
    end if;
  elsif p_input_payload ? 'releaseMigration' then
    raise exception using errcode = '22023', message = 'release migration contract is not applicable';
  end if;
  if not exists (
    select 1 from public.estimate_work_identity wi
    join public.estimate_definition_version dv on dv.catalog_id = wi.catalog_id
    join public.estimate_definition_release dr on dr.id = dv.release_id
    where wi.catalog_id = p_catalog_id and wi.retired_at is null and dr.status = 'active'
  ) then
    raise exception using errcode = '22023', message = 'catalog definition is not active';
  end if;

  insert into public.estimate_compile_job (
    idempotency_key, organization_id, owner_user_id, operation, catalog_id,
    parent_revision_id, input_payload, target_release_id
  ) values (
    trim(p_idempotency_key), p_organization_id, v_actor, p_operation, p_catalog_id,
    p_parent_revision_id, p_input_payload, v_target_release_id
  )
  on conflict (owner_user_id, idempotency_key) do nothing
  returning * into v_job;

  if v_job.id is null then
    select * into v_job from public.estimate_compile_job j
    where j.owner_user_id = v_actor and j.idempotency_key = trim(p_idempotency_key);
    if v_job.operation <> p_operation or v_job.catalog_id <> p_catalog_id
      or v_job.parent_revision_id is distinct from p_parent_revision_id
      or v_job.organization_id is distinct from p_organization_id
      or v_job.target_release_id <> v_target_release_id
      or v_job.input_payload <> p_input_payload then
      raise exception using errcode = '23505', message = 'idempotency key conflicts with another request';
    end if;
    return query select v_job.id, v_job.status, false;
    return;
  end if;
  return query select v_job.id, v_job.status, true;
end;
$$;

create or replace function public.estimate_commit_compile_job_v1(
  p_job_id uuid,
  p_worker_id text,
  p_revision jsonb,
  p_rows jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.estimate_compile_job%rowtype;
  v_parent_revision public.estimate_revision%rowtype;
  v_release_id uuid;
  v_definition_version_id uuid;
  v_revision_id uuid := gen_random_uuid();
  v_revision_number integer;
  v_row_count integer;
  v_projected_amount numeric;
begin
  if current_user not in ('postgres', 'service_role') then
    raise exception using errcode = '42501', message = 'worker role required';
  end if;
  if jsonb_typeof(p_revision) <> 'object' or jsonb_typeof(p_rows) <> 'array' then
    raise exception using errcode = '22023', message = 'invalid compiler commit payload';
  end if;

  select * into v_job from public.estimate_compile_job where id = p_job_id for update;
  if v_job.id is null then raise exception using errcode = 'P0002', message = 'compile job not found'; end if;
  if v_job.status <> 'running' or v_job.lease_owner is distinct from trim(p_worker_id)
    or v_job.lease_expires_at <= now() then
    raise exception using errcode = '55000', message = 'compile job lease is not owned by worker';
  end if;

  select r.id, v.id into v_release_id, v_definition_version_id
  from public.estimate_definition_release r
  join public.estimate_definition_version v on v.release_id = r.id and v.catalog_id = v_job.catalog_id
  where r.id = v_job.target_release_id
    and (r.status = 'active'
      or (r.status = 'prepared' and v_job.input_payload ->> 'releaseAdmission' = 'true'));
  if v_definition_version_id is null then
    raise exception using errcode = '22023', message = 'active definition not found';
  end if;

  v_row_count := jsonb_array_length(p_rows);
  if v_row_count <> coalesce((p_revision ->> 'rowCount')::integer, -1) then
    raise exception using errcode = '22023', message = 'revision row count mismatch';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(p_rows) x(
      resource_spec_id uuid, ownership_status text, included_in_estimate boolean,
      included_in_procurement boolean, procurement_eligible boolean, legacy_row_payload jsonb,
      row_sha256 text
    )
    left join public.estimate_resource_spec s on s.id = x.resource_spec_id
    where x.ownership_status not in (
        'OWNED', 'OWNED_EXCLUDED', 'MANUAL_SERVER_OWNED',
        'MIGRATED_UNOWNED_EXCLUDED_FROM_TOTAL'
      )
      or x.row_sha256 !~ '^[0-9a-f]{64}$'
      or (x.included_in_procurement and (not x.included_in_estimate or not x.procurement_eligible))
      or (x.ownership_status = 'OWNED' and (
        s.id is null or s.definition_version_id <> v_definition_version_id or not x.included_in_estimate
      ))
      or (x.ownership_status = 'OWNED_EXCLUDED' and (
        s.id is null or s.definition_version_id <> v_definition_version_id or x.included_in_estimate
      ))
      or (x.ownership_status = 'MANUAL_SERVER_OWNED' and (
        x.resource_spec_id is not null or x.legacy_row_payload is null
      ))
      or (x.ownership_status = 'MIGRATED_UNOWNED_EXCLUDED_FROM_TOTAL' and (
        v_job.operation <> 'legacy_revision_migration' or x.resource_spec_id is not null
        or x.legacy_row_payload is null or x.included_in_estimate or x.included_in_procurement
      ))
  ) then
    raise exception using errcode = '22023', message = 'revision row ownership projection is invalid';
  end if;

  select coalesce(sum(x.amount) filter (where x.included_in_estimate), 0)
  into v_projected_amount
  from jsonb_to_recordset(p_rows) x(amount numeric, included_in_estimate boolean);
  if v_projected_amount is distinct from coalesce((p_revision -> 'totals' ->> 'amount')::numeric, 0) then
    raise exception using errcode = '22023', message = 'revision total does not match included rows';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_job.owner_user_id::text || ':' || v_job.catalog_id, 0));
  if v_job.operation = 'recalculate' then
    select * into v_parent_revision from public.estimate_revision r
    where r.id = v_job.parent_revision_id;
    if v_parent_revision.id is null then
      raise exception using errcode = '40001', message = 'optimistic revision conflict: parent disappeared';
    end if;
    if v_job.input_payload -> 'releaseMigration' is null and exists (
      select 1 from public.estimate_revision r
      where r.owner_user_id = v_job.owner_user_id and r.catalog_id = v_job.catalog_id
        and r.status = 'ready' and r.revision_number > v_parent_revision.revision_number
    ) then
      raise exception using errcode = '40001', message = 'optimistic revision conflict: parent is not latest';
    end if;
    if v_job.input_payload -> 'releaseMigration' is not null and exists (
      select 1 from public.estimate_revision r
      where r.owner_user_id = v_job.owner_user_id and r.catalog_id = v_job.catalog_id
        and r.parent_revision_id = v_parent_revision.id and r.release_id = v_job.target_release_id
        and r.status = 'ready'
    ) then
      raise exception using errcode = '40001', message = 'optimistic revision conflict: migration child already exists';
    end if;
  end if;
  select coalesce(max(r.revision_number), 0) + 1 into v_revision_number
  from public.estimate_revision r
  where r.owner_user_id = v_job.owner_user_id and r.catalog_id = v_job.catalog_id;

  insert into public.estimate_revision (
    id, parent_revision_id, organization_id, owner_user_id, release_id, catalog_id,
    revision_number, status, input_parameters, price_snapshot_ids, currency_code,
    totals, row_count, checksum_sha256, compiler_version, migration_source,
    amendment_contract
  ) values (
    v_revision_id, v_job.parent_revision_id, v_job.organization_id, v_job.owner_user_id,
    v_job.target_release_id, v_job.catalog_id, v_revision_number, 'ready',
    coalesce(v_job.input_payload -> 'parameters', '{}'::jsonb),
    coalesce(array(select jsonb_array_elements_text(v_job.input_payload -> 'priceSnapshotIds')::uuid), '{}'),
    p_revision ->> 'currencyCode', p_revision -> 'totals', v_row_count,
    p_revision ->> 'checksumSha256', p_revision ->> 'compilerVersion',
    nullif(p_revision -> 'migrationSource', 'null'::jsonb),
    jsonb_build_object(
      'rowOverrides', coalesce(v_job.input_payload -> 'rowOverrides', '{}'::jsonb),
      'customRows', coalesce(v_job.input_payload -> 'customRows', '[]'::jsonb),
      'releaseMigration', coalesce(v_job.input_payload -> 'releaseMigration', 'null'::jsonb)
    )
  );

  insert into public.estimate_revision_row (
    revision_id, row_id, ordinal, resource_spec_id, section, category, title_ru,
    unit_id, quantity, unit_price, amount, currency_code, procurement_eligible,
    calculation_trace, normative_trace, legacy_row_payload, row_sha256,
    ownership_status, included_in_estimate, included_in_procurement
  )
  select v_revision_id, x.row_id, x.ordinal, x.resource_spec_id, x.section, x.category,
    x.title_ru, x.unit_id, x.quantity, x.unit_price, x.amount, x.currency_code,
    x.procurement_eligible, x.calculation_trace, x.normative_trace, x.legacy_row_payload,
    x.row_sha256, x.ownership_status, x.included_in_estimate, x.included_in_procurement
  from jsonb_to_recordset(p_rows) x(
    row_id text, ordinal integer, resource_spec_id uuid, section text, category text,
    title_ru text, unit_id text, quantity numeric, unit_price numeric, amount numeric,
    currency_code text, procurement_eligible boolean, calculation_trace jsonb,
    normative_trace jsonb, legacy_row_payload jsonb, row_sha256 text,
    ownership_status text, included_in_estimate boolean, included_in_procurement boolean
  );

  insert into public.estimate_revision_row_price (
    revision_id, row_id, price_snapshot_id, route_id, unit_price, currency_code, resolution_trace
  )
  select v_revision_id, x.row_id, x.price_snapshot_id, x.price_route_id, x.unit_price,
    x.currency_code, coalesce(x.price_resolution_trace, '{}'::jsonb)
  from jsonb_to_recordset(p_rows) x(
    row_id text, price_snapshot_id uuid, price_route_id uuid, unit_price numeric,
    currency_code text, price_resolution_trace jsonb
  )
  where x.unit_price is not null;

  update public.estimate_compile_job
  set status = 'succeeded', stage = 'complete', progress = 100,
      result_revision_id = v_revision_id, completed_at = now(), updated_at = now(),
      lease_owner = null, lease_expires_at = null, error_code = null, error_detail = null
  where id = p_job_id;

  if v_job.operation = 'legacy_revision_migration' then
    update public.estimate_legacy_revision_import
    set status = 'succeeded', revision_id = v_revision_id, completed_at = now()
    where job_id = p_job_id;
  end if;
  return v_revision_id;
end;
$$;

create or replace function public.estimate_create_release_admission_job_v2(
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
  if nullif(trim(p_admission_run_id), '') is null or length(p_admission_run_id) > 200
    or p_test_owner_user_id is null or p_test_organization_id is null
    or nullif(trim(p_idempotency_key), '') is null or length(p_idempotency_key) > 200
    or p_operation not in ('compile', 'recalculate')
    or jsonb_typeof(p_input_payload) <> 'object'
    or jsonb_typeof(p_input_payload -> 'parameters') <> 'object'
    or not exists (
      select 1 from public.estimate_definition_release r
      where r.id = p_release_id and r.status = 'prepared'
    )
    or exists (
      select 1 from public.estimate_definition_release_admission_seal a
      where a.release_id = p_release_id
    )
    or not exists (
      select 1 from public.estimate_definition_version v
      where v.release_id = p_release_id and v.catalog_id = p_catalog_id
    ) then
    raise exception using errcode = '22023', message = 'invalid prepared release admission request';
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
    'admissionRunId', trim(p_admission_run_id)
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
      raise exception using errcode = '23505', message = 'admission idempotency conflict';
    end if;
    return query select v_job.id, v_job.status, false;
    return;
  end if;
  return query select v_job.id, v_job.status, true;
end;
$$;

create or replace function public.estimate_seal_release_admission_v2(
  p_release_id uuid,
  p_proof_sha256 text,
  p_compile_count integer,
  p_recalculate_count integer,
  p_scenario_count integer,
  p_reached_resource_count integer,
  p_total_resource_count integer,
  p_invalid_parameter_combinations integer,
  p_mutually_exclusive_simultaneous integer,
  p_double_count integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if current_user not in ('postgres', 'service_role') then
    raise exception using errcode = '42501', message = 'service role required';
  end if;
  if p_proof_sha256 !~ '^[0-9a-f]{64}$'
    or (p_compile_count, p_recalculate_count, p_scenario_count,
        p_reached_resource_count, p_total_resource_count,
        p_invalid_parameter_combinations, p_mutually_exclusive_simultaneous, p_double_count)
      is distinct from (1168, 1168, 3684, 101416, 101416, 0, 0, 0)
    or not exists (
      select 1 from public.estimate_definition_release r
      where r.id = p_release_id and r.status = 'prepared'
    ) then
    raise exception using errcode = '22023', message = 'release admission proof is not exact green';
  end if;
  if exists (
    select 1 from public.estimate_compile_job j
    where j.target_release_id = p_release_id and j.input_payload ->> 'releaseAdmission' = 'true'
  ) or exists (
    select 1 from public.estimate_revision r where r.release_id = p_release_id
  ) then
    raise exception using errcode = '55000', message = 'release admission runtime residue is not zero';
  end if;
  insert into public.estimate_definition_release_admission_seal (
    release_id, proof_sha256, compile_count, recalculate_count, scenario_count,
    reached_resource_count, total_resource_count, invalid_parameter_combinations,
    mutually_exclusive_simultaneous, double_count, test_runtime_residue
  ) values (
    p_release_id, p_proof_sha256, p_compile_count, p_recalculate_count, p_scenario_count,
    p_reached_resource_count, p_total_resource_count, p_invalid_parameter_combinations,
    p_mutually_exclusive_simultaneous, p_double_count, 0
  );
end;
$$;

create or replace function public.estimate_activate_definition_release_v2(
  p_release_id uuid,
  p_admission_proof_sha256 text,
  p_independent_audit_sha256 text,
  p_independent_audit_status text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target public.estimate_definition_release%rowtype;
  v_predecessor public.estimate_definition_release%rowtype;
  v_state_before jsonb;
  v_state_after jsonb;
  v_counts record;
begin
  if current_user not in ('postgres', 'service_role') then
    raise exception using errcode = '42501', message = 'service role required';
  end if;
  if p_admission_proof_sha256 !~ '^[0-9a-f]{64}$'
    or p_independent_audit_sha256 !~ '^[0-9a-f]{64}$'
    or p_independent_audit_status <> 'GREEN' then
    raise exception using errcode = '22023', message = 'activation proof is not independent green';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('estimate-definition-release-activation', 0));
  select * into v_target from public.estimate_definition_release r
  where r.id = p_release_id for update;
  select * into v_predecessor from public.estimate_definition_release r
  where r.status = 'active' for update;
  if v_target.id is null or v_target.status <> 'prepared' or v_target.schema_version <> 2
    or v_target.source_package_sha256 is null
    or v_predecessor.id is null or v_target.parent_release_id <> v_predecessor.id then
    raise exception using errcode = '55000', message = 'release lineage is not activatable';
  end if;
  select
    (select count(*)::integer from public.estimate_definition_version v
      where v.release_id = p_release_id) definitions,
    (select count(*)::integer from public.estimate_parameter_definition p
      join public.estimate_definition_version v on v.id = p.definition_version_id
      where v.release_id = p_release_id) parameters,
    (select count(*)::integer from public.estimate_formula_graph f
      join public.estimate_definition_version v on v.id = f.definition_version_id
      where v.release_id = p_release_id) formulas,
    (select count(*)::integer from public.estimate_resource_spec s
      join public.estimate_definition_version v on v.id = s.definition_version_id
      where v.release_id = p_release_id) resources
  into v_counts;
  if (v_counts.definitions, v_counts.parameters, v_counts.formulas, v_counts.resources)
    is distinct from (1168, 138425, 101416, 101416) then
    raise exception using errcode = '55000', message = 'release cardinality is not exact';
  end if;
  if (v_target.definition_count, v_target.parameter_count, v_target.formula_count, v_target.resource_row_count)
    is distinct from (v_counts.definitions, v_counts.parameters, v_counts.formulas, v_counts.resources) then
    raise exception using errcode = '55000', message = 'release manifest cardinality does not match imported corpus';
  end if;
  if not exists (
    select 1 from public.estimate_definition_release_admission_seal a
    where a.release_id = p_release_id and a.proof_sha256 = p_admission_proof_sha256
      and a.test_runtime_residue = 0
  ) then
    raise exception using errcode = '55000', message = 'release admission seal is missing';
  end if;
  select to_jsonb(s) into v_state_before
  from public.estimate_program_control_state s where s.singleton = true for update;
  if (v_state_before ->> 'denominator_total')::integer <> 11610
    or (v_state_before ->> 'admitted_global_count')::integer <> 1160
    or (v_state_before ->> 'queue_remaining')::integer <> 10450
    or (v_state_before ->> 'external_reference_count')::integer <> 8
    or (v_state_before ->> 'batch006_started')::boolean is not false then
    raise exception using errcode = '55000', message = 'program control state drift';
  end if;

  update public.estimate_definition_release set status = 'retired'
  where id = v_predecessor.id and status = 'active';
  if not found then raise exception using errcode = '40001', message = 'predecessor retirement conflict'; end if;
  update public.estimate_definition_release set status = 'active', activated_at = now()
  where id = v_target.id and status = 'prepared';
  if not found then raise exception using errcode = '40001', message = 'target activation conflict'; end if;

  select to_jsonb(s) into v_state_after
  from public.estimate_program_control_state s where s.singleton = true;
  if v_state_after - 'updated_at' <> v_state_before - 'updated_at' then
    raise exception using errcode = '55000', message = 'release activation changed program control state';
  end if;
  insert into public.estimate_definition_release_activation (
    release_id, predecessor_release_id, admission_proof_sha256,
    independent_audit_sha256, program_state_before, program_state_after
  ) values (
    v_target.id, v_predecessor.id, p_admission_proof_sha256,
    p_independent_audit_sha256, v_state_before, v_state_after
  );
  insert into public.estimate_program_event (
    event_kind, event_key, denominator_delta, queue_delta, payload
  ) values (
    'audit', 'release-activation:' || v_target.id::text, 0, 0,
    jsonb_build_object(
      'predecessorReleaseId', v_predecessor.id,
      'releaseId', v_target.id,
      'denominatorDelta', 0,
      'admittedDelta', 0,
      'remainingDelta', 0,
      'externalDelta', 0,
      'batch006Started', false,
      'admissionProofSha256', p_admission_proof_sha256,
      'independentAuditSha256', p_independent_audit_sha256
    )
  );
  return v_target.id;
end;
$$;

revoke all on table public.estimate_definition_release_admission_seal from public, anon, authenticated;
revoke all on table public.estimate_definition_release_activation from public, anon, authenticated;
revoke all on function public.estimate_create_release_admission_job_v2(uuid, text, uuid, uuid, text, text, text, uuid, jsonb) from public;
revoke all on function public.estimate_seal_release_admission_v2(uuid, text, integer, integer, integer, integer, integer, integer, integer, integer) from public;
revoke all on function public.estimate_activate_definition_release_v2(uuid, text, text, text) from public;
revoke all on function public.estimate_cancel_compile_job_v1(uuid) from public;
revoke all on function public.estimate_fail_compile_job_v2(uuid, text, text, jsonb, boolean, integer) from public;
grant execute on function public.estimate_create_release_admission_job_v2(uuid, text, uuid, uuid, text, text, text, uuid, jsonb) to service_role;
grant execute on function public.estimate_seal_release_admission_v2(uuid, text, integer, integer, integer, integer, integer, integer, integer, integer) to service_role;
grant execute on function public.estimate_activate_definition_release_v2(uuid, text, text, text) to service_role;
grant execute on function public.estimate_cancel_compile_job_v1(uuid) to authenticated;
grant execute on function public.estimate_fail_compile_job_v2(uuid, text, text, jsonb, boolean, integer) to service_role;

comment on column public.estimate_revision_row.ownership_status is
  'Backend-owned disposition. Unmatched legacy rows are retained but excluded from totals.';
comment on column public.estimate_revision_row.included_in_estimate is
  'Immutable per-revision estimate projection flag; changes create a child revision.';
comment on column public.estimate_revision_row.included_in_procurement is
  'Immutable per-revision procurement projection flag; changes create a child revision.';

commit;
