import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,statSync} from 'node:fs';
import {isAbsolute,relative,resolve} from 'node:path';
import pack from '../../../data/estimate-benchmarks/source-packs/fire-alarm-rip24-06-whole-factory-delivery-r24.json';
import fixture from '../../../data/estimate-benchmarks/fixtures/fire-alarm-psu-whole-test-only-r24.json';
import {fireAlarmReservedPowerWholeFactoryConfigR24,prepareFireAlarmReservedPowerWholeFactoryProposedR24,type FireAlarmPsuProposedConfigR24} from './prepareFireAlarmReservedPowerWholeFactoryR24';
import {fireAlarmReservedPowerWholeResourceIdsR24} from '../../../src/lib/estimate/backendPlatform/fireAlarmReservedPowerWholeFactoryR24';
import {readFrozenDefinitionSnapshotV1} from '../../../src/lib/estimate/backendPlatform/canonicalFrozenDefinitionSnapshotV1';
import {compileFormulaGraph} from '../../../src/lib/estimate/backendPlatform/formulaGraph';
import {canonicalEstimateStableJson as stableJson} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import {canonicalEstimateSha256HexText} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateSha256';
import type {AutomaticOwnerDefinition} from '../../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import type {CanonicalEstimateFormulaDefinition,CanonicalEstimateResourceDefinition} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {CATALOG_INDEPENDENT_COMPLETENESS_MAP_CONTRACT} from './catalogFirstEstimateMinimumInputAudit.shared';
import {buildMasterSingleDefinitionGeneratedRegistryRowsR1,buildMasterPublicationResourceRowsR1,
  hashMasterSingleDefinitionSuccessorReceiptR1,resolveMasterSingleDefinitionLocatorExcerptSha256R1,
  validateIndependentCompletenessMapReferences,type MasterSingleDefinitionSuccessorConfig as Config} from './prepareMasterSingleDefinitionSuccessorR1';
import {masterRetainedParentCaptureSha256R1,prepareMasterRetainedBindingRepresentativeR1,
  type MasterRetainedParentCaptureR1,type MasterRetainParentBindingsR1} from './masterSingleDefinitionRetainParentBindingsR1';
import {masterScopedNormativeRegistryCaptureSha256R1,resolveMasterScopedNormativeRegistryOptInR1,
  type MasterCapturedScopedNormativeRegistryR1,type MasterScopedNormativeRegistryInputR1} from './masterScopedNormativeRegistryPreimageR1';

const sourceKey='manufacturer_rip24_06_complete_factory_delivery_rev10_20260925';
const normId='MANUFACTURER_RIP24_06_FACTORY_DELIVERY_SIX_NATIVE_LINES_NOT_INSTALLATION_NORM';
const locatorKey='rip24-06-rev10-20260925-table2-whole-six-lines';
const pointerPath='data/estimate-benchmarks/r568-local-developer-canonical-release.json';
const pointerSha='404bdb3657d36efb731f8131f63dc126e452f635579926d0f3855dbf749053f6';
const ownPath='scripts/estimate/r4a13/prepareFireAlarmPsuCurrentMasterR24.ts';
const parentSha='beef4f7ee42074092c85771868a29a0f8e03ff0e632c197fe49ead1aa89ce328';
const object=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const strings=(v:unknown):v is string[]=>Array.isArray(v)&&v.every(s=>typeof s==='string');
const valueSha=(v:unknown)=>canonicalEstimateSha256HexText(stableJson(v));
const byteSha=(v:Buffer)=>createHash('sha256').update(v).digest('hex');
type Pin=Readonly<{path:string;sha256:string}>;
type Capture=MasterRetainedParentCaptureR1&Readonly<{parameters:AutomaticOwnerDefinition['parameters'];
  formulas:AutomaticOwnerDefinition['formulas'];resources:AutomaticOwnerDefinition['resources']}>;
