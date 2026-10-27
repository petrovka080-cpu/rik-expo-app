import {strict as assert} from 'node:assert';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {interiorWallFinishingCrewGroupDefinitionR4 as definition,interiorWallFinishingCrewCompletenessMapR4 as map,
 interiorWallFinishingCrewPackR4 as profile,type InteriorWallFinishingBranchR4} from './interiorWallFinishingCrewGroupR4';
import {interiorWallFinishingGeometryRowR3 as r,interiorWallFinishingGeometryParameterR3 as p,
 interiorWallFinishingGeometryPackR3 as base} from './interiorWallFinishingGeometryGroupR3';
import {compileCanonicalEstimateCore} from '../backendPlatform/canonicalEstimateCompileCore';
import {canonicalEstimateOperationReferences} from '../backendPlatform/canonicalEstimateOperationComposition';
import {canonicalPublicResourceRowKindV1,parseCanonicalPublicResourcePresentationV1} from '../backendPlatform/canonicalPublicResourcePresentationV1';
import {assertCanonicalPurchaseReadinessV1,canonicalPurchaseShortagesV1} from '../backendPlatform/canonicalPurchaseBalanceV1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
import {validateIndependentCompletenessMapReferences,buildMasterCapabilityMatrix,buildMasterScopeReadiness} from '../../../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
import {canonicalPublisherQuantityScopeIsConsistent,assertCanonicalPublisherResourceOrdinalsUniqueR1} from '../../../../scripts/estimate/r4a13/canonicalDefinitionPublisherR1';

