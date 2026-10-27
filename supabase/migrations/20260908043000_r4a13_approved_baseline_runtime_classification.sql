-- R4-A13-1: distinguish validation fixtures from values permitted in a new runtime estimate.
-- Forward-only. Existing immutable baselines and historical revisions are not rewritten.

begin;

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
        or p_classification->>parameter_id not in (
          'ASSUMPTION',
          'NORMATIVE',
          'DERIVED',
          'FIXTURE_ONLY',
          'VALIDATION_FIXTURE',
          'TEST_ONLY',
          'RUNTIME_STRUCTURAL_DEFAULT'
        )
        or not (p_uom ? parameter_id)
        or jsonb_typeof(p_formula_consumers->parameter_id) <> 'array'
        or jsonb_typeof(p_resource_consumers->parameter_id) <> 'array'
        or jsonb_array_length(p_resource_consumers->parameter_id) = 0
        or jsonb_typeof(p_normative_sources->parameter_id) <> 'array'
        or nullif(trim(p_guides->>parameter_id), '') is null
    );
$$;

comment on function public.estimate_approved_template_baseline_valid_r54(
  jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb
) is 'R4-A13-1 validates immutable baseline evidence while distinguishing runtime-eligible values from validation-only fixtures.';

commit;
