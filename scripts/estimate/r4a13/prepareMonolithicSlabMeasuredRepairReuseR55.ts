import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import type { AutomaticOwnerDefinition } from '../../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import { appendMonolithicSlabMeasuredRepairReuseR55 as append, SLAB_REPAIR_CATALOG_R55 as catalogId,
  SLAB_REPAIR_METHOD_R55 as method, SLAB_REPAIR_CHOICE_R55 as choice } from '../../../src/lib/estimate/v4/monolithicSlabMeasuredRepairReuseR55';
import { repairSourcePackR3 as pack, repairParameterR3 as p, repairRowR3 as r } from '../../../src/lib/estimate/v4/monolithicStrengthRepairR3';
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
const fixture = 'data/estimate-benchmarks/fixtures/monolithic-slab-measured-repair-current-parent-r55.json';
const sourcePackPath = 'data/estimate-benchmarks/source-packs/monolithic-strength-repair-hand-source-r3.json';
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
export function monolithicSlabMeasuredRepairReuseConfigR55(context: Readonly<{
  releaseId: string; searchReleaseId: string; outputRoot: string;
}>): Config {
  assert.equal(sha(fixture), '77cdd13c0944c9fbd1eb29b729b512e272ba9424ab892f49bec3b728952f6392');
  const record: Record = JSON.parse(readFileSync(resolve(root, fixture), 'utf8'));
  const rawCapture = record.capture, passport = record.contentPassport;
  // The raw read retains the source registry's historical unbound locators.
  // The existing retained publisher requires the complete bound-parent cut.
  const boundLocatorIds = new Set(rawCapture.bindings.map(binding => String(binding.locator_id)));
  const c: Capture = { ...rawCapture,
    normativeLocators: rawCapture.normativeLocators.filter(locator => boundLocatorIds.has(String(locator.id))) };
  assert.equal(boundLocatorIds.size, 5, 'EXACT_CURRENT_BOUND_LOCATOR_SET');
  assert.equal(c.normativeLocators.length, boundLocatorIds.size, 'NO_MISSING_BOUND_LOCATOR');
  assert.equal(c.definition.id, 'b56ba11f-16a8-509d-95da-714fff65e2a0');
  assert.equal(c.definition.definition_version, 14);
  assert.equal(c.definition.definition_sha256, '91585cad14d357dafcac972b426517832a213cfa09c4bab7957fd80f9b2e4ffa');
  assert.equal(c.definition.catalog_id, catalogId);
  const parent: AutomaticOwnerDefinition = { parameters: c.parameters, formulas: c.formulas, resources: c.resources,
    runtimeInput: {}, runtimeClassification: {}, runtimeSourceIds: {}, ordinaryParameterIds: c.parameters
      .filter(parameter => parameter.truth_metadata.visibility_role === 'USER_INPUT').map(parameter => parameter.parameter_id) };
  const next = append({ catalogId, parent, expectedParentFingerprint: hash(parent) });
  const newRows = next.resources.slice(parent.resources.length);
  const boundRows = newRows.filter(row => row.source_metadata?.quantityScope !== 'UNRESOLVED_APPLICATION_NORM').map(row => row.row_id);
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
  for (const row of newRows) {
    const operations = canonicalEstimateOperationReferences(row.resource_graph.operationCompositionV1);
    assert.equal(operations.length, 2);
    map.entries.push({ expectedResourceId: row.row_id, operationId: operations[0].operationId,
      requiredOperationIds: operations.map(operation => operation.operationId), category: row.category, unitId: row.unit_id,
      specification: row.title_ru, condition: 'Exact independently confirmed project repair method and measured actual patches',
      sourceId: pack.sourceId, quantityRule: row.source_metadata?.quantityScope, formulaId: row.formula_id,
      resolution: { kind: 'ROW', rowId: row.row_id } });
  }
  const artifacts = pack.sourceArtifacts.map(artifactPath);
  map.evidenceReferences = [...new Set([...(map.evidenceReferences ?? []), fixture, sourcePackPath, ...artifacts])];
  map.fullTechnicalAcceptance = false;
  const unresolved = [...new Set([...passport.decision.unresolvedResourceRowIds,
    ...newRows.filter(row => row.source_metadata?.quantityScope === 'UNRESOLVED_APPLICATION_NORM').map(row => row.row_id)])];
  const baseline = structuredClone(c.baseline.input_values);
  const shortInput = { m212_family_b_plain15_net_concrete_volume_m3: '2', m212_family_b_plain15_work_elevation_m: '2',
    [p('patch_count')]: 6, [p('length_m')]: '0.1', [p('width_m')]: '0.1', [p('depth_m')]: '0.075' };
  const name = 'Бетонирование фундаментной плиты';
  return { contract: 'monolithic-slab-existing-measured-repair-reuse/r55', stopCode: 'SLAB_MEASURED_REPAIR_REUSE_R55',
    applicationName: 'monolithic-slab-measured-repair-reuse-r55', expectedBranch: 'codex/r4-a5-clean-08b18902', masterPath, masterSha256: masterSha,
    parentReleaseId: context.releaseId, parentSearchReleaseId: context.searchReleaseId,
    currentReleasePath: 'data/estimate-benchmarks/r568-local-developer-canonical-release.json', outputRoot: context.outputRoot,
    sourcePaths: [fixture, sourcePackPath, ...artifacts, 'scripts/estimate/r4a13/prepareMonolithicSlabMeasuredRepairReuseR55.ts',
      'src/lib/estimate/v4/monolithicSlabMeasuredRepairReuseR55.ts', 'src/lib/estimate/v4/monolithicStrengthRepairR3.ts',
      'src/lib/estimate/v4/optionalAutomaticOwnerCompositionR1.ts', 'src/lib/estimate/v4/automaticConstructionOwnerR1.ts',
      'src/lib/estimate/v4/effectivePurchaseBalanceR1.ts', 'src/lib/estimate/backendPlatform/canonicalDefinitionParameterConsumersR1.ts',
      'scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1.ts', 'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts'],
    catalogId, sourceId: pack.sourceId, normId: 'GB4200-202504-HAND-PATCH-SOURCE-CANDIDATE',
    sourceMetadata: { source_title: 'Измеренный локальный ремонт бетона и полное начальное оснащение поста',
      source_authority: 'Ранее проверенные точные инструкции изготовителей; подтверждение ППР и полная норма метода остаются обязательными',
      source_kind: 'EXISTING_WHOLE_SOURCE_FACTORY_REUSED_IN_COMPATIBLE_CONSUMER', artifact_sha256: pack.sourceArtifacts[0].sha256,
      exact_locator: 'GB April2025 PDS2-4 and restrictions5; exact230V first-gear mixer and140mm paddle; actual charge/stock programme',
      use_restriction: pack.scope },
    parameterDefinitions: next.parameters, formulaDefinitions: next.formulas, resourceDefinitions: next.resources,
    shortInput, acceptanceInput: baseline, runtimeProfileInput: baseline,
    runtimeProfileClassification: Object.fromEntries(Object.keys(baseline).map(id => [id, c.baseline.input_classification[id]])),
    runtimeProfileSourceIds: Object.fromEntries(Object.keys(baseline).map(id => [id, structuredClone(c.baseline.normative_source_ids[id])])),
    expectedParentShape: [622, 508, 493], benchmarkOrdinal: 0, validationScenario: 'CURRENT_FOUNDATION_REUSES_WHOLE_MEASURED_REPAIR_WITHOUT_BASELINE_METHOD_DEFAULT',
    passport: { canonicalRuName: name, workKey: catalogId.split(':').at(-1)!, physicalResultRu: passport.physical_result_ru,
      includedScopeRu: [...passport.included_scope_ru, 'Измеренный локальный ручной ремонт по отдельно подтверждённой совместимой программе.'],
      excludedScopeRu: [...passport.excluded_scope_ru, 'Готовый ремонтный узел не доказывает нормы всего ремонта, не подменяет старый состав и не выводит повреждения из объёма фундамента.'],
      independentCompletenessMap: map, unresolvedApplicableResourceRowIds: unresolved },
    applicability: { ...structuredClone(c.definition.applicability), measuredRepairWholeFactoryReuseR55: {
      sourceId: pack.sourceId, methodParameterId: method, sourceFactory: 'buildMonolithicRepairHandSourceCandidateR3',
      actualGeometryOnly: true, fullTechnicalAcceptance: false, newFullTechnologies: 0 } },
    binding: { rowId: boundRows[0]!, additionalRowIds: boundRows.slice(1), retainParentBindings: retained,
      applicability: { wholeFactory: true, actualProjectMethodRequired: true, actualChargeAndStockRequired: true,
        sourceScope: pack.scope, wholeRepairAcceptance: false } },
    locator: { key: 'whole-measured-hand-repair-existing-foundation-r55', payload: { sourceArtifacts: pack.sourceArtifacts,
      sourcePackSha256: sha(sourcePackPath), wholeSourceOperations: pack.operationTitles,
      wholeInitialStation: pack.initialStationKit, remainingWholeMethodRoles: pack.unresolvedRoles, newFull: 0 } },
    search: { primaryUom: 'm3', canonicalNameRu: name, aliases: [name], shortScopeRu: 'Фундаментная плита и применимый локальный ремонт по фактическому обмеру.',
      keyDistinguishingParameters: [], clarificationFields: [], includedBoundaries: passport.included_scope_ru,
      excludedBoundaries: passport.excluded_scope_ru, extraSearchTermsRu: 'бетон фундамент плита ремонт',
      sourceProvenance: { currentParentId: c.definition.id, existingWholeFactoryReused: true, wholeFamilyFull: false } },
    forbiddenAdjacentMatchers: [], owner: 'ROOT_SINGLE_INTEGRATOR_CONCRETE', receiptFileStem: 'monolithic_slab_measured_repair_reuse_r55',
    verifyCore: async () => {
      assert.equal(sha(masterPath), masterSha);
      for (const artifact of pack.sourceArtifacts) assert.equal(sha(artifactPath(artifact)), artifact.sha256);
      assert.deepEqual(validateIndependentCompletenessMapReferences({ completenessMap: map,
        formulaDefinitions: next.formulas, resourceDefinitions: next.resources }), []);
      assert.equal(newRows.length, 38); assert.equal(boundRows.length, 23);
      assert(!Object.hasOwn(baseline, method));
      const result = await compileCanonicalEstimateCore({ operation: 'recalculate', compilerVersion: 'TEST_ONLY_R55_CONFIG', catalogId,
        primaryMeasureParameterId: 'm212_family_b_plain15_net_concrete_volume_m3', parameterDefinitions: [...next.parameters],
        formulaDefinitions: [...next.formulas], resourceDefinitions: [...next.resources], submittedParameters: shortInput,
        confirmedParameters: { m212_foundation_cycle_profile: 'Монолитная бетонная фундаментная плита без армирования' },
        currencyCode: 'USD', priceItems: [], maximumResourceRows: next.resources.length, hashJson: hash });
      assert(!result.rows.some(row => row.row_id.startsWith('monolithic-strength-repair:r3:')));
      assert(result.preliminaryNeeds.some(row => row.row_id === r('dry-material-order') && row.missing_parameter_ids.includes(method)));
      return { status: 'PASS_NORMAL_CONFIG_WITHOUT_FAKE_PROJECT_METHOD_OR_BASELINE_DEFAULTS', addedRows: 38,
        addedBindings: 23, newOrdinaryGeometryFields: 4, newPublicCards: 0, newFull: 0 };
    },
  };
}
