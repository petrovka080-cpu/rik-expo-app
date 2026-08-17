-- P0 estimate truth remediation R2.
-- Forward-only metadata and audit boundaries. This migration never updates an
-- existing immutable revision and never changes Asphalt definition content.

begin;

create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;

alter table public.estimate_parameter_definition
  add column truth_metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(truth_metadata) = 'object');

alter table public.estimate_parameter_definition
  drop constraint if exists estimate_parameter_definition_value_type_check;
alter table public.estimate_parameter_definition
  add constraint estimate_parameter_definition_value_type_r3_ck
  check (value_type in ('decimal', 'integer', 'boolean', 'enum', 'text', 'array_object'));

create or replace function public.estimate_parameter_truth_metadata_valid_r3(
  p_value_type text,
  p_truth jsonb
)
returns boolean
language sql
immutable
parallel safe
set search_path = ''
as $$
  select
    jsonb_typeof(p_truth) = 'object'
    and nullif(trim(p_truth->>'semantic_parameter_key'), '') is not null
    and p_truth->>'visibility_role' in ('USER_INPUT', 'USER_DERIVED_READONLY', 'INTERNAL_ONLY')
    and (
      p_truth->>'visibility_role' = 'INTERNAL_ONLY'
      or (
        jsonb_typeof(p_truth->'guide') = 'object'
        and nullif(trim(p_truth->'guide'->>'guide_short_ru'), '') is not null
        and p_truth->'guide'->>'guide_kind' in (
          'MANDATORY_NORM_VALUE', 'NORMATIVE_RANGE', 'PROJECT_DEFINED', 'MANUFACTURER_RANGE',
          'MEASUREMENT_RULE', 'ENUM_DECISION_RULE', 'DERIVED_VALUE_RULE', 'PRACTICE_REFERENCE',
          'NO_NUMERIC_NORM'
        )
        and nullif(trim(p_truth->'guide'->>'source_role'), '') is not null
        and nullif(trim(p_truth->'guide'->>'guide_version'), '') is not null
        and coalesce(p_truth->'guide'->>'source_snapshot_hash', '') ~ '^[0-9a-f]{64}$'
        and nullif(trim(p_truth->'guide'->>'applicability'), '') is not null
        and nullif(trim(p_truth->'guide'->>'verified_at'), '') is not null
      )
    )
    and (
      p_value_type <> 'array_object'
      or (
        jsonb_typeof(p_truth->'composite_item_schema') = 'object'
        and jsonb_typeof(p_truth->'composite_item_schema'->'subfields') = 'array'
        and jsonb_array_length(p_truth->'composite_item_schema'->'subfields') > 0
      )
    );
$$;

alter table public.estimate_parameter_definition
  add constraint estimate_parameter_truth_metadata_r3_ck
  check (public.estimate_parameter_truth_metadata_valid_r3(value_type, truth_metadata)) not valid;

alter table public.estimate_resource_spec
  add constraint estimate_resource_spec_r3_truth_ck check (
    source_metadata->>'truth_contract_version' <> 'R3'
    or (
      nullif(trim(semantic_owner), '') is not null
      and nullif(trim(title_ru), '') is not null
      and lower(title_ru) !~ '(этап[[:space:]]*[0-9]+|основная операция|выполнение работ по|материалы и комплектующие для|комплект без состава|резерв профессионального добора)'
    )
  ) not valid;

create unique index estimate_resource_spec_r3_semantic_owner_uidx
  on public.estimate_resource_spec(definition_version_id, semantic_owner)
  where source_metadata->>'truth_contract_version' = 'R3';

alter table public.estimate_revision_row
  add column semantic_owner text,
  add column physical_row_type text;

create unique index estimate_revision_row_semantic_owner_uidx
  on public.estimate_revision_row(revision_id, semantic_owner)
  where semantic_owner is not null;

create or replace function public.estimate_revision_row_semantic_owner_r3()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_resource public.estimate_resource_spec%rowtype;
begin
  if new.resource_spec_id is not null then
    select * into strict v_resource
    from public.estimate_resource_spec
    where id = new.resource_spec_id;
    new.semantic_owner := v_resource.semantic_owner;
    new.physical_row_type := v_resource.row_type;
    if v_resource.source_metadata->>'truth_contract_version' = 'R3'
      and nullif(trim(new.semantic_owner), '') is null then
      raise exception using errcode = '23514', message = 'R3 resource semantic_owner is required';
    end if;
  elsif jsonb_typeof(new.calculation_trace) = 'object' then
    new.semantic_owner := nullif(trim(new.calculation_trace->>'semanticOwner'), '');
    new.physical_row_type := nullif(trim(new.calculation_trace->>'physicalRowType'), '');
  end if;
  return new;
end;
$$;

create trigger estimate_revision_row_semantic_owner_r3_trg
before insert or update of resource_spec_id, calculation_trace
on public.estimate_revision_row
for each row execute function public.estimate_revision_row_semantic_owner_r3();

