import assert from 'node:assert/strict';
import {test} from 'node:test';
import kg from '../../../../data/estimate-benchmarks/source-packs/masonry-wall-krer08-systems-r1.json';
import {masonryM50CycleCapturedRepresentativeR2 as captured,MASONRY_M50_WHOLE_CYCLE_R2 as supply,masonryM50CycleIdR2 as id,masonryM50CycleRowR2 as oldRow,compileMasonryM50CycleR2 as oldCompile} from './masonryReadyM50WholeSupplyCycleR2';
import {buildMasonryCeramic250WholeFamilySuccessorR2 as oldBuild} from './masonryCeramic250WholeFamilyCompositionR2';
import {buildMasonryCeramic250EffectiveLiftSuccessorR4 as build,compileMasonryM50EffectiveLiftR4 as compileCore,m50LiftRowR4 as row,m50LiftIdR4 as internal,MASONRY_M50_EFFECTIVE_LIFT_R4 as pack} from './masonryM50EffectiveLiftCorrectionR4';
import {canonicalEstimateOperationReferences} from '../backendPlatform/canonicalEstimateOperationComposition';

import {isCanonicalEstimateConsumerSuppliedParameter as consumerEditable} from '../backendPlatform/canonicalEstimateParameterSemantics';
import type {CanonicalEstimateCatalogItem} from '../backendPlatform/contracts';
import type {CanonicalEstimateCompileCoreInput} from '../backendPlatform/canonicalEstimateCompileCore';

type Json=Record<string,unknown>;
const parent=captured(),old=oldBuild(parent),model=build(parent);
// Test data below deliberately includes simulated source documents. The helper
// sends newly authored internal facts through the existing confirmed channel;
// it is not a product importer and grants no whole-profile source acceptance.
const authoredInternal=new Set(model.parameters.filter(parameter=>/^m(?:50c2|cf2)_/.test(parameter.parameter_id)).map(parameter=>parameter.parameter_id));
function compile(subject:typeof model,input:Json,options:Pick<CanonicalEstimateCompileCoreInput,'rowOverrides'|'compositionSelectionV1'>={}){
 const confirmedParameters=Object.fromEntries(Object.entries(input).filter(([key])=>authoredInternal.has(key)));
 const submitted=Object.fromEntries(Object.entries(input).filter(([key])=>!authoredInternal.has(key)));
 return compileCore(subject,submitted,{...options,confirmedParameters});
}
function schema(parameter:typeof model.parameters[number]):CanonicalEstimateCatalogItem['parameterSchema'][number]{
 const truth=parameter.truth_metadata;
 return{parameterId:parameter.parameter_id,ordinal:parameter.ordinal,valueType:parameter.value_type,unitId:parameter.unit_id,titleRu:parameter.title_ru,required:parameter.required,defaultValue:parameter.default_value,constraints:parameter.constraints_json,visibilityRole:truth.visibility_role,valueSourceRole:truth.value_source_role,semanticParameterKey:truth.semantic_parameter_key,visibleWhen:truth.visible_when,preliminaryCompilationAllowed:truth.preliminary_compilation_allowed,guide:{guideKind:truth.guide.guide_kind,guideShortRu:truth.guide.guide_short_ru,sourceRole:truth.guide.source_role,sourceDocument:truth.guide.source_document,sourceLocator:truth.guide.source_locator,guideVersion:truth.guide.guide_version,sourceSnapshotHash:truth.guide.source_snapshot_hash,applicability:truth.guide.applicability,verifiedAt:truth.guide.verified_at,guideValidationPolicy:truth.guide.guide_validation_policy},provenance:truth.provenance,formulaConsumers:truth.formula_consumers,resourceBranchConsumers:truth.resource_branch_consumers};
}
const amendment=(quantity:string)=>({quantity,provenance:{kind:'manual',reason:'TEST_ONLY explicit retained quantity amendment, no actual site approval'}});
const mortar=(quantity:string)=>({[pack.mortarRowId]:amendment(quantity)});
function control(upper='2000',crane='2000'):Json{return{
 [supply.parentSelector]:supply.parentSelectedValue,[supply.selectorId]:supply.selectorValue,[supply.incompatibleSelector]:'Без отдельного профиля подачи',
 m33_masonry_wall_length_m:'0.8',m33_masonry_wall_height_m:'1',m33_masonry_openings_area_m2:'0',m33_masonry_nonmasonry_insert_volume_m3:'0',m33_masonry_storey_height_m:'4',
 m33_masonry_kg_project_basis:kg.projectBasisValue,m33_masonry_source_system_conformance:kg.sourceFactValue,m33_masonry_approved_masonry_design_reference:'TEST_ONLY exact source profile',m33_masonry_machine_fulfillment_tower_crane:kg.machineFulfillmentChoices.own,
 ...Object.fromEntries(supply.records.map(record=>[id(record.key+'_reference'),'TEST_ONLY actual-fact placeholder; no source certification'])),
 [id('density_kg_m3')]:'2000',[id('upper_mass_kg')]:'30',[id('upper_allowable_kg')]:upper,[id('crane_available_kg')]:crane,
 [id('box1_eye_mm')]:'17',[id('box2_eye_mm')]:'17',[id('box3_eye_mm')]:'17',[id('returned_mortar_kg')]:'0',[id('waste_mortar_kg')]:'0'
};}
const bounds={code:'FORMULA_OUTPUT_BOUNDS_FAILED'};
const semantic=(value:Awaited<ReturnType<typeof compile>>)=>({rows:value.rows.map(resource=>[resource.row_id,resource.unit_id,resource.quantity,resource.unit_price,resource.amount,resource.included_in_estimate,resource.included_in_procurement]),needs:value.preliminaryNeeds.map(need=>[need.row_id,need.quantity,need.need_state,[...need.missing_parameter_ids].sort()]),totals:value.totals});

