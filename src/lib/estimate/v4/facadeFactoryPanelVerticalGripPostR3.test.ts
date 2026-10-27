import assert from 'node:assert/strict';
import {compileCanonicalEstimateCore} from '../backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';
import {canonicalEstimateOperationReferences as operationReferences,canonicalEstimateResourceOperationSections as operationSections} from '../backendPlatform/canonicalEstimateOperationComposition';
import oracle from '../../../../data/estimate-benchmarks/fixtures/facade-panel-grip-independent-oracles-r3.json';
import {facadePanelGripPostDefinitionR3 as build,compileFacadePanelGripPostR3 as compileTrusted,facadePanelGripControlR3 as control,facadePanelGripMinimumActiveR3 as active} from './facadeFactoryPanelVerticalGripPostR3';
import {compareFormulaGraphDecimals as cmp} from '../backendPlatform/formulaGraph';
const consumerInputRole=(value:unknown):unknown=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&'consumer_input_role_v1'in value?value.consumer_input_role_v1:undefined;

// TEST_ONLY fixture adapter: only application-owned known facts use confirmed.
// Raw unknown norms remain submitted and are rejected, never promoted to facts.
const compile=async(input:Record<string,unknown>)=>{
 const known=new Set(build().parameters.filter(parameter=>parameter.truth_metadata.visibility_role==='INTERNAL_ONLY'&&parameter.truth_metadata.value_source_role!=='UNRESOLVED_APPLICATION_NORM').map(parameter=>parameter.parameter_id));
 return compileTrusted(Object.fromEntries(Object.entries(input).filter(([id])=>!known.has(id))),{confirmedParameters:Object.fromEntries(Object.entries(input).filter(([id])=>known.has(id)))});
};

// Prepared meaningful checks. Product imports/Jest execution UNRUN by author.
describe('internal original factory-panel vertical grip component R3',()=>{
 for(const c of oracle.cases)test(c.caseId+' original full case inventory is not consumption per panel',async()=>{
  const r=await compile(control({panel_grip_nominal_length_m:c.panelLengthM,panel_grip_actual_fronts:c.actualFronts}));
  assert.equal(active(c.panelLengthM),c.minimumActiveLiftersPerPanel);
  for(const[id,q]of Object.entries(c.expectedStock)){
   const row=r.rows.find(row=>row.row_id==='facade:factory-panel-vertical-grip:r3:stock:'+id);assert(row,id);
   assert(row.quantity!==null);assert.equal(cmp(row.quantity,q),0,id);assert.equal(row.included_in_estimate,false);assert.equal(row.included_in_procurement,false);
  }
  const owners=r.rows.filter(row=>row.included_in_estimate);assert.equal(owners.length,1);
  const owner=owners[0];assert(owner);assert(owner.quantity!==null);assert.equal(cmp(owner.quantity,c.expectedKitOwners),0);assert.equal(owners[0]!.unit_id,'set');
  assert.equal(r.preliminaryNeeds.length,8);assert(r.preliminaryNeeds.every(need=>need.quantity===null));
 });
 test('4.6 boundary selects1; above it2; neither case stock nor active devices become kg capacity',()=>{
  assert.equal(active('4.6'),'1');assert.equal(active('4.6001'),'2');assert.equal(active('6'),'2');assert.throws(()=>active('6.0001'));
  const d=build();assert(!d.parameters.some(p=>/capacity_kg|rating_kg/u.test(p.parameter_id)));
 });
 test('no different edge/method/thickness/expiredinspection/defect/wind fact may enter selected profile',async()=>{
  for(const patch of [{panel_grip_exact_method:'Подъём обычного шпунтованного края или другого материала'},{panel_grip_thickness_mm:'300'},{panel_grip_inspection_state:'СРОК_ОСМОТРА_ИСТЁК'},{panel_grip_perlift_fit:'ЗАЗОР_ИЛИ_СМЕЩЕНИЕ'},{panel_grip_actual_conditions:'СИЛЬНЫЙ_ВЕТЕР'},{panel_grip_nominal_length_m:'6.0001'}])
   await assert.rejects(()=>compile(control(patch)),{code:'PARAMETER_VALIDATION_FAILED'});
  await assert.rejects(()=>compile(control({panel_grip_concurrent_panels_per_front:'2'})),{code:'PARAMETER_VALIDATION_FAILED'});
 });
 test('all8 external physical norm gaps are protected against0/1/77, not hiddenby suppliedcase',async()=>{
  const d=build(),gaps=d.parameters.filter(p=>p.parameter_id.startsWith('panel_grip_unknown_'));assert.equal(gaps.length,8);
  for(const p of gaps)for(const value of ['0','1','77'])await assert.rejects(()=>compile(control({[p.parameter_id]:value})),{code:'PARAMETER_VALIDATION_FAILED'});
 });
 test('one original case is not an isolated public work and no defaults assert object facts',()=>{
  const d=build();assert(d.parameters.every(p=>p.default_value===null));
  assert(!d.resources.some(r=>r.unit_id==='kg'&&r.title_ru.includes('80–300')));
 });
});

