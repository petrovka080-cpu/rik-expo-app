import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import source from '../../../data/estimate-benchmarks/source-packs/concrete-curing-roller-whole-post-r108.json';
import normal from '../../../data/estimate-benchmarks/source-packs/concrete-curing-roller-normal-config-r108.json';
import consumers from '../../../data/estimate-benchmarks/source-packs/concrete-curing-five-consumers-route-r124.json';
import witness from '../../../data/estimate-benchmarks/fixtures/concrete-curing-roller-independent-r108.json';
import {appendConcreteCuringRollerWholePostR108,
  concreteCuringRollerConfirmedPeriodFactsR108, compileConcreteCuringRollerWholePostR108,
  curingRollerPostRowR108 as row, curingRollerPostParameterR108 as parameter,
  type ConcreteCuringRollerPeriodReadbackR108} from '../../../src/lib/estimate/v4/concreteCuringRollerWholePostR108';
import {concreteCuringAntisolPackS2763 as materialSource, concreteCuringAntisolOwnerS2763 as materialOwner,
  concreteCuringAntisolReadyChoicesS2763, concreteCuringAntisolInterfaceS2763} from '../../../src/lib/estimate/v4/concreteCuringAntisolMaterialS2763';
import type {AutomaticOwnerDefinition} from '../../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import {compareFormulaGraphDecimals as cmp} from '../../../src/lib/estimate/backendPlatform/formulaGraph';
import type {CanonicalEstimateCompileCoreInput, CanonicalEstimateCompileCoreResult} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {masterRetainedParentCaptureSha256R1, masterRetainedLineageValueSha256V1,
  prepareMasterRetainedBindingRepresentativeR1, type MasterRetainedParentCaptureR1,
  type MasterExplicitParameterSourcesR1, type MasterRetainParentBindingsR1,
  type MasterRetainedBindingGuardInputR1} from './masterSingleDefinitionRetainParentBindingsR1';
import {buildMasterPublicationResourceRowsR1, resolveMasterSingleDefinitionBindingRowIds,
  resolveMasterSingleDefinitionBindingApplicabilityByRowId, resolveMasterSingleDefinitionLocatorExcerptSha256R1,
  hashMasterSingleDefinitionSuccessorReceiptR1, validateIndependentCompletenessMapReferences,
  resolveMasterExistingNormativeRegistryReuseR1, type MasterExistingNormativeRegistryReuseR1,
  type MasterSingleDefinitionSuccessorConfig as Config} from './prepareMasterSingleDefinitionSuccessorR1';

type Json = Record<string, unknown>;
type Capture = Omit<MasterRetainedParentCaptureR1, 'parameters'|'formulas'|'resources'> &
  Pick<AutomaticOwnerDefinition, 'parameters'|'formulas'|'resources'>;
type Packet = Readonly<{capture: Capture; readOnly: true; sourceMetadataLosslessRoundtrip: true;
  membership: {release_id: string; definition_version_id: string; approved_template_baseline_id: string};
  contentPassport: {physical_result_ru: string; included_scope_ru: readonly string[]; excluded_scope_ru: readonly string[];
    decision: {independentCompletenessMap: Json; unresolvedResourceRowIds: readonly string[]}}}>;
type Context = Readonly<{releaseId: string; searchReleaseId: string; sourceRoot: string; outputRoot: string;
  onCoreEntry?: (phase: string) => void; onCoreResult?: (phase: string, result: unknown) => void;
  existingNormativeRegistry?: MasterExistingNormativeRegistryReuseR1;
  floorOnlyExtension?: ConcreteCuringRollerFloorOnlyContextR299}>;
const sha = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
const paths = {pack: 'data/estimate-benchmarks/source-packs/concrete-curing-roller-whole-post-r108.json',
  normal: 'data/estimate-benchmarks/source-packs/concrete-curing-roller-normal-config-r108.json',
  witness: 'data/estimate-benchmarks/fixtures/concrete-curing-roller-independent-r108.json',
  module: 'src/lib/estimate/v4/concreteCuringRollerWholePostR108.ts',
  config: 'scripts/estimate/r4a13/prepareConcreteCuringRollerWholePostR108.ts',
  test: 'src/lib/estimate/v4/concreteCuringRollerWholePostR108.test.ts'};
const quantityId = 'exposed_curing_surface_area_m2';
const object = (value: unknown): value is Json => value !== null && typeof value === 'object' && !Array.isArray(value);
const materialPrefix = 'concrete-curing-antisol250w-us';
const materialIds = ['consumed', 'order', 'packages', 'remaining', 'free', 'shortage', 'reserve-deficit'] as const;