alter table public.estimate_revision
  add column definition_version integer,
  add column compiler_owner text,
  add column parameter_schema_hash text,
  add column input_hash text,
  add column output_hash text,
  add constraint estimate_revision_definition_version_truth_ck
    check (definition_version is null or definition_version > 0),
  add constraint estimate_revision_compiler_owner_truth_ck
    check (compiler_owner is null or compiler_owner = 'backend'),
  add constraint estimate_revision_parameter_schema_hash_truth_ck
    check (parameter_schema_hash is null or parameter_schema_hash ~ '^[0-9a-f]{64}$'),
  add constraint estimate_revision_input_hash_truth_ck
    check (input_hash is null or input_hash ~ '^[0-9a-f]{64}$'),
  add constraint estimate_revision_output_hash_truth_ck
    check (output_hash is null or output_hash ~ '^[0-9a-f]{64}$');

create or replace function public.estimate_bind_revision_truth_r1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_definition public.estimate_definition_version%rowtype;
  v_parameter_schema_hash text;
begin
  select v.* into v_definition
  from public.estimate_definition_version v
  where v.release_id = new.release_id
    and v.catalog_id = new.catalog_id;

  if v_definition.id is null then
    raise exception using errcode = '55000', message = 'revision definition/release binding is missing';
  end if;

  select encode(extensions.digest(convert_to(coalesce(string_agg(
    jsonb_build_array(
      p.parameter_id,
      p.ordinal,
      p.value_type,
      p.unit_id,
      p.title_ru,
      p.required,
      p.default_value,
      p.constraints_json,
      p.truth_metadata
    )::text,
    E'\n' order by p.ordinal, p.parameter_id
  ), ''), 'UTF8'), 'sha256'), 'hex')
  into v_parameter_schema_hash
  from public.estimate_parameter_definition p
  where p.definition_version_id = v_definition.id;

  new.definition_version := v_definition.definition_version;
  new.compiler_owner := 'backend';
  new.parameter_schema_hash := v_parameter_schema_hash;
  new.input_hash := encode(
    extensions.digest(convert_to(new.input_parameters::text, 'UTF8'), 'sha256'),
    'hex'
  );
  new.output_hash := new.checksum_sha256;
  return new;
end;
$$;

create trigger estimate_revision_truth_binding_r1_trg
before insert on public.estimate_revision
for each row execute function public.estimate_bind_revision_truth_r1();

create table public.estimate_runtime_route_audit (
  id bigint generated always as identity primary key,
  request_id uuid not null,
  draft_id text,
  owner_user_id uuid not null,
  catalog_id text,
  domain text,
  route_decision text not null check (route_decision in (
    'BACKEND_CANONICAL',
    'PRELIMINARY_NOT_CANONICAL',
    'INPUT_REQUIRED',
    'BACKEND_UNAVAILABLE',
    'FORBIDDEN'
  )),
  route_reason text not null,
  release_id uuid,
  definition_version integer,
  compiler_owner text check (compiler_owner is null or compiler_owner = 'backend'),
  parameter_schema_hash text check (parameter_schema_hash is null or parameter_schema_hash ~ '^[0-9a-f]{64}$'),
  input_hash text check (input_hash is null or input_hash ~ '^[0-9a-f]{64}$'),
  output_revision_id uuid,
  output_hash text check (output_hash is null or output_hash ~ '^[0-9a-f]{64}$'),
  fallback_used boolean not null default false,
  fallback_reason text,
  created_at timestamptz not null default now(),
  constraint estimate_runtime_route_no_admitted_fallback_ck check (
    not (route_decision = 'BACKEND_CANONICAL' and fallback_used)
  )
);

create index estimate_runtime_route_audit_owner_created_idx
  on public.estimate_runtime_route_audit(owner_user_id, created_at desc, id desc);
create index estimate_runtime_route_audit_catalog_created_idx
  on public.estimate_runtime_route_audit(catalog_id, created_at desc, id desc);

create table public.estimate_release_quarantine (
  release_id uuid primary key,
  release_key text not null,
  package_sha256 text not null check (package_sha256 ~ '^[0-9a-f]{64}$'),
  reason text not null,
  status text not null check (status = 'QUARANTINED_PENDING_TRUTH_REMEDIATION'),
  source_commit text not null check (source_commit ~ '^[0-9a-f]{40}$'),
  source_tree text not null check (source_tree ~ '^[0-9a-f]{40}$'),
  activation_allowed boolean not null default false check (not activation_allowed),
  quarantined_at timestamptz not null default now()
);

