-- Extend the existing sole revision writer: calculated inputs are distinct
-- from actual user facts. Keep baseline eligibility, tenant, lineage, rows,
-- checksum and monetary invariants; admit only definition-owned derivations.
begin;
do $migration$
declare
  v_signature regprocedure := 'public.estimate_commit_compile_job_v1(uuid,text,jsonb,jsonb)'::regprocedure;
  v_original text;
  v_patched text;
  v_old_fragment text := 'v_resolved_parameters <> (v_baseline_assumptions || v_user_parameters)';
  v_new_fragment text := $fragment$v_resolved_parameters <> (v_baseline_assumptions || v_user_parameters || coalesce(v_parameter_sources -> 'derivedParameters','{}'::jsonb))
      or jsonb_typeof(coalesce(v_parameter_sources -> 'derivedParameters','{}'::jsonb)) <> 'object'
      or exists (
        select 1 from jsonb_object_keys(coalesce(v_parameter_sources -> 'derivedParameters','{}'::jsonb)) derived(parameter_id)
        left join public.estimate_parameter_definition parameter
          on parameter.definition_version_id=v_definition_version_id and parameter.parameter_id=derived.parameter_id
        where parameter.parameter_id is null
          or v_user_parameters ? derived.parameter_id
          or v_baseline_assumptions ? derived.parameter_id
          or not (parameter.truth_metadata ? 'effective_resource_quantity_v1'
            or parameter.truth_metadata ? 'derived_exact_lookup_v1'
            or parameter.truth_metadata ? 'preliminary_value_formula_v1')
      )$fragment$;
begin
  select pg_get_functiondef(v_signature) into strict v_original;
  if position('preliminary_value_formula_v1' in v_original)>0
    and position('derivedParameters' in v_original)>0 then return; end if;
  v_patched := replace(v_original,v_old_fragment,v_new_fragment);
  if v_patched=v_original then
    raise exception using errcode='22023',message='S2745 sole writer provenance fragment not found';
  end if;
  execute v_patched;
end;
$migration$;
comment on function public.estimate_commit_compile_job_v1(uuid,text,jsonb,jsonb) is
  'S27.45 sole immutable revision writer; separate owned calculated parameters, user facts and runtime baseline with unchanged tenant/lineage/row/cost checks.';
revoke all on function public.estimate_commit_compile_job_v1(uuid,text,jsonb,jsonb) from public;
grant execute on function public.estimate_commit_compile_job_v1(uuid,text,jsonb,jsonb) to service_role;
commit;
