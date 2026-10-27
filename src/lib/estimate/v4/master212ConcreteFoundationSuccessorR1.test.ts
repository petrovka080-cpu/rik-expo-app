/** Canonical Jest registration of the isolated source oracle; assertions preserved. */
import assert from'node:assert/strict';
import {buildMaster212ConcreteFoundationSuccessorR1 as build,master212ConcreteCapturedRepresentativeR1 as captured,master212ConcreteCompletenessMapR1 as completeness,master212ConcreteSelectionMetadataR1 as selection,compileMaster212ConcreteSuccessorR1 as compile,MASTER212_CONCRETE_SUCCESSOR_PACK_R1 as pack,MASTER212_CONCRETE_STRUCTURAL_PRIMARY_R1 as V}from'./master212ConcreteFoundationSuccessorR1';
import {CONCRETE_PREPARATION_M212_R1_SOURCE as prep}from'./concretePreparationKrer0600101M212R1';
import {compileCanonicalEstimateCore as core}from'../backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash as hash}from'../estimateDeterministicHash';
import {validateIndependentCompletenessMapReferences as validateMap}from'../../../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
import {resolvePrimaryMeasureSelectionV1 as resolvePrimary}from'../backendPlatform/canonicalPrimaryMeasureSelectionV1';
const input=(a:unknown=10,b:unknown=2):Record<string,unknown>=>({[pack.selectorId]:pack.newChoiceRu,[V]:a,[prep.measure.parameterId]:b,[prep.method.id]:prep.method.value,[prep.fit.id]:prep.fit.value});
const expected2=[['workers','3.2606'],['machinists','0.2076'],['tower-crane','0.2076'],['deep-vibrator','0.1606'],['flatbed-truck','0.007'],['water','0.035'],['matting','5'],['concrete','2.04']];
for(const target of pack.targets){
 test(target.kind+': exact captured parent, legacy defaults/formulas/IDs/bindings retained',()=>{
  const p=captured(target.catalogId),r=build(p);assert.deepEqual(r.formulas.slice(0,p.formulas.length),p.formulas);assert.deepEqual(r.bindings,p.bindings);
  for(const old of p.parameters)assert.equal(r.parameters.find(p=>p.parameter_id===old.parameter_id)?.default_value,old.default_value);
  for(const old of p.resources){const next=r.resources.find(r=>r.row_id===old.row_id)!;assert.equal(next.id,old.id);assert.deepEqual(next.source_metadata,old.source_metadata);assert.equal(next.formula_id,old.formula_id);assert.equal(next.cost_owner_id,old.cost_owner_id);}
  assert.equal(r.passport.physical_result_ru,p.passport.physical_result_ru);assert.equal(r.passport.decision.completeTechnicalEstimateAccepted,false);assert.equal(r.definition.applicability.primaryMeasureParameterId,V);
  assert.ok(r.parameters.filter(next=>!p.parameters.some(q=>q.parameter_id===next.parameter_id)).every(p=>p.default_value===null));
 });
 test(target.kind+': every original operation is retained as reused stage or physical needs',()=>{
  const old=captured(target.catalogId),m=build(old),map=completeness(target.catalogId),mapping=map.retainedOperationMapping;
  const oldOps=[...new Set(old.resources.map(r=>String(r.resource_graph.operationCompositionV1?.operationId)))];
  const newOps=new Set(m.resources.filter(r=>!old.resources.some(q=>q.row_id===r.row_id)).flatMap(r=>[r.resource_graph.operationCompositionV1?.operationId,...(r.resource_graph.operationCompositionV1?.additionalOperations??[]).map((x:any)=>x.operationId)]));
  for(const oldId of oldOps){const oldKey=oldId.split(':').at(-1)!,mapped=mapping[oldKey];assert(mapped,'unmapped original operation '+oldId);
   if(mapped.startsWith('retained:'))assert(newOps.has('master212:'+target.kind+':retained-operation:'+mapped.slice(9)));
   else assert(newOps.has('master212:concrete-cycle:r1:operation:'+mapped)||mapped==='preparation','missing new physical operation '+mapped+' for '+oldId);}
  assert.equal(map.retainedOperationCategoryMatrix.length,target.kind==='strip_foundation'?12:120);
 });
 test(target.kind+': whole-source independent completeness references and category mutations',()=>{
  const m=build(captured(target.catalogId)),map=completeness(target.catalogId);assert.deepEqual(validateMap({completenessMap:map,formulaDefinitions:m.formulas,resourceDefinitions:m.resources}),[]);
  const changed=structuredClone(m.resources);changed.find(r=>r.row_id===prep.prefix+':water')!.unit_id='l';assert.ok(validateMap({completenessMap:map,formulaDefinitions:m.formulas,resourceDefinitions:changed}).some(e=>e.includes('RESOURCE_UNIT')));
  assert.ok(validateMap({completenessMap:map,formulaDefinitions:m.formulas,resourceDefinitions:m.resources.filter(r=>r.row_id!==prep.prefix+':matting')}).some(e=>e.includes('ROW_REFERENCE')));
  assert.equal(map.operationCategoryMatrix.length,156);assert.equal(new Set(map.operationCategoryMatrix.map(c=>c.category)).size,12);
 });
 test(target.kind+': independent concrete volumes and literal8-resource oracle',async()=>{
  const m=build(captured(target.catalogId)),a=await compile(m,input(10,2)),b=await compile(m,input(20,2)),c=await compile(m,input(10,4));
  for(const[key,q]of expected2){assert.equal(a.rows.find(r=>r.row_id===prep.prefix+':'+key)?.quantity,q);assert.equal(b.rows.find(r=>r.row_id===prep.prefix+':'+key)?.quantity,q);}
  assert.equal(c.rows.find(r=>r.row_id===prep.prefix+':concrete')?.quantity,'4.08');
  assert.equal(a.rows.find(r=>r.row_id===prep.prefix+':machinists')?.included_in_estimate,false);
  assert(a.preliminaryNeeds.some(n=>n.row_id==='master212:concrete-cycle:r1:need:reinforcement-design'));assert(!a.preliminaryNeeds.some(n=>n.row_id==='master212:concrete-cycle:r1:need:blinding'));
  assert(!a.rows.some(r=>captured(target.catalogId).resources.some(q=>q.row_id===r.row_id)));assert(a.preliminaryNeeds.length>50);
 });
 test(target.kind+': zero andstringzero use full persisted declarations without removing rows',async()=>{
  const m=build(captured(target.catalogId)),declared=m.resources.length;assert(declared>200);
  for(const q of[0,'0.0']){const r=await compile(m,input(q,2));assert.equal(r.rows.length,0);assert.equal(r.preliminaryNeeds.length,0);assert.equal(m.resources.length,declared);}
 });
 test(target.kind+': missing preparation fact preserves preparation and full-foundation needs',async()=>{
  const m=build(captured(target.catalogId)),i=input();delete i[prep.fit.id];const r=await compile(m,i);assert(!r.rows.some(r=>r.row_id===prep.prefix+':concrete'));assert(r.preliminaryNeeds.some(n=>n.row_id==='master212:concrete-cycle:r1:need:blinding'));assert(r.preliminaryNeeds.some(n=>n.row_id==='master212:concrete-cycle:r1:need:reinforcement-design'));
 });
 test(target.kind+': primary selection is catalog metadata, saved legacy requires newroot and no carryforward',()=>{
  const m=build(captured(target.catalogId));const schema=m.parameters.map(p=>({parameterId:p.parameter_id,valueType:p.value_type,unitId:p.unit_id,visibilityRole:p.truth_metadata.visibility_role,valueSourceRole:p.truth_metadata.value_source_role,provenance:p.truth_metadata.provenance,constraints:p.constraints_json,formulaConsumers:p.truth_metadata.formula_consumers}));
  const r=resolvePrimary({selectionMetadata:selection(target.catalogId),parameterSchema:schema,submittedParameters:input(),parentPrimaryMeasure:{parameterId:target.legacyPrimary,unitId:target.legacyUnit}});
  assert.equal(r.kind,'NEW_ROOT_REQUIRED');if(r.kind==='NEW_ROOT_REQUIRED'){assert.deepEqual(r.carryForward,{parameters:false,rowOverrides:false,prices:false});assert.equal(r.primaryMeasure.parameterId,V);}
 });
 test(target.kind+': no legacy area/budget/default input feeds new branch',async()=>{
  const m=build(captured(target.catalogId)),r=await compile(m,{...captured(target.catalogId).baseline.input_values,[pack.selectorId]:pack.newChoiceRu,[V]:10});assert(!r.rows.some(r=>r.row_id===prep.prefix+':concrete'));assert(!r.rows.some(r=>r.row_id.includes('steel-approved-schedule')));assert(r.preliminaryNeeds.length>50);
 });
 test(target.kind+': exact parent drift and arbitrary need scalar rejected',async()=>{
  const p=captured(target.catalogId);p.resources[0]!.unit_id='wrong';assert.throws(()=>build(p),/EXACT_CURRENT_PARENT/);
  const m=build(captured(target.catalogId));await assert.rejects(compile(m,{...input(),m212_concrete_application_need_reinforcement_design:77}),/unresolved application norm cannot be supplied/);
 });
 test(target.kind+': explicitlegacy branch numerical result matches original declarations',async()=>{
  const old=captured(target.catalogId),parameters={...old.baseline.input_values,[pack.selectorId]:pack.legacyChoiceRu};
  const before=await core({operation:'compile',catalogId:target.catalogId,compilerVersion:'legacy-control',primaryMeasureParameterId:target.legacyPrimary,parameterDefinitions:old.parameters as any,formulaDefinitions:old.formulas as any,resourceDefinitions:old.resources as any,submittedParameters:old.baseline.input_values,confirmedParameters:{},priceItems:[],currencyCode:'KGS',maximumResourceRows:512,hashJson:async x=>hash(x)});
  const after=await compile(build(old),parameters);const stable=(r:typeof before)=>r.rows.map(r=>[r.row_id,r.quantity,r.unit_id,r.unit_price,r.included_in_estimate,r.included_in_procurement]);assert.deepEqual(stable(after),stable(before));assert.deepEqual(after.preliminaryNeeds.map(n=>n.row_id),before.preliminaryNeeds.map(n=>n.row_id));
 });
}
