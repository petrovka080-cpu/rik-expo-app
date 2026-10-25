import pvcActive from '../../../../data/estimate-benchmarks/source-packs/pvc-floor-complete-four-s27-69.json';
import pvcHistorical from '../../../../data/estimate-benchmarks/fixtures/pvc-floor-complete-binding-historical-four-s27-69.json';
import {
  assertFloorPreparationIntentS2769,
  assertFloorPreparationRecalculationChoiceS2769,
  floorPreparationEditingParametersS2769,
  floorPreparationIntentBindingS2769 as pack,
  isFloorPreparationConsumerS2769,
} from './canonicalFloorPreparationIntentS2769';

const retiredIds = pvcHistorical.targets.map(target => target.catalogId)
  .filter(catalogId => /_(small|large)_area$/u.test(catalogId));

test('historical identity recognition does not restore active PVC area targets', () => {
  expect(retiredIds).toHaveLength(2);
  expect(pvcActive.targets).toHaveLength(2);
  expect(pvcActive.targets.every(target => !retiredIds.includes(target.catalogId))).toBe(true);
});

test.each(retiredIds)('saved PVC revision retains editing, recalculation and intent guards: %s', catalogId => {
  const parameters: Record<string, unknown> = {q: 18, object_conditions: pack.oldWoodConditions};
  expect(isFloorPreparationConsumerS2769(catalogId)).toBe(true);
  expect(parameters).not.toHaveProperty(pack.modeId);

  const editing = floorPreparationEditingParametersS2769(catalogId, parameters);
  expect(editing).toEqual({...parameters, [pack.modeId]: pack.legacyMode});
  expect(parameters).not.toHaveProperty(pack.modeId);
  expect(() => assertFloorPreparationIntentS2769(catalogId, editing)).not.toThrow();

  expect(() => assertFloorPreparationRecalculationChoiceS2769({
    catalogId, parentParameters: parameters, submittedParameters: parameters,
  })).toThrow(expect.objectContaining({
    code: 'FLOOR_PREPARATION_COMPOSITION_CHOICE_REQUIRED', httpStatus: 409,
  }));
  for (const mode of [pack.legacyMode, pack.plannedMode]) {
    expect(() => assertFloorPreparationRecalculationChoiceS2769({
      catalogId, parentParameters: parameters,
      submittedParameters: {...parameters, [pack.modeId]: mode},
    })).not.toThrow();
  }

  expect(() => assertFloorPreparationIntentS2769(catalogId, {
    ...parameters, [pack.modeId]: pack.plannedMode,
  })).toThrow(expect.objectContaining({code: 'PARAMETER_VALIDATION_FAILED'}));
  const explicitLegacy = {...parameters, [pack.modeId]: pack.legacyMode};
  expect(floorPreparationEditingParametersS2769(catalogId, explicitLegacy)).toBe(explicitLegacy);
  expect(() => assertFloorPreparationRecalculationChoiceS2769({
    catalogId, parentParameters: explicitLegacy, submittedParameters: explicitLegacy,
  })).not.toThrow();
});