export type FireAlarmPsuCapturePreparationInputR24=Readonly<{
  sourceRoot:string;currentFullParent:Pin;currentReadReceipt:Pin;
  primaryManual:Pin;primaryProductPage:Pin;outputRoot?:string;
  /** Real finite callback and normal/locked qualification guard supplied by ROOT.
   * A passing model rehearsal or a file-hash flag is not either callback. */
  verifyCore:Config['verifyCore'];verifyTargetPrecondition:NonNullable<Config['verifyTargetPrecondition']>;
}>;
export type FireAlarmPsuPreparedCaptureR24=Readonly<{
  status:'PROPOSED_ROWS_NOT_ACTUAL_DB';captureInput:MasterScopedNormativeRegistryInputR1;
  parent:Readonly<{catalogId:string;definitionId:string;baselineId:string;definitionSha256:string;
    captureFileSha256:string;capturedParentSha256:string;pointerSha256:string}>;
  finalLocatorPayloadSha256:string;sourcePathPins:readonly Pin[];
  generatedIdsAreActualDbIds:false;sourceAdmission:false;normalConfigReturned:false;
}>;
export type FireAlarmPsuCurrentMasterInputR24=FireAlarmPsuCapturePreparationInputR24&Readonly<{
  proposedCapture:FireAlarmPsuPreparedCaptureR24;proposedCapturePin:Pin;
  actualFormalCapture:MasterCapturedScopedNormativeRegistryR1;actualFormalCapturePin:Pin;actualFormalSecondCapturePin:Pin;
  /** Existing READONLY_PREIMAGE_OUTCOME protocol, not an approval flag. */
  actualFormalReadReceipt:Pin;actualFormalGovernorReceipt:Pin;
}>;
function pinned(pin:Pin):Buffer{
  assert(isAbsolute(pin.path)&&/^[0-9a-f]{64}$/u.test(pin.sha256),'FIRE_PSU_ROOT_INPUT_PIN_REQUIRED');
  assert(statSync(pin.path).size<=4*1024*1024,'FIRE_PSU_ROOT_INPUT_BYTE_BOUND');
  const bytes=readFileSync(pin.path);assert.equal(byteSha(bytes),pin.sha256,'FIRE_PSU_ROOT_INPUT_SHA:'+pin.path);return bytes;
}
/** Validate the existing R221 accepted capture-outcome protocol plus the
 * existing owned-governor receipt. These facts prove read provenance only;
 * the ordinary scoped resolver still checks raw scope, caps and absence. */
function verifyActualFormalReadR24(input:FireAlarmPsuCurrentMasterInputR24):void{
  const first=input.actualFormalCapture;
  assert.notEqual(resolve(input.actualFormalCapturePin.path),resolve(input.actualFormalSecondCapturePin.path),'DISTINCT_TWO_CAPTURE_ARTIFACTS_REQUIRED');
  assert.equal(input.actualFormalSecondCapturePin.sha256,input.actualFormalCapturePin.sha256,'TWO_CAPTURE_FILE_BYTES_IDENTICAL');
  const firstFile:unknown=JSON.parse(pinned(input.actualFormalCapturePin).toString('utf8'));
  const secondFile:unknown=JSON.parse(pinned(input.actualFormalSecondCapturePin).toString('utf8'));
  assert.equal(stableJson(firstFile),stableJson(first),'GENUINE_ARGUMENT_EQUALS_PINNED_FIRST_CAPTURE');
  assert.equal(stableJson(secondFile),stableJson(first),'TWO_FULL_FORMAL_CAPTURES_SCOPE_AND_RAW_IDENTICAL');
  assert.equal(first.contract,'master-scoped-normative-registry-preimage/r1');assert.equal(first.projection,'pg-jsonb-text-utc-microseconds/r1');
  assert.equal(masterScopedNormativeRegistryCaptureSha256R1(first),first.captureSha256);
  const governor:unknown=JSON.parse(pinned(input.actualFormalGovernorReceipt).toString('utf8'));assert(object(governor));
  assert.equal(governor.status,'EXPECTED_OUTCOME_AND_CLEAN_CLOSURE');assert.equal(governor.error,null);assert.equal(governor.exitCode,0);
  assert.deepEqual(governor.remainingOwnedProcesses,[]);assert.deepEqual(governor.sourceDrift,[]);
  assert(Array.isArray(governor.ownedPids)&&governor.ownedPids.length>0,'ACTUAL_GOVERNED_PROCESS_REQUIRED');
  assert(typeof governor.elapsedSeconds==='number'&&Number.isFinite(governor.elapsedSeconds)&&governor.elapsedSeconds>0);
  const receipt:unknown=JSON.parse(pinned(input.actualFormalReadReceipt).toString('utf8'));assert(object(receipt));
  assert.equal(receipt.status,'READONLY_CAPTURED_PREIMAGE_NOT_ADMISSION');assert.equal(receipt.failure,null);
  assert.equal(receipt.rollback,true);assert.equal(receipt.databaseWrites,0);assert.equal(receipt.capturedRawTwice,true);
  assert.equal(receipt.globalAbsenceProved,false);assert.equal(receipt.activationAllowed,false);assert.equal(receipt.sourcePprApproval,false);assert.equal(receipt.FULL,false);
  assert.equal(receipt.generatedIdentityStatus,'GENERATED_CANDIDATE_NOT_DB_ID');
  assert.equal(receipt.sourceKey,first.scope.sourceKey);assert.equal(receipt.scopeArtifact,first.scope.artifactSha256);
  assert.equal(receipt.firstCaptureSha256,first.captureSha256);assert.equal(receipt.sourceRows,first.sourceRows.length);assert.equal(receipt.locatorRows,first.locatorRows.length);
  assert.equal(receipt.generatedSourceId,first.scope.generatedSourceId);assert.equal(first.scope.generatedLocatorIds.length,1);
  assert.equal(receipt.generatedLocatorId,first.scope.generatedLocatorIds[0]);
  assert(object(receipt.actor));assert.equal(receipt.actor.isolation,'repeatable read');assert.equal(receipt.actor.read_only,'on');assert.equal(receipt.actor.timezone,'UTC');
  for(const key of ['actor','session_actor','database_name','rr_snapshot']){
    const value=receipt.actor[key];assert(typeof value==='string'&&value.length>0,'ACTUAL_READ_ACTOR_CONTEXT:'+key);
  }
  assert(Array.isArray(receipt.queryEvidence)&&receipt.queryEvidence.length>=4,'PINNED_ACTUAL_QUERY_EVIDENCE_REQUIRED');
  for(const pin of receipt.queryEvidence){assert(object(pin)&&typeof pin.path==='string'&&typeof pin.sha256==='string');pinned({path:pin.path,sha256:pin.sha256});}
}
function records(v:unknown):Record<string,unknown>[]{assert(Array.isArray(v)&&v.every(object));return v;}