test('counterexample: old nominal258.6kg passes300kg despite true amended1665kg; R4 rejects',async()=>{
 const before=await oldCompile(old,control('300','300'),{rowOverrides:mortar('0.75')});
 assert.equal(before.rows.find(resource=>resource.row_id===pack.mortarRowId)?.quantity,'0.75');
 assert.equal(before.rows.find(resource=>resource.row_id===oldRow('operation:feed'))?.quantity,'0.0468');
 assert.equal(0.0468*2000+135+30,258.6);assert.equal(0.75*2000+135+30,1665);
 await assert.rejects(()=>compile(model,control('300','300'),{rowOverrides:mortar('0.75')}),bounds);
});
test('exact nominal upper228.6kg/crane258.6kg boundary passes and all8 process volumes use effective0.0468',async()=>{
 const result=await compile(model,control('228.6','258.6'));
 for(const operation of supply.operations)assert.equal(result.rows.find(resource=>resource.row_id===oldRow('operation:'+operation.key))?.quantity,'0.0468');
 for(const key of ['upper-load','crane-load','return-balance'])assert.equal(result.rows.find(resource=>resource.row_id===row(key))?.quantity,'0');
});
test('exact amended upper1635kg/crane1665kg boundaries pass; every process sees0.75m3',async()=>{
 const result=await compile(model,control('1635','1665'),{rowOverrides:mortar('0.75')});
 for(const operation of supply.operations)assert.equal(result.rows.find(resource=>resource.row_id===oldRow('operation:'+operation.key))?.quantity,'0.75');
 assert.equal(result.derivedParameters[pack.effectiveMortarParameterId],'0.75');
});
for(const [upper,crane] of [['1634.999','1665'],['1635','1664.999']])test('one gram below amended physical capacity rejects '+upper+'/'+crane,async()=>{
 await assert.rejects(()=>compile(model,control(upper,crane),{rowOverrides:mortar('0.75')}),bounds);
});
test('larger effective demand saturates actual three-box useful capacity, without inventing a dispatch count',async()=>{
 const result=await compile(model,control('1635','1665'),{rowOverrides:mortar('1.5')});
 assert.equal(result.rows.find(resource=>resource.row_id===oldRow('operation:feed'))?.quantity,'1.5');
 assert.equal(result.rows.find(resource=>resource.row_id===oldRow('boxes'))?.quantity,'3');
});
test('manual zero quantity on a physical control never bypasses formula bounds',async()=>{
 for(const key of ['upper-load','crane-load'])await assert.rejects(()=>compile(model,control('300','300'),{rowOverrides:{...mortar('0.75'),[row(key)]:amendment('0')}}),bounds);
});
test('manual return and waste row amendments participate in effective mass balance',async()=>{
 const overrides={...mortar('0.75'),[oldRow('returned-mortar')]:amendment('1499'),[oldRow('waste-mortar')]:amendment('1')};
 const exact=await compile(model,control(),{rowOverrides:overrides});
 assert.equal(exact.derivedParameters[internal('effective_return_kg')],'1499');
 assert.equal(exact.derivedParameters[internal('effective_waste_kg')],'1');
 await assert.rejects(()=>compile(model,control(),{rowOverrides:{...overrides,[oldRow('waste-mortar')]:amendment('1.001'),[row('return-balance')]:amendment('0')}}),bounds);
});
test('recorded return/waste exceeding reduced effective demand rejects, not the old nominal budget',async()=>{
 await assert.rejects(()=>compile(model,{...control(),[id('returned_mortar_kg')]:'60',[id('waste_mortar_kg')]:'1'},{rowOverrides:mortar('0.03')}),bounds);
 const result=await compile(model,{...control(),[id('returned_mortar_kg')]:'59',[id('waste_mortar_kg')]:'1'},{rowOverrides:mortar('0.03')});
 assert.equal(result.rows.find(resource=>resource.row_id===row('return-balance'))?.quantity,'0');
});
test('incoming fake effective demand cannot replace the compiler-owned output',async()=>{
 await assert.rejects(()=>compile(model,{...control('300','300'),[pack.effectiveMortarParameterId]:'0.0468'},{rowOverrides:mortar('0.75')}),bounds);
});
test('unknown return/waste remains null and leaves balance open',async()=>{
 const input=control();delete input[id('returned_mortar_kg')];delete input[id('waste_mortar_kg')];
 const result=await compile(model,input,{rowOverrides:mortar('0.75')});
 const missing=result.preliminaryNeeds.find(need=>need.row_id===row('return-balance'));assert(missing);assert.equal(missing.quantity,null);
 assert(!result.rows.some(resource=>resource.row_id===row('return-balance')));
});
test('missing retained effective demand leaves process and controls unresolved',async()=>{
 const input=control();delete input.m33_masonry_approved_masonry_design_reference;
 const result=await compile(model,input);
 for(const key of ['upper-load','crane-load']){const missing=result.preliminaryNeeds.find(need=>need.row_id===row(key));assert(missing);assert.equal(missing.quantity,null);}
});
test('mandatory source controls reject row and operation composition exclusion',async()=>{
 for(const key of ['upper-load','crane-load','return-balance']){
  await assert.rejects(()=>compile(model,control(),{compositionSelectionV1:{contractVersion:'canonical-estimate-composition-selection/v1',excludedOperationKeys:[],excludedRowIds:[row(key)]}}),{code:'COMPOSITION_SELECTION_INVALID'});
  const definition=model.resources.find(resource=>resource.row_id===row(key))!;
  const operation=canonicalEstimateOperationReferences(definition.resource_graph.operationCompositionV1)[0]!;
  await assert.rejects(()=>compile(model,control(),{compositionSelectionV1:{contractVersion:'canonical-estimate-composition-selection/v1',excludedOperationKeys:[JSON.stringify([operation.groupId,operation.operationId])],excludedRowIds:[]}}),{code:'COMPOSITION_SELECTION_INVALID'});
 }
});
test('historical selector absence preserves old semantics, original formulas/bindings and financial owners',async()=>{
 const input=control();for(const key of Object.keys(input))if(key.startsWith('m50c2_'))delete input[key];
 assert.deepEqual(semantic(await compile(model,input)),semantic(await oldCompile(old,input)));
 assert.deepEqual(model.formulas.slice(0,parent.formulas.length),parent.formulas);assert.deepEqual(model.bindings,parent.bindings);
 const result=await compile(model,control(),{rowOverrides:mortar('0.75')});
 const original=await oldCompile(old,control(),{rowOverrides:mortar('0.75')});
 assert.equal(result.totals.amount,original.totals.amount);
 for(const resource of result.rows.filter(resource=>resource.row_id.startsWith(pack.prefix+':'))){assert.equal(resource.included_in_estimate,false);assert.equal(resource.included_in_procurement,false);}
 assert.equal(model.passport.decision.completeTechnicalEstimateAccepted,false);
});

