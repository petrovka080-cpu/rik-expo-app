begin;

create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;

create or replace function public.buyer_summary_inbox_search_document_v1(
  p_request_id text,
  p_request_id_old text,
  p_name_human text,
  p_object_name text,
  p_rik_code text,
  p_app_code text,
  p_note text
)
returns text
language sql
immutable
parallel safe
as $$
  select
    chr(31)
    || lower(coalesce(p_request_id, '')) || chr(31)
    || coalesce(p_request_id_old, '') || chr(31)
    || lower(coalesce(p_name_human, '')) || chr(31)
    || lower(coalesce(p_object_name, '')) || chr(31)
    || lower(coalesce(p_rik_code, '')) || chr(31)
    || lower(coalesce(p_app_code, '')) || chr(31)
    || lower(coalesce(p_note, '')) || chr(31);
$$;

create or replace function public.buyer_summary_inbox_search_match_v1(
  p_search_document text,
  p_search_text text
)
returns boolean
language sql
immutable
parallel safe
as $$
  select
    p_search_text is null
    or coalesce(p_search_document, '') like ('%' || p_search_text || '%');
$$;

create table if not exists public.buyer_summary_inbox_search_v1 (
  request_item_id text primary key,
  request_id text not null,
  search_document text not null,
  search_hash text not null,
  projection_version text not null default 'r3_e_buyer_inbox_search_v1',
  rebuilt_at timestamptz not null default now()
);

create table if not exists public.buyer_summary_inbox_search_meta_v1 (
  singleton boolean primary key default true check (singleton),
  projection_version text not null,
  last_rebuild_status text not null,
  last_rebuild_started_at timestamptz,
  last_rebuild_finished_at timestamptz,
  last_rebuild_duration_ms integer,
  source_row_count integer not null default 0,
  projected_row_count integer not null default 0,
  last_rebuild_error text,
  updated_at timestamptz not null default now()
);

insert into public.buyer_summary_inbox_search_meta_v1 (
  singleton,
  projection_version,
  last_rebuild_status
)
values (
  true,
  'r3_e_buyer_inbox_search_v1',
  'not_started'
)
on conflict (singleton) do update
set
  projection_version = excluded.projection_version,
  updated_at = now();

create index if not exists buyer_summary_inbox_search_v1_request_id_idx
  on public.buyer_summary_inbox_search_v1 (request_id);

do $$
declare
  v_opclass_schema text;
begin
  select n.nspname
    into v_opclass_schema
  from pg_opclass oc
  join pg_namespace n
    on n.oid = oc.opcnamespace
  join pg_am am
    on am.oid = oc.opcmethod
  where oc.opcname = 'gin_trgm_ops'
    and am.amname = 'gin'
  order by case when n.nspname = 'extensions' then 0 else 1 end, n.nspname
  limit 1;

  if v_opclass_schema is not null then
    execute format(
      'create index if not exists buyer_summary_inbox_search_v1_document_trgm_idx on public.buyer_summary_inbox_search_v1 using gin (search_document %I.gin_trgm_ops)',
      v_opclass_schema
    );
  end if;
end $$;

create or replace function public.buyer_summary_inbox_search_source_v1(
  p_company_id uuid default null
)
returns table (
  request_item_id text,
  request_id text,
  search_document text,
  search_hash text,
  projection_version text
)
language sql
stable
security definer
set search_path = public
as $$
with base_rows as (
  select
    trim(coalesce(b.request_id::text, '')) as request_id,
    trim(coalesce(b.request_id_old::text, '')) as request_id_old_text,
    trim(coalesce(b.request_item_id::text, '')) as request_item_id,
    coalesce(nullif(trim(coalesce(b.name_human, '')), ''), U&'\2014') as name_human,
    nullif(trim(coalesce(b.object_name, '')), '') as object_name,
    nullif(trim(coalesce(b.rik_code, '')), '') as rik_code,
    nullif(trim(coalesce(b.app_code, '')), '') as app_code,
    nullif(trim(coalesce(b.note, '')), '') as note
  from public.list_buyer_inbox(p_company_id) b
  where nullif(trim(coalesce(b.request_id::text, '')), '') is not null
    and nullif(trim(coalesce(b.request_item_id::text, '')), '') is not null
),
documents as (
  select
    br.request_item_id,
    br.request_id,
    public.buyer_summary_inbox_search_document_v1(
      br.request_id,
      br.request_id_old_text,
      br.name_human,
      br.object_name,
      br.rik_code,
      br.app_code,
      br.note
    ) as search_document
  from base_rows br
)
select
  d.request_item_id,
  d.request_id,
  d.search_document,
  md5(d.search_document) as search_hash,
  'r3_e_buyer_inbox_search_v1'::text as projection_version
