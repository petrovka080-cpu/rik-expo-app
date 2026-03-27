begin;

create or replace function public.foreman_ai_normalize_text_v1(p_value text)
returns text
language sql
immutable
set search_path = public
as $$
  select nullif(
    trim(
      regexp_replace(
        replace(replace(lower(coalesce(p_value, '')), 'ё', 'е'), '№', ' '),
        E'[^0-9a-zа-я]+',
        ' ',
        'g'
      )
    ),
    ''
  )::text;
$$;

comment on function public.foreman_ai_normalize_text_v1(text) is
  'Normalizes foreman AI free-text inputs for deterministic exact synonym and packaging resolve.';

grant execute on function public.foreman_ai_normalize_text_v1(text) to authenticated;

create table if not exists public.catalog_synonyms (
  id bigint generated always as identity primary key,
  term text not null,
  term_normalized text generated always as (public.foreman_ai_normalize_text_v1(term)) stored,
  rik_code text not null,
  kind text null,
  confidence numeric(8, 4) not null default 1,
  matched_by text not null default 'manual_seed',
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint catalog_synonyms_kind_check check (kind is null or kind in ('material', 'work', 'service'))
);

create unique index if not exists catalog_synonyms_term_kind_active_uidx
  on public.catalog_synonyms (term_normalized, coalesce(kind, ''))
  where is_active = true;

create index if not exists catalog_synonyms_rik_code_active_idx
  on public.catalog_synonyms (rik_code)
  where is_active = true;

create table if not exists public.catalog_packaging (
  id bigint generated always as identity primary key,
  rik_code text not null,
  package_name text not null,
  package_name_normalized text generated always as (public.foreman_ai_normalize_text_v1(package_name)) stored,
  base_uom_code text null,
  package_multiplier numeric(12, 4) not null,
  matched_by text not null default 'manual_seed',
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint catalog_packaging_multiplier_check check (package_multiplier > 0)
);

create unique index if not exists catalog_packaging_rik_package_active_uidx
  on public.catalog_packaging (rik_code, package_name_normalized)
  where is_active = true;

insert into public.catalog_synonyms (term, rik_code, kind, confidence, matched_by)
select
  seed.term,
  seed.rik_code,
  'material',
  seed.confidence,
  'battle_seed_v1'
from (
  values
    ('арматура 12', 'MAT-REBAR-A500-12', 0.99::numeric),
    ('арматура д12', 'MAT-REBAR-A500-12', 0.98::numeric),
    ('фанера 6', 'MAT-WOOD-Plywood-FK-6MM-1525x1525', 0.98::numeric),
    ('фанера 6мм', 'MAT-WOOD-Plywood-FK-6MM-1525x1525', 0.98::numeric),
    ('фанера 12', 'MAT-BOARDS-PW-BIRCH-12MM-1525x1525', 0.98::numeric),
    ('фанера 12мм', 'MAT-BOARDS-PW-BIRCH-12MM-1525x1525', 0.98::numeric),
    ('сетка рабица 1.8', 'MAT-FENCE-CHAINLINK-180CM-10M', 0.98::numeric)
) as seed(term, rik_code, confidence)
where exists (
  select 1
  from public.rik_items ri
  where trim(coalesce(ri.rik_code, '')) = seed.rik_code
)
and not exists (
  select 1
  from public.catalog_synonyms cs
  where cs.is_active = true
    and cs.term_normalized = public.foreman_ai_normalize_text_v1(seed.term)
    and coalesce(cs.kind, '') = 'material'
);

insert into public.catalog_packaging (rik_code, package_name, base_uom_code, package_multiplier, matched_by)
select
  seed.rik_code,
  seed.package_name,
  seed.base_uom_code,
  seed.package_multiplier,
  'battle_seed_v1'