test('new equipment, source and object-document fields are unavailable to the common consumer editor',()=>{
 const fresh=model.parameters.filter(parameter=>authoredInternal.has(parameter.parameter_id));assert(fresh.length>0);
 for(const parameter of fresh){assert.equal(parameter.truth_metadata.visibility_role,'INTERNAL_ONLY',parameter.parameter_id);assert.equal(parameter.truth_metadata.provenance.consumer_input_role_v1,'APPLICATION_TECHNICAL');assert.equal(parameter.default_value,null);assert.equal(consumerEditable(schema(parameter)),false,parameter.parameter_id);}
 for(const key of supply.geometryIds){const parameter=model.parameters.find(value=>value.parameter_id===key)!;assert.equal(consumerEditable(schema(parameter)),true,key);}
 assert.deepEqual([...authoredInternal].filter(key=>consumerEditable(schema(model.parameters.find(value=>value.parameter_id===key)!))),[]);
});

test('source selection alone never fills missing equipment facts or accepts the whole method',async()=>{
 const input=control(),confirmedParameters={[supply.selectorId]:input[supply.selectorId]};
 for(const key of authoredInternal)delete input[key];
 const result=await compileCore(model,input,{confirmedParameters});
 for(const key of ['upper-load','crane-load']){const need=result.preliminaryNeeds.find(item=>item.row_id===row(key));assert(need);assert.equal(need.quantity,null);}
 assert.equal(model.passport.decision.completeTechnicalEstimateAccepted,false);
 assert.equal(model.definition.applicability.masonryM50EffectiveLiftCorrectionR4.fullTechnicalAcceptance,false);
});

