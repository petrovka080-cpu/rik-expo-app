create or replace function public.estimate_cleanup_r6_control_runtime(
  p_release_id uuid,
  p_test_owner_user_id uuid,
  p_test_organization_id uuid,
  p_idempotency_key_pattern text
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
as $function$
declare
  v_revision_ids uuid[] := array[]::uuid[];
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
    or p_idempotency_key_pattern is null
    or p_idempotency_key_pattern not like 'r6-control72-%'
    or not exists (
      select 1
      from public.estimate_definition_release release
      where release.id = p_release_id
        and release.status = 'prepared'
        and release.schema_version = 6
        and coalesce((release.metadata->>'activeReleaseSwitched')::boolean, false) = false
    )
  then
    raise exception using errcode = '22023', message = 'R6 prepared unactivated candidate and scoped control identity required';
  end if;
  if exists (
    select 1
    from public.estimate_compile_job job
    where job.target_release_id = p_release_id
      and job.owner_user_id = p_test_owner_user_id
      and job.organization_id = p_test_organization_id
      and job.idempotency_key not like p_idempotency_key_pattern
      and not (
        job.operation in ('pdf', 'procurement')
        and job.idempotency_key like 'r58-4272-artifact-%'
      )
  ) then
    raise exception using errcode = '55000', message = 'test tenant contains runtime outside the exact R6 control run';
  end if;
  if exists (
    select 1
    from public.estimate_compile_job job
    where job.target_release_id = p_release_id
      and job.owner_user_id = p_test_owner_user_id
      and job.organization_id = p_test_organization_id
      and job.status not in ('succeeded', 'failed', 'cancelled')
  ) then
    raise exception using errcode = '55000', message = 'test tenant contains non-terminal R6 control jobs';
  end if;

  select coalesce(array_agg(revision.id), array[]::uuid[])
  into v_revision_ids
  from public.estimate_revision revision
  where revision.release_id = p_release_id
    and revision.owner_user_id = p_test_owner_user_id
    and revision.organization_id = p_test_organization_id;

  alter table public.estimate_revision disable trigger estimate_revision_immutable_trg;
  alter table public.estimate_revision_row disable trigger estimate_revision_row_immutable_trg;
  alter table public.estimate_revision_row_price disable trigger estimate_revision_row_price_immutable_trg;
  begin
    delete from public.estimate_legacy_revision_import legacy
    where legacy.job_id in (
      select job.id
      from public.estimate_compile_job job
      where job.target_release_id = p_release_id
        and job.owner_user_id = p_test_owner_user_id
        and job.organization_id = p_test_organization_id
    );

    delete from public.estimate_revision_artifact artifact
    where artifact.revision_id = any(v_revision_ids);
    get diagnostics v_artifacts = row_count;

    delete from public.estimate_compile_job job
    where job.target_release_id = p_release_id
      and job.owner_user_id = p_test_owner_user_id
      and job.organization_id = p_test_organization_id;
    get diagnostics v_jobs = row_count;

    delete from public.estimate_revision_row_price row_price
    where row_price.revision_id = any(v_revision_ids);
    get diagnostics v_row_prices = row_count;

    delete from public.estimate_revision_row revision_row
    where revision_row.revision_id = any(v_revision_ids);
    get diagnostics v_rows = row_count;

    delete from public.estimate_revision revision
    where revision.id = any(v_revision_ids)
      and revision.release_id = p_release_id
      and revision.owner_user_id = p_test_owner_user_id
      and revision.organization_id = p_test_organization_id;
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
    (select count(*) from public.estimate_compile_job job
      where job.target_release_id = p_release_id
        and job.owner_user_id = p_test_owner_user_id
        and job.organization_id = p_test_organization_id)
    + (select count(*) from public.estimate_revision revision
      where revision.release_id = p_release_id
        and revision.owner_user_id = p_test_owner_user_id
        and revision.organization_id = p_test_organization_id)
  into v_residue;
  return query select v_jobs, v_artifacts, v_row_prices, v_rows, v_revisions, v_residue;
end;
$function$;

revoke all on function public.estimate_cleanup_r6_control_runtime(uuid, uuid, uuid, text) from public;
grant execute on function public.estimate_cleanup_r6_control_runtime(uuid, uuid, uuid, text) to service_role;
