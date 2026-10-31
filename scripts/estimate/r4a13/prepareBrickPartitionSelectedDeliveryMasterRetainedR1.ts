import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {buildBrickPartitionSelectedDeliveryModelR1, hashBrickPartitionDeliveryCapturedParentR1,
  brickPartitionSelectedDeliveryPackR1 as pack} from './brickPartitionSelectedMaterialDeliveryR1';
import {SELECTED_DELIVERY_ROW_R1, SELECTED_DELIVERY_QUANTITY_R1} from './selectedMaterialDeliveryForwardR1';
import {masterRetainedParentCaptureSha256R1, prepareMasterRetainedBindingRepresentativeR1,
  type MasterRetainedParentCaptureR1, type MasterRetainParentBindingsR1} from './masterSingleDefinitionRetainParentBindingsR1';
import {resolveMasterExistingNormativeRegistryReuseR1, resolveMasterSingleDefinitionLocatorExcerptSha256R1,
  validateIndependentCompletenessMapReferences, type MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../../../src/lib/estimate/estimateDeterministicHash';
import {brickPartitionHalfPackR1 as masonry, brickPartitionCraneModesR1} from '../../../src/lib/estimate/v4/brickPartitionHalfKrer08Column05R1';

type Json = Record<string, any>;
const contract = 'gox-build.brick-partition-selected-delivery-master-retained/r1';
const capturePath = '.release-runtime/r568/next-wave/brick-partition-delivery/current-guards/current-parent-r29.json';
const guardPath = '.release-runtime/r568/next-wave/brick-partition-delivery/current-guards/current-parent-guard-r29.json';
const captureSha = 'b00f27e57dae786d047e140404ce4e42eee51c393c4660d20d2b2ca88c1f7aca';
const guardSha = 'd1bb5bb04c7909d8fc64560ac1f69a6830a920fecc50da6e0d1155bbd44314ac';
const normPath = 'data/estimate-norms/professional/delivery.json';
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const sha = (v: string | Uint8Array) => createHash('sha256').update(v).digest('hex');
const load = (path: string, expected: string): Json => {const b = readFileSync(path);assert.equal(sha(b), expected, 'EXACT_BRICK_DELIVERY_CAPTURE:' + path);return JSON.parse(b.toString('utf8'));};

export function brickPartitionDeliverySyntheticFactsR1(): Json {
  const result: Json = {net_partition_area_m2: 100, storey_height_m: 4, crane_fulfillment: brickPartitionCraneModesR1.own,
    selected_delivery_selection: 'NOT_SELECTED'};
  for (const f of masonry.scopeFacts) result[f.id] = f.value;
  for (const id of masonry.requiredProjectReferences) result[id] = 'CONTROL_ONLY source-compatible reference, not site evidence';
  for (const m of masonry.materials) {
    result[m.specificationParameterId] = 'CONTROL_ONLY exact compatible supply, not supplier offer';
    result[m.id + '_stock'] = 0;result[m.id + '_reserve'] = 0;result[m.id + '_quantum'] = m.unitId === 'item' ? 1 : 0.001;
  }
  return result;
}

/** One captured existing work, one retained definition successor, no DB client.
 * The shared Master owns normal/locked rereads and all persistence. */
export function prepareBrickPartitionDeliveryRetainedDraftR1() {
  const read = load(capturePath, captureSha), guard = load(guardPath, guardSha);
  assert.equal(read.status, 'PASS_CURRENT_BRICK_DELIVERY_PARENT_FULL52_24_24_RETAIN11_AND_EXACT_REGISTRY_R29');
  assert(read.completeReadSet && read.transactionRolledBack && read.connectionClosed && read.allConnectionsClosed);
  assert.equal(read.databaseWrites, false);assert.equal(read.error, null);
  assert.equal(guard.status, 'PASS_BOUNDED_CURRENT_BRICK_DELIVERY_PARENT_R29');assert.equal(guard.error, null);
  assert.deepEqual(guard.cleanupErrors, []);assert.deepEqual(guard.remainingOwnedProcesses, []);assert(guard.noOwnedProcessStillRunning);
  assert.deepEqual(read.executionContext, {sourceHead:'377d8c295d1b146c7941ace1c60f1900ef6f73c5',
    recordedReleaseSourceCommit:'377d8c295d1b146c7941ace1c60f1900ef6f73c5',definitionReleaseId:'d7fa85c8-5625-5944-9324-ca230164a29b',
    searchReleaseId:'4a02da73-a313-54ce-986e-d29df1e54e22'});
  const rows = (name: string): Json[] => {const s = read.sets[name];assert.equal(sha(s.rawRows.join('\n') + (s.rawRows.length ? '\n' : '')), s.sha256);return s.rawRows.map(JSON.parse);};
  const c: MasterRetainedParentCaptureR1 = {definition: rows('fullDefinition')[0]!, baseline: rows('fullBaseline')[0]!,
    parameters: rows('fullParameters'), formulas: rows('fullFormulas'), resources: rows('fullResources'), bindings: rows('fullBindings'),
    normativeSources: rows('fullNormativeSources'), normativeLocators: rows('fullNormativeLocators')};
  assert.deepEqual([c.parameters.length,c.formulas.length,c.resources.length,c.bindings.length,c.normativeSources.length,c.normativeLocators.length], [52,24,24,11,1,1]);
  assert.equal(c.definition.id, '28eeeab4-7cec-55fb-994d-96ee963282fb');assert.equal(c.baseline.id, '82d682d2-4495-584d-b58e-a22993dcb05a');
  assert.equal(c.definition.definition_sha256, 'baec67a2449d54a571c8de75902bf5e7c70a9d556e93fa31209674cde3babb23');
  assert.deepEqual(rows('publisher-priceBindings'), []);
  const passport = rows('publisher-passport')[0]!, search = rows('search')[0]!;
  const parent = {...c, normBindings: c.bindings.map(b => ({...b, row_id: c.resources.find(r => r.id === b.resource_spec_id)!.row_id})), passport, search};
  const parentSha = masterRetainedParentCaptureSha256R1(c);
  const pin = {catalogId: c.definition.catalog_id, definitionId: c.definition.id, definitionVersion: c.definition.definition_version,
    definitionSha256: c.definition.definition_sha256, rows: c.resources.map(r => [r.row_id, r.row_sha256])};
  const model = buildBrickPartitionSelectedDeliveryModelR1(parent, pin, {contract:'brick-partition-selected-delivery-captured-parent/r1',
    catalogId: pack.existingTargetCatalogId, capturedParentSha256: hashBrickPartitionDeliveryCapturedParentR1(parent)}, pack.existingDeliverySource.sha256);
  const source = rows('deliverySource')[0]!, locator = rows('deliveryLocators')[0]!;
  assert.equal(rows('deliverySource').length,1);assert.equal(rows('deliveryLocators').length,1);
  const {created_at: _timestamp, ...managed} = source;
  const reuse = {contract:'master-existing-normative-registry-reuse/r1' as const,locatorExcerptHashKind:'REVIEWED_NORM_PACK_ITEM_SHA256_R1' as const,
    source, locators:[locator], reviewedNormPack:{artifactPath:normPath,artifactUtf8:readFileSync(normPath,'utf8')}};
  const newParameterSources: MasterRetainParentBindingsR1['newParameterSources'] = Object.fromEntries(model.parameters.slice(52).map((q: Json) =>
    [q.parameter_id,{kind:q.parameter_id===SELECTED_DELIVERY_QUANTITY_R1?'DERIVED':'KNOWN',sourceIds:[source.source_key]}]));
  const retained: MasterRetainParentBindingsR1 = {capturedParent:c,capturedParentSha256:parentSha,newParameterSources};
  const applicability = {sourceKey: source.source_key, normId: pack.existingDeliverySource.normId,
    sourceDefinitionHash: locator.locator.sourceDefinitionHash, selectionParameterId:'selected_delivery_selection',selectedValue:'SEPARATE_CONFIRMED',
    serverShipmentAdmissionRequired:true,actualIncludedMaterialOrderRowsOnly:true,automaticReferenceRateAllowed:false,
    unloadingIncluded:false,oldCompositeLogisticsNeedRemainsOpen:true};
  const binding = {rowId:SELECTED_DELIVERY_ROW_R1,applicability,retainParentBindings:retained,reuseExistingNormativeRegistry:reuse};
  const sourceMetadata = {source_title:source.title_ru,source_authority:source.authority,official_url:source.official_url,
    artifact_sha256:source.artifact_sha256,source_kind:'EXISTING_REVIEWED_SELECTED_VEHICLE_PROFILE_NOT_A_UNIVERSAL_RATE',
    exact_locator:locator.locator.exactLocator,use_restriction:'Только отдельная перевозка подтверждённой партии выбранной машиной Ford Transit V363 500 L4 H3. Количество по фактической массе и объёму с проверкой ограничений машины; без разгрузки, переноски и возврата тары.'};
  const resolved = resolveMasterExistingNormativeRegistryReuseR1({config:{stopCode:'BRICK_DELIVERY_RETAINED_R1',binding},newSource:managed,newLocators:[locator]});assert(resolved);
  assert.equal(resolveMasterSingleDefinitionLocatorExcerptSha256R1({stopCode:'BRICK_DELIVERY_RETAINED_R1',binding,sourceMetadata,
    locator:{key:locator.locator_key,payload:locator.locator}}),locator.excerpt_sha256);
  const assembled = prepareMasterRetainedBindingRepresentativeR1({config:{stopCode:'BRICK_DELIVERY_RETAINED_R1',catalogId:pack.existingTargetCatalogId,
    parentReleaseId:read.executionContext.definitionReleaseId,binding},newSource:managed,newLocators:[locator]},
    {parameters:model.parameters,formulas:model.formulas,resources:model.resources,
      newBindings:[{row_id:SELECTED_DELIVERY_ROW_R1,locator_id:locator.id,applicability}],
      successorProvenance:{contract,parentCaptureSha256:parentSha,existingRegistryReused:true,oldWholeLabourAndCraneUnchanged:true,oldOpenNeeds:8,fullTechnicalAcceptance:false}});
  assert.equal(assembled.expectedNormativeBindingCount,12);
  const map = clone(passport.decision.independentCompletenessMap);
  map.retainedMapOrigin={evidenceSha256:map.evidenceSha256,parentCaptureSha256:parentSha};map.evidenceSha256=captureSha;
  map.evidenceReferences=[...map.evidenceReferences,capturePath,normPath];
  map.entries.push({expectedResourceId:contract+':selected-material-transport',operationId:'selected-material-delivery:transport',sourceId:source.source_key,
    condition:'SEPARATE_CONFIRMED_AND_AUTHENTICATED_SAVED_MATERIAL_ORDER_PARTY',category:'delivery',unitId:'trip',
    quantityRule:'EXISTING_SERVER_ADMISSION_OF_SELECTED_PARTY_AND_VEHICLE_WEIGHT_VOLUME_LIMITS',
    formulaId:SELECTED_DELIVERY_ROW_R1+':quantity',resolution:{kind:'ROW',rowId:SELECTED_DELIVERY_ROW_R1}});
  assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:model.formulas,resourceDefinitions:model.resources}),[]);
  const verifyCore = async () => {
    const facts=brickPartitionDeliverySyntheticFactsR1();
    const compile=(parameters:readonly Json[],formulas:readonly Json[],resources:readonly Json[])=>compileCanonicalEstimateCore({operation:'compile',
      catalogId:pack.existingTargetCatalogId,compilerVersion:contract,primaryMeasureParameterId:'net_partition_area_m2',
      // These arrays are the exact, byte-pinned PG JSON capture/model. The
      // compiler validates their schema; its input envelope remains typed here.
      parameterDefinitions:[...parameters] as unknown as CanonicalEstimateCompileCoreInput['parameterDefinitions'],
      formulaDefinitions:[...formulas] as unknown as CanonicalEstimateCompileCoreInput['formulaDefinitions'],
      resourceDefinitions:[...resources] as unknown as CanonicalEstimateCompileCoreInput['resourceDefinitions'],
      submittedParameters:Object.fromEntries(Object.entries(facts).filter(([id])=>parameters.some(q=>q.parameter_id===id))),confirmedParameters:{},
      currencyCode:'KGS',priceItems:[],maximumResourceRows:resources.length,hashJson:async value=>estimateDeterministicHash(value)});
    const before=await compile(c.parameters,c.formulas,c.resources),after=await compile(model.parameters,model.formulas,model.resources);
    assert.deepEqual(after.rows,before.rows,'UNSELECTED_DELIVERY_MUST_PRESERVE_OLD_NUMBERS');
    assert.deepEqual(after.preliminaryNeeds,before.preliminaryNeeds,'EIGHT_OLD_NEEDS_REMAIN');
    assert.deepEqual(after.totals,before.totals);
    assert.deepEqual(model.parameters.slice(0,52),c.parameters);assert.deepEqual(model.formulas.slice(0,24),c.formulas);assert.deepEqual(model.resources.slice(0,24),c.resources);
    for(const q of c.parameters)assert.deepEqual(assembled.normativeSourceIds[q.parameter_id],c.baseline.normative_source_ids[q.parameter_id]);
    assert.equal(model.resources[24].procurement_eligible,false);
    return {status:'PASS_BRICK_DELIVERY_RETAIN52_24_24_BIND11_ADD1_NO_DUPLICATE_REGISTRY',shape:[69,25,25],retainedBindings:11,newBindings:1,
      oldParameterSourceArrays:52,newParameterSourceArrays:17,newPriceBindings:0,oldNeeds:8,newCompleteTypesAccepted:0,fullTechnicalAcceptance:false,publicationPerformed:false};
  };
  return {read,capture:c,passport,search,model,binding,sourceMetadata,locator,map,verifyCore,parentSha};
}

