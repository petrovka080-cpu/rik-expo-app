import {canonicalParameterMigrationBindingCompatibleV1 as compatible} from './canonicalParameterMigrationBindingV1';
import {buildConcreteFoundationAtomicConstructionR1 as build,
  CONCRETE_FOUNDATION_ATOMIC_CONSTRUCTION_PROFILES_R1 as profiles} from '../v4/concreteFoundationAtomicConstructionR1';
import {CONCRETE_FOUNDATION_PRESERVED_CURRENT_TARGETS as preserved} from '../v4/concreteFoundationSubworkReuseR1';

const oldPrimary = {parameterId: 'q', unitId: 'm3', valueType: 'decimal', semanticParameterKey: 'volume'};

test.each([
  ['missing primary', undefined],
  ['different identity', {...oldPrimary, parameterId: 'repair_scope_volume_m3'}],
  ['different unit', {...oldPrimary, unitId: 'm2'}],
  ['different meaning', {...oldPrimary, semanticParameterKey: 'surface'}],
  ['different type', {...oldPrimary, valueType: 'text'}],
] as const)('rejects %s without converting the old input', (_name, target) => {
  const snapshot = JSON.stringify(oldPrimary);
  expect(compatible(oldPrimary, target)).toBe(false);
  expect(JSON.stringify(oldPrimary)).toBe(snapshot);
});

test('retains the existing decimal-to-integer binding policy for target value validation', () => {
  expect(compatible(oldPrimary, {...oldPrimary})).toBe(true);
  expect(compatible(oldPrimary, {...oldPrimary, valueType: 'integer'})).toBe(true);
  expect(compatible({...oldPrimary, valueType: 'integer'}, oldPrimary)).toBe(false);
});

test.each(profiles.map(profile => [profile.catalogId] as const))('loads canonical model %s with an explicit fresh primary and no legacy q alias', catalogId => {
  const model = build(catalogId);
  expect(model.parameters.some(parameter => parameter.parameter_id === 'q')).toBe(false);
  expect(compatible(oldPrimary, undefined)).toBe(false);
  const primary = model.parameters.find(parameter => parameter.parameter_id === model.primaryMeasureParameterId);
  expect(primary).toBeDefined();
  expect(primary!.default_value).toBeNull();
  expect(model.subworks.length).toBeGreaterThan(0);
  const rowIds = new Set(model.resources.map(row => row.row_id));
  for (const row of model.resources) {
    const operation = row.resource_graph.operationCompositionV1 as {groupId: string; operationTitleRu: string};
    expect(operation.groupId).toBe(catalogId);
    expect(operation.operationTitleRu).toMatch(/[А-Яа-яЁё]/u);
    const owner = row.resource_graph.includedInResourceOwnerRowId;
    if (owner) expect(rowIds.has(String(owner))).toBe(true);
  }
});

test('keeps the six existing models outside the replacement set', () => {
  expect(profiles).toHaveLength(34);
  expect(preserved).toHaveLength(6);
  expect(new Set(profiles.map(profile => profile.catalogId)).size).toBe(34);
  const preservedIds = new Set<string>(preserved.map(existing => existing.catalogId));
  expect(profiles.some(profile => preservedIds.has(profile.catalogId))).toBe(false);
});
