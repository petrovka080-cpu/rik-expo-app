import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import type { AutomaticOwnerDefinition } from '../../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import { appendMonolithicWallStrengthWholeReuseR57 as append, WALL_STRENGTH_CATALOG_R57 as catalogId,
  WALL_STRENGTH_METHOD_R57 as method } from '../../../src/lib/estimate/v4/monolithicWallStrengthWholeReuseR57';
import pack from '../../../data/estimate-benchmarks/source-packs/monolithic-wall-whole-control-existing-composition-r57.json';
import { WALL_QUALITY_NEED_R57 } from '../../../src/lib/estimate/v4/monolithicWallStrengthWholeReuseR57';
import { estimateDeterministicHash as hash } from '../../../src/lib/estimate/estimateDeterministicHash';
import { compileCanonicalEstimateCore } from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import { canonicalEstimateOperationReferences } from '../../../src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition';
import { canonicalDefinitionPublicationStableValueR1 as stable } from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionPublicationStableValueR1';
import { masterRetainedParentCaptureSha256R1, type MasterRetainedParentCaptureR1,
  type MasterExplicitParameterSourcesR1 } from './masterSingleDefinitionRetainParentBindingsR1';
import { validateIndependentCompletenessMapReferences,
  type MasterSingleDefinitionSuccessorConfig as Config } from './prepareMasterSingleDefinitionSuccessorR1';
import type { PurchaseGroupRepresentative } from './s2732PurchaseGroupOverlay';

const root = resolve(__dirname, '../../..');
const fixture = 'data/estimate-benchmarks/fixtures/monolithic-wall-current-parent-r57.json';
const sourcePackPath = 'data/estimate-benchmarks/source-packs/monolithic-wall-whole-control-existing-composition-r57.json';
const sha = (path: string) => createHash('sha256').update(readFileSync(resolve(root, path))).digest('hex');
const stableSha = (value: unknown) => createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
const artifactPath = (artifact: { file: string; path?: string }) => artifact.path
  ?? 'data/estimate-benchmarks/source-artifacts/' + artifact.file;
const masterPath = 'C:/Users/User/Downloads/GOX_BUILD_MASTER_TZ_2_14_2026-10-23.txt';
const masterSha = 'e24f52197dab5a1bb4bbca8d139b5b6a5c722efce6c758b3efffd6266f1d78ed';
type Capture = Omit<MasterRetainedParentCaptureR1, 'parameters' | 'formulas' | 'resources'>
  & Pick<AutomaticOwnerDefinition, 'parameters' | 'formulas' | 'resources'>;
type Record = { capture: Capture; contentPassport: PurchaseGroupRepresentative['passport'] };

/** Only data for the existing retained publisher. Test/project programme facts
 * below belong solely to verifyCore and never enter the approved baseline. */
