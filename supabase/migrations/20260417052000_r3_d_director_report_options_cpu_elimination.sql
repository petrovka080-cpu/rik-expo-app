begin;

create table if not exists public.director_report_options_facts_v1 (
  issue_item_id text primary key,
  issue_id text not null,
  iss_date timestamptz not null,
  sort_ord bigint not null,
  object_name_canonical text not null,
  object_id_resolved text,
  source_updated_at timestamptz,
  projected_at timestamptz not null default timezone('utc', now()),
  projection_version text not null default 'r3_d_director_report_options_fact_v1'
);

create table if not exists public.director_report_options_facts_meta_v1 (
  id boolean primary key default true check (id),
  projection_version text not null default 'r3_d_director_report_options_fact_v1',
  rebuilt_at timestamptz,
  source_row_count bigint not null default 0,
  source_high_water_mark timestamptz,
  projected_row_count bigint not null default 0,
  last_rebuild_started_at timestamptz,
  last_rebuild_finished_at timestamptz,
  last_rebuild_duration_ms integer,
  last_rebuild_status text not null default 'never',
  last_rebuild_error text
);

create index if not exists director_report_options_facts_v1_date_idx
  on public.director_report_options_facts_v1 (iss_date);

create index if not exists director_report_options_facts_v1_object_idx
  on public.director_report_options_facts_v1 (object_name_canonical);

insert into public.director_report_options_facts_meta_v1 (id)
values (true)
on conflict (id) do nothing;

