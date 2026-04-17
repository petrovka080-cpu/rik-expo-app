begin;

create or replace function public.buyer_summary_inbox_search_rebuild_v1()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_started_at timestamptz := clock_timestamp();
  v_finished_at timestamptz;
  v_source_count integer := 0;
  v_projected_count integer := 0;
  v_duration_ms integer := 0;
begin
  update public.buyer_summary_inbox_search_meta_v1
     set last_rebuild_status = 'running',
         last_rebuild_started_at = v_started_at,
         last_rebuild_finished_at = null,
         last_rebuild_duration_ms = null,
         last_rebuild_error = null,
         updated_at = now()
   where singleton;

  select count(*)::integer
    into v_source_count
  from public.buyer_summary_inbox_search_source_v1(null);

  delete from public.buyer_summary_inbox_search_v1
  where true;

  insert into public.buyer_summary_inbox_search_v1 (
    request_item_id,
    request_id,
    search_document,
    search_hash,
    projection_version,
    rebuilt_at
  )
  select
    src.request_item_id,
    src.request_id,
    src.search_document,
    src.search_hash,
    src.projection_version,
    v_started_at
  from public.buyer_summary_inbox_search_source_v1(null) src
  on conflict (request_item_id) do update
  set
    request_id = excluded.request_id,
    search_document = excluded.search_document,
    search_hash = excluded.search_hash,
    projection_version = excluded.projection_version,
    rebuilt_at = excluded.rebuilt_at;

  get diagnostics v_projected_count = row_count;

  v_finished_at := clock_timestamp();
  v_duration_ms := greatest(0, floor(extract(epoch from (v_finished_at - v_started_at)) * 1000)::integer);

  update public.buyer_summary_inbox_search_meta_v1
     set projection_version = 'r3_e_buyer_inbox_search_v1',
         last_rebuild_status = 'success',
         last_rebuild_started_at = v_started_at,
         last_rebuild_finished_at = v_finished_at,
         last_rebuild_duration_ms = v_duration_ms,
         source_row_count = v_source_count,
         projected_row_count = v_projected_count,
         last_rebuild_error = null,
         updated_at = now()
   where singleton;

  return jsonb_build_object(
    'status', 'success',
    'projection_version', 'r3_e_buyer_inbox_search_v1',
    'source_row_count', v_source_count,
    'projected_row_count', v_projected_count,
    'rebuild_started_at', v_started_at,
    'rebuild_finished_at', v_finished_at,
    'rebuild_duration_ms', v_duration_ms,
    'safe_delete', true
  );
exception
  when others then
    v_finished_at := clock_timestamp();
    v_duration_ms := greatest(0, floor(extract(epoch from (v_finished_at - v_started_at)) * 1000)::integer);

    update public.buyer_summary_inbox_search_meta_v1
       set last_rebuild_status = 'failed',
           last_rebuild_started_at = v_started_at,
           last_rebuild_finished_at = v_finished_at,
           last_rebuild_duration_ms = v_duration_ms,
           last_rebuild_error = sqlerrm,
           updated_at = now()
     where singleton;

    raise;
end;
$$;

comment on function public.buyer_summary_inbox_search_rebuild_v1() is
'R3.E rebuilds buyer_summary_inbox_search_v1 and records rebuild metadata. Uses explicit WHERE true delete for safe-update protected runtimes.';

grant execute on function public.buyer_summary_inbox_search_rebuild_v1() to authenticated;

notify pgrst, 'reload schema';

commit;