export function prepareBrickPartitionSelectedDeliveryMasterRetainedR1(input: Readonly<{outputRoot?:string}> = {}): MasterSingleDefinitionSuccessorConfig {
  const d=prepareBrickPartitionDeliveryRetainedDraftR1(),c=d.capture,p=d.passport;
  return {contract,stopCode:'BRICK_DELIVERY_RETAINED_R1',applicationName:'brick-partition-selected-delivery-retained-r1',
    expectedBranch:'codex/r4-a5-clean-08b18902',masterPath:'C:/Users/User/Downloads/MASTER_TZ_GOX_BUILD_PRODUCTION (11).md',
    masterSha256:'dfbb757a1562962636259c1c4cffd9127d15882b00cdd49baa8fcd4831bcacf2',
    parentReleaseId:d.read.executionContext.definitionReleaseId,parentSearchReleaseId:d.read.executionContext.searchReleaseId,
    currentReleasePath:'data/estimate-benchmarks/r568-local-developer-canonical-release.json',outputRoot:input.outputRoot??'.release-runtime/r568/next-wave/brick-partition-delivery/publication',
    sourcePaths:[capturePath,guardPath,normPath,'scripts/estimate/r4a13/prepareBrickPartitionSelectedDeliveryMasterRetainedR1.ts',
      'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts','scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1.ts',
      'scripts/estimate/r4a13/masterReviewedNormPackRegistryReuseR1.ts','scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts',
      'scripts/estimate/r4a13/brickPartitionSelectedMaterialDeliveryR1.ts','scripts/estimate/r4a13/selectedMaterialDeliveryForwardR1.ts',
      'data/estimate-benchmarks/source-packs/brick-partition-selected-external-delivery-r1.json','src/lib/estimate/backendPlatform/canonicalEstimateDeterminism.ts',
      'src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts','src/lib/estimate/backendPlatform/canonicalDefinitionPublicationStableValueR1.ts',
      'src/lib/estimate/estimateDeterministicHash.ts','src/lib/estimate/v4/brickPartitionHalfKrer08Column05R1.ts',
      'data/estimate-benchmarks/source-packs/brick-partition-half-unreinforced-krer08-002-05-r1.json'],
    catalogId:pack.existingTargetCatalogId,sourceId:pack.existingDeliverySource.sourceId,normId:pack.existingDeliverySource.normId,sourceMetadata:d.sourceMetadata,
    parameterDefinitions:d.model.parameters,formulaDefinitions:d.model.formulas,resourceDefinitions:d.model.resources,expectedParentShape:[52,24,24],benchmarkOrdinal:0,
    shortInput:{net_partition_area_m2:10},acceptanceInput:brickPartitionDeliverySyntheticFactsR1(),runtimeProfileInput:{},runtimeProfileClassification:{},runtimeProfileSourceIds:{},
    validationScenario:'EXACT_RETAINED_MASONRY_PARENT_AND_OPTIONAL_SAVED_PARTY_DELIVERY_NOT_SITE_APPROVAL',
    passport:{canonicalRuName:c.definition.passport.canonicalRuName,workKey:c.definition.passport.workKey,physicalResultRu:p.physical_result_ru,
      includedScopeRu:[...p.included_scope_ru,'Отдельная подтверждённая перевозка выбранных материалов сохранённой сметы, когда она явно выбрана и согласована с перевозчиком.'],
      excludedScopeRu:[...p.excluded_scope_ru,'Разгрузка, переноска, возврат тары и остальные незакрытые части внешней логистики не включены в эту перевозку.'],
      independentCompletenessMap:d.map,unresolvedApplicableResourceRowIds:p.decision.unresolvedResourceRowIds},
    applicability:{...c.definition.applicability,selectedMaterialDeliveryContract:contract,retainedParentCaptureSha256:d.parentSha,
      noNewPhysicalNorm:true,existingRegistryReused:true,fullTechnicalAcceptance:false},binding:d.binding,locator:{key:d.locator.locator_key,payload:d.locator.locator},
    search:{primaryUom:d.search.primary_uom,canonicalNameRu:c.definition.passport.canonicalRuName,aliases:['кирпичная перегородка в полкирпича','подтверждённая отдельная перевозка материалов перегородки'],
      shortScopeRu:'Неармированная перегородка в полкирпича при высоте этажа до 4 м. При выборе доступна отдельная перевозка подтверждённой партии; разгрузка и восемь дополнительных потребностей остаются для уточнения.',
      keyDistinguishingParameters:['net_partition_area_m2','selected_delivery_selection'],clarificationFields:d.model.parameters.filter((q:Json)=>q.truth_metadata.visibility_role==='USER_INPUT').map((q:Json)=>q.parameter_id),
      includedBoundaries:p.included_scope_ru,excludedBoundaries:p.excluded_scope_ru,extraSearchTermsRu:'перевозка партии кирпич раствор вода доски поковки Ford Transit',
      sourceProvenance:{contract,parentCaptureSha256:d.parentSha,oldBindings:11,newBindings:1,oldNeedsRemain:8,fullTechnicalAcceptance:false}},
    forbiddenAdjacentMatchers:[/floor-underlayer:|steel-water:|professional_.*_set/iu],owner:'ROOT_SINGLE_INTEGRATOR',receiptFileStem:'brick_partition_selected_delivery_retained_r1',verifyCore:d.verifyCore};
}
