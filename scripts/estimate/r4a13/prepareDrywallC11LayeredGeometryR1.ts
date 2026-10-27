import {resolve} from 'node:path';
import {drywallC11CurrentPhysicalPackR1 as currentPhysicalPackC11,drywallC11CurrentPhysicalContinuationR1 as currentPhysicalC11,
 drywallC11CurrentPhysicalCompletenessR1 as currentPhysicalCompletenessC11,drywallC11ActualRetainedModelR2 as currentActualModelC11} from '../../../src/lib/estimate/v4/drywallC11LayeredGeometryR1';
import {assembleMasterSingleDefinitionManagedRegistryCandidateR1} from './prepareMasterSingleDefinitionSuccessorR1';
import {resolveMasterScopedNormativeRegistryOptInR1,type MasterCapturedScopedNormativeRegistryR1} from './masterScopedNormativeRegistryPreimageR1';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {appendDrywallC11LayeredGeometryR1 as append,compileDrywallC11LayeredGeometryR1 as compile,
 drywallC11LayeredGeometryPackR1 as pack,drywallC11LayeredCompletenessR1 as completeness,drywallC11LayeredPrimarySelectionR1 as primary} from '../../../src/lib/estimate/v4/drywallC11LayeredGeometryR1';
import {effectiveResourceQuantityParameterId} from '../../../src/lib/estimate/v4/effectivePurchaseBalanceR1';
import {masterRetainedParentCaptureSha256R1,masterRetainedLineageValueSha256V1,type MasterRetainedParentCaptureR1,type MasterRetainParentBindingsR1} from './masterSingleDefinitionRetainParentBindingsR1';
import {readMasterSuccessorTargetPreimageR1,validateIndependentCompletenessMapReferences,type MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';
import {verifyMaster29PhysicalPrimaryProjectionR1,assertMaster29IncludedPhysicalOwnersR1} from './master29FloorDrywallSubjectVerificationR1';
type Json=Record<string,any>;
const capturePath='.release-runtime/r568/master29-floor-drywall/partition-parent.json',captureSha='168516829e9fb0c0a65d4b9a94f4f6165db427b6010bcd69180770713e6e3882',
 targetPath='.release-runtime/r568/master29-floor-drywall/partition-target-preimage.json',packPath='data/estimate-benchmarks/source-packs/drywall-c11-layered-geometry-r1.json',
 pinsPath='data/estimate-benchmarks/fixtures/master29-floor-drywall-source-pins-r1.json',sourceId=pack.sourceId,stopCode='DRYWALL_C11_LAYERED_GEOMETRY_R1';
const sha=(path:string)=>createHash('sha256').update(readFileSync(path)).digest('hex');

/** Two explicit source-backed layered branches, one existing catalog. The
 * integrator passes the moving release context; the captured target, registry
 * source preimage, quantities, source bytes and parent identity remain exact. */
export function prepareDrywallC11LayeredGeometryR1(parent:{releaseId:string;searchReleaseId:string;outputRoot:string}):MasterSingleDefinitionSuccessorConfig{
 assert.equal(sha(capturePath),captureSha);const capture=JSON.parse(readFileSync(capturePath,'utf8')) as Json,c=capture.capturedParent as MasterRetainedParentCaptureR1,
  target=JSON.parse(readFileSync(targetPath,'utf8')) as Json,pins=JSON.parse(readFileSync(pinsPath,'utf8')) as {pins:{path:string;sha256:string}[]};
 assert.equal(capture.mutationsExecuted,0);assert.equal(capture.session.read_only,'on');assert.equal(capture.catalogId,pack.catalogId);
 assert.equal(masterRetainedParentCaptureSha256R1(c),pack.legacyParent.capturedParentSha256);
 assert.deepEqual(capture.newSources,[]);assert.deepEqual(capture.newLocators,[]);for(const pin of pins.pins)assert.equal(sha(pin.path),pin.sha256,'EXACT_SOURCE_PIN:'+pin.path);
 // The exact reviewed capture hash and current target anchor are checked above;
 // only this typed view crosses from raw captured records to the subject model.
 const retainedModel=c as unknown as Parameters<typeof append>[0];
 const identity={definitionVersionId:c.definition.id,definitionSha256:c.definition.definition_sha256},d=append(retainedModel,identity),map=completeness(),
  open=pack.profiles.flatMap(profile=>pack.unknownNeeds.filter(n=>n.key!=='inner-tape'||profile.key==='three-layer').map(n=>'drywall:c11:'+profile.key+':open-'+n.key)),
  bound=map.entries.map(e=>e.resolution.rowId).filter(id=>!open.includes(id)),
  newParameterSources:MasterRetainParentBindingsR1['newParameterSources']={
   [pack.selector.id]:{kind:'KNOWN',sourceIds:[sourceId]},[pack.geometry.lengthId]:{kind:'KNOWN',sourceIds:[sourceId]},
   [pack.geometry.heightId]:{kind:'KNOWN',sourceIds:[sourceId]},[pack.geometry.areaId]:{kind:'KNOWN',sourceIds:[sourceId]},
   ...Object.fromEntries(pack.profiles.flatMap(p=>pack.unknownNeeds.filter(n=>n.key!=='inner-tape'||p.key==='three-layer')
    .map(n=>['c11_'+p.layers+'_open_'+n.key.replaceAll('-','_'),{kind:'UNRESOLVED',sourceIds:[]}]))),
   ...Object.fromEntries(pack.profiles.flatMap(p=>pack.materials.filter(m=>m.key!=='screw55'||p.key==='three-layer')
    .map(m=>[effectiveResourceQuantityParameterId('drywall:c11:'+p.key+':'+m.key+'-order'),{kind:'DERIVED',sourceIds:[]}])))};
 assert.equal(open.length,73);assert.equal(bound.length,89);assert.equal(map.entries.length,162);
 const retained:MasterRetainParentBindingsR1={capturedParent:c,capturedParentSha256:pack.legacyParent.capturedParentSha256,newParameterSources,
  capturedSourcePreimage:{sourceKey:sourceId,expected:null}},
  input={area_m2:c.baseline.input_values.area_m2,...d.runtimeInput},masterPath='C:/Users/User/Downloads/GOX_BUILD_TZ_Single_Platform_Core_Sol61_2026-10-19(2).txt',
  masterSha256='4fd2e79388521707cec6c9a75101061f81eb7a72beb4e16a1e39b991fab63f68';
 assert.equal(sha(masterPath),masterSha256);
 const sourcePaths=[...new Set([capturePath,targetPath,packPath,pinsPath,'scripts/estimate/r4a13/prepareDrywallC11LayeredGeometryR1.ts',
  'src/lib/estimate/v4/drywallC11LayeredGeometryR1.ts','src/lib/estimate/v4/drywallC11LayeredGeometryR1.test.ts',
  'scripts/estimate/r4a13/master29FloorDrywallSubjectVerificationR1.ts','data/estimate-benchmarks/fixtures/drywall-c11-layered-geometry-r1-small-normal-boundary.json',...pins.pins.map(p=>p.path)])],
  included=['Прежняя однослойная перегородка сохраняется отдельным исходным расчётом.',
   'Новые варианты содержат два или три слоя листа 12,5 мм с каждой стороны, каркас 50 мм и заполнение 50 мм.',
   'Количество листов, крепежа по слоям, заделки Q1, грунтовки и обрезков определяется из фактических длины и высоты.'],
  excluded=['Проёмы, пересекающие швы здания, горизонтальные стыки, удлинение стоек, мокрая зона, окраска и сплошной финиш не включены.',
   'Труд, машины, инструмент, СИЗ, мойка, доступ и логистика без доказанного количества остаются явными физическими потребностями.',
   'Трёхслойный вариант дополнительно сохраняет незакрытое правило армирования внутренних швов. Огнестойкость и звукоизоляция не заявлены.'];
 return{contract:pack.contract,stopCode,applicationName:'drywall-c11-layered-geometry-r1',expectedBranch:'codex/r4-a5-clean-08b18902',masterPath,masterSha256,
  parentReleaseId:parent.releaseId,parentSearchReleaseId:parent.searchReleaseId,currentReleasePath:'data/estimate-benchmarks/r568-local-developer-canonical-release.json',
  outputRoot:parent.outputRoot,sourcePaths,catalogId:pack.catalogId,sourceId,normId:pack.normId,
  sourceMetadata:{source_title:pack.titleRu,source_authority:'Selected C11 manufacturer system; Fugen and Tiefengrund technical sheets; accepted C111 whole kit',
   exact_locator:pack.sources.map(s=>s.id+': '+s.locator).join('; '),source_kind:'COMPOSITE_PRIMARY_SOURCE_GEOMETRY',
   official_url:pack.sources[0]!.url,artifact_sha256:sha(packPath),use_restriction:pack.scopeRu+' '+pack.openScopePolicy},
  parameterDefinitions:d.parameters,formulaDefinitions:d.formulas,resourceDefinitions:d.resources,shortInput:{area_m2:'30'},acceptanceInput:input,
  runtimeProfileInput:d.runtimeInput,runtimeProfileClassification:d.runtimeClassification,runtimeProfileSourceIds:d.runtimeSourceIds,
  expectedParentShape:[77,50,50],benchmarkOrdinal:0,validationScenario:'RETAIN_C111_V6_ADD_C112_C113_SOURCE_GEOMETRY_WITH_PHYSICAL_NEEDS',
  passport:{canonicalRuName:'Монтаж перегородки из гипсокартона',workKey:'drywall_ceiling_interior_drywall_partition_install_standard',
   physicalResultRu:pack.scopeRu,includedScopeRu:included,excludedScopeRu:excluded,independentCompletenessMap:map,unresolvedApplicableResourceRowIds:open},
  applicability:{...c.definition.applicability,primaryMeasureParameterId:'area_m2',primaryMeasureSelectionV1:primary,
   fullTechnicalAcceptance:false,newLayeredBranches:2,newFullTechnologies:0,geometryOnlyNewBranchInputs:true,sourceSpecificQuantityScope:'PARTIAL'},
  binding:{rowId:bound[0]!,additionalRowIds:bound.slice(1),retainParentBindings:retained,
   applicability:{sourcePackSha256:sha(packPath),fullTechnicalAcceptance:false,legacyC111LabourNotTransferred:true},
   applicabilityByRowId:Object.fromEntries(map.entries.filter(e=>bound.includes(e.resolution.rowId)).map(e=>[e.resolution.rowId,{
    selectedOnly:{kind:'equals',parameterId:pack.selector.id,value:e.condition},unitId:e.unitId,category:e.category,
    requiredOperationIds:e.requiredOperationIds,quantityRule:e.quantityRule,sourcePackSha256:sha(packPath)}]))},
  locator:{key:'c11-c112-c113-layered-geometry-r1',payload:{sourcePack:pack,sourcePackSha256:sha(packPath),independentMap:map,
   capturedParentSha256:pack.legacyParent.capturedParentSha256,fullTechnicalAcceptance:false}},
  search:{primaryUom:capture.parentSearch.primary_uom,canonicalNameRu:'Монтаж перегородки из гипсокартона',aliases:['Перегородка с двумя слоями гипсокартона','Перегородка с тремя слоями гипсокартона'],
   shortScopeRu:pack.scopeRu,keyDistinguishingParameters:[pack.selector.id,pack.geometry.lengthId,pack.geometry.heightId],clarificationFields:[pack.selector.id,pack.geometry.lengthId,pack.geometry.heightId],
   includedBoundaries:included,excludedBoundaries:excluded,extraSearchTermsRu:'перегородка гипсокартон металлический каркас два три слоя швы грунтовка минеральная вата',
   sourceProvenance:{contract:pack.contract,capturedParentSha256:pack.legacyParent.capturedParentSha256,newTechnologyVariants:2,newFullTechnologies:0,fullTechnicalAcceptance:false}},
  forbiddenAdjacentMatchers:[/^ceiling:p11[23]:|automatic_normative_full/iu],owner:'ROOT_SINGLE_INTEGRATOR',receiptFileStem:'drywall_c11_layered_geometry_r1',
  verifyTargetPrecondition:async(client,phase)=>assert.deepEqual(await readMasterSuccessorTargetPreimageR1(client,{releaseId:parent.releaseId,catalogId:pack.catalogId,sourceId,lock:phase==='LOCKED_BEFORE'}),target,'CURRENT_LAYERED_PARENT_OR_REGISTRY_CHANGED'),
  verifyCore:async()=>{
   assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:d.formulas,resourceDefinitions:d.resources}),[]);
   const proofs=[];
   for(const profile of pack.profiles){const facts={[pack.selector.id]:profile.value,partition_length_m:'4',partition_height_m:'2.75'},r=await compile(retainedModel,identity,facts),
    needIds=pack.unknownNeeds.filter(n=>n.key!=='inner-tape'||profile.key==='three-layer').map(n=>'drywall:c11:'+profile.key+':open-'+n.key);
    assertMaster29IncludedPhysicalOwnersR1(d,{workOwnerRowId:'drywall:c11:'+profile.key+':whole-work',includedRowIds:needIds});
    assert.equal(r.rows.find(row=>row.row_id==='drywall:c11:'+profile.key+':board-order')?.quantity,profile.layers===2?'16':'24');
    assert.deepEqual(r.preliminaryNeeds.map(n=>n.row_id).sort(),needIds.slice().sort());
    proofs.push(await verifyMaster29PhysicalPrimaryProjectionR1({catalogId:pack.catalogId,definitionVersionId:c.definition.id,titleRu:'Монтаж перегородки из гипсокартона',
     definition:d,result:r,submittedParameters:facts,primaryParameterId:pack.geometry.areaId,expectedArea:'11',expectedPhysicalNeedRowIds:needIds}));}
   return{status:'PASS_C112_C113_PARTIAL_WHOLE_KIT_AND_REAL_PHYSICAL_AREA',proofs,newTechnologyVariants:2,newFullTechnologies:0,fullTechnicalAcceptance:false};
  }};
}

