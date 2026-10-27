-- BATCH-009 Fire/Life Safety R5. Backend-native fire detection, notification,
-- suppression, passive fire, maintenance, repair and decommissioning work.
-- The migration is fail-closed and only supports the frozen BATCH-008 successor.

begin;

alter table public.estimate_program_control_state
  add column fire_domain_complete boolean not null default false,
  add column fire_domain_remaining integer not null default 88,
  add column batch010_selected boolean not null default false,
  add column batch010_execution_started boolean not null default false;

do $$
declare
  v_state public.estimate_program_control_state%rowtype;
  v_next_hash text;
begin
  select * into v_state from public.estimate_program_control_state where singleton=true for update;
  if v_state.denominator_total<>11610
    or v_state.admitted_global_count<>3755
    or v_state.queue_remaining<>7855
    or v_state.external_reference_count<>8
    or not v_state.batch008_selected
    or not v_state.batch008_execution_started
    or not v_state.concrete_domain_complete
    or v_state.concrete_domain_remaining<>0
    or not v_state.all_normative_work_gaps_disposed
    or v_state.missing_required_works<>0
    or v_state.batch009_selected
    or v_state.batch009_execution_started
    or v_state.fire_domain_complete
    or v_state.fire_domain_remaining<>88
    or v_state.batch010_selected
    or v_state.batch010_execution_started
    or v_state.global_content_complete then
    raise exception using errcode='55000', message='batch009 predecessor program control state drift';
  end if;
  v_next_hash:=encode(extensions.digest(convert_to((jsonb_build_object(
    'denominator',11610,'admitted',3755,'remaining',7855,'external',8,
    'batch008Selected',true,'batch008ExecutionStarted',true,
    'concreteDomainComplete',true,'concreteDomainRemaining',0,
    'batch009Selected',true,'batch009ExecutionStarted',true,
    'fireDomainComplete',false,'fireDomainRemaining',88,
    'allNormativeWorkGapsDisposed',false,'missingRequiredWorks',0,
    'batch010Selected',false,'batch010ExecutionStarted',false,
    'globalContentComplete',false,'programStateVersion',v_state.program_state_version+1
  ))::text,'UTF8'),'sha256'),'hex');
  update public.estimate_program_control_state
  set batch009_selected=true,
      batch009_execution_started=true,
      all_normative_work_gaps_disposed=false,
      program_state_version=v_state.program_state_version+1,
      state_sha256=v_next_hash,
      updated_at=now()
  where singleton=true and program_state_version=v_state.program_state_version and state_sha256=v_state.state_sha256;
  if not found then raise exception using errcode='40001', message='batch009 selection compare-and-swap conflict'; end if;
  insert into public.estimate_program_event(event_kind,event_key,denominator_delta,queue_delta,payload)
  values ('audit','batch009-fire-r5:selected',0,0,jsonb_build_object(
    'batch009Selected',true,'batch009ExecutionStarted',true,
    'programStateVersion',v_state.program_state_version+1,'stateSha256',v_next_hash,
    'queueMutation',0,'productionDeployed',false
  ));
end;
$$;

alter table public.estimate_program_control_state
  add constraint estimate_program_fire_remaining_ck check (fire_domain_remaining between 0 and denominator_total),
  add constraint estimate_program_fire_complete_ck check (fire_domain_complete=(fire_domain_remaining=0)),
  add constraint estimate_program_batch010_order_ck check (not batch010_execution_started or batch010_selected),
  add constraint estimate_program_batch010_after_fire_ck check (not batch010_selected or fire_domain_complete);

create or replace function public.estimate_activate_fire_release_and_rebase_v5(
  p_release_id uuid,
  p_admission_proof_sha256 text,
  p_independent_audit_sha256 text,
  p_independent_audit_status text,
  p_admitted_catalog_id_set_sha256 text,
  p_expected_newly_admitted integer,
  p_expected_external_definitions integer
)
returns table(release_id uuid,program_state_version bigint,program_state_sha256 text)
language plpgsql
security definer
set search_path=''
as $$
declare
  v_target public.estimate_definition_release%rowtype;
  v_predecessor public.estimate_definition_release%rowtype;
  v_seal public.estimate_domain_release_admission_seal%rowtype;
  v_state public.estimate_program_control_state%rowtype;
  v_state_before jsonb;
  v_state_after jsonb;
  v_counts record;
  v_domain_definition_count integer;
  v_external_definition_count integer;
  v_admitted_ids text[];
  v_computed_id_hash text;
  v_next_hash text;
