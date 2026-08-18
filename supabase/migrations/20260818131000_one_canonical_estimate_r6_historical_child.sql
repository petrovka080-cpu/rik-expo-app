-- ONE CANONICAL ESTIMATE R6: an immutable historical revision may be the
-- parent of a new branch child. The parent itself is never updated.

begin;

do $r6_historical_child$
declare
  v_before text;
  v_after text;
  v_latest_only_guard constant text := $guard$    if exists(
      select 1 from public.estimate_revision revision
      where revision.owner_user_id=v_job.owner_user_id and revision.catalog_id=v_job.catalog_id
        and revision.status='ready' and revision.revision_number>v_parent_revision.revision_number
    ) then
      raise exception using errcode='40001',message='cumulative optimistic revision parent is not latest';
    end if;
$guard$;
  v_r6_replacement constant text := $replacement$    -- R6 intentionally permits an immutable historical revision to be the
    -- parent of a new branch child. The advisory lock and max+1 allocation
    -- below still serialize the catalog's revision_number sequence.
$replacement$;
begin
  select pg_get_functiondef(
    'public.estimate_commit_cumulative_compile_job_r58(uuid,text,jsonb,jsonb)'::regprocedure
  ) into v_before;
  if position(v_latest_only_guard in v_before) = 0 then
    if position('R6 intentionally permits an immutable historical revision' in v_before) > 0 then
      return;
    end if;
    raise exception using errcode='55000',
      message='R6 historical-child migration predecessor function does not match expected R58 guard';
  end if;
  v_after := replace(v_before, v_latest_only_guard, v_r6_replacement);
  if v_after = v_before
    or position('cumulative optimistic revision parent is not latest' in v_after) > 0
    or position('R6 intentionally permits an immutable historical revision' in v_after) = 0 then
    raise exception using errcode='55000',message='R6 historical-child function rewrite failed closed';
  end if;
  execute v_after;
end;
$r6_historical_child$;

comment on function public.estimate_commit_cumulative_compile_job_r58(uuid,text,jsonb,jsonb) is
  'R6 cumulative commit: immutable parent may be historical; child gets serialized max+1 revision number.';

commit;