/** Same declared frozen boundary and exact typed narrowing as accepted R277.
 * Nothing is promoted from baseline input_values into runtime input. */
function native(raw:unknown):Readonly<{capture:Capture;definition:AutomaticOwnerDefinition}>{
  assert(object(raw)&&object(raw.capture)&&object(raw.contentPassport),'ACTUAL_R255_FULL_WRAPPER_REQUIRED');
  assert.equal(raw.readOnly,true);assert.equal(raw.sourceMetadataLosslessRoundtrip,true);
  const models=readFrozenDefinitionSnapshotV1({models:[{...raw.capture,passport:raw.contentPassport}]},'models').models;
  assert.equal(models.length,1);const m=models[0];assert(m);
  const expected=fixture.currentReadOnlyIdentity;
  assert.equal(m.definition.id,expected.definitionId);assert.equal(m.definition.catalog_id,pack.catalogId);
  assert.equal(m.definition.definition_version,4);assert.equal(m.definition.definition_sha256,expected.definitionSha256);
  assert.equal(m.baseline.id,expected.baselineId);assert.equal(m.baseline.definition_version_id,m.definition.id);
  assert.equal(m.passport.definition_version_id,m.definition.id);
  const parameters:AutomaticOwnerDefinition['parameters']=m.parameters.map(row=>{
    assert(typeof row.parameter_id==='string'&&typeof row.value_type==='string'&&typeof row.required==='boolean');
    assert(typeof row.ordinal==='number'&&Number.isSafeInteger(row.ordinal)&&typeof row.title_ru==='string');
    assert(row.unit_id===null||typeof row.unit_id==='string');
    assert(row.constraints_json===null||object(row.constraints_json));assert(object(row.truth_metadata));
    assert.equal(row.default_value,null,'NO_CAPTURED_DEFAULT_PROMOTION');
    return{...row,parameter_id:row.parameter_id,value_type:row.value_type,required:row.required,ordinal:row.ordinal,title_ru:row.title_ru,
      unit_id:row.unit_id,default_value:row.default_value,constraints_json:row.constraints_json,truth_metadata:row.truth_metadata};
  });
  const formulas:CanonicalEstimateFormulaDefinition[]=m.formulas.map(row=>{
    assert(typeof row.formula_id==='string'&&typeof row.output_unit_id==='string'&&typeof row.expression_source==='string');
    assert(typeof row.ast_sha256==='string'&&strings(row.input_parameter_ids));
    const parsed=compileFormulaGraph(row.expression_source);assert.deepEqual(parsed.ast,row.ast,'NATIVE_AST_EXACT');
    assert.deepEqual(parsed.inputParameterIds,row.input_parameter_ids,'NATIVE_FORMULA_INPUTS_EXACT');
    return{...row,formula_id:row.formula_id,output_unit_id:row.output_unit_id,expression_source:row.expression_source,
      ast:parsed.ast,input_parameter_ids:row.input_parameter_ids,ast_sha256:row.ast_sha256};
  });
  const resources:CanonicalEstimateResourceDefinition[]=m.resources.map(row=>{
    assert(typeof row.id==='string'&&typeof row.row_id==='string'&&typeof row.ordinal==='number'&&Number.isSafeInteger(row.ordinal));
    assert(typeof row.section==='string'&&typeof row.category==='string'&&typeof row.title_ru==='string');
    assert(typeof row.unit_id==='string'&&typeof row.formula_id==='string'&&typeof row.row_sha256==='string');
    assert(object(row.inclusion_ast)&&object(row.resource_graph)&&typeof row.procurement_eligible==='boolean');
    assert(row.cost_owner_id===null||typeof row.cost_owner_id==='string');assert(row.source_metadata===null||object(row.source_metadata));
    return{...row,id:row.id,row_id:row.row_id,ordinal:row.ordinal,section:row.section,category:row.category,title_ru:row.title_ru,
      unit_id:row.unit_id,formula_id:row.formula_id,row_sha256:row.row_sha256,inclusion_ast:row.inclusion_ast,
      resource_graph:row.resource_graph,procurement_eligible:row.procurement_eligible,cost_owner_id:row.cost_owner_id,source_metadata:row.source_metadata};
  });
  const capture:Capture={...raw.capture,definition:m.definition,baseline:m.baseline,parameters,formulas,resources,bindings:m.bindings,
    normativeSources:records(raw.capture.normativeSources),normativeLocators:records(raw.capture.normativeLocators)};
  assert.equal(stableJson(capture),stableJson(raw.capture),'EVERY_ACTUAL_NATIVE_FIELD_RETAINED');
  assert.deepEqual([parameters.length,formulas.length,resources.length,capture.bindings.length,capture.normativeSources.length,capture.normativeLocators.length],[58,37,37,1,1,1]);
  assert(object(capture.baseline.normative_source_ids)&&Object.keys(capture.baseline.normative_source_ids).length===58);
  const definition:AutomaticOwnerDefinition={parameters,formulas,resources,runtimeInput:{},runtimeClassification:{},runtimeSourceIds:{},
    ordinaryParameterIds:parameters.filter(p=>p.truth_metadata.value_source_role==='USER_MEASURED').map(p=>p.parameter_id)};
  assert.equal(valueSha({parameters,formulas,resources}),'e5717ada31f2fb6204e7d479da95265a872036920208ad839693a8a07e777d08');
  return{capture,definition};
}

