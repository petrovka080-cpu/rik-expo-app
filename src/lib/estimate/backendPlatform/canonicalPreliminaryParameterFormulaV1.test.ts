import { resolveCanonicalPreliminaryParameterFormulasV1 as resolve, stripCanonicalAutomaticPreliminaryInputsV1 as strip, canonicalAutomaticPreliminaryClassificationV1 as classification } from './canonicalPreliminaryParameterFormulaV1';
import type { CanonicalEstimateParameterDefinition as Parameter } from './canonicalEstimateCompileCore';

const parameter = (id: string, expression?: string): Parameter => ({ parameter_id: id, value_type: 'decimal', required: false,
  default_value: null, constraints_json: {}, truth_metadata: expression == null ? {} : {
    value_source_role: 'VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE', runtime_profile_classification: 'PRELIMINARY_SOURCE_FORMULA',
    guide: { source_document: 'verified-primary-manufacturer', source_locator: 'preliminary table, page100', source_snapshot_hash: 'a'.repeat(64) },
    preliminary_value_formula_v1: { version: 'canonical-preliminary-parameter-formula:v1', expression,
      when: { kind: 'greater_than', parameterId: 'area_m2', value: 0 } },
  } });
describe('source-bound preliminary parameters in the canonical decimal owner', () => {
  const definitions = [parameter('ordered', 'ceil(consumed/42)*42'), parameter('consumed', 'area_m2*1.15'), parameter('area_m2')];
  test('resolves dependencies independently of declaration order and never derives missing dimensions', () => {
    expect(resolve(definitions, { area_m2: 75 })).toEqual({ area_m2: 75, consumed: '86.25', ordered: '126' });
    expect(resolve(definitions, {})).toEqual({});
  });
  test('recalculates automatic values after a size change while preserving explicit project overrides', () => {
    const previous = resolve(definitions, { area_m2: 75 });
    expect(resolve(definitions, { ...strip(definitions, previous, { area_m2: 75 }), area_m2: 5000 }))
      .toEqual({ area_m2: 5000, consumed: '5750', ordered: '5754' });
    expect(resolve(definitions, strip(definitions, { ...previous, consumed: 80.5 }, { area_m2: 75, consumed: 80.5 })))
      .toEqual({ area_m2: 75, consumed: 80.5, ordered: '84' });
  });
  test('does not silently accept cycles, unbound sources or incompatible parameter types even with an override', () => {
    expect(() => resolve([parameter('area_m2'), parameter('a', 'b'), parameter('b', 'a')], { a: 10 }))
      .toThrow('cycle');
    const invalid = parameter('consumed', 'area_m2*1.15');
    (invalid.truth_metadata!.guide as Record<string, unknown>).source_snapshot_hash = 'unverified';
    expect(() => resolve([parameter('area_m2'), invalid], { consumed: 10 })).toThrow('invalid');
    expect(() => resolve([parameter('area_m2'), { ...parameter('consumed', 'area_m2*1.15'), value_type: 'text' }], {})).toThrow('invalid');
  });
  test('an unresolved or incompatible system remains unresolved without inventing a substitute', () => {
    const guarded = parameter('consumed', 'area_m2*1.15');
    (guarded.truth_metadata!.preliminary_value_formula_v1 as Record<string, unknown>).when = { kind: 'equals', parameterId: 'system', value: 'verified' };
    const schema = [parameter('area_m2'), { ...parameter('system'), value_type: 'enum' }, guarded];
    expect(resolve(schema, { area_m2: 75 })).toEqual({ area_m2: 75 });
    expect(resolve(schema, { area_m2: 75, system: 'other' })).toEqual({ area_m2: 75, system: 'other' });
  });
  test('validation fixtures cannot hide the automatic policy in the catalogue transport', () => {
    expect(classification({ runtime_profile_classification: 'PRELIMINARY_SOURCE_FORMULA' }, 'VALIDATION_FIXTURE')).toBe('PRELIMINARY_SOURCE_FORMULA');
    expect(classification({ runtime_profile_classification: 'legacy' }, 'ASSUMPTION')).toBe('ASSUMPTION');
  });
});
