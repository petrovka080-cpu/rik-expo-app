-- R6: custom rows are server-owned revision rows and require a stable semantic owner.
-- The prior trigger referenced NEW.id although estimate_revision_row is keyed by
-- (revision_id, row_id); that made every custom-row child revision fail with 42703.

begin;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'estimate_revision_row'
      and column_name = 'row_id'
  ) or exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'estimate_revision_row'
      and column_name = 'id'
  ) then
    raise exception using
      errcode = '55000',
      message = 'unexpected estimate_revision_row identity contract';
  end if;
end;
$$;

create or replace function public.estimate_revision_row_semantic_owner_r3()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_resource public.estimate_resource_spec%rowtype;
  v_cumulative_release boolean := false;
begin
  select exists(
    select 1
    from public.estimate_revision revision
    join public.estimate_cumulative_manifest_entry manifest
      on manifest.release_id = revision.release_id
    where revision.id = new.revision_id
  ) into v_cumulative_release;

  if new.resource_spec_id is not null then
    select * into strict v_resource
    from public.estimate_resource_spec
    where id = new.resource_spec_id;

    new.semantic_owner := public.estimate_effective_semantic_owner_r54(
      v_resource.row_id,
      v_resource.semantic_owner
    );
    if v_cumulative_release and new.semantic_owner is null then
      raise exception using
        errcode = '23502',
        message = 'revision resource semantic owner is missing';
    elsif not v_cumulative_release
      and v_resource.source_metadata->>'truth_contract_version' = 'R3'
      and new.semantic_owner is null then
      raise exception using
        errcode = '23514',
        message = 'R3 resource semantic_owner is required';
    end if;
    new.physical_row_type := v_resource.row_type;
  elsif jsonb_typeof(new.calculation_trace) = 'object' then
    new.semantic_owner := public.estimate_effective_semantic_owner_r54(
      coalesce(new.calculation_trace->>'rowId', new.row_id),
      new.calculation_trace->>'semanticOwner'
    );
    if v_cumulative_release and new.semantic_owner is null then
      raise exception using
        errcode = '23502',
        message = 'revision trace semantic owner is missing';
    end if;
    new.physical_row_type := nullif(
      trim(new.calculation_trace->>'physicalRowType'),
      ''
    );
  end if;
  return new;
end;
$$;

commit;
