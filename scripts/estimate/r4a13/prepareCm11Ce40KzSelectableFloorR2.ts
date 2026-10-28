import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {cm11Ce40KzSelectableFloorDefinitionR2 as definition,cm11Ce40KzSelectableFloorCompletenessR2 as completeness,
 compileCm11Ce40KzSelectableFloorR2 as compile,cm11Ce40KzSelectableFloorPackR2 as pack,
 cm11Ce40KzPrimaryMeasureSelectionR2 as primary,cm11Ce40KzBindingApplicabilityByRowIdR2 as rowApplicability} from '../../../src/lib/estimate/v4/cm11Ce40KzWholeFloorGroupR1';
import {cm11SmallCeramicPrefixS2754 as cp} from '../../../src/lib/estimate/v4/cm11SmallCeramicS2754';
import {ce40ReadyCeramicPrefixS2754} from '../../../src/lib/estimate/v4/ce40ReadyCeramicGroutingS2754';
import {effectiveResourceQuantityParameterId} from '../../../src/lib/estimate/v4/effectivePurchaseBalanceR1';
import {compileCanonicalEstimateCore} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../../../src/lib/estimate/estimateDeterministicHash';
import {verifyMaster29PhysicalPrimaryProjectionR1,assertMaster29IncludedPhysicalOwnersR1} from './master29FloorDrywallSubjectVerificationR1';
import {masterRetainedParentCaptureSha256R1,type MasterRetainParentBindingsR1,type MasterRetainedParentCaptureR1} from './masterSingleDefinitionRetainParentBindingsR1';
import {readMasterSuccessorTargetPreimageR1,validateIndependentCompletenessMapReferences,type MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';

type Json=Record<string,any>;
const stopCode='CM11_KZ_SELECTABLE_FLOOR_R2',sourceId=pack.executableProfile.publicationSourceId,
 contract=pack.executableProfile.contract,normId='CM11_CT17_CE40_RU_KZ_SELECTED_WHOLE_FLOOR_R2',
 capturePath='.release-runtime/r568/master29-floor-drywall/floor-parent.json',
 captureSha='4e88ee1764a9b129e133b02cecf16ded7c7290bb31d6c5dc3a069628521c8263',
 captureValueSha='77ca407ece882c1266d24ed12ed53f6d58feacb769b73263802a91d3af50dae6',
 targetPreimagePath='.release-runtime/r568/master29-floor-drywall/floor-target-preimage.json',
 packPath='data/estimate-benchmarks/source-packs/cm11-ce40-whole-floor-source-blocker-r1.json',
 pinsPath='data/estimate-benchmarks/fixtures/master29-floor-drywall-source-pins-r1.json',
 currentReleasePath='data/estimate-benchmarks/r568-local-developer-canonical-release.json',
 masterPath='C:/Users/User/Downloads/GOX_BUILD_TZ_Single_Platform_Core_Sol61_2026-10-19(2).txt',
 masterSha256='4fd2e79388521707cec6c9a75101061f81eb7a72beb4e16a1e39b991fab63f68';
const sha=(path:string)=>createHash('sha256').update(readFileSync(resolve(path))).digest('hex');
const clone=<T>(value:T):T=>JSON.parse(JSON.stringify(value));

/** Concrete same-catalog recipe for the existing sole publisher. No CLI,
 * database writer, source admission override or alternate calculation engine.
 * The integrator supplies the moving release context. Exact target/source
 * preimages stay pinned; verifyCore invokes the actual shared area pipeline. */
export function prepareCm11Ce40KzSelectableFloorR2(input:{releaseId:string;searchReleaseId:string;outputRoot:string}):MasterSingleDefinitionSuccessorConfig{
 assert.equal(sha(capturePath),captureSha,'CURRENT_PARENT_CAPTURE_BYTES');
 assert.equal(sha(masterPath),masterSha256,'MASTER_BYTES');
 const captured=JSON.parse(readFileSync(capturePath,'utf8')) as Json,c=captured.capturedParent as MasterRetainedParentCaptureR1;
 assert.equal(captured.contract,'master29-c-two-target-retained-parent-readonly/r1');
 assert.equal(captured.session.read_only,'on');assert.equal(captured.mutationsExecuted,0);
 assert.equal(masterRetainedParentCaptureSha256R1(c),captureValueSha);
 assert.equal(captured.capturedParentSha256,captureValueSha);
 assert.equal(c.definition.id,'95322c6a-c7f8-5408-ad3c-cd6e81466680');assert.equal(c.definition.definition_version,3);
 assert.equal(c.definition.definition_sha256,'5b62d5918316d0b1b39a63b0c15ba06a6452d2ef316d61bcadd60ead4d78dee3');
 assert.deepEqual([c.parameters.length,c.formulas.length,c.resources.length],[1,59,59]);
 assert.deepEqual(captured.newSources,[]);assert.deepEqual(captured.newLocators,[]);
 const pins=JSON.parse(readFileSync(pinsPath,'utf8')) as {pins:{path:string;sha256:string}[]};
 for(const pin of pins.pins)assert.equal(sha(pin.path),pin.sha256,'EXACT_SOURCE_PIN:'+pin.path);
 const targetPreimage=JSON.parse(readFileSync(targetPreimagePath,'utf8')) as Json;
 const identity={catalogId:pack.catalogId,definitionVersionId:c.definition.id,definitionSha256:c.definition.definition_sha256,version:3};
 // Exact file/value hash, anchored identity and parent shape above justify this
 // single typed view of the reviewed raw capture. Runtime guards remain active.
 const retainedModel=c as unknown as Parameters<typeof definition>[0];
 const next=definition(retainedModel,identity),map=completeness(),s=pack.selectableSuccessorR2.selector,
  ep=ce40ReadyCeramicPrefixS2754(2),open=pack.executableProfile.gaps.map(g=>pack.executableProfile.namespace+':'+g.rowKey),
  bound=pack.selectableSuccessorR2.independentExpectedResources.filter(e=>!open.includes(e.rowId)).map(e=>e.rowId);
 assert.equal(open.length,24);assert.equal(bound.length,34);
 // Exact new-input map. Legacy q keeps its approved template provenance;
 // source-backed geometry is measured, and every unknown norm has empty [].
 const newParameterSources:MasterRetainParentBindingsR1['newParameterSources']={
  [s.parameterId]:{kind:'KNOWN',sourceIds:[sourceId]},
  floor_length_m:{kind:'KNOWN',sourceIds:[sourceId]},floor_width_m:{kind:'KNOWN',sourceIds:[sourceId]},floor_area_m2:{kind:'KNOWN',sourceIds:[sourceId]},
  ...Object.fromEntries(pack.executableProfile.gaps.map(g=>['kz_floor_open_'+g.key.replaceAll('-','_'),{kind:'UNRESOLVED',sourceIds:[]}])),
  ...Object.fromEntries([cp+':tile-order',cp+':cm11-order',cp+':water-order',cp+':ct17-5l-order',ep+':ce40-order']
   .map(id=>[effectiveResourceQuantityParameterId(id),{kind:'DERIVED',sourceIds:[]}]))};
 const retained:MasterRetainParentBindingsR1={capturedParent:c,capturedParentSha256:captureValueSha,newParameterSources,
  legacyTemplateAssumptionSources:{contract:'master-retained-legacy-template-assumptions/r1',templateId:c.definition.source_metadata.templateId,
   parameterSources:{q:clone(c.baseline.normative_source_ids.q)}},capturedSourcePreimage:{sourceKey:sourceId,expected:null}};
 const allApplicability=rowApplicability(),binding={rowId:bound[0]!,additionalRowIds:bound.slice(1),retainParentBindings:retained,
  applicability:{selectedOnly:{kind:'equals',parameterId:s.parameterId,value:s.exactValue},fullTechnicalAcceptance:false,
   approximateMaterialConsumption:true,unresolvedPhysicalResources:open.length},
  applicabilityByRowId:Object.fromEntries(bound.map(id=>[id,allApplicability[id]]))};
 const facts={q:c.baseline.input_values.q,[s.parameterId]:s.legacyValue},exactFacts={[s.parameterId]:s.exactValue,floor_length_m:'10',floor_width_m:'10'},
  profileValues={q:c.baseline.input_values.q,[s.parameterId]:s.legacyValue},
  profileClass={q:'ASSUMPTION' as const,[s.parameterId]:'ASSUMPTION' as const},
  profileSources={q:clone(c.baseline.normative_source_ids.q),[s.parameterId]:[sourceId]},
  sourcePaths=[...new Set([capturePath,targetPreimagePath,pinsPath,packPath,'scripts/estimate/r4a13/prepareCm11Ce40KzSelectableFloorR2.ts','scripts/estimate/r4a13/master29FloorDrywallSubjectVerificationR1.ts',
   'src/lib/estimate/v4/cm11Ce40KzWholeFloorGroupR1.ts','src/lib/estimate/v4/cm11Ce40KzSelectableFloorR2.test.ts',
   'data/estimate-benchmarks/fixtures/cm11-kz-selectable-legacy59-r2.json',...pins.pins.map(p=>p.path)])],
  included=['Прежний общий расчёт сохраняет 59 ресурсных деклараций, включая исходно исключённый запас, а также все формулы, владельцев оплаты и количества.',
   'Отдельный выбор задаёт предварительный расчёт прямоугольного пола плиткой 100 × 100 мм со швом 2 мм.',
   'В точном выборе рассчитаны плитка, цементный клей, грунтовка, затирочная смесь и вода затворения по выбранным источникам.'],
  excluded=['Приблизительные расходы не гарантируют фактический расход на произвольном основании.',
   '24 физические потребности, включая труд, средства защиты, очистку, резку и отходы, остаются явно не рассчитанными.',
   'Полная техническая обеспеченность не заявлена; незакрытые физические потребности не включаются в оплату и закупку.'];
 return{contract,stopCode,applicationName:'cm11-kz-selectable-floor-r2',expectedBranch:'codex/r4-a5-clean-08b18902',masterPath,masterSha256,
  parentReleaseId:input.releaseId,parentSearchReleaseId:input.searchReleaseId,currentReleasePath,
  outputRoot:input.outputRoot,sourcePaths,catalogId:pack.catalogId,sourceId,normId,
  sourceMetadata:{source_title:pack.executableProfile.titleRu,source_authority:'Selected manufacturer technical sheets and whole sequential mixing-station manuals',
   exact_locator:'CM11ru_KZ PDF1–2; CT17ru_KZ PDF1–2; CE40ru_KZ PDF1–2 exact 100×100 mm / 2 mm approximate table; pinned complete station sources; explicit unresolved whole-cycle needs',
   use_restriction:'Only the explicit selected regional preliminary branch; no rates transferred to legacy59; no FULL; readonly primary area comes from measured length*width.',
   source_kind:'PRODUCT_SYSTEM_TDS',official_url:pack.regionalProfileDecision.source.url??null,artifact_sha256:sha(packPath)},
  parameterDefinitions:next.parameters,formulaDefinitions:next.formulas,resourceDefinitions:next.resources,
  shortInput:{q:'100'},acceptanceInput:facts,runtimeProfileInput:profileValues,runtimeProfileClassification:profileClass,runtimeProfileSourceIds:profileSources,
  expectedParentShape:[1,59,59],benchmarkOrdinal:0,validationScenario:'LEGACY59_RETAINED_EXPLICIT_CM11_KZ_PARTIAL_NEW_ROOT_PHYSICAL_AREA_GUARD',
  passport:{canonicalRuName:'Укладка плиточного пола',workKey:captured.parentSearch.work_key??c.definition.source_metadata.templateId,
   physicalResultRu:'Плиточный пол; прежняя общая технология и отдельный предварительный расчёт выбранного точного формата.',
   includedScopeRu:included,excludedScopeRu:excluded,independentCompletenessMap:map,unresolvedApplicableResourceRowIds:open},
  applicability:{...clone(c.definition.applicability),primaryMeasureParameterId:'q',primaryMeasureSelectionV1:primary,
   legacyParentCaptureSha256:captureValueSha,fullTechnicalAcceptance:false,quantityScope:'PARTIAL',
   runtimeDeliveryStatus:'SOURCE_ONLY_AWAITING_SUBJECT_AND_ROOT_GATES',exactChoiceCreatesNewRoot:true,legacyRevisionMutationAllowed:false},
  binding,locator:{key:'cm11-ct17-ce40-kz-selectable-floor-r2',payload:{sourcePack:pack,sourcePackSha256:sha(packPath),
   independentlyDeclaredMap:map,parentCaptureSha256:captureValueSha,fullTechnicalAcceptance:false}},
  search:{primaryUom:captured.parentSearch.primary_uom,canonicalNameRu:'Укладка плиточного пола',
   aliases:[...captured.parentSearch.aliases,'Керамический пол на цементном клее с грунтованием'],shortScopeRu:'Прежний общий расчёт; отдельный точный предварительный профиль плитки 100 × 100 мм со швом 2 мм.',
   keyDistinguishingParameters:[s.parameterId,...pack.executableProfile.geometry],clarificationFields:[s.parameterId,...pack.executableProfile.geometry],
   includedBoundaries:included,excludedBoundaries:excluded,extraSearchTermsRu:'керамическая плитка пол грунтовка цементный клей затирка 100 100 2 мм',
   sourceProvenance:{contract,sourcePackPath:packPath,parentCaptureSha256:captureValueSha,newExactProfiles:1,newCompleteTechnologies:0,
    sourceOnly:true,physicalAreaSourceFormula:'floor_length_m*floor_width_m'}},
  forbiddenAdjacentMatchers:[/automatic_normative_full|fake_tail_consumption|floor_joint_depth_mm/iu],owner:'ROOT_SINGLE_INTEGRATOR',receiptFileStem:'cm11_kz_selectable_floor_r2',
  verifyTargetPrecondition:async(client,phase)=>{
   const actual=await readMasterSuccessorTargetPreimageR1(client,{releaseId:input.releaseId,catalogId:pack.catalogId,sourceId,lock:phase==='LOCKED_BEFORE'});
   assert.deepEqual(actual,targetPreimage,'EXACT_CURRENT_TARGET_OR_SOURCE_PREIMAGE_CHANGED');
  },
  verifyCore:async()=>{
   assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:next.formulas,resourceDefinitions:next.resources}),[]);
   const costs=pack.selectableSuccessorR2.paidOwnerOracle;
   assertMaster29IncludedPhysicalOwnersR1(next,{workOwnerRowId:costs.workOwnerRowId,includedRowIds:[costs.sameInstallationLabour.rowId,...costs.sequentialStation.rowIds]});
   const excludedLegacyRowId='tile_stone_interior_tile_floor_lay_standard_materials_37';
   assert.equal(c.resources.length,59);assert.deepEqual(c.resources.find(r=>r.row_id===excludedLegacyRowId)!.inclusion_ast,{kind:'literal',value:false});
   for(const q of ['10','100']){const original=await compileCanonicalEstimateCore({operation:'compile',catalogId:pack.catalogId,compilerVersion:pack.executableProfile.contract,
     primaryMeasureParameterId:'q',parameterDefinitions:[...retainedModel.parameters],formulaDefinitions:[...retainedModel.formulas],resourceDefinitions:[...retainedModel.resources],submittedParameters:{q},confirmedParameters:{},
     currencyCode:'KGS',priceItems:[],maximumResourceRows:c.resources.length,hashJson:estimateDeterministicHash}),
    omitted=await compile(retainedModel,identity,{q}),explicit=await compile(retainedModel,identity,{q,[s.parameterId]:s.legacyValue});
    assert.equal(original.rows.length,58);assert.deepEqual(original.preliminaryNeeds,[]);assert(!original.rows.some(r=>r.row_id===excludedLegacyRowId));
    for(const successor of [omitted,explicit]){assert.deepEqual(successor.rows,original.rows);assert.deepEqual(successor.preliminaryNeeds,original.preliminaryNeeds);assert.deepEqual(successor.totals,original.totals);}}
   const result=await compile(retainedModel,identity,exactFacts),whole=result.rows.find(r=>r.row_id===pack.executableProfile.namespace+':whole-owner');
   assert.equal(whole?.quantity,'100');assert.equal(whole?.unit_id,'m2');
   const actualProjection=await verifyMaster29PhysicalPrimaryProjectionR1({catalogId:pack.catalogId,definitionVersionId:c.definition.id,titleRu:'Укладка плиточного пола',
    definition:next,result,submittedParameters:exactFacts,primaryParameterId:'floor_area_m2',expectedArea:'100',expectedPhysicalNeedRowIds:open});
   return{status:'PASS_SOURCE_DERIVED_AREA_ACTUAL_SHARED_PIPELINE',actualProjection,fullTechnicalAcceptance:false};
  }};
}


