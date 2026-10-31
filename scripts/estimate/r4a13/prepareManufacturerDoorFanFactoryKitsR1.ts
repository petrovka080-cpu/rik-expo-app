import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {manufacturerDoorFanFactoryKitsPackR1 as pack,manufacturerFactoryParentR1 as parentCapture,
 manufacturerFactoryProfilesR1 as profiles,manufacturerDoorFanFactoryDefinitionR1 as definition,
 manufacturerDoorFanFactoryCompletenessR1 as completeness,manufacturerFactoryPrimarySelectionR1 as primary} from '../../../src/lib/estimate/v4/manufacturerDoorFanFactoryKitsR1';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {canonicalEstimateStableJson as stable} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import {masterRetainedParentCaptureSha256R1,type MasterRetainedParentCaptureR1,type MasterRetainParentBindingsR1} from './masterSingleDefinitionRetainParentBindingsR1';
import {validateIndependentCompletenessMapReferences,type MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';
const packPath='data/estimate-benchmarks/source-packs/manufacturer-door-fan-factory-kits-r1.json',
 pinsPath='data/estimate-benchmarks/fixtures/manufacturer-door-fan-dependency-pins-r1.json',
 absencePath='data/estimate-benchmarks/fixtures/manufacturer-door-fan-registry-absence-r1.json',
 modulePath='src/lib/estimate/v4/manufacturerDoorFanFactoryKitsR1.ts',
 suitePath='src/lib/estimate/v4/manufacturerDoorFanFactoryKitsR1.test.ts',
 configPath='scripts/estimate/r4a13/prepareManufacturerDoorFanFactoryKitsR1.ts',
 masterPath='C:/Users/User/Downloads/GOX_BUILD_TZ_Single_Platform_Core_Sol61_2026-10-19(2).txt';
const hash=(v:unknown)=>createHash('sha256').update(stable(v)).digest('hex');
const shaFile=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
export function compileManufacturerFactoryCaseR1(catalogId:string,input:Record<string,unknown>,rowOverrides:CanonicalEstimateCompileCoreInput['rowOverrides']={},legacyParentOnly=false){
 const c=parentCapture(catalogId),d=legacyParentOnly?c:definition(catalogId),selector=input[pack.selectorId],selected=profiles(catalogId).some(p=>p.choiceValue===selector);
 // Raw captured declaration shape is admitted only after full hash/identity/shape
 // checks in parentCapture. Copies satisfy the core's mutable-array API.
 const typed=d as unknown as ReturnType<typeof definition>;
 return compileCanonicalEstimateCore({operation:'recalculate',catalogId,compilerVersion:pack.contract,primaryMeasureParameterId:selected?pack.countParameterId:'q',
  parameterDefinitions:[...typed.parameters],formulaDefinitions:[...typed.formulas],resourceDefinitions:[...typed.resources],submittedParameters:input,confirmedParameters:{},
  rowOverrides,priceItems:[],currencyCode:'KGS',maximumResourceRows:d.resources.length,hashJson:hash});
}
/** Concrete recipe for the existing sequential Master writer. No CLI/apply call,
 * database connection, source gate override or separate supply catalog. */
export function manufacturerFactoryMasterConfigR1(context:{releaseId:string;searchReleaseId:string;outputRoot?:string},catalogId:string):MasterSingleDefinitionSuccessorConfig{
 const t=pack.targets.find(t=>t.catalogId===catalogId);assert(t,'EXACT_THREE_FACTORY_TARGETS');
 assert.equal(shaFile(pack.parentSnapshot),pack.parentSnapshotSha256,'EXACT_RAW_PARENT_CAPTURE_BYTES');
 assert.equal(shaFile(masterPath),pack.masterSha256,'MASTER_BYTES');
 for(const s of pack.sources)assert.equal(shaFile(s.path),s.sha256,'MANUFACTURER_PRIMARY_SOURCE_BYTES:'+s.key);
 const pins=JSON.parse(readFileSync(pinsPath,'utf8')) as {pins:{path:string;sha256:string}[]};
 for(const p of pins.pins)assert.equal(shaFile(p.path),p.sha256,'EXACT_COMMON_DEPENDENCY:'+p.path);
 assert.equal(shaFile(absencePath),'3f833b737a7db971d4d0a9aa288fef319610f1a288409afc92d8df03ba0eb740','ROOT_READONLY_SOURCE_ABSENCE_BYTES');
 const absence=JSON.parse(readFileSync(absencePath,'utf8')) as {keys:string[];rows:unknown[];databaseWrites:boolean};
 assert(absence.keys.includes(t.sourceId)&&absence.rows.length===0&&absence.databaseWrites===false,'EXACT_NEW_SOURCE_ABSENCE');
 const c=parentCapture(catalogId),next=definition(catalogId),ps=profiles(catalogId),map=completeness(catalogId),needs=pack.needs[t.family]!,
  open=needs.map(g=>g.rowId),known=ps.flatMap(p=>p.independentExpected.map(e=>e.rowId)),source=pack.sources.find(s=>s.key===(t.family==='hvac'?'fan-manual':'door-model'))!,
  legacyInput={q:c.baseline.input_values.q,[pack.selectorId]:pack.legacyChoice},
  newParameterSources:MasterRetainParentBindingsR1['newParameterSources']={
   [pack.selectorId]:{kind:'KNOWN',sourceIds:[t.sourceId]},[pack.countParameterId]:{kind:'KNOWN',sourceIds:[t.sourceId]},
   ...Object.fromEntries(needs.map(g=>[g.parameterId,{kind:'UNRESOLVED' as const,sourceIds:[]}]))},
  capturedParent=c as MasterRetainedParentCaptureR1,
  retained:MasterRetainParentBindingsR1={capturedParent,capturedParentSha256:masterRetainedParentCaptureSha256R1(capturedParent),newParameterSources,
   legacyTemplateAssumptionSources:{contract:'master-retained-legacy-template-assumptions/r1',templateId:c.definition.source_metadata.templateId,
    parameterSources:{q:[...c.baseline.normative_source_ids.q]}},capturedSourcePreimage:{sourceKey:t.sourceId,expected:null}},
  included=['Прежний общий расчёт сохраняется только по явному выбору, со всеми исходными формулами и владельцами.',...ps.map(p=>p.scopeRu)],
  excluded=['Полный монтаж, пригодность конкретного основания и места установки не заявлены.','Нерассчитанные труд, оснастка, СИЗ, доставка и обращение с отходами остаются видимыми.'],
  sourcePaths=[packPath,pack.parentSnapshot,pinsPath,absencePath,modulePath,suitePath,configPath,...pack.sources.map(s=>s.path),...pins.pins.map(p=>p.path)];
 return{contract:pack.contract,stopCode:'MASTER30_FACTORY_'+t.key.replaceAll('-','_').toUpperCase(),applicationName:'master30-factory-'+t.key,
  expectedBranch:'codex/r4-a5-clean-08b18902',masterPath,masterSha256:pack.masterSha256,parentReleaseId:context.releaseId,parentSearchReleaseId:context.searchReleaseId,
  currentReleasePath:'data/estimate-benchmarks/r568-local-developer-canonical-release.json',outputRoot:context.outputRoot??'.release-runtime/r568/master30-factory-kits/'+t.key,
  sourcePaths,catalogId,sourceId:t.sourceId,normId:'MANUFACTURER_FACTORY_UNIT_BOM_R1',
  sourceMetadata:{source_title:t.family==='hvac'?'Заводская комплектация вытяжного вентилятора':'Заводской собранный квартирный дверной блок',
   source_authority:'Fixed manufacturer primary manual and exact model card; no onsite installation rate',source_kind:'COMPOSITE_PRIMARY_MANUFACTURER_FACTORY_BOM',
   official_url:source.officialUrl,artifact_sha256:shaFile(packPath),exact_locator:ps.map(p=>p.sourceKeys.map(k=>pack.sources.find(s=>s.key===k)!.locator).join('; ')).join(' | '),
   use_restriction:ps.map(p=>p.scopeRu).join(' ')},
  parameterDefinitions:next.parameters,formulaDefinitions:next.formulas,resourceDefinitions:next.resources,expectedParentShape:t.shape,
  shortInput:legacyInput,acceptanceInput:legacyInput,runtimeProfileInput:{q:c.baseline.input_values.q},runtimeProfileClassification:{q:'ASSUMPTION'},
  runtimeProfileSourceIds:{q:[...c.baseline.normative_source_ids.q]},benchmarkOrdinal:0,
  validationScenario:'EXPLICIT_LEGACY_FULL_ORACLE_REQUIRED_NULL_SELECTOR_INTEGER_FACTORY_COUNT_COMPLETE_BOM_PARTIAL_ONSITE',
  passport:{canonicalRuName:t.publicTitleRu,workKey:catalogId.replace('canonical-work:base:',''),physicalResultRu:t.publicTitleRu,
   includedScopeRu:included,excludedScopeRu:excluded,independentCompletenessMap:map,unresolvedApplicableResourceRowIds:open},
  applicability:{...c.definition.applicability,primaryMeasureParameterId:'q',primaryMeasureSelectionV1:primary(catalogId),
   factoryPhysicalResultComplete:true,factoryDeliveryBomComplete:t.family==='hvac',fullTechnicalAcceptance:false,quantityScope:'PARTIAL',
   newRootForFactorySelection:true,selectorRequired:true,legacyRevisionMutationAllowed:false,retainedParentCaptureSha256:masterRetainedParentCaptureSha256R1(capturedParent)},
  binding:{rowId:known[0]!,additionalRowIds:known.slice(1),retainParentBindings:retained,
   applicability:{contract:pack.contract,selectedOnly:{kind:'or',operands:ps.map(p=>({kind:'equals',parameterId:pack.selectorId,value:p.choiceValue}))},fullTechnicalAcceptance:false},
   applicabilityByRowId:Object.fromEntries(ps.flatMap(p=>p.independentExpected.map(e=>[e.rowId,{contract:pack.contract,selectedOnly:{kind:'equals',parameterId:pack.selectorId,value:p.choiceValue},
    scopeRu:p.scopeRu,factoryPhysicalResultComplete:true,factoryDeliveryBomComplete:p.deliveryBomComplete,requiredOperationIds:e.requiredOperationIds,fullTechnicalAcceptance:false}])) )},
  locator:{key:'master30-factory-'+t.key,payload:{contract:pack.contract,sourcePack:pack,sourcePackSha256:shaFile(packPath),parentRawFileSha256:pack.parentSnapshotSha256,
   independentCompletenessMap:map,fullTechnicalAcceptance:false}},
  search:{primaryUom:t.legacyPrimaryUnit,canonicalNameRu:t.publicTitleRu,aliases:t.family==='hvac'?['Вытяжной вентилятор с заводской комплектацией']:['Квартирный стальной дверной блок в сборе'],
   shortScopeRu:'Прежний общий расчёт и отдельный заводской профиль по целому числу изделий. Монтажные потребности сохраняются.',
   keyDistinguishingParameters:[pack.selectorId],clarificationFields:[pack.selectorId,pack.countParameterId,'q'],includedBoundaries:included,excludedBoundaries:excluded,
   extraSearchTermsRu:t.family==='hvac'?'вытяжной вентилятор 100 125 таймер прокладка заводская комплектация':'квартирная стальная дверь правый блок короб полотно петли замки',
   sourceProvenance:{contract:pack.contract,factoryPhysicalResults:1,newFullOnsiteTechnologies:0,parentDefinitionId:t.definitionVersionId}},
  forbiddenAdjacentMatchers:[/automatic_normative_full|fake_tail_consumption/iu],owner:'ROOT_SINGLE_INTEGRATOR_MASTER30',receiptFileStem:'master30_factory_'+t.key.replaceAll('-','_'),
  verifyCore:async()=>{
   assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:next.formulas,resourceDefinitions:next.resources}),[]);
   const before=await compileManufacturerFactoryCaseR1(catalogId,{q:100},{},true),after=await compileManufacturerFactoryCaseR1(catalogId,{q:100,[pack.selectorId]:pack.legacyChoice});
   assert.deepEqual(after.rows,before.rows);assert.deepEqual(after.preliminaryNeeds,before.preliminaryNeeds);assert.deepEqual(after.totals,before.totals);
   const omitted=await compileManufacturerFactoryCaseR1(catalogId,{q:100}).then(v=>v,()=>null);
   assert(omitted===null||omitted.preliminaryNeeds.some(n=>n.missing_parameter_ids.includes(pack.selectorId)),'OMITTED_CHOICE_MUST_NOT_RUN_LEGACY');
   for(const p of ps){const result=await compileManufacturerFactoryCaseR1(catalogId,{[pack.selectorId]:p.choiceValue,[pack.countParameterId]:3,q:999});
    assert.equal(result.rows.find(r=>r.row_id===p.ownerRowId)?.quantity,'3');assert.equal(result.rows.filter(r=>r.included_in_procurement).length,1);
    assert.deepEqual(result.preliminaryNeeds.map(n=>n.row_id).sort(),[...open].sort());
    for(const e of p.independentExpected){const r=result.rows.find(r=>r.row_id===e.rowId)!;assert(r);assert.equal(r.quantity,String(3*Number(e.multiplier)));assert.equal(r.unit_id,e.unitId);assert.equal(r.category,e.category);}
   }
   return{status:'PASS_ACTUAL_CORE_FACTORY_BOM_AND_EXPLICIT_LEGACY',factoryChoices:ps.length,onsiteNeeds:open.length,fullTechnicalAcceptance:false};
  }};
}
export const manufacturerFactoryMasterRecipesR1=pack.targets.map(t=>({catalogId:t.catalogId,sourceId:t.sourceId,configFactory:manufacturerFactoryMasterConfigR1}));
