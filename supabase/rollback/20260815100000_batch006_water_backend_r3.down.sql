-- Disposable-clone rollback companion for BATCH-006 R3 migration replay.
-- It refuses to remove imported definitions, user revisions or a rebased queue.

begin;

do $$
declare
  has_runtime_data boolean := false;
  relation_has_rows boolean;
begin
  has_runtime_data := exists (
    select 1 from public.estimate_definition_release where schema_version = 5
  );

  if to_regclass('public.estimate_professional_passport') is not null then
    execute 'select exists (select 1 from public.estimate_professional_passport)'
      into relation_has_rows;
    has_runtime_data := has_runtime_data or relation_has_rows;
  end if;

  if to_regclass('public.estimate_domain_release_admission_seal') is not null then
    execute 'select exists (select 1 from public.estimate_domain_release_admission_seal)'
      into relation_has_rows;
    has_runtime_data := has_runtime_data or relation_has_rows;
  end if;

  if to_regclass('public.estimate_program_control_transition') is not null then
    execute 'select exists (select 1 from public.estimate_program_control_transition)'
      into relation_has_rows;
    has_runtime_data := has_runtime_data or relation_has_rows;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'estimate_program_control_state'
      and column_name in ('water_domain_complete', 'batch006_started')
    group by table_schema, table_name
    having count(*) = 2
  ) then
    execute 'select exists (
      select 1 from public.estimate_program_control_state
      where water_domain_complete or batch006_started
    )' into relation_has_rows;
    has_runtime_data := has_runtime_data or relation_has_rows;
  end if;

  if has_runtime_data then
    raise exception using errcode = '55000',
      message = 'BATCH006 R3 rollback requires an empty pre-import disposable clone';
  end if;
end;
$$;

drop function if exists public.estimate_activate_water_release_and_rebase_v3(uuid, text, text, text, text, integer);
drop function if exists public.estimate_seal_domain_release_admission_v3(uuid, text, text, text, integer, integer, integer, integer, integer, integer, integer, integer, integer, integer, integer, integer, integer, jsonb);
drop function if exists public.estimate_cleanup_release_admission_runtime_v3(uuid, uuid, uuid);
drop function if exists public.estimate_create_release_admission_job_v3(uuid, text, text, uuid, uuid, text, text, text, uuid, jsonb);
drop table if exists public.estimate_program_control_transition;
drop table if exists public.estimate_domain_release_admission_seal;
do $$
begin
  if to_regclass('public.estimate_professional_passport') is not null then
    execute 'drop trigger if exists estimate_professional_passport_immutable_trg on public.estimate_professional_passport';
    execute 'drop trigger if exists estimate_professional_passport_lineage_trg on public.estimate_professional_passport';
  end if;
end;
$$;
drop function if exists public.estimate_validate_professional_passport_v3();
drop table if exists public.estimate_professional_passport;

alter table public.estimate_program_control_state
  drop constraint if exists estimate_program_water_complete_ck,
  drop constraint if exists estimate_program_batch007_order_ck,
  drop constraint if exists estimate_program_water_remaining_ck,
  drop constraint if exists estimate_program_state_sha256_ck,
  drop column if exists batch007_execution_started,
  drop column if exists batch007_selected,
  drop column if exists global_content_complete,
  drop column if exists water_domain_remaining,
  drop column if exists water_domain_complete,
  drop column if exists state_sha256,
  drop column if exists program_state_version;

commit;
