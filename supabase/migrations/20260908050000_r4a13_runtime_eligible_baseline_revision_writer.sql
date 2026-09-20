-- R4-A13.1: approved validation fixtures are not runtime project inputs.
-- Keep the sole immutable revision writer, but make its provenance check use
-- the same explicit runtime-eligibility policy as the canonical worker.

begin;

do $migration$
declare
  v_signature regprocedure := 'public.estimate_commit_compile_job_v1(uuid,text,jsonb,jsonb)'::regprocedure;
  v_original text;
  v_patched text;
  v_old_fragment text := 'v_baseline_assumptions <> (v_baseline.input_values - (';
  v_new_fragment text := $fragment$v_baseline_assumptions <> (coalesce((
        select jsonb_object_agg(entry.key, entry.value)
        from jsonb_each(v_baseline.input_values) entry(key, value)
        where upper(coalesce(v_baseline.input_classification ->> entry.key, '')) not in (
          'FIXTURE_ONLY', 'VALIDATION_FIXTURE', 'TEST_ONLY'
        )
      ), '{}'::jsonb) - ($fragment$;
begin
  select pg_get_functiondef(v_signature) into strict v_original;
  v_patched := replace(v_original, v_old_fragment, v_new_fragment);
  if v_patched = v_original then
    raise exception using
      errcode = '22023',
      message = 'R4A13 canonical writer provenance fragment was not found';
  end if;
  execute v_patched;
end;
$migration$;

comment on function public.estimate_commit_compile_job_v1(uuid, text, jsonb, jsonb) is
  'R4-A13.1 sole canonical revision writer; cumulative provenance excludes explicitly validation-only baseline inputs.';

revoke all on function public.estimate_commit_compile_job_v1(uuid, text, jsonb, jsonb) from public;
grant execute on function public.estimate_commit_compile_job_v1(uuid, text, jsonb, jsonb) to service_role;

commit;