from (
  values
    ('MAT-DECOR-MICROCEMENT-BASE-20KG', 'мешок', 'кг', 20.0::numeric),
    ('MAT-DECOR-MICROCEMENT-FINISH-20KG', 'мешок', 'кг', 20.0::numeric),
    ('MAT-WOOD-Plywood-FK-6MM-1525x1525', 'лист', 'м²', 2.3256::numeric),
    ('MAT-BOARDS-PW-BIRCH-12MM-1525x1525', 'лист', 'м²', 2.3256::numeric),
    ('MAT-FENCE-CHAINLINK-150CM-10M', 'рулон', 'м²', 15.0::numeric),
    ('MAT-FENCE-CHAINLINK-180CM-10M', 'рулон', 'м²', 18.0::numeric),
    ('MAT-FENCE-CHAINLINK-200CM-10M', 'рулон', 'м²', 20.0::numeric)
) as seed(rik_code, package_name, base_uom_code, package_multiplier)
where exists (
  select 1
  from public.rik_items ri
  where trim(coalesce(ri.rik_code, '')) = seed.rik_code
)
and not exists (
  select 1
  from public.catalog_packaging cp
  where cp.is_active = true
    and trim(coalesce(cp.rik_code, '')) = seed.rik_code
    and cp.package_name_normalized = public.foreman_ai_normalize_text_v1(seed.package_name)
);

