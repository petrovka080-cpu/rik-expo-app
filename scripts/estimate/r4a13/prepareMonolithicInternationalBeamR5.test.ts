import { monolithicInternationalBeamConfigR5 as configure } from './prepareMonolithicInternationalBeamR5';
import { masterRetainParentBindingsOptInR1, prepareMasterRetainedBindingRepresentativeR1 } from './masterSingleDefinitionRetainParentBindingsR1';
import { canonicalPublisherQuantityScopeIsConsistent } from './canonicalDefinitionPublisherR1';
import { buildMasterCapabilityMatrix, buildMasterScopeReadiness } from './prepareMasterSingleDefinitionSuccessorR1';

it('admits the genuine whole international source through the normal current-parent retained guard before its new core case', async () => {
  const config = configure({ releaseId: 'TEST_ONLY_NOT_A_DB_PUBLICATION', searchReleaseId: 'TEST_ONLY_NOT_A_SEARCH_PUBLICATION', outputRoot: '.tmp/test-only-no-write' });
  const retained = config.binding.retainParentBindings!, capture = retained.capturedParent;
  expect(retained.truthAuthorityOnlyV1).toBeUndefined(); expect(retained.operationCompositionOnly).toBeUndefined();
  expect(config.expectedParentShape).toEqual([527, 385, 387]); expect(config.resourceDefinitions).toHaveLength(436);
  expect(config.formulaDefinitions).toHaveLength(434); expect(Object.keys(config.shortInput)).toHaveLength(4);
  expect(config.acceptanceInput).toEqual(capture.baseline.input_values);
  expect(config.runtimeProfileClassification).toEqual(Object.fromEntries(Object.keys(config.runtimeProfileInput!).map(id => [id, capture.baseline.input_classification[id]])));
  expect(config.runtimeProfileSourceIds).toEqual(Object.fromEntries(Object.keys(config.runtimeProfileInput!).map(id => [id, capture.baseline.normative_source_ids[id]])));
  const source = { id: '11111111-1111-5111-8111-111111111147', source_key: config.sourceId,
    title_ru: config.sourceMetadata.source_title, authority: config.sourceMetadata.source_authority,
    official_url: config.sourceMetadata.official_url, artifact_sha256: config.sourceMetadata.artifact_sha256,
    effective_from: null, effective_to: null, metadata: { testOnly: true } };
  const locator = { id: '22222222-2222-5222-8222-222222222247', source_id: source.id, locator_key: config.locator.key,
    locator: config.locator.payload, excerpt_sha256: 'a'.repeat(64) };
  const input = { config, newSource: source, newLocators: [locator] };
  expect(masterRetainParentBindingsOptInR1(input)).toBe(retained);
  const boundIds = [config.binding.rowId, ...config.binding.additionalRowIds!]; expect(boundIds).toHaveLength(39);
  const result = prepareMasterRetainedBindingRepresentativeR1(input, {
    parameters: config.parameterDefinitions, formulas: config.formulaDefinitions, resources: config.resourceDefinitions,
    newBindings: boundIds.map(row_id => ({ row_id, locator_id: locator.id, applicability: config.binding.applicability })),
    successorProvenance: { contract: config.contract, sourceId: config.sourceId, normId: config.normId,
      parentDefinitionId: capture.definition.id, parentBaselineId: capture.baseline.id, capturedParentSha256: retained.capturedParentSha256 },
    lifecycleMetadata: { contract: config.contract, masterSha256: config.masterSha256, sourceFingerprint: 'b'.repeat(64) },
  });
  expect(result.expectedNormativeBindingCount).toBe(367);
  for (const [id, sources] of Object.entries(capture.baseline.normative_source_ids)) expect(result.normativeSourceIds[id]).toEqual(sources);
  const unresolved = config.passport.unresolvedApplicableResourceRowIds!;
  for (const id of capture.resources.filter(r => r.source_metadata?.sourceRole === 'UNRESOLVED_APPLICATION_NORM').map(r => r.row_id))
    expect(unresolved).toContain(id);
  const payload = { parameters: config.parameterDefinitions, formulas: config.formulaDefinitions, resources: config.resourceDefinitions,
    baseline: { input_values: config.runtimeProfileInput }, passport: { decision: buildMasterScopeReadiness(unresolved, config.resourceDefinitions),
      capability_matrix: buildMasterCapabilityMatrix(unresolved, config.resourceDefinitions) } };
  expect(canonicalPublisherQuantityScopeIsConsistent(payload)).toBe(true);
  expect(payload.passport.decision.quantityScope).toBe('PARTIAL');
  expect((await config.verifyCore()).newFull).toBe(0);
});

it('declares runtime provenance only for actual retained input values while preserving the full captured baseline', () => {
  const config = configure({ releaseId: 'TEST_ONLY', searchReleaseId: 'TEST_ONLY', outputRoot: '.tmp/test-only-no-write' });
  const baseline = config.binding.retainParentBindings!.capturedParent.baseline;
  expect(config.acceptanceInput).toEqual(baseline.input_values);
  expect(Object.keys(config.runtimeProfileClassification!).sort()).toEqual(Object.keys(config.runtimeProfileInput!).sort());
  expect(Object.keys(config.runtimeProfileSourceIds!).sort()).toEqual(Object.keys(config.runtimeProfileInput!).sort());
  for (const id of Object.keys(config.runtimeProfileInput!)) {
    expect(config.runtimeProfileClassification![id]).toEqual(baseline.input_classification[id]);
    expect(config.runtimeProfileSourceIds![id]).toEqual(baseline.normative_source_ids[id]);
  }
  expect(Object.keys(baseline.input_classification).length).toBeGreaterThan(Object.keys(config.runtimeProfileInput!).length);
});

it('fingerprints the same shared publisher and calculation source owners used by the whole new beam profile', () => {
  const config = configure({ releaseId: 'TEST_ONLY', searchReleaseId: 'TEST_ONLY', outputRoot: '.tmp/test-only-no-write' });
  for (const path of ['scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts',
    'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts',
    'src/lib/estimate/v4/automaticConstructionOwnerR1.ts',
    'src/lib/estimate/v4/optionalAutomaticOwnerCompositionR1.ts',
    'src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts',
    'src/lib/estimate/backendPlatform/canonicalSourceProfileSelectionV1.ts']) expect(config.sourcePaths).toContain(path);
  expect(new Set(config.sourcePaths).size).toBe(config.sourcePaths.length);
});
