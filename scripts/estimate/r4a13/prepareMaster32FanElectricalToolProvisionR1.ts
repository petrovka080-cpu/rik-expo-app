import {resolve} from 'node:path';
import {captureMasterScopedNormativeRegistryPreimageR1} from './masterScopedNormativeRegistryPreimageR1';
import {assembleMasterSingleDefinitionManagedRegistryCandidateR1} from './prepareMasterSingleDefinitionSuccessorR1';
import {resolveCanonicalApprovedBaselineLeaf} from './canonicalDefinitionPublisherR1';
import fanReferenceR610 from '../../../data/estimate-benchmarks/source-packs/fan-prepared-opening-reference-method-r610-r1.json';
import {fanPreparedOpeningReferenceAdmissionInputR610,fanPreparedOpeningReferenceArtifactSha256R610} from '../../../src/lib/estimate/v4/master32FanElectricalToolProvisionR1';
import type {MasterCapturedScopedNormativeRegistryR1} from './masterScopedNormativeRegistryPreimageR1';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,realpathSync,statSync} from 'node:fs';
import {appendMaster32FanElectricalToolProvisionR1 as append,master32FanElectricalParentR1 as parent,
 master32FanElectricalToolProvisionPackR1 as pack,master32FanElectricalCompletenessR1 as completeness} from '../../../src/lib/estimate/v4/master32FanElectricalToolProvisionR1';