create or replace function public.resolve_catalog_synonym_v1(
  p_terms text[],
  p_kind text default null
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with args as (
  select
    nullif(lower(trim(coalesce(p_kind, ''))), '') as requested_kind
),
input_terms as (
  select
    trim(coalesce(src.term, '')) as term,
    src.ordinality::integer as term_order,
    public.foreman_ai_normalize_text_v1(src.term) as term_key
  from unnest(coalesce(p_terms, array[]::text[])) with ordinality as src(term, ordinality)
  where public.foreman_ai_normalize_text_v1(src.term) is not null
),
manual_matches as (
  select
    it.term,
    it.term_order,
    trim(coalesce(cs.rik_code, '')) as rik_code,
    coalesce(nullif(trim(coalesce(ri.name_human_ru, '')), ''), nullif(trim(coalesce(ri.name_human, '')), ''), trim(coalesce(cs.rik_code, ''))) as name_human,
    nullif(trim(coalesce(ri.uom_code, '')), '') as uom_code,
    nullif(lower(trim(coalesce(ri.kind, ''))), '') as kind,
    greatest(coalesce(cs.confidence, 1), 0)::numeric as confidence,
    coalesce(nullif(trim(coalesce(cs.matched_by, '')), ''), 'manual_synonym') as matched_by,
    1 as source_priority
  from input_terms it
  join public.catalog_synonyms cs
    on cs.is_active = true
   and cs.term_normalized = it.term_key
  left join public.rik_items ri
    on trim(coalesce(ri.rik_code, '')) = trim(coalesce(cs.rik_code, ''))
),
alias_matches as (
  select
    it.term,
    it.term_order,
    trim(coalesce(ra.rik_code, '')) as rik_code,
    coalesce(nullif(trim(coalesce(ri.name_human_ru, '')), ''), nullif(trim(coalesce(ri.name_human, '')), ''), trim(coalesce(ra.rik_code, ''))) as name_human,
    nullif(trim(coalesce(ri.uom_code, '')), '') as uom_code,
    nullif(lower(trim(coalesce(ri.kind, ''))), '') as kind,
    0.98::numeric as confidence,
    'rik_alias_exact'::text as matched_by,
    2 as source_priority
  from input_terms it
  join public.rik_aliases ra
    on public.foreman_ai_normalize_text_v1(ra.alias) = it.term_key
  left join public.rik_items ri
    on trim(coalesce(ri.rik_code, '')) = trim(coalesce(ra.rik_code, ''))
  where trim(coalesce(ra.rik_code, '')) <> ''
),
item_code_matches as (
  select
    it.term,
    it.term_order,
    trim(coalesce(ri.rik_code, '')) as rik_code,
    coalesce(nullif(trim(coalesce(ri.name_human_ru, '')), ''), nullif(trim(coalesce(ri.name_human, '')), ''), trim(coalesce(ri.rik_code, ''))) as name_human,
    nullif(trim(coalesce(ri.uom_code, '')), '') as uom_code,
    nullif(lower(trim(coalesce(ri.kind, ''))), '') as kind,
    1.0::numeric as confidence,
    'rik_code_exact'::text as matched_by,
    0 as source_priority
  from input_terms it
  join public.rik_items ri
    on public.foreman_ai_normalize_text_v1(ri.rik_code) = it.term_key
),
item_name_matches as (
  select
    it.term,
    it.term_order,
    trim(coalesce(ri.rik_code, '')) as rik_code,
    coalesce(nullif(trim(coalesce(ri.name_human_ru, '')), ''), nullif(trim(coalesce(ri.name_human, '')), ''), trim(coalesce(ri.rik_code, ''))) as name_human,
    nullif(trim(coalesce(ri.uom_code, '')), '') as uom_code,
    nullif(lower(trim(coalesce(ri.kind, ''))), '') as kind,
    0.95::numeric as confidence,
    'name_human_exact'::text as matched_by,
    3 as source_priority
  from input_terms it
  join public.rik_items ri
    on public.foreman_ai_normalize_text_v1(ri.name_human) = it.term_key
),
item_name_ru_matches as (
  select
    it.term,
    it.term_order,
    trim(coalesce(ri.rik_code, '')) as rik_code,
    coalesce(nullif(trim(coalesce(ri.name_human_ru, '')), ''), nullif(trim(coalesce(ri.name_human, '')), ''), trim(coalesce(ri.rik_code, ''))) as name_human,
    nullif(trim(coalesce(ri.uom_code, '')), '') as uom_code,
    nullif(lower(trim(coalesce(ri.kind, ''))), '') as kind,
    0.94::numeric as confidence,
    'name_human_ru_exact'::text as matched_by,
    4 as source_priority
  from input_terms it
  join public.rik_items ri
    on public.foreman_ai_normalize_text_v1(ri.name_human_ru) = it.term_key
),
ranked as (
  select
    matches.*,
    row_number() over (
      partition by matches.term
      order by matches.source_priority asc, matches.confidence desc, matches.rik_code asc
    ) as row_rank
  from (
    select * from item_code_matches
    union all
    select * from manual_matches
    union all
    select * from alias_matches
    union all
    select * from item_name_matches
    union all
    select * from item_name_ru_matches
  ) matches
  cross join args a
  where matches.rik_code <> ''
    and (
      a.requested_kind is null
      or matches.kind is null
      or matches.kind = a.requested_kind
    )
),
best_rows as (
  select
    r.term,
    r.term_order,
    r.rik_code,
    r.name_human,
    r.uom_code,
    case when r.kind in ('material', 'work', 'service') then r.kind else null end as kind,
    r.confidence,
    r.matched_by
  from ranked r
  where r.row_rank = 1
),
meta as (
  select
    (select count(*)::integer from input_terms) as term_count,
    (select count(*)::integer from best_rows) as match_count,
    (select requested_kind from args) as requested_kind
)
select jsonb_build_object(
  'document_type', 'foreman_catalog_synonym_resolve',
  'version', 'v1',
  'rows', coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'term', br.term,
        'rik_code', br.rik_code,
        'name_human', br.name_human,
        'uom_code', br.uom_code,
        'kind', br.kind,
        'confidence', br.confidence,
        'matched_by', br.matched_by
      )
      order by br.term_order asc
    )
    from best_rows br
  ), '[]'::jsonb),
  'meta', jsonb_build_object(
    'termCount', meta.term_count,
    'matchCount', meta.match_count,
    'requestedKind', meta.requested_kind,
    'scopeKey', concat('resolve_catalog_synonym_v1:', meta.term_count, ':', coalesce(meta.requested_kind, 'all')),
    'sourceVersion', 'resolve_catalog_synonym_v1',
    'generatedAt', to_char(timezone('utc', now()), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  )
)
from meta;
$$;

comment on function public.resolve_catalog_synonym_v1(text[], text) is
  'Backend-owned deterministic exact synonym resolve for foreman AI inputs.';