/** One pinned base host for both phases; no formal capture or approval here. */
function prepareFireAlarmPsuPinnedBaseR24(input:FireAlarmPsuCapturePreparationInputR24){
  assert(isAbsolute(input.sourceRoot));assert.equal(resolve(input.sourceRoot),resolve(__dirname,'../../..'),'ONE_SOURCE_ROOT_REQUIRED');
  const own=(p:string)=>{const full=resolve(input.sourceRoot,p),rel=relative(input.sourceRoot,full);
    assert(!isAbsolute(p)&&rel!==''&&!isAbsolute(rel)&&!rel.startsWith('..'),'OWN_ROOT_RELATIVE_PATH_REQUIRED');return full;};
  assert.equal(input.currentFullParent.sha256,parentSha);const raw:unknown=JSON.parse(pinned(input.currentFullParent).toString('utf8'));
  assert(object(raw)&&object(raw.publicIdentity)&&object(raw.membership));
  assert.equal(raw.publicIdentity.catalog_id,pack.catalogId);assert.equal(raw.publicIdentity.work_key,'fire_alarm_system');
  const {capture:c,definition:base}=native(raw);const capturedParentSha256=masterRetainedParentCaptureSha256R1(c);
  const pointerBytes=readFileSync(own(pointerPath));assert.equal(byteSha(pointerBytes),pointerSha);
  const pointer:unknown=JSON.parse(pointerBytes.toString('utf8'));assert(object(pointer));
  assert(typeof pointer.definitionReleaseId==='string'&&typeof pointer.searchReleaseId==='string');
  assert.equal(pointer.productionAccessed,false);assert.equal(pointer.definitionReleaseId,'2df79e8d-4012-5557-87c0-f36285f59f17');
  assert.equal(pointer.searchReleaseId,'9b042edf-ca06-50f6-969a-556e6d14547a');
  assert.equal(raw.membership.release_id,pointer.definitionReleaseId);assert.equal(raw.membership.definition_version_id,c.definition.id);
  assert.equal(raw.membership.approved_template_baseline_id,c.baseline.id);
  assert.equal(input.currentReadReceipt.sha256,'3efd7f311bfed6607325d70eb39100c78a4745d2db3bce52a9905d525da1ddba');pinned(input.currentReadReceipt);
  assert.equal(input.primaryManual.sha256,pack.primary.sha256);pinned(input.primaryManual);
  assert.equal(input.primaryProductPage.sha256,pack.officialProductPage.sha256);pinned(input.primaryProductPage);
  const ownPins=[
    ['src/lib/estimate/backendPlatform/fireAlarmReservedPowerWholeFactoryR24.ts','d373d8a54c988c59231f580a64a3286909a5a253b66c23a737eaedc6cc5ee08d'],
    ['scripts/estimate/r4a13/prepareFireAlarmReservedPowerWholeFactoryR24.ts','3e36f932e1141acb4bd1a6a4bcaf45d2a5b182c97d91455e996e5b02bdcdb73a'],
    ['data/estimate-benchmarks/source-packs/fire-alarm-rip24-06-whole-factory-delivery-r24.json','5654b34ac6b3db6ebb6c66f14d5b74d42ff45d5ff69a3d00ecba9aaac3648f8a'],
    ['data/estimate-benchmarks/fixtures/fire-alarm-psu-whole-test-only-r24.json','b0e1573a78371e65d8f94b956280d491bf2a11752cfa52c9cc7753567dc4cd54']
  ] as const;
  for(const [path,sha]of ownPins)assert.equal(byteSha(readFileSync(own(path))),sha,'UNCHANGED_OWN_SOURCE:'+path);
  const sharedPaths=['scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts','scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1.ts',
    'scripts/estimate/r4a13/masterScopedNormativeRegistryPreimageR1.ts','scripts/estimate/r4a13/catalogFirstEstimateMinimumInputAudit.shared.ts',
    'src/lib/estimate/backendPlatform/canonicalFrozenDefinitionSnapshotV1.ts','src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts',
    'src/lib/estimate/backendPlatform/canonicalEstimateDeterminism.ts','src/lib/estimate/v4/automaticConstructionOwnerR1.ts'];
  const sourcePaths=[...new Set([own(ownPath),...ownPins.map(([p])=>own(p)),...sharedPaths.map(own),own(pointerPath),
    input.currentFullParent.path,input.currentReadReceipt.path,
    input.primaryManual.path,input.primaryProductPage.path])];for(const path of sourcePaths)readFileSync(path);
  const ids=fireAlarmReservedPowerWholeResourceIdsR24();const first=ids[0];assert(first);
  const rowApplicability=Object.fromEntries(ids.map((rowId,index)=>{const part=pack.parts[index];assert(part);return[rowId,{
    contract:pack.contract,norm_id:normId,source_id:sourceKey,sourceRole:pack.sourceKind,sourceArtifactSha256:pack.primary.sha256,
    nativeDeliveryLine:index+2,partKey:part.key,sourceCountPerDevice:part.countPerDevice,unitId:part.unitId,
    nativePsuOwner:pack.existingOwner.powerRowId,quantityBasis:'EXACT_UNCHANGED_NATIVE_PSU_FORMULA',
    notAdditionalOrder:true,installationNormAccepted:false,actualProjectApproval:false,priceScopeConfirmed:false}];}));
  const retained:MasterRetainParentBindingsR1={capturedParent:c,capturedParentSha256,
    capturedSourcePreimage:{sourceKey,expected:null},newParameterSources:{[pack.profileId]:{kind:'KNOWN',sourceIds:[sourceKey]}}};
  const completeness={contract:CATALOG_INDEPENDENT_COMPLETENESS_MAP_CONTRACT,sourceKind:'PRODUCT_SYSTEM_TDS',
    generatedFromCurrentRows:false,evidenceSha256:pack.primary.sha256,
    entries:[{operationId:'whole-factory-delivery',expectedResourceId:pack.existingOwner.powerRowId,condition:'Existing native PSU quantity',
      sourceId:sourceKey,formulaId:pack.existingOwner.powerFormulaId,resolution:{kind:'ROW',rowId:pack.existingOwner.powerRowId}},
      ...pack.parts.map(part=>({operationId:'whole-factory-delivery',expectedResourceId:pack.prefix+':'+part.key,
        condition:'Selected exact 24V/4A factory delivery, source table2',sourceId:sourceKey,formulaId:pack.prefix+':formula:'+part.key,
        resolution:{kind:'INCLUDED_COMPONENT_ROW',rowId:pack.prefix+':'+part.key,parentRowId:pack.existingOwner.powerRowId}}))],
    operationalInstallationAccepted:false,externalBatteriesIncluded:false,projectOrPriceApproval:false};
  const host:FireAlarmPsuProposedConfigR24={contract:pack.contract,stopCode:'FIRE_PSU_CURRENT_R24',applicationName:'fire-psu-existing-current-r24',
    expectedBranch:'codex/r4-a5-clean-08b18902',masterPath:'C:/Users/User/Downloads/GOX_BUILD_MASTER_TZ_2_16_2026-10-24.txt',
    masterSha256:'541bc82df10231ca885288a7937283729b08484bd8301a22cd57a7b5c221eb40',parentReleaseId:pointer.definitionReleaseId,
    parentSearchReleaseId:pointer.searchReleaseId,currentReleasePath:own(pointerPath),outputRoot:input.outputRoot??'.release-runtime/fire-psu-existing-current-r24',
    sourcePaths,catalogId:pack.catalogId,sourceId:sourceKey,normId,
    sourceMetadata:{source_title:'Официальное руководство: целая заводская поставка резервированного источника питания24В/4А',
      source_authority:'Изготовитель; официальный сайтbolid.ru и руководствоАЦДР.436534.002-06 РЭп,Изм.10 от25.09.2026',
      exact_locator:pack.primary.locator,use_restriction:pack.scopeRu+' Заводская комплектность не является монтажной нормой, подтверждением проекта, снабжения или цены. Батареи не входят в поставку.',
      source_kind:pack.sourceKind,official_url:pack.primary.officialUrl,artifact_sha256:pack.primary.sha256,effective_from:null},
    parameterDefinitions:base.parameters,formulaDefinitions:base.formulas,resourceDefinitions:base.resources,
    shortInput:{...fixture.baseTestOnlyInputs},acceptanceInput:{...fixture.baseTestOnlyInputs},expectedParentShape:[58,37,37],benchmarkOrdinal:277,
    validationScenario:'TEST_ONLY complete factory delivery; R255 native quantity/owners preserved; external batteries, stock, project, labour and price remain unapproved',
    passport:{canonicalRuName:'Монтаж системы пожарной сигнализации',workKey:'fire_alarm_system',
      physicalResultRu:'Целая заводская поставка выбранного резервированного источника питания внутри прежней системы',
      includedScopeRu:[pack.scopeRu],excludedScopeRu:[...pack.notCoveredRu,'TEST_ONLY вход не подтверждает фактический объект, проект или ППР.'],
      independentCompletenessMap:completeness},applicability:{...c.definition.applicability},
    binding:{rowId:first,additionalRowIds:ids.slice(1),applicability:rowApplicability[first],applicabilityByRowId:rowApplicability,retainParentBindings:retained},
    locator:{key:locatorKey,payload:{contract:pack.contract,normId,sourceRole:pack.sourceKind,actualProjectApproval:false,factoryDeliveryDoesNotReplaceInstallationNorm:true}},
    search:{primaryUom:'m2',canonicalNameRu:'Монтаж системы пожарной сигнализации',aliases:[],shortScopeRu:pack.scopeRu,
      keyDistinguishingParameters:[pack.profileId],clarificationFields:[],includedBoundaries:[pack.scopeRu],excludedBoundaries:[...pack.notCoveredRu],
      extraSearchTermsRu:'система пожарной сигнализации резервированное питание заводская поставка',
      sourceProvenance:{contract:pack.contract,currentFullParentSha256:parentSha,capturedParentSha256,
        manufacturerScopeOnly:true,actualProjectApproval:false,newPublicCatalogs:0,FULL:false}},
    forbiddenAdjacentMatchers:[/CCTV_system|access_control_system|low_voltage_system|sprinkler/iu],owner:'ROOT_SINGLE_INTEGRATOR_FIRE_ALARM_EXISTING_OWNER',
    receiptFileStem:'fire_alarm_psu_factory_delivery_r24',verifyCore:input.verifyCore,verifyTargetPrecondition:input.verifyTargetPrecondition};
  return{host,base,c,capturedParentSha256,sourcePaths,ids,rowApplicability};
}

