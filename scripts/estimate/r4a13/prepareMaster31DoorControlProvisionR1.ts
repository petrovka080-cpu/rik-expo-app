import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {appendMaster31DoorControlProvisionR1 as append,master31DoorControlParentR1 as parent,
 master31DoorControlProvisionPackR1 as pack,master31DoorControlCompletenessR1 as completeness} from '../../../src/lib/estimate/v4/master31DoorControlProvisionR1';
import {manufacturerFactoryParentR1 as predecessor} from '../../../src/lib/estimate/v4/manufacturerDoorFanFactoryKitsR1';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {canonicalEstimateStableJson} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import {estimateDeterministicHash} from '../../../src/lib/estimate/estimateDeterministicHash';
import {masterRetainedParentCaptureSha256R1,type MasterRetainedParentCaptureR1,type MasterRetainParentBindingsR1} from './masterSingleDefinitionRetainParentBindingsR1';
import {validateIndependentCompletenessMapReferences,type MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';
const packPath='data/estimate-benchmarks/source-packs/master31-door-control-provision-r1.json';
const modulePath='src/lib/estimate/v4/master31DoorControlProvisionR1.ts';
const suitePath='src/lib/estimate/v4/master31DoorControlProvisionR1.test.ts';
const configPath='scripts/estimate/r4a13/prepareMaster31DoorControlProvisionR1.ts';
const masterPath='C:/Users/User/Downloads/GOX_BUILD_MASTER_TZ_2_10_2026-10-22 (1).txt';
const masterSha='c43f11299cabe70c803c59eca62f345afa986d6bbc17ac0c69198074e30cb8ed';
const fileSha=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
const valueSha=(v:unknown)=>createHash('sha256').update(canonicalEstimateStableJson(v)).digest('hex');
export const master31DoorControlFactsR1=(count:unknown='3',fronts:unknown='1')=>({[pack.factorySelectorId]:pack.factoryChoice,[pack.factoryCountId]:count,[pack.selectorId]:pack.selectedMethod,[pack.frontCountId]:fronts});
export function compileMaster31DoorControlR1(input:Record<string,unknown>,options:{model?:ReturnType<typeof parent>;rowOverrides?:CanonicalEstimateCompileCoreInput['rowOverrides'];primary?:string}={}){
 const model=options.model??append();
 return compileCanonicalEstimateCore({operation:'recalculate',catalogId:pack.catalogId,compilerVersion:pack.contract,primaryMeasureParameterId:options.primary??pack.factoryCountId,
  parameterDefinitions:[...model.parameters],formulaDefinitions:[...model.formulas],resourceDefinitions:[...model.resources],submittedParameters:input,confirmedParameters:{},
  rowOverrides:options.rowOverrides??{},priceItems:[],currencyCode:'KGS',maximumResourceRows:model.resources.length,hashJson:estimateDeterministicHash});
}
export function master31DoorControlMasterConfigR1(context:{releaseId:string;searchReleaseId:string;outputRoot?:string},catalogId:string=pack.catalogId):MasterSingleDefinitionSuccessorConfig{
 assert.equal(catalogId,pack.catalogId,'EXACT_MASTER31_DOOR_TARGET');assert.equal(fileSha(pack.parentFixturePath),pack.parentFixtureSha256);
 assert.equal(fileSha(masterPath),masterSha);for(const source of pack.sources)assert.equal(fileSha(source.path),source.sha256,'MASTER31_PRIMARY_SOURCE:'+source.key);
 const fixture=JSON.parse(readFileSync(pack.parentFixturePath,'utf8')),c=fixture.capture as MasterRetainedParentCaptureR1,
  original=predecessor(catalogId) as MasterRetainedParentCaptureR1,next=append(),map=completeness(),
  newParameters=next.parameters.filter(p=>!c.parameters.some(q=>q.parameter_id===p.parameter_id)),
  bound=[pack.ownerRowId,...pack.parts.map(p=>p.rowId)],oldIds=new Set(c.parameters.map(p=>p.parameter_id)),
  allPotentialNeeds=[...pack.oldNeeds.map(n=>n.rowId),...pack.additionalNeeds.map(n=>n.rowId)],
  retained:MasterRetainParentBindingsR1={capturedParent:c,capturedParentSha256:masterRetainedParentCaptureSha256R1(c),
   newParameterSources:Object.fromEntries(newParameters.map(p=>[p.parameter_id,p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM'
    ?{kind:'UNRESOLVED' as const,sourceIds:[]}:{kind:'KNOWN' as const,sourceIds:[pack.sourceId]}])),
   legacyTemplateAssumptionSources:{contract:'master-retained-legacy-template-assumptions/r1',templateId:c.definition.source_metadata.templateId,
    parameterSources:{q:[...c.baseline.normative_source_ids.q]},approvedTemplatePredecessor:{capturedParent:original,capturedParentSha256:masterRetainedParentCaptureSha256R1(original)}},
   successorProvenanceContinuation:{contract:'master-retained-binding-continuation/r1',capturedSourceMetadata:structuredClone(c.definition.source_metadata),
    capturedSourceMetadataSha256:valueSha(c.definition.source_metadata),capturedPreviousSuccessorSha256:valueSha(c.definition.source_metadata.retainedParentBindingSuccessorV1)}};
 assert.equal(newParameters.length,14);assert.equal(bound.length,14);assert(newParameters.every(p=>!oldIds.has(p.parameter_id)));
 const baseline=structuredClone(c.baseline.input_values),passport=fixture.capture.contentPassport,
  sourcePaths=[packPath,pack.parentFixturePath,modulePath,suitePath,configPath,...pack.sources.map(s=>s.path),
   'src/lib/estimate/v4/automaticConstructionOwnerR1.ts','src/lib/estimate/v4/manufacturerDoorFanFactoryKitsR1.ts',
   'data/estimate-benchmarks/source-packs/manufacturer-door-fan-factory-kits-r1.json',
   'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts','scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1.ts',
   'scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts','src/lib/estimate/backendPlatform/inclusionGraph.ts','src/lib/estimate/backendPlatform/canonicalDerivedQuantityEditPolicyV1.ts'];
 return{contract:pack.contract,stopCode:'MASTER31_DOOR_CONTROL_PROVISION',applicationName:'master31-door-control-provision',expectedBranch:'codex/r4-a5-clean-08b18902',
  masterPath,masterSha256:masterSha,parentReleaseId:context.releaseId,parentSearchReleaseId:context.searchReleaseId,currentReleasePath:'data/estimate-benchmarks/r568-local-developer-canonical-release.json',
  outputRoot:context.outputRoot??'.release-runtime/r568/master31-tool-provision/door',sourcePaths,catalogId,sourceId:pack.sourceId,normId:pack.normId,
  sourceMetadata:{source_title:pack.ownerTitleRu,source_authority:'Apartment DSV method, exact instrument manufacturer capabilities and explicitly selected front organization; no labour, wear or purchase norm',
   source_kind:'PRIMARY_METHOD_AND_INSTRUMENT_CAPABILITIES_WITH_EXPLICIT_ENGINEERING_PROVISION',official_url:pack.sources.find(s=>s.key==='dsv')!.officialUrl,
   artifact_sha256:fileSha(packPath),exact_locator:pack.sources.map(s=>s.key+': '+s.locator).join('; '),use_restriction:pack.boundariesRu.join(' ')},
  parameterDefinitions:next.parameters,formulaDefinitions:next.formulas,resourceDefinitions:next.resources,shortInput:baseline,acceptanceInput:baseline,
  runtimeProfileInput:{q:c.baseline.input_values.q},runtimeProfileClassification:{q:'ASSUMPTION'},runtimeProfileSourceIds:{q:[...c.baseline.normative_source_ids.q]},
  expectedParentShape:pack.parentShape as [number,number,number],benchmarkOrdinal:0,validationScenario:'DEMO_ONLY_APARTMENT_DOOR_CONTROL_FRONT_INVENTORY_NOT_REAL_MEASUREMENTS_OR_INSTALLATION_NORM',
  passport:{canonicalRuName:'Установка квартирной стальной двери',workKey:catalogId.replace('canonical-work:base:',''),physicalResultRu:'Установка квартирного дверного блока с отдельным измерительно-контрольным оснащением и сохранёнными монтажными потребностями.',
   includedScopeRu:[...passport.included_scope_ru,'Отдельное функциональное оснащение каждого выбранного измерительного фронта.'],excludedScopeRu:[...passport.excluded_scope_ru,...pack.boundariesRu],
   independentCompletenessMap:map,unresolvedApplicableResourceRowIds:allPotentialNeeds},
  applicability:{...structuredClone(c.definition.applicability),master31DoorControlProvision:{contract:pack.contract,methodParameterId:pack.selectorId,frontCountParameterId:pack.frontCountId,
   inventoryOnly:true,actualMeasurementsOrAcceptanceProved:false,fullTechnicalAcceptance:false,conditionalOldToolNeedTypesClosed:3},retainedParentCaptureSha256:masterRetainedParentCaptureSha256R1(c)},
  binding:{rowId:bound[0]!,additionalRowIds:bound.slice(1),retainParentBindings:retained,applicability:{contract:pack.contract,methodParameterId:pack.selectorId,methodValue:pack.selectedMethod,
   frontCountParameterId:pack.frontCountId,physicalProvisionOnly:true,fullTechnicalAcceptance:false},
   applicabilityByRowId:Object.fromEntries(bound.map(rowId=>[rowId,{contract:pack.contract,rowId,wholeProvisionOwnerRowId:pack.ownerRowId,sourceQuantityKind:'FUNCTIONAL_FRONT_INVENTORY_NOT_PURCHASE_OR_WEAR',automaticLegacyPriceOrQuantityTransferAllowed:false,fullTechnicalAcceptance:false}]))},
  locator:{key:'master31-apartment-door-control-front-r1',payload:{contract:pack.contract,sourcePack:pack,sourcePackSha256:fileSha(packPath),independentCompletenessMap:map,fullTechnicalAcceptance:false}},
  search:{primaryUom:String(c.parameters.find(p=>p.parameter_id===pack.factoryCountId)!.unit_id),canonicalNameRu:'Монтаж входной двери',aliases:['Установка квартирной двери'],
   shortScopeRu:'Квартирный дверной блок с отдельным измерительно-контрольным оснащением; остальные монтажные потребности сохраняются.',
   keyDistinguishingParameters:[pack.factorySelectorId,pack.selectorId],clarificationFields:[pack.factorySelectorId,pack.factoryCountId,pack.selectorId,pack.frontCountId],
   includedBoundaries:['Квартирный дверной блок и выбранное измерительное оснащение.'],excludedBoundaries:[...passport.excluded_scope_ru,...pack.boundariesRu],extraSearchTermsRu:'квартирная входная дверь измерительный контроль уровень рулетка',
   sourceProvenance:{contract:pack.contract,parentDefinitionId:c.definition.id,conditionalOldToolNeedTypesClosed:3,newFullTechnologies:0}},
  forbiddenAdjacentMatchers:[],owner:'ROOT_SINGLE_INTEGRATOR_MASTER31',receiptFileStem:'master31_door_control_provision',
  verifyCore:async()=>{
   assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:next.formulas,resourceDefinitions:next.resources}),[]);
   for(const [n,f]of [['1','1'],['3','2'],['1000000','1']]){const result=await compileMaster31DoorControlR1(master31DoorControlFactsR1(n,f),{model:next});
    assert.equal(result.rows.find(r=>r.row_id===pack.ownerRowId)?.quantity,f);
    for(const part of pack.parts)assert.equal(result.rows.find(r=>r.row_id===part.rowId)?.quantity,String(Number(f)*Number(part.perFront)));
    assert(pack.closedOldNeedRowIds.every(id=>!result.preliminaryNeeds.some(r=>r.row_id===id)));
    assert.equal(result.preliminaryNeeds.length,31);assert(result.preliminaryNeeds.every(r=>r.quantity===null));
    assert.equal(result.rows.filter(r=>r.included_in_procurement).length,1);assert.equal(result.rows.filter(r=>r.included_in_estimate).length,2);}
   const basic={[pack.factorySelectorId]:pack.factoryChoice,[pack.factoryCountId]:'3'},missing=await compileMaster31DoorControlR1(basic,{model:next});
   assert(pack.oldNeeds.every(n=>missing.preliminaryNeeds.some(r=>r.row_id===n.rowId)));
   assert(!missing.rows.some(r=>r.row_id===pack.ownerRowId));
   const old=await compileMaster31DoorControlR1(baseline,{model:parent()}),now=await compileMaster31DoorControlR1(baseline,{model:next});
   const view=(r:typeof old)=>r.rows.map(p=>[p.row_id,p.quantity,p.unit_price,p.amount,p.included_in_estimate,p.included_in_procurement]);
   assert.deepEqual(view(now),view(old));assert.deepEqual(now.totals,old.totals);
   return{status:'PASS_WHOLE_CONTROL_FRONT_INVENTORY_WITH_REMAINING_INSTALLATION_NEEDS',physicalComponents:13,newProvisionOwners:1,oldToolNeedsConditionallyClosed:3,
    newExplicitNeeds:12,selectedRemainingNeeds:31,newFull:0};
  }};
}
export const master31DoorControlRecipesR1=[{catalogId:pack.catalogId,configFactory:master31DoorControlMasterConfigR1}];
