import type { CanonicalEstimateCatalogItem } from '../../lib/estimate/backendPlatform/contracts';
import { buildConsumerCanonicalParameterSession, buildConsumerCanonicalPrecompileParameterSession,
  consumerCanonicalPrecompileParameterOverrides } from './consumerCanonicalParameterEditor';

type Schema = CanonicalEstimateCatalogItem['parameterSchema'][number];
const areaId = 'actual_surface_area_m2', selectorId = 'source_profile', copyId = 'source_surface_area_m2';
const coatId = 'coating_area_m2', deepId = 'deep_repair_area_m2';
const selector = (value: string) => ({ kind: 'equals', parameterId: selectorId, value });
const area: Schema = { parameterId: areaId, semanticParameterKey: 'work:' + areaId,
  titleRu: 'Площадь поверхности', ordinal: 0, valueType: 'decimal', unitId: 'm2', required: true,
  defaultValue: null, constraints: { min: 0.01 }, visibilityRole: 'USER_INPUT', valueSourceRole: 'USER_INPUT',
  provenance: { consumer_input_role_v1: 'OBJECT_FACT' }, formulaConsumers: ['source-profile'], resourceBranchConsumers: [] };
const profile: Schema = { ...area, parameterId: selectorId, semanticParameterKey: 'work:' + selectorId,
  titleRu: 'Внутренний профиль', ordinal: 1, valueType: 'enum', unitId: null, required: false,
  constraints: { values: ['SMALL', 'LARGE'] }, visibilityRole: 'INTERNAL_ONLY',
  valueSourceRole: 'SOURCE_BACKED_PRELIMINARY_PROFILE', provenance: { consumer_input_role_v1: 'APPLICATION_TECHNICAL' } };
const copy: Schema = { ...area, parameterId: copyId, semanticParameterKey: 'work:' + copyId,
  titleRu: 'Внутренняя площадь', ordinal: 2, required: false, visibilityRole: 'INTERNAL_ONLY', valueSourceRole: 'BACKEND_DERIVED',
  provenance: { consumer_input_role_v1: 'APPLICATION_TECHNICAL', source_geometry_copy_v1: {
    contract: 'canonical-source-geometry-copy/v1', fromParameterId: areaId, unitId: 'm2' } } };
const coat: Schema = { ...area, parameterId: coatId, semanticParameterKey: 'work:' + coatId,
  titleRu: 'Площадь покрытия', ordinal: 3, required: false, formulaConsumers: ['coating'],
  visibleWhen: { kind: 'and', operands: [selector('SMALL'), { kind: 'greater_than', parameterId: copyId, value: 0 }] },
  constraints: { min: 0.01, requiredWhen: selector('SMALL') } };
const deep: Schema = { ...area, parameterId: deepId, semanticParameterKey: 'work:' + deepId,
  titleRu: 'Площадь глубокого ремонта', ordinal: 4, required: false, formulaConsumers: ['repair'],
  visibleWhen: selector('LARGE'), constraints: { min: 0.01, requiredWhen: selector('LARGE') } };
const catalog = (): CanonicalEstimateCatalogItem => ({ catalogId: 'TEST_ONLY_PROFILE_VISIBILITY', releaseId: 'test-release',
  namespace: 'global', workKey: 'profile-visibility', titleRu: 'Ремонт поверхности', domain: 'concrete', definitionVersion: 1,
  professionalMetadata: {}, parameterSchema: [area, profile, copy, coat, deep], applicability: { sourceProfileSelectionV1: {
    contract: 'canonical-source-profile-selection/v1', selectorParameterId: selectorId, geometryParameterIds: [areaId],
    profiles: [
      { selectorValue: 'SMALL', when: { kind: 'less_than_or_equal', parameterId: areaId, value: 200 },
        sources: [{ sourceId: 'TEST_ONLY_SMALL', artifactSha256: '1'.repeat(64), locator: 'TEST_ONLY source case' }],
        geometryCopies: [{ fromParameterId: areaId, toParameterId: copyId }] },
      { selectorValue: 'LARGE', when: { kind: 'greater_than', parameterId: areaId, value: 200 },
        sources: [{ sourceId: 'TEST_ONLY_LARGE', artifactSha256: '2'.repeat(64), locator: 'TEST_ONLY source case' }],
        geometryCopies: [{ fromParameterId: areaId, toParameterId: copyId }] },
    ],
  } } });