function generatedRows(config:FireAlarmPsuProposedConfigR24){
  return buildMasterSingleDefinitionGeneratedRegistryRowsR1({config,resolvedSourceMetadata:config.sourceMetadata,
    resolvedLocators:[{key:config.locator.key,payload:config.locator.payload,excerptSha256:resolveMasterSingleDefinitionLocatorExcerptSha256R1(config)}],
    projectSourcePackage:null,projectSourcePackageSet:null});
}
function checkRetainedCandidate(context:ReturnType<typeof prepareFireAlarmPsuPinnedBaseR24>,next:FireAlarmPsuProposedConfigR24,
  generated:ReturnType<typeof generatedRows>){
  const {c,capturedParentSha256,ids,rowApplicability}=context;
  assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:next.passport.independentCompletenessMap,
    formulaDefinitions:next.formulaDefinitions,resourceDefinitions:next.resourceDefinitions}),[],'WHOLE_FACTORY_MAP_REAL_REFERENCES');
  const locator=generated.newLocators[0];assert(locator);
  const projected=prepareMasterRetainedBindingRepresentativeR1({config:next,...generated},{parameters:next.parameterDefinitions,
    formulas:next.formulaDefinitions.map(f=>c.formulas.some(old=>old.formula_id===f.formula_id)?f:{...f,ast_sha256:hashMasterSingleDefinitionSuccessorReceiptR1(f.ast)}),
    resources:buildMasterPublicationResourceRowsR1(next.resourceDefinitions),
    newBindings:ids.map(row_id=>({row_id,locator_id:locator.id,applicability:rowApplicability[row_id]})),
    successorProvenance:{contract:pack.contract,sourceId:sourceKey,normId,parentDefinitionId:c.definition.id,parentBaselineId:c.baseline.id,
      capturedParentSha256,currentFullReadSha256:parentSha},lifecycleMetadata:{contract:pack.contract,masterSha256:next.masterSha256}});
  assert.equal(projected.expectedNormativeBindingCount,6,'EXACT_ONE_OLD_PLUS_FIVE_NEW_BINDINGS');
  for(const [id,sources]of Object.entries(c.baseline.normative_source_ids))assert.deepEqual(projected.normativeSourceIds[id],sources,'OLD_58_SOURCE_ARRAYS_EXACT');
  assert.equal(next.projectSourcePackagePath,undefined);assert.equal(next.catalogAppend,undefined);
  assert.equal(generated.newSource.metadata.activationAllowed,false);assert.equal(next.applicability.rip24_06FactoryDelivery.FULL,false);
}