-- Search is a separately versioned server-owned catalog snapshot. It includes
-- admitted definitions and explicitly labelled preliminary/retired identities;
-- presence in this index never grants professional compile rights.
create table public.estimate_search_index_release (
  id uuid primary key default gen_random_uuid(),
  release_key text not null unique,
  status text not null default 'draft' check (status in ('draft', 'active', 'retired')),
  taxonomy_version text not null,
  group_relation_version text not null,
  ranking_contract_version text not null,
  source_commit text not null check (source_commit ~ '^[0-9a-f]{40}$'),
  source_tree text not null check (source_tree ~ '^[0-9a-f]{40}$'),
  snapshot_sha256 text not null check (snapshot_sha256 ~ '^[0-9a-f]{64}$'),
  global_count integer not null check (global_count >= 0),
  external_count integer not null check (external_count >= 0),
  discovered_count integer not null default 0 check (discovered_count >= 0),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  sealed_at timestamptz,
  activated_at timestamptz,
  constraint estimate_search_release_sealed_ck check (
    (status = 'draft' and sealed_at is null and activated_at is null)
    or (status = 'active' and sealed_at is not null and activated_at is not null)
    or (status = 'retired' and sealed_at is not null)
  )
);

create unique index estimate_search_index_one_active_idx
  on public.estimate_search_index_release ((status)) where status = 'active';

