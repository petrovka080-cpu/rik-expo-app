-- Keep the sole canonical writer and bind legacy assumptions to the same
-- finite published user-choice declaration as the worker. Local migration only.
begin;
do $baseline_scope_migration$
declare
  v_signature regprocedure:='public.estimate_commit_compile_job_v1(uuid,text,jsonb,jsonb)'::regprocedure;
  v_original text;
  v_patched text;
  v_preimage_md5 constant text:='3d9e23c48ffec24ddbc04065bcfdcb10';
  v_postimage_md5 constant text:='08bfc3645d92b6657c56c87ccd9781cc';
  v_old constant text:=$baseline_scope_old$        where upper(coalesce(v_baseline.input_classification ->> entry.key, '')) not in (
          'FIXTURE_ONLY', 'VALIDATION_FIXTURE', 'TEST_ONLY'
        )$baseline_scope_old$;
  v_new constant text:=$baseline_scope_new$        where upper(coalesce(v_baseline.input_classification ->> entry.key, '')) not in (
          'FIXTURE_ONLY', 'VALIDATION_FIXTURE', 'TEST_ONLY'
        )
        -- SCOPED_BASELINE_ASSUMPTION_V1: exact published legacy-choice gate.
        -- No condition interpreter or caller-supplied eligibility attestation.
        and not (
          upper(coalesce(v_baseline.input_classification ->> entry.key,''))='ASSUMPTION'
          and exists (
            select 1
            from public.estimate_parameter_definition assumption
            join public.estimate_parameter_definition selector
              on selector.definition_version_id=assumption.definition_version_id
              and selector.parameter_id=assumption.truth_metadata #>> '{visible_when,operands,0,parameterId}'
            where assumption.definition_version_id=v_definition_version_id
              and assumption.parameter_id=entry.key
              and assumption.truth_metadata ->> 'value_source_role'='VISIBLE_BASELINE_ASSUMPTION'
              and selector.value_type='enum'
              and selector.truth_metadata ->> 'visibility_role'='USER_INPUT'
              and selector.truth_metadata ->> 'value_source_role'='USER_INPUT'
              and jsonb_typeof(assumption.truth_metadata #> '{visible_when,operands,0,value}')='string'
              and length(assumption.truth_metadata #>> '{visible_when,operands,0,value}')>0
              and jsonb_typeof(selector.constraints_json -> 'values')='array'
              and selector.constraints_json -> 'values' @> jsonb_build_array(assumption.truth_metadata #> '{visible_when,operands,0,value}')
              and assumption.truth_metadata -> 'visible_when'=jsonb_build_object('kind','and','operands',jsonb_build_array(
                jsonb_build_object('kind','selected','parameterId',selector.parameter_id,
                  'value',assumption.truth_metadata #> '{visible_when,operands,0,value}'),
                jsonb_build_object('kind','literal','value',true)))
              and (v_user_parameters -> selector.parameter_id) is distinct from
                (assumption.truth_metadata #> '{visible_when,operands,0,value}')
          )
        )$baseline_scope_new$;
begin
  select btrim(replace(pg_get_functiondef(v_signature),E'\r\n',E'\n'),E'\n') into strict v_original;
  if md5(v_original)=v_postimage_md5 then return; end if;
  if md5(v_original) is distinct from v_preimage_md5
    or position('SCOPED_BASELINE_ASSUMPTION_V1' in v_original)>0
    or (length(v_original)-length(replace(v_original,v_old,'')))/length(v_old)<>1 then
    raise exception using errcode='22023',message='scoped baseline writer preimage drift or ambiguous fragment';
  end if;
  v_patched:=replace(v_original,v_old,v_new);
  if md5(v_patched) is distinct from v_postimage_md5 then
    raise exception using errcode='22023',message='scoped baseline writer proposed postimage mismatch';
  end if;
  execute v_patched;
  if md5(btrim(replace(pg_get_functiondef(v_signature),E'\r\n',E'\n'),E'\n')) is distinct from v_postimage_md5 then
    raise exception using errcode='22023',message='scoped baseline writer installed postimage mismatch';
  end if;
end;
$baseline_scope_migration$;
commit;