type CurrentConsumerEntryR299 = Readonly<{
  catalogId:string; fixturePath:string; fixtureSha256:string; capturedParentSha256:string;
  expectedDefinitionId:string; expectedDefinitionSha256:string; expectedDefinitionVersion:number;
  expectedBaselineId:string; expectedParentShape:readonly number[]; expectedParentBindings:number;
  primaryMeasureParameterId:string;
}>;
const floorCatalogR299 = 'canonical-work:base:concrete_foundation_interior_concrete_slab_pour_standard';
const floorRoutePathR299 = 'data/estimate-benchmarks/source-packs/concrete-curing-floor-only-route-r299.json';
const floorRouteShaR299 = '4a19f840420507392e452b7336fd537d81f7ab9447a46f80c2dce0ce654a2302';
export const concreteCuringRollerFloorOnlyContextR299 = Object.freeze({
  contract:'concrete-curing-floor-only-exact-derived-context/r299', routePath:floorRoutePathR299, routeSha256:floorRouteShaR299,
});
type ConcreteCuringRollerFloorOnlyContextR299 = Readonly<typeof concreteCuringRollerFloorOnlyContextR299>;
function exactCurrentConsumerR299(sourceRoot:string,catalogId:string,floor?:ConcreteCuringRollerFloorOnlyContextR299):CurrentConsumerEntryR299 {
  if (floor === undefined) {
    const entry = consumers.entries.find(value => value.catalogId === catalogId); assert(entry, 'EXACT_FIVE_CURRENT_CONSUMERS_ONLY');
    return entry;
  }
  assert.deepEqual(floor,concreteCuringRollerFloorOnlyContextR299,'EXACT_FLOOR_ONLY_PINNED_CONTEXT_REQUIRED');
  assert.equal(catalogId,floorCatalogR299,'FLOOR_EXTENSION_CANNOT_DISPATCH_OLD_OR_OTHER_OWNER');
  const path=resolve(sourceRoot,floorRoutePathR299);assert.equal(sha(path),floorRouteShaR299,'EXACT_FLOOR_ROUTE_SOURCE_SHA_REQUIRED');
  const value:unknown=JSON.parse(readFileSync(path,'utf8'));assert(object(value));
  assert.equal(value.contract,floor.contract);assert.equal(value.expectedPacketReleaseId,'2df79e8d-4012-5557-87c0-f36285f59f17');
  const entry={key:'slab-pour',catalogId:floorCatalogR299,
    fixturePath:'data/estimate-benchmarks/fixtures/concrete-curing-current-floor-derived-preimage-r302.json',fixtureSha256:'768f53b8e66338b382bdbec9b56e089bb4ce4f148e04674f3ffec86dcee735a6',capturedParentSha256:'50df683986538ef7532b89f3ce761bad72950f9e9ba6a06b849b85c4da91f1a2',
    expectedDefinitionId:'d00d3b23-8f6d-5155-b36f-6dedc0cd4177',expectedDefinitionSha256:'74bae311c024f5269764d746ae5373f7cb068db480775cfc251204274fa1826a',
    expectedDefinitionVersion:15,expectedBaselineId:'7946c6db-7a88-5c56-9a1f-65dea95590f2',expectedParentShape:[649,354,355],
    expectedParentBindings:281,primaryMeasureParameterId:'plan_dimension_concrete_volume_m3'};
  assert.deepEqual(value.entry,entry,'EXACT_FLOOR_ENTRY_PREIMAGE_REQUIRED');return entry;
}

/** Independent source roster: material balance, literal initial six-piece case
 * and all eight unresolved full-method needs. It does not infer completeness
 * from generated rows and does not close the parent's care requirements. */
