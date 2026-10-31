import { monolithicWallStrengthWholeReuseConfigR57 as config } from './prepareMonolithicWallStrengthWholeReuseR57';
import { WALL_STRENGTH_METHOD_R57, WALL_QUALITY_NEED_R57 } from '../../../src/lib/estimate/v4/monolithicWallStrengthWholeReuseR57';
import { validateIndependentCompletenessMapReferences } from './prepareMasterSingleDefinitionSuccessorR1';
import pack from '../../../data/estimate-benchmarks/source-packs/monolithic-wall-whole-control-existing-composition-r57.json';

const make = () => config({ releaseId: 'TEST_ONLY_CURRENT_LOCAL_RELEASE', searchReleaseId: 'TEST_ONLY_CURRENT_LOCAL_SEARCH', outputRoot: 'TEST_ONLY_NO_WRITE' });

it('prepares the ordinary retained whole-wall Config with exact independent source columns and retained runtime keys', async () => {
  const value = make();
  const capture = value.binding.retainParentBindings?.capturedParent;
  if (!capture) throw Error('R57_EXACT_CURRENT_PARENT_REQUIRED');
  expect(value.expectedParentShape).toEqual([368, 270, 271]);
  expect(capture.resources).toHaveLength(271);
  expect(capture.bindings).toHaveLength(271);
  expect(capture.normativeLocators).toHaveLength(3);
  expect(value.resourceDefinitions).toHaveLength(365);
  expect(value.binding.additionalRowIds).toHaveLength(41);
  const runtimeKeys = Object.keys(value.runtimeProfileInput ?? {}).sort();
  expect(runtimeKeys).toHaveLength(6);
  expect(Object.keys(value.runtimeProfileClassification ?? {}).sort()).toEqual(runtimeKeys);
  expect(Object.keys(value.runtimeProfileSourceIds ?? {}).sort()).toEqual(runtimeKeys);
  expect(value.runtimeProfileInput).toEqual(capture.baseline.input_values);
  for (const id of runtimeKeys) {
    expect(value.runtimeProfileClassification?.[id]).toEqual(capture.baseline.input_classification[id]);
    expect(value.runtimeProfileSourceIds?.[id]).toEqual(capture.baseline.normative_source_ids[id]);
  }
  expect(value.runtimeProfileInput).not.toHaveProperty(WALL_STRENGTH_METHOD_R57);
  expect(pack.requiredResources).toHaveLength(94);
  expect(pack.remainingUnresolvedResourceIds).toHaveLength(52);
  expect(pack.unresolvedUnitRowIds).toEqual(['monolithic-strength-direct:r2:transport', 'monolithic-strength-direct:r2:whole-service']);
  expect(value.passport.unresolvedApplicableResourceRowIds).toContain(WALL_QUALITY_NEED_R57);
  expect(value.passport.unresolvedApplicableResourceRowIds).toEqual(expect.arrayContaining(pack.remainingUnresolvedResourceIds));
  for (const spec of pack.requiredResources.filter(spec => !spec.unresolved)) {
    expect(value.binding.applicabilityByRowId?.[spec.rowId]).toMatchObject({ originalSourceId: spec.sourceId,
      sourcePack: spec.sourcePack, exactLocator: spec.exactLocator, authority: spec.authority, sourceUnit: spec.unitId });
  }
  process.stdout.write('R57_NEW_NORMAL_CONFIG_CORE_CALL\n');
  await expect(value.verifyCore()).resolves.toMatchObject({ addedRows: 94, addedBindings: 42, newFull: 0 });
});

it('rejects a changed physical source unit through the unchanged independent completeness guard', () => {
  const value = make();
  const map = { ...structuredClone(value.passport.independentCompletenessMap) };
  if (!map || !Array.isArray(map.entries)) throw Error('R57_INDEPENDENT_SOURCE_ENTRIES_REQUIRED');
  const entry: unknown = map.entries.find((item: Record<string, unknown>) => item.expectedResourceId === 'monolithic-strength-repair:r3:mixing-water');
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw Error('R57_EXACT_WATER_REQUIREMENT_REQUIRED');
  const changed = { ...entry, unitId: 'l' };
  map.entries = map.entries.map((item: Record<string, unknown>) => item.expectedResourceId === 'monolithic-strength-repair:r3:mixing-water' ? changed : item);
  const errors = validateIndependentCompletenessMapReferences({ completenessMap: map,
    formulaDefinitions: value.formulaDefinitions, resourceDefinitions: value.resourceDefinitions });
  expect(errors).toEqual(expect.arrayContaining([expect.stringMatching(/RESOURCE_UNIT/u), expect.stringMatching(/FORMULA_OUTPUT_UNIT/u)]));
});