from documents d;
$$;

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

  delete from public.buyer_summary_inbox_search_v1;

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
    'rebuild_duration_ms', v_duration_ms
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

create or replace function public.buyer_summary_inbox_search_status_v1()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'checked_at', now(),
    'projection_version', m.projection_version,
    'last_rebuild_status', m.last_rebuild_status,
    'last_rebuild_started_at', m.last_rebuild_started_at,
    'last_rebuild_finished_at', m.last_rebuild_finished_at,
    'last_rebuild_duration_ms', m.last_rebuild_duration_ms,
    'source_row_count', m.source_row_count,
    'projected_row_count', m.projected_row_count,
    'current_search_row_count', (select count(*)::integer from public.buyer_summary_inbox_search_v1),
    'last_rebuild_error', m.last_rebuild_error
  )
  from public.buyer_summary_inbox_search_meta_v1 m
  where m.singleton;
$$;

select public.buyer_summary_inbox_search_rebuild_v1();

do $$
declare
  v_def text;
begin
  select pg_get_functiondef('public.buyer_summary_inbox_scope_v1(integer, integer, text, uuid)'::regprocedure)
    into v_def;
  v_def := replace(
    v_def,
    'FUNCTION public.buyer_summary_inbox_scope_v1(',
    'FUNCTION public.buyer_summary_inbox_scope_build_source_v1('
  );
  execute v_def;
end $$;

create temp table r3_e_search_samples(search_text text) on commit drop;

insert into r3_e_search_samples(search_text)
values
  (null),
  ('__r3e_no_match__');

insert into r3_e_search_samples(search_text)
select left(lower(trim(coalesce(src.name_human, ''))), 3)
from public.list_buyer_inbox(null) src
where length(trim(coalesce(src.name_human, ''))) >= 3
limit 1;

create temp table r3_e_before as
select
  s.search_text,
  public.buyer_summary_inbox_scope_v1(0, 12, s.search_text, null) as payload
from r3_e_search_samples s;