function newCompleteness(): Json[] {
  const entry = (id: string, formulaId: string, category: string, unitId: string, title: string,
    operationKey: string, rule: string, requiredOperationIds: readonly string[] = [operationKey]) => ({expectedResourceId: row('expected:' + id), sourceId: source.sourceId,
      operationId: operationKey, requiredOperationIds, specification: title,
      category, unitId, condition: source.scopeRu, quantityRule: rule, resolution: {kind: 'ROW', rowId: id}, formulaId});
  return [
    ...materialIds.map(key => entry(key === 'order' ? materialOwner : materialPrefix + ':' + key,
      materialPrefix + ':formula:' + key, 'material', key === 'packages' ? 'pcs' : 'l',
      'Материал для ухода за свежим бетоном: ' + key, row('operation:material_takeoff'),
      'EXISTING_APPROXIMATE_PDS_AREA_AND_19L_BALANCE_UNCHANGED',
      ['material_takeoff', 'mixing_and_transfer', 'roller_application'].map(key => row('operation:' + key)))),
    entry(row('case-period-provision'), row('formula:case-period-provision'), 'equipment', 'set',
      'Обеспечение целым исходным комплектом на фактический период', row('operation:scope_and_readiness'),
      'ACTUAL_EXTERNAL_PERIOD_COUNT_AFTER_EXISTING_INVENTORY_NOT_CONSUMPTION', source.operations.map(item => row('operation:' + item.key))),
    ...source.components.map(component => entry(row('stock:' + component.key), row('formula:stock:' + component.key),
      'equipment', component.unitId, component.publicNameRu, row('operation:' + component.operationKeys[0]),
      'LITERAL_INITIAL_CASE_STOCK_NOT_WEAR_OR_LIFETIME', component.operationKeys.map(key => row('operation:' + key)))),
    ...source.protectedNeeds.map(need => entry(row('need:' + need.key), row('formula:need:' + need.key),
      need.category, '', need.titleRu, row('operation:' + need.operation), 'UNRESOLVED_APPLICATION_NORM')),
  ];
}

export function concreteCuringRollerCurrentCaptureR108(sourceRoot: string, catalogId = normal.catalogId, floor?: ConcreteCuringRollerFloorOnlyContextR299): Packet {
  const entry = exactCurrentConsumerR299(sourceRoot,catalogId,floor);
  const path = resolve(sourceRoot, entry.fixturePath);
  assert.equal(sha(path), entry.fixtureSha256);
  const packet: Packet = JSON.parse(readFileSync(path, 'utf8')), c = packet.capture;
  assert.equal(packet.readOnly, true); assert.equal(packet.sourceMetadataLosslessRoundtrip, true);
  assert.equal(masterRetainedParentCaptureSha256R1(c), entry.capturedParentSha256);
  assert.equal(c.definition.catalog_id, entry.catalogId);
  assert.equal(c.definition.id, entry.expectedDefinitionId);
  assert.equal(c.definition.definition_sha256, entry.expectedDefinitionSha256);
  assert.equal(c.definition.definition_version, entry.expectedDefinitionVersion);
  assert.equal(c.definition.id, packet.membership.definition_version_id);
  assert.equal(c.baseline.id, packet.membership.approved_template_baseline_id);
  assert.equal(c.baseline.id, entry.expectedBaselineId);
  assert.deepEqual([c.parameters.length, c.formulas.length, c.resources.length], entry.expectedParentShape);
  assert.equal(c.bindings.length, entry.expectedParentBindings);
  if (floor !== undefined) assert.equal(packet.membership.release_id,'2df79e8d-4012-5557-87c0-f36285f59f17','FLOOR_WHOLE_OBSERVED_MEMBERSHIP_REQUIRED');
  return packet;
}