export type C11CurrentPhysicalPinR2=Readonly<{path:string;sha256:string}>;
export type C11CurrentPhysicalContextR2=Readonly<{releaseId:string;searchReleaseId:string;outputRoot:string;master:C11CurrentPhysicalPinR2;
 currentRelease:C11CurrentPhysicalPinR2;actualBodyProof:C11CurrentPhysicalPinR2;targetPreimage:C11CurrentPhysicalPinR2;physicalSourcePack:C11CurrentPhysicalPinR2;
 primarySourceArtifacts:Readonly<Record<string,C11CurrentPhysicalPinR2>>;formalScopedCapture?:C11CurrentPhysicalPinR2}>;
/** Current whole body in the existing producer. Historical append(parent50)
 * and its fixed CLI are not the current-entrypoint for this continuation. */
export function prepareC11CurrentPhysicalDraftR2(c:C11CurrentPhysicalContextR2):MasterSingleDefinitionSuccessorConfig{
 const p=currentPhysicalPackC11,moduleRoot=resolve(__dirname,'../../..'),
  record=(value:unknown,label:string):Record<string,unknown>=>{if(value===null||typeof value!=='object'||Array.isArray(value))throw Error('C11_CURRENT_RECORD_REQUIRED:'+label);return value as Record<string,unknown>;},
  records=(value:unknown,label:string)=>{if(!Array.isArray(value))throw Error('C11_CURRENT_ARRAY_REQUIRED:'+label);return value.map(item=>record(item,label));},
  read=(pin:C11CurrentPhysicalPinR2)=>{assert.match(pin.sha256,/^[a-f0-9]{64}$/u);const bytes=readFileSync(pin.path);assert.equal(createHash('sha256').update(bytes).digest('hex'),pin.sha256,'C11_CURRENT_PIN_CHANGED:'+pin.path);return bytes;},
  json=(pin:C11CurrentPhysicalPinR2)=>record(JSON.parse(read(pin).toString('utf8').replace(/^\uFEFF/u,'')),'pinnedjson');
 for(const pin of[c.master,c.currentRelease,c.actualBodyProof,c.targetPreimage,c.physicalSourcePack,...(c.formalScopedCapture?[c.formalScopedCapture]:[])])read(pin);
 assert.equal(c.master.sha256,'92c04a456ecd85afcc699e7da5e6cf97114db1a74019fd203f1816c2b81ca08f','C11_MASTER224_REQUIRED');
 assert.equal(c.actualBodyProof.sha256,p.current.proofSha256,'C11_FRESH_R919_REQUIRED');
 assert.equal(resolve(c.physicalSourcePack.path),resolve(moduleRoot,'data/estimate-benchmarks/source-packs/c11-current-physical-continuation-r1.json'),'C11_IMPORTED_PACK_PIN_REQUIRED');
 assert.deepEqual(json(c.physicalSourcePack),p,'C11_IMPORTED_SOURCE_IDENTITY');
 const proof=json(c.actualBodyProof),pointer=json(c.currentRelease),target=json(c.targetPreimage),observed=records(proof.results,'observations').find(item=>{
  if(item.target===undefined)return false;const t=record(item.target,'target');return t.catalogId===p.catalogId&&t.sourceId===p.contract;
 });
 assert.equal(proof.transactionRolledBack,true);assert.equal(proof.connectionClosed,true);assert(observed,'C11_REQUESTED_NEW_SOURCE_TARGET_REQUIRED');
 assert.equal(c.releaseId,proof.selectedReleaseId);assert.equal(pointer.definitionReleaseId,c.releaseId);assert.equal(pointer.searchReleaseId,c.searchReleaseId);
 assert.deepEqual(target,observed.current,'C11_ACTUAL_TARGET_PIN');const header=record(target.header,'header');
 assert.deepEqual(header,{definition_version_id:p.current.definitionId,approved_template_baseline_id:p.current.baselineId,definition_version:p.current.version,definition_sha256:p.current.definitionSha256});
 assert.equal(record(record(target.sets,'sets').newSource,'newSourceDigest').rowCount,0,'C11_NEW_SOURCE_ABSENCE_REQUIRED');
 const body=record(observed.currentBody,'actualBody'),definitions=records(body.definition,'definition'),baselines=records(body.baseline,'baseline');
 assert.equal(definitions.length,1);assert.equal(baselines.length,1);assert.deepEqual(body.newSource,[]);
 const captured:MasterRetainedParentCaptureR1={definition:definitions[0]!,baseline:baselines[0]!,parameters:records(body.parameters,'parameters'),formulas:records(body.formulas,'formulas'),
  resources:records(body.resources,'resources'),bindings:records(body.bindings,'bindings'),normativeSources:records(body.sources,'sources'),normativeLocators:records(body.locators,'locators')},
  base=currentActualModelC11(body),d=currentPhysicalC11(base,{catalogId:p.catalogId,definitionId:p.current.definitionId,definitionSha256:p.current.definitionSha256,body:base}),
  map=currentPhysicalCompletenessC11(),held=new Set(d.parameters.filter(q=>q.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM').map(q=>q.parameter_id)),
  open=d.resources.filter(row=>d.formulas.find(formula=>formula.formula_id===row.formula_id)!.input_parameter_ids.some(id=>held.has(id))).map(row=>row.row_id),oldIds=new Set(captured.parameters.map(q=>String(q.parameter_id))),
  newParameterSources:MasterRetainParentBindingsR1['newParameterSources']=Object.fromEntries(d.parameters.filter(q=>!oldIds.has(q.parameter_id)).map(q=>[q.parameter_id,
   q.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM'?{kind:'UNRESOLVED' as const,sourceIds:[]}:{kind:'KNOWN' as const,sourceIds:[p.contract]}])),
  metadata=record(captured.definition.source_metadata,'actualSourceMetadata'),previous=record(metadata.retainedParentBindingSuccessorV1,'actualPreviousSuccessor'),
  retained:MasterRetainParentBindingsR1={capturedParent:captured,capturedParentSha256:masterRetainedParentCaptureSha256R1(captured),newParameterSources,capturedSourcePreimage:{sourceKey:p.contract,expected:null},
   successorProvenanceContinuation:{contract:'master-retained-binding-continuation/r1',capturedSourceMetadata:structuredClone(metadata),
    capturedSourceMetadataSha256:masterRetainedLineageValueSha256V1(metadata),capturedPreviousSuccessorSha256:masterRetainedLineageValueSha256V1(previous)}},
  artifacts=p.sources.filter(source=>source.path!==null).map(source=>{const pin=c.primarySourceArtifacts[source.id];assert(pin,'C11_PRIMARY_PIN_REQUIRED:'+source.id);assert.equal(pin.sha256,source.sha256);read(pin);return pin;}),
  formal=c.formalScopedCapture?json(c.formalScopedCapture) as MasterCapturedScopedNormativeRegistryR1:undefined,input={area_m2:'11'},checkRow='c11-current-physical:c111:control:method-facts';
 assert(!Object.hasOwn(metadata,'retainedParentBindingContinuationV1'),'C11_ACTUAL_EXISTING_CONTINUATION_SLOT_MUST_BE_FREE');
 assert.equal(captured.baseline.source_definition_version_id,previous.parentDefinitionId,'C11_ACTUAL_DIRECT_PREDECESSOR_DEFINITION');
 assert.equal(captured.baseline.supersedes_baseline_id,previous.parentBaselineId,'C11_ACTUAL_DIRECT_PREDECESSOR_BASELINE');
 assert.equal(captured.parameters.length,181);assert.equal(captured.formulas.length,212);assert.equal(captured.resources.length,212);assert.equal(captured.bindings.length,90);
 assert.equal(held.size,94,'C11_73_RETAINED_UNRESOLVED_PLUS21_NEW_PHYSICAL_SOURCE_HOLDS');assert.equal(open.length,136,'C11_73_RETAINED_ROWS_PLUS63_MUTUALLY_EXCLUSIVE_NEW_PROFILE_ROWS');
 for(const old of captured.resources){assert.deepEqual(d.resources.find(row=>row.row_id===old.row_id)!.source_metadata,old.source_metadata,'C11_RETAINED_SOURCE_METADATA_REQUIRED');}
 return{contract:p.contract,stopCode:'C11_CURRENT_PHYSICAL_R2',applicationName:'drywall-c11-current-whole',expectedBranch:'codex/r4-a5-clean-08b18902',
  masterPath:c.master.path,masterSha256:c.master.sha256,parentReleaseId:c.releaseId,parentSearchReleaseId:c.searchReleaseId,currentReleasePath:c.currentRelease.path,outputRoot:c.outputRoot,
  catalogId:p.catalogId,sourceId:p.contract,normId:'PROJECT_SYSTEM:C11_CURRENT_WHOLE_PHYSICAL_R2',
  sourcePaths:[c.physicalSourcePack.path,...['scripts/estimate/r4a13/prepareDrywallC11LayeredGeometryR1.ts','src/lib/estimate/v4/drywallC11LayeredGeometryR1.ts',
   'src/lib/estimate/v4/drywallC11LayeredGeometryR1.test.ts','data/estimate-benchmarks/source-packs/drywall-c11-layered-geometry-r1.json',
   'data/estimate-benchmarks/source-packs/drywall-partition-c111-s27-36.json',p.current.actualBodyFixturePath,
   'scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1.ts','scripts/estimate/r4a13/masterScopedNormativeRegistryPreimageR1.ts'].map(path=>resolve(moduleRoot,path)),
   ...artifacts.map(pin=>pin.path),c.actualBodyProof.path,c.targetPreimage.path,c.master.path,c.currentRelease.path,...(c.formalScopedCapture?[c.formalScopedCapture.path]:[])],
  sourceMetadata:{source_title:'Монтаж перегородки из гипсокартона: применимый полный цикл и физическое обеспечение',source_authority:'КНАУФ C11, Фуген, Тифенгрунд; КРЕР10-05-001-01 только для текущего C111',
   source_kind:'PROJECT_SYSTEM',artifact_sha256:c.physicalSourcePack.sha256,official_url:p.sources[0]!.url,exact_locator:'R919 current181/212/212; exact C111/C112/C113 separate branches;12physical operations;2measured balances',
   use_restriction:'SOURCE_ONLY BLOCKED_PARTIAL. No openings/horizontal joints/wet/fire/acoustic approval or source norms for unknown tools, PPE, time, transport and waste. Consumption, stock/reserve, order and cost are separate.'},
  ...(formal?{capturedScopedNormativeRegistry:formal}:{}),parameterDefinitions:d.parameters,formulaDefinitions:d.formulas,resourceDefinitions:d.resources,
  shortInput:input,acceptanceInput:input,runtimeProfileInput:{},runtimeProfileClassification:{},runtimeProfileSourceIds:{},expectedParentShape:[181,212,212],benchmarkOrdinal:0,
  validationScenario:'ACTUAL_R919_CURRENT_C11_WHOLE_PHYSICAL_METHOD_QUANTITY_AND_SUPPLY_BOUNDARIES',
  passport:{canonicalRuName:'Монтаж перегородки из гипсокартона',workKey:'drywall_ceiling_interior_drywall_partition_install_standard',physicalResultRu:'Принятая совместимая перегородка в объявленных границах; источник и расчёт не удостоверяют выполнение.',
   includedScopeRu:p.operations.map(operation=>operation.nameRu),excludedScopeRu:['Иная высота/каркас/слои/проёмы/узлы и подтверждение огнестойкости/звукоизоляции','Автоматические факты/нормы оснащения и закупки'],independentCompletenessMap:map,unresolvedApplicableResourceRowIds:open},
  applicability:{actualParentProof:c.actualBodyProof,actualHeader:header,retainedLayeredNeeds:73,retainedLegacyUnconfirmedInventory:23,newPhysicalNeeds:21,protectedFactDeclarations:21,
   requiredTechnologyFactDeclarations:15,quantityEvidenceFactDeclarations:6,derivedMeterObservations:2,newMeasurementInputs:4,actualQuantityClosures:0,baselineNotRuntime:true,fullTechnicalAcceptance:false},
  binding:{rowId:checkRow,retainParentBindings:retained,applicability:{contract:p.contract,actualParentSha256:p.current.definitionSha256,sourceOnly:true,old90BindingsAnd2LocatorsRetained:true,
   newWholeSourceDoesNotOwnHistoricalQuantities:true,quantityMeaning:'WHOLE_METHOD_EVIDENCE_NOT_A_NEW_LABOUR_MATERIAL_OR_TOOL_NORM',fullTechnicalAcceptance:false}},
  locator:{key:'c11-current-whole-physical-r2',payload:{sourcePack:p,actualBodyProof:c.actualBodyProof,independentCompletenessMap:map,fullTechnicalAcceptance:false}},
  search:{primaryUom:'m2',canonicalNameRu:'Монтаж перегородки из гипсокартона',aliases:['Перегородка с однослойной обшивкой','Перегородка с двухслойной обшивкой','Перегородка с трёхслойной обшивкой'],shortScopeRu:p.scope,
   keyDistinguishingParameters:[p.selectorId,'area_m2','partition_length_m','partition_height_m'],clarificationFields:['area_m2','partition_length_m','partition_height_m',...p.measurementInputs.map(q=>q.id)],
   includedBoundaries:p.operations.map(operation=>operation.nameRu),excludedBoundaries:['Другие системы каркаса, слои и сертифицированные решения вне подтверждённого проекта'],extraSearchTermsRu:'перегородка каркас листы изоляция стыки фаска Q1 грунтование подготовка уборка',sourceProvenance:{actualBodyProof:c.actualBodyProof,sourcePack:c.physicalSourcePack,fullTechnicalAcceptance:false}},
  forbiddenAdjacentMatchers:[/^ceiling:p11[23]:|automatic_normative_full/iu],owner:'ROOT_SINGLE_WRITER',receiptFileStem:'c11_current_whole_physical_r2',
  verifyTargetPrecondition:async(client,phase)=>assert.deepEqual(await readMasterSuccessorTargetPreimageR1(client,{releaseId:c.releaseId,catalogId:p.catalogId,sourceId:p.contract,lock:phase==='LOCKED_BEFORE'}),target,'C11_ACTUAL_TARGET_DRIFT'),
  verifyCore:async()=>{assert(c.formalScopedCapture,'STOP_C11_CURRENT_PHYSICAL_R2_SCOPED_REGISTRY_ORDINARY_SOURCE_CAPTURE_REQUIRED');
   assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:d.formulas,resourceDefinitions:d.resources}),[]);
   return{status:'SOURCE_ONLY_STRUCTURAL_MAP_NOT_CORE_RUNTIME_ACCEPTANCE',shape:[d.parameters.length,d.formulas.length,d.resources.length],sourceNormRows:open.length,actualClosures:0,fullTechnicalAcceptance:false};}};
}
export function prepareC11CurrentPhysicalConfigR2(c:C11CurrentPhysicalContextR2):MasterSingleDefinitionSuccessorConfig{
 const config=prepareC11CurrentPhysicalDraftR2(c);assert(c.formalScopedCapture,'STOP_C11_CURRENT_PHYSICAL_R2_SCOPED_REGISTRY_ORDINARY_SOURCE_CAPTURE_REQUIRED');
 const candidate=assembleMasterSingleDefinitionManagedRegistryCandidateR1(config,{projectSourcePackage:null,projectSourcePackageSet:null}).retentionCandidate;
 assert(resolveMasterScopedNormativeRegistryOptInR1(candidate),'C11_FORMAL_RETAINED_CAPTURE_REQUIRED');return config;
}