grant execute on function public.resolve_catalog_synonym_v1(text[], text) to authenticated;

create or replace function public.resolve_packaging_v1(
  p_rik_code text,
  p_package_name text,
  p_qty numeric
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with args as (
  select
    trim(coalesce(p_rik_code, '')) as rik_code,
    greatest(coalesce(p_qty, 0), 0)::numeric as requested_qty,
    nullif(trim(coalesce(p_package_name, '')), '') as package_name,
    public.foreman_ai_normalize_text_v1(p_package_name) as package_key
),
item as (
  select
    trim(coalesce(ri.rik_code, '')) as rik_code,
    nullif(trim(coalesce(ri.uom_code, '')), '') as base_uom_code,
    public.foreman_ai_normalize_text_v1(ri.uom_code) as base_uom_key
  from public.rik_items ri
  join args a
    on trim(coalesce(ri.rik_code, '')) = a.rik_code
  limit 1
),
manual_match as (
  select
    cp.rik_code,
    cp.package_name,
    coalesce(nullif(trim(coalesce(cp.base_uom_code, '')), ''), i.base_uom_code) as base_uom_code,
    cp.package_multiplier,
    cp.matched_by
  from public.catalog_packaging cp
  join args a
    on cp.rik_code = a.rik_code
   and cp.is_active = true
   and cp.package_name_normalized = a.package_key
  left join item i on true
  order by cp.id asc
  limit 1
),
decision as (
  select
    a.rik_code,
    a.requested_qty,
    coalesce(a.package_name, '') as requested_unit,
    i.base_uom_code,
    i.base_uom_key,
    mm.package_name as matched_package_name,
    mm.base_uom_code as matched_base_uom_code,
    mm.package_multiplier,
    mm.matched_by,
    case
      when i.rik_code is null then true
      when a.package_key is null then true
      when i.base_uom_key is not null and a.package_key = i.base_uom_key then true
      when mm.rik_code is not null then false
      else true
    end as clarify_required,
    case
      when i.rik_code is null then false
      when a.package_key is null then false
      when i.base_uom_key is not null and a.package_key = i.base_uom_key then true
      when mm.rik_code is not null then true
      else false
    end as package_known,
    case when mm.rik_code is not null then true else false end as conversion_applied
  from args a
  left join item i on true
  left join manual_match mm on true
)
select jsonb_build_object(
  'document_type', 'foreman_packaging_resolve',
  'version', 'v1',
  'result', jsonb_build_object(
    'rikCode', d.rik_code,
    'requestedQty', d.requested_qty,
    'requestedUnit', d.requested_unit,
    'resolvedQty', case
      when d.clarify_required then null
      when d.conversion_applied then d.requested_qty * d.package_multiplier
      else d.requested_qty
    end,
    'resolvedUnit', case
      when d.clarify_required then null
      when d.conversion_applied then d.matched_base_uom_code
      else d.base_uom_code
    end,
    'packageName', coalesce(d.matched_package_name, nullif(d.requested_unit, '')),
    'packageMultiplier', case
      when d.conversion_applied then d.package_multiplier
      when d.package_known then 1
      else null
    end,
    'conversionApplied', d.conversion_applied,
    'packageKnown', d.package_known,
    'clarifyRequired', d.clarify_required,
    'matchedBy', case
      when d.conversion_applied then d.matched_by
      when d.package_known then 'base_uom_exact'
      else null
    end
  ),
  'meta', jsonb_build_object(
    'scopeKey', concat('resolve_packaging_v1:', d.rik_code, ':', coalesce(d.requested_unit, '')),
    'sourceVersion', 'resolve_packaging_v1',
    'generatedAt', to_char(timezone('utc', now()), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  )
)
from decision d;
$$;

comment on function public.resolve_packaging_v1(text, text, numeric) is
  'Backend-owned packaging conversion for foreman AI resolve. Unknown packaging must return clarifyRequired=true.';

grant execute on function public.resolve_packaging_v1(text, text, numeric) to authenticated;

commit;