export function concreteCuringRollerWholeMasterConfigR108(context: Context, catalogId = normal.catalogId): Config {
  const entry = exactCurrentConsumerR299(context.sourceRoot,catalogId,context.floorOnlyExtension);
  const own = (path: string) => resolve(context.sourceRoot, path), packet = concreteCuringRollerCurrentCaptureR108(context.sourceRoot, catalogId,context.floorOnlyExtension);
  const c = packet.capture;
  const hasExistingRegistry = Object.hasOwn(context, 'existingNormativeRegistry');
  assert(!hasExistingRegistry || context.existingNormativeRegistry != null, 'EXPLICIT_EXISTING_REGISTRY_REQUIRED');
  assert.equal(sha(normal.masterPath), normal.masterSha256);
  assert.equal(context.releaseId, packet.membership.release_id);
  for (const artifact of [source.materialSource, source.kitSource, source.coverSource])
    assert.equal(sha(own(artifact.artifactPath)), artifact.sha256);
  const parent: AutomaticOwnerDefinition = {parameters: c.parameters, formulas: c.formulas, resources: c.resources,
    runtimeInput: {}, runtimeClassification: {}, runtimeSourceIds: {},
    ordinaryParameterIds: c.parameters.filter(p => p.truth_metadata.visibility_role === 'USER_INPUT').map(p => p.parameter_id)};
  const next = appendConcreteCuringRollerWholePostR108(parent);
  const additions = next.parameters.slice(c.parameters.length), newRows = next.resources.slice(c.resources.length);
  const needs = source.protectedNeeds.map(need => row('need:' + need.key));
  assert.equal(newRows.length, 21); assert.equal(needs.length, 8);
  const newParameterSources: MasterExplicitParameterSourcesR1 = Object.fromEntries(additions.map(p => [p.parameter_id,
    p.truth_metadata.value_source_role === 'UNRESOLVED_APPLICATION_NORM'
      ? {kind: 'UNRESOLVED', sourceIds: []}
      : p.truth_metadata.value_source_role === 'COMPILER_DERIVED_RESOURCE_QUANTITY'
        ? {kind: 'DERIVED', sourceIds: []} : {kind: 'KNOWN', sourceIds: [source.sourceId]}]));
  const metadata = c.definition.source_metadata, lineage = metadata.retainedParentBindingLineageV1?.entries?.at(-1)?.successor
    ?? metadata.retainedParentBindingContinuationV2?.successor ?? metadata.retainedParentBindingContinuationV1?.successor
    ?? metadata.retainedParentBindingSuccessorV1;
  assert(lineage, 'EXACT_CURRENT_PARENT_LINEAGE_REQUIRED');
  const retained: MasterRetainParentBindingsR1 = {capturedParent: c, capturedParentSha256: entry.capturedParentSha256,
    newParameterSources, ...(hasExistingRegistry ? {} : {capturedSourcePreimage: {sourceKey: source.sourceId, expected: null}}),
    successorProvenanceAppendV1: {contract: 'master-retained-binding-append/v1',
      capturedSourceMetadata: structuredClone(metadata), capturedSourceMetadataSha256: masterRetainedLineageValueSha256V1(metadata),
      capturedPreviousSuccessorSha256: masterRetainedLineageValueSha256V1(lineage)}};
  const oldMap = packet.contentPassport.decision.independentCompletenessMap;
  assert(Array.isArray(oldMap.entries));
  assert(Array.isArray(oldMap.evidenceReferences) && Array.isArray(oldMap.sourceEvidencePins));
  const addedEvidence = [paths.pack, paths.normal, paths.witness, normal.consumerRoutePath, entry.fixturePath,
    source.materialSource.artifactPath, source.kitSource.artifactPath, source.coverSource.artifactPath];
  const addedEvidencePins = addedEvidence.map(path => sha(own(path)));
  const map = {...structuredClone(oldMap), entries: [...oldMap.entries, ...newCompleteness()],
    evidenceReferences: [...oldMap.evidenceReferences, ...addedEvidence],
    sourceEvidencePins: [...oldMap.sourceEvidencePins, ...addedEvidencePins],
    evidenceSha256: hashMasterSingleDefinitionSuccessorReceiptR1({priorEvidenceSha256: oldMap.evidenceSha256,
      addedEvidence: addedEvidence.map((path, index) => ({path, sha256: addedEvidencePins[index]}))}), fullTechnicalAcceptance: false};
  const bound = newRows.filter(r => !needs.includes(r.row_id)).map(r => r.row_id);
  assert.equal(bound.length, 13);
  const consumerSourcePaths = context.floorOnlyExtension === undefined
    ? consumers.entries.map(value => value.fixturePath) : [entry.fixturePath,floorRoutePathR299];
  const sourcePaths = [...consumerSourcePaths, normal.consumerRoutePath, ...Object.values(paths),
    ...[source.materialSource, source.kitSource, source.coverSource].map(s => s.artifactPath),
    'src/lib/estimate/v4/concreteCuringAntisolMaterialS2763.ts',
    'data/estimate-benchmarks/source-packs/sika-antisol250w-us-curing-series-s27-63.json',
    'src/lib/estimate/v4/automaticConstructionOwnerR1.ts', 'src/lib/estimate/v4/optionalAutomaticOwnerCompositionR1.ts',
    'src/lib/estimate/v4/effectivePurchaseBalanceR1.ts', 'src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts',
    'src/lib/estimate/backendPlatform/inclusionGraph.ts', 'src/lib/estimate/backendPlatform/formulaGraph.ts',
    'scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1.ts',
    'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts'];
  for (const path of sourcePaths) sha(own(path));
  const input = {...c.baseline.input_values, [quantityId]: witness.surfaceAreaM2,
    approved_external_curing_method: 'MEMBRANE_CURING_COMPOUND', antisol_material_choice: materialSource.selectedProductRu};
  const config: Config = {contract: source.contract, stopCode: 'CONCRETE_CURING_ROLLER_R108',
    applicationName: 'concrete-curing-roller-whole-r108', expectedBranch: 'codex/r4-a5-clean-08b18902',
    masterPath: normal.masterPath, masterSha256: normal.masterSha256, parentReleaseId: context.releaseId,
    parentSearchReleaseId: context.searchReleaseId, currentReleasePath: 'data/estimate-benchmarks/r568-local-developer-canonical-release.json',
    outputRoot: context.outputRoot, sourcePaths, catalogId: entry.catalogId, sourceId: source.sourceId, normId: normal.normId,
    sourceMetadata: {source_title: source.titleRu, source_authority: 'Паспорт материала, буквальная комплектность набора и фактическое обеспечение периода',
      source_kind: 'BOUNDED_MATERIAL_METHOD_AND_INITIAL_CASE_STOCK_NOT_WHOLE_CARE_NORM', official_url: source.materialSource.officialUrl,
      artifact_sha256: source.materialSource.sha256, exact_locator: 'PDS pages1–2; exact145811000 six-piece case; actual separate period readback',
      use_restriction: source.scopeRu}, parameterDefinitions: next.parameters, formulaDefinitions: next.formulas,
    resourceDefinitions: next.resources, shortInput: input, acceptanceInput: structuredClone(c.baseline.input_values),
    runtimeProfileInput: {}, runtimeProfileClassification: {}, runtimeProfileSourceIds: {},
    expectedParentShape: [entry.expectedParentShape[0]!, entry.expectedParentShape[1]!, entry.expectedParentShape[2]!], benchmarkOrdinal: 0,
    validationScenario: 'EXACT_CURRENT_CONSUMER_RETAINED_PLUS_SAME_BOUNDED_ROLLER_COMPONENT_EIGHT_CORE_ENTRIES_NOT_WHOLE_CARE_ACCEPTANCE',
    passport: {canonicalRuName: c.definition.passport.canonicalRuName, workKey: c.definition.passport.workKey,
      physicalResultRu: packet.contentPassport.physical_result_ru,
      includedScopeRu: [...packet.contentPassport.included_scope_ru, 'Ограниченный выбранный способ нанесения состава валиком с буквальной комплектностью исходного набора.'],
      excludedScopeRu: [...packet.contentPassport.excluded_scope_ru, 'Полное обеспечение ухода, ресурс замен, труд и количественные нормы очистки не подтверждены этой поставкой.'],
      independentCompletenessMap: map, unresolvedApplicableResourceRowIds: [...packet.contentPassport.decision.unresolvedResourceRowIds, ...needs]},
    applicability: {...structuredClone(c.definition.applicability), concreteCuringRollerPostR108: {
      noVolumeToSurfaceConversion: true, noNewLabourOwner: true, existingWholeCareNeedsUnchanged: true,
      exactCaseStockNotConsumption: true, actualTrustedProjectResolverIntegrated: false, fullTechnicalAcceptance: false}},
    binding: {rowId: bound[0]!, additionalRowIds: bound.slice(1), retainParentBindings: retained,
      ...(hasExistingRegistry ? {reuseExistingNormativeRegistry: context.existingNormativeRegistry!} : {}),
      applicability: {contract: source.contract, literalStockNotProductivity: true, fullTechnicalAcceptance: false},
      applicabilityByRowId: Object.fromEntries(bound.map(id => {
        const metadata = newRows.find(r => r.row_id === id)?.source_metadata;
        assert(metadata && typeof metadata.sourceRole === 'string', 'EXACT_BOUND_ROW_SOURCE_ROLE_REQUIRED');
        return [id, {contract: source.contract, sourceRole: metadata.sourceRole, sourcePack: paths.pack,
          projectQuantityIsNotUniversalNorm: true, fullTechnicalAcceptance: false}];
      }))},
    locator: {key: 'concrete-curing-literal-roller-case-and-pds-r108', payload: {contract: source.contract,
      sourcePack: source, independentWholeRoster: newCompleteness(), projectPeriodMustBeSeparatelyReadBack: true,
      newFULL: 0}},
    search: {primaryUom: 'm3', canonicalNameRu: c.definition.passport.canonicalRuName,
      aliases: [c.definition.passport.canonicalRuName], shortScopeRu: packet.contentPassport.physical_result_ru,
      keyDistinguishingParameters: [entry.primaryMeasureParameterId], clarificationFields: [entry.primaryMeasureParameterId],
      includedBoundaries: packet.contentPassport.included_scope_ru, excludedBoundaries: packet.contentPassport.excluded_scope_ru,
      extraSearchTermsRu: 'бетон монолит уход состав валик', sourceProvenance: {contract: source.contract,
        currentParentId: c.definition.id, newPublicCards: 0, newFullTechnologies: 0}},
    forbiddenAdjacentMatchers: [], owner: 'ROOT_SINGLE_INTEGRATOR_CONCRETE', receiptFileStem: 'concrete_curing_roller_whole_r108',
    verifyCore: async () => {
      verifyConcreteCuringRollerRetainedConfigR108(config, own);
      return verifyConcreteCuringRollerWholeConfigR108(config, parent, next, context, sha(own(paths.witness)), entry.primaryMeasureParameterId);
    }};
  // The existing publisher validates the complete source/locator declaration.
  concreteCuringRollerRegistryInputR145(config);
  return config;
}