create or replace function public.director_report_options_facts_source_v1()
returns table (
  issue_item_id text,
  issue_id text,
  iss_date timestamptz,
  sort_ord bigint,
  object_name_canonical text,
  object_id_resolved text,
  source_updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
set statement_timeout = '30s'
as $$
with cfg as (
  select 'Без объекта'::text as without_object
),
issue_scope as (
  select
    row_number() over (
      order by
        wi.iss_date desc,
        wi.id desc,
        wii.id desc
    )::bigint as sort_ord,
    wii.id::text as issue_item_id,
    wi.id::text as issue_id,
    wi.iss_date::timestamptz as iss_date,
    nullif(trim(wi.request_id::text), '')::text as issue_request_id,
    nullif(trim(wi.target_object_id::text), '')::text as issue_object_id,
    wi.note::text as issue_note,
    nullif(trim(wi.object_name::text), '')::text as issue_object_name,
    nullif(trim(wii.request_item_id::text), '')::text as request_item_id,
    greatest(
      coalesce(wi.iss_date, '-infinity'::timestamptz),
      coalesce(wi.created_at, '-infinity'::timestamptz),
      coalesce(wii.created_at, '-infinity'::timestamptz),
      coalesce(ri_src.updated_at, '-infinity'::timestamptz)
    ) as source_updated_at
  from public.warehouse_issue_items wii
  join public.warehouse_issues wi
    on wi.id = wii.issue_id
  left join public.request_items ri_src
    on ri_src.id::text = wii.request_item_id::text
  where wi.status = 'Подтверждено'
    and trim(coalesce(wii.rik_code::text, '')) <> ''
),
request_item_links as (
  select distinct on (ri.id::text)
    ri.id::text as request_item_id,
    nullif(trim(ri.request_id::text), '')::text as request_id
  from public.request_items ri
  join (
    select distinct s.request_item_id
    from issue_scope s
    where s.request_item_id is not null
  ) src
    on src.request_item_id = ri.id::text
  order by ri.id::text
),
request_scope_ids as (
  select distinct
    coalesce(ril.request_id, s.issue_request_id) as request_id
  from issue_scope s
  left join request_item_links ril
    on ril.request_item_id = s.request_item_id
  where coalesce(ril.request_id, s.issue_request_id) is not null
),
requests_ref as (
  select
    req.id::text as id,
    nullif(trim(req.object_id::text), '')::text as object_id,
    nullif(trim(req.object_name::text), '')::text as object_name,
    nullif(trim(req.object_type_code::text), '')::text as object_type_code,
    req.updated_at as request_updated_at
  from public.requests req
  join request_scope_ids src
    on src.request_id = req.id::text
),
object_scope_ids as (
  select distinct object_id
  from (
    select r.object_id
    from requests_ref r
    where r.object_id is not null
    union all
    select s.issue_object_id
    from issue_scope s
    where s.issue_object_id is not null
  ) ids
),
objects_ref as (
  select
    o.id::text as id,
    nullif(trim(o.name::text), '')::text as name
  from public.objects o
  join object_scope_ids src
    on src.object_id = o.id::text
),
object_types_ref as (
  select distinct on (upper(trim(coalesce(code::text, ''))))
    upper(trim(coalesce(code::text, '')))::text as code,
    coalesce(
      nullif(trim(name_human_ru::text), ''),
      nullif(trim(display_name::text), ''),
      nullif(trim(name::text), '')
    )::text as object_type_name
  from public.ref_object_types
  where trim(coalesce(code::text, '')) <> ''
  order by
    upper(trim(coalesce(code::text, ''))),
    nullif(trim(name_human_ru::text), '') desc nulls last,
    nullif(trim(display_name::text), '') desc nulls last,
    nullif(trim(name::text), '') desc nulls last
),
parsed as (
  select
    s.*,
    trim(
      regexp_replace(
        coalesce(
          substring(coalesce(s.issue_note, '') from '(?i)Объект:\s*([^\n\r]+)'),
          ''
        ),
        '\s*(?:·|•|\|)\s*(?:Контекст|Система|Зона|Вид|Этаж|Оси)\s*:.*$',
        '',
        'i'
      )
    )::text as free_object_name_raw
  from issue_scope s
),
resolved as (
  select
    p.issue_item_id,
    p.issue_id,
    p.iss_date,
    p.sort_ord,
    coalesce(r.object_id, p.issue_object_id)::text as object_id_resolved,
    coalesce(
      nullif(
        trim(
          regexp_replace(
            coalesce(o_req.name, ''),
            '\s*(?:·|•|\|)\s*(?:Контекст|Система|Зона|Вид|Этаж|Оси)\s*:.*$',
            '',
            'i'
          )
        ),
        ''
      ),
      nullif(
        trim(
          regexp_replace(
            coalesce(r.object_name, ''),
            '\s*(?:·|•|\|)\s*(?:Контекст|Система|Зона|Вид|Этаж|Оси)\s*:.*$',
            '',
            'i'
          )
        ),
        ''
      ),
      nullif(
        trim(
          regexp_replace(
            coalesce(rot.object_type_name, ''),
            '\s*(?:·|•|\|)\s*(?:Контекст|Система|Зона|Вид|Этаж|Оси)\s*:.*$',
            '',
            'i'
          )
        ),
        ''
      ),
      nullif(
        trim(
          regexp_replace(
            coalesce(o_issue.name, ''),
            '\s*(?:·|•|\|)\s*(?:Контекст|Система|Зона|Вид|Этаж|Оси)\s*:.*$',
            '',
            'i'
          )
        ),
        ''
      ),
      nullif(
        trim(
          regexp_replace(
            coalesce(p.issue_object_name, ''),
            '\s*(?:·|•|\|)\s*(?:Контекст|Система|Зона|Вид|Этаж|Оси)\s*:.*$',
            '',
            'i'
          )
        ),
        ''
      ),
      nullif(
        trim(
          regexp_replace(
            coalesce(p.free_object_name_raw, ''),
            '\s*(?:·|•|\|)\s*(?:Контекст|Система|Зона|Вид|Этаж|Оси)\s*:.*$',
            '',
            'i'
          )
        ),
        ''
      ),
      cfg.without_object
    )::text as object_name_canonical,
    greatest(
      coalesce(p.source_updated_at, '-infinity'::timestamptz),
      coalesce(r.request_updated_at, '-infinity'::timestamptz)
    ) as source_updated_at
  from parsed p
  left join request_item_links ril
    on ril.request_item_id = p.request_item_id
  left join requests_ref r
    on r.id = coalesce(ril.request_id, p.issue_request_id)
  left join objects_ref o_req
    on o_req.id = r.object_id
  left join objects_ref o_issue
    on o_issue.id = p.issue_object_id
  left join object_types_ref rot
    on rot.code = upper(trim(coalesce(r.object_type_code, '')))
  cross join cfg
)
select
  r.issue_item_id,
  r.issue_id,
  r.iss_date,
  r.sort_ord,
  r.object_name_canonical,
  r.object_id_resolved,
  r.source_updated_at
from resolved r;
$$;

create or replace function public.director_report_fetch_options_build_source_v1(
  p_from date default null,
  p_to date default null
)
returns jsonb
language sql
stable
security definer
set search_path = public
set statement_timeout = '30s'
as $$
with filtered as (
  select
    f.sort_ord,
    f.object_name_canonical,
    f.object_id_resolved
  from public.director_report_options_facts_source_v1() f
  where (p_from is null or f.iss_date::date >= p_from)
    and (p_to is null or f.iss_date::date <= p_to)
),
grouped as (
  select
    f.object_name_canonical,
    (
      array_agg(f.object_id_resolved order by f.sort_ord)
      filter (where f.object_id_resolved is not null)
    )[1]::text as object_id_resolved
  from filtered f
  group by f.object_name_canonical
)
select jsonb_build_object(
  'objects',
    coalesce(
      (
        select jsonb_agg(g.object_name_canonical order by g.object_name_canonical)
        from grouped g
      ),
      '[]'::jsonb
    ),
  'objectIdByName',
    coalesce(
      (
        select jsonb_object_agg(g.object_name_canonical, to_jsonb(g.object_id_resolved))
        from grouped g
      ),
      '{}'::jsonb
    )
);
$$;

create or replace function public.director_report_options_facts_rebuild_v1()
returns jsonb
language plpgsql
security definer
set search_path = public
set statement_timeout = '30s'
as $$
declare
  v_started_at timestamptz := timezone('utc', now());
  v_finished_at timestamptz;
  v_duration_ms integer;
  v_projected_count bigint := 0;
  v_high_water timestamptz;
begin
  insert into public.director_report_options_facts_meta_v1 (
    id,
    projection_version,
    rebuilt_at,
    source_row_count,
    projected_row_count,
    last_rebuild_started_at,
    last_rebuild_status,
    last_rebuild_error
  )
  values (
    true,
    'r3_d_director_report_options_fact_v1',
    v_started_at,
    0,
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
    delete from public.director_report_options_facts_v1
    where true;

    insert into public.director_report_options_facts_v1 (
      issue_item_id,
      issue_id,
      iss_date,
      sort_ord,
      object_name_canonical,
      object_id_resolved,
      source_updated_at,
      projected_at,
      projection_version
    )
    select
      src.issue_item_id,
      src.issue_id,
      src.iss_date,
      src.sort_ord,
      src.object_name_canonical,
      src.object_id_resolved,
      src.source_updated_at,
      v_started_at,
      'r3_d_director_report_options_fact_v1'
    from public.director_report_options_facts_source_v1() src;

    get diagnostics v_projected_count = row_count;

    select max(source_updated_at)
    into v_high_water
    from public.director_report_options_facts_v1;

    v_finished_at := timezone('utc', now());
    v_duration_ms := greatest(0, floor(extract(epoch from (v_finished_at - v_started_at)) * 1000))::integer;

    insert into public.director_report_options_facts_meta_v1 (
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
      'r3_d_director_report_options_fact_v1',
      v_finished_at,
      v_projected_count,
      v_high_water,
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
      'projection_version', 'r3_d_director_report_options_fact_v1',
      'status', 'success',
      'rebuild_started_at', v_started_at,
      'rebuild_finished_at', v_finished_at,
      'rebuild_duration_ms', v_duration_ms,
      'projected_row_count', v_projected_count,
      'source_row_count', v_projected_count,
      'source_high_water_mark', v_high_water,
      'build_source', 'director_report_options_facts_source_v1'
    );
  exception when others then
    v_finished_at := timezone('utc', now());
    v_duration_ms := greatest(0, floor(extract(epoch from (v_finished_at - v_started_at)) * 1000))::integer;

    update public.director_report_options_facts_meta_v1
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

create or replace function public.director_report_options_facts_status_v1()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'projection_version', m.projection_version,
    'rebuilt_at', m.rebuilt_at,
    'source_row_count', m.source_row_count,
    'source_high_water_mark', m.source_high_water_mark,
    'projected_row_count', m.projected_row_count,
    'last_rebuild_started_at', m.last_rebuild_started_at,
    'last_rebuild_finished_at', m.last_rebuild_finished_at,
    'last_rebuild_duration_ms', m.last_rebuild_duration_ms,
    'last_rebuild_status', m.last_rebuild_status,
    'last_rebuild_error', m.last_rebuild_error,
    'current_options_fact_row_count', (select count(*)::bigint from public.director_report_options_facts_v1),
    'checked_at', timezone('utc', now())
  )
  from public.director_report_options_facts_meta_v1 m
  where m.id;
$$;

select public.director_report_options_facts_rebuild_v1();

create temp table r3_d_options_before on commit drop as
select public.director_report_fetch_options_v1(null::date, null::date) as payload;

create temp table r3_d_options_build_before on commit drop as
select public.director_report_fetch_options_build_source_v1(null::date, null::date) as payload;

do $$
declare
  v_before jsonb;
  v_build jsonb;
begin
  select payload into v_before from r3_d_options_before;
  select payload into v_build from r3_d_options_build_before;

  if v_before is distinct from v_build then
    raise exception 'R3.D director report options build source parity failed before public replacement';
  end if;
end;
$$;

create or replace function public.director_report_fetch_options_v1(
  p_from date default null,
  p_to date default null
)
returns jsonb
language sql
stable
security definer
set search_path = public
set statement_timeout = '30s'
as $$
with filtered as (
  select
    f.sort_ord,
    f.object_name_canonical,
    f.object_id_resolved
  from public.director_report_options_facts_v1 f
  where (p_from is null or f.iss_date::date >= p_from)
    and (p_to is null or f.iss_date::date <= p_to)
),
grouped as (
  select
    f.object_name_canonical,
    (
      array_agg(f.object_id_resolved order by f.sort_ord)
      filter (where f.object_id_resolved is not null)
    )[1]::text as object_id_resolved
  from filtered f
  group by f.object_name_canonical
)
select jsonb_build_object(
  'objects',
    coalesce(
      (
        select jsonb_agg(g.object_name_canonical order by g.object_name_canonical)
        from grouped g
      ),
      '[]'::jsonb
    ),
  'objectIdByName',
    coalesce(
      (
        select jsonb_object_agg(g.object_name_canonical, to_jsonb(g.object_id_resolved))
        from grouped g
      ),
      '{}'::jsonb
    )
);
$$;

create or replace function public.director_report_options_r3d_cpu_proof_v1()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with options_proc as (
  select p.prosrc
  from pg_proc p
  join pg_namespace n
    on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'director_report_fetch_options_v1'
    and pg_get_function_identity_arguments(p.oid) = 'p_from date, p_to date'
  limit 1
),
build_proc as (
  select p.oid
  from pg_proc p
  join pg_namespace n
    on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'director_report_fetch_options_build_source_v1'
    and pg_get_function_identity_arguments(p.oid) = 'p_from date, p_to date'
  limit 1
),
options_source as (
  select lower(coalesce((select prosrc from options_proc), '')) as value
)
select jsonb_build_object(
  'options_has_substring', position('substring(' in (select value from options_source)) > 0,
  'options_has_regexp_replace', position('regexp_replace(' in (select value from options_source)) > 0,
  'options_has_regexp_match', position('regexp_match(' in (select value from options_source)) > 0,
  'options_reads_projection', position('director_report_options_facts_v1' in (select value from options_source)) > 0,
  'build_source_exists', exists(select 1 from build_proc),
  'checked_at', timezone('utc', now())
);
$$;

create or replace function public.director_report_options_r3d_parity_v1(
  p_from date default null,
  p_to date default null
)
returns jsonb
language sql
stable
security definer
set search_path = public
set statement_timeout = '30s'
as $$
with payloads as (
  select
    public.director_report_fetch_options_build_source_v1(p_from, p_to) as old_payload,
    public.director_report_fetch_options_v1(p_from, p_to) as new_payload
),
comparisons as (
  select
    coalesce(jsonb_array_length(old_payload -> 'objects'), 0)::integer as old_object_count,
    coalesce(jsonb_array_length(new_payload -> 'objects'), 0)::integer as new_object_count,
    (old_payload -> 'objects') = (new_payload -> 'objects') as objects_equal,
    (old_payload -> 'objectIdByName') = (new_payload -> 'objectIdByName') as object_id_map_equal
  from payloads
)
select jsonb_build_object(
  'projection_version', 'r3_d_director_report_options_fact_v1',
  'old_object_count', old_object_count,
  'new_object_count', new_object_count,
  'objects_equal', objects_equal,
  'object_id_map_equal', object_id_map_equal,
  'diff_count', case when objects_equal and object_id_map_equal then 0 else 1 end,
  'is_drift_free', objects_equal and object_id_map_equal,
  'checked_at', timezone('utc', now()),
  'filters', jsonb_build_object(
    'from', p_from,
    'to', p_to
  )
)
from comparisons;
$$;

create temp table r3_d_options_after on commit drop as
select public.director_report_fetch_options_v1(null::date, null::date) as payload;

do $$
declare
  v_before jsonb;
  v_after jsonb;
  v_cpu_proof jsonb;
  v_parity jsonb;
begin
  select payload into v_before from r3_d_options_before;
  select payload into v_after from r3_d_options_after;

  if v_before is distinct from v_after then
    raise exception 'R3.D director report options public parity failed after replacement';
  end if;

  select public.director_report_options_r3d_cpu_proof_v1()
  into v_cpu_proof;

  if coalesce((v_cpu_proof ->> 'options_has_substring')::boolean, true)
    or coalesce((v_cpu_proof ->> 'options_has_regexp_replace')::boolean, true)
    or coalesce((v_cpu_proof ->> 'options_has_regexp_match')::boolean, true)
    or not coalesce((v_cpu_proof ->> 'options_reads_projection')::boolean, false)
    or not coalesce((v_cpu_proof ->> 'build_source_exists')::boolean, false)
  then
    raise exception 'R3.D director report options CPU proof failed: %', v_cpu_proof;
  end if;

  select public.director_report_options_r3d_parity_v1(null::date, null::date)
  into v_parity;

  if coalesce((v_parity ->> 'diff_count')::integer, 1) <> 0 then
    raise exception 'R3.D director report options parity failed: %', v_parity;
  end if;
end;
$$;

comment on table public.director_report_options_facts_v1 is
'R3.D prepared Director report options projection. Holds canonical object options identity fields outside public options runtime parsing.';

comment on table public.director_report_options_facts_meta_v1 is
'R3.D metadata for Director report options projection rebuild status and freshness.';

comment on function public.director_report_options_facts_source_v1() is
'R3.D rebuild source for Director report options facts. Preserves legacy object parsing for rebuild/proof only.';

comment on function public.director_report_fetch_options_build_source_v1(date, date) is
'R3.D proof-only Director report options calculator using preserved parsing semantics.';

comment on function public.director_report_options_facts_rebuild_v1() is
'R3.D rebuilds prepared Director report options facts and records rebuild metadata.';

comment on function public.director_report_options_facts_status_v1() is
'R3.D returns Director report options projection rebuild/freshness metadata.';

comment on function public.director_report_fetch_options_v1(date, date) is
'R3.D Director report options payload for selected period. Reads prepared options facts and avoids runtime regex/text parsing in the public options path.';

comment on function public.director_report_options_r3d_cpu_proof_v1() is
'R3.D verifier: proves public director_report_fetch_options_v1 no longer contains substring, regexp_replace, or regexp_match CPU transforms.';

comment on function public.director_report_options_r3d_parity_v1(date, date) is
'R3.D verifier: compares public Director report options output with the preserved build source.';

grant select on public.director_report_options_facts_v1 to authenticated;
grant execute on function public.director_report_fetch_options_v1(date, date) to authenticated;
grant execute on function public.director_report_options_facts_rebuild_v1() to authenticated;
grant execute on function public.director_report_options_facts_status_v1() to authenticated;
grant execute on function public.director_report_options_r3d_cpu_proof_v1() to authenticated;
grant execute on function public.director_report_options_r3d_parity_v1(date, date) to authenticated;

notify pgrst, 'reload schema';

commit;
