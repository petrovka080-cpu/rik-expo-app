begin;

create table if not exists public.estimate_catalog_adjudication_r58 (
  source_catalog_id text primary key,
  source_title_ru text not null,
  source_group_id text not null,
  classification text not null check (classification in (
    'EFFECTIVE_WORK','ALIAS','GROUP','DUPLICATE','INVALID','EXTERNAL_REFERENCE','QUARANTINED'
  )),
  reason_code text not null,
  reason_ru text not null,
  evidence_refs jsonb not null check (jsonb_typeof(evidence_refs) = 'array'),
  canonical_target_catalog_id text,
  historical_revision_policy text not null,
  search_visibility text not null check (search_visibility in (
    'USER_SEARCH_SELECTABLE','USER_SEARCH_REDIRECT_ONLY','ADMIN_AUDIT_ONLY'
  )),
  selectable boolean not null,
  definition_version_id uuid references public.estimate_definition_version(id) on delete restrict,
  before_fingerprint text not null check (before_fingerprint ~ '^[0-9a-f]{64}$'),
  after_fingerprint text not null check (after_fingerprint ~ '^[0-9a-f]{64}$'),
  reviewer_verdict jsonb not null check (jsonb_typeof(reviewer_verdict) = 'object'),
  reviewed_at timestamptz not null,
  source_kind text not null,
  source_status text not null,
  source_family_id text not null,
  source_level text,
  legacy_runtime_catalog_id text,
  legacy_definition_version_id uuid references public.estimate_definition_version(id) on delete restrict,
  source_content_changed boolean not null check (not source_content_changed),
  eligibility_proof jsonb,
  adjudication_sha256 text not null unique check (adjudication_sha256 ~ '^[0-9a-f]{64}$'),
  imported_at timestamptz not null default now(),
  check (selectable = (classification = 'EFFECTIVE_WORK')),
  check ((classification = 'EFFECTIVE_WORK') = (definition_version_id is not null)),
  check (classification <> 'DUPLICATE' or canonical_target_catalog_id is not null),
  check (classification <> 'EFFECTIVE_WORK' or jsonb_typeof(eligibility_proof) = 'object')
);

create index if not exists estimate_catalog_adjudication_r58_class_idx
  on public.estimate_catalog_adjudication_r58(classification, source_catalog_id);
create index if not exists estimate_catalog_adjudication_r58_target_idx
  on public.estimate_catalog_adjudication_r58(canonical_target_catalog_id)
  where canonical_target_catalog_id is not null;

create or replace function public.estimate_catalog_adjudication_r58_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception using errcode = '55000', message = 'R58_CATALOG_ADJUDICATION_IS_IMMUTABLE';
end;
$$;

drop trigger if exists estimate_catalog_adjudication_r58_immutable_trg
  on public.estimate_catalog_adjudication_r58;
create trigger estimate_catalog_adjudication_r58_immutable_trg
before update or delete on public.estimate_catalog_adjudication_r58
for each row execute function public.estimate_catalog_adjudication_r58_immutable();

alter table public.estimate_search_document
  add column if not exists adjudication_class text not null default 'QUARANTINED',
  add column if not exists selectable boolean not null default false,
  add column if not exists canonical_target_catalog_id text,
  add column if not exists definition_version_id uuid references public.estimate_definition_version(id) on delete restrict;

alter table public.estimate_search_document
  drop constraint if exists estimate_search_document_adjudication_class_ck,
  add constraint estimate_search_document_adjudication_class_ck check (adjudication_class in (
    'EFFECTIVE_WORK','ALIAS','GROUP','DUPLICATE','INVALID','EXTERNAL_REFERENCE','QUARANTINED'
  )),
  drop constraint if exists estimate_search_document_selectable_r58_ck,
  add constraint estimate_search_document_selectable_r58_ck check (
    not selectable or (
      adjudication_class = 'EFFECTIVE_WORK'
      and definition_release_id is not null
      and definition_version_id is not null
    )
  ),
  drop constraint if exists estimate_search_document_redirect_r58_ck,
  add constraint estimate_search_document_redirect_r58_ck check (
    adjudication_class not in ('ALIAS','DUPLICATE') or canonical_target_catalog_id is not null
  );