import {manufacturerFactoryParentR1 as predecessor} from '../../../src/lib/estimate/v4/manufacturerDoorFanFactoryKitsR1';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {canonicalEstimateStableJson} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import {estimateDeterministicHash} from '../../../src/lib/estimate/estimateDeterministicHash';
import {masterRetainedParentCaptureSha256R1,type MasterRetainedParentCaptureR1,type MasterRetainParentBindingsR1} from './masterSingleDefinitionRetainParentBindingsR1';
import {validateIndependentCompletenessMapReferences,type MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';
const packPath='data/estimate-benchmarks/source-packs/master32-fan-electrical-tool-provision-r1.json';
const modulePath='src/lib/estimate/v4/master32FanElectricalToolProvisionR1.ts',suitePath='src/lib/estimate/v4/master32FanElectricalToolProvisionR1.test.ts';
const configPath='scripts/estimate/r4a13/prepareMaster32FanElectricalToolProvisionR1.ts';
const masterPath='C:/Users/User/Downloads/GOX_BUILD_MASTER_TZ_2_10_2026-10-22 (1).txt',masterSha='c43f11299cabe70c803c59eca62f345afa986d6bbc17ac0c69198074e30cb8ed';
const fileSha=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
const valueSha=(v:unknown)=>createHash('sha256').update(canonicalEstimateStableJson(v)).digest('hex');
const targetFor=(catalogId:string)=>{const t=pack.targets.find(t=>t.catalogId===catalogId);assert(t,'EXACT_MASTER32_FAN_TARGET');return t;};
export const master32FanElectricalToolFactsR1=(count:unknown='5',fronts:unknown='2',choice:string=pack.factoryChoices[0]!)=>({
 [pack.factorySelectorId]:choice,[pack.factoryCountId]:count,[pack.selectorId]:pack.selectedMethod,[pack.compatibilityId]:pack.compatibleChoice,[pack.frontCountId]:fronts});
export function compileMaster32FanElectricalToolsR1(catalogId:string,input:Record<string,unknown>,options:{model?:ReturnType<typeof parent>;rowOverrides?:CanonicalEstimateCompileCoreInput['rowOverrides'];primary?:string}={}){
 const t=targetFor(catalogId),model=options.model??append(t.key);
 return compileCanonicalEstimateCore({operation:'recalculate',catalogId,compilerVersion:pack.contract,
  primaryMeasureParameterId:options.primary??(pack.factoryChoices.includes(String(input[pack.factorySelectorId]))?pack.factoryCountId:'q'),
  parameterDefinitions:[...model.parameters],formulaDefinitions:[...model.formulas],resourceDefinitions:[...model.resources],submittedParameters:input,confirmedParameters:{},
  rowOverrides:options.rowOverrides??{},priceItems:[],currencyCode:'KGS',maximumResourceRows:model.resources.length,hashJson:estimateDeterministicHash});
}
export function master32FanElectricalToolMasterConfigR1(context:{releaseId:string;searchReleaseId:string;outputRoot?:string},catalogId:string):MasterSingleDefinitionSuccessorConfig{
 const t=targetFor(catalogId);assert.equal(fileSha(pack.parentFixturePath),pack.parentFixtureSha256);assert.equal(fileSha(masterPath),masterSha);
 for(const source of pack.sources)assert.equal(fileSha(source.path),source.sha256,'MASTER32_FAN_PRIMARY_SOURCE:'+source.key);
 const fixture=JSON.parse(readFileSync(pack.parentFixturePath,'utf8')),c=fixture.captures.find((c:MasterRetainedParentCaptureR1)=>c.definition.catalog_id===catalogId) as MasterRetainedParentCaptureR1&{contentPassport:Record<string,any>};
 assert(c);assert.equal(c.definition.id,t.parentDefinitionId);assert.equal(c.definition.definition_sha256,t.parentDefinitionSha256);
 const original=predecessor(catalogId) as MasterRetainedParentCaptureR1,next=append(t.key),map=completeness(t.key),
  newParameters=next.parameters.filter(p=>!c.parameters.some(q=>q.parameter_id===p.parameter_id)),bound=[pack.ownerRowId,...pack.parts.map(p=>p.rowId)],
  allPotentialNeeds=[...pack.oldNeedRowIds,...pack.additionalNeeds.map(n=>n.rowId)],retained:MasterRetainParentBindingsR1={capturedParent:c,capturedParentSha256:masterRetainedParentCaptureSha256R1(c),
   newParameterSources:Object.fromEntries(newParameters.map(p=>[p.parameter_id,p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM'
    ?{kind:'UNRESOLVED' as const,sourceIds:[]}:{kind:'KNOWN' as const,sourceIds:[t.sourceId]}])),
   legacyTemplateAssumptionSources:{contract:'master-retained-legacy-template-assumptions/r1',templateId:c.definition.source_metadata.templateId,
    parameterSources:{q:[...c.baseline.normative_source_ids.q]},approvedTemplatePredecessor:{capturedParent:original,capturedParentSha256:masterRetainedParentCaptureSha256R1(original)}},
   successorProvenanceContinuation:{contract:'master-retained-binding-continuation/r1',capturedSourceMetadata:structuredClone(c.definition.source_metadata),
    capturedSourceMetadataSha256:valueSha(c.definition.source_metadata),capturedPreviousSuccessorSha256:valueSha(c.definition.source_metadata.retainedParentBindingSuccessorV1)}};
 assert.equal(newParameters.length,6);assert.equal(bound.length,25);assert.equal(allPotentialNeeds.length,17);
 const baseline=structuredClone(c.baseline.input_values),passport=c.contentPassport,sourcePaths=[packPath,pack.parentFixturePath,modulePath,suitePath,configPath,...pack.sources.map(s=>s.path),
  'src/lib/estimate/v4/automaticConstructionOwnerR1.ts','src/lib/estimate/v4/manufacturerDoorFanFactoryKitsR1.ts','data/estimate-benchmarks/source-packs/manufacturer-door-fan-factory-kits-r1.json',
  'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts','scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1.ts','scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts',
  'src/lib/estimate/backendPlatform/inclusionGraph.ts','src/lib/estimate/backendPlatform/canonicalDerivedQuantityEditPolicyV1.ts'];
 const boundaries=['Подтверждено только начальное функциональное оснащение выбранного сухого совместимого поста. Не установлены труд, расход/износ, покупки, СИЗ, безопасное отключение, монтаж и фактические результаты проверок.',...pack.compatibilityObjectFactsRu];
 return{contract:pack.contract,stopCode:'MASTER32_FAN_ELECTRICAL_TOOL_PROVISION',applicationName:'master32-fan-electrical-tool-provision',expectedBranch:'codex/r4-a5-clean-08b18902',
  masterPath,masterSha256:masterSha,parentReleaseId:context.releaseId,parentSearchReleaseId:context.searchReleaseId,currentReleasePath:'data/estimate-benchmarks/r568-local-developer-canonical-release.json',
  outputRoot:context.outputRoot??'.release-runtime/r568/master32-tool-provision/'+t.key,sourcePaths,catalogId,sourceId:t.sourceId,normId:pack.normId,
  sourceMetadata:{source_title:pack.ownerTitleRu,source_authority:'Exact ClassII fan connection method, matched instrument/tool capabilities and explicit workfront organization; no installation, labour or consumption norm',
   source_kind:'PRIMARY_METHOD_AND_INSTRUMENT_CAPABILITIES_WITH_EXPLICIT_ENGINEERING_PROVISION',official_url:pack.sources.find(s=>s.key==='v233')!.officialUrl,
   artifact_sha256:fileSha(packPath),exact_locator:pack.sources.map(s=>s.key+': '+s.locator).join('; '),use_restriction:boundaries.join(' ')},
  parameterDefinitions:next.parameters,formulaDefinitions:next.formulas,resourceDefinitions:next.resources,shortInput:baseline,acceptanceInput:baseline,
  runtimeProfileInput:{q:c.baseline.input_values.q},runtimeProfileClassification:{q:'ASSUMPTION'},runtimeProfileSourceIds:{q:[...c.baseline.normative_source_ids.q]},
  expectedParentShape:t.parentShape as [number,number,number],benchmarkOrdinal:0,validationScenario:'DEMO_ONLY_CLASSII_FAN_INITIAL_ELECTRICAL_TOOL_INVENTORY_NO_SAFE_ISOLATION_OR_TEST_RESULT_CLAIM',
  passport:{canonicalRuName:'Монтаж вытяжного вентилятора',workKey:catalogId.replace('canonical-work:base:',''),physicalResultRu:'Заводской вытяжной вентилятор с отдельным совместимым инструментальным постом и сохранёнными монтажными потребностями.',
   includedScopeRu:[...passport.included_scope_ru,'Начальное функциональное оснащение выбранных постов электрического подключения.'],excludedScopeRu:[...passport.excluded_scope_ru,...boundaries],
   independentCompletenessMap:map,unresolvedApplicableResourceRowIds:allPotentialNeeds},
  applicability:{...structuredClone(c.definition.applicability),master32FanElectricalToolProvision:{contract:pack.contract,methodParameterId:pack.selectorId,fitParameterId:pack.compatibilityId,frontCountParameterId:pack.frontCountId,
   inventoryOnly:true,actualElectricalChecksOrSafeIsolationProved:false,fullTechnicalAcceptance:false,conditionalOldToolNeedTypesClosed:1},retainedParentCaptureSha256:masterRetainedParentCaptureSha256R1(c)},
  binding:{rowId:bound[0]!,additionalRowIds:bound.slice(1),retainParentBindings:retained,applicability:{contract:pack.contract,methodParameterId:pack.selectorId,methodValue:pack.selectedMethod,
   fitParameterId:pack.compatibilityId,frontCountParameterId:pack.frontCountId,physicalProvisionOnly:true,fullTechnicalAcceptance:false},
   applicabilityByRowId:Object.fromEntries(bound.map(rowId=>[rowId,{contract:pack.contract,rowId,wholeProvisionOwnerRowId:pack.ownerRowId,sourceQuantityKind:'FUNCTIONAL_FRONT_INVENTORY_NOT_PURCHASE_OR_WEAR',automaticLegacyPriceOrQuantityTransferAllowed:false,fullTechnicalAcceptance:false}]))},
  locator:{key:'master32-'+t.key+'-electrical-tool-front-r1',payload:{contract:pack.contract,sourcePack:pack,sourcePackSha256:fileSha(packPath),independentCompletenessMap:map,fullTechnicalAcceptance:false}},
  search:{primaryUom:String(c.parameters.find(p=>p.parameter_id===pack.factoryCountId)!.unit_id),canonicalNameRu:'Монтаж вентилятора',aliases:['Установка вытяжного вентилятора'],shortScopeRu:'Заводской вентилятор и выбранное совместимое электрическое оснащение поста; остальные монтажные потребности сохраняются.',
   keyDistinguishingParameters:[pack.factorySelectorId,pack.selectorId],clarificationFields:[pack.factorySelectorId,pack.factoryCountId,pack.selectorId,pack.compatibilityId,pack.frontCountId],
   includedBoundaries:['Заводской вентилятор и отдельный подтверждённый комплект инструментов поста.'],excludedBoundaries:[...passport.excluded_scope_ru,...boundaries],extraSearchTermsRu:'вытяжной вентилятор электрическое подключение инструментальный пост',
   sourceProvenance:{contract:pack.contract,parentDefinitionId:c.definition.id,conditionalOldToolNeedTypesClosed:1,newFullTechnologies:0}},
  forbiddenAdjacentMatchers:[],owner:'ROOT_SINGLE_INTEGRATOR_MASTER32',receiptFileStem:'master32_fan_electrical_tool_provision',verifyCore:async()=>{
   assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:next.formulas,resourceDefinitions:next.resources}),[]);
   for(const choice of pack.factoryChoices)for(const[n,f]of [['1','1'],['5','2'],['1000000','1']]){
    const facts=master32FanElectricalToolFactsR1(n,f,choice),result=await compileMaster32FanElectricalToolsR1(catalogId,facts,{model:next}),before=await compileMaster32FanElectricalToolsR1(catalogId,{[pack.factorySelectorId]:choice,[pack.factoryCountId]:n},{model:parent(t.key)});
    assert.equal(result.rows.length,before.rows.length+25);assert.equal(result.rows.find(r=>r.row_id===pack.ownerRowId)?.quantity,f);
    for(const p of pack.parts)assert.equal(result.rows.find(r=>r.row_id===p.rowId)?.quantity,String(Number(f)*Number(p.perFront)));
    const old=result.rows.filter(r=>!r.row_id.startsWith(pack.prefix+':'));assert.deepEqual(old,before.rows);
    assert.equal(result.preliminaryNeeds.length,16);assert(result.preliminaryNeeds.every(r=>r.quantity===null));assert(!result.preliminaryNeeds.some(r=>r.row_id===pack.closedOldNeedRowId));
    assert.equal(result.rows.filter(r=>r.included_in_procurement).length,1);assert.equal(result.rows.filter(r=>r.included_in_estimate).length,2);
   }
   for(const missing of [pack.selectorId,pack.compatibilityId,pack.frontCountId]){const facts=master32FanElectricalToolFactsR1();delete facts[missing];const result=await compileMaster32FanElectricalToolsR1(catalogId,facts,{model:next});
    assert(pack.oldNeedRowIds.every(id=>result.preliminaryNeeds.some(n=>n.row_id===id)));assert(!result.rows.some(r=>r.row_id===pack.ownerRowId));}
   const old=await compileMaster32FanElectricalToolsR1(catalogId,baseline,{model:parent(t.key),primary:'q'}),now=await compileMaster32FanElectricalToolsR1(catalogId,baseline,{model:next,primary:'q'});
   assert.deepEqual(now.rows,old.rows);assert.deepEqual(now.totals,old.totals);
   return{status:'PASS_CLASSII_FAN_WHOLE_INITIAL_TOOL_FRONT_WITH_ALL_REMAINING_NEEDS',physicalComponents:24,newProvisionOwners:1,oldToolNeedsConditionallyClosed:1,newExplicitNeeds:3,selectedRemainingNeeds:16,newFull:0};
  }};
}
export const master32FanElectricalToolRecipesR1=pack.targets.map(t=>({catalogId:t.catalogId,configFactory:master32FanElectricalToolMasterConfigR1}));