create or replace function public.buyer_summary_inbox_scope_v1(
  p_offset integer default 0,
  p_limit integer default 12,
  p_search text default null,
  p_company_id uuid default null
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with search_input as (
  select
    greatest(0, coalesce(p_offset, 0))::integer as offset_groups,
    greatest(1, coalesce(p_limit, 12))::integer as limit_groups,
    nullif(lower(trim(coalesce(p_search, ''))), '') as search_text
),
status_tokens as (
  select
    U&'\043D\0430 \0443\0442\0432\0435\0440\0436\0434\0435\043D\0438\0438'::text as pending_token,
    'pending'::text as pending_en,
    'approved'::text as approved_en,
    U&'\0443\0442\0432\0435\0440\0436\0434\0435\043D\043E'::text as approved_neutral,
    U&'\0443\0442\0432\0435\0440\0436\0434\0435\043D\0430'::text as approved_feminine,
    U&'\0443\0442\0432\0435\0440\0436\0434\0451\043D\043E'::text as approved_neutral_io,
    U&'\0443\0442\0432\0435\0440\0436\0434\0451\043D\0430'::text as approved_feminine_io,
    U&'\0437\0430\043A\0443\043F'::text as procurement_token,
    U&'\043E\0442\043A\043B\043E\043D'::text as rejected_token,
    'reject'::text as rejected_en,
    U&'\0434\043E\0440\0430\0431\043E\0442'::text as rework_token,
    'rework'::text as rework_en
),
base_seed as (
  select
    trim(coalesce(b.request_id::text, '')) as request_id,
    b.request_id_old,
    trim(coalesce(b.request_item_id::text, '')) as request_item_id,
    nullif(trim(coalesce(b.rik_code, '')), '') as rik_code,
    coalesce(nullif(trim(coalesce(b.name_human, '')), ''), U&'\2014') as name_human,
    coalesce(b.qty, 0)::numeric as qty,
    nullif(trim(coalesce(b.uom, '')), '') as uom,
    nullif(trim(coalesce(b.app_code, '')), '') as app_code,
    nullif(trim(coalesce(b.note, '')), '') as note,
    nullif(trim(coalesce(b.object_name, '')), '') as object_name,
    trim(coalesce(b.status, '')) as status,
    b.created_at,
    nullif(trim(coalesce(b.director_reject_note, '')), '') as director_reject_note,
    b.director_reject_at
  from public.list_buyer_inbox(p_company_id) b
  where nullif(trim(coalesce(b.request_id::text, '')), '') is not null
    and nullif(trim(coalesce(b.request_item_id::text, '')), '') is not null
),
base_rows as (
  select
    bs.*,
    case
      when si.search_text is null then null::text
      else public.buyer_summary_inbox_search_document_v1(
        bs.request_id,
        bs.request_id_old::text,
        bs.name_human,
        bs.object_name,
        bs.rik_code,
        bs.app_code,
        bs.note
      )
    end as search_document_runtime,
    case
      when si.search_text is null then null::text
      else md5(public.buyer_summary_inbox_search_document_v1(
        bs.request_id,
        bs.request_id_old::text,
        bs.name_human,
        bs.object_name,
        bs.rik_code,
        bs.app_code,
        bs.note
      ))
    end as search_hash_runtime
  from base_seed bs
  cross join search_input si
),
request_status_rows as (
  select
    r.id::text as request_id,
    trim(coalesce(r.status::text, '')) as request_status
  from public.requests r
  where r.id in (
    select distinct br.request_id::uuid
    from base_rows br
    where nullif(trim(coalesce(br.request_id, '')), '') is not null
  )
),
rejected_candidates as (
  select distinct br.request_item_id
  from base_rows br
  cross join status_tokens st
  where br.director_reject_at is not null
    or br.director_reject_note is not null
    or position(st.rejected_token in lower(coalesce(br.status, ''))) > 0
    or position(st.rejected_en in lower(coalesce(br.status, ''))) > 0
),
proposal_links as (
  select
    piv.request_item_id::text as request_item_id,
    piv.proposal_id::text as proposal_id
  from public.proposal_items_view piv
  where piv.request_item_id::text in (select rc.request_item_id from rejected_candidates rc)
    and nullif(trim(coalesce(piv.proposal_id::text, '')), '') is not null
),
proposal_lifecycle_ranked as (
  select
    pl.request_item_id,
    trim(coalesce(vps.status, '')) as latest_proposal_status,
    row_number() over (
      partition by pl.request_item_id
      order by coalesce(vps.sent_to_accountant_at, vps.submitted_at) desc nulls last, pl.proposal_id desc
    ) as rn
  from proposal_links pl
  join public.v_proposals_summary vps
    on vps.proposal_id::text = pl.proposal_id
),
latest_proposal_lifecycle as (
  select
    plr.request_item_id,
    plr.latest_proposal_status
  from proposal_lifecycle_ranked plr
  where plr.rn = 1
),
reject_context_ranked as (
  select
    pi.request_item_id::text as request_item_id,
    nullif(trim(coalesce(pi.director_comment, '')), '') as director_comment,
    nullif(trim(coalesce(pi.supplier, '')), '') as last_offer_supplier,
    pi.price as last_offer_price,
    nullif(trim(coalesce(pi.note, '')), '') as last_offer_note,
    row_number() over (
      partition by pi.request_item_id
      order by coalesce(pi.updated_at, pi.created_at) desc nulls last, pi.id desc
    ) as rn
  from public.proposal_items pi
  where pi.request_item_id::text in (select rc.request_item_id from rejected_candidates rc)
),
reject_context_latest as (
  select
    rcr.request_item_id,
    rcr.director_comment,
    rcr.last_offer_supplier,
    rcr.last_offer_price,
    rcr.last_offer_note
  from reject_context_ranked rcr
  where rcr.rn = 1
),
enriched_rows as (
  select
    br.request_id,
    br.request_id_old,
    br.request_item_id,
    br.rik_code,
    br.name_human,
    br.qty,
    br.uom,
    br.app_code,
    br.note,
    br.object_name,
    br.status,
    br.created_at,
    br.director_reject_note,
    br.director_reject_at,
    br.search_document_runtime,
    br.search_hash_runtime,
    rqs.request_status,
    lpl.latest_proposal_status,
    coalesce(br.director_reject_note, rcl.director_comment) as director_reject_reason,
    rcl.last_offer_supplier,
    rcl.last_offer_price,
    rcl.last_offer_note,
    lower(coalesce(rqs.request_status, '')) as request_status_norm,
    lower(coalesce(br.status, '')) as item_status_norm,
    lower(coalesce(lpl.latest_proposal_status, '')) as latest_proposal_status_norm
  from base_rows br
  left join request_status_rows rqs
    on rqs.request_id = br.request_id
  left join latest_proposal_lifecycle lpl
    on lpl.request_item_id = br.request_item_id
  left join reject_context_latest rcl
    on rcl.request_item_id = br.request_item_id
),
classified_rows as (
  select
    er.*,
    (
      er.request_status_norm <> ''
      and position((select pending_token from status_tokens) in er.request_status_norm) = 0
      and position((select pending_en from status_tokens) in er.request_status_norm) = 0
      and (
        er.request_status_norm = (select approved_en from status_tokens)
        or position((select approved_neutral from status_tokens) in er.request_status_norm) > 0
        or position((select approved_feminine from status_tokens) in er.request_status_norm) > 0
        or position((select approved_neutral_io from status_tokens) in er.request_status_norm) > 0
        or position((select approved_feminine_io from status_tokens) in er.request_status_norm) > 0
        or position((select procurement_token from status_tokens) in er.request_status_norm) > 0
      )
    ) as request_ready,
    (
      er.item_status_norm <> ''
      and position((select pending_token from status_tokens) in er.item_status_norm) = 0
      and position((select pending_en from status_tokens) in er.item_status_norm) = 0
      and (
        er.item_status_norm = (select approved_en from status_tokens)
        or position((select approved_neutral from status_tokens) in er.item_status_norm) > 0
        or position((select approved_feminine from status_tokens) in er.item_status_norm) > 0
        or position((select approved_neutral_io from status_tokens) in er.item_status_norm) > 0
        or position((select approved_feminine_io from status_tokens) in er.item_status_norm) > 0
        or position((select procurement_token from status_tokens) in er.item_status_norm) > 0
      )
    ) as item_ready,
    (
      er.director_reject_at is not null
      or er.director_reject_note is not null
      or position((select rejected_token from status_tokens) in er.item_status_norm) > 0
      or position((select rejected_en from status_tokens) in er.item_status_norm) > 0
    ) as rejected_like,
    (
      position((select rework_token from status_tokens) in er.latest_proposal_status_norm) > 0
      or position((select rework_en from status_tokens) in er.latest_proposal_status_norm) > 0
    ) as latest_rework
  from enriched_rows er
),
gated_rows as (
  select cr.*
  from classified_rows cr
  where case
    when cr.rejected_like then
      case
        when nullif(trim(coalesce(cr.latest_proposal_status, '')), '') is not null then cr.latest_rework
        else (not cr.request_ready and not cr.item_ready)
      end
    else (cr.item_ready or cr.request_ready)
  end
),
search_matches as (
  select distinct s.request_item_id
  from public.buyer_summary_inbox_search_v1 s
  cross join search_input si
  where si.search_text is not null
    and s.search_document like ('%' || si.search_text || '%')
),
grouped_rows as (
  select
    gr.request_id,
    max(gr.request_id_old) as request_id_old,
    max(gr.created_at) as latest_created_at,
    count(*)::integer as row_count,
    bool_or(
      si.search_text is null
      or case
        when sp.request_item_id is not null
          and sp.search_hash = gr.search_hash_runtime
          then sm.request_item_id is not null
        else public.buyer_summary_inbox_search_match_v1(gr.search_document_runtime, si.search_text)
      end
    ) as matches_search
  from gated_rows gr
  cross join search_input si
  left join public.buyer_summary_inbox_search_v1 sp
    on sp.request_item_id = gr.request_item_id
  left join search_matches sm
    on sm.request_item_id = gr.request_item_id
  group by gr.request_id
),
filtered_groups as (
  select
    grp.request_id,
    grp.request_id_old,
    grp.latest_created_at,
    grp.row_count
  from grouped_rows grp
  where grp.matches_search
),
ordered_groups as (
  select
    fg.request_id,
    fg.request_id_old,
    fg.latest_created_at,
    fg.row_count,
    row_number() over (
      order by fg.request_id_old desc nulls last, fg.latest_created_at desc nulls last, fg.request_id desc
    ) - 1 as group_index
  from filtered_groups fg
),
page_groups as (
  select
    og.request_id,
    og.group_index
  from ordered_groups og
  cross join search_input si
  where og.group_index >= si.offset_groups
    and og.group_index < (si.offset_groups + si.limit_groups)
),
paged_rows as (
  select
    gr.request_id,
    gr.request_id_old,
    gr.request_item_id,
    gr.rik_code,
    gr.name_human,
    gr.qty,
    gr.uom,
    gr.app_code,
    gr.note,
    gr.object_name,
    gr.status,
    gr.created_at,
    gr.director_reject_note,
    gr.director_reject_at,
    gr.director_reject_reason,
    gr.last_offer_supplier,
    gr.last_offer_price,
    gr.last_offer_note,
    pg.group_index,
    row_number() over (
      partition by gr.request_id
      order by gr.created_at desc nulls last, gr.request_item_id asc
    ) as row_rank
  from gated_rows gr
  join page_groups pg
    on pg.request_id = gr.request_id
),
meta_counts as (
  select
    coalesce((select count(*)::integer from ordered_groups), 0) as total_group_count,
    coalesce((select count(*)::integer from page_groups), 0) as returned_group_count,
    coalesce((select count(*)::integer from paged_rows), 0) as returned_row_count,
    coalesce((select count(*)::integer from gated_rows), 0) as gated_row_count
)
select jsonb_build_object(
  'document_type', 'buyer_summary_inbox_scope',
  'version', 'v1',
  'rows', coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'request_id', pr.request_id,
          'request_id_old', pr.request_id_old,
          'request_item_id', pr.request_item_id,
          'rik_code', pr.rik_code,
          'name_human', pr.name_human,
          'qty', pr.qty,
          'uom', pr.uom,
          'app_code', pr.app_code,
          'note', pr.note,
          'object_name', pr.object_name,
          'status', pr.status,
          'created_at', pr.created_at,
          'director_reject_note', pr.director_reject_note,
          'director_reject_at', pr.director_reject_at,
          'director_reject_reason', pr.director_reject_reason,
          'last_offer_supplier', pr.last_offer_supplier,
          'last_offer_price', pr.last_offer_price,
          'last_offer_note', pr.last_offer_note
        )
        order by pr.group_index asc, pr.row_rank asc
      )
      from paged_rows pr
    ),
    '[]'::jsonb
  ),
  'meta', jsonb_build_object(
    'rows_source', 'buyer_summary_inbox_scope_v1',
    'legacy_rows_source', 'list_buyer_inbox+requests+proposal_items_view+v_proposals_summary+proposal_items',
    'payload_shape_version', 'v1',
    'primary_owner', 'rpc_scope_v1',
    'backend_first_primary', true,
    'offset_groups', (select offset_groups from search_input),
    'limit_groups', (select limit_groups from search_input),
    'returned_group_count', (select returned_group_count from meta_counts),
    'total_group_count', (select total_group_count from meta_counts),
    'returned_row_count', (select returned_row_count from meta_counts),
    'gated_row_count', (select gated_row_count from meta_counts),
    'has_more', (
      (select offset_groups from search_input) + (select returned_group_count from meta_counts)
    ) < (select total_group_count from meta_counts),
    'search', (select search_text from search_input)
  )
);
$$;

