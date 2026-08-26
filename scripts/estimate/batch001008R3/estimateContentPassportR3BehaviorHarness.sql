\set ON_ERROR_STOP on

begin;

create table if not exists public.estimate_parameter_definition(
  definition_version_id uuid not null
);
create table if not exists public.estimate_formula_graph(
  definition_version_id uuid not null
);
create table if not exists public.estimate_resource_spec(
  definition_version_id uuid not null
);

insert into public.estimate_definition_release(id,status)
values('40000000-0000-4000-8000-000000000001','draft');

insert into public.estimate_definition_version(
  id,release_id,catalog_id,source_metadata
) values(
  '40000000-0000-4000-8000-000000000002','40000000-0000-4000-8000-000000000001',
  'r3-content-harness-alias','{}'::jsonb
);

do $$
begin
  begin
    update public.estimate_definition_version
    set content_status='CANDIDATE_READY',content_gate_status='GREEN'
    where id='40000000-0000-4000-8000-000000000002';
    raise exception 'CONTENT_GATE_MISSING_PASSPORT_WAS_NOT_BLOCKED';
  exception when sqlstate '55000' then
    if sqlerrm<>'ESTIMATE_CONTENT_R3_PASSPORT_MISSING' then raise; end if;
  end;
end;
$$;

insert into public.estimate_content_passport_r3(
  definition_version_id,release_id,catalog_id,contract_version,identity_mode,physical_result_ru,
  capability_matrix,parameter_count,formula_count,resource_count,decision,payload_sha256,source_head,source_tree
) values(
  '40000000-0000-4000-8000-000000000002','40000000-0000-4000-8000-000000000001',
  'r3-content-harness-alias','real-professional-estimates-r3.content-passport.v1','ALIAS_ONLY','SEARCH_ONLY',
  '[{"group":"material","status":"NOT_APPLICABLE"},{"group":"construction_work","status":"NOT_APPLICABLE"},{"group":"machine_equipment","status":"NOT_APPLICABLE"},{"group":"delivery","status":"NOT_APPLICABLE"}]'::jsonb,
  0,0,0,'{"contract":"real-professional-estimates-r3.content-passport.v1","allowed":true,"status":"GREEN"}'::jsonb,
  repeat('4',64),'head','tree'
);

update public.estimate_definition_version
set content_status='CANDIDATE_READY',content_gate_status='GREEN'
where id='40000000-0000-4000-8000-000000000002';

update public.estimate_definition_release set status='prepared'
where id='40000000-0000-4000-8000-000000000001';

do $$
begin
  begin
    update public.estimate_content_passport_r3 set source_tree='changed'
    where definition_version_id='40000000-0000-4000-8000-000000000002';
    raise exception 'PREPARED_PASSPORT_MUTATION_WAS_NOT_BLOCKED';
  exception when sqlstate '55000' then
    if sqlerrm<>'ESTIMATE_CONTENT_R3_PASSPORT_IMMUTABLE' then raise; end if;
  end;
end;
$$;

select jsonb_build_object(
  'status','GREEN_R3_CONTENT_PASSPORT_SQL_HARNESS',
  'greenDefinitions',(select count(*) from public.estimate_definition_version
    where id='40000000-0000-4000-8000-000000000002' and content_gate_status='GREEN'),
  'immutablePreparedPassports',(select count(*) from public.estimate_content_passport_r3 passport
    join public.estimate_definition_release release on release.id=passport.release_id
    where passport.definition_version_id='40000000-0000-4000-8000-000000000002' and release.status='prepared')
);

rollback;