/** Pure ordinary-whole publication request. No writer, capture or admission is
 * performed here. Unknown application norms cannot be relabelled as deferred
 * project facts to enter the CT54 typed-quantity branch. */
export function fanPreparedOpeningReferencePublicationRequestR614(context:Readonly<{
 current:Readonly<{releaseId:string;searchReleaseId:string;selectedDefinitionId:string;definitionSha256:string;
  baselineLeafId:string;parentShape:readonly [number,number,number]}>|null;
 capturedScopedNormativeRegistry:MasterCapturedScopedNormativeRegistryR1|null;
}>={current:null,capturedScopedNormativeRegistry:null}){
 const reference=fanReferenceR610,input=fanPreparedOpeningReferenceAdmissionInputR610(reference.catalogId);
 const unknown=input.model.resources.filter(row=>reference.unknownQuantityRows.includes(row.row_id));
 const locator={key:'quiet100_plain_prepared_opening_project_method_r610',payload:{
  contract:reference.contract,sourceKind:'PROJECT_SYSTEM',generatedFromCurrentRows:false,
  sourcePackSha256:fanPreparedOpeningReferenceArtifactSha256R610,sourcePack:reference,
  independentCompletenessMap:input.independentCompletenessMap,fullTechnicalAcceptance:false,actualProjectAuthenticated:false}};
 const blockers=[
  ...(context.current?[]:['CURRENT_SELECTED_TUPLE_AND_BASELINE_LEAF_REQUIRED']),
  ...(context.capturedScopedNormativeRegistry?[]:['FRESH_EXACT_SOURCE_LOCATOR_RAW_PREIMAGE_REQUIRED']),
  'VISIBLE_UNKNOWN_APPLICATION_QUANTITY_NORMS_REMAIN_PARTIAL',
  'ACTUAL_OBJECT_PPR_TOOL_AND_MANUAL_HANDLING_APPLICABILITY_NOT_AUTHENTICATED',
 ];
 return{contract:'fan-reference-ordinary-publication-request/r614-r1',status:'STOP_SOURCE_HELD',blockers,
  existingOwner:'runMasterSingleDefinitionSuccessorR1',mode:'ORDINARY_WHOLE_REPLACEMENT',
  executableConfig:null,actualAdmissionReceipt:null,
  current:context.current,capturedScopedNormativeRegistry:context.capturedScopedNormativeRegistry,
  preparationFields:{catalogId:reference.catalogId,sourceId:reference.sourceId,
   normId:'PROJECT_SYSTEM_FAN_PREPARED_OPENING_R610',
   sourceMetadata:{source_title:'Монтаж вентилятора в готовом проёме',source_kind:'PROJECT_SYSTEM',
    source_authority:'Explicit project reference method with exact adopted manufacturer and instrument evidence; not an installation consumption norm',
    artifact_sha256:fanPreparedOpeningReferenceArtifactSha256R610,exact_locator:locator.key,
    use_restriction:reference.sourceScope.join(' ')},
   parameterDefinitions:input.model.parameters,formulaDefinitions:input.model.formulas,resourceDefinitions:input.model.resources,
   shortInput:input.referenceDemoInput,acceptanceInput:input.referenceDemoInput,
   runtimeProfileInput:{},runtimeProfileClassification:{},runtimeProfileSourceIds:{},
   passport:{canonicalRuName:'Монтаж вытяжного вентилятора',workKey:reference.catalogId.replace('canonical-work:base:',''),
    physicalResultRu:'Вентилятор закреплён в готовом проёме, подключён к готовому питанию и проверен по согласованной программе.',
    includedScopeRu:reference.operationRoster.map(op=>op.operationTitleRu),excludedScopeRu:reference.sourceScope,
    independentCompletenessMap:input.independentCompletenessMap,unresolvedApplicableResourceRowIds:reference.unknownQuantityRows},
   applicability:input.applicability,
   binding:{rowId:reference.rows[0]!.rowId,additionalRowIds:reference.rows.slice(1).map(row=>row.rowId),
    applicability:{contract:reference.contract,newRootOnly:true,automaticMigrationAllowed:false}},locator,
   sourcePaths:[...input.sourcePaths,'scripts/estimate/r4a13/prepareMaster32FanElectricalToolProvisionR1.ts']},
  partialQuantityClassification:unknown.map(row=>({rowId:row.row_id,unitId:row.unit_id,
   inputParameterId:reference.rows.find(declaration=>declaration.rowId===row.row_id)?.quantityParameterId,
   authority:'UNRESOLVED_APPLICATION_NORM',quantityKnown:false,measurementUnitKnown:row.unit_id.trim().length>0,
   deferredProjectQuantityBasisEligible:false})),
  sharedExtension:{owner:'Finishing',contract:'master-ordinary-composite-typed-quantity/v1',
   applicableToThisUnresolvedNormRequest:false,reason:'Author-selected measurement units do not authorize missing application norms.'},
  omittedModes:['catalogAppend','retainParentBindings','reuseExistingNormativeRegistry'],
  compiler:{owner:'compileCanonicalEstimateCore',model:input.model,submittedParameters:input.referenceDemoInput,
   primaryMeasureParameterId:reference.primaryCountId},
 };
}