create or replace function public.buyer_summary_inbox_r3e_cpu_proof_v1()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with defs as (
  select
    pg_get_functiondef('public.buyer_summary_inbox_scope_v1(integer, integer, text, uuid)'::regprocedure) as public_def,
    pg_get_functiondef('public.buyer_summary_inbox_scope_build_source_v1(integer, integer, text, uuid)'::regprocedure) as build_def
),
idx as (
  select exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'buyer_summary_inbox_search_v1'
      and indexname = 'buyer_summary_inbox_search_v1_document_trgm_idx'
  ) as has_trgm_index
)
select jsonb_build_object(
  'checked_at', now(),
  'public_uses_search_projection', public_def like '%buyer_summary_inbox_search_v1%',
  'public_has_search_matches_cte', lower(public_def) like '%search_matches as%',
  'public_has_raw_name_human_like', lower(public_def) like '%lower(coalesce(gr.name_human%',
  'public_has_raw_object_name_like', lower(public_def) like '%lower(coalesce(gr.object_name%',
  'public_has_raw_note_like', lower(public_def) like '%lower(coalesce(gr.note%',
  'public_has_legacy_chained_or_search', lower(public_def) like '%or lower(coalesce(gr.name_human%' and lower(public_def) like '%or lower(coalesce(gr.note%',
  'build_source_keeps_legacy_search', lower(build_def) like '%or lower(coalesce(gr.name_human%' and lower(build_def) like '%or lower(coalesce(gr.note%',
  'projection_has_trgm_index', (select has_trgm_index from idx)
)
from defs;
$$;

