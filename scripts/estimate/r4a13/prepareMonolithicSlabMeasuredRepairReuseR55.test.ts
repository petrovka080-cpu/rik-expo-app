import { monolithicSlabMeasuredRepairReuseConfigR55 as config } from './prepareMonolithicSlabMeasuredRepairReuseR55';
import { SLAB_REPAIR_METHOD_R55 } from '../../../src/lib/estimate/v4/monolithicSlabMeasuredRepairReuseR55';

it('uses the normal retained publisher contract with the current foundation and no invented repair programme', async () => {
  const value = config({ releaseId: 'TEST_ONLY_CURRENT_CONTEXT', searchReleaseId: 'TEST_ONLY_CURRENT_SEARCH', outputRoot: 'TEST_ONLY_NO_WRITES' });
  expect(value.parentReleaseId).toBe('TEST_ONLY_CURRENT_CONTEXT');
  expect(value.expectedParentShape).toEqual([622, 508, 493]);
  expect(value.binding.retainParentBindings?.capturedParent.definition.id).toBe('b56ba11f-16a8-509d-95da-714fff65e2a0');
  expect(value.resourceDefinitions).toHaveLength(531);
  expect(value.binding.additionalRowIds).toHaveLength(22);
  expect(value.runtimeProfileInput).not.toHaveProperty(SLAB_REPAIR_METHOD_R55);
  expect(value.passport.unresolvedApplicableResourceRowIds).toContain('master212:slab_foundation:scope-need:repair-mortar');
  await expect(value.verifyCore()).resolves.toMatchObject({ addedRows: 38, addedBindings: 23, newFull: 0 });
});

it('keeps runtime profile classifications and source IDs on exactly the retained input keys', () => {
  const value = config({ releaseId: 'TEST_ONLY_CURRENT_CONTEXT', searchReleaseId: 'TEST_ONLY_CURRENT_SEARCH', outputRoot: 'TEST_ONLY_NO_WRITES' });
  const keys = Object.keys(value.runtimeProfileInput ?? {}).sort();
  expect(Object.keys(value.runtimeProfileClassification ?? {}).sort()).toEqual(keys);
  expect(Object.keys(value.runtimeProfileSourceIds ?? {}).sort()).toEqual(keys);
  expect(value.binding.retainParentBindings?.capturedParent.baseline.input_values).toEqual(value.runtimeProfileInput);
  const captured = value.binding.retainParentBindings?.capturedParent.baseline;
  if (!captured) throw Error('EXACT_RETAINED_BASELINE_REQUIRED');
  expect(keys).toHaveLength(85);
  for (const key of keys) {
    expect(value.runtimeProfileClassification?.[key]).toEqual(captured.input_classification[key]);
    expect(value.runtimeProfileSourceIds?.[key]).toEqual(captured.normative_source_ids[key]);
  }
});

it('retains the complete bound parent locator closure and preserves every resource and binding', () => {
  const value = config({ releaseId: 'TEST_ONLY_CURRENT_CONTEXT', searchReleaseId: 'TEST_ONLY_CURRENT_SEARCH', outputRoot: 'TEST_ONLY_NO_WRITES' });
  const capture = value.binding.retainParentBindings?.capturedParent;
  if (!capture) throw Error('EXACT_RETAINED_PARENT_REQUIRED');
  expect(capture.resources).toHaveLength(493);
  expect(capture.bindings).toHaveLength(262);
  const expected = [...new Set(capture.bindings.map(binding => String(binding.locator_id)))].sort();
  expect(expected).toHaveLength(5);
  expect(capture.normativeLocators.map(locator => String(locator.id)).sort()).toEqual(expected);
  expect(capture.normativeSources).toHaveLength(5);
  expect(capture.normativeLocators.map(locator => String(locator.id))).not.toContain('2b06922a-a093-5680-ad48-89ac68f6fa35');
  expect(capture.normativeLocators.map(locator => String(locator.id))).not.toContain('8d3a0b85-8e77-5c6a-8dc0-7534826a2612');
});