test('existing original complete panel-grip case retains all shared operations with one owner',()=>{
 const d=build();
  const related=d.resources.filter(resource=>{
   const raw=resource.resource_graph.operationCompositionV1;
   return raw!==null&&typeof raw==='object'&&!Array.isArray(raw)
    &&Array.isArray((raw as Record<string,unknown>).additionalOperations)
    &&((raw as Record<string,unknown>).additionalOperations as unknown[]).length>0;
  });
  assert(related.length>0,'ACTUAL_WHOLE_METHOD_MUST_HAVE_SHARED_RESOURCES');
  const sections=operationSections(d.resources.map(resource=>({rowId:resource.row_id,titleRu:resource.title_ru,operation:resource.resource_graph.operationCompositionV1})));
  for(const resource of related){
   const raw=resource.resource_graph.operationCompositionV1;assert(raw&&typeof raw==='object'&&!Array.isArray(raw));
   const declared=(raw as Record<string,unknown>).additionalOperations;assert(Array.isArray(declared));
   const refs=operationReferences(raw);assert.equal(refs.length,declared.length+1,'COMMON_CONSUMER_MUST_KEEP_EVERY_DECLARED_USE:'+resource.row_id);
   assert.equal(sections.filter(section=>section.resourceIds.includes(resource.row_id)).length,1,'ONE_RESOURCE_OWNER:'+resource.row_id);
   assert.equal(sections.reduce((count,section)=>count+section.sharedResources.filter(shared=>shared.rowId===resource.row_id).length,0),declared.length,'SAME_ID_IN_EVERY_ADDITIONAL_OPERATION:'+resource.row_id);
   for(const reference of refs){
    const section=sections.find(section=>section.operation?.operationId===reference.operationId&&section.operation.groupId===reference.groupId);assert(section);
    assert(section.resourceIds.includes(resource.row_id)||section.sharedResources.some(shared=>shared.rowId===resource.row_id));
   }
  }
});

const trustedReadbackCore=(submittedParameters:Record<string,unknown>,confirmedParameters:Record<string,unknown>)=>{
 const definition=build();
 return compileCanonicalEstimateCore({operation:'recalculate',catalogId:'INTERNAL_COMPONENT_NOT_PUBLIC_CATALOG',compilerVersion:'TEST_ONLY_EXISTING_COMPONENT_READBACK_BOUNDARY',primaryMeasureParameterId:'panel_grip_actual_fronts',parameterDefinitions:[...definition.parameters],formulaDefinitions:[...definition.formulas],resourceDefinitions:[...definition.resources],submittedParameters,confirmedParameters,priceItems:[],currencyCode:'KGS',maximumResourceRows:definition.resources.length,hashJson:hash});
};
test('existing imported schedule and passport facts stay outside ordinary inputs and reject raw authority echoes',async()=>{
 const definition=build(),confirmed:Record<string,unknown>=control();
 assert.deepEqual(definition.parameters.filter(parameter=>parameter.truth_metadata.visibility_role==='USER_INPUT').map(parameter=>parameter.parameter_id),['panel_grip_nominal_length_m']);
 assert.deepEqual(definition.ordinaryParameterIds,['panel_grip_nominal_length_m']);
 for(const key of ['panel_grip_actual_fronts','panel_grip_exact_method','panel_grip_actual_PPR','panel_grip_thickness_mm','panel_grip_perlift_fit']){
  const parameter=definition.parameters.find(parameter=>parameter.parameter_id===key);assert(parameter);
  assert.equal(parameter.truth_metadata.visibility_role,'INTERNAL_ONLY');assert.equal(consumerInputRole(parameter.truth_metadata.provenance),'APPLICATION_TECHNICAL');
  for(const value of [confirmed[key],null,undefined])await assert.rejects(()=>trustedReadbackCore({...{panel_grip_nominal_length_m:'4.6'},[key]:value},confirmed),{code:'PARAMETER_VALIDATION_FAILED'});
 }
});
test('missing imported schedule or PPR never yields a zero quantity or complete equipment provision',async()=>{
 const result=await trustedReadbackCore({panel_grip_nominal_length_m:'4.6'},{});
 assert(result.preliminaryNeeds.length>0);assert(result.preliminaryNeeds.every(need=>need.quantity===null));
 assert(!result.rows.some(row=>row.included_in_estimate||row.included_in_procurement));
});

test('source grip length classification preserves exact scale9 boundaries and rejects rounded neighbours',()=>{
 assert.equal(active('4.599999999'),'1');assert.equal(active('4.6'),'1');
 assert.equal(active('4.600000001'),'2');assert.equal(active('6'),'2');
 for(const value of ['4.6000000001','6.0000000001','0.0000000001','6.000000001','NaN'])
  assert.throws(()=>active(value),{code:'PARAMETER_VALIDATION_FAILED'});
});
