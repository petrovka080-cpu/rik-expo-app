-- P0 ONE MONOLITH R5.4: immutable per-work approved template baselines.
-- Forward-only candidate migration. Existing releases and revisions are never updated.

begin;

create table public.estimate_approved_template_baseline (
  id uuid primary key,
  baseline_key text not null unique,
  catalog_id text not null,
  definition_version_id uuid not null unique
    references public.estimate_definition_version(id) on delete restrict,
  source_definition_version_id uuid not null
    references public.estimate_definition_version(id) on delete restrict,
  parameter_schema_sha256 text not null check (parameter_schema_sha256 ~ '^[0-9a-f]{64}$'),
  input_values jsonb not null check (jsonb_typeof(input_values) = 'object'),
  input_classification jsonb not null check (jsonb_typeof(input_classification) = 'object'),
  uom_by_parameter jsonb not null check (jsonb_typeof(uom_by_parameter) = 'object'),
  formula_consumer_ids jsonb not null check (jsonb_typeof(formula_consumer_ids) = 'object'),
  resource_consumer_row_ids jsonb not null check (jsonb_typeof(resource_consumer_row_ids) = 'object'),
  normative_source_ids jsonb not null check (jsonb_typeof(normative_source_ids) = 'object'),
  guide_provenance_ru jsonb not null check (jsonb_typeof(guide_provenance_ru) = 'object'),
  proposal_source_refs jsonb not null check (
    jsonb_typeof(proposal_source_refs) = 'array' and jsonb_array_length(proposal_source_refs) > 0
  ),
  validation_scenario_refs jsonb not null check (
    jsonb_typeof(validation_scenario_refs) = 'array' and jsonb_array_length(validation_scenario_refs) > 0
  ),
  acceptance_evidence_sha256 text not null check (acceptance_evidence_sha256 ~ '^[0-9a-f]{64}$'),
  accepted_release_id uuid not null
    references public.estimate_definition_release(id) on delete restrict,
  accepted_at timestamptz not null,
  supersedes_baseline_id uuid references public.estimate_approved_template_baseline(id) on delete restrict,
  contract_version text not null check (contract_version = 'APPROVED_TEMPLATE_BASELINE_R54_V1'),
  unique (catalog_id, source_definition_version_id, parameter_schema_sha256),
  check (supersedes_baseline_id is null or supersedes_baseline_id <> id)
);

create or replace function public.estimate_approved_template_baseline_valid_r54(
  p_input_values jsonb,
  p_classification jsonb,
  p_uom jsonb,
  p_formula_consumers jsonb,
  p_resource_consumers jsonb,
  p_normative_sources jsonb,
  p_guides jsonb
)
returns boolean
language sql
immutable
parallel safe
set search_path = ''
as $$
  select
    jsonb_typeof(p_input_values) = 'object'
    and exists (select 1 from jsonb_object_keys(p_input_values))
    and not exists (
      select 1
      from jsonb_object_keys(p_input_values) as key(parameter_id)
      where parameter_id like 'unit_price_%'
        or parameter_id in ('price_basis_reference', 'price_basis_date')
        or p_classification->>parameter_id not in ('ASSUMPTION', 'NORMATIVE', 'DERIVED')
        or not (p_uom ? parameter_id)
        or jsonb_typeof(p_formula_consumers->parameter_id) <> 'array'
        or jsonb_typeof(p_resource_consumers->parameter_id) <> 'array'
        or jsonb_array_length(p_resource_consumers->parameter_id) = 0
        or jsonb_typeof(p_normative_sources->parameter_id) <> 'array'
        or nullif(trim(p_guides->>parameter_id), '') is null
    );
$$;

alter table public.estimate_approved_template_baseline
  add constraint estimate_approved_template_baseline_payload_r54_ck check (
    public.estimate_approved_template_baseline_valid_r54(
      input_values,
      input_classification,
      uom_by_parameter,
      formula_consumer_ids,
      resource_consumer_row_ids,
      normative_source_ids,
      guide_provenance_ru
    )
  );

create or replace function public.estimate_approved_template_baseline_immutable_r54()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception using errcode = '55000', message = 'APPROVED_TEMPLATE_BASELINE is immutable';
end;
$$;

create trigger estimate_approved_template_baseline_immutable_r54_trg
before update or delete on public.estimate_approved_template_baseline
for each row execute function public.estimate_approved_template_baseline_immutable_r54();

alter table public.estimate_parameter_definition
  add column approved_template_baseline_id uuid
    references public.estimate_approved_template_baseline(id) on delete restrict;

