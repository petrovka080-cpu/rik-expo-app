-- An append-only withdrawal in the existing defect ledger. Sealed definitions
-- and historical revisions remain immutable, including their original status.
begin;

alter table public.estimate_definition_defect_record
  alter column successor_definition_version_id drop not null,
  drop constraint estimate_definition_defect_record_defect_class_check,
  drop constraint estimate_definition_defect_record_contract_version_check,
  drop constraint estimate_definition_defect_record_check,
  drop constraint estimate_definition_defect_record_check1,
  add constraint estimate_definition_defect_record_kind_s2747_ck check (
    (defect_class='R54_RESOURCE_SEMANTIC_OWNER_IDENTITY'
      and contract_version='P0_ONE_MONOLITH_R54_DEFECT_LEDGER_V1'
      and successor_definition_version_id is not null
      and release_id<>predecessor_release_id
      and predecessor_definition_version_id<>successor_definition_version_id)
    or (defect_class='TECHNOLOGY_APPLICABILITY_WITHDRAWN'
      and contract_version='CANONICAL_DEFINITION_WITHDRAWAL_V1'
      and successor_definition_version_id is null
      and before_sha256=after_sha256)
  );
create index estimate_definition_defect_withdrawal_s2747_idx
  on public.estimate_definition_defect_record(predecessor_definition_version_id)
  where defect_class='TECHNOLOGY_APPLICABILITY_WITHDRAWN';

create or replace function public.estimate_definition_withdrawal_reason_v1(p_definition_id uuid)
returns text language sql stable security definer set search_path=''
as $$
  select defect.root_cause_ru from public.estimate_definition_defect_record defect
  where defect.predecessor_definition_version_id=p_definition_id
    and defect.defect_class='TECHNOLOGY_APPLICABILITY_WITHDRAWN'
  order by defect.created_at,defect.id limit 1
$$;
revoke all on function public.estimate_definition_withdrawal_reason_v1(uuid) from public,anon,authenticated;
grant execute on function public.estimate_definition_withdrawal_reason_v1(uuid) to service_role;

create or replace function public.estimate_enforce_definition_withdrawal_v1()
returns trigger language plpgsql security definer set search_path=''
as $$
declare v_definition_id uuid; v_release_id uuid;
begin
  if tg_table_name='estimate_compile_job' then
    if new.operation in ('pdf','professional_pdf','procurement') then
      select r.definition_version_id into v_definition_id
      from public.estimate_revision r where r.id=new.parent_revision_id;
    else
      v_release_id:=new.target_release_id;
      select m.definition_version_id into v_definition_id
      from public.estimate_cumulative_manifest_entry m
      where m.release_id=v_release_id and m.catalog_id=new.catalog_id;
    end if;
  else
    v_definition_id:=new.definition_version_id;
  end if;
  if public.estimate_definition_withdrawal_reason_v1(v_definition_id) is not null then
    raise exception using errcode='55000',message='DEFINITION_CONTENT_WITHDRAWN';
  end if;
  return new;
end;
$$;
revoke all on function public.estimate_enforce_definition_withdrawal_v1() from public,anon,authenticated;
create trigger estimate_compile_job_definition_withdrawal_s2747_trg
before insert on public.estimate_compile_job
for each row execute function public.estimate_enforce_definition_withdrawal_v1();
create trigger estimate_revision_definition_withdrawal_s2747_trg
before insert on public.estimate_revision
for each row execute function public.estimate_enforce_definition_withdrawal_v1();
commit;