begin
  if current_user not in ('postgres','service_role') then
    raise exception using errcode='42501', message='service role required';
  end if;
  if p_admission_proof_sha256!~'^[0-9a-f]{64}$'
    or p_independent_audit_sha256!~'^[0-9a-f]{64}$'
    or p_admitted_catalog_id_set_sha256!~'^[0-9a-f]{64}$'
    or p_independent_audit_status<>'GREEN'
    or p_expected_newly_admitted<>88
    or p_expected_external_definitions<>143 then
    raise exception using errcode='22023', message='Fire activation inputs are not exact independent green';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('estimate-fire-r5-release-activation-and-queue-rebase',0));
  select * into v_target from public.estimate_definition_release where id=p_release_id for update;
  select * into v_predecessor from public.estimate_definition_release where status='active' for update;
  select s.* into v_seal from public.estimate_domain_release_admission_seal as s where s.release_id=p_release_id and s.domain_id='fire';
  select * into v_state from public.estimate_program_control_state where singleton=true for update;

  if v_target.status='active' then
    if v_seal.release_id is null
      or v_seal.proof_sha256<>p_admission_proof_sha256
      or v_seal.independent_audit_sha256<>p_independent_audit_sha256
      or v_state.admitted_global_count<>3843
      or v_state.queue_remaining<>7767
      or not v_state.fire_domain_complete
      or v_state.fire_domain_remaining<>0
      or (select count(*) from public.estimate_program_control_transition t where t.release_id=p_release_id)<>1
      or (select count(*) from public.estimate_definition_release_activation a where a.release_id=p_release_id)<>1
      or (select count(*) from public.estimate_program_event e where e.event_kind='admission' and e.event_key like 'batch009-fire-r5:%')<>88
      or not exists(select 1 from public.estimate_definition_release r where r.id=v_target.parent_release_id and r.status='retired') then
      raise exception using errcode='55000', message='Fire activation retry state is not exact';
    end if;
    return query select v_target.id,v_state.program_state_version,v_state.state_sha256;
    return;
  end if;

  if v_target.id is null or v_target.status<>'prepared' or v_target.schema_version<>5
    or v_target.source_package_sha256 is null or v_predecessor.id is null
    or v_target.parent_release_id<>v_predecessor.id
    or v_seal.release_id is null
    or v_seal.proof_sha256<>p_admission_proof_sha256
    or v_seal.independent_audit_sha256<>p_independent_audit_sha256
    or v_seal.test_runtime_residue<>0 then
    raise exception using errcode='55000', message='Fire release lineage or admission seal is not activatable';
  end if;

  select count(*)::integer definitions,
    (select count(*)::integer from public.estimate_parameter_definition p join public.estimate_definition_version v on v.id=p.definition_version_id where v.release_id=p_release_id) parameters,
    (select count(*)::integer from public.estimate_formula_graph f join public.estimate_definition_version v on v.id=f.definition_version_id where v.release_id=p_release_id) formulas,
    (select count(*)::integer from public.estimate_resource_spec s join public.estimate_definition_version v on v.id=s.definition_version_id where v.release_id=p_release_id) resources
  into v_counts from public.estimate_definition_version v where v.release_id=p_release_id;
  if (v_target.definition_count,v_target.parameter_count,v_target.formula_count,v_target.resource_row_count)
    is distinct from (v_counts.definitions,v_counts.parameters,v_counts.formulas,v_counts.resources) then
    raise exception using errcode='55000', message='Fire successor release cardinality mismatch';
  end if;

  select count(*)::integer,count(*) filter(where not w.denominator_eligible)::integer
  into v_domain_definition_count,v_external_definition_count
  from public.estimate_definition_version v join public.estimate_work_identity w on w.catalog_id=v.catalog_id
  where v.release_id=p_release_id and w.domain='fire';
  select array_agg(v.catalog_id order by v.catalog_id) into v_admitted_ids
  from public.estimate_definition_version v join public.estimate_work_identity w on w.catalog_id=v.catalog_id
  where v.release_id=p_release_id and w.domain='fire' and w.denominator_eligible;
  v_computed_id_hash:=encode(extensions.digest(convert_to(array_to_string(v_admitted_ids,E'\n'),'UTF8'),'sha256'),'hex');
  if coalesce(array_length(v_admitted_ids,1),0)<>p_expected_newly_admitted
    or v_domain_definition_count<>231
    or v_domain_definition_count<>v_seal.definition_count
    or v_external_definition_count<>p_expected_external_definitions
    or v_computed_id_hash<>p_admitted_catalog_id_set_sha256 then
    raise exception using errcode='55000', message='Fire admitted ID set or external definition set mismatch';
  end if;

  if v_state.denominator_total<>11610
    or v_state.admitted_global_count<>3755
    or v_state.queue_remaining<>7855
    or v_state.external_reference_count<>8
    or not v_state.batch008_selected
    or not v_state.batch008_execution_started
    or not v_state.concrete_domain_complete
    or v_state.concrete_domain_remaining<>0
    or not v_state.batch009_selected
    or not v_state.batch009_execution_started
    or v_state.fire_domain_complete
    or v_state.fire_domain_remaining<>p_expected_newly_admitted
    or v_state.all_normative_work_gaps_disposed
    or v_state.missing_required_works<>0
    or v_state.batch010_selected
    or v_state.batch010_execution_started
    or v_state.global_content_complete then
    raise exception using errcode='55000', message='Fire predecessor program control state drift';
  end if;
  v_state_before:=to_jsonb(v_state);

  update public.estimate_definition_release set status='retired' where id=v_predecessor.id and status='active';
  if not found then raise exception using errcode='40001', message='Fire predecessor retirement conflict'; end if;
  update public.estimate_definition_release set status='active',activated_at=now() where id=v_target.id and status='prepared';
  if not found then raise exception using errcode='40001', message='Fire target activation conflict'; end if;

  v_next_hash:=encode(extensions.digest(convert_to((jsonb_build_object(
    'denominator',11610,'admitted',3843,'remaining',7767,'external',8,
    'batch008Selected',true,'batch008ExecutionStarted',true,
    'concreteDomainComplete',true,'concreteDomainRemaining',0,
    'batch009Selected',true,'batch009ExecutionStarted',true,
    'fireDomainComplete',true,'fireDomainRemaining',0,
    'allNormativeWorkGapsDisposed',true,'missingRequiredWorks',0,
    'batch010Selected',false,'batch010ExecutionStarted',false,
    'globalContentComplete',false,'programStateVersion',v_state.program_state_version+1
  ))::text,'UTF8'),'sha256'),'hex');
  update public.estimate_program_control_state as s
  set admitted_global_count=s.admitted_global_count+p_expected_newly_admitted,
      queue_remaining=s.queue_remaining-p_expected_newly_admitted,
      fire_domain_complete=true,
      fire_domain_remaining=0,
      all_normative_work_gaps_disposed=true,
      missing_required_works=0,
      program_state_version=s.program_state_version+1,
      state_sha256=v_next_hash,
      updated_at=now()
  where s.singleton=true and s.program_state_version=v_state.program_state_version and s.state_sha256=v_state.state_sha256;
  if not found then raise exception using errcode='40001', message='Fire program control compare-and-swap conflict'; end if;

  select to_jsonb(s) into v_state_after from public.estimate_program_control_state s where s.singleton=true;
  if (v_state_after->>'admitted_global_count')::integer+(v_state_after->>'queue_remaining')::integer<>11610
    or (v_state_after->>'admitted_global_count')::integer<>3843
    or (v_state_after->>'queue_remaining')::integer<>7767
    or (v_state_after->>'external_reference_count')::integer<>8
    or not (v_state_after->>'fire_domain_complete')::boolean
    or (v_state_after->>'fire_domain_remaining')::integer<>0
    or not (v_state_after->>'all_normative_work_gaps_disposed')::boolean
    or (v_state_after->>'batch010_selected')::boolean
    or (v_state_after->>'batch010_execution_started')::boolean then
    raise exception using errcode='55000', message='Fire program control arithmetic failed';
  end if;

  insert into public.estimate_program_event(event_kind,event_key,catalog_id,denominator_delta,queue_delta,payload)
  select 'admission','batch009-fire-r5:'||catalog_id,catalog_id,0,-1,jsonb_build_object(
    'releaseId',v_target.id,'predecessorReleaseId',v_predecessor.id,
    'externalDefinitionVersionsAdded',p_expected_external_definitions,
    'programStateVersion',v_state.program_state_version+1,
    'admissionProofSha256',p_admission_proof_sha256,'independentAuditSha256',p_independent_audit_sha256
  ) from unnest(v_admitted_ids) as ids(catalog_id);
  insert into public.estimate_definition_release_activation(
    release_id,predecessor_release_id,admission_proof_sha256,independent_audit_sha256,program_state_before,program_state_after
  ) values (v_target.id,v_predecessor.id,p_admission_proof_sha256,p_independent_audit_sha256,v_state_before,v_state_after);
  insert into public.estimate_program_control_transition(
    transition_key,release_id,predecessor_release_id,state_version_before,state_version_after,
    state_hash_before,state_hash_after,state_before,state_after,admitted_catalog_id_set_sha256,
    newly_admitted_count,admission_proof_sha256,independent_audit_sha256
  ) values (
    'batch009-fire-r5:'||v_target.id::text,v_target.id,v_predecessor.id,
    v_state.program_state_version,v_state.program_state_version+1,v_state.state_sha256,v_next_hash,
    v_state_before,v_state_after,p_admitted_catalog_id_set_sha256,p_expected_newly_admitted,
    p_admission_proof_sha256,p_independent_audit_sha256
  );
  return query select v_target.id,v_state.program_state_version+1,v_next_hash;
end;
$$;

revoke all on function public.estimate_activate_fire_release_and_rebase_v5(uuid,text,text,text,text,integer,integer) from public;
grant execute on function public.estimate_activate_fire_release_and_rebase_v5(uuid,text,text,text,text,integer,integer) to service_role;

comment on function public.estimate_activate_fire_release_and_rebase_v5(uuid,text,text,text,text,integer,integer) is
  'Atomically activates the independently admitted cumulative Fire/Life Safety R5 successor, subtracts exactly 88 global IDs once, and registers 143 external definition versions without denominator mutation.';

commit;