alter table public.estimate_parameter_definition
  drop constraint if exists estimate_parameter_default_accepted_provenance_r53_ck;

alter table public.estimate_parameter_definition
  add constraint estimate_parameter_default_authoritative_provenance_r54_ck
  check (
    default_value is null
    or (
      truth_metadata->>'value_source_role' = 'VISIBLE_BASELINE_ASSUMPTION'
      and nullif(trim(truth_metadata->>'baseline_assumption_id'), '') is not null
      and nullif(trim(truth_metadata#>>'{provenance,sourceCatalogId}'), '') is not null
      and nullif(trim(truth_metadata#>>'{provenance,sourceReleaseId}'), '') is not null
      and nullif(trim(truth_metadata#>>'{provenance,sourceDefinitionVersionId}'), '') is not null
      and nullif(trim(truth_metadata#>>'{provenance,sourceParameterSchemaId}'), '') is not null
      and jsonb_typeof(truth_metadata->'formula_consumers') = 'array'
      and jsonb_typeof(truth_metadata->'resource_branch_consumers') = 'array'
      and jsonb_array_length(truth_metadata->'resource_branch_consumers') > 0
      and (
        (
          truth_metadata#>>'{provenance,baselineOwner}' = 'accepted-batch-formula-graph-v3-baseline:r53'
          and approved_template_baseline_id is null
          and jsonb_typeof(truth_metadata#>'{provenance,acceptedTraceBindings}') = 'array'
          and jsonb_array_length(truth_metadata#>'{provenance,acceptedTraceBindings}') > 0
        )
        or (
          truth_metadata#>>'{provenance,baselineOwner}' = 'approved-template-baseline:r54'
          and approved_template_baseline_id is not null
          and truth_metadata#>>'{provenance,approvedTemplateBaselineId}' = approved_template_baseline_id::text
          and coalesce(truth_metadata#>>'{provenance,acceptanceEvidenceSha256}', '') ~ '^[0-9a-f]{64}$'
          and jsonb_typeof(truth_metadata#>'{provenance,approvedTemplateBinding}') = 'object'
        )
      )
    )
  ) not valid;

create or replace function public.estimate_parameter_approved_template_binding_r54()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_baseline public.estimate_approved_template_baseline%rowtype;
  v_catalog_id text;
begin
  if new.default_value is null
    or new.truth_metadata#>>'{provenance,baselineOwner}' <> 'approved-template-baseline:r54' then
    return new;
  end if;

  if new.approved_template_baseline_id is null then
    raise exception using errcode = '23514', message = 'approved template baseline id is required';
  end if;

  select * into v_baseline
  from public.estimate_approved_template_baseline
  where id = new.approved_template_baseline_id;

  select catalog_id into v_catalog_id
  from public.estimate_definition_version
  where id = new.definition_version_id;

  if v_baseline.id is null
    or v_baseline.definition_version_id <> new.definition_version_id
    or v_baseline.catalog_id <> v_catalog_id
    or v_baseline.catalog_id <> new.truth_metadata#>>'{provenance,sourceCatalogId}'
    or v_baseline.source_definition_version_id::text <> new.truth_metadata#>>'{provenance,sourceDefinitionVersionId}'
    or v_baseline.parameter_schema_sha256 <> new.truth_metadata#>>'{provenance,sourceParameterSchemaId}'
    or v_baseline.acceptance_evidence_sha256 <> new.truth_metadata#>>'{provenance,acceptanceEvidenceSha256}'
    or not (v_baseline.input_values ? new.parameter_id)
    or v_baseline.input_values->new.parameter_id is distinct from new.default_value
  then
    raise exception using errcode = '23514', message = 'approved template baseline binding mismatch';
  end if;
  return new;
end;
$$;

create trigger estimate_parameter_approved_template_binding_r54_trg
before insert or update of default_value, truth_metadata, approved_template_baseline_id
on public.estimate_parameter_definition
for each row execute function public.estimate_parameter_approved_template_binding_r54();

alter table public.estimate_approved_template_baseline enable row level security;
revoke all on public.estimate_approved_template_baseline from anon, authenticated;
grant select on public.estimate_approved_template_baseline to authenticated;
grant all on public.estimate_approved_template_baseline to service_role;

create policy estimate_approved_template_baseline_read_r54
on public.estimate_approved_template_baseline for select
using (exists (
  select 1
  from public.estimate_definition_release r
  where r.id = accepted_release_id and r.status in ('active', 'retired')
));

commit;
