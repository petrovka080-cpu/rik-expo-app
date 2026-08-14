-- Disposable-environment rollback companion for deterministic R2 up/down/up replay.
-- Production rollback remains forward-only. This script refuses to erase release data.

begin;

do $$
begin
  if exists (select 1 from public.estimate_definition_release where schema_version = 2)
    or exists (select 1 from public.estimate_revision where amendment_contract <> jsonb_build_object(
      'rowOverrides', '{}'::jsonb, 'customRows', '[]'::jsonb, 'releaseMigration', null
    )) then
    raise exception using errcode = '55000',
      message = 'R2 rollback requires an empty pre-import disposable clone';
  end if;
end;
$$;

drop function if exists public.estimate_activate_definition_release_v2(uuid, text, text, text);
drop function if exists public.estimate_seal_release_admission_v2(uuid, text, integer, integer, integer, integer, integer, integer, integer, integer);
drop function if exists public.estimate_create_release_admission_job_v2(uuid, text, uuid, uuid, text, text, text, uuid, jsonb);
drop function if exists public.estimate_fail_compile_job_v2(uuid, text, text, jsonb, boolean, integer);
drop table if exists public.estimate_definition_release_activation;
drop table if exists public.estimate_definition_release_admission_seal;

drop trigger if exists estimate_compile_job_release_binding_trg on public.estimate_compile_job;
drop function if exists public.estimate_assign_compile_job_release_v2();
alter table public.estimate_compile_job alter column target_release_id drop default;
drop function if exists public.estimate_current_active_release_id_v2();
drop index if exists public.estimate_compile_job_target_release_idx;
alter table public.estimate_compile_job drop column target_release_id;

drop index if exists public.estimate_revision_row_projection_idx;
alter table public.estimate_revision_row
  drop constraint if exists estimate_revision_row_procurement_inclusion_ck,
  drop constraint if exists estimate_revision_row_ownership_shape_ck,
  drop constraint if exists estimate_revision_row_ownership_status_ck,
  drop column included_in_procurement,
  drop column included_in_estimate,
  drop column ownership_status;

alter table public.estimate_revision
  drop constraint if exists estimate_revision_amendment_contract_ck,
  drop column amendment_contract;

alter table public.estimate_definition_release
  drop constraint estimate_definition_release_status_check,
  drop constraint estimate_definition_release_seal_ck,
  drop constraint estimate_definition_release_parent_not_self_ck,
  drop column source_package_sha256,
  drop column parameter_count,
  drop column formula_count,
  drop column parent_release_id,
  add constraint estimate_definition_release_status_check check (
    status in ('draft', 'active', 'retired')
  ),
  add constraint estimate_definition_release_seal_ck check (
    (status = 'draft' and sealed_at is null)
    or (status in ('active', 'retired') and sealed_at is not null)
  );

create or replace function public.estimate_guard_definition_mutation_v1()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_release_id uuid;
  v_sealed_at timestamptz;
begin
  v_release_id := case
    when tg_table_name = 'estimate_definition_release' then old.id
    else (to_jsonb(old) ->> 'release_id')::uuid
  end;
  select r.sealed_at into v_sealed_at
  from public.estimate_definition_release r where r.id = v_release_id;
  if v_sealed_at is not null then
    if tg_table_name = 'estimate_definition_release' and tg_op = 'UPDATE'
      and old.status = 'active' and new.status = 'retired'
      and old.id = new.id and old.release_key = new.release_key
      and old.schema_version = new.schema_version
      and old.source_commit = new.source_commit and old.source_tree = new.source_tree
      and old.source_manifest_sha256 = new.source_manifest_sha256
      and old.definition_count = new.definition_count
      and old.resource_row_count = new.resource_row_count and old.metadata = new.metadata
      and old.created_at = new.created_at
      and old.activated_at is not distinct from new.activated_at
      and old.sealed_at = new.sealed_at then
      return new;
    end if;
    raise exception using errcode = '55000', message = 'sealed estimate definition release is immutable';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

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
  where id = p_job_id and owner_user_id = auth.uid() and status in ('queued', 'retry_wait');
  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