import currentCm11ObservationR968 from '../../../data/estimate-benchmarks/fixtures/cm11-current-r3-new-source-observation-r968.json';
import currentCm11SnapshotR951 from '../../../data/estimate-benchmarks/fixtures/cm11-ct17-ce40-current-parent-r951.json';
import {cm11Ce40KzCurrentConsumerDefinitionR3,cm11Ce40KzCurrentConsumerPackR3,cm11Ce40KzCurrentConsumerExpectationsR3,
 compileCm11Ce40KzCurrentConsumerR3} from '../../../src/lib/estimate/v4/cm11Ce40KzWholeFloorGroupR1';
import {masterRetainedLineageValueSha256V1} from './masterSingleDefinitionRetainParentBindingsR1';

type CurrentCm11ContextR3=Readonly<{
 releaseId:string;searchReleaseId:string;outputRoot:string;currentReleasePath:string;sourceRoot:string;
 search:MasterSingleDefinitionSuccessorConfig['search'];
 capturedScopedNormativeRegistry?:NonNullable<MasterSingleDefinitionSuccessorConfig['capturedScopedNormativeRegistry']>;
}>;
/** Exact-v4 continuation inside the same ordinary producer. ROOT supplies the
 * current moving context and normal scoped capture. The historical R2 entry
 * above is not invoked; no SQL reader, admission override or writer is added. */