/** Build the ordinary, explicitly incomplete whole-source config from ROOT's
 * exact current read. A formal generated-ID scoped capture is still required;
 * exact source-key absence is not silently promoted to that authority. */
export type FanReferencePreparedPointerR620=Readonly<{
 referencePointerMode:'PREPARED_NOT_ACTIVE_COPY';
 currentReleasePath:string;selectedCurrentReleasePath:string;selectedCurrentPointerSha256:string;
}>;
export function fanReferenceCurrentMasterConfigR616(options:Readonly<{
 formalScopedRegistry:MasterCapturedScopedNormativeRegistryR1;
 pointer:FanReferencePreparedPointerR620;outputRoot?:string;
}>):MasterSingleDefinitionSuccessorConfig{
 assert(options?.formalScopedRegistry,'FAN_REFERENCE_FORMAL_GENERATED_SCOPE_CAPTURE_REQUIRED');
 const prepared=fanReferenceCurrentManagedCandidateR616({pointer:options.pointer,outputRoot:options.outputRoot});
 return{...prepared.config,capturedScopedNormativeRegistry:options.formalScopedRegistry};
}
export function fanReferenceCurrentManagedCandidateR616(ctx:Readonly<{pointer:FanReferencePreparedPointerR620;outputRoot?:string}>){
 assert(ctx?.pointer?.referencePointerMode==='PREPARED_NOT_ACTIVE_COPY','FAN_REFERENCE_PREPARED_POINTER_COPY_REQUIRED');
 const pointer=ctx.pointer,selectedPath=resolve(pointer.selectedCurrentReleasePath),copyPath=resolve(pointer.currentReleasePath);
 assert.equal(selectedPath.toLowerCase(),resolve('data/estimate-benchmarks/r568-local-developer-canonical-release.json').toLowerCase(),'FAN_REFERENCE_SELECTED_POINTER_PATH');
 assert.notEqual(copyPath.toLowerCase(),selectedPath.toLowerCase(),'FAN_REFERENCE_COPY_EQUALS_SELECTED_POINTER');
 assert.notEqual(realpathSync(copyPath).toLowerCase(),realpathSync(selectedPath).toLowerCase(),'FAN_REFERENCE_COPY_RESOLVES_TO_SELECTED_POINTER');
 const selectedStat=statSync(selectedPath),copyStat=statSync(copyPath);
 assert(selectedStat.dev!==copyStat.dev||selectedStat.ino!==copyStat.ino,'FAN_REFERENCE_COPY_SHARES_SELECTED_POINTER_FILE');
 const root='C:/Users/User/Documents/Codex/2026-10-27/files-pasted-by-the-user-c/work/current-ordinary-fan-read-r616/actual-readset';
 const pins:Record<string,string>={"COMPLETE_ORDINARY_WHOLE_REPLACEMENT_INPUT_RECEIPT.json": "ba06b2f77b27bbab5236723cceb822c89ba2923b4b886589a6783d1538111d19", "CURRENT_WHOLE_REPLACEMENT_TARGET_1.json": "8a0a8d34b31a7a4d5531b71465bb5ccb3e3d64b9e3499c4bc4ac002fd5137892", "EXACT_NEW_SOURCE_REGISTRY_SCOPE.json": "3d739e3f8cf92e44e03bcef255173570f9010d3afe98e28afd6bd4a7292c6137"};
 const read=(name:string)=>{assert.equal(fileSha(root+'/'+name),pins[name],'FAN_REFERENCE_CURRENT_READ_PIN:'+name);return JSON.parse(readFileSync(root+'/'+name,'utf8'));};
 const receipt=read('COMPLETE_ORDINARY_WHOLE_REPLACEMENT_INPUT_RECEIPT.json'),current=read('CURRENT_WHOLE_REPLACEMENT_TARGET_1.json'),registry=read('EXACT_NEW_SOURCE_REGISTRY_SCOPE.json');
 const assertCurrentReadPins=()=>{for(const[name,expected]of Object.entries(pins))assert.equal(fileSha(root+'/'+name),expected,'FAN_REFERENCE_CURRENT_READ_PIN:'+name);};
 assert.equal(receipt.status,'PASS_READONLY_ORDINARY_WHOLE_REPLACEMENT_INPUT_NOT_ADMISSION');assert.equal(receipt.databaseWrites,0);
 assert.equal(pointer.selectedCurrentPointerSha256,receipt.pointerAfterSha256,'FAN_REFERENCE_SELECTED_POINTER_RECEIPT_SHA');
 const assertSelectedPointer=()=>{
  assert.equal(fileSha(selectedPath),pointer.selectedCurrentPointerSha256,'FAN_REFERENCE_SELECTED_POINTER_BYTES_CHANGED');
  const selected=JSON.parse(readFileSync(selectedPath,'utf8'));assert.equal(selected.productionAccessed,false);
  assert.equal(selected.definitionReleaseId,receipt.definitionReleaseId);assert.equal(selected.searchReleaseId,receipt.searchReleaseId);
 };
 assertSelectedPointer();
 assert.equal(fileSha(copyPath),pointer.selectedCurrentPointerSha256,'FAN_REFERENCE_COPY_NOT_EXACT_INITIAL_SOURCE_BYTES');
 const reference=fanReferenceR610,model=fanPreparedOpeningReferenceAdmissionInputR610(reference.catalogId),
  fields=fanPreparedOpeningReferencePublicationRequestR614({current:{releaseId:receipt.definitionReleaseId,searchReleaseId:receipt.searchReleaseId,
   selectedDefinitionId:current.definition.id,definitionSha256:current.definition.definition_sha256,
   baselineLeafId:current.leafBaseline.id,parentShape:current.shape},capturedScopedNormativeRegistry:null}).preparationFields;
 assert.equal(current.catalogId,reference.catalogId);assert.equal(current.definition.id,'66fe2f5d-431d-57d8-a1b9-3615751f2ba4');
 assert.equal(current.definition.definition_sha256,'48c817451bef27eea00460950c206fd318b1e5cc646ec922d731d24198e829f3');
 assert.deepEqual(current.shape,[23,127,127]);
 assert.equal(registry.exactSourceKey,reference.sourceId);assert.equal(registry.exactLocatorKey,fields.locator.key);
 // R616 requested the previous immutable artifact. Actual key-absence rows are unchanged; the new formal candidate must bind the new artifact SHA.
 assert.equal(registry.expectedArtifactSha256,'e86d05411af9c15f5c3a5177e7212e09ff7e51c195bc7a2a9d64f2297af6f739');
 assert.equal(registry.sourceCount,0);assert.equal(registry.locatorCount,0);assert.deepEqual(registry.rawSourceRows,[]);assert.deepEqual(registry.rawLocatorRows,[]);
 const currentMasterPath='C:/Users/User/Downloads/GOX_BUILD_MASTER_TZ_2_23_2026-10-27.txt',currentMasterSha='036ec5f9538b2d7292812ca25e74f04dbc4038bf8b290e3645bb0b6fe6e043d4';
 assert.equal(fileSha(currentMasterPath),currentMasterSha);
 // This common extension is owned by Finishing. It establishes source scope
 // only; no partialQuantityBasis is assigned to unresolved application norms.
 const binding={...fields.binding,ordinaryCompositeSourceV1:{contract:'master-ordinary-composite-source/v1' as const,
  capturedSourcePreimage:{sourceKey:reference.sourceId,expected:null}}};
 const config:MasterSingleDefinitionSuccessorConfig={...fields,binding,
  contract:reference.contract,stopCode:'FAN_PREPARED_OPENING_REFERENCE_R616',applicationName:'fan-prepared-opening-reference-r616',
  expectedBranch:'codex/r4-a5-clean-08b18902',masterPath:currentMasterPath,masterSha256:currentMasterSha,
  parentReleaseId:receipt.definitionReleaseId,parentSearchReleaseId:receipt.searchReleaseId,
  currentReleasePath:copyPath,
  outputRoot:ctx.outputRoot??'.release-runtime/r568/fan-prepared-opening-reference-r616',
  sourcePaths:[...fields.sourcePaths,'scripts/estimate/r4a13/masterScopedNormativeRegistryPreimageR1.ts',selectedPath],
  expectedParentShape:[23,127,127],benchmarkOrdinal:0,
  validationScenario:'EXPLICIT_DEMO_PREPARED_OPENING_REFERENCE_UNKNOWN_NORMS_UNITS_NO_EXECUTED_INSTALLATION_CLAIM',
  search:{primaryUom:'set',canonicalNameRu:'Монтаж вентилятора',aliases:['Установка вытяжного вентилятора'],
   shortScopeRu:'Монтаж выбранного вентилятора в готовом проёме с готовым питанием и доступом с пола.',
   keyDistinguishingParameters:[reference.selectorId],clarificationFields:[reference.selectorId,reference.primaryCountId,reference.projectReferenceId,...reference.scopeChoices.map(c=>c.parameterId)],
   includedBoundaries:reference.operationRoster.map(op=>op.operationTitleRu),excludedBoundaries:reference.sourceScope,
   extraSearchTermsRu:'вентилятор готовый проём отключение питание проверка',
   sourceProvenance:{sourceKind:'PROJECT_SYSTEM',sourceArtifactSha256:fanPreparedOpeningReferenceArtifactSha256R610,
    currentDefinitionId:current.definition.id,newRootOnly:true,automaticMigrationAllowed:false,actualProjectAuthenticated:false}},
  forbiddenAdjacentMatchers:[],owner:'ROOT_SINGLE_INTEGRATOR',receiptFileStem:'fan_prepared_opening_reference_r616',
  verifyTargetPrecondition:async(client,phase)=>{
   // Match the existing whole-successor target lock set before the fresh bounded reread.
   if(phase==='LOCKED_BEFORE')await client.query(`lock table public.estimate_cumulative_manifest_entry,
    public.estimate_definition_version,public.estimate_approved_template_baseline,public.estimate_parameter_definition,
    public.estimate_formula_graph,public.estimate_resource_spec,public.estimate_work_normative_binding,
    public.estimate_normative_locator,public.estimate_normative_source,public.estimate_work_identity in share row exclusive mode`);
   assertSelectedPointer();assertCurrentReadPins();
   // Bounded current header, not old resource/formula/binding arrays.
   const rows=(await client.query(`select m.definition_version_id::text id,m.approved_template_baseline_id::text baseline_id,d.definition_sha256 sha
    from public.estimate_cumulative_manifest_entry m join public.estimate_definition_version d on d.id=m.definition_version_id
    where m.release_id=$1 and m.catalog_id=$2`,[receipt.definitionReleaseId,reference.catalogId])).rows;
   assert.equal(rows.length,1);assert.equal(rows[0].id,current.definition.id);assert.equal(rows[0].sha,current.definition.definition_sha256);
   assert.equal(rows[0].baseline_id,current.membership.approved_template_baseline_id);
   const leaf=await resolveCanonicalApprovedBaselineLeaf(client,rows[0].baseline_id,reference.catalogId);
   assert.equal(leaf.baselineId,current.leafBaseline.id);assert.equal(leaf.definitionVersionId,current.definition.id);
  },
  verifyCore:async()=>{
   const result=await compileCanonicalEstimateCore({operation:'compile',catalogId:reference.catalogId,compilerVersion:reference.contract,
    primaryMeasureParameterId:reference.primaryCountId,parameterDefinitions:[...model.model.parameters],formulaDefinitions:[...model.model.formulas],
    resourceDefinitions:[...model.model.resources],submittedParameters:model.referenceDemoInput,confirmedParameters:{},rowOverrides:{},priceItems:[],currencyCode:'KGS',
    maximumResourceRows:model.model.resources.length,hashJson:estimateDeterministicHash});
   assert.deepEqual(result.preliminaryNeeds.map(row=>row.row_id).sort(),[...reference.unknownQuantityRows].sort());
   assert(result.preliminaryNeeds.every(row=>row.quantity===null&&row.unit_id===reference.rows.find(declaration=>declaration.rowId===row.row_id)!.unitId));
   assert.deepEqual(result.rows.filter(row=>row.included_in_procurement).map(row=>row.row_id),[reference.rows[0]!.rowId]);
   return{status:'REFERENCE_ORDINARY_COMPILER_UNKNOWN_NORMS_AUTHOR_MEASUREMENT_UNITS',actualProjectAuthenticated:false,actualExecutionProved:false,
    quantityScope:'PARTIAL',pdfIssuanceAllowed:false,sourceUnitAuthorityCheckPending:true,fullTechnicalAcceptance:false,unknownResourceRowIds:reference.unknownQuantityRows};
  }};
 const candidate=assembleMasterSingleDefinitionManagedRegistryCandidateR1(config,{projectSourcePackage:null,projectSourcePackageSet:null}).retentionCandidate;
 return{config,candidate,referencePointerMode:'PREPARED_NOT_ACTIVE_COPY' as const,selectedCurrentReleasePath:selectedPath,
  selectedCurrentPointerSha256:pointer.selectedCurrentPointerSha256,
  currentReadEvidence:Object.entries(pins).map(([name,sha256])=>({path:root+'/'+name,sha256})),formalScopedRegistryAdmission:false as const,sourceAdmission:false as const,
  next:'ROOT uses existing scoped CAPTURE/NORMAL/LOCKED/REGISTERED authority against candidate-generated IDs; R616 key absence alone is not that receipt.'};
}