create or replace function public.buyer_summary_inbox_r3e_parity_v1(
  p_offset integer default 0,
  p_limit integer default 12,
  p_search text default null,
  p_company_id uuid default null
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with old_payload as (
  select public.buyer_summary_inbox_scope_build_source_v1(p_offset, p_limit, p_search, p_company_id) as payload
),
new_payload as (
  select public.buyer_summary_inbox_scope_v1(p_offset, p_limit, p_search, p_company_id) as payload
),
diffs as (
  select count(*)::integer as diff_count
  from (
    (select payload from old_payload except all select payload from new_payload)
    union all
    (select payload from new_payload except all select payload from old_payload)
  ) d
)
select jsonb_build_object(
  'checked_at', now(),
  'filters', jsonb_build_object(
    'offset', greatest(0, coalesce(p_offset, 0)),
    'limit', greatest(1, coalesce(p_limit, 12)),
    'search', nullif(lower(trim(coalesce(p_search, ''))), ''),
    'company_id', p_company_id
  ),
  'diff_count', (select diff_count from diffs),
  'is_drift_free', (select diff_count = 0 from diffs),
  'old_row_count', jsonb_array_length(coalesce((select payload -> 'rows' from old_payload), '[]'::jsonb)),
  'new_row_count', jsonb_array_length(coalesce((select payload -> 'rows' from new_payload), '[]'::jsonb)),
  'old_total_group_count', coalesce(((select payload #>> '{meta,total_group_count}' from old_payload))::integer, 0),
  'new_total_group_count', coalesce(((select payload #>> '{meta,total_group_count}' from new_payload))::integer, 0)
);
$$;

create temp table r3_e_after as
select
  s.search_text,
  public.buyer_summary_inbox_scope_v1(0, 12, s.search_text, null) as payload
from r3_e_search_samples s;

do $$
declare
  v_diff_count integer := 0;
begin
  select count(*)::integer
    into v_diff_count
  from (
    (select search_text, payload from r3_e_before except all select search_text, payload from r3_e_after)
    union all
    (select search_text, payload from r3_e_after except all select search_text, payload from r3_e_before)
  ) d;

  if v_diff_count <> 0 then
    raise exception 'R3.E buyer inbox search parity failed during migration: diff_count=%', v_diff_count;
  end if;
end $$;

do $$
declare
  v_cpu jsonb;
  v_parity jsonb;
begin
  select public.buyer_summary_inbox_r3e_cpu_proof_v1()
    into v_cpu;
  if coalesce((v_cpu ->> 'public_uses_search_projection')::boolean, false) is not true
    or coalesce((v_cpu ->> 'public_has_raw_name_human_like')::boolean, true) is not false
    or coalesce((v_cpu ->> 'public_has_raw_note_like')::boolean, true) is not false
    or coalesce((v_cpu ->> 'build_source_keeps_legacy_search')::boolean, false) is not true then
    raise exception 'R3.E buyer inbox search CPU proof failed: %', v_cpu;
  end if;

  select public.buyer_summary_inbox_r3e_parity_v1(0, 12, null, null)
    into v_parity;
  if coalesce((v_parity ->> 'is_drift_free')::boolean, false) is not true then
    raise exception 'R3.E buyer inbox search null parity failed: %', v_parity;
  end if;
end $$;

comment on table public.buyer_summary_inbox_search_v1 is
'R3.E prepared buyer inbox search projection. Preserves buyer_summary_inbox_scope_v1 search semantics while isolating leading-wildcard scan pressure from the public hot path.';

comment on function public.buyer_summary_inbox_search_document_v1(text, text, text, text, text, text, text) is
'R3.E normalized buyer inbox search document over the legacy search fields. Uses a delimiter to avoid cross-field substring matches.';

comment on function public.buyer_summary_inbox_search_match_v1(text, text) is
'R3.E legacy-equivalent substring match over a prepared buyer inbox search document.';

comment on function public.buyer_summary_inbox_search_source_v1(uuid) is
'R3.E build source for buyer inbox search projection. Reads list_buyer_inbox and emits normalized per-item search documents.';

comment on function public.buyer_summary_inbox_search_rebuild_v1() is
'R3.E rebuilds buyer_summary_inbox_search_v1 and records rebuild metadata.';

comment on function public.buyer_summary_inbox_search_status_v1() is
'R3.E reports buyer inbox search projection rebuild and row-count metadata.';

comment on function public.buyer_summary_inbox_scope_build_source_v1(integer, integer, text, uuid) is
'R3.E proof-only legacy buyer inbox scope calculator with the original raw field leading-wildcard search.';

comment on function public.buyer_summary_inbox_r3e_cpu_proof_v1() is
'R3.E proof helper: verifies the public buyer inbox scope uses the prepared search projection and no longer carries the raw chained field search.';

comment on function public.buyer_summary_inbox_r3e_parity_v1(integer, integer, text, uuid) is
'R3.E proof helper: compares legacy buyer inbox search output with the projection-backed public output.';

comment on function public.buyer_summary_inbox_scope_v1(integer, integer, text, uuid) is
'Buyer summary inbox scope v1. R3.E keeps buyer inbox semantics and switches search matching to prepared buyer_summary_inbox_search_v1 with stale/missing projection fallback.';

grant select on public.buyer_summary_inbox_search_v1 to authenticated;
grant select on public.buyer_summary_inbox_search_meta_v1 to authenticated;
grant execute on function public.buyer_summary_inbox_search_document_v1(text, text, text, text, text, text, text) to authenticated;
grant execute on function public.buyer_summary_inbox_search_match_v1(text, text) to authenticated;
grant execute on function public.buyer_summary_inbox_search_source_v1(uuid) to authenticated;
grant execute on function public.buyer_summary_inbox_search_rebuild_v1() to authenticated;
grant execute on function public.buyer_summary_inbox_search_status_v1() to authenticated;
grant execute on function public.buyer_summary_inbox_scope_build_source_v1(integer, integer, text, uuid) to authenticated;
grant execute on function public.buyer_summary_inbox_r3e_cpu_proof_v1() to authenticated;
grant execute on function public.buyer_summary_inbox_r3e_parity_v1(integer, integer, text, uuid) to authenticated;
grant execute on function public.buyer_summary_inbox_scope_v1(integer, integer, text, uuid) to authenticated;

notify pgrst, 'reload schema';

commit;