/** Phase1: ROOT may save this whole proposed input before passing captureInput
 * to the EXISTING capture arm on its dedicated twice-read RR/UTC connection.
 * No MasterCaptured object, source approval or normal Config is made here. */
export function prepareFireAlarmPsuFormalCaptureInputR24(input:FireAlarmPsuCapturePreparationInputR24):FireAlarmPsuPreparedCaptureR24{
  const context=prepareFireAlarmPsuPinnedBaseR24(input);
  const candidate=prepareFireAlarmReservedPowerWholeFactoryProposedR24({hostConfig:context.host,capturedParentDefinition:context.base,
    expectedCapturedComputationSha256:valueSha({parameters:context.base.parameters,formulas:context.base.formulas,resources:context.base.resources}),
    newSourcePaths:context.sourcePaths,verifyWholeFactoryDeliveryCore:input.verifyCore});
  assert(!Object.hasOwn(candidate,'capturedScopedNormativeRegistry'),'PROPOSED_PHASE_HAS_NO_CAPTURE');
  const generated=generatedRows(candidate);checkRetainedCandidate(context,candidate,generated);
  // Deliberately expose only the reader's small Config contract, never a
  // complete normal/publishable Config from this proposed phase.
  const captureInput:MasterScopedNormativeRegistryInputR1={config:{stopCode:candidate.stopCode,normId:candidate.normId,
    binding:{retainParentBindings:{capturedSourcePreimage:candidate.binding.retainParentBindings?.capturedSourcePreimage}}},...generated};
  return{status:'PROPOSED_ROWS_NOT_ACTUAL_DB',captureInput,parent:{catalogId:pack.catalogId,definitionId:String(context.c.definition.id),
    baselineId:String(context.c.baseline.id),definitionSha256:String(context.c.definition.definition_sha256),captureFileSha256:parentSha,
    capturedParentSha256:context.capturedParentSha256,pointerSha256:pointerSha},finalLocatorPayloadSha256:valueSha(candidate.locator.payload),
    sourcePathPins:candidate.sourcePaths.map(path=>({path,sha256:byteSha(readFileSync(path))})),
    generatedIdsAreActualDbIds:false,sourceAdmission:false,normalConfigReturned:false};
}