/** Formal source capture driver on ROOT's existing dedicated RR READ ONLY
 * client. No connection/BEGIN/SET/COMMIT/writer/receipt is created here. This
 * first fresh independent method expects an empty exact generated scope; any
 * unrelated matched scope stops after the first bounded read, never dropping it.
 */
export async function captureFanReferenceFormalSourceR619(
 client:Parameters<typeof captureMasterScopedNormativeRegistryPreimageR1>[0],
 options:Readonly<{pointer:FanReferencePreparedPointerR620;expectedSourcePins:Readonly<Record<string,string>>;expectedPointerSha256:string}>) {
 const prepared=fanReferenceCurrentManagedCandidateR616({pointer:options.pointer}),config=prepared.config;
 const sourcePaths=[...new Set([...config.sourcePaths,
  'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts',
  'scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts',
  'src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition.ts',
  'src/lib/estimate/backendPlatform/canonicalPublicResourcePresentationV1.ts',
  'src/lib/estimate/backendPlatform/canonicalPrimaryMeasureSelectionV1.ts'])];
 const check=()=>{
  assert.match(options.expectedPointerSha256,/^[a-f0-9]{64}$/u,'FAN_FORMAL_CAPTURE_POINTER_PIN_REQUIRED');
  assert.equal(fileSha(config.currentReleasePath),options.expectedPointerSha256,'FAN_FORMAL_CAPTURE_POINTER_BYTES_CHANGED');
  assert.equal(fileSha(prepared.selectedCurrentReleasePath),prepared.selectedCurrentPointerSha256,'FAN_FORMAL_CAPTURE_SELECTED_POINTER_BYTES_CHANGED');
  const pointer=JSON.parse(readFileSync(config.currentReleasePath,'utf8'));
  assert.equal(pointer.productionAccessed,false);assert.equal(pointer.definitionReleaseId,config.parentReleaseId);
  assert.equal(pointer.searchReleaseId,config.parentSearchReleaseId);
  for(const path of sourcePaths){const expected=options.expectedSourcePins[path];assert(expected,'FAN_FORMAL_CAPTURE_SOURCE_PIN_REQUIRED:'+path);
   assert.equal(fileSha(path),expected,'FAN_FORMAL_CAPTURE_SOURCE_BYTES_CHANGED:'+path);}
  assert.equal(fileSha('data/estimate-benchmarks/source-packs/fan-prepared-opening-reference-method-r610-r1.json'),fanPreparedOpeningReferenceArtifactSha256R610);
 };
 check();await config.verifyTargetPrecondition?.(client,'PREFLIGHT');
 const first=await captureMasterScopedNormativeRegistryPreimageR1(client,prepared.candidate);
 // The helper caps this first raw transfer at3MiB before emission. A nonempty
 // related scope is retained by the helper and rejected here without a retry.
 // Empty exact scope in the same RR snapshot makes both raw passes8bytes total;
 // no second independent3MiB allowance is granted by this driver.
 assert.equal(first.sourceRows.length,0,'FAN_FORMAL_CAPTURE_EXPECTED_EMPTY_SOURCE_SCOPE');
 assert.equal(first.locatorRows.length,0,'FAN_FORMAL_CAPTURE_EXPECTED_EMPTY_LOCATOR_SCOPE');
 check();const second=await captureMasterScopedNormativeRegistryPreimageR1(client,prepared.candidate);
 assert.equal(second.sourceRows.length,0);assert.equal(second.locatorRows.length,0);
 assert.equal(second.captureSha256,first.captureSha256,'FAN_FORMAL_CAPTURE_REPEAT_DRIFT');
 await config.verifyTargetPrecondition?.(client,'PREFLIGHT');check();
 return{contract:'fan-reference-formal-generated-source-capture/r619-r1',status:'FORMAL_SCOPE_CAPTURED_NOT_PUBLICATION',
  capture:first,secondCaptureSha256:second.captureSha256,currentReadEvidence:prepared.currentReadEvidence,
  scope:first.scope,sourcePins:{...options.expectedSourcePins},pointerSha256:options.expectedPointerSha256,
  maximumTotalRawPayloadBytes:3*1024*1024,actualSuccessfulRawPayloadBytes:8,
  rawPayloadMeaning:'Four empty JSON arrays: sources+locators, twice; SQL diagnostics/protocol excluded. Nonempty first scope is a STOP, not a filtered capture.',
  repeatableReadReadOnlyCheckedByExistingHelper:true,transactionRollbackStillRequiredByCaller:true,
  sourceAdmission:false,quantityScope:'PARTIAL',unknownApplicationNormRows:[...fanReferenceR610.unknownQuantityRows],
  actualExecutionProved:false,publicationPerformed:false};
}
