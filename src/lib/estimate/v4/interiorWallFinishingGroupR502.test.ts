import {strict as assert} from 'node:assert';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {interiorWallFinishingGroupPackR502 as pack,interiorWallFinishingGroupDefinitionR502 as ordinaryDefinition,
 interiorWallCementParameterR502 as cp,interiorWallCementRowR502 as cr} from './interiorWallFinishingGroupR502';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from '../backendPlatform/canonicalEstimateCompileCore';
import {canonicalEstimateOperationReferences} from '../backendPlatform/canonicalEstimateOperationComposition';
import {planCanonicalEffectiveResourceQuantitiesV1} from '../backendPlatform/canonicalEffectiveResourceQuantityV1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
import {isCanonicalEstimateConsumerSuppliedParameter,isCanonicalEstimateVisibleReplaceableProfile,
 isCanonicalEstimateVisibleUserResourceSelectionParameter} from '../backendPlatform/canonicalEstimateParameterSemantics';
import {resolveCanonicalParameterVisibility} from '../canonicalParameters/canonicalParameterCore';
import type {CanonicalEstimateCatalogItem} from '../backendPlatform/contracts';
type Json=Record<string,any>;
export async function runInteriorWallCementFinishingGroupChecksR502(evidenceRoot=process.cwd()){
 const c=pack,materials=c.materials,subject=ordinaryDefinition(),completed:string[]=[];
 const facts=(area=20.1,puttyMm=2):Json=>({[cp(c.areaId)]:area,[cp(c.baseId)]:c.baseReadyRu,[cp(c.siteId)]:c.siteReadyRu,[cp(c.puttyThicknessId)]:puttyMm});
 const compile=(parameters:Json,overrides:CanonicalEstimateCompileCoreInput['rowOverrides']={})=>compileCanonicalEstimateCore({operation:'recalculate',
  catalogId:c.selectedExistingCatalogId,compilerVersion:c.contract,primaryMeasureParameterId:cp(c.areaId),parameterDefinitions:[...subject.parameters],
  formulaDefinitions:[...subject.formulas],resourceDefinitions:[...subject.resources],submittedParameters:parameters,confirmedParameters:{},rowOverrides:overrides,
  priceItems:[],currencyCode:'KGS',maximumResourceRows:subject.resources.length,hashJson:async value=>estimateDeterministicHash(value)});
 type Result=Awaited<ReturnType<typeof compile>>;
 const row=(r:Result,key:string)=>r.rows.find(x=>x.row_id===cr(key));
 const scope=(r:Result,key:string):Json|undefined=>(r.preliminaryNeeds.find(n=>n.row_id===cr(key))?.calculation_trace as Json|undefined)?.resourceGraph?.scopeRequirementDecisionV1;
 const check=async(title:string,fn:()=>unknown|Promise<unknown>)=>{await fn();completed.push(title);};
 const provenance={kind:'manual',reason:'TEST_ONLY exact declared whole work/product supply, no real offer'};
 await check('six byte-pinned primary sources; manufacturer rates and KG labour/technical requirements are separate',()=>{
  for(const s of c.sources)assert.equal(createHash('sha256').update(readFileSync(resolve(evidenceRoot,s.path))).digest('hex'),s.sha256);
  assert.equal(c.materials.find(m=>m.id==='ct225')!.ratePerM2PerMm,1.8);assert.equal(c.materials.find(m=>m.id==='ct42')!.coatCount,2);
  assert.equal(c.materials.find(m=>m.id==='ct42')!.package,15);assert.equal(c.sources[2].compatibilityReferenceOnly,true);
  assert.equal(c.labour.workersManH,43.56);assert.equal(c.labour.normId,'15-04-007-01');
  assert(c.selectedScopeQuantitiesComplete);assert(!subject.resources.some(r=>r.row_id===cr('plaster-workers')));
 });
 await check('ordinary definition has exactly four admitted physical facts, null area/layer and no norm/profile questionnaire',()=>{
  assert.equal(subject.ordinaryParameterIds.length,4);assert.equal(subject.parameters.filter(p=>p.truth_metadata.visibility_role==='USER_INPUT').length,4);
  assert.equal(subject.parameters.find(p=>p.parameter_id===cp(c.areaId))?.default_value,null);
  assert(!subject.parameters.some(p=>p.parameter_id.endsWith('_levelling_thickness_mm')));
  assert.equal(subject.parameters.find(p=>p.parameter_id===cp(c.puttyThicknessId))?.default_value,null);
  assert.deepEqual(subject.runtimeInput,{});
  const schema=subject.parameters.map(p=>{const t=p.truth_metadata as Json,g=t.guide??{};return {parameterId:p.parameter_id,titleRu:p.title_ru,valueType:p.value_type,
   required:p.required,unitId:p.unit_id,defaultValue:p.default_value,constraints:p.constraints_json,semanticParameterKey:t.semantic_parameter_key,
   visibilityRole:t.visibility_role,valueSourceRole:t.value_source_role,provenance:t.provenance,formulaConsumers:t.formula_consumers,
   resourceBranchConsumers:t.resource_branch_consumers,visibleWhen:t.visible_when,requiredWhen:t.required_when,guide:{guideKind:g.guide_kind,
    guideValidationPolicy:g.guide_validation_policy,sourceRole:g.source_role,sourceDocument:g.source_document,sourceLocator:g.source_locator,
    sourceSnapshotHash:g.source_snapshot_hash,guideVersion:g.guide_version}} as CanonicalEstimateCatalogItem['parameterSchema'][number];});
  const admitted=schema.filter(p=>isCanonicalEstimateConsumerSuppliedParameter(p)||isCanonicalEstimateVisibleReplaceableProfile(p)||isCanonicalEstimateVisibleUserResourceSelectionParameter(p));
  const visible=admitted.filter(p=>resolveCanonicalParameterVisibility({kind:'INCLUSION_GRAPH',ast:(p.visibleWhen??{kind:'literal',value:true}) as Json},new Map())===true);
  assert.deepEqual(visible.map(p=>p.parameterId).sort(),[...subject.ordinaryParameterIds].sort());
  assert.equal(visible.filter(p=>p.unitId==='m2').length,1);assert(!visible.some(p=>/norm|rate|stock|water|source|profile|coat/.test(p.parameterId)));
  for(const param of subject.parameters)assert.deepEqual(param.truth_metadata.formula_consumers,
   subject.formulas.filter(f=>f.input_parameter_ids.includes(param.parameter_id)).map(f=>f.formula_id));
 });
 for(const expected of c.independentExpected)await check('independent actual layers, KG quantities and aggregate package rounding at '+expected.area+' m2',async()=>{
  const result=await compile(facts(expected.area,expected.puttyMm));
  for(const material of materials)for(const [index,suffix]of ['consumed','order','packages','remaining'].entries())assert.equal(Number(row(result,material.id+'-'+suffix)?.quantity),(expected as Json)[material.id][index]);
  assert.equal(Number(row(result,'paint-putty-primer-workers')?.quantity),expected.paintWorkersManH);
  for(const [key,quantity]of Object.entries(expected.normIncluded))assert.equal(Number(row(result,key)?.quantity),quantity);
  assert.equal(row(result,'plaster-workers-required'),undefined);
  const quantityNeeds=result.preliminaryNeeds.filter(n=>n.need_state==='QUANTITY_REQUIRED');
  assert.deepEqual(quantityNeeds,[]);
  assert.equal(result.rows.filter(r=>r.procurement_eligible).length,3);
  assert.equal(row(result,'whole-work')?.quantity,String(expected.area));
  for(const included of c.included)assert.equal(scope(result,'included-'+included.id)?.status,'INCLUDED');
  assert.equal(scope(result,'check-base')?.status,'COMPLETED');assert.equal(scope(result,'check-site')?.status,'COMPLETED');
 });
 await check('one mandatory primer application belongs to painting and one five-kilogram supply owner',async()=>{
  const result=await compile(facts());assert.equal(row(result,'primer-contribution-before-levelling'),undefined);
  assert.equal(row(result,'primer-contribution-before-paint')?.quantity,'2.01');assert.equal(row(result,'primer-consumed')?.quantity,'2.01');
  assert.equal(row(result,'primer-order')?.quantity,'5');assert.equal(row(result,'primer-packages')?.quantity,'1');
  assert.equal(result.rows.filter(r=>r.procurement_eligible&&r.row_id.includes('primer')).length,1);
 });
 await check('four cost owners only; manual prices on whole-norm components and process rows never double-pay',async()=>{
  const overrides=Object.fromEntries(subject.resources.filter(r=>r.unit_id!=='').map(r=>[r.row_id,{unitPrice:r.row_id===cr('whole-work')?'2':r.row_id.endsWith('-order')?'1':'777',includedInEstimate:true,provenance}]));
  const result=await compile(facts(),overrides);assert.equal(result.totals.amount,'135.2');assert.equal(result.rows.filter(r=>r.included_in_estimate).length,4);
  assert(!result.rows.find(r=>r.row_id===cr('paint-putty-primer-workers'))?.included_in_estimate);
  assert(!result.rows.find(r=>r.row_id===cr('process-before-paint'))?.included_in_estimate);
 });
 await check('included water/tools/protection have no invented unit/order and lose coverage when the whole-work owner is excluded',async()=>{
  const normal=await compile(facts()),excluded=await compile(facts(),{[cr('whole-work')]:{includedInEstimate:false,provenance}});
  for(const included of c.included){const spec=subject.resources.find(r=>r.row_id===cr('included-'+included.id))!;
   assert.equal(spec.unit_id,'');assert.equal(spec.procurement_eligible,false);assert.equal(scope(normal,'included-'+included.id)?.status,'INCLUDED');
   assert.deepEqual(scope(normal,'included-'+included.id)?.coveringRowIds,[cr('whole-work')]);assert.equal(scope(excluded,'included-'+included.id)?.status,'REQUIRED_RESOURCE_EXCLUDED');}
 });
 await check('manual order/price survives one common effective quantity balance, without changing consumption or labour',async()=>{
  const result=await compile(facts(),{[cr('ct225-order')]:{quantity:'100',unitPrice:'2',provenance}});
  assert.equal(row(result,'ct225-order')?.quantity,'100');assert.equal(row(result,'ct225-order')?.amount,'200');assert.equal(row(result,'ct225-consumed')?.quantity,'72.36');
  assert.equal(row(result,'ct225-packages')?.quantity,'4');assert.equal(row(result,'ct225-remaining')?.quantity,'27.64');
  assert.equal(row(result,'paint-putty-primer-workers')?.quantity,'8.75556');
 });
 await check('unknown price permits all quantities, zero area orders nothing and unsupported bases keep explicit blocking needs',async()=>{
  const unpriced=await compile(facts());assert.equal(unpriced.totals.pricedRowCount,0);assert.equal(unpriced.rows.filter(r=>r.procurement_eligible).length,3);
  const zero=await compile(facts(0));assert.equal(zero.rows.length,0);assert.equal(zero.preliminaryNeeds.length,0);
  const other=await compile({...facts(),[cp(c.baseId)]:c.baseOtherRu});assert.equal(other.rows.filter(r=>r.procurement_eligible).length,0);
  assert.equal(scope(other,'check-base')?.status,'SCOPE_UNVERIFIED');
  const missing=facts();delete missing[cp(c.baseId)];const pending=await compile(missing);assert.equal(scope(pending,'check-base')?.status,'OBJECT_FACT_REQUIRED');
  await assert.rejects(compile({...facts(),[cp(c.puttyThicknessId)]:4}),/./);await assert.rejects(compile({...facts(),[cp(c.puttyThicknessId)]:0}),/./);
  const thinner=await compile(facts(20.1,1));assert.equal(row(thinner,'ct225-consumed')?.quantity,'36.18');
  await assert.rejects(compile({...facts(),unknown_primer_norm:.15}),/./);
 });
 await check('every formula/row/parameter/scope/owner link exists in the single compiled graph',()=>{
  const parameters=new Set(subject.parameters.map(p=>p.parameter_id)),rows=new Set(subject.resources.map(r=>r.row_id)),formulas=new Set(subject.formulas.map(f=>f.formula_id));
  const rowKeys=new Set(['sourceRowId','parentCostOwnerId','includedInResourceOwnerRowId','purchaseBalanceOwnerRowId','coveringRowIds','originalRowIds']);
  const paramKeys=new Set(['parameterId','quantityParameterId','objectFactParameterId','inputParameterIds','parameterIds','scopeContextParameterIds']);
  const walk=(value:unknown,key='')=>{if(typeof value==='string'){if(rowKeys.has(key))assert(rows.has(value),key+':'+value);if(paramKeys.has(key))assert(parameters.has(value),key+':'+value);}
   else if(Array.isArray(value))value.forEach(v=>walk(v,key));else if(value&&typeof value==='object')Object.entries(value).forEach(([k,v])=>walk(v,k));};
  for(const f of subject.formulas)assert(f.input_parameter_ids.every(id=>parameters.has(id)));
  for(const r of subject.resources){assert(formulas.has(r.formula_id));assert(!r.cost_owner_id||rows.has(r.cost_owner_id));walk(r.resource_graph);walk(r.inclusion_ast);
   assert(canonicalEstimateOperationReferences(r.resource_graph?.operationCompositionV1).length>0);const{row_sha256,...body}=r;assert.equal(row_sha256,estimateDeterministicHash(body));}
  for(const p of subject.parameters){walk(p.constraints_json);walk(p.truth_metadata);}assert.equal(planCanonicalEffectiveResourceQuantitiesV1(subject.parameters,subject.resources,subject.formulas).outputs.size,3);
 });
 return{status:'PASS_R502_SELECTED_CEMENT_FINISH_SCOPE',checkCount:completed.length,completed,ordinaryObjectFacts:4,resourceCount:subject.resources.length,
  sampleFacts:facts(),selectedScopeQuantitiesComplete:true,fullGroupComplete:false,
  engineeringAcceptance:false,published:false,databaseWrites:false};
}
if(typeof it==='function')it('ordinary wall group: cement layers, primer aggregation and one labour owner through the canonical core',async()=>{
 await runInteriorWallCementFinishingGroupChecksR502();
});
