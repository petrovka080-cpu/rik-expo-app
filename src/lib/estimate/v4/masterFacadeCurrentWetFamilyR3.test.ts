import assert from 'node:assert/strict';
import {facadeCurrentWetFamilyMasterConfigR3 as configOf} from '../../../../scripts/estimate/r4a13/prepareFacadeCurrentWetFamilyR3';
import {canonicalApprovedBaselineRuntimeParameters} from '../backendPlatform/canonicalEstimateApprovedBaseline';
import pack from '../../../../data/estimate-benchmarks/source-packs/facade-bolix-mw120-krer15-r1.json';
import {master35FacadeRepresentativeR1,master35FacadeCapturedParentR1,buildMaster35FacadeMw120SuccessorR1,compileMaster35FacadeR1 as compileMasterRaw,master35FacadeParameterIdR1} from './master35FacadeMw120R1';
import {facadeMw120ScenarioFactsR1,facadeMw120TechnicalParameterIdsR5} from './facadeMw120Krer15R1';
import {applyFacadeCurrentWetFamilyR3,facadeCurrentWetFamilyControlR3,compileFacadeCurrentWetFamilyR3,facadeCurrentWetParameterIdR3,resolveFacadeCurrentWetFamilyPrimaryR3,facadeCurrentWetFamilySourceIdR3} from './masterFacadeCurrentWetFamilyR3';
import {facadeCurrentWetNeedIdsR3,facadeCurrentWetGeometryR5,FACADE_CURRENT_WET_PREFIX_R3,FACADE_CURRENT_WET_CHOICE_R3,facadeCurrentWetPrimaryR3} from './facadeCurrentWetSystemR3';
import {validateIndependentCompletenessMapReferences} from '../../../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
import {compareFormulaGraphDecimals as cmp} from '../backendPlatform/formulaGraph';
// TEST_ONLY fixture bridge for the preserved MW120 comparison; no project facts enter submitted.
const mwTechnicalFixtureIds=new Set(facadeMw120TechnicalParameterIdsR5.map(master35FacadeParameterIdR1));
function compileMaster35FacadeR1(model:Parameters<typeof compileMasterRaw>[0],values:Record<string,unknown>){
 const submitted=Object.fromEntries(Object.entries(values).filter(([id])=>!mwTechnicalFixtureIds.has(id)));
 const confirmedParameters=Object.fromEntries(Object.entries(values).filter(([id])=>mwTechnicalFixtureIds.has(id)));
 return compileMasterRaw(model,submitted,{confirmedParameters});
}
const compile=async(model:Parameters<typeof compileFacadeCurrentWetFamilyR3>[0],fixture:Record<string,unknown>)=>{
 const managed=new Set(model.parameters.filter(q=>q.truth_metadata.visibility_role==='INTERNAL_ONLY').map(q=>q.parameter_id));
 const submitted=Object.fromEntries(Object.entries(fixture).filter(([id])=>!managed.has(id)));
 const confirmedParameters=Object.fromEntries(Object.entries(fixture).filter(([id])=>managed.has(id)));
 return compileFacadeCurrentWetFamilyR3(model,submitted,{confirmedParameters});
};
const original=master35FacadeRepresentativeR1(),prepared=buildMaster35FacadeMw120SuccessorR1(original),model=applyFacadeCurrentWetFamilyR3(prepared),input=facadeCurrentWetFamilyControlR3;
const semantic=(r:any)=>({rows:r.rows.map((x:any)=>[x.row_id,x.quantity,x.unit_id,x.unit_price,x.amount,x.included_in_estimate,x.included_in_procurement]),needs:r.preliminaryNeeds.map((n:any)=>[n.row_id,n.quantity,n.need_state,n.missing_parameter_ids]),totals:r.totals});
describe('whole current façade profile retained composite R3 — product checks UNRUN',()=>{
 test('independent source map references whole operations/resources and visible gaps',()=>assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:model.passport.decision.independentCompletenessMap,formulaDefinitions:model.formulas,resourceDefinitions:model.resources}),[]));
 test('original parent and prepared model remain immutable',()=>{const a=JSON.stringify(original),b=JSON.stringify(prepared);applyFacadeCurrentWetFamilyR3(prepared);assert.equal(JSON.stringify(original),a);assert.equal(JSON.stringify(prepared),b);assert.equal(model.definition.id,original.definition.id);});
 test('third choice gates every older branch and retains exactly4current needs',async()=>{const r=await compile(model,input());assert(r.rows.length>0);assert(r.rows.every(x=>x.row_id.startsWith(FACADE_CURRENT_WET_PREFIX_R3+':')));assert.deepEqual(r.preliminaryNeeds.map(n=>n.row_id).sort(),[...facadeCurrentWetNeedIdsR3].sort());assert.equal(cmp(r.rows.find(x=>x.row_id===FACADE_CURRENT_WET_PREFIX_R3+':water-supply')!.quantity,'259.25'),0);});
 test('independent original baseline replay unchanged before and after the new overlay',async()=>{const baseline=structuredClone(master35FacadeCapturedParentR1().baseline.input_values);assert.deepEqual(semantic(await compileMaster35FacadeR1(model,baseline)),semantic(await compileMaster35FacadeR1(original,baseline)));});
 test('whole historical source profile is unchanged by the new current choice',async()=>{const facts=facadeMw120ScenarioFactsR1({facade_length_m:'10',facade_height_m:'10',openings_outer_frame_area_m2:'0'}),oldInput={...Object.fromEntries(Object.entries(facts).map(([id,v])=>[master35FacadeParameterIdR1(id),v])),[pack.sourceProfileSelectorId]:pack.exactChoiceRu};assert.deepEqual(semantic(await compileMaster35FacadeR1(model,oldInput)),semantic(await compileMaster35FacadeR1(prepared,oldInput)));});
 test('new primary identity is explicit; sameunitoldarea is still different identity',()=>{const r=resolveFacadeCurrentWetFamilyPrimaryR3(model,input());assert.equal(r.kind,'RESOLVED');if(r.kind==='RESOLVED')assert.equal(r.primaryMeasure.parameterId,facadeCurrentWetParameterIdR3('current_wet_area_m2'));assert.equal(resolveFacadeCurrentWetFamilyPrimaryR3(model,input(),{parameterId:'area_m2',unitId:'m2'}).kind,'NEW_ROOT_REQUIRED');});
 test('new profile never reads legacy q,prices or source material assumptions',()=>{const ids=new Set(original.parameters.map(p=>p.parameter_id));for(const f of model.formulas.filter(f=>String(f.formula_id).startsWith(FACADE_CURRENT_WET_PREFIX_R3+':')))assert(f.input_parameter_ids.every((id:string)=>!ids.has(id)));});
 test('parameter and formula declaration order does not change semantic output',async()=>{const a=await compile(model,input()),reversed=structuredClone(model);reversed.parameters.reverse();reversed.formulas.reverse();assert.deepEqual(semantic(await compile(reversed,input())),semantic(a));});
 test('wrong prepared model cannot be treated as a virtual current DBparent',()=>{const changed=structuredClone(prepared);changed.resources[0]!.title_ru+='TEST_ONLY drift';assert.throws(()=>applyFacadeCurrentWetFamilyR3(changed),/EXACT_PREPARED_MW120_REQUIRED/);});
 test('new model keeps every defaultnull and every incomplete capability honest',()=>{assert(model.parameters.every(p=>p.default_value===null));assert.equal(model.passport.decision.completeTechnicalEstimateAccepted,false);assert.equal(model.passport.decision.newFullTechnologies,0);assert.equal(model.passport.decision.conditionalCurrentFacadeNeeds.currentActiveNeedCount,4);});
 test('actual retained caller keeps source facts separate and rejects a raw source echo',async()=>{
  const fixture=input(),managed=new Set(model.parameters.filter(q=>q.truth_metadata.visibility_role==='INTERNAL_ONLY').map(q=>q.parameter_id));
  const submitted=Object.fromEntries(Object.entries(fixture).filter(([id])=>!managed.has(id))),confirmedParameters=Object.fromEntries(Object.entries(fixture).filter(([id])=>managed.has(id)));
  const result=await compileFacadeCurrentWetFamilyR3(model,submitted,{confirmedParameters});
  assert(result.rows.some(r=>r.row_id===FACADE_CURRENT_WET_PREFIX_R3+':water-supply'));
  const id=facadeCurrentWetParameterIdR3('current_fronts12_count');for(const value of [fixture[id],null,undefined])
   await assert.rejects(()=>compileFacadeCurrentWetFamilyR3(model,{...submitted,[id]:value},{confirmedParameters}),{code:'PARAMETER_VALIDATION_FAILED'});
  const visible=model.parameters.filter(q=>q.parameter_id.startsWith('facade_r3_current_')&&q.truth_metadata.visibility_role==='USER_INPUT').map(q=>q.parameter_id);
  assert.deepEqual(visible,facadeCurrentWetGeometryR5.map(facadeCurrentWetParameterIdR3));
 });

});

