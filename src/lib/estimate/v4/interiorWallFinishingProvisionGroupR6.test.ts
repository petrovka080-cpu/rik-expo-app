import {strict as assert} from 'node:assert';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {interiorWallFinishingProvisionGroupDefinitionR6 as definition,interiorWallFinishingProvisionCompletenessMapR6 as oracle,
 interiorWallFinishingProvisionPackR6 as pack} from './interiorWallFinishingProvisionGroupR6';
import {interiorWallFinishingCrewGroupDefinitionR4 as prior,interiorWallFinishingCrewPackR4 as r4Pack,type InteriorWallFinishingBranchR4} from './interiorWallFinishingCrewGroupR4';
import {interiorWallFinishingGeometryRowR3 as r,interiorWallFinishingGeometryParameterR3 as p,
 interiorWallFinishingGeometryPackR3 as base} from './interiorWallFinishingGeometryGroupR3';
import {compileCanonicalEstimateCore} from '../backendPlatform/canonicalEstimateCompileCore';
import {canonicalEstimateOperationReferences} from '../backendPlatform/canonicalEstimateOperationComposition';
import {canonicalPurchaseShortagesV1,assertCanonicalPurchaseReadinessV1} from '../backendPlatform/canonicalPurchaseBalanceV1';
import {canonicalEstimateStableJson} from '../backendPlatform/canonicalEstimateDeterminism';
import {validateIndependentCompletenessMapReferences} from '../../../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
import {assertCanonicalPublisherParameterOrdinalsUniqueR1,assertCanonicalPublisherResourceOrdinalsUniqueR1} from '../../../../scripts/estimate/r4a13/canonicalDefinitionPublisherR1';
import {canonicalPublicResourceRowKindV1} from '../backendPlatform/canonicalPublicResourcePresentationV1';
import {buildCanonicalProfessionalPdfProjection} from '../backendPlatform/canonicalProfessionalPdf';
import {canonicalArtifactPreliminaryNeeds} from '../backendPlatform/canonicalEstimateArtifactContract';
import {projectCanonicalEstimatePreliminaryNeedTransport} from '../backendPlatform/canonicalEstimatePreliminaryNeedTransport';
import {canonicalEstimateRevisionRowFromStorage} from '../backendPlatform/canonicalEstimateRevisionReadMapper';
import {adaptCanonicalRevisionToStructuredEstimate} from '../backendPlatform/canonicalEstimateForemanAdapter';
import {ESTIMATE_PLATFORM_API_VERSION,type CanonicalEstimateCatalogItem,type CanonicalEstimateRevisionView} from '../backendPlatform/contracts';
import {buildStructuredEstimateRequestDraft} from '../../estimateStructuredPipeline/structuredEstimateRequestBinding';
import {appendCanonicalBackendRevisionProjection} from '../../consumerRequests/consumerCanonicalBackendRevisionProjection';
import {buildRequestEstimateViewModel} from '../../../features/consumerRepair/requestEstimateViewModel';
import type {ConsumerRepairDraftBundle,ConsumerRepairRequestItem} from '../../consumerRequests/consumerRequestTypes';
type Json=Record<string,any>;
export async function runInteriorWallFinishingProvisionChecksR6(sourceRoot='C:/dev/rik-expo-app-r4a5-dc4f0ce7') {
 const done:string[]=[];const check=async(name:string,fn:()=>unknown|Promise<unknown>)=>{await fn();done.push(name);};
 const compile=(branch:InteriorWallFinishingBranchR4,area='20.1',rowOverrides:Json={},facts:Json={},old=false)=>{
  const d=old?prior(branch):definition(branch);return compileCanonicalEstimateCore({operation:'recalculate',catalogId:r4Pack.branches.find(value=>value.id===branch)!.catalogId,
   compilerVersion:pack.contract,primaryMeasureParameterId:p(base.areaId),parameterDefinitions:[...d.parameters],
   formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],submittedParameters:{[p(base.areaId)]:area,...facts},
   confirmedParameters:{},rowOverrides,priceItems:[],currencyCode:'KGS',maximumResourceRows:d.resources.length,
   hashJson:async value=>createHash('sha256').update(canonicalEstimateStableJson(value)).digest('hex')});
 };
 const q=(result:Awaited<ReturnType<typeof compile>>,key:string)=>result.rows.find(row=>row.row_id===r(key))?.quantity??null;
 const provenance={kind:'manual',reason:'ADVERSE_SEMANTIC_TEST_ONLY'};
 await check('all branches have stable unique integer parameter and resource ordinals admitted by the existing gates',()=>{
  for(const branch of ['improved-wall-01','deep-primer-00603','high-quality-wall-05'] as const){const d=definition(branch);
   assert.deepEqual(d.parameters.map(parameter=>parameter.ordinal),d.parameters.map((_,ordinal)=>ordinal));
   assert.deepEqual(d.resources.map(resource=>resource.ordinal),d.resources.map((_,ordinal)=>ordinal));
   assert(d.parameters.every(parameter=>Number.isSafeInteger(parameter.ordinal)));
   assert(d.resources.every(resource=>Number.isSafeInteger(resource.ordinal)));
   assert.doesNotThrow(()=>assertCanonicalPublisherParameterOrdinalsUniqueR1(d.parameters));
   assert.doesNotThrow(()=>assertCanonicalPublisherResourceOrdinalsUniqueR1(d.resources));
   assert.throws(()=>assertCanonicalPublisherParameterOrdinalsUniqueR1(d.parameters.map((parameter,index)=>index===1?{...parameter,ordinal:d.parameters[0]!.ordinal}:parameter)),
    /STOP_CANONICAL_PUBLISHER_DUPLICATE_PARAMETER_ORDINAL/);
   assert.throws(()=>assertCanonicalPublisherParameterOrdinalsUniqueR1(d.parameters.map((parameter,index)=>index===0?{...parameter,ordinal:0.5}:parameter)),
    /STOP_CANONICAL_PUBLISHER_PARAMETER_ORDINAL_INVALID/);
   assert.throws(()=>assertCanonicalPublisherResourceOrdinalsUniqueR1(d.resources.map((resource,index)=>index===1?{...resource,ordinal:d.resources[0]!.ordinal}:resource)),
    /STOP_CANONICAL_PUBLISHER_DUPLICATE_RESOURCE_ORDINAL/);
   assert.throws(()=>assertCanonicalPublisherResourceOrdinalsUniqueR1(d.resources.map((resource,index)=>index===0?{...resource,ordinal:0.5}:resource)),
    /STOP_CANONICAL_PUBLISHER_RESOURCE_ORDINAL_INVALID/);
  }
 });
 await check('exact primary bytes and unchanged R4 parent pins',()=>{
  for(const source of pack.sources)assert.equal(createHash('sha256').update(readFileSync(resolve(sourceRoot,source.path))).digest('hex'),source.sha256,source.id);
  for(const source of pack.predecessorPins)assert.equal(createHash('sha256').update(readFileSync(resolve('C:/dev/rik-expo-app-r4a5-dc4f0ce7',source.path))).digest('hex'),source.sha256,source.path);
  assert.equal(pack.skin.supplierYieldApproximate,true);assert.equal(pack.skin.normalHandApplicationsPerCan,150);
 });
 await check('independent technology oracle covers all stage tools materials machines and source units',()=>{
  for(const branch of ['improved-wall-01','deep-primer-00603'] as const){const d=definition(branch),m=oracle(branch);
   const required=m.entries.filter(entry=>entry.resolution.kind!=='NOT_APPLICABLE').map(entry=>{
    assert('category'in entry,entry.expectedResourceId);assert('unitId'in entry,entry.expectedResourceId);
    assert('requiredOperationIds'in entry,entry.expectedResourceId);return entry;
   });
   for(const entry of required){assert(entry.category,entry.expectedResourceId);assert('unitId'in entry,entry.expectedResourceId);
    assert(entry.requiredOperationIds.length>0,entry.expectedResourceId);}
   const validate=(resourceDefinitions:typeof d.resources,formulaDefinitions=d.formulas)=>validateIndependentCompletenessMapReferences({completenessMap:m,formulaDefinitions,resourceDefinitions});
   assert.deepEqual(validate(d.resources),[],branch);
   for(const key of ['tool-waterborne-brush','tool-application-pail','tool-application-pail-lid','tool-dedust-brush','tool-floor-brush',
    'tool-dustpan','tool-waste-bin','tool-waste-bin-lid','tool-work-clothing','tool-waterproof-gloves','tool-eye-protection',
    'lift-preputty','truck','preputty-primer-order','skin-protection-foam','open-hand-cleanser','open-hand-drying-towels']){
    assert(validate(d.resources.filter(row=>row.row_id!==r(key))).some(error=>error.includes('ROW_REFERENCE')),key);
   }
   const skin=d.resources.find(row=>row.row_id===r('skin-protection-foam'))!;
   for(const entry of required.filter(entry=>entry.unitId)){
    const targetId=(entry.resolution as Json).rowId;
    assert(validate(d.resources.map(row=>row.row_id===targetId?{...row,unit_id:entry.unitId==='kg'?'l':'kg'}:row))
     .some(error=>error.includes('RESOURCE_UNIT')),entry.expectedResourceId);
    assert(validate(d.resources.map(row=>row.row_id===targetId?{...row,category:entry.category==='material'?'equipment':'material'}:row))
     .some(error=>error.includes('RESOURCE_CATEGORY')),entry.expectedResourceId);
   }
   for(const unit of ['kg','l','m2'])assert(validate(d.resources.map(row=>row===skin?{...row,unit_id:unit}:row)).some(error=>error.includes('RESOURCE_UNIT')),unit);
   for(const category of ['equipment','service','labor'])assert(validate(d.resources.map(row=>row===skin?{...row,category}:row)).some(error=>error.includes('RESOURCE_CATEGORY')),category);
   assert(validate(d.resources,d.formulas.map(f=>f.formula_id===skin.formula_id?{...f,output_unit_id:'kg'}:f)).some(error=>error.includes('FORMULA_OUTPUT_UNIT')));
   const changed=d.resources.map(row=>row===skin?{...row,resource_graph:{...row.resource_graph,
    operationCompositionV1:{...(row.resource_graph.operationCompositionV1 as Json),additionalOperations:[]}}}:row);
   assert(validate(changed).some(error=>error.includes('OPERATION_BINDING')));
  }
 });
 await check('finite skin schedule covers phase restarts and every four hours with actual common core',async()=>{
  // Independent technology expectations: full eight operations include two
  // separate paint applications -> nine periods; primer has three phases.
  const cases=[['improved-wall-01','0.0001',3],['improved-wall-01','20.1',3],['improved-wall-01','4000',6],
   ['deep-primer-00603','0.0001',3],['deep-primer-00603','20.1',3],['deep-primer-00603','25000',6]] as const;
  for(const [branch,area,expected]of cases){const result=await compile(branch,area);assert.equal(Number(q(result,'skin-protection-foam')),expected,branch+':'+area);}
  // These phase durations are independent adversarial schedules, not the
  // generated quantity table. Ceiling subadditivity proves the bound.
  for(const phases of [[.001,.001,.001],[4,4,4],[4.001,.001,.001],[.01,.02,.03,.04,.05,.06,.07,.08,.09],
   [12.5,3.99,.01,4.01,1.5,7.99,.1,.1,.1]]){
   const actual=phases.reduce((sum,h)=>sum+Math.ceil(h/4),0),budget=Math.ceil(phases.reduce((sum,h)=>sum+h,0)/4)+phases.length-1;
   assert(actual<=budget);
  }
  for(const branch of ['improved-wall-01','deep-primer-00603'] as const)assert.equal((await compile(branch,'0')).rows.length,0);
 });
 await check('skin provisioning is shortage guarded and one whole cost owner without duplicate procurement',async()=>{
  for(const branch of ['improved-wall-01','deep-primer-00603'] as const){const d=definition(branch),normal=await compile(branch),old=await compile(branch,'20.1',{}, {},true);
   for(const row of old.rows)assert.equal(q(normal,row.row_id.slice((base.namespace+'work:').length)),row.quantity,row.row_id);
   assert.deepEqual(normal.rows.filter(row=>row.procurement_eligible).map(row=>row.row_id),old.rows.filter(row=>row.procurement_eligible).map(row=>row.row_id));
   const resource=d.resources.find(row=>row.row_id===r('skin-protection-foam'))!;
   assert.equal(resource.cost_owner_id,r('whole-work'));assert.equal(resource.category,'material');assert.equal(resource.unit_id,'item');
   assert.equal(resource.procurement_eligible,false);assert.equal(resource.resource_graph.costTreatment,'INCLUDED_IN_RESOURCE_ROWS');
   assert.equal((resource.resource_graph.operationCompositionV1 as Json).processRole,undefined);
   const result=await compile(branch,'20.1',{[resource.row_id]:{quantity:'0',provenance}}),skin=result.rows.find(row=>row.row_id===resource.row_id)!;
   assert(canonicalPurchaseShortagesV1([skin]).some(value=>value.rowId===resource.row_id));
   assert.throws(()=>assertCanonicalPurchaseReadinessV1([skin]));
   await assert.rejects(compile(branch,'20.1',{[resource.row_id]:{quantity:'0.5',provenance}}));
   const charged=await compile(branch,'20.1',{[resource.row_id]:{unitPrice:'999',includedInEstimate:true,provenance}});
   assert.equal(charged.rows.find(row=>row.row_id===resource.row_id)!.included_in_estimate,false);
  }
 });
 await check('all five real unknown needs remain visible and cannot be supplied by customer norm coefficients',async()=>{
  for(const branch of ['improved-wall-01','deep-primer-00603'] as const){const result=await compile(branch),d=definition(branch);
   assert.deepEqual(result.preliminaryNeeds.filter(need=>need.need_state==='QUANTITY_REQUIRED').map(need=>need.row_id).sort(),
    ['open-washing-water','open-ppe','open-handling-profile','open-hand-cleanser','open-hand-drying-towels'].map(r).sort());
   for(const key of ['washing-water','ppe','handling-profile','hand-cleanser','hand-drying-towels']){assert.equal(q(result,'open-'+key),null);
    await assert.rejects(compile(branch,'20.1',{}, {[p('need_'+key.replaceAll('-','_'))]:'1'}));}
   assert.equal(result.preliminaryNeeds.find(need=>need.row_id===r('open-access'))!.need_state,'CONDITION_REQUIRED');
   const req=(d.resources.find(row=>row.row_id===r('open-ppe'))!.source_metadata as Json).provisionRequirementsR6;
   assert(!req.unresolvedComponentIds.includes('skin-protection-paste-demand'));
   assert(req.unresolvedComponentIds.includes('glove-chemical-compatibility'));
   assert.equal(req.fullDrySandingIncluded,branch==='improved-wall-01');
   if(branch==='deep-primer-00603')assert.deepEqual(req.activeMaterialSourceIds,['vgt-current-deep-primer0301-r3']);
   assert.equal(oracle(branch).fullTechnicalAcceptance,false);
  }
 });
 await check('pre-application handwash cleanser and drying stay named unknown materials in the real UI and PDF projections',async()=>{
  const expected=[['open-washing-water','Вода для промывки инструмента и мытья рук','l'],
   ['open-hand-cleanser','Мягкое средство для очищения рук перед нанесением защиты кожи','l'],
   ['open-hand-drying-towels','Одноразовые салфетки для сушки рук перед нанесением защиты кожи','pcs']] as const;
  for(const branch of ['improved-wall-01','deep-primer-00603'] as const){const result=await compile(branch),d=definition(branch);
   const catalogId=r4Pack.branches.find(value=>value.id===branch)!.catalogId;
   const stored={id:'11111111-1111-4111-8111-111111111111',release_id:'22222222-2222-4222-8222-222222222222',catalog_id:catalogId,
    definition_version_id:'33333333-3333-4333-8333-333333333333',checksum_sha256:'a'.repeat(64),row_count:result.rows.length,
    input_parameters:result.parameters,totals:result.totals,currency_code:'KGS',amendment_contract:{parameterSources:{preliminaryNeeds:result.preliminaryNeeds}}};
   const transport=projectCanonicalEstimatePreliminaryNeedTransport(stored);
   const catalog:CanonicalEstimateCatalogItem={catalogId,releaseId:stored.release_id,namespace:'global',workKey:branch,titleRu:'Отделка стен',
    domain:'finishing',definitionVersion:1,applicability:{},professionalMetadata:{},parameterSchema:[]};
   const revision:CanonicalEstimateRevisionView={apiVersion:ESTIMATE_PLATFORM_API_VERSION,revisionId:stored.id,parentRevisionId:null,
    releaseId:stored.release_id,catalogId,revisionNumber:1,status:'ready',currencyCode:'KGS',parameters:result.parameters,totals:result.totals,
    rowCount:result.rows.length,checksumSha256:stored.checksum_sha256,compilerVersion:pack.contract,createdAt:'2026-10-21T00:00:00Z',
    amendmentContract:{rowOverrides:{},customRows:[],releaseMigration:null,...transport.amendmentContract},preliminaryNeeds:transport.preliminaryNeeds};
   const payload=adaptCanonicalRevisionToStructuredEstimate({catalog,revision,rows:result.rows.map(row=>canonicalEstimateRevisionRowFromStorage(row,null))});
   const draft=buildStructuredEstimateRequestDraft(payload);
   const items=draft.items.map((item,index)=>({...item,id:'vgt-hygiene-'+index,requestDraftId:'vgt-hygiene'})) as ConsumerRepairRequestItem[];
   const bundle=appendCanonicalBackendRevisionProjection({previousBundle:null,
    nextBundle:{draft:{id:'vgt-hygiene'},items,structuredEstimatePayload:draft.structuredEstimatePayload} as ConsumerRepairDraftBundle,payload});
   const visible=buildRequestEstimateViewModel(bundle)!.sections.flatMap(section=>section.items);
   const pdf=buildCanonicalProfessionalPdfProjection({revision:stored,rows:result.rows,preliminaryNeeds:canonicalArtifactPreliminaryNeeds(stored),workTitleRu:'Отделка стен'});
   for(const [key,title,unit]of expected){const row=d.resources.find(row=>row.row_id===r(key))!,need=result.preliminaryNeeds.find(need=>need.row_id===r(key))!;
    assert.equal(row.category,'material');assert.equal(row.unit_id,unit);assert.equal(need.quantity,null);assert.equal(need.need_state,'QUANTITY_REQUIRED');
    assert.equal(canonicalPublicResourceRowKindV1({rowId:row.row_id,titleRu:row.title_ru,category:row.category,graph:row.resource_graph,
     descriptor:row.resource_graph.publicResourcePresentationV1,costTreatment:row.resource_graph.costTreatment}),'RESOURCE');
    const actual=visible.find(item=>item.sourceParameters?.rowCode===row.row_id);assert(actual,key+' visible in request view');assert.equal(actual.quantity,null);
    assert(pdf.html.includes('<strong>'+title+'</strong>'),title+' in PDF');
    assert(pdf.html.includes('Не рассчитано'));assert(!pdf.html.includes('need_hand_cleanser'));assert(!pdf.html.includes('need_hand_drying_towels'));
    assert.deepEqual(canonicalEstimateOperationReferences(row.resource_graph.operationCompositionV1).map(ref=>ref.operationId),
     canonicalEstimateOperationReferences(d.resources.find(resource=>resource.row_id===r('skin-protection-foam'))!.resource_graph.operationCompositionV1).map(ref=>ref.operationId));
   }
  }
 });
 await check('high quality source05 remains guarded with no customer material norm bypass',async()=>{
  const result=await compile('high-quality-wall-05');assert.equal(q(result,'ready-putty-order'),null);
  assert(result.preliminaryNeeds.some(need=>need.row_id===r('ready-putty-order')));
  await assert.rejects(compile('high-quality-wall-05','20.1',{}, {[p('high_quality_vgt_putty_kg_m2')]:'1.4'}));
  assert.equal(oracle('high-quality-wall-05').normativeResourceQuantitiesComplete,false);
 });
 return {status:'PASS_PARTIAL_WHOLE_KIT_WITH_NEW_QUANTIFIED_SKIN_COMPONENT',checks:done.length,completed:done,
  consumers:pack.activeConsumers,physicalNeedsClosed:[],newQuantitativeComponents:pack.newQuantitativeComponents,
  remainingNeeds:['washing-water','ppe','handling-profile','hand-cleanser','hand-drying-towels'],fullTechnicalAcceptance:false};
}
if(typeof it==='function')it('R6 VGT whole-stage resource oracle and finite skin provision retain honest full-kit gaps',async()=>{
 await runInteriorWallFinishingProvisionChecksR6();
});
