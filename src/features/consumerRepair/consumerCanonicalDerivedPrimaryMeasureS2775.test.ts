import type { CanonicalEstimateCatalogItem } from '../../lib/estimate/backendPlatform/contracts';
import {buildCanonicalBaselinePlan} from '../../lib/estimate/backendPlatform/canonicalConsumerPromptPlanServerR1';

type Parameter = CanonicalEstimateCatalogItem['parameterSchema'][number];
const primary = 'effective_resource_quantity_review_installed_area';
const length = 'surface_length_along_rows_mm';
const width = 'surface_width_across_rows_mm';
const geometry = { [length]: '6000', [width]: '4000' };
const ordinary = (id: string, ordinal: number): Parameter => ({
  parameterId: id, ordinal, valueType: 'integer', unitId: 'mm',
  titleRu: ordinal === 0 ? 'Длина участка, мм' : 'Ширина участка, мм',
  required: true, defaultValue: null, constraints: { min: 1 },
  visibilityRole: 'USER_INPUT', valueSourceRole: 'USER_INPUT',
  preliminaryCompilationAllowed: true, provenance: { consumer_input_role_v1: 'OBJECT_FACT' },
  formulaConsumers: ['review:formula:installed-area'],
});
function catalog(): CanonicalEstimateCatalogItem {
  return {
    catalogId: 'canonical-work:review-only:derived-primary-interface',
    releaseId: '00000000-0000-5000-8000-000000000001', namespace: 'global', domain: 'landscaping',
    workKey: 'review_only_derived_primary_interface', titleRu: 'Площадь покрытия', definitionVersion: 1,
    applicability: { primaryMeasureParameterId: primary }, professionalMetadata: {},
    parameterSchema: [ordinary(length, 0), ordinary(width, 1), {
      parameterId: primary, ordinal: 2, valueType: 'decimal', unitId: 'm2', titleRu: 'Вычисленная площадь',
      required: false, defaultValue: null, constraints: {}, visibilityRole: 'INTERNAL_ONLY',
      valueSourceRole: 'COMPILER_DERIVED_RESOURCE_QUANTITY', formulaConsumers: ['review:formula:consume-area'],
    }],
  };
}
const run = (c = catalog(), inputs: Record<string, string> = geometry, prompt = 'Материалы прямоугольного участка') =>
  buildCanonicalBaselinePlan({ catalog: c, prompt, parameterOverrides: inputs });

describe('declared compiler-derived primary measure', () => {
  it('selects the internal m2 identity while submitting only ordinary mm measurements', () => {
    expect(run()).toMatchObject({ primaryMeasureParameterId: primary, parameters: geometry });
    const c = catalog(); c.parameterSchema[2].valueType = 'integer';
    expect(run(c).primaryMeasureParameterId).toBe(primary);
  });

  it('does not accept a prompt area or manual internal output as a measured input', () => {
    const plan = run(catalog(), { ...geometry, [primary]: '999' }, 'Площадь 24 м²');
    expect(plan.primaryMeasureParameterId).toBe(primary);
    expect(plan.parameters).toEqual(geometry);
    expect(plan.parameters).not.toHaveProperty(primary);
  });

  const rejectedDeclarations: Array<[string, Partial<Parameter>]> = [
    ['text output', { valueType: 'text' }],
    ['readonly input', { visibilityRole: 'USER_DERIVED_READONLY' }],
    ['unresolved norm', { valueSourceRole: 'UNRESOLVED_APPLICATION_NORM' }],
    ['ordinary backend output', { valueSourceRole: 'BACKEND_DERIVED' }],
    ['blank unit', { unitId: ' ' }],
    ['missing consumers', { formulaConsumers: undefined }],
    ['empty consumers', { formulaConsumers: [] }],
    ['blank consumer', { formulaConsumers: [' '] }],
  ];
  it.each(rejectedDeclarations)('does not select an invalid declared %s', (_name, overrides) => {
    const c = catalog(); c.parameterSchema[2] = { ...c.parameterSchema[2], ...overrides };
    expect(run(c).primaryMeasureParameterId).toBe(length);
  });

  it.each([null, 'unknown-parameter'])('retains the ordinary fallback for declaration %s', declaration => {
    const c = catalog(); c.applicability = declaration == null ? {} : { primaryMeasureParameterId: declaration };
    expect(run(c).primaryMeasureParameterId).toBe(length);
  });

  const missingMeasurements: Array<[Record<string, string>, string[]]> = [
    [{}, [length, width]], [{ [length]: '6000' }, [width]], [{ [width]: '4000' }, [length]],
  ];
  it.each(missingMeasurements)('opens the existing input form for missing ordinary geometry %j', (inputs, missing) => {
    let caught: unknown;
    try { run(catalog(), inputs, 'Площадь 24 м²'); } catch (error) { caught = error; }
    expect(caught).toMatchObject({ name: 'CanonicalBaselineContractMissingError', missingParameterIds: missing });
    expect(caught).not.toMatchObject({ missingParameterIds: [primary] });
  });

  it('keeps invalid supplied geometry blocking through the existing validator', () => {
    expect(() => run(catalog(), { ...geometry, [length]: '-1' })).toThrow('CANONICAL_BASELINE_CONTRACT_MISSING:MIN');
  });

  it('leaves conditional facts and application-owned norms as preliminary needs', () => {
    const c = catalog();
    c.parameterSchema.push({ parameterId: 'project_condition', ordinal: 3, valueType: 'text', unitId: null,
      titleRu: 'Условие площадки', required: true, defaultValue: null, constraints: {},
      visibilityRole: 'USER_INPUT', valueSourceRole: 'CONDITIONAL_PROJECT_FACT', preliminaryCompilationAllowed: true,
      provenance: { consumer_input_role_v1: 'OBJECT_FACT' }, formulaConsumers: ['review:formula:order'] });
    c.parameterSchema.push({ parameterId: 'unresolved_labor', ordinal: 4, valueType: 'decimal', unitId: 'man_hour',
      titleRu: 'Норма труда', required: true, defaultValue: null, constraints: {},
      visibilityRole: 'INTERNAL_ONLY', valueSourceRole: 'UNRESOLVED_APPLICATION_NORM', formulaConsumers: ['review:formula:labor'] });
    expect(run(c).parameters).toEqual(geometry);
  });

  it('preserves an explicitly declared ordinary user quantity', () => {
    const c = catalog(); c.applicability = { primaryMeasureParameterId: 'area_m2' };
    c.parameterSchema = [{ parameterId: 'area_m2', ordinal: 0, valueType: 'decimal', unitId: 'm2',
      titleRu: 'Площадь участка', required: true, defaultValue: null, constraints: { min: 0.01 },
      visibilityRole: 'USER_INPUT', valueSourceRole: 'USER_INPUT', formulaConsumers: ['review:formula:area'] }];
    expect(run(c, {}, 'Площадь участка 24 м²')).toMatchObject({ primaryMeasureParameterId: 'area_m2', parameters: { area_m2: '24' } });
  });
});