/** Exact existing publisher identities and metadata, without publication or DB reads.
 * Later consumers may explicitly reuse a freshly captured complete registry row;
 * normal/locked/registered guards still require that same row in the database. */
export function concreteCuringRollerRegistryInputR145(config: Config): MasterRetainedBindingGuardInputR1 {
  const uuid = (seed: string) => {const b = Buffer.from(hashMasterSingleDefinitionSuccessorReceiptR1(seed).slice(0, 32), 'hex');
    b[6] = (b[6]! & 15) | 80; b[8] = (b[8]! & 63) | 128; const h = b.toString('hex');
    return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;};
  const id = uuid(config.contract + ':' + config.sourceId + ':source'),
    locator = uuid(config.contract + ':' + config.sourceId + ':' + config.locator.key + ':locator'), m = config.sourceMetadata;
  const generated = {config, newSource: {id, source_key: source.sourceId,
    title_ru: m.source_title, authority: m.source_authority, official_url: m.official_url, artifact_sha256: m.artifact_sha256,
    effective_from: null, effective_to: null, metadata: {contract: source.contract, sourceKind: m.source_kind,
      useRestriction: m.use_restriction, universalProductivityClaimed: false, universalConsumptionClaimed: false, activationAllowed: false}},
    newLocators: [{id: locator, source_id: id, locator_key: config.locator.key, locator: config.locator.payload,
      excerpt_sha256: resolveMasterSingleDefinitionLocatorExcerptSha256R1(config)}]};
  const reused = resolveMasterExistingNormativeRegistryReuseR1(generated);
  return reused == null ? generated : {config, newSource: reused.managedSource, newLocators: reused.locators};
}

