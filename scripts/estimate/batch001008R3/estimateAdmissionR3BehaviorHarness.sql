\set ON_ERROR_STOP on

insert into public.estimate_definition_release(id,status,activated_at) values
  ('10000000-0000-4000-8000-000000000001','active',now()),
  ('10000000-0000-4000-8000-000000000002','prepared',null);
insert into public.estimate_search_index_release(id,status) values
  ('20000000-0000-4000-8000-000000000001','active'),
  ('20000000-0000-4000-8000-000000000002','prepared');
insert into public.estimate_definition_version(id,release_id,catalog_id) values
  ('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','production-work'),
  ('30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','candidate-work');
insert into public.estimate_cumulative_manifest_entry(
  release_id,catalog_id,definition_version_id,source_batch,source_release_id,domain_id,
  publication_state,definition_hash,entry_sha256
) values
  ('10000000-0000-4000-8000-000000000001','production-work','30000000-0000-4000-8000-000000000001',
    'BATCH-001','10000000-0000-4000-8000-000000000001','test','ACCEPTED_INHERITED',repeat('a',64),repeat('b',64)),
  ('10000000-0000-4000-8000-000000000002','candidate-work','30000000-0000-4000-8000-000000000002',
    'BATCH-008','10000000-0000-4000-8000-000000000002','test','CANONICAL_SUCCESSOR',repeat('c',64),repeat('d',64));
insert into public.estimate_search_document(
  search_release_id,catalog_id,definition_version_id,adjudication_class,selectable
) values
  ('20000000-0000-4000-8000-000000000001','production-work','30000000-0000-4000-8000-000000000001','EFFECTIVE_WORK',true),
  ('20000000-0000-4000-8000-000000000002','candidate-work','30000000-0000-4000-8000-000000000002','EFFECTIVE_WORK',true);

do $$
begin
  begin
    insert into public.estimate_compile_job(operation,catalog_id,input_payload)
    values('compile','production-work','{}'::jsonb);
    raise exception 'R3_HARNESS_EXPECTED_QUARANTINE_REJECTION';
  exception when sqlstate '55000' then
    if sqlerrm<>'ESTIMATE_ADMISSION_R3_PRODUCTION_CONTENT_BLOCKED' then raise; end if;
  end;
end;
$$;

update public.estimate_definition_version
set content_status='PRODUCTION',content_gate_status='GREEN'
where id='30000000-0000-4000-8000-000000000001';
update public.estimate_cumulative_manifest_entry
set runtime_publication_state='PRODUCTION',baseline_ready=true,scenario_ready=true
where release_id='10000000-0000-4000-8000-000000000001' and catalog_id='production-work';
insert into public.estimate_compile_job(operation,catalog_id,input_payload)
values('compile','production-work','{}'::jsonb);

update public.estimate_definition_version
set content_status='CANDIDATE_READY',content_gate_status='GREEN'
where id='30000000-0000-4000-8000-000000000002';
update public.estimate_cumulative_manifest_entry
set runtime_publication_state='CANDIDATE',baseline_ready=true,scenario_ready=true
where release_id='10000000-0000-4000-8000-000000000002' and catalog_id='candidate-work';
insert into public.estimate_candidate_capability_r3(
  id,environment,tenant_id,release_id,search_release_id,expires_at,purpose,
  source_head,source_tree,issued_by
) values(
  '40000000-0000-4000-8000-000000000001','isolated-harness',
  '50000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002',
  '20000000-0000-4000-8000-000000000002',now()+interval '1 hour',
  'estimate_candidate_admission_r3','abcdef0123456789','0123456789abcdef','r3-harness'
);
insert into public.estimate_compile_job(
  operation,target_release_id,catalog_id,organization_id,input_payload
) values(
  'compile','10000000-0000-4000-8000-000000000002','candidate-work',
  '50000000-0000-4000-8000-000000000001',
  jsonb_build_object('estimateAdmission',jsonb_build_object(
    'capabilityId','40000000-0000-4000-8000-000000000001',
    'environment','isolated-harness','sourceHead','abcdef0123456789','sourceTree','0123456789abcdef'
  ))
);

do $$
declare
  v_production integer;
  v_candidate integer;
begin
  select count(*) into v_production from public.estimate_compile_job
  where estimate_admission_decision @> '{"allowed":true,"mode":"production","contractVersion":"estimate-admission-r3"}'::jsonb;
  select count(*) into v_candidate from public.estimate_compile_job
  where estimate_admission_decision @> '{"allowed":true,"mode":"isolated_candidate_test","contractVersion":"estimate-admission-r3"}'::jsonb;
  if v_production<>1 or v_candidate<>1 then
    raise exception 'R3_HARNESS_DECISION_COUNTS_INVALID:%:%',v_production,v_candidate;
  end if;
end;
$$;

select jsonb_build_object(
  'status','GREEN_R3_ADMISSION_SQL_HARNESS',
  'productionAllowed',count(*) filter(where estimate_admission_decision->>'mode'='production'),
  'candidateAllowed',count(*) filter(where estimate_admission_decision->>'mode'='isolated_candidate_test'),
  'quarantinedInsertPersisted',count(*) filter(where estimate_admission_decision is null)
)::text
from public.estimate_compile_job;
