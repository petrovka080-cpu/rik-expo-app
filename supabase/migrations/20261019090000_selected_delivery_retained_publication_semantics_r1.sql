-- Retained Master publications preserve semantic provenance under a new
-- release contract. Patch only the existing sole writer's parameter guard.
begin;
do $migration$
declare
  v_signature regprocedure:='public.estimate_commit_compile_job_v1(uuid,text,jsonb,jsonb)'::regprocedure;
  v_original text;
  v_normalized text;
  v_patched text;
  v_preimage_md5 constant text:='84f1149126c0f76cde638e8c5dc46c77';
  v_postimage_md5 constant text:='e12865f429dd5508d2ad197fa8b75015';
  v_old constant text:=$owner_old$      or v_delivery_parameter.truth_metadata ->> 'contract' is distinct from 'rik-expo-app.selected-material-delivery-forward.r1'$owner_old$;
  v_new constant text:=$owner_new$      -- The Master owns the release envelope; this retained guide identifies
      -- the semantic derivation, with server ownership and no default count.
      or (v_delivery_parameter.default_value is not null and v_delivery_parameter.default_value is distinct from 'null'::jsonb)
      or v_delivery_parameter.truth_metadata #>> '{guide,guide_version}' is distinct from 'rik-expo-app.selected-material-delivery-forward.r1'
      or v_delivery_parameter.truth_metadata #>> '{provenance,consumer_input_role_v1}' is distinct from 'APPLICATION_TECHNICAL'
      or v_delivery_parameter.truth_metadata -> 'hidden_default_forbidden' is distinct from 'true'::jsonb$owner_new$;
begin
  select pg_get_functiondef(v_signature) into strict v_original;
  v_normalized:=btrim(replace(v_original,E'\r\n',E'\n'),E'\n');
  if md5(v_normalized)=v_postimage_md5 then return; end if;
  if md5(v_normalized) is distinct from v_preimage_md5
    or (length(v_normalized)-length(replace(v_normalized,v_old,'')))/length(v_old)<>1 then
    raise exception using errcode='22023',message='selected delivery semantic guard preimage drift';
  end if;
  v_patched:=replace(v_normalized,v_old,v_new);
  if md5(v_patched) is distinct from v_postimage_md5 then
    raise exception using errcode='22023',message='selected delivery semantic guard postimage mismatch';
  end if;
  execute v_patched;
  if md5(btrim(replace(pg_get_functiondef(v_signature),E'\r\n',E'\n'),E'\n')) is distinct from v_postimage_md5 then
    raise exception using errcode='22023',message='selected delivery installed semantic guard mismatch';
  end if;
end;
$migration$;
commit;
