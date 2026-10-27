create or replace function public.identity_text_key_v1(p_value text)
returns text
language sql
immutable
as $$
  select nullif(
    lower(
      regexp_replace(
        btrim(coalesce(p_value, '')),
        '\s+',
        ' ',
        'g'
      )
    ),
    ''
  );
$$;

create table if not exists public.request_object_identity_shadow_v1 (
  request_id uuid primary key references public.requests(id) on delete cascade,
  construction_object_code text not null references public.ref_object_types(code) on delete restrict,
  resolution_source text not null,
  resolution_status text not null default 'resolved',
  legacy_object_name text null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint request_object_identity_shadow_v1_source_check
    check (resolution_source in ('exact_alias_backfill_v1')),
  constraint request_object_identity_shadow_v1_status_check
    check (resolution_status in ('resolved'))
);

create index if not exists request_object_identity_shadow_v1_object_code_idx
  on public.request_object_identity_shadow_v1(construction_object_code);

with object_aliases as (
  select distinct
    rot.code,
    public.identity_text_key_v1(alias_value.alias_name) as alias_key
  from public.ref_object_types rot
  cross join lateral (
    values
      (rot.name_human_ru),
      (rot.display_name),
      (rot.alias_ru),
      (rot.name),
      (rot.code)
  ) as alias_value(alias_name)
  where public.identity_text_key_v1(alias_value.alias_name) is not null
),
unique_aliases as (
  select
    alias_key,
    min(code) as code
  from object_aliases
  group by alias_key
  having count(distinct code) = 1
),
deterministic_request_matches as (
  select
    r.id as request_id,
    ua.code as construction_object_code,
    nullif(btrim(coalesce(r.object_name, '')), '') as legacy_object_name
  from public.requests r
  join unique_aliases ua
    on ua.alias_key = public.identity_text_key_v1(r.object_name)
  where r.object_type_code is null
    and nullif(btrim(coalesce(r.object_name, '')), '') is not null
)
insert into public.request_object_identity_shadow_v1 (
  request_id,
  construction_object_code,
  resolution_source,
  resolution_status,
  legacy_object_name
)
select
  request_id,
  construction_object_code,
  'exact_alias_backfill_v1',
  'resolved',
  legacy_object_name
from deterministic_request_matches
on conflict (request_id) do update
set
  construction_object_code = excluded.construction_object_code,
  resolution_source = excluded.resolution_source,
  resolution_status = excluded.resolution_status,
  legacy_object_name = excluded.legacy_object_name,
  updated_at = timezone('utc', now());

create or replace view public.construction_object_identity_lookup_v1
as
select
  rot.code as construction_object_code,
  coalesce(
    nullif(btrim(coalesce(rot.name_human_ru, '')), ''),
    nullif(btrim(coalesce(rot.display_name, '')), ''),
    nullif(btrim(coalesce(rot.alias_ru, '')), ''),
    nullif(btrim(coalesce(rot.name, '')), ''),
    rot.code
  ) as construction_object_name
from public.ref_object_types rot;

create or replace view public.request_object_identity_scope_v1
as
with resolved_requests as (
  select
    r.id as request_id,
    nullif(btrim(coalesce(r.object_type_code, '')), '') as request_object_type_code,
    nullif(btrim(coalesce(s.construction_object_code, '')), '') as shadow_object_type_code,
    coalesce(
      nullif(btrim(coalesce(r.object_type_code, '')), ''),
      nullif(btrim(coalesce(s.construction_object_code, '')), '')
    ) as construction_object_code,
    nullif(btrim(coalesce(r.object_name, '')), '') as legacy_object_name,
    s.resolution_source
  from public.requests r
  left join public.request_object_identity_shadow_v1 s
    on s.request_id = r.id
)
select
  rr.request_id,
  rr.request_object_type_code,
  rr.shadow_object_type_code,
  rr.construction_object_code,
  coalesce(
    lookup.construction_object_name,
    rr.legacy_object_name,
    'Без объекта'
  ) as construction_object_name,
  case
    when rr.request_object_type_code is not null then 'request_fk'
    when rr.shadow_object_type_code is not null then 'shadow_backfill'
    when rr.legacy_object_name is not null then 'legacy_name_only'
    else 'missing'
  end as identity_status,
  case
    when rr.request_object_type_code is not null then 'request.object_type_code'
    when rr.shadow_object_type_code is not null then rr.resolution_source
    when rr.legacy_object_name is not null then 'legacy.object_name'
    else 'missing'
  end as identity_source,
  rr.legacy_object_name
from resolved_requests rr
left join public.construction_object_identity_lookup_v1 lookup
  on lookup.construction_object_code = rr.construction_object_code;

create or replace view public.request_object_identity_conflicts_v1
as
with object_aliases as (
  select distinct
    rot.code,
    public.identity_text_key_v1(alias_value.alias_name) as alias_key
  from public.ref_object_types rot
  cross join lateral (
    values
      (rot.name_human_ru),
      (rot.display_name),
      (rot.alias_ru),
      (rot.name),
      (rot.code)
  ) as alias_value(alias_name)
  where public.identity_text_key_v1(alias_value.alias_name) is not null
),
legacy_requests as (
  select
    r.id as request_id,
    nullif(btrim(coalesce(r.object_name, '')), '') as legacy_object_name,
    public.identity_text_key_v1(r.object_name) as legacy_object_key
  from public.requests r
  where r.object_type_code is null
    and nullif(btrim(coalesce(r.object_name, '')), '') is not null
),
alias_matches as (
  select
    lr.request_id,
    lr.legacy_object_name,
    oa.code
  from legacy_requests lr
  left join object_aliases oa
    on oa.alias_key = lr.legacy_object_key
),
aggregated as (
  select
    request_id,
    min(legacy_object_name) as legacy_object_name,
    coalesce(array_agg(distinct code order by code) filter (where code is not null), '{}'::text[]) as candidate_codes,
    count(distinct code) filter (where code is not null) as candidate_count
  from alias_matches
  group by request_id
)
select
  a.request_id,
  a.legacy_object_name,
  a.candidate_codes,
  case
    when a.candidate_count > 1 then 'ambiguous_alias'
    when a.candidate_count = 0 then 'unresolved_alias'
    else 'resolved'
  end as conflict_category
from aggregated a
where a.candidate_count <> 1;

grant select on public.construction_object_identity_lookup_v1 to anon, authenticated, service_role;
grant select on public.request_object_identity_scope_v1 to anon, authenticated, service_role;
grant select on public.request_object_identity_conflicts_v1 to anon, authenticated, service_role;
