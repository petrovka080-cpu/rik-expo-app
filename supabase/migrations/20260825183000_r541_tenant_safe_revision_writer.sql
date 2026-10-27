-- R5.4.1: admission already permits an authenticated tenant member to create
-- a child from an immutable revision owned by another member of the same
-- organization. Keep the commit stage on the identical tenant boundary.

begin;

do $migration$
declare
  v_function regprocedure := to_regprocedure(
    'public.estimate_commit_compile_job_v1(uuid,text,jsonb,jsonb)'
  );
  v_before text;
  v_after text;
  v_old_guard text := E'or v_parent_revision.owner_user_id <> v_job.owner_user_id\n      or v_parent_revision.organization_id is distinct from v_job.organization_id';
  v_new_guard text := E'or v_parent_revision.organization_id is distinct from v_job.organization_id';
begin
  if v_function is null then
    raise exception using
      errcode = 'P0002',
      message = 'estimate_commit_compile_job_v1 predecessor is required';
  end if;

  select pg_get_functiondef(v_function) into strict v_before;
  if position(v_old_guard in v_before) = 0 then
    raise exception using
      errcode = '22023',
      message = 'tenant-safe writer predecessor guard mismatch';
  end if;

  v_after := replace(v_before, v_old_guard, v_new_guard);
  if v_after = v_before or position(v_old_guard in v_after) <> 0 then
    raise exception using
      errcode = '22023',
      message = 'tenant-safe writer replacement was not exact';
  end if;

  execute v_after;
end;
$migration$;

comment on function public.estimate_commit_compile_job_v1(uuid, text, jsonb, jsonb) is
'R5.4.1 canonical revision writer. A provider-verified tenant member may create an owned child from an immutable same-organization parent; cross-tenant parents remain fail-closed and the parent row is never mutated.';

commit;