export function prepareCm11Ce40KzCurrentConsumerR3(input:CurrentCm11ContextR3):MasterSingleDefinitionSuccessorConfig{
 if(input.capturedScopedNormativeRegistry==null)throw Error('STOP_CM11_CURRENT_CONSUMERS_R3_FRESH_SCOPED_REGISTRY_CAPTURE_REQUIRED');
 const currentSha=(path:string)=>createHash('sha256').update(readFileSync(resolve(input.sourceRoot,path))).digest('hex');
 const currentFixturePath='data/estimate-benchmarks/fixtures/cm11-ct17-ce40-current-parent-r951.json',
  newSourceObservationPath='data/estimate-benchmarks/fixtures/cm11-current-r3-new-source-observation-r968.json',
  currentPackPath='data/estimate-benchmarks/source-packs/cm11-ct17-ce40-current-consumer-cycle-r3.json',
  legacyPath='.release-runtime/r568/master29-floor-drywall/floor-parent.json',
  currentMasterPath='C:/Users/User/Downloads/GOX_BUILD_MASTER_TZ_2_24_2026-10-27.txt',
  currentMasterSha='92c04a456ecd85afcc699e7da5e6cf97114db1a74019fd203f1816c2b81ca08f',
  current=cm11Ce40KzCurrentConsumerPackR3,body=currentCm11SnapshotR951.currentBody;
 assert.equal(currentSha(currentFixturePath),'70093a1a64f3d5235d3b955b3431f7f4122813b29bb01dcd993da94fc00a2ee1');
 assert.equal(currentSha(newSourceObservationPath),'1c64d687f8b9500ba8c8d228c13a8be164068ddbefe6b8aca921273b70690ecd');
 assert.equal(currentCm11ObservationR968.target.sourceId,cm11Ce40KzCurrentConsumerPackR3.sourceId);
 assert.equal(currentCm11ObservationR968.current.sets.newSource.rowCount,0);assert.equal(currentCm11ObservationR968.reference.sets.newSource.rowCount,0);
 assert.equal(currentCm11ObservationR968.formalRegistryCapture,false);
 assert.equal(currentSha(legacyPath),captureSha);assert.equal(currentSha(currentMasterPath),currentMasterSha);
 const next=cm11Ce40KzCurrentConsumerDefinitionR3(currentCm11SnapshotR951),map=cm11Ce40KzCurrentConsumerExpectationsR3(),
  c:MasterRetainedParentCaptureR1={definition:body.definition[0]!,baseline:body.baseline[0]!,parameters:body.parameters,formulas:body.formulas,
   resources:body.resources,bindings:body.bindings,normativeSources:body.sources,normativeLocators:body.locators},captureValue=masterRetainedParentCaptureSha256R1(c);
 const isRecord=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v);
 const record=(v:unknown):Record<string,unknown>=>{if(!isRecord(v))throw Error('CM11_CURRENT_R3_CAPTURE_RECORD_REQUIRED');return v;};
 const currentText=(v:unknown):string=>{if(typeof v!=='string'||!v.trim())throw Error('CM11_CURRENT_R3_CAPTURE_TEXT_REQUIRED');return v;};
 const records=(v:unknown):Record<string,unknown>[]=>{if(!Array.isArray(v)||!v.every(isRecord))throw Error('CM11_CURRENT_R3_CAPTURE_ARRAY_REQUIRED');return v;};
 const legacyRaw:unknown=JSON.parse(readFileSync(resolve(input.sourceRoot,legacyPath),'utf8')),old=record(record(legacyRaw).capturedParent),
  original:MasterRetainedParentCaptureR1={definition:record(old.definition),baseline:record(old.baseline),parameters:records(old.parameters),formulas:records(old.formulas),resources:records(old.resources),
   bindings:records(old.bindings),normativeSources:records(old.normativeSources),normativeLocators:records(old.normativeLocators)};
 assert.equal(masterRetainedParentCaptureSha256R1(original),captureValueSha);
 const oldMetadata=record(c.definition.source_metadata),prior=record(oldMetadata.retainedParentBindingSuccessorV1),
  originalSources=record(original.baseline.normative_source_ids),qSources=originalSources.q;
 if(!Array.isArray(qSources)||!qSources.every((value:unknown):value is string=>typeof value==='string'))throw Error('CM11_CURRENT_R3_LEGACY_SOURCE_IDS_REQUIRED');
 const retained:MasterRetainParentBindingsR1={capturedParent:c,capturedParentSha256:captureValue,newParameterSources:{
   [current.adjacentProtection.scopeParameterId]:{kind:'KNOWN',sourceIds:[current.sourceId]},
   [current.adjacentProtection.quantityParameterId]:{kind:'UNRESOLVED',sourceIds:[]}},
  successorProvenanceContinuation:{contract:'master-retained-binding-continuation/r1',capturedSourceMetadata:oldMetadata,
   capturedSourceMetadataSha256:masterRetainedLineageValueSha256V1(oldMetadata),capturedPreviousSuccessorSha256:masterRetainedLineageValueSha256V1(prior)},
  legacyTemplateAssumptionSources:{contract:'master-retained-legacy-template-assumptions/r1',templateId:currentText(oldMetadata.templateId),
   parameterSources:{q:qSources},approvedTemplatePredecessor:{capturedParent:original,capturedParentSha256:captureValueSha}},
  capturedSourcePreimage:{sourceKey:current.sourceId,expected:null}},
  selected=pack.selectableSuccessorR2.selector,legacyFacts={q:c.baseline.input_values.q,[selected.parameterId]:selected.legacyValue},
  open=[...pack.executableProfile.gaps.map(g=>pack.executableProfile.namespace+':'+g.rowKey),current.adjacentProtection.rowId],whole=pack.executableProfile.namespace+':whole-owner',
  paths=[currentFixturePath,newSourceObservationPath,currentPackPath,legacyPath,packPath,'scripts/estimate/r4a13/prepareCm11Ce40KzSelectableFloorR2.ts',
   'src/lib/estimate/v4/cm11Ce40KzWholeFloorGroupR1.ts','src/lib/estimate/v4/cm11Ce40KzSelectableFloorR2.test.ts'];
 return{contract:current.contract,stopCode:'CM11_CURRENT_CONSUMERS_R3',applicationName:'cm11-current-whole-consumers-r3',expectedBranch:'codex/r4-a5-clean-08b18902',
  masterPath:currentMasterPath,masterSha256:currentMasterSha,parentReleaseId:input.releaseId,parentSearchReleaseId:input.searchReleaseId,currentReleasePath:input.currentReleasePath,
  outputRoot:input.outputRoot,sourcePaths:paths,catalogId:current.catalogId,sourceId:current.sourceId,normId:'CM11_CT17_CE40_CURRENT_WHOLE_CONSUMERS_R3',
  capturedScopedNormativeRegistry:input.capturedScopedNormativeRegistry,
  sourceMetadata:{source_title:'Целый керамический пол: общие ресурсы у действительных подработ',source_authority:'Authored whole-consumer composition on retained exact CM11/CT17/CE40 regional TDS',
   exact_locator:'current-consumer-cycle-r3#/consumerRows; exact R951 parent; original primary sources and all34 retained bindings unchanged',
   use_restriction:'Graph-consumer continuation only; no new numeric norm, no actual site readiness, no FULL;24 old quantity holds plus one CT17 masking quantity hold and one protected actual applicability condition.',source_kind:'PROJECT_SYSTEM',artifact_sha256:currentSha(currentPackPath)},
  parameterDefinitions:next.parameters,formulaDefinitions:next.formulas,resourceDefinitions:next.resources,
  shortInput:{q:'100'},acceptanceInput:legacyFacts,runtimeProfileInput:legacyFacts,runtimeProfileClassification:{q:'ASSUMPTION',[selected.parameterId]:'ASSUMPTION'},
  runtimeProfileSourceIds:{q:qSources,[selected.parameterId]:[pack.executableProfile.publicationSourceId]},expectedParentShape:[34,117,117],benchmarkOrdinal:0,
  validationScenario:'CURRENT_V4_RETAINED_117_WHOLE_SHARED_CONSUMERS_SOURCE_HELD',
  passport:{canonicalRuName:'Укладка плиточного пола',workKey:currentText(oldMetadata.templateId),physicalResultRu:'Прежняя общая ветвь и точный предварительный керамический пол с общими ресурсами у реальных потребителей.',
   includedScopeRu:['Все117 текущих ресурсных деклараций,34 параметра,117 формул и34 исходные связи сохраняются.','У11 ресурсов расширены реальные потребители; дополнена защита соседних элементов при CT17 с отдельной защищённой применимостью и неизвестным количеством.'],
   excludedScopeRu:['24 прежних физических количественных основания и новое количество малярной ленты не закрыты.','Нет подтверждения объекта, полного состава поставки или новой нормы очистки, труда и малого замеса.'],
   independentCompletenessMap:map,unresolvedApplicableResourceRowIds:open},
  applicability:{...c.definition.applicability,fullTechnicalAcceptance:false,quantityScope:'PARTIAL',primaryMeasureParameterId:'q',primaryMeasureSelectionV1:primary,
   runtimeDeliveryStatus:'SOURCE_ONLY_AWAITING_SUBJECT_AND_ROOT_GATES',legacyRevisionMutationAllowed:false,currentR951ParentCaptureSha256:captureValue},
  binding:{rowId:whole,retainParentBindings:retained,applicability:{selectedOnly:{kind:'equals',parameterId:selected.parameterId,value:selected.exactValue},
   noNewQuantityNorm:true,fullTechnicalAcceptance:false,requiredOperationIds:pack.executableProfile.operations.map(o=>pack.executableProfile.namespace+':operation:'+o.id)}},
  locator:{key:'cm11-current-whole-consumers-r3',payload:{sourcePack:current,sourcePackSha256:currentSha(currentPackPath),independentlyDeclaredMap:map,parentCaptureSha256:captureValue,
   allExistingBindingTuplesPreserved:true,newNumericNorms:0,fullTechnicalAcceptance:false}},search:input.search,
  forbiddenAdjacentMatchers:[/automatic_normative_full|fake_tail_consumption|current_parent_legacy59_reconstruction/iu],owner:'ROOT_SINGLE_INTEGRATOR',receiptFileStem:'cm11_current_whole_consumers_r3',
  verifyTargetPrecondition:async(client,phase)=>{const observed=await readMasterSuccessorTargetPreimageR1(client,{releaseId:input.releaseId,catalogId:current.catalogId,sourceId:current.sourceId,lock:phase==='LOCKED_BEFORE'});
   assert.deepEqual(observed.header,currentCm11SnapshotR951.header,'CURRENT_R951_HEADER_DRIFT');
   for(const key of ['definition','baseline','parameters','formulas','resources','bindings','locators','sources','identity'] as const)assert.deepEqual(observed.sets[key],currentCm11SnapshotR951.sets[key],'CURRENT_R951_SET_DRIFT:'+key);
   assert.deepEqual(observed.sets.newSource,currentCm11ObservationR968.current.sets.newSource,'CURRENT_R3_NEW_SOURCE_ABSENCE_REQUIRED');},
  verifyCore:async()=>{assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:next.formulas,resourceDefinitions:next.resources,requireOperationBindings:true}),[]);
   const result=await compileCm11Ce40KzCurrentConsumerR3({[selected.parameterId]:selected.exactValue,floor_length_m:'5',floor_width_m:'6'});
   assert.equal(result.rows.find(row=>row.row_id==='ceramic:cm11-10cm-4mm:water-order')?.quantity,'21.6');
   assert(result.preliminaryNeeds.some(row=>row.row_id.endsWith(':open-cleaning-water')&&row.quantity===null));
   return{status:'CURRENT_WHOLE_CONSUMERS_SOURCE_ONLY',parentShape:[34,117,117],exactShape:[36,118,118],retainedBindings:34,sourceQuantityHolds:25,actualObjectClosures:0,fullTechnicalAcceptance:false};}};
}