/** Phase2: bind the genuine formal result to the same proposed full rows.
 * This preserves the original strict wrapper and all normal/locked guards. */
export function prepareFireAlarmPsuCurrentMasterR24(input:FireAlarmPsuCurrentMasterInputR24):Config{
  const context=prepareFireAlarmPsuPinnedBaseR24(input),formal=input.actualFormalCapture;
  assert.equal(input.proposedCapture.status,'PROPOSED_ROWS_NOT_ACTUAL_DB');
  const proposedFile:unknown=JSON.parse(pinned(input.proposedCapturePin).toString('utf8'));
  assert.equal(stableJson(proposedFile),stableJson(input.proposedCapture),'EXACT_PROPOSED_INPUT_FILE_REQUIRED');
  verifyActualFormalReadR24(input);
  assert.equal(input.proposedCapture.parent.capturedParentSha256,context.capturedParentSha256);
  assert.equal(input.proposedCapture.parent.captureFileSha256,parentSha);assert.equal(input.proposedCapture.parent.pointerSha256,pointerSha);
  const actualBasePins=context.sourcePaths.map(path=>({path,sha256:byteSha(readFileSync(path))}));
  assert.deepEqual(actualBasePins,input.proposedCapture.sourcePathPins,'EXACT_PROPOSED_SOURCE_PATHS_AND_BYTES_REQUIRED');
  const actualSourcePaths=[...context.sourcePaths,input.proposedCapturePin.path,input.actualFormalCapturePin.path,input.actualFormalSecondCapturePin.path,
    input.actualFormalReadReceipt.path,input.actualFormalGovernorReceipt.path];
  const next=fireAlarmReservedPowerWholeFactoryConfigR24({hostConfig:{...context.host,capturedScopedNormativeRegistry:formal,
    search:{...context.host.search,sourceProvenance:{...context.host.search.sourceProvenance,formalCaptureSha256:formal.captureSha256}}},
    capturedParentDefinition:context.base,
    expectedCapturedComputationSha256:valueSha({parameters:context.base.parameters,formulas:context.base.formulas,resources:context.base.resources}),
    newSourcePaths:actualSourcePaths,verifyWholeFactoryDeliveryCore:input.verifyCore});
  assert.deepEqual(next.sourcePaths,[...new Set(actualSourcePaths)],'ONLY_DECLARED_BIND_EVIDENCE_ADDED_TO_EXACT_SOURCE_PATHS');
  const generated=generatedRows(next);
  assert.equal(stableJson(generated.newSource),stableJson(input.proposedCapture.captureInput.newSource),'FINAL_SOURCE_EQUALS_REAL_CAPTURE_INPUT');
  assert.equal(stableJson(generated.newLocators),stableJson(input.proposedCapture.captureInput.newLocators),'FINAL_LOCATORS_EXCERPT_AND_IDS_EQUAL_CAPTURE_INPUT');
  assert.equal(valueSha(next.locator.payload),input.proposedCapture.finalLocatorPayloadSha256,'ONE_FINAL_LOCATOR_PAYLOAD');
  const resolved=resolveMasterScopedNormativeRegistryOptInR1({config:next,...generated});assert(resolved,'FORMAL_CAPTURE_REQUIRED');
  assert.equal(stableJson(resolved.declaration),stableJson(formal));checkRetainedCandidate(context,next,generated);
  assert.equal(next.verifyCore,input.verifyCore);assert.equal(next.verifyTargetPrecondition,input.verifyTargetPrecondition);
  return next;
}