test('direct common compiler rejects technical source-field injection, null, echo and low-capacity row bypass',async()=>{
 const source=control(),confirmedParameters=Object.fromEntries(Object.entries(source).filter(([key])=>authoredInternal.has(key)));
 const submitted=Object.fromEntries(Object.entries(source).filter(([key])=>!authoredInternal.has(key)));
 for(const key of [supply.selectorId,id('density_kg_m3'),id('upper_allowable_kg'),id('crane_available_kg'),id('adoption_reference'),id('returned_mortar_kg')])for(const value of [source[key],null])await assert.rejects(()=>compileCore(model,{...submitted,[key]:value},{confirmedParameters,rowOverrides:{...mortar('0.75'),[row('crane-load')]:amendment('0')}}),{code:'PARAMETER_VALIDATION_FAILED'});
 await assert.rejects(()=>compileCore(model,submitted,{confirmedParameters:{...confirmedParameters,[id('upper_allowable_kg')]:'300',[id('crane_available_kg')]:'300'},rowOverrides:{...mortar('0.75'),[row('crane-load')]:amendment('0')}}),bounds);
});

test('trusted source facts still pass shared type and physical-bound validation',async()=>{
 const source=control(),confirmedParameters=Object.fromEntries(Object.entries(source).filter(([key])=>authoredInternal.has(key)));
 const submitted=Object.fromEntries(Object.entries(source).filter(([key])=>!authoredInternal.has(key)));
 for(const value of ['-1','not-a-number'])await assert.rejects(()=>compileCore(model,submitted,{confirmedParameters:{...confirmedParameters,[id('upper_allowable_kg')]:value}}),{code:'PARAMETER_VALIDATION_FAILED'});
 const result=await compileCore(model,submitted,{confirmedParameters,rowOverrides:mortar('0.75')});assert.equal(result.derivedParameters[pack.effectiveMortarParameterId],'0.75');
});