export function verifyConcreteCuringRollerRetainedConfigR108(config: Config, own: (path: string) => string): void {
  const retained = config.binding.retainParentBindings; assert(retained);
  const input = concreteCuringRollerRegistryInputR145(config);
  const locator = input.newLocators[0]!.id as string;
  const resources = buildMasterPublicationResourceRowsR1(config.resourceDefinitions), oldIds = new Set(retained.capturedParent.formulas.map(f => f.formula_id));
  const formulas = config.formulaDefinitions.map(f => ({...f, ast_sha256: oldIds.has(f.formula_id) ? f.ast_sha256 : hashMasterSingleDefinitionSuccessorReceiptR1(f.ast)}));
  const applicable = resolveMasterSingleDefinitionBindingApplicabilityByRowId(config, resources, [locator]);
  const bindings = resolveMasterSingleDefinitionBindingRowIds(config, resources, [locator]).map(row_id => ({row_id, locator_id: locator, applicability: applicable[row_id]}));
  const fingerprint = hashMasterSingleDefinitionSuccessorReceiptR1({purpose: 'PURE_ORDINARY_CONFIG_REPRESENTATIVE_NOT_DB_PUBLICATION',
    capture: retained.capturedParentSha256, sourceHashes: config.sourcePaths.map(path => [path, sha(own(path))]), source: input.newSource, locators: input.newLocators});
  const actual = prepareMasterRetainedBindingRepresentativeR1(input, {parameters: config.parameterDefinitions, formulas, resources,
    newBindings: bindings, successorProvenance: {contract: source.contract, sourceId: source.sourceId, normId: config.normId,
      parentDefinitionId: retained.capturedParent.definition.id, parentBaselineId: retained.capturedParent.baseline.id,
      capturedParentSha256: retained.capturedParentSha256, sourceFingerprint: fingerprint},
    lifecycleMetadata: {contract: source.contract, masterSha256: config.masterSha256, sourceFingerprint: fingerprint}});
  for (const [key, value] of Object.entries(retained.capturedParent.baseline.normative_source_ids)) assert.deepEqual(actual.normativeSourceIds[key], value);
  assert.equal(actual.expectedNormativeBindingCount, retained.capturedParent.bindings.length + 13);
}

