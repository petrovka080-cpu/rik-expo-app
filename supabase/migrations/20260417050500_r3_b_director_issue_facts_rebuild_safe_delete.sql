begin;

create or replace function public.director_report_issue_facts_rebuild_v1()
returns jsonb
language plpgsql
security definer
set search_path = public
set statement_timeout = '30s'
as $$
declare
  v_stats jsonb;
  v_projected_count bigint;
  v_started_at timestamptz := timezone('utc', now());
  v_finished_at timestamptz;
  v_duration_ms integer;
begin
  insert into public.director_report_issue_facts_meta_v1 (
    id,
    projection_version,
    rebuilt_at,
    source_row_count,
    source_high_water_mark,
    projected_row_count,
    last_rebuild_started_at,
    last_rebuild_status,
    last_rebuild_error
  )
  values (
    true,
    'r2_2_issue_fact_v1',
    v_started_at,
    0,
    null,
    0,
    v_started_at,
    'started',
    null
  )
  on conflict (id) do update set
    last_rebuild_started_at = excluded.last_rebuild_started_at,
    last_rebuild_status = 'started',
    last_rebuild_error = null;

  begin
    delete from public.director_report_issue_facts_v1
    where true;

    insert into public.director_report_issue_facts_v1 (
      issue_item_id,
      issue_id,
      iss_date,
      request_item_id,
      request_id_resolved,
      object_name_resolved,
      work_type_name,
      level_name_resolved,
      system_name_resolved,
      zone_name_resolved,
      location_label,
      rik_code,
      uom,
      qty,
      is_without_request,
      material_name_resolved,
      source_updated_at,
      projected_at,
      projection_version
    )
    select
      f.issue_item_id,
      f.issue_id,
      f.iss_date,
      f.request_item_id,
      f.request_id_resolved,
      f.object_name_resolved,
      f.work_type_name,
      f.level_name_resolved,
      f.system_name_resolved,
      f.zone_name_resolved,
      f.location_label,
      f.rik_code,
      f.uom,
      f.qty,
      f.is_without_request,
      f.material_name_resolved,
      f.source_updated_at,
      v_started_at,
      'r2_2_issue_fact_v1'
    from public.director_report_issue_facts_build_source_v1() f;

    get diagnostics v_projected_count = row_count;
    v_stats := public.director_report_issue_facts_source_stats_v1();
    v_finished_at := timezone('utc', now());
    v_duration_ms := greatest(0, floor(extract(epoch from (v_finished_at - v_started_at)) * 1000))::integer;

    insert into public.director_report_issue_facts_meta_v1 (
      id,
      projection_version,
      rebuilt_at,
      source_row_count,
      source_high_water_mark,
      projected_row_count,
      last_rebuild_started_at,
      last_rebuild_finished_at,
      last_rebuild_duration_ms,
      last_rebuild_status,
      last_rebuild_error
    )
    values (
      true,
      'r2_2_issue_fact_v1',
      v_finished_at,
      coalesce((v_stats ->> 'source_row_count')::bigint, 0),
      nullif(v_stats ->> 'source_high_water_mark', '')::timestamptz,
      v_projected_count,
      v_started_at,
      v_finished_at,
      v_duration_ms,
      'success',
      null
    )
    on conflict (id) do update set
      projection_version = excluded.projection_version,
      rebuilt_at = excluded.rebuilt_at,
      source_row_count = excluded.source_row_count,
      source_high_water_mark = excluded.source_high_water_mark,
      projected_row_count = excluded.projected_row_count,
      last_rebuild_started_at = excluded.last_rebuild_started_at,
      last_rebuild_finished_at = excluded.last_rebuild_finished_at,
      last_rebuild_duration_ms = excluded.last_rebuild_duration_ms,
      last_rebuild_status = excluded.last_rebuild_status,
      last_rebuild_error = null;

    return jsonb_build_object(
      'projection_version', 'r2_2_issue_fact_v1',
      'status', 'success',
      'rebuild_started_at', v_started_at,
      'rebuild_finished_at', v_finished_at,
      'rebuild_duration_ms', v_duration_ms,
      'projected_row_count', v_projected_count,
      'source_row_count', coalesce((v_stats ->> 'source_row_count')::bigint, 0),
      'source_high_water_mark', v_stats ->> 'source_high_water_mark',
      'build_source', 'director_report_issue_facts_build_source_v1',
      'delete_guard', 'where true'
    );
  exception when others then
    v_finished_at := timezone('utc', now());
    v_duration_ms := greatest(0, floor(extract(epoch from (v_finished_at - v_started_at)) * 1000))::integer;

    update public.director_report_issue_facts_meta_v1
    set
      last_rebuild_finished_at = v_finished_at,
      last_rebuild_duration_ms = v_duration_ms,
      last_rebuild_status = 'failed',
      last_rebuild_error = sqlerrm
    where id;

    raise;
  end;
end;
$$;

select public.director_report_issue_facts_rebuild_v1();

comment on function public.director_report_issue_facts_rebuild_v1() is
'R3.B rebuilds Director issue facts from the preserved build source and uses an explicit delete predicate for guarded remote execution.';

grant execute on function public.director_report_issue_facts_rebuild_v1() to authenticated;

notify pgrst, 'reload schema';

commit;
