import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import type { CanonicalEstimateCatalogItem } from './contracts';
import { canonicalApprovedBaselineRuntimeParameters } from './canonicalEstimateApprovedBaseline';

const bytes = readFileSync(resolve(__dirname, '../../../../data/estimate-benchmarks/fixtures/facade-ventilated-actual-catalog-r51.json'));
assert.equal(createHash('sha256').update(bytes).digest('hex'), '6907966c6d6f8c3ac449ef1c924e974d317c62c076968305c76b1680b8d795b6');
const catalog: CanonicalEstimateCatalogItem = JSON.parse(bytes.toString('utf8'));
const selector = catalog.parameterSchema.find(parameter => parameter.parameterId === 'ventilated_cladding_exact_source_profile');
assert(selector && Array.isArray(selector.constraints.values));
const choices = selector.constraints.values;
const values = { floors: 15, facade_area_m2: 5000, source_prompt: 'Сохранённый исходный пример' };
const baseline = { input_values: values, input_classification: { floors: 'ASSUMPTION', facade_area_m2: 'ASSUMPTION', source_prompt: 'ASSUMPTION' } };
const definitions = catalog.parameterSchema.map(parameter => ({ parameter_id: parameter.parameterId,
  value_type: parameter.valueType, constraints_json: parameter.constraints,
  truth_metadata: { visible_when: parameter.visibleWhen, visibility_role: parameter.visibilityRole, value_source_role: parameter.valueSourceRole } }));
const context = (inputParameters: Record<string, unknown>) => ({ parameterDefinitions: definitions, inputParameters });

it.each([1, 2])('does not insert the actual old15-storey5000m2 example into a new facade branch%d', index => {
  const before = JSON.stringify({ baseline, definitions });
  expect(canonicalApprovedBaselineRuntimeParameters(baseline, context({ [selector.parameterId]: choices[index] }))).toEqual({});
  expect(JSON.stringify({ baseline, definitions })).toBe(before);
});

it('preserves the exact example only inside its explicitly selected legacy branch', () => {
  expect(canonicalApprovedBaselineRuntimeParameters(baseline, context({ [selector.parameterId]: choices[0] }))).toEqual(values);
});

it('does not select the historical project from a missing actual choice', () => {
  expect(canonicalApprovedBaselineRuntimeParameters(baseline, context({}))).toEqual({});
});

it('does not treat a validation-only selector in the baseline as an actual user choice', () => {
  const fixture = { input_values: { ...values, [selector.parameterId]: choices[0] },
    input_classification: { ...baseline.input_classification, [selector.parameterId]: 'VALIDATION_FIXTURE' } };
  expect(canonicalApprovedBaselineRuntimeParameters(fixture, context({}))).toEqual({});
});

it('preserves unscoped assumptions, normative values and unclassified historical behavior', () => {
  const mixed = { input_values: { unscoped: 3, normative: 2, historical: 1, fixture: 9 },
    input_classification: { unscoped: 'ASSUMPTION', normative: 'NORMATIVE', fixture: 'VALIDATION_FIXTURE' } };
  const scope = { parameterDefinitions: [{ parameter_id: 'normative', truth_metadata: { visible_when: { kind: 'literal', value: false } } }], inputParameters: {} };
  expect(canonicalApprovedBaselineRuntimeParameters(mixed, scope)).toEqual({ unscoped: 3, normative: 2, historical: 1 });
  expect(canonicalApprovedBaselineRuntimeParameters(baseline)).toEqual(values);
});

it('preserves historical behavior for scopes outside the finite published-choice declaration', () => {
  const scope = { parameterDefinitions: [{ parameter_id: 'floors', truth_metadata: { visible_when: 'UNSUPPORTED_SCOPE' } }], inputParameters: {} };
  expect(canonicalApprovedBaselineRuntimeParameters({ input_values: { floors: 15 }, input_classification: { floors: 'ASSUMPTION' } }, scope)).toEqual({ floors: 15 });
});