test('normal source profile carries only the two fixed properties of the existing wet method',()=>{
 const c=configOf({releaseId:'TEST_ONLY',searchReleaseId:'TEST_ONLY'}),expected={
  [facadeCurrentWetParameterIdR3('current_wet_exact_method')]:FACADE_CURRENT_WET_CHOICE_R3,
  [facadeCurrentWetParameterIdR3('current_insulation_thickness_mm')]:'120',
 };
 assert.deepEqual(c.runtimeProfileInput,expected);
 assert.deepEqual(c.runtimeProfileClassification,Object.fromEntries(Object.keys(expected).map(id=>[id,'NORMATIVE'])));
 assert.deepEqual(c.runtimeProfileSourceIds,Object.fromEntries(Object.keys(expected).map(id=>[id,[facadeCurrentWetFamilySourceIdR3]])));
 for(const [id,value]of Object.entries(expected)){assert.equal(c.acceptanceInput[id],value);assert(!Object.hasOwn(c.shortInput,id));}
 const classified=Object.fromEntries(c.parameterDefinitions.map(parameter=>[String(parameter.parameter_id),c.runtimeProfileClassification?.[String(parameter.parameter_id)]??'VALIDATION_FIXTURE']));
 assert.deepEqual(canonicalApprovedBaselineRuntimeParameters({input_values:c.acceptanceInput,input_classification:classified}),expected);
 for(const id of ['current_wet_approved_project','current_wet_ppr_reference','current_wet_conditions','current_anchor_count','current_fronts12_count','current_substrate_primer_trial_g_m2','current_finish_primer_trial_g_m2'])
  assert(!Object.hasOwn(c.runtimeProfileInput??{},facadeCurrentWetParameterIdR3(id)));
});
test('two fixed source properties do not invent project stock, anchors or close whole-cycle needs after geometry changes',async()=>{
 const c=configOf({releaseId:'TEST_ONLY',searchReleaseId:'TEST_ONLY'});
 for(const area of ['100','200']){
  const r=await compileFacadeCurrentWetFamilyR3(model,{[pack.sourceProfileSelectorId]:FACADE_CURRENT_WET_CHOICE_R3,[facadeCurrentWetParameterIdR3(facadeCurrentWetPrimaryR3)]:area},{confirmedParameters:{...c.runtimeProfileInput}});
  for(const needId of facadeCurrentWetNeedIdsR3)assert(r.preliminaryNeeds.some(need=>need.row_id===needId&&need.quantity===null));
  assert(!r.rows.some(resource=>resource.row_id.startsWith(FACADE_CURRENT_WET_PREFIX_R3+':stock:')||resource.row_id===FACADE_CURRENT_WET_PREFIX_R3+':anchors-supply'));
 }
});