async function verifyConcreteCuringRollerWholeConfigR108(config: Config, parent: AutomaticOwnerDefinition,
  next: AutomaticOwnerDefinition, context: Context, documentSha256: string, primaryMeasureParameterId: string): Promise<Json> {
  assert.equal(witness.generatedFromImplementation, false); assert.equal(witness.TEST_ONLY, true);
  assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap: config.passport.independentCompletenessMap,
    formulaDefinitions: config.formulaDefinitions, resourceDefinitions: config.resourceDefinitions}), []);
  assert.deepEqual(source.operations.map(o => o.key), witness.operations);
  assert.deepEqual(source.protectedNeeds.map(n => n.key), witness.protectedNeeds);
  assert.deepEqual(parent.resources, next.resources.slice(0, parent.resources.length));
  assert.deepEqual(parent.parameters, next.parameters.slice(0, parent.parameters.length));
  assert.deepEqual(parent.formulas, next.formulas.slice(0, parent.formulas.length));
  assert(!next.resources.slice(parent.resources.length).some(r => r.category === 'work' || r.category === 'labor'), 'NO_SECOND_PAID_LABOUR');
  const legacy = structuredClone(config.acceptanceInput), internal = new Set(parent.parameters.filter(p => p.truth_metadata.visibility_role === 'INTERNAL_ONLY').map(p => p.parameter_id));
  const submitted = Object.fromEntries(Object.entries(legacy).filter(([id]) => !internal.has(id)));
  const confirmed = Object.fromEntries(Object.entries(legacy).filter(([id]) => internal.has(id)));
  const facts: Record<string, unknown> = {...submitted, [quantityId]: witness.surfaceAreaM2,
    approved_external_curing_method: 'MEMBRANE_CURING_COMPOUND', antisol_material_choice: materialSource.selectedProductRu,
    antisol_surface_ready: concreteCuringAntisolReadyChoicesS2763[1], antisol_minimum_temperature_12h_c: '12',
    antisol_subsequent_surface_use: concreteCuringAntisolInterfaceS2763,
    antisol_usable_stock_l: witness.usableMaterialL, antisol_retained_reserve_l: witness.retainedMaterialReserveL};
  const period: ConcreteCuringRollerPeriodReadbackR108 = {documentSha256,
    projectReference: 'TEST_ONLY explicit PPR; not actual approved project', periodProvisionReference: 'TEST_ONLY full external period after inventory',
    exactCaseVariant: source.kitSource.exactVariant, textureAndProductFit: source.compatibility.requiredProjectConfirmation,
    existingInventoryAccountedFor: true, provisionMode: 'EXTERNAL_COMPLETE_CASE_PERIOD_SERVICE',
    measuredSurfaceAreaM2: witness.surfaceAreaM2, completeCasesForActualPeriod: witness.completeCasesForActualPeriod,
    materialArtifactSha256: source.materialSource.sha256, kitArtifactSha256: source.kitSource.sha256};
  const checkNegative = (mutate: (value: Record<string, unknown>) => void, pattern: RegExp) => {
    const candidate = JSON.parse(JSON.stringify(period)); mutate(candidate);
    assert.throws(() => concreteCuringRollerConfirmedPeriodFactsR108(facts, candidate), pattern);
  };
  checkNegative(p => {p.kitArtifactSha256 = 'f'.repeat(64);}, /EXACT_PERIOD_SOURCE/);
  checkNegative(p => {p.exactCaseVariant = '144811000';}, /EXACT_PERIOD_SOURCE/);
  checkNegative(p => {p.existingInventoryAccountedFor = false;}, /EXACT_PERIOD_SOURCE/);
  checkNegative(p => {p.provisionMode = 'OWN_STOCK';}, /EXACT_PERIOD_SOURCE/);
  checkNegative(p => {p.measuredSurfaceAreaM2 = '99';}, /SAME_POSITIVE_SURFACE/);
  for (const value of ['0', '1.5']) checkNegative(p => {p.completeCasesForActualPeriod = value;}, /ACTUAL_COUNT/);
  checkNegative(p => {p.application_unknown_soap_water = '0';}, /EXACT_PERIOD_SOURCE/);
  assert.throws(() => concreteCuringRollerConfirmedPeriodFactsR108({...facts, [parameter('actual_complete_cases')]: '99'}, period), /RAW_TECHNICAL_FACT/);
  let calls = 0;
  const call = async (phase: string, definition: AutomaticOwnerDefinition, input: Readonly<Record<string, unknown>>,
    readback?: ConcreteCuringRollerPeriodReadbackR108, overrides?: CanonicalEstimateCompileCoreInput['rowOverrides']) => {
    try {
      const result = await compileConcreteCuringRollerWholePostR108({definition, catalogId: config.catalogId,
        primaryMeasureParameterId, submittedParameters: input,
        confirmedLegacyParameters: confirmed, periodReadback: readback, rowOverrides: overrides,
        onCoreEntry: () => {calls++; context.onCoreEntry?.(phase);}});
      context.onCoreResult?.(phase, result); return result;
    } catch (error) {
      context.onCoreResult?.(phase, {expectedReject: phase.startsWith('reject-'), message: error instanceof Error ? error.message : String(error),
        code: object(error) ? error.code : null}); throw error;
    }
  };
  const before = await call('legacy-before', parent, submitted), after = await call('legacy-after', next, submitted);
  const view = (result: CanonicalEstimateCompileCoreResult) => ({rows: result.rows, needs: result.preliminaryNeeds, totals: result.totals});
  assert.deepEqual(view(after), view(before), 'UNCHANGED_OLD_QUANTITIES_PRICES_AND_NEEDS');
  const missing = await call('selected-without-period', next, facts);
  assert(!missing.rows.some(r => r.row_id === row('case-period-provision')), 'NO_AUTOMATIC_CASE_PURCHASE');
  assert(missing.preliminaryNeeds.some(r => r.row_id === row('case-period-provision')));
  const overrides = {[materialOwner]: {unitPrice: witness.materialUnitPrice, includedInEstimate: true,
    provenance: {kind: 'manual', reason: 'TEST_ONLY source witness price'}}, [row('case-period-provision')]: {
      unitPrice: witness.casePeriodUnitPrice, includedInEstimate: true, provenance: {kind: 'manual', reason: 'TEST_ONLY external period price'}}};
  const positive = await call('positive-test-only-period', next, facts, period, overrides);
  const quantity = (result: CanonicalEstimateCompileCoreResult, id: string) => {
    const item = result.rows.find(r => r.row_id === id); assert(item && item.quantity !== null, 'KNOWN_ROW:' + id); return item;
  };
  assert.equal(cmp(quantity(positive, materialPrefix + ':consumed').quantity!, witness.nominalMaterialL), 0);
  assert.equal(cmp(quantity(positive, materialOwner).quantity!, witness.orderedMaterialL), 0);
  assert.equal(cmp(quantity(positive, row('case-period-provision')).quantity!, witness.completeCasesForActualPeriod), 0);
  for (const [key, value] of Object.entries(witness.componentStock)) {
    const component = quantity(positive, row('stock:' + key)); assert.equal(cmp(component.quantity!, value), 0);
    assert.equal(component.included_in_estimate, false); assert.equal(component.included_in_procurement, false);
  }
  for (const need of source.protectedNeeds) assert(positive.preliminaryNeeds.some(r => r.row_id === row('need:' + need.key)));
  assert.equal(cmp(positive.totals.amount, witness.expectedAmount), 0, 'ONE_MATERIAL_ORDER_AND_ONE_PERIOD_OWNER_ONLY');
  const scaled = await call('scaled-area-same-period-count', next, {...facts, [quantityId]: witness.scaledSurfaceAreaM2},
    {...period, measuredSurfaceAreaM2: witness.scaledSurfaceAreaM2});
  assert.equal(cmp(quantity(scaled, materialPrefix + ':consumed').quantity!, witness.scaledNominalMaterialL), 0);
  assert.equal(cmp(quantity(scaled, materialOwner).quantity!, witness.scaledOrderedMaterialL), 0);
  assert.equal(cmp(quantity(scaled, row('case-period-provision')).quantity!, witness.completeCasesForActualPeriod), 0);
  const withoutStock = {...facts}; delete withoutStock.antisol_usable_stock_l;
  const unknownStock = await call('unknown-material-stock', next, withoutStock, period);
  assert(!unknownStock.rows.some(r => r.row_id === materialOwner));
  assert(unknownStock.preliminaryNeeds.some(r => r.row_id === materialOwner));
  for (const temperature of ['7', '6']) await assert.rejects(
    () => call('reject-temperature-' + temperature, next, {...facts, antisol_minimum_temperature_12h_c: temperature}, period),
    {code: 'PARAMETER_VALIDATION_FAILED'});
  assert.equal(calls, witness.expectedCoreEntries);
  return {status: 'FINITE_ORDINARY_CONFIG_AND_EIGHT_CORE_ENTRIES_NOT_WHOLE_CARE_ACCEPTANCE', coreEntries: calls,
    actualPeriodObjects: 0, unknownPostNeeds: 8, wholeCareNeedClosures: 0, newPublicCards: 0, newFULL: 0,
    fullTechnicalAcceptance: false, approvedProjectWorkerIntegration: 'UNRUN', normalLockedDbPreimage: 'UNRUN'};
}
