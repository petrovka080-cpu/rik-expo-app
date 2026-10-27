-- R4-A13.3: a meaningful preliminary BOQ may contain only unresolved needs.
-- It is not an empty estimate: the compiler persists those needs in the
-- immutable revision contract until the user supplies the missing inputs.

begin;

do $migration$
declare
  v_signature regprocedure := 'public.estimate_commit_compile_job_v1(uuid,text,jsonb,jsonb)'::regprocedure;
  v_original text;
  v_patched text;
  v_old_fragment text := 'or (v_cumulative and v_row_count < 1) then';
  v_new_fragment text := $fragment$or (
      v_cumulative
      and v_row_count < 1
      and jsonb_array_length(coalesce(
        p_revision #> '{parameterSources,preliminaryNeeds}',
        '[]'::jsonb
      )) < 1
    ) then$fragment$;
begin
  select pg_get_functiondef(v_signature) into strict v_original;
  v_patched := replace(v_original, v_old_fragment, v_new_fragment);
  if v_patched = v_original then
    raise exception using
      errcode = '22023',
      message = 'R4A13 preliminary-only writer fragment was not found';
  end if;
  execute v_patched;
end;
$migration$;

comment on function public.estimate_commit_compile_job_v1(uuid, text, jsonb, jsonb) is
  'R4-A13.3 sole canonical revision writer; cumulative revisions may have zero calculated rows only when durable preliminary needs are present.';

revoke all on function public.estimate_commit_compile_job_v1(uuid, text, jsonb, jsonb) from public;
grant execute on function public.estimate_commit_compile_job_v1(uuid, text, jsonb, jsonb) to service_role;

commit;
