begin;

create or replace function public.estimate_cleanup_cumulative_admission_runtime_r58(
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
      select 1
      from public.estimate_definition_release release
      where release.id = p_release_id
        and release.status = 'prepared'
        and release.schema_version = 6
        and (
          release.release_key = 'p0-r58-cumulative-candidate-4cf42813'
          or (
            release.release_key = 'p0-r58-cumulative-candidate-laminate-4cf42813'
            and release.parent_release_id = 'a7dca174-3ad5-552b-aa4c-fc28979a56ef'::uuid
            and release.metadata->>'contract' = 'p0-one-monolith-r58-laminate-forward-promotion.v1'
          )
          or (
            release.release_key = 'p0-r58-cumulative-candidate-mandatory-journeys-4cf42813'
            and release.parent_release_id = '34a707dc-954c-547d-ba88-27c15dba58d7'::uuid
            and release.metadata->>'contract' = 'p0-one-monolith-r58-mandatory-journeys.v1'
            and coalesce((release.metadata->>'mandatoryRealWorksAdded')::integer, 0) = 8
            and coalesce((release.metadata->>'generatedTemplate')::boolean, true) = false
            and coalesce((release.metadata->>'universalEstimator')::boolean, true) = false
            and coalesce((release.metadata->>'artificialPrices')::boolean, true) = false
          )
          or (
            release.release_key = 'p0-r58-cumulative-candidate-concrete-pedestal-4cf42813'
            and release.parent_release_id = '0a9b5d0d-d57a-520d-b661-c3e564df3286'::uuid
            and release.metadata->>'contract' = 'p0-one-monolith-r58-mandatory-journeys.v1'
            and release.metadata->>'exactFrozenJourney' = 'Бетонные тумбы 10 шт'
            and coalesce((release.metadata->>'generatedTemplate')::boolean, true) = false
            and coalesce((release.metadata->>'universalEstimator')::boolean, true) = false
            and coalesce((release.metadata->>'artificialPrices')::boolean, true) = false
          )
        )
        and release.metadata->>'authority' = 'P0_ONE_MONOLITH_ESTIMATE_PLATFORM_R5.8'
        and release.metadata->>'specSha256' = '4cf42813e8a94816867ec62e63909fe0624a12d6955f598599deb0a92338e318'
        and coalesce((release.metadata->>'batch009Included')::boolean, true) = false
    )
    or exists (
      select 1
      from public.estimate_domain_release_admission_seal seal
      where seal.release_id = p_release_id
    ) then
    raise exception using errcode = '22023', message = 'R5.8 prepared unactivated cumulative candidate required';
  end if;
  if exists (
    select 1
    from public.estimate_revision revision
    where revision.release_id = p_release_id
      and (revision.owner_user_id <> p_test_owner_user_id
        or revision.organization_id is distinct from p_test_organization_id)
  ) or exists (
    select 1
    from public.estimate_compile_job job
    where job.target_release_id = p_release_id
      and (job.owner_user_id <> p_test_owner_user_id
        or job.organization_id is distinct from p_test_organization_id)
  ) then
    raise exception using errcode = '55000', message = 'candidate contains runtime outside the exact admission owner';
  end if;
  if exists (
    select 1
    from public.estimate_compile_job job
    where job.target_release_id = p_release_id
      and job.status not in ('succeeded', 'failed', 'cancelled')
  ) then
    raise exception using errcode = '55000', message = 'candidate contains non-terminal admission jobs';
  end if;

  alter table public.estimate_revision disable trigger estimate_revision_immutable_trg;
  alter table public.estimate_revision_row disable trigger estimate_revision_row_immutable_trg;
  alter table public.estimate_revision_row_price disable trigger estimate_revision_row_price_immutable_trg;
  begin
    delete from public.estimate_legacy_revision_import legacy
    where legacy.job_id in (
      select job.id from public.estimate_compile_job job where job.target_release_id = p_release_id
    );

    delete from public.estimate_revision_artifact artifact
    using public.estimate_revision revision
    where artifact.revision_id = revision.id and revision.release_id = p_release_id;
    get diagnostics v_artifacts = row_count;

    delete from public.estimate_compile_job job where job.target_release_id = p_release_id;
    get diagnostics v_jobs = row_count;

    delete from public.estimate_revision_row_price row_price
    using public.estimate_revision revision
    where row_price.revision_id = revision.id and revision.release_id = p_release_id;
    get diagnostics v_row_prices = row_count;

    delete from public.estimate_revision_row revision_row
    using public.estimate_revision revision
    where revision_row.revision_id = revision.id and revision.release_id = p_release_id;
    get diagnostics v_rows = row_count;

    delete from public.estimate_revision revision where revision.release_id = p_release_id;
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
    (select count(*) from public.estimate_compile_job job where job.target_release_id = p_release_id)
    + (select count(*) from public.estimate_revision revision where revision.release_id = p_release_id)
    + (select count(*) from public.estimate_revision_row revision_row
        join public.estimate_revision revision on revision.id = revision_row.revision_id
        where revision.release_id = p_release_id)
    + (select count(*) from public.estimate_revision_artifact artifact
        join public.estimate_revision revision on revision.id = artifact.revision_id
        where revision.release_id = p_release_id)
  into v_residue;
  return query select v_jobs, v_artifacts, v_row_prices, v_rows, v_revisions, v_residue;
end;
$$;

revoke all on function public.estimate_cleanup_cumulative_admission_runtime_r58(uuid,uuid,uuid) from public;
grant execute on function public.estimate_cleanup_cumulative_admission_runtime_r58(uuid,uuid,uuid) to service_role;

commit;
