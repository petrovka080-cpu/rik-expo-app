import assert from 'node:assert/strict';
import oracle from '../../../../data/estimate-benchmarks/fixtures/master212-roof-four-literal-oracle-r1.json';
import {MASTER212_ROOF_PACK_R1 as pack,buildMaster212RoofWholeSystemSuccessorR1 as build,master212RoofCapturedRepresentativeR1 as captured,master212RoofProfilesR1 as profiles,compileMaster212RoofWholeSystemR1 as compile,master212RoofAcceptedPartsR1 as parts,master212RoofCompletenessMapR1 as completeness} from './master212RoofWholeSystemsR1';
import {master212RoofControlR1 as control} from '../../../../scripts/estimate/r4a13/prepareMaster212RoofWholeSystemsR1';
import {resolvePrimaryMeasureSelectionV1 as resolvePrimary} from '../backendPlatform/canonicalPrimaryMeasureSelectionV1';
import {selectCanonicalArtifactRows as artifacts} from '../backendPlatform/canonicalEstimateArtifactContract';
const model=(catalogId:string)=>build(captured(catalogId));
const sorted=(a:unknown[])=>[...a].sort();
const semantic=(r:Awaited<ReturnType<typeof compile>>)=>({rows:r.rows.map(x=>[x.row_id,x.quantity,x.unit_id,x.unit_price,x.amount,x.included_in_estimate,x.included_in_procurement]),needs:r.preliminaryNeeds.map(x=>[x.row_id,x.quantity,x.need_state,sorted(x.missing_parameter_ids)]),totals:r.totals});
for(const profile of pack.technologyProfiles){
 const literal=oracle.profiles.find(p=>p.kind===profile.kind)!;
 for(const area of ['1.25','100','250'] as const)test(profile.kind+' complete independent source roster at area '+area,async()=>{
  const r=await compile(model(profile.catalogId),control(profile.catalogId,area,profile.kind));
  assert.equal(literal.rows.length,profile.kind==='flat_mastic'?9:profile.kind==='pitched_metal'?10:profile.kind==='flat_torch'?9:14);
  for(const e of literal.rows){const x=r.rows.find(x=>x.row_id===e.rowId)!;assert(x,e.rowId);assert.equal(x.quantity,e.expectedByAreaM2[area]);assert.equal(x.unit_id,e.unitId);assert.equal(x.included_in_estimate,!e.informational);assert.equal(x.included_in_procurement,e.procurementEligible);assert.equal(x.procurement_eligible,e.procurementEligible);assert.equal(x.unit_price,null);assert.equal(x.amount,null);}
 });
 test(profile.kind+' zero full persisted declaration and no made-up equipment count',async()=>{
  const m=model(profile.catalogId);for(const q of [0,'0.0']){const r=await compile(m,control(profile.catalogId,q,profile.kind));assert.equal(r.rows.length,0);assert.equal(r.preliminaryNeeds.length,0);assert.equal(m.resources.length,model(profile.catalogId).resources.length);}
 });
 test(profile.kind+' hidden internal physical norms cannot be supplied as0/1; public project guides have consumers',async()=>{
  const m=model(profile.catalogId),input=control(profile.catalogId,100,profile.kind);
  for(const q of [0,1])await assert.rejects(()=>compile(m,{...input,m212_roof_need_rigging:q}),{code:'PARAMETER_VALIDATION_FAILED'});
  const oldIds=new Set(captured(profile.catalogId).parameters.map(p=>p.parameter_id));
  for(const p of m.parameters.filter(p=>!oldIds.has(p.parameter_id))){assert(p.truth_metadata.semantic_parameter_key);assert((p.truth_metadata.resource_branch_consumers as string[]).length>0);if(p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM'){assert.equal(p.truth_metadata.visibility_role,'INTERNAL_ONLY');continue;}if(p.value_type==='text'){assert.equal(p.constraints_json.minLength,1);assert.equal(p.constraints_json.maxLength,1000);assert.equal(p.truth_metadata.guide.guide_kind,'PROJECT_DEFINED');assert.equal(p.truth_metadata.guide.source_role,'PROJECT_DOCUMENTATION');}}
 });
 test(profile.kind+' fresh primary area requires new root with no old quantity or price transfer',()=>{
  const m=model(profile.catalogId),selection=m.definition.applicability.primaryMeasureSelectionV1;
  const schema=m.parameters.map(p=>({parameterId:p.parameter_id,valueType:p.value_type,unitId:p.unit_id,visibilityRole:p.truth_metadata.visibility_role,valueSourceRole:p.truth_metadata.value_source_role,constraints:p.constraints_json,formulaConsumers:p.truth_metadata.formula_consumers}));
  const r=resolvePrimary({selectionMetadata:selection,parameterSchema:schema,submittedParameters:control(profile.catalogId,100,profile.kind),parentPrimaryMeasure:{parameterId:'q',unitId:'m2'}});
  assert.equal(r.kind,'NEW_ROOT_REQUIRED');if(r.kind==='NEW_ROOT_REQUIRED')assert.deepEqual(r.carryForward,{parameters:false,rowOverrides:false,prices:false});
 });
 test(profile.kind+' complete operation/category map remains independently partial and has no unbound resource',()=>{
  const m=model(profile.catalogId),x=completeness(profile.catalogId),cells=x.operationCategoryMatrix.filter(c=>c.selectedKind===profile.kind),ids=new Set(m.resources.map(r=>r.row_id));
  assert.equal(cells.length,180);assert(cells.every(c=>!c.emptyCellMeansNotApplicable));for(const c of cells)for(const id of [...c.knownRowIds,...c.needIds])assert(ids.has(id as string),id as string);
  assert.equal(x.fullTechnicalAcceptance,false);assert.equal(x.newFullTechnologies,0);assert(m.passport.decision.unresolvedResourceRowIds.length>0);
 });
}
test('flat field profiles are exclusive; shared layers/gutter retain one declaration and one paid owner',async()=>{
 const t=pack.targets[0]!,m=model(t.catalogId);
 const mast=await compile(m,control(t.catalogId,100,'flat_mastic')),torch=await compile(m,control(t.catalogId,100,'flat_torch'));
 assert(!mast.rows.some(x=>x.row_id.includes(':reuse:torch_field:')||x.row_id.includes(':reuse:torch_primer:')));
 assert(!torch.rows.some(x=>x.row_id.includes(':mastic_field:')||x.row_id.includes(':mastic_junction:')||x.row_id.includes(':mastic_valley:')));
 assert(!torch.preliminaryNeeds.some(x=>x.row_id.includes('mastic-junction-whole-scope')||x.row_id.includes('mastic-valley-whole-scope')));
 for(const r of m.resources)assert.equal(m.resources.filter(x=>x.row_id===r.row_id).length,1);
});
test('source-owned glue/primer and coating names remain functional while exact product details stay internal',async()=>{
 const t=pack.targets[0]!,r=await compile(model(t.catalogId),control(t.catalogId,100,'flat_torch'));
  for(const row of r.rows.filter(x=>x.row_id.includes(':reuse:torch_field:')))assert(!/isoplast|изопласт|э[кп]п[- ]?4/iu.test(row.title_ru as string),row.title_ru as string);
 const m=model(t.catalogId);for(const row of m.resources.filter(x=>x.row_id.includes(':reuse:torch_field:')))assert(row.source_metadata.originalSourceTitleInternal);
});
test('operator INFO cannot create extra payment or procurement even with price77 and inclusion switches',async()=>{
 for(const profile of pack.technologyProfiles){const literal=oracle.profiles.find(p=>p.kind===profile.kind)!,op=literal.rows.find(x=>x.informational)!,m=model(profile.catalogId),input=control(profile.catalogId,100,profile.kind),base=await compile(m,input);
  const r=await compile(m,input,{rowOverrides:{[op.rowId]:{unitPrice:'77',includedInEstimate:true,includedInProcurement:true,provenance:{kind:'manual',reason:'TEST_ONLY_OPERATOR_REFERENCE_PRICE'}}}});
  const x=r.rows.find(x=>x.row_id===op.rowId)!;assert.equal(x.included_in_estimate,false);assert.equal(x.included_in_procurement,false);assert.equal(x.unit_price,'77');assert.equal(r.totals.amount,base.totals.amount);assert.equal(artifacts([x]).procurementRows.length,0);
 }
});
test('all three exact captured legacy baselines and q provenance preserved without new selector/default',async()=>{
 for(const t of pack.targets){const old=captured(t.catalogId),m=model(t.catalogId),q=old.parameters.find(p=>p.parameter_id==='q')!,next=m.parameters.find(p=>p.parameter_id==='q')!;
  assert.deepEqual(m.baseline.input_values,old.baseline.input_values);assert.deepEqual(m.baseline.normative_source_ids.q,old.baseline.normative_source_ids.q);
  assert.deepEqual(next.truth_metadata.provenance,q.truth_metadata.provenance);assert.deepEqual(next.truth_metadata.guide,q.truth_metadata.guide);assert.equal(next.truth_metadata.value_source_role,q.truth_metadata.value_source_role);assert.deepEqual(m.definition.source_metadata,old.definition.source_metadata);
  assert.deepEqual(semantic(await compile(m,old.baseline.input_values)),semantic(await compile(old,old.baseline.input_values)));
 }
});