const precompile = (parameters: Record<string, string | number>, source = catalog()) =>
  buildConsumerCanonicalPrecompileParameterSession({ catalog: source, draftId: 'test-draft', parameters,
    missingParameterIds: [], userExplicitParameterIds: Object.keys(parameters), textExtractedParameterIds: [] });
const saved = (parameters: Record<string, unknown>, baseline: Record<string, unknown> = {}) => {
  const source = catalog();
  return buildConsumerCanonicalParameterSession({ catalog: source, draftId: 'test-draft', revision: {
    revisionId: 'TEST_ONLY_SAVED_SHAPE', parentRevisionId: null, releaseId: source.releaseId, catalogId: source.catalogId,
    status: 'ready', parameters, userInputSnapshot: Object.fromEntries(Object.entries(parameters)
      .filter(([id]) => ![selectorId, copyId].includes(id))), acceptedBaselineSnapshot: baseline,
    compilerVersion: 'TEST_ONLY', checksumSha256: 'a'.repeat(64), createdAt: '2026-10-24T00:00:00Z',
  } });
};
const ids = (session: ReturnType<typeof precompile>) => session.parameters.map(parameter => parameter.parameterId);

it('uses source-owned selector and geometry only for precompile conditions and exports only public facts', () => {
  const source = catalog(), before = JSON.stringify(source);
  const session = precompile({ [areaId]: 100, [coatId]: 25 }, source);
  expect(ids(session)).toEqual([areaId, coatId]);
  expect(session.parameters.find(parameter => parameter.parameterId === coatId)).toMatchObject({ value: 25, valid: true });
  expect(consumerCanonicalPrecompileParameterOverrides({ session, patches: [] })).toEqual({ [areaId]: 100, [coatId]: 25 });
  expect(JSON.stringify(source)).toBe(before);
});

it('recomputes saved visibility from current user geometry rather than a stale saved branch or geometry copy', () => {
  const small = saved({ [areaId]: 100, [coatId]: 25, [deepId]: 40, [selectorId]: 'LARGE', [copyId]: 999 });
  const large = saved({ [areaId]: 300, [coatId]: 25, [deepId]: 40, [selectorId]: 'SMALL', [copyId]: 1 });
  expect(ids(small)).toEqual([areaId, coatId]);
  expect(ids(large)).toEqual([areaId, deepId]);
});

it('does not select a profile from saved baseline, defaults or missing actual geometry', () => {
  const source = catalog(); source.parameterSchema = source.parameterSchema.map(parameter => parameter.parameterId === areaId
    ? { ...parameter, defaultValue: 100 } : parameter);
  expect(ids(precompile({ [coatId]: 25 }, source))).toEqual([areaId]);
  expect(ids(saved({ [coatId]: 25, [selectorId]: 'SMALL', [copyId]: 100 }, { [areaId]: 100 }))).toEqual([areaId]);
});

it.each([0, 'invalid'])('keeps invalid actual geometry %s available for correction without deriving a false branch', value => {
  const session = precompile({ [areaId]: value, [coatId]: 25 });
  expect(ids(session)).toContain(areaId);
  expect(ids(session)).not.toContain(coatId);
  expect(ids(session)).not.toContain(selectorId);
  expect(session.status).not.toBe('COMPLETE');
});

it('cannot change condition context with a raw source-owned selector or geometry-copy echo', () => {
  const session = precompile({ [areaId]: 100, [coatId]: 25, [deepId]: 40,
    [selectorId]: 'LARGE', [copyId]: 999 });
  expect(ids(session)).toEqual([areaId, coatId]);
});