create index if not exists estimate_search_document_adjudication_idx
  on public.estimate_search_document(search_release_id, adjudication_class, catalog_origin, catalog_id);
create index if not exists estimate_search_document_selectable_idx
  on public.estimate_search_document(search_release_id, catalog_id)
  where selectable;
create index if not exists estimate_search_document_redirect_idx
  on public.estimate_search_document(search_release_id, canonical_target_catalog_id)
  where canonical_target_catalog_id is not null;

create or replace function public.estimate_search_catalog_r58(
  p_search_release_id uuid,
  p_tokens text[],
  p_mode text default 'PHRASE',
  p_filters jsonb default '{}'::jsonb,
  p_after_order_key text default null,
  p_limit integer default 50,
  p_scope text default 'WORKS'
)
returns table (
  search_release_id uuid,
  snapshot_sha256 text,
  taxonomy_version text,
  group_relation_version text,
  ranking_contract_version text,
  catalog_id text,
  definition_version_id uuid,
  definition_release_id uuid,
  canonical_name_ru text,
  group_id text,
  group_name_ru text,
  domain_id text,
  system_id text,
  subsystem_id text,
  assembly_id text,
  work_family_id text,
  element_type text,
  operation_kind text,
  technology_variant text,
  primary_uom text,
  publication_state text,
  catalog_origin text,
  adjudication_class text,
  selectable boolean,
  canonical_target_catalog_id text,
  short_scope_ru text,
  key_distinguishing_parameters jsonb,
  required_inputs_count integer,
  clarification_fields jsonb,
  included_boundaries jsonb,
  excluded_boundaries jsonb,
  match_tier integer,
  match_type text,
  matched_term text,
  matched_field text,
  ranking_reason_ru text,
  literal_total_count bigint,
  global_literal_total_count bigint,
  external_literal_total_count bigint,
  group_total_count bigint,
  suggestion_total_count bigint,
  result_set_sha256 text,
  order_key text
)
language sql
stable
security invoker
set search_path = ''
as $$
with release as (
  select r.* from public.estimate_search_index_release r where r.id = p_search_release_id
), normalized_tokens as (
  select ordinal::integer,
    public.estimate_search_normalize_r2(token) q
  from unnest(coalesce(p_tokens, '{}'::text[])) with ordinality value(token, ordinal)
  where length(replace(public.estimate_search_normalize_r2(token), ' ', '')) >= 2
), token_state as (
  select count(*)::integer token_count,
    public.estimate_search_normalize_r2(string_agg(q, ' ' order by ordinal)) phrase
  from normalized_tokens
), source_documents as materialized (
  select d.*,r.snapshot_sha256,r.taxonomy_version,r.group_relation_version,r.ranking_contract_version,
    coalesce(target.catalog_id,d.catalog_id) resolved_catalog_id,
    coalesce(target.definition_version_id,d.definition_version_id) resolved_definition_version_id,
    coalesce(target.definition_release_id,d.definition_release_id) resolved_definition_release_id,
    coalesce(target.canonical_name_ru,d.canonical_name_ru) resolved_name_ru,
    coalesce(target.group_id,d.group_id) resolved_group_id,
    coalesce(target.domain_id,d.domain_id) resolved_domain_id,
    coalesce(target.system_id,d.system_id) resolved_system_id,
    coalesce(target.subsystem_id,d.subsystem_id) resolved_subsystem_id,
    coalesce(target.assembly_id,d.assembly_id) resolved_assembly_id,
    coalesce(target.work_family_id,d.work_family_id) resolved_work_family_id,
    coalesce(target.element_type,d.element_type) resolved_element_type,
    coalesce(target.operation_kind,d.operation_kind) resolved_operation_kind,
    coalesce(target.technology_variant,d.technology_variant) resolved_technology_variant,
    coalesce(target.primary_uom,d.primary_uom) resolved_primary_uom,
    coalesce(target.publication_state,d.publication_state) resolved_publication_state,
    coalesce(target.catalog_origin,d.catalog_origin) resolved_catalog_origin,
    coalesce(target.short_scope_ru,d.short_scope_ru) resolved_short_scope_ru,
    coalesce(target.key_distinguishing_parameters,d.key_distinguishing_parameters) resolved_parameters,
    coalesce(target.required_inputs_count,d.required_inputs_count) resolved_required_inputs,
    coalesce(target.clarification_fields,d.clarification_fields) resolved_clarification_fields,
    coalesce(target.included_boundaries,d.included_boundaries) resolved_included_boundaries,
    coalesce(target.excluded_boundaries,d.excluded_boundaries) resolved_excluded_boundaries,
    coalesce(target.selectable,d.selectable) resolved_selectable,
    coalesce(target.adjudication_class,d.adjudication_class) resolved_classification,
    g.group_name_ru source_group_name_ru
  from release r
  join public.estimate_search_document d on d.search_release_id=r.id
  join public.estimate_search_group g on g.search_release_id=d.search_release_id and g.group_id=d.group_id
  left join public.estimate_search_document target
    on target.search_release_id=d.search_release_id
   and target.catalog_id=d.canonical_target_catalog_id
   and target.adjudication_class='EFFECTIVE_WORK'
   and target.selectable
  where case upper(coalesce(p_scope,'WORKS'))
    when 'REFERENCES' then d.adjudication_class='EXTERNAL_REFERENCE'
    else d.adjudication_class in ('EFFECTIVE_WORK','ALIAS','DUPLICATE')
      and coalesce(target.selectable,d.selectable)
  end
    and (coalesce(p_filters->>'domain_id','')='' or coalesce(target.domain_id,d.domain_id)=p_filters->>'domain_id')
    and (coalesce(p_filters->>'group_id','')='' or coalesce(target.group_id,d.group_id)=p_filters->>'group_id')
    and (coalesce(p_filters->>'operation_kind','')='' or coalesce(target.operation_kind,d.operation_kind)=p_filters->>'operation_kind')
), profiled as materialized (
  select d.*,s.token_count,s.phrase,
    profile.matched_count,profile.exact_name,profile.exact_alias,profile.prefix_name,
    profile.literal_name,profile.literal_alias,profile.matched_token,
    (position(s.phrase in d.normalized_canonical_name)>0
      or exists(select 1 from unnest(d.normalized_aliases) a where position(s.phrase in a)>0)) phrase_match,
    greatest(
      extensions.similarity(d.normalized_canonical_name,s.phrase),
      coalesce((select max(extensions.similarity(a,s.phrase)) from unnest(d.normalized_aliases) a),0)
    ) fuzzy_similarity
  from source_documents d
  cross join token_state s
  cross join lateral (
    select count(*) filter(where position(t.q in d.normalized_canonical_name)>0
        or exists(select 1 from unnest(d.normalized_aliases) a where position(t.q in a)>0))::integer matched_count,
      bool_or(d.normalized_canonical_name=t.q or d.normalized_catalog_id=t.q) exact_name,
      bool_or(t.q=any(d.normalized_aliases)) exact_alias,
      bool_or(d.normalized_canonical_name like t.q || '%') prefix_name,
      bool_or(position(t.q in d.normalized_canonical_name)>0) literal_name,
      bool_or(exists(select 1 from unnest(d.normalized_aliases) a where position(t.q in a)>0)) literal_alias,
      min(t.q) filter(where position(t.q in d.normalized_canonical_name)>0
        or exists(select 1 from unnest(d.normalized_aliases) a where position(t.q in a)>0)) matched_token
    from normalized_tokens t
  ) profile
  where s.token_count>0
), candidates as materialized (
  select p.*,
    case
      when p.exact_name then 1
      when p.exact_alias then 2
      when p.prefix_name then 3
      when (
        (upper(p_mode)='ANY' and p.matched_count>0)
        or (upper(p_mode)='ALL' and p.matched_count=p.token_count)
        or (upper(p_mode)='PHRASE' and p.phrase_match)
      ) and p.literal_alias and not p.literal_name then 4
      when (
        (upper(p_mode)='ANY' and p.matched_count>0)
        or (upper(p_mode)='ALL' and p.matched_count=p.token_count)
        or (upper(p_mode)='PHRASE' and p.phrase_match)
      ) then 5
      when upper(p_mode)='PHRASE' and length(replace(p.phrase,' ',''))>2 and p.fuzzy_similarity>=0.62 then 6
      else null
    end tier,
    case when p.exact_alias or (p.literal_alias and not p.literal_name)
      then coalesce((select a from unnest(p.aliases) a
        where position(coalesce(p.matched_token,p.phrase) in public.estimate_search_normalize_r2(a))>0
        order by a limit 1),p.canonical_name_ru)
      else p.canonical_name_ru end matched
  from profiled p
), deduplicated as materialized (
  select * from (
    select c.*,
      concat_ws(E'\u001f',lpad(c.tier::text,2,'0'),
        c.resolved_domain_id,c.resolved_system_id,c.resolved_work_family_id,
        public.estimate_search_normalize_r2(c.resolved_name_ru),c.resolved_catalog_id) stable_order_key,
      row_number() over(partition by c.resolved_catalog_id order by c.tier,
        c.adjudication_class='EFFECTIVE_WORK' desc,c.catalog_id) resolved_ordinal
    from candidates c where c.tier is not null
  ) ranked where resolved_ordinal=1
), summary as (
  select count(*) filter(where tier<=5) literal_count,
    count(*) filter(where tier<=5 and resolved_catalog_origin='GLOBAL') global_literal_count,
    count(*) filter(where tier<=5 and resolved_catalog_origin<>'GLOBAL') external_literal_count,
    count(distinct resolved_group_id) filter(where tier<=5) group_count,
    count(*) filter(where tier=6) suggestion_count,
    encode(extensions.digest(convert_to(coalesce(string_agg(
      concat_ws(E'\u001f',resolved_catalog_id,tier::text,matched,stable_order_key),
      E'\n' order by stable_order_key),''),'UTF8'),'sha256'),'hex') result_set_sha256
  from deduplicated
), page as (
  select d.*,s.* from deduplicated d cross join summary s
  where p_after_order_key is null or d.stable_order_key>p_after_order_key
  order by d.stable_order_key
  limit least(greatest(coalesce(p_limit,50),1),100)
)
select p.search_release_id,p.snapshot_sha256,p.taxonomy_version,p.group_relation_version,
  p.ranking_contract_version,p.resolved_catalog_id,p.resolved_definition_version_id,
  p.resolved_definition_release_id,p.resolved_name_ru,p.resolved_group_id,g.group_name_ru,
  p.resolved_domain_id,p.resolved_system_id,p.resolved_subsystem_id,p.resolved_assembly_id,
  p.resolved_work_family_id,p.resolved_element_type,p.resolved_operation_kind,
  p.resolved_technology_variant,p.resolved_primary_uom,p.resolved_publication_state,
  p.resolved_catalog_origin,p.resolved_classification,p.resolved_selectable,
  case when p.catalog_id<>p.resolved_catalog_id then p.resolved_catalog_id else null end,
  p.resolved_short_scope_ru,p.resolved_parameters,p.resolved_required_inputs,
  p.resolved_clarification_fields,p.resolved_included_boundaries,p.resolved_excluded_boundaries,
  p.tier,
  case p.tier when 1 then 'T1_EXACT' when 2 then 'T2_EXACT_ALIAS'
    when 3 then 'T3_CANONICAL_PREFIX' when 4 then 'T4_TOKEN_PREFIX'
    when 5 then 'T5_NORMALIZED_SUBSTRING' else 'T6_TYPO_TRANSLITERATION_SUGGESTION' end,
  p.matched,
  case when p.exact_alias or (p.literal_alias and not p.literal_name) then 'aliases'
    when p.tier=6 then 'fuzzy_name_or_alias' else 'canonical_name_ru' end,
  case p.tier when 1 then 'Точное совпадение идентификатора или названия'
    when 2 then 'Точный зарегистрированный синоним'
    when 3 then 'Начало канонического названия'
    when 4 then 'Буквальное вхождение в разрешённый синоним'
    when 5 then 'Буквальное вхождение без ограничения первых 15 результатов'
    else 'Отдельная нечёткая подсказка; не входит в literal total' end,
  p.literal_count,p.global_literal_count,p.external_literal_count,p.group_count,
  p.suggestion_count,p.result_set_sha256,p.stable_order_key