export function monolithicWallStrengthWholeReuseConfigR57(context: Readonly<{
  releaseId: string; searchReleaseId: string; outputRoot: string;
}>): Config {
  assert.equal(sha(fixture), 'e61ce773c4547baf005070d2ad9875191275831bf259d8dcf169ccf54c5bd1e2');
  for (const source of pack.sourcePacks) assert.equal(sha(source.path), source.sha256, 'EXACT_EXISTING_SOURCE_PACK');
  const record: Record = JSON.parse(readFileSync(resolve(root, fixture), 'utf8'));
  const rawCapture = record.capture, passport = record.contentPassport;
  // The raw read retains the source registry's historical unbound locators.
  // The existing retained publisher requires the complete bound-parent cut.
  const boundLocatorIds = new Set(rawCapture.bindings.map(binding => String(binding.locator_id)));
  const c: Capture = { ...rawCapture,
    normativeLocators: rawCapture.normativeLocators.filter(locator => boundLocatorIds.has(String(locator.id))) };
  assert.equal(boundLocatorIds.size, 3, 'EXACT_CURRENT_BOUND_LOCATOR_SET');
  assert.equal(c.normativeLocators.length, boundLocatorIds.size, 'NO_MISSING_BOUND_LOCATOR');
  assert.equal(c.definition.id, '462094da-b42e-5f09-afb8-1003b5ff86d2');
  assert.equal(c.definition.definition_version, 3);
  assert.equal(c.definition.definition_sha256, '2da2d9879e2b772557ca98c39e5cc37cafa2245ad5c5f61c3f79c3251b668ba3');
  assert.equal(c.definition.catalog_id, catalogId);
  const parent: AutomaticOwnerDefinition = { parameters: c.parameters, formulas: c.formulas, resources: c.resources,
    runtimeInput: {}, runtimeClassification: {}, runtimeSourceIds: {}, ordinaryParameterIds: c.parameters
      .filter(parameter => parameter.truth_metadata.visibility_role === 'USER_INPUT').map(parameter => parameter.parameter_id) };
  const next = append({ catalogId, parent, expectedParentFingerprint: hash(parent) });
  const newRows = next.resources.slice(parent.resources.length);
  const unresolvedIds = new Set(pack.remainingUnresolvedResourceIds);
  const boundRows = pack.requiredResources.filter(spec => !spec.unresolved).map(spec => spec.rowId);
  assert.deepEqual(new Set(newRows.map(row => row.row_id)), new Set(pack.requiredResources.map(spec => spec.rowId)), 'EXACT_INDEPENDENT_WHOLE_SOURCE_SET');
  const oldIds = new Set(parent.parameters.map(parameter => parameter.parameter_id));
  const parameterSources: MasterExplicitParameterSourcesR1 = Object.fromEntries(next.parameters.filter(parameter => !oldIds.has(parameter.parameter_id))
    .map(parameter => [parameter.parameter_id, parameter.truth_metadata.value_source_role === 'UNRESOLVED_APPLICATION_NORM'
      ? { kind: 'UNRESOLVED', sourceIds: [] } : { kind: parameter.truth_metadata.value_source_role === 'COMPILER_DERIVED_RESOURCE_QUANTITY'
        ? 'DERIVED' : 'KNOWN', sourceIds: [pack.sourceId] }]));
  const metadata = c.definition.source_metadata;
  const latest = metadata.retainedParentBindingLineageV1?.entries?.at(-1)?.successor
    ?? metadata.retainedParentBindingContinuationV2?.successor ?? metadata.retainedParentBindingContinuationV1?.successor
    ?? metadata.retainedParentBindingSuccessorV1;
  assert(latest, 'EXACT_EXISTING_SOURCE_LINEAGE');
  const retained = { capturedParent: c, capturedParentSha256: masterRetainedParentCaptureSha256R1(c),
    newParameterSources: parameterSources, capturedSourcePreimage: { sourceKey: pack.sourceId, expected: null },
    successorProvenanceAppendV1: { contract: 'master-retained-binding-append/v1' as const,
      capturedSourceMetadata: structuredClone(metadata), capturedSourceMetadataSha256: stableSha(metadata),
      capturedPreviousSuccessorSha256: stableSha(latest) } };
  const map = structuredClone(passport.decision.independentCompletenessMap);
  for (const spec of pack.requiredResources) {
    const row = newRows.find(item => item.row_id === spec.rowId);
    assert(row, 'MISSING_INDEPENDENT_SOURCE_REQUIREMENT:' + spec.rowId);
    assert.equal(row.unit_id, spec.unitId, 'EXACT_SOURCE_UNIT:' + spec.rowId);
    const operations = canonicalEstimateOperationReferences(row.resource_graph.operationCompositionV1);
    const requiredOperationIds = [spec.operationId,
      ...(spec.rowId.startsWith('monolithic-strength-repair:r3:') ? ['monolithic-strength-direct:r2:operation:restore'] : []),
      'master212:family-b:krer06-01-031-04:r1:operation:quality-lab'];
    assert(requiredOperationIds.every(id => operations.some(operation => operation.operationId === id)), 'EXACT_INDEPENDENT_OPERATION_BINDINGS');
    // Source unit may itself be unresolved for transport/whole service. Keep it
    // empty and explicitly open; never invent a provider's measurement unit.
    map.entries.push({ expectedResourceId: spec.rowId, operationId: spec.operationId,
      requiredOperationIds, category: spec.category, unitId: spec.unitId,
      specification: spec.titleRu, condition: 'Exact identified actual flat member and selected method; actual damage/post programme remains independent',
      sourceId: pack.sourceId, quantityRule: spec.authority, formulaId: row.formula_id,
      resolution: { kind: 'ROW', rowId: row.row_id } });
  }
  const artifacts = pack.sourceArtifacts.map(artifactPath);
  map.evidenceReferences = [...new Set([...(map.evidenceReferences ?? []), fixture, sourcePackPath, ...artifacts])];
  map.fullTechnicalAcceptance = false;
  const unresolved = [...new Set([...passport.decision.unresolvedResourceRowIds,
    ...unresolvedIds])];
  const baseline = structuredClone(c.baseline.input_values);
  const shortInput = { m212_family_b_wall04_net_concrete_volume_m3: '30', m212_family_b_wall04_work_elevation_m: '0',
    m212_family_b_wall04_height_from_support_m: '3', m212_family_b_wall04_thickness_m: '0.3', mono_strength_direct_r2_area_m2: '100' };
  const name = 'Монолитная железобетонная стена';
  return { contract: 'monolithic-wall-existing-whole-strength-reuse/r57', stopCode: 'WALL_WHOLE_STRENGTH_REUSE_R57',
    applicationName: 'monolithic-wall-whole-strength-reuse-r57', expectedBranch: 'codex/r4-a5-clean-08b18902', masterPath, masterSha256: masterSha,
    parentReleaseId: context.releaseId, parentSearchReleaseId: context.searchReleaseId,
    currentReleasePath: 'data/estimate-benchmarks/r568-local-developer-canonical-release.json', outputRoot: context.outputRoot,
    sourcePaths: [fixture, sourcePackPath, ...artifacts, ...pack.sourcePacks.map(item => item.path), 'scripts/estimate/r4a13/prepareMonolithicWallStrengthWholeReuseR57.ts',
      'src/lib/estimate/v4/monolithicWallStrengthWholeReuseR57.ts', 'src/lib/estimate/v4/monolithicStrengthRepairR3.ts', 'src/lib/estimate/v4/monolithicStrengthDirectWholeCycleR2.ts', 'src/lib/estimate/v4/monolithicStrengthMeasuredRepairR4.ts',
      'src/lib/estimate/v4/optionalAutomaticOwnerCompositionR1.ts', 'src/lib/estimate/v4/automaticConstructionOwnerR1.ts',
      'src/lib/estimate/v4/effectivePurchaseBalanceR1.ts', 'src/lib/estimate/backendPlatform/canonicalDefinitionParameterConsumersR1.ts',
      'scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1.ts', 'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts'],
    catalogId, sourceId: pack.sourceId, normId: '18105-2018_22690-2015_TYPEII2448_GB_HAND_MEASURED_REPAIR_PARTIAL',
    sourceMetadata: { source_title: 'Контроль прочности отдельной стены с подготовкой, протоколом, восстановлением и уборкой',
      source_authority: 'Ранее проверенные точные инструкции изготовителей; подтверждение ППР и полная норма метода остаются обязательными',
      source_kind: 'EXISTING_WHOLE_SOURCE_FACTORY_REUSED_IN_COMPATIBLE_CONSUMER', artifact_sha256: pack.sourceArtifacts[0].sha256,
      exact_locator: '18105 8.2;22690 table2 and appendices; exact selected maker manual6/15; existing R3/R38/R41/R42/R45 source scopes',
      use_restriction: pack.scope },
    parameterDefinitions: next.parameters, formulaDefinitions: next.formulas, resourceDefinitions: next.resources,
    shortInput, acceptanceInput: baseline, runtimeProfileInput: baseline,
    runtimeProfileClassification: Object.fromEntries(Object.keys(baseline).map(id => [id, c.baseline.input_classification[id]])),
    runtimeProfileSourceIds: Object.fromEntries(Object.keys(baseline).map(id => [id, structuredClone(c.baseline.normative_source_ids[id])])),
    expectedParentShape: [368, 270, 271], benchmarkOrdinal: 0, validationScenario: 'CURRENT_WALL_REUSES_WHOLE_STRENGTH_AND_REPAIR_WITHOUT_PROJECT_DEFAULTS',
    passport: { canonicalRuName: name, workKey: catalogId.split(':').at(-1)!, physicalResultRu: passport.physical_result_ru,
      includedScopeRu: [...passport.included_scope_ru, 'Целый исходный модуль контроля отдельной фактической стены и измеренного ремонта по отдельно принятой программе.'],
      excludedScopeRu: [...passport.excluded_scope_ru, 'Полные нормы труда, протокола, ухода, очистки и отходов остаются открытыми. Нижняя граница числа участков не заменяет действительную программу испытаний.'],
      independentCompletenessMap: map, unresolvedApplicableResourceRowIds: unresolved },
    applicability: { ...structuredClone(c.definition.applicability), wholeStrengthAndMeasuredRepairReuseR57: {
      sourceId: pack.sourceId, methodParameterId: method, sourceFactory: 'buildMonolithicStrengthMeasuredRepairR4',
      actualGeometryOnly: true, fullTechnicalAcceptance: false, newFullTechnologies: 0 } },
    binding: { rowId: boundRows[0]!, additionalRowIds: boundRows.slice(1), retainParentBindings: retained,
      applicabilityByRowId: Object.fromEntries(pack.requiredResources.filter(spec => !spec.unresolved).map(spec => [spec.rowId, { originalSourceId: spec.sourceId, sourcePack: spec.sourcePack, exactLocator: spec.exactLocator, authority: spec.authority, sourceUnit: spec.unitId }])),
      applicability: { wholeFactory: true, actualProjectMethodRequired: true, actualChargeAndStockRequired: true,
        sourceScope: pack.scope, wholeStrengthAcceptance: false, unresolvedUnitRowIds: pack.unresolvedUnitRowIds } },
    locator: { key: 'whole-strength-and-measured-repair-existing-wall-r57', payload: { sourceArtifacts: pack.sourceArtifacts,
      sourcePackSha256: sha(sourcePackPath), wholeSourceOperations: pack.sourceOperations,
      independentRequiredResources: pack.requiredResources, remainingWholeMethodRoles: pack.remainingUnresolvedResourceIds, newFull: 0 } },
    search: { primaryUom: 'm3', canonicalNameRu: name, aliases: [name], shortScopeRu: 'Монолитная стена и отдельно принятый целый исходный способ контроля прочности с восстановлением.',
      keyDistinguishingParameters: [], clarificationFields: [], includedBoundaries: passport.included_scope_ru,
      excludedBoundaries: passport.excluded_scope_ru, extraSearchTermsRu: 'бетон монолит стена контроль прочности ремонт',
      sourceProvenance: { currentParentId: c.definition.id, existingWholeFactoryReused: true, wholeFamilyFull: false } },
    forbiddenAdjacentMatchers: [], owner: 'ROOT_SINGLE_INTEGRATOR_CONCRETE', receiptFileStem: 'monolithic_wall_whole_strength_reuse_r57',
    verifyCore: async () => {
      assert.equal(sha(masterPath), masterSha);
      for (const artifact of pack.sourceArtifacts) assert.equal(sha(artifactPath(artifact)), artifact.sha256);
      assert.deepEqual(validateIndependentCompletenessMapReferences({ completenessMap: map,
        formulaDefinitions: next.formulas, resourceDefinitions: next.resources }), []);
      assert.equal(newRows.length, 94); assert.equal(boundRows.length, 42);
      assert(!Object.hasOwn(baseline, method));
      const result = await compileCanonicalEstimateCore({ operation: 'recalculate', compilerVersion: 'TEST_ONLY_R57_CONFIG', catalogId,
        primaryMeasureParameterId: 'm212_family_b_wall04_net_concrete_volume_m3', parameterDefinitions: [...next.parameters],
        formulaDefinitions: [...next.formulas], resourceDefinitions: [...next.resources], submittedParameters: shortInput,
        confirmedParameters: { m212_family_b_profile: 'Монолитная железобетонная стена 300 мм высотой до 3 м' },
        currencyCode: 'USD', priceItems: [], maximumResourceRows: next.resources.length, hashJson: hash });
      assert(!result.rows.some(row => row.row_id.startsWith('monolithic-strength-')));
      assert(result.preliminaryNeeds.some(row => row.row_id === WALL_QUALITY_NEED_R57));
      assert(result.preliminaryNeeds.some(row => row.row_id === 'monolithic-strength-repair:r3:dry-material-order' && row.missing_parameter_ids.includes(method)));
      return { status: 'PASS_WALL_WHOLE_NORMAL_CONFIG_WITHOUT_PROJECT_DEFAULTS', addedRows: 94,
        addedBindings: 42, newOrdinaryGeometryFields: 5, newPublicCards: 0, newFull: 0 };
    },
  };
}