create or replace function public.estimate_create_compile_job_v1(
  p_idempotency_key text, p_operation text, p_catalog_id text,
  p_parent_revision_id uuid, p_organization_id uuid, p_input_payload jsonb
)
returns table(job_id uuid, job_status text, created boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_job public.estimate_compile_job%rowtype;
begin
  if v_actor is null then raise exception using errcode = '28000', message = 'authentication required'; end if;
  if nullif(trim(p_idempotency_key), '') is null or length(p_idempotency_key) > 200 then
    raise exception using errcode = '22023', message = 'invalid idempotency key';
  end if;
  if p_organization_id is not null and not public.rls_current_user_company_member_v1(p_organization_id) then
    raise exception using errcode = '42501', message = 'organization access denied';
  end if;
  if p_parent_revision_id is not null and not public.estimate_revision_visible_v1(p_parent_revision_id) then
    raise exception using errcode = '42501', message = 'parent revision access denied';
  end if;
  if not exists (
    select 1 from public.estimate_work_identity wi
    join public.estimate_definition_version dv on dv.catalog_id = wi.catalog_id
    join public.estimate_definition_release dr on dr.id = dv.release_id
    where wi.catalog_id = p_catalog_id and wi.retired_at is null and dr.status = 'active'
  ) then raise exception using errcode = '22023', message = 'catalog definition is not active'; end if;
  insert into public.estimate_compile_job (
    idempotency_key, organization_id, owner_user_id, operation, catalog_id,
    parent_revision_id, input_payload
  ) values (
    trim(p_idempotency_key), p_organization_id, v_actor, p_operation, p_catalog_id,
    p_parent_revision_id, coalesce(p_input_payload, '{}'::jsonb)
  ) on conflict (owner_user_id, idempotency_key) do nothing returning * into v_job;
  if v_job.id is not null then
    return query select v_job.id, v_job.status, true;
  else
    return query select j.id, j.status, false from public.estimate_compile_job j
      where j.owner_user_id = v_actor and j.idempotency_key = trim(p_idempotency_key);
  end if;
end;
$$;

create or replace function public.estimate_commit_compile_job_v1(
  p_job_id uuid, p_worker_id text, p_revision jsonb, p_rows jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.estimate_compile_job%rowtype;
  v_release_id uuid;
  v_definition_version_id uuid;
  v_revision_id uuid := gen_random_uuid();
  v_revision_number integer;
  v_row_count integer;
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
  where r.status = 'active';
  if v_definition_version_id is null then raise exception using errcode = '22023', message = 'active definition not found'; end if;
  v_row_count := jsonb_array_length(p_rows);
  if v_row_count <> coalesce((p_revision ->> 'rowCount')::integer, -1) then
    raise exception using errcode = '22023', message = 'revision row count mismatch';
  end if;
  if v_job.operation <> 'legacy_revision_migration' and exists (
    select 1 from jsonb_to_recordset(p_rows) x(resource_spec_id uuid)
    left join public.estimate_resource_spec s on s.id = x.resource_spec_id
    where s.id is null or s.definition_version_id <> v_definition_version_id
  ) then raise exception using errcode = '22023', message = 'revision row is outside active definition'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_job.owner_user_id::text || ':' || v_job.catalog_id, 0));
  select coalesce(max(r.revision_number), 0) + 1 into v_revision_number
  from public.estimate_revision r where r.owner_user_id = v_job.owner_user_id and r.catalog_id = v_job.catalog_id;
  insert into public.estimate_revision (
    id, parent_revision_id, organization_id, owner_user_id, release_id, catalog_id,
    revision_number, status, input_parameters, price_snapshot_ids, currency_code,
    totals, row_count, checksum_sha256, compiler_version, migration_source
  ) values (
    v_revision_id, v_job.parent_revision_id, v_job.organization_id, v_job.owner_user_id,
    v_release_id, v_job.catalog_id, v_revision_number, 'ready',
    coalesce(v_job.input_payload -> 'parameters', '{}'::jsonb),
    coalesce(array(select jsonb_array_elements_text(v_job.input_payload -> 'priceSnapshotIds')::uuid), '{}'),
    p_revision ->> 'currencyCode', p_revision -> 'totals', v_row_count,
    p_revision ->> 'checksumSha256', p_revision ->> 'compilerVersion',
    nullif(p_revision -> 'migrationSource', 'null'::jsonb)
  );
  insert into public.estimate_revision_row (
    revision_id, row_id, ordinal, resource_spec_id, section, category, title_ru,
    unit_id, quantity, unit_price, amount, currency_code, procurement_eligible,
    calculation_trace, normative_trace, legacy_row_payload, row_sha256
  ) select v_revision_id, x.row_id, x.ordinal, x.resource_spec_id, x.section, x.category,
    x.title_ru, x.unit_id, x.quantity, x.unit_price, x.amount, x.currency_code,
    x.procurement_eligible, x.calculation_trace, x.normative_trace, x.legacy_row_payload, x.row_sha256
  from jsonb_to_recordset(p_rows) x(
    row_id text, ordinal integer, resource_spec_id uuid, section text, category text,
    title_ru text, unit_id text, quantity numeric, unit_price numeric, amount numeric,
    currency_code text, procurement_eligible boolean, calculation_trace jsonb,
    normative_trace jsonb, legacy_row_payload jsonb, row_sha256 text
  );
  insert into public.estimate_revision_row_price (
    revision_id, row_id, price_snapshot_id, route_id, unit_price, currency_code, resolution_trace
  ) select v_revision_id, x.row_id, x.price_snapshot_id, x.price_route_id, x.unit_price,
    x.currency_code, coalesce(x.price_resolution_trace, '{}'::jsonb)
  from jsonb_to_recordset(p_rows) x(
    row_id text, price_snapshot_id uuid, price_route_id uuid, unit_price numeric,
    currency_code text, price_resolution_trace jsonb
  ) where x.unit_price is not null;
  update public.estimate_compile_job
  set status = 'succeeded', stage = 'complete', progress = 100,
      result_revision_id = v_revision_id, completed_at = now(), updated_at = now(),
      lease_owner = null, lease_expires_at = null, error_code = null, error_detail = null
  where id = p_job_id;
  if v_job.operation = 'legacy_revision_migration' then
    update public.estimate_legacy_revision_import set status = 'succeeded', revision_id = v_revision_id,
      completed_at = now() where job_id = p_job_id;
  end if;
  return v_revision_id;
end;
$$;

commit;
