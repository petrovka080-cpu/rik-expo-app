import type { CanonicalEstimateCatalogItem } from '../../lib/estimate/backendPlatform/contracts';
import { buildConsumerCanonicalPrecompileParameterSession, consumerCanonicalPrecompileParameterOverrides } from './consumerCanonicalParameterEditor';

type Schema = CanonicalEstimateCatalogItem['parameterSchema'][number];
const choice: Schema = { parameterId: 'physical_part', semanticParameterKey: 'TEST_ONLY:physical_part', titleRu: 'Часть конструкции',
  ordinal: 0, valueType: 'enum', unitId: null, required: false, defaultValue: null,
  constraints: { values: ['LEGACY', 'LANDING'] }, visibilityRole: 'USER_INPUT', valueSourceRole: 'PROJECT_SPECIFIC_INPUT',
  provenance: { consumer_input_role_v1: 'OBJECT_FACT' }, formulaConsumers: [], resourceBranchConsumers: ['TEST_ONLY:cycle'],
  guide: { guideKind: 'PROJECT_DEFINED', sourceRole: 'PROJECT_DOCUMENTATION', guideShortRu: 'Выберите часть конструкции.',
    guideVersion: 'TEST_ONLY', guideValidationPolicy: 'MANDATORY_BLOCK', sourceDocument: 'TEST_ONLY',
    sourceLocator: 'TEST_ONLY_FINITE_SCOPE', sourceSnapshotHash: 'a'.repeat(64),
    applicability: 'TEST_ONLY: конечный выбор части конструкции.', verifiedAt: '2026-10-24T00:00:00Z' } };
const oldFact = (visibleWhen: Schema['visibleWhen']): Schema => ({ ...choice, parameterId: 'legacy_length',
  semanticParameterKey: 'TEST_ONLY:legacy_length', titleRu: 'Длина прежней конструкции', ordinal: 1,
  valueType: 'decimal', unitId: 'm', constraints: { min: 0.01 }, formulaConsumers: ['TEST_ONLY:legacy'], visibleWhen });
const session = (visibleWhen: Schema['visibleWhen'], values: Record<string, string | number>) => {
  const catalog: CanonicalEstimateCatalogItem = { catalogId: 'TEST_ONLY_FINITE_MEMBERSHIP', releaseId: 'TEST_ONLY', namespace: 'global',
    workKey: 'finite-membership', titleRu: 'Конструкция', domain: 'concrete', definitionVersion: 1, professionalMetadata: {},
    parameterSchema: [choice, oldFact(visibleWhen)], applicability: {} };
  return buildConsumerCanonicalPrecompileParameterSession({ catalog, draftId: 'TEST_ONLY', parameters: values,
    missingParameterIds: [], userExplicitParameterIds: Object.keys(values), textExtractedParameterIds: [] });
};

it('keeps nested finite membership in the canonical visibility graph instead of reviving a disabled old quantity question', () => {
  const when = { kind: 'and', operands: [
    { kind: 'in', parameterId: 'physical_part', values: ['LEGACY'] },
    { kind: 'not', operand: { kind: 'equals', parameterId: 'physical_part', value: 'LANDING' } },
  ] };
  const landing = session(when, { physical_part: 'LANDING' });
  expect(landing.parameters.map(q => q.parameterId)).toEqual(['physical_part']);
  expect(consumerCanonicalPrecompileParameterOverrides({ session: landing, patches: [] })).toEqual({ physical_part: 'LANDING' });
  expect(session(when, { physical_part: 'LEGACY', legacy_length: 3 }).parameters.map(q => q.parameterId)).toEqual(['physical_part','legacy_length']);
  expect(session(when, {}).parameters.map(q => q.parameterId)).toEqual(['physical_part']);
});

it('preserves the core not-equals result for known and missing choices without interpreting the condition as always visible', () => {
  const when = { kind: 'not_equals', parameterId: 'physical_part', value: 'LANDING' };
  expect(session(when, { physical_part: 'LANDING' }).parameters.map(q => q.parameterId)).toEqual(['physical_part']);
  expect(session(when, { physical_part: 'LEGACY', legacy_length: 3 }).parameters.map(q => q.parameterId)).toEqual(['physical_part','legacy_length']);
  expect(session(when, {}).parameters.map(q => q.parameterId)).toEqual(['physical_part']);
});
