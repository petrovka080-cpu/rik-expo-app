import fanReferenceR610 from '../../../data/estimate-benchmarks/source-packs/fan-prepared-opening-reference-method-r610-r1.json';
import {fanPreparedOpeningReferenceAdmissionInputR610,fanPreparedOpeningReferenceArtifactSha256R610} from '../../../src/lib/estimate/v4/master32FanElectricalToolProvisionR1';
import type {MasterCapturedScopedNormativeRegistryR1} from './masterScopedNormativeRegistryPreimageR1';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
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
 const reference=fanReferenceR610 as unknown as Record<string,any>,input=fanPreparedOpeningReferenceAdmissionInputR610(reference.catalogId);
 const unknown=input.model.resources.filter(row=>reference.unknownQuantityRows.includes(row.row_id));
 const locator={key:'quiet100_plain_prepared_opening_project_method_r610',payload:{
  contract:reference.contract,sourceKind:'PROJECT_SYSTEM',generatedFromCurrentRows:false,
  sourcePackSha256:fanPreparedOpeningReferenceArtifactSha256R610,sourcePack:reference,
  independentCompletenessMap:input.independentCompletenessMap,fullTechnicalAcceptance:false,actualProjectAuthenticated:false}};
 const blockers=[
  ...(context.current?[]:['CURRENT_SELECTED_TUPLE_AND_BASELINE_LEAF_REQUIRED']),
  ...(context.capturedScopedNormativeRegistry?[]:['FRESH_EXACT_SOURCE_LOCATOR_RAW_PREIMAGE_REQUIRED']),
  'VISIBLE_UNKNOWN_MEASUREMENT_UNITS_AND_APPLICATION_NORMS_REQUIRE_SOURCE_AUTHORITY',
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
   authority:'UNRESOLVED_APPLICATION_NORM',quantityKnown:false,measurementUnitKnown:false,
   deferredProjectQuantityBasisEligible:false})),
  sharedExtension:{owner:'Finishing',contract:'master-ordinary-composite-typed-quantity/v1',
   applicableToThisUnresolvedNormRequest:false,reason:'DEFERRED_PROJECT_QUANTITIES does not authorize missing norms or units.'},
  omittedModes:['catalogAppend','retainParentBindings','reuseExistingNormativeRegistry'],
  compiler:{owner:'compileCanonicalEstimateCore',model:input.model,submittedParameters:input.referenceDemoInput,
   primaryMeasureParameterId:reference.primaryCountId},
 };
}