from page p
join public.estimate_search_group g
  on g.search_release_id=p.search_release_id and g.group_id=p.resolved_group_id
order by p.stable_order_key;
$$;

create or replace function public.estimate_list_search_group_r58(
  p_search_release_id uuid,
  p_group_id text,
  p_after_catalog_id text default null,
  p_limit integer default 50
)
returns table (
  search_release_id uuid,
  snapshot_sha256 text,
  taxonomy_version text,
  group_relation_version text,
  group_id text,
  group_name_ru text,
  member_count bigint,
  catalog_id text,
  definition_version_id uuid,
  canonical_name_ru text,
  publication_state text,
  catalog_origin text,
  operation_kind text,
  technology_variant text,
  ordinal bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
with members as materialized (
  select distinct on (d.catalog_id)
    r.id search_release_id,r.snapshot_sha256,r.taxonomy_version,r.group_relation_version,
    g.group_id,g.group_name_ru,d.catalog_id,d.definition_version_id,d.canonical_name_ru,
    d.publication_state,d.catalog_origin,d.operation_kind,d.technology_variant
  from public.estimate_search_index_release r
  join public.estimate_search_group g on g.search_release_id=r.id
  join public.estimate_search_group_membership m
    on m.search_release_id=g.search_release_id and m.group_id=g.group_id
  join public.estimate_search_document d
    on d.search_release_id=m.search_release_id and d.catalog_id=m.catalog_id
  where r.id=p_search_release_id and g.group_id=p_group_id
    and d.adjudication_class='EFFECTIVE_WORK' and d.selectable
  order by d.catalog_id
), numbered as (
  select m.*,count(*) over() member_count,row_number() over(order by catalog_id)-1 ordinal
  from members m
)
select n.search_release_id,n.snapshot_sha256,n.taxonomy_version,n.group_relation_version,
  n.group_id,n.group_name_ru,n.member_count,n.catalog_id,n.definition_version_id,
  n.canonical_name_ru,n.publication_state,n.catalog_origin,n.operation_kind,
  n.technology_variant,n.ordinal
from numbered n
where p_after_catalog_id is null or n.catalog_id>p_after_catalog_id
order by n.catalog_id
limit least(greatest(coalesce(p_limit,50),1),100);
$$;

alter table public.estimate_catalog_adjudication_r58 enable row level security;
revoke all on public.estimate_catalog_adjudication_r58 from anon, authenticated;
grant all on public.estimate_catalog_adjudication_r58 to service_role;
grant execute on function public.estimate_search_catalog_r58(uuid,text[],text,jsonb,text,integer,text)
  to authenticated, service_role;
grant execute on function public.estimate_list_search_group_r58(uuid,text,text,integer)
  to authenticated, service_role;

commit;