create or replace function public.estimate_search_normalize_r2(p_value text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select trim(regexp_replace(
    replace(lower(coalesce(p_value, '')), 'ё', 'е'),
    '[^0-9a-zа-я]+', ' ', 'g'
  ));
$$;

create table public.estimate_search_group (
  search_release_id uuid not null references public.estimate_search_index_release(id) on delete restrict,
  group_id text not null,
  group_name_ru text not null,
  domain_id text not null,
  system_id text not null,
  subsystem_id text not null,
  assembly_id text not null,
  work_family_id text not null,
  breadcrumb jsonb not null check (jsonb_typeof(breadcrumb) = 'array'),
  member_count integer not null check (member_count >= 0),
  member_set_sha256 text not null check (member_set_sha256 ~ '^[0-9a-f]{64}$'),
  oracle_disposition jsonb not null check (jsonb_typeof(oracle_disposition) = 'object'),
  primary key (search_release_id, group_id)
);

create table public.estimate_search_document (
  search_release_id uuid not null references public.estimate_search_index_release(id) on delete restrict,
  catalog_id text not null,
  domain_id text not null,
  system_id text not null,
  subsystem_id text not null,
  assembly_id text not null,
  work_family_id text not null,
  group_id text not null,
  subgroup_id text,
  element_type text not null,
  operation_kind text not null check (operation_kind in (
    'NEW_INSTALLATION','REPAIR','REPLACEMENT','DEMOLITION','TESTING',
    'COMMISSIONING','MAINTENANCE','DESIGN','SURVEY','OTHER'
  )),
  technology_variant text not null,
  construction_state text not null,
  primary_uom text not null,
  canonical_name_ru text not null,
  aliases text[] not null default '{}',
  normative_classifiers text[] not null default '{}',
  applicability_tags text[] not null default '{}',
  publication_state text not null check (publication_state in (
    'ADMITTED_BACKEND','PRELIMINARY_NOT_CANONICAL','RETIRED'
  )),
  catalog_origin text not null check (catalog_origin in ('GLOBAL','EXTERNAL_D','EXTERNAL_N')),
  definition_release_id uuid references public.estimate_definition_release(id) on delete restrict,
  short_scope_ru text not null,
  key_distinguishing_parameters jsonb not null default '[]'::jsonb
    check (jsonb_typeof(key_distinguishing_parameters) = 'array'),
  required_inputs_count integer not null default 0 check (required_inputs_count >= 0),
  clarification_fields jsonb not null default '[]'::jsonb
    check (jsonb_typeof(clarification_fields) = 'array'),
  included_boundaries jsonb not null default '[]'::jsonb
    check (jsonb_typeof(included_boundaries) = 'array'),
  excluded_boundaries jsonb not null default '[]'::jsonb
    check (jsonb_typeof(excluded_boundaries) = 'array'),
  replacement_catalog_id text,
  normalized_catalog_id text not null,
  normalized_canonical_name text not null,
  normalized_aliases text[] not null default '{}',
  normalized_search_terms text[] not null default '{}',
  normalized_search_blob text not null,
  source_provenance jsonb not null check (jsonb_typeof(source_provenance) = 'object'),
  document_sha256 text not null check (document_sha256 ~ '^[0-9a-f]{64}$'),
  primary key (search_release_id, catalog_id),
  foreign key (search_release_id, group_id)
    references public.estimate_search_group(search_release_id, group_id) on delete restrict
);

create index estimate_search_document_literal_idx
  on public.estimate_search_document(search_release_id, normalized_canonical_name text_pattern_ops, catalog_id);
create index estimate_search_document_group_idx
  on public.estimate_search_document(search_release_id, group_id, canonical_name_ru, catalog_id);
create index estimate_search_document_terms_gin_idx
  on public.estimate_search_document using gin(normalized_search_terms);
create index estimate_search_document_name_trgm_idx
  on public.estimate_search_document using gin(normalized_canonical_name extensions.gin_trgm_ops);
create index estimate_search_document_blob_trgm_idx
  on public.estimate_search_document using gin(normalized_search_blob extensions.gin_trgm_ops);

create table public.estimate_search_group_membership (
  search_release_id uuid not null,
  group_id text not null,
  catalog_id text not null,
  ordinal integer not null check (ordinal >= 0),
  independent_disposition jsonb not null check (jsonb_typeof(independent_disposition) = 'object'),
  primary key (search_release_id, group_id, catalog_id),
  unique (search_release_id, group_id, ordinal),
  foreign key (search_release_id, group_id)
    references public.estimate_search_group(search_release_id, group_id) on delete restrict,
  foreign key (search_release_id, catalog_id)
    references public.estimate_search_document(search_release_id, catalog_id) on delete restrict
);

create table public.estimate_search_typed_relation (
  search_release_id uuid not null,
  source_catalog_id text not null,
  target_catalog_id text not null,
  relationship_type text not null check (relationship_type in (
    'PREREQUISITE','FOLLOW_UP','COMPLEMENTARY','ALTERNATIVE',
    'DEMOLITION_VARIANT','REPAIR_VARIANT','REPLACEMENT_VARIANT',
    'NEW_INSTALLATION_VARIANT','MAINTENANCE_VARIANT',
    'TESTING_OR_COMMISSIONING_VARIANT','EXTERNAL_TYPED_BOUNDARY'
  )),
  direction text not null check (direction in ('OUTBOUND','INBOUND','BIDIRECTIONAL')),
  source_locator text not null,
  applicability_predicate jsonb not null check (jsonb_typeof(applicability_predicate) = 'object'),
  required_when jsonb not null check (jsonb_typeof(required_when) = 'object'),
  mutually_exclusive_with text[] not null default '{}',
  explanation_ru text not null,
  relation_sha256 text not null check (relation_sha256 ~ '^[0-9a-f]{64}$'),
  primary key (search_release_id, source_catalog_id, target_catalog_id, relationship_type),
  check (source_catalog_id <> target_catalog_id),
  foreign key (search_release_id, source_catalog_id)
    references public.estimate_search_document(search_release_id, catalog_id) on delete restrict,
  foreign key (search_release_id, target_catalog_id)
    references public.estimate_search_document(search_release_id, catalog_id) on delete restrict
);

create table public.estimate_search_clarification_question (
  search_release_id uuid not null references public.estimate_search_index_release(id) on delete restrict,
  question_id text not null,
  candidate_set_sha256 text not null check (candidate_set_sha256 ~ '^[0-9a-f]{64}$'),
  candidate_ids text[] not null,
  discriminator_field text not null,
  prompt_ru text not null,
  answer_type text not null,
  unit_id text,
  allowed_options jsonb not null default '[]'::jsonb check (jsonb_typeof(allowed_options) = 'array'),
  option_to_candidate_partition jsonb not null check (jsonb_typeof(option_to_candidate_partition) = 'object'),
  source_role text not null,
  source_locator text not null,
  required boolean not null default true,
  sequence integer not null check (sequence >= 0),
  primary key (search_release_id, question_id)
);

-- Server-owned durable draft. Local storage is permitted only as a transport
-- queue; optimistic_version and idempotency prevent silent overwrite/replay.
create table public.estimate_draft (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  owner_user_id uuid not null default auth.uid(),
  status text not null default 'SEARCHING' check (status in (
    'SEARCHING','DRAFT_INPUT_REQUIRED','READY_TO_COMPILE','COMPILED','ARCHIVED','DELETED'
  )),
  title text not null default '',
  original_query text not null default '',
  normalized_query text not null default '',
  search_filters jsonb not null default '{}'::jsonb check (jsonb_typeof(search_filters) = 'object'),
  ambiguity_answers jsonb not null default '{}'::jsonb check (jsonb_typeof(ambiguity_answers) = 'object'),
  search_index_release_id uuid references public.estimate_search_index_release(id) on delete restrict,
  taxonomy_version text,
  group_relation_version text,
  search_result_set_hash text check (search_result_set_hash is null or search_result_set_hash ~ '^[0-9a-f]{64}$'),
  candidate_set_hash text check (candidate_set_hash is null or candidate_set_hash ~ '^[0-9a-f]{64}$'),
  selected_result_hash text check (selected_result_hash is null or selected_result_hash ~ '^[0-9a-f]{64}$'),
  selected_catalog_ids text[] not null default '{}',
  selected_work_order text[] not null default '{}',
  parameter_schema_versions jsonb not null default '{}'::jsonb check (jsonb_typeof(parameter_schema_versions) = 'object'),
  typed_inputs jsonb not null default '{}'::jsonb check (jsonb_typeof(typed_inputs) = 'object'),
  shared_input_bindings jsonb not null default '{}'::jsonb check (jsonb_typeof(shared_input_bindings) = 'object'),
  unresolved_required_parameters jsonb not null default '[]'::jsonb check (jsonb_typeof(unresolved_required_parameters) = 'array'),
  conflicts jsonb not null default '[]'::jsonb check (jsonb_typeof(conflicts) = 'array'),
  manual_material_rows jsonb not null default '[]'::jsonb check (jsonb_typeof(manual_material_rows) = 'array'),
  manual_price_overrides jsonb not null default '[]'::jsonb check (jsonb_typeof(manual_price_overrides) = 'array'),
  attachment_metadata jsonb not null default '[]'::jsonb check (jsonb_typeof(attachment_metadata) = 'array'),
  active_definition_release_id uuid references public.estimate_definition_release(id) on delete restrict,
  latest_revision_id uuid references public.estimate_revision(id) on delete restrict,
  optimistic_version bigint not null default 1 check (optimistic_version > 0),
  last_device_id text,
  tombstoned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint estimate_draft_selection_order_ck check (
    cardinality(selected_catalog_ids) = cardinality(selected_work_order)
    and selected_catalog_ids <@ selected_work_order
    and selected_work_order <@ selected_catalog_ids
  )
);

create index estimate_draft_owner_history_idx
  on public.estimate_draft(owner_user_id, updated_at desc, id desc);

create table public.estimate_draft_event (
  id bigint generated always as identity primary key,
  draft_id uuid not null references public.estimate_draft(id) on delete restrict,
  owner_user_id uuid not null default auth.uid(),
  idempotency_key text not null,
  base_optimistic_version bigint not null,
  resulting_optimistic_version bigint not null,
  event_kind text not null,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  payload_sha256 text not null check (payload_sha256 ~ '^[0-9a-f]{64}$'),
  device_id text,
  created_at timestamptz not null default now(),
  unique (owner_user_id, idempotency_key),
  unique (draft_id, resulting_optimistic_version)
);

create table public.estimate_operation_definition (
  definition_version_id uuid not null references public.estimate_definition_version(id) on delete restrict,
  operation_id text not null,
  ordinal integer not null check (ordinal >= 0),
  operation_kind text not null check (operation_kind in (
    'WORK','LABOR','EQUIPMENT_USAGE','TEST_OR_COMMISSIONING','SERVICE_OR_LOGISTICS','DOCUMENTATION'
  )),
  technical_operation_name_ru text not null,
  object_and_method text not null,
  preconditions jsonb not null check (jsonb_typeof(preconditions) = 'array'),
  measurement_basis text not null,
  base_unit text not null,
  quantity_formula_id text,
  labor_composition_or_trade jsonb not null check (jsonb_typeof(labor_composition_or_trade) in ('array','object')),
  productivity_or_labor_norm jsonb not null check (jsonb_typeof(productivity_or_labor_norm) = 'object'),
  linked_material_obligations text[] not null default '{}',
  linked_equipment_obligations text[] not null default '{}',
  linked_parameter_ids text[] not null default '{}',
  quality_control_and_acceptance jsonb not null check (jsonb_typeof(quality_control_and_acceptance) = 'array'),
  hidden_work_or_test_documents jsonb not null check (jsonb_typeof(hidden_work_or_test_documents) = 'array'),
  included_boundaries jsonb not null check (jsonb_typeof(included_boundaries) = 'array'),
  excluded_boundaries jsonb not null check (jsonb_typeof(excluded_boundaries) = 'array'),
  normative_applicability jsonb not null check (jsonb_typeof(normative_applicability) = 'array'),
  operation_sha256 text not null check (operation_sha256 ~ '^[0-9a-f]{64}$'),
  primary key (definition_version_id, operation_id),
  unique (definition_version_id, ordinal),
  foreign key (definition_version_id, quantity_formula_id)
    references public.estimate_formula_graph(definition_version_id, formula_id) on delete restrict
);

create or replace function public.estimate_search_catalog_r2(
  p_query text,
  p_filters jsonb default '{}'::jsonb,
  p_after_order_key text default null,
  p_limit integer default 50
)
returns table (
  search_release_id uuid,
  snapshot_sha256 text,
  taxonomy_version text,
  group_relation_version text,
  ranking_contract_version text,
  catalog_id text,
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
  short_scope_ru text,
  key_distinguishing_parameters jsonb,
  required_inputs_count integer,
  clarification_fields jsonb,
  included_boundaries jsonb,
  excluded_boundaries jsonb,
  replacement_catalog_id text,
  match_tier integer,
  match_type text,
  matched_term text,
  matched_field text,
  ranking_reason_ru text,
  literal_total_count bigint,
  global_literal_total_count bigint,
  external_literal_total_count bigint,
  suggestion_total_count bigint,
  result_set_sha256 text,
  order_key text
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
return query execute $search$
with active_release as (
  select r.* from public.estimate_search_index_release r where r.status = 'active'
), normalized as (
  select public.estimate_search_normalize_r2($1) as q
), candidate as materialized (
  select
    r.snapshot_sha256,
    r.taxonomy_version,
    r.group_relation_version,
    r.ranking_contract_version,
    d.*,
    g.group_name_ru,
    case
      when d.normalized_catalog_id = n.q or d.normalized_canonical_name = n.q then 1
      when n.q = any(d.normalized_aliases) then 2
      when d.normalized_canonical_name like n.q || '%' then 3
      when position(n.q in d.normalized_canonical_name) > 0 then 5
      when length(replace(n.q, ' ', '')) > 2 and greatest(
        extensions.similarity(d.normalized_canonical_name, n.q),
        coalesce((select max(extensions.similarity(a, n.q)) from unnest(d.normalized_aliases) a), 0)
      ) >= 0.62 then 6
      else null
    end as tier,
    case
      when d.normalized_catalog_id = n.q then d.catalog_id
      when d.normalized_canonical_name = n.q then d.canonical_name_ru
      when n.q = any(d.normalized_aliases) then coalesce((select a from unnest(d.aliases) a where public.estimate_search_normalize_r2(a) = n.q order by a limit 1), d.canonical_name_ru)
      else d.canonical_name_ru
    end as matched,
    case d.publication_state when 'ADMITTED_BACKEND' then 0 when 'PRELIMINARY_NOT_CANONICAL' then 1 else 2 end as publication_rank
  from active_release r
  join public.estimate_search_document d on d.search_release_id = r.id
  join public.estimate_search_group g on g.search_release_id = d.search_release_id and g.group_id = d.group_id
  cross join normalized n
  where length(replace(n.q, ' ', '')) >= 2
    and (coalesce($2->>'domain_id', '') = '' or d.domain_id = $2->>'domain_id')
    and (coalesce($2->>'group_id', '') = '' or d.group_id = $2->>'group_id')
    and (coalesce($2->>'operation_kind', '') = '' or d.operation_kind = $2->>'operation_kind')
    and (
      d.normalized_catalog_id = n.q
      or d.normalized_canonical_name = n.q
      or n.q = any(d.normalized_aliases)
      or position(n.q in d.normalized_canonical_name) > 0
      or (
        length(replace(n.q, ' ', '')) > 2
        and d.normalized_canonical_name operator(extensions.%) n.q
        and extensions.similarity(d.normalized_canonical_name, n.q) >= 0.62
      )
    )
), matched as materialized (
  select c.*,
    concat_ws(E'\u001f', lpad(c.tier::text, 2, '0'), lpad(c.publication_rank::text, 2, '0'),
      c.domain_id, c.system_id, c.work_family_id, c.normalized_canonical_name, c.catalog_id) as stable_order_key
  from candidate c where c.tier is not null
), summary as (
  select
    count(*) filter (where tier <= 5) as literal_count,
    count(*) filter (where tier <= 5 and catalog_origin = 'GLOBAL') as global_literal_count,
    count(*) filter (where tier <= 5 and catalog_origin <> 'GLOBAL') as external_literal_count,
    count(*) filter (where tier = 6) as suggestion_count,
    encode(extensions.digest(convert_to(coalesce(string_agg(
      concat_ws(E'\u001f', catalog_id, tier::text, matched, stable_order_key),
      E'\n' order by stable_order_key
    ), ''), 'UTF8'), 'sha256'), 'hex') as result_set_sha256
  from matched
), counted as (
  select m.*, s.literal_count, s.global_literal_count, s.external_literal_count,
    s.suggestion_count, s.result_set_sha256
  from matched m cross join summary s
), page as (
  select * from counted
  where $3 is null or stable_order_key > $3
  order by stable_order_key
  limit least(greatest(coalesce($4, 50), 1), 100)
)
select
  p.search_release_id, p.snapshot_sha256, p.taxonomy_version, p.group_relation_version,
  p.ranking_contract_version, p.catalog_id, p.canonical_name_ru, p.group_id,
  p.group_name_ru, p.domain_id, p.system_id, p.subsystem_id, p.assembly_id,
  p.work_family_id, p.element_type, p.operation_kind, p.technology_variant,
  p.primary_uom, p.publication_state, p.catalog_origin, p.short_scope_ru,
  p.key_distinguishing_parameters, p.required_inputs_count, p.clarification_fields,
  p.included_boundaries, p.excluded_boundaries, p.replacement_catalog_id,
  p.tier,
  case p.tier when 1 then 'T1_EXACT' when 2 then 'T2_EXACT_ALIAS'
    when 3 then 'T3_CANONICAL_PREFIX' when 4 then 'T4_TOKEN_PREFIX'
    when 5 then 'T5_NORMALIZED_SUBSTRING' else 'T6_TYPO_TRANSLITERATION_SUGGESTION' end,
  p.matched,
  case when p.normalized_catalog_id = public.estimate_search_normalize_r2($1) then 'catalog_id'
    when p.tier in (1,3,5) then 'canonical_name_ru'
    when p.tier = 2 then 'aliases' else 'searchable_fields' end,
  case p.tier when 1 then 'Точное совпадение идентификатора или названия'
    when 2 then 'Точный зарегистрированный псевдоним'
    when 3 then 'Начало канонического названия'
    when 4 then 'Начало индексированного термина'
    when 5 then 'Буквальное вхождение в индексированное поле'
    else 'Отдельная нечёткая подсказка; не входит в буквальный итог' end,
  p.literal_count, p.global_literal_count, p.external_literal_count,
  p.suggestion_count, p.result_set_sha256, p.stable_order_key
from page p
order by p.stable_order_key
$search$ using p_query, p_filters, p_after_order_key, p_limit;
end;
$$;

create or replace function public.estimate_list_search_group_r2(
  p_group_id text,
  p_after_ordinal integer default null,
  p_limit integer default 50
)
returns table (
  search_release_id uuid,
  snapshot_sha256 text,
  taxonomy_version text,
  group_relation_version text,
  group_id text,
  group_name_ru text,
  member_count integer,
  catalog_id text,
  canonical_name_ru text,
  publication_state text,
  catalog_origin text,
  operation_kind text,
  technology_variant text,
  ordinal integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  select r.id, r.snapshot_sha256, r.taxonomy_version, r.group_relation_version,
    g.group_id, g.group_name_ru, g.member_count, d.catalog_id, d.canonical_name_ru,
    d.publication_state, d.catalog_origin, d.operation_kind, d.technology_variant, m.ordinal
  from public.estimate_search_index_release r
  join public.estimate_search_group g on g.search_release_id = r.id
  join public.estimate_search_group_membership m on m.search_release_id = g.search_release_id and m.group_id = g.group_id
  join public.estimate_search_document d on d.search_release_id = m.search_release_id and d.catalog_id = m.catalog_id
  where r.status = 'active' and g.group_id = p_group_id
    and (p_after_ordinal is null or m.ordinal > p_after_ordinal)
  order by m.ordinal
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;

create or replace function public.estimate_apply_draft_event_r2(
  p_draft_id uuid,
  p_idempotency_key text,
  p_base_optimistic_version bigint,
  p_event_kind text,
  p_patch jsonb,
  p_device_id text default null
)
returns public.estimate_draft
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_draft public.estimate_draft%rowtype;
  v_existing public.estimate_draft_event%rowtype;
  v_payload_hash text;
begin
  if v_actor is null then raise exception using errcode = '28000', message = 'authentication required'; end if;
  if nullif(trim(p_idempotency_key), '') is null then raise exception using errcode = '22023', message = 'idempotency key required'; end if;
  if jsonb_typeof(p_patch) <> 'object' then raise exception using errcode = '22023', message = 'draft patch must be object'; end if;
  v_payload_hash := encode(extensions.digest(convert_to(p_patch::text, 'UTF8'), 'sha256'), 'hex');

  select * into v_existing from public.estimate_draft_event
  where owner_user_id = v_actor and idempotency_key = p_idempotency_key;
  if v_existing.id is not null then
    if v_existing.payload_sha256 <> v_payload_hash or v_existing.draft_id <> p_draft_id then
      raise exception using errcode = '23505', message = 'idempotency conflict';
    end if;
    select * into v_draft from public.estimate_draft where id = p_draft_id and owner_user_id = v_actor;
    return v_draft;
  end if;

  select * into v_draft from public.estimate_draft
  where id = p_draft_id and owner_user_id = v_actor for update;
  if v_draft.id is null then raise exception using errcode = 'P0002', message = 'draft not found'; end if;
  if v_draft.optimistic_version <> p_base_optimistic_version then
    raise exception using errcode = '40001', message = 'draft optimistic version conflict';
  end if;

  update public.estimate_draft set
    status = coalesce(p_patch->>'status', status),
    title = coalesce(p_patch->>'title', title),
    original_query = coalesce(p_patch->>'original_query', original_query),
    normalized_query = coalesce(p_patch->>'normalized_query', normalized_query),
    search_filters = coalesce(p_patch->'search_filters', search_filters),
    ambiguity_answers = coalesce(p_patch->'ambiguity_answers', ambiguity_answers),
    search_result_set_hash = coalesce(p_patch->>'search_result_set_hash', search_result_set_hash),
    candidate_set_hash = coalesce(p_patch->>'candidate_set_hash', candidate_set_hash),
    selected_result_hash = coalesce(p_patch->>'selected_result_hash', selected_result_hash),
    selected_catalog_ids = case when p_patch ? 'selected_catalog_ids'
      then array(select jsonb_array_elements_text(p_patch->'selected_catalog_ids'))
      else selected_catalog_ids end,
    selected_work_order = case when p_patch ? 'selected_work_order'
      then array(select jsonb_array_elements_text(p_patch->'selected_work_order'))
      else selected_work_order end,
    parameter_schema_versions = coalesce(p_patch->'parameter_schema_versions', parameter_schema_versions),
    typed_inputs = coalesce(p_patch->'typed_inputs', typed_inputs),
    shared_input_bindings = coalesce(p_patch->'shared_input_bindings', shared_input_bindings),
    unresolved_required_parameters = coalesce(p_patch->'unresolved_required_parameters', unresolved_required_parameters),
    conflicts = coalesce(p_patch->'conflicts', conflicts),
    manual_material_rows = coalesce(p_patch->'manual_material_rows', manual_material_rows),
    manual_price_overrides = coalesce(p_patch->'manual_price_overrides', manual_price_overrides),
    attachment_metadata = coalesce(p_patch->'attachment_metadata', attachment_metadata),
    optimistic_version = optimistic_version + 1,
    last_device_id = coalesce(p_device_id, last_device_id),
    updated_at = now()
  where id = p_draft_id and owner_user_id = v_actor
  returning * into v_draft;

  insert into public.estimate_draft_event(
    draft_id, owner_user_id, idempotency_key, base_optimistic_version,
    resulting_optimistic_version, event_kind, payload, payload_sha256, device_id
  ) values (
    p_draft_id, v_actor, trim(p_idempotency_key), p_base_optimistic_version,
    v_draft.optimistic_version, p_event_kind, p_patch, v_payload_hash, p_device_id
  );
  return v_draft;
end;
$$;

alter table public.estimate_runtime_route_audit enable row level security;
alter table public.estimate_release_quarantine enable row level security;
alter table public.estimate_search_index_release enable row level security;
alter table public.estimate_search_group enable row level security;
alter table public.estimate_search_document enable row level security;
alter table public.estimate_search_group_membership enable row level security;
alter table public.estimate_search_typed_relation enable row level security;
alter table public.estimate_search_clarification_question enable row level security;
alter table public.estimate_draft enable row level security;
alter table public.estimate_draft_event enable row level security;
alter table public.estimate_operation_definition enable row level security;

create policy estimate_runtime_route_audit_owner_read_r1
on public.estimate_runtime_route_audit for select
using (owner_user_id = auth.uid());

create policy estimate_search_release_read_r2 on public.estimate_search_index_release
for select using (status = 'active');
create policy estimate_search_group_read_r2 on public.estimate_search_group
for select using (exists (
  select 1 from public.estimate_search_index_release r
  where r.id = search_release_id and r.status = 'active'
));
create policy estimate_search_document_read_r2 on public.estimate_search_document
for select using (exists (
  select 1 from public.estimate_search_index_release r
  where r.id = search_release_id and r.status = 'active'
));
create policy estimate_search_membership_read_r2 on public.estimate_search_group_membership
for select using (exists (
  select 1 from public.estimate_search_index_release r
  where r.id = search_release_id and r.status = 'active'
));
create policy estimate_search_relation_read_r2 on public.estimate_search_typed_relation
for select using (exists (
  select 1 from public.estimate_search_index_release r
  where r.id = search_release_id and r.status = 'active'
));
create policy estimate_search_clarification_read_r2 on public.estimate_search_clarification_question
for select using (exists (
  select 1 from public.estimate_search_index_release r
  where r.id = search_release_id and r.status = 'active'
));
create policy estimate_draft_owner_all_r2 on public.estimate_draft
for all using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());
create policy estimate_draft_event_owner_read_r2 on public.estimate_draft_event
for select using (owner_user_id = auth.uid());
create policy estimate_operation_definition_read_r2 on public.estimate_operation_definition
for select using (exists (
  select 1 from public.estimate_definition_version v
  join public.estimate_definition_release r on r.id = v.release_id
  where v.id = definition_version_id and r.status in ('active', 'retired')
));

revoke all on public.estimate_runtime_route_audit from anon, authenticated;
revoke all on public.estimate_release_quarantine from anon, authenticated;
revoke all on public.estimate_search_index_release from anon, authenticated;
revoke all on public.estimate_search_group from anon, authenticated;
revoke all on public.estimate_search_document from anon, authenticated;
revoke all on public.estimate_search_group_membership from anon, authenticated;
revoke all on public.estimate_search_typed_relation from anon, authenticated;
revoke all on public.estimate_search_clarification_question from anon, authenticated;
revoke all on public.estimate_draft from anon, authenticated;
revoke all on public.estimate_draft_event from anon, authenticated;
revoke all on public.estimate_operation_definition from anon, authenticated;
grant select on public.estimate_runtime_route_audit to authenticated;
grant select on public.estimate_search_index_release to authenticated;
grant select on public.estimate_search_group to authenticated;
grant select on public.estimate_search_document to authenticated;
grant select on public.estimate_search_group_membership to authenticated;
grant select on public.estimate_search_typed_relation to authenticated;
grant select on public.estimate_search_clarification_question to authenticated;
grant select, insert on public.estimate_draft to authenticated;
grant select on public.estimate_draft_event to authenticated;
grant select on public.estimate_operation_definition to authenticated;
grant execute on function public.estimate_search_catalog_r2(text, jsonb, text, integer) to authenticated;
grant execute on function public.estimate_list_search_group_r2(text, integer, integer) to authenticated;
grant execute on function public.estimate_apply_draft_event_r2(uuid, text, bigint, text, jsonb, text) to authenticated;
grant all on public.estimate_runtime_route_audit to service_role;
grant all on public.estimate_release_quarantine to service_role;
grant all on public.estimate_search_index_release to service_role;
grant all on public.estimate_search_group to service_role;
grant all on public.estimate_search_document to service_role;
grant all on public.estimate_search_group_membership to service_role;
grant all on public.estimate_search_typed_relation to service_role;
grant all on public.estimate_search_clarification_question to service_role;
grant all on public.estimate_draft to service_role;
grant all on public.estimate_draft_event to service_role;
grant all on public.estimate_operation_definition to service_role;

commit;