type Json=Record<string,any>;
export async function runInteriorWallFinishingCrewChecksR4() {
 const done:string[]=[];const check=async(name:string,fn:()=>unknown|Promise<unknown>)=>{await fn();done.push(name);};
 const compile=(branch:InteriorWallFinishingBranchR4,area='20.1',overrides:Json={},facts:Json={})=>{
  const subject=definition(branch);return compileCanonicalEstimateCore({operation:'recalculate',catalogId:profile.branches.find(b=>b.id===branch)!.catalogId,
   compilerVersion:profile.contract,primaryMeasureParameterId:p(base.areaId),parameterDefinitions:[...subject.parameters],
   formulaDefinitions:[...subject.formulas],resourceDefinitions:[...subject.resources],submittedParameters:{[p(base.areaId)]:area,...facts},
   confirmedParameters:{},rowOverrides:overrides,priceItems:[],currencyCode:'KGS',maximumResourceRows:subject.resources.length,
   hashJson:async value=>estimateDeterministicHash(value)});
 };
 const key=(result:Awaited<ReturnType<typeof compile>>,name:string)=>result.rows.find(row=>row.row_id===r(name))!;
 const q=(result:Awaited<ReturnType<typeof compile>>,name:string)=>Number(key(result,name)?.quantity);
 const provenance={kind:'manual',reason:'TEST_ONLY adverse provision edit, never a source'};
 await check('all admitted primary bytes and complete selected manufacturer assembly are pinned',()=>{
  for(const source of profile.sources)assert.equal(createHash('sha256').update(readFileSync(resolve('C:/dev/rik-expo-app-r4a5-dc4f0ce7',source.path))).digest('hex'),source.sha256,source.id);
  assert.equal(profile.assets.length,16);
  assert.deepEqual(profile.assets.filter(asset=>asset.role==='ACCESS').map(asset=>asset.count),[4,1,1,5,2,2,4,1,2,2,1,1,1]);
  assert.equal(profile.access.manufacturerWorkHeightM,'3.60');assert.equal(profile.access.selectedMaximumRoomHeightM,'3.50');
  assert.equal(150*150*50/1e6,1.125);assert(1/1.77<1.125);assert(120<150);
  assert.equal(profile.manualMixing.wholeFactoryPackKg,'1');assert.equal(profile.manualMixing.densityKgPerL,'1.77');
 });
 await check('one whole kit serves source01 without a mixer, second owner or hidden water default',async()=>{
  const result=await compile('improved-wall-01');
  assert.equal(q(result,'workers'),8.75556);assert.equal(q(result,'workers-preputty'),1.31655);assert.equal(q(result,'workers-total'),10.07211);
  assert.equal(q(result,'ready-putty-order'),29);assert.equal(q(result,'paint-order'),7.5);
  assert.equal(result.rows.filter(row=>row.procurement_eligible).length,4);
  assert(!result.rows.some(row=>row.row_id===r('open-stirring-tool')));
  assert.deepEqual(result.preliminaryNeeds.filter(n=>n.need_state==='QUANTITY_REQUIRED').map(n=>n.row_id).sort(),
   ['open-washing-water','open-ppe','open-handling-profile'].map(r).sort());
  const access=result.preliminaryNeeds.find(n=>n.row_id===r('open-access'))!;assert.equal(access.need_state,'CONDITION_REQUIRED');
  assert.equal(key(result,'open-washing-water')?.quantity??null,null,'water remains a consumed resource with unknown source quantity');
  assert.equal(key(result,'open-access')?.quantity??null,null,'site conditions are never a service1');
 });
 await check('every explicit crew asset has its own operative shortage gate and exact operation coverage',async()=>{
  const subject=definition('improved-wall-01'),normal=await compile('improved-wall-01');
  for(const asset of profile.assets){
   const resource=subject.resources.find(row=>row.row_id===r(asset.key))!,actual=key(normal,asset.key);
   assert.equal(q(normal,asset.key),asset.count);assert.equal(actual.amount,null);assert.equal(actual.included_in_estimate,false);
   assert.equal(actual.included_in_procurement,false);assert.equal(resource.cost_owner_id,r('whole-work'));
   const descriptor=parseCanonicalPublicResourcePresentationV1(resource.resource_graph.publicResourcePresentationV1)!;assert(descriptor);
   assert.equal(canonicalPublicResourceRowKindV1({rowId:resource.row_id,titleRu:resource.title_ru,category:resource.category,graph:resource.resource_graph,
    descriptor,costTreatment:resource.resource_graph.costTreatment}),'RESOURCE');
   assert.deepEqual(canonicalEstimateOperationReferences(resource.resource_graph.operationCompositionV1).map(ref=>ref.operationId),asset.operationIds.map(id=>r('operation:'+id)));
   const zero=await compile('improved-wall-01','20.1',{[r(asset.key)]:{quantity:'0',provenance}}),missing=key(zero,asset.key);
   assert.equal((missing.calculation_trace as Json).purchaseBalance.consumptionShortage,String(asset.count));
   assert(canonicalPurchaseShortagesV1([missing]).some(s=>s.rowId===r(asset.key)));
   assert.throws(()=>assertCanonicalPurchaseReadinessV1([missing]),(error:any)=>error.code==='PROCUREMENT_MATERIAL_SHORTAGE');
   await assert.rejects(compile('improved-wall-01','20.1',{[r(asset.key)]:{quantity:'0.5',provenance}}),(error:any)=>error.code==='ROW_AMENDMENT_INVALID');
  }
 });
 await check('source05 complete norm is exact while unproved current putty passes stay guarded',async()=>{
  const result=await compile('high-quality-wall-05');
  for(const [name,value]of Object.entries({workers:13.74237,'workers-total':15.05892,operators:.00804,lift:.00603,truck:.04221,
   'abrasive-consumed':.17688,'rags-consumed':.09246,'paint-consumed':7.236}))assert.equal(q(result,name),value,name);
  assert.equal(key(result,'ready-putty-order')?.quantity??null,null);
  assert(result.preliminaryNeeds.some(n=>n.row_id===r('ready-putty-order')));
  const boundary=await compile('high-quality-wall-05','7.5');assert.equal(q(boundary,'abrasive-sheet-provision'),2);
  const old=await compile('improved-wall-01','7.5');assert.equal(q(old,'abrasive-sheet-provision'),1);
  assert.equal(profile.branches[1].normPuttyTonnes,'0.079');assert.equal(profile.branches[1].normPaintTonnes,'0.03');
 });
 await check('standalone00603 reuses its entire norm instead of splitting painting labor',async()=>{
  const subject=definition('deep-primer-00603'),result=await compile('deep-primer-00603');
  assert.equal(q(result,'workers-preputty'),1.31655);assert.equal(q(result,'workers-total'),1.31655);
  assert.equal(q(result,'operators'),.00201);assert.equal(q(result,'lift-preputty'),.00201);assert.equal(q(result,'truck'),.00201);
  assert.equal(q(result,'rags-consumed'),.0201);assert.equal(q(result,'preputty-primer-consumed'),2.412);assert.equal(q(result,'preputty-primer-order'),3);
  assert.deepEqual(result.rows.filter(row=>row.procurement_eligible).map(row=>row.row_id),[r('preputty-primer-order')]);
  assert(!subject.resources.some(row=>row.row_id===r('workers')||row.row_id===r('paint-order')||row.row_id===r('tool-manual-putty-pan')));
  for(const resource of subject.resources)for(const ref of canonicalEstimateOperationReferences(resource.resource_graph.operationCompositionV1))
   assert(['preparation','preputty-prime','ordinary-completion'].some(id=>ref.operationId===r('operation:'+id)));
  assert.deepEqual(subject.parameters.filter(parameter=>parameter.required).map(parameter=>parameter.parameter_id),[p(base.areaId)]);
 });
 await check('all included provision shares one price owner; source gaps cannot become customer coefficients',async()=>{
  const subject=definition('improved-wall-01');
  const overrides=Object.fromEntries(subject.resources.filter(row=>row.unit_id!=='').map(row=>[row.row_id,
   {unitPrice:row.row_id===r('whole-work')?'2':row.procurement_eligible?'1':'777',includedInEstimate:true,provenance}]));
  const priced=await compile('improved-wall-01','20.1',overrides);
  assert.equal(priced.totals.amount,'85.7');assert.equal(priced.rows.filter(row=>row.included_in_estimate).length,5);
  const expected=['paint-order','preputty-primer-order','primer-order','ready-putty-order'].map(r).sort();
  const orders=(rows:typeof subject.resources)=>assert.deepEqual(rows.filter(row=>row.procurement_eligible).map(row=>row.row_id).sort(),expected);
  orders(subject.resources);
  const first=subject.resources.find(row=>row.row_id===r('tool-manual-putty-pan'))!;
  assert.throws(()=>orders([...subject.resources,{...first,row_id:r('duplicate-paid-kit'),procurement_eligible:true}]));
  await assert.rejects(compile('improved-wall-01','20.1',{}, {[p('need_washing_water')]:1}));
  await assert.rejects(compile('high-quality-wall-05','20.1',{}, {[p('high_quality_vgt_putty_kg_m2')]:1.4}));
 });
 await check('independent composition fails on forgotten item, wrong operation and zero-area emits nothing',async()=>{
  for(const branch of ['improved-wall-01','high-quality-wall-05','deep-primer-00603'] as const){
   const subject=definition(branch),completenessMap=map(branch),validate=(resourceDefinitions:typeof subject.resources)=>
    validateIndependentCompletenessMapReferences({completenessMap,formulaDefinitions:subject.formulas,resourceDefinitions});
   assert.deepEqual(validate(subject.resources),[],branch);
   assert(validate(subject.resources.filter(row=>row.row_id!==r('access-spanners'))).some(error=>error.includes('ROW_REFERENCE')));
   const wrong=subject.resources.map(row=>row.row_id!==r('access-spanners')?row:{...row,resource_graph:{...row.resource_graph,
    operationCompositionV1:{...(row.resource_graph.operationCompositionV1 as Json),additionalOperations:[]}}});
   assert(validate(wrong).some(error=>error.includes('OPERATION_BINDING')));
   assert.equal((await compile(branch,'0')).rows.length,0);
  }
 });
 return {status:'PASS_SOURCE_SPECIFIC_BRANCHES_WITH_HONEST_REQUIRED_NEEDS',checks:done.length,completed:done,
  branches:profile.branches.map(branch=>branch.id),rows:definition().resources.length,fullTechnicalAcceptance:false};
}
if(typeof it==='function')it('R4 one serial finishing crew and three exact source-specific branches retain real source guards',async()=>{
 await runInteriorWallFinishingCrewChecksR4();
});
if(typeof it==='function')it('R4 independently separates three physical gaps from site conditions and guarded high quality material demand',()=>{
 for(const branch of ['improved-wall-01','deep-primer-00603'] as const){const oracle=map(branch);
  assert.deepEqual(oracle.remainingApplicationSourceNeeds.map(n=>n.id),['washing-water','ppe','handling-profile']);
  assert.deepEqual(oracle.remainingSourceConditions,['ordinary-access','ordinary-accompanying','open-access']);
  assert(!oracle.entries.some((entry:any)=>entry.expectedResourceId==='open-stirring-tool'));
 }
 assert.equal(map('high-quality-wall-05').normativeResourceQuantitiesComplete,false);
 assert.equal(map('high-quality-wall-05').additionalUnresolvedMaterialDemand?.resourceRowId,r('ready-putty-order'));
});
if(typeof it==='function')it('both live finishing branches pass the actual publisher quantity and resource-order gates before SQL',()=>{
 for(const branch of ['improved-wall-01','deep-primer-00603'] as const){const d=definition(branch),pending=['open-washing-water','open-ppe','open-handling-profile'].map(r);
  const plan={parameters:d.parameters,formulas:d.formulas,resources:d.resources,baseline:{input_values:{[p(base.areaId)]:'20.1'}},
   passport:{decision:buildMasterScopeReadiness(pending,d.resources),capability_matrix:buildMasterCapabilityMatrix(pending,d.resources)}};
  assert.equal(canonicalPublisherQuantityScopeIsConsistent(plan),true,branch);
  assert.doesNotThrow(()=>assertCanonicalPublisherResourceOrdinalsUniqueR1(d.resources));
  assert.equal(d.parameters.find(parameter=>parameter.parameter_id===p('need_access'))!.truth_metadata.value_source_role,'COMPILER_DERIVED_RESOURCE_QUANTITY');
 }
});
