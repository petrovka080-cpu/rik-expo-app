import assert from 'node:assert/strict';
import {compileCanonicalEstimateCore} from '../backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';
import {canonicalEstimateOperationReferences as operationReferences,canonicalEstimateResourceOperationSections as operationSections} from '../backendPlatform/canonicalEstimateOperationComposition';
import oracle from '../../../../data/estimate-benchmarks/fixtures/facade-panel-face-fixing-independent-r3.json';
import source from '../../../../data/estimate-benchmarks/source-packs/facade-panel-face-fixing-r3.json';
import {facadeApprovedPanelFixingCountsR3 as count,compileFacadePanelFaceFixingR3 as compile,facadePanelFaceFixingDefinitionR3 as build,type FacadeApprovedPanelScheduleR3,type FacadePanelFaceFixingKeyR3} from './facadePanelFaceFixingR3';
import {compareFormulaGraphDecimals as cmp} from '../backendPlatform/formulaGraph';
const consumerInputRole=(value:unknown):unknown=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&'consumer_input_role_v1'in value?value.consumer_input_role_v1:undefined;

// Independent source fixtures and actual schedule captures, not generated rows.
// Prepared tests; author runs syntax only, product imports/Jest remain UNRUN.
function capture(key:FacadePanelFaceFixingKeyR3,n:number,points:number):FacadeApprovedPanelScheduleR3{
 const p=source.profiles.find(p=>p.key===key)!;
 return{profile:key,sourceSha256:p.source.sha256,panelThicknessMm:'8',exactMaterialFrameAndFastenerAccepted:true,approvedProjectReference:'TEST_ONLY approved-layout fixture; not an actual act',approvedPointLayoutSha256:'a'.repeat(64),panels:Array.from({length:n},(_,i)=>({panelId:'TEST-P'+i,points:Array.from({length:points},(_,j)=>({pointId:'TEST-F'+j,kind:j<Number(p.fixedPointsPerPanel)?'fixed' as const:'sliding' as const}))}))};
}
describe('source-specific face-fixing subprocess R3, not a whole facade',()=>{
 for(const c of oracle.examples)test(c.key+' independently captured points vs source fixed norm',async()=>{
  const key=c.profile as FacadePanelFaceFixingKeyR3,input=capture(key,Number(c.panels),Number(c.approvedPointsPerPanel));
  const before=JSON.stringify(input),counts=count(input);
  assert.deepEqual({fixed:counts.fixed,sliding:counts.sliding,total:counts.total},c.expected);
  const r=await compile(input),p=source.profiles.find(p=>p.key===key)!;
  for(const part of ['fixed','sliding'] as const){
   const row=r.rows.find(row=>row.row_id===p.prefix+':'+part);assert(row);
   assert(row.quantity!==null);assert.equal(cmp(row.quantity,c.expected[part]),0);assert.equal(row.unit_id,'piece');
   assert.equal(row.included_in_estimate,true);assert.equal(row.included_in_procurement,true);
  }
  assert.equal(r.preliminaryNeeds.length,7);assert(r.preliminaryNeeds.every(n=>n.quantity===null));
  assert.equal(JSON.stringify(input),before,'original approved schedule is immutable');
 });
 test('one HPL fixed point and two fibre-cement stop points cannot be substituted',()=>{
  const fc=capture('fibre-cement-uni8',1,8),hpl=capture('hpl-rivet8-aluminium',1,8);
  const fcWrong={...fc,panels:[{panelId:'TEST-P',points:[{pointId:'F1',kind:'fixed' as const},{pointId:'F2',kind:'sliding' as const}]}]};
  assert.throws(()=>count(fcWrong),{code:'PARAMETER_VALIDATION_FAILED'});
  const hplWrong={...hpl,panels:[{panelId:'TEST-P',points:[{pointId:'F1',kind:'fixed' as const},{pointId:'F2',kind:'fixed' as const}]}]};
  assert.throws(()=>count(hplWrong),{code:'PARAMETER_VALIDATION_FAILED'});
  assert.equal(count(fc).fixed,'2');assert.equal(count(hpl).fixed,'1');
 });
 test('exact material/frame/fastener and project layout evidence are required',()=>{
  const x=capture('hpl-rivet8-aluminium',1,8);
  for(const patch of [{sourceSha256:'0'.repeat(64)},{panelThicknessMm:'10'},{exactMaterialFrameAndFastenerAccepted:false},{approvedProjectReference:''},{approvedPointLayoutSha256:'not-a-captured-checksum'},{panels:[]}])assert.throws(()=>count({...x,...patch} as FacadeApprovedPanelScheduleR3),{code:'PARAMETER_VALIDATION_FAILED'});
 });
 test('duplicate IDs and missing point roles cannot inflate approved quantities',()=>{
  const x=capture('hpl-rivet8-aluminium',2,8);
  assert.throws(()=>count({...x,panels:[x.panels[0]!,x.panels[0]!]}),{code:'PARAMETER_VALIDATION_FAILED'});
  assert.throws(()=>count({...x,panels:[{...x.panels[0]!,points:[x.panels[0]!.points[0]!,x.panels[0]!.points[0]!]}]}),{code:'PARAMETER_VALIDATION_FAILED'});
 });
 test('no preset object facts, stock quantities, labour norm or whole-facade FULL',()=>{
  for(const key of ['hpl-rivet8-aluminium','fibre-cement-uni8'] as const){
   const d=build(key);assert(d.parameters.every(p=>p.default_value===null));
   assert.equal(d.parameters.filter(p=>p.parameter_id.startsWith('panel_fixing_unknown_')).length,7);
   assert(d.resources.every(r=>r.source_metadata?.full_technical_acceptance===false));
   assert(!d.resources.some(r=>r.category==='labor'&&r.resource_graph.costTreatment==='OWN_COST'));
  }
 });
});

for(const key of ['fibre-cement-uni8','hpl-rivet8-aluminium'] as const)test(key+' existing bounded component retains all shared operations with one owner',()=>{
 const d=build(key);
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
 const definition=build('fibre-cement-uni8');
 return compileCanonicalEstimateCore({operation:'recalculate',catalogId:'INTERNAL_COMPONENT_NOT_PUBLIC_CATALOG',compilerVersion:'TEST_ONLY_EXISTING_COMPONENT_READBACK_BOUNDARY',primaryMeasureParameterId:'panel_fixing_scheduled_panel_count',parameterDefinitions:[...definition.parameters],formulaDefinitions:[...definition.formulas],resourceDefinitions:[...definition.resources],submittedParameters,confirmedParameters,priceItems:[],currencyCode:'KGS',maximumResourceRows:definition.resources.length,hashJson:hash});
};
test('existing imported schedule and passport facts stay outside ordinary inputs and reject raw authority echoes',async()=>{
 const definition=build('fibre-cement-uni8'),confirmed:Record<string,unknown>={panel_fixing_scheduled_panel_count:'1',panel_fixing_actual_total_points:'8',panel_fixing_approved_project:'TEST_ONLY imported approved project',panel_fixing_layout_sha256:'a'.repeat(64),panel_fixing_exact_source:source.profiles[0]!.source.sha256};
 assert.deepEqual(definition.parameters.filter(parameter=>parameter.truth_metadata.visibility_role==='USER_INPUT').map(parameter=>parameter.parameter_id),[]);
 assert.deepEqual(definition.ordinaryParameterIds,[]);
 for(const key of ['panel_fixing_scheduled_panel_count','panel_fixing_actual_total_points','panel_fixing_approved_project','panel_fixing_exact_source']){
  const parameter=definition.parameters.find(parameter=>parameter.parameter_id===key);assert(parameter);
  assert.equal(parameter.truth_metadata.visibility_role,'INTERNAL_ONLY');assert.equal(consumerInputRole(parameter.truth_metadata.provenance),'APPLICATION_TECHNICAL');
  for(const value of [confirmed[key],null,undefined])await assert.rejects(()=>trustedReadbackCore({...{},[key]:value},confirmed),{code:'PARAMETER_VALIDATION_FAILED'});
 }
});
test('missing imported schedule or PPR never yields a zero quantity or complete equipment provision',async()=>{
 const result=await trustedReadbackCore({},{});
 assert(result.preliminaryNeeds.length>0);assert(result.preliminaryNeeds.every(need=>need.quantity===null));
 assert(!result.rows.some(row=>row.included_in_estimate||row.included_in_procurement));
});


// Exact original-profile provenance only. No calculation, norm or owner delta.
describe('panel original profile provenance R5',()=>{
 for(const profile of source.profiles)test(profile.key+' keeps exact source identity on both point roles',()=>{
  const key=profile.key as FacadePanelFaceFixingKeyR3,model=build(key);
  for(const role of ['fixed','sliding']){
   const row=model.resources.find(row=>row.row_id===profile.prefix+':'+role);assert(row&&row.source_metadata);
   const trace:unknown=row.source_metadata.normativeTrace;assert(Array.isArray(trace));assert.equal(trace.length,1);
   const item:unknown=trace[0];assert(item!==null&&typeof item==='object'&&!Array.isArray(item));
   assert('sourceId'in item&&'source_artifact_sha256'in item);
   assert.equal(item.sourceId,'gox_facade_panel_face_fixing_r3_'+profile.key);
   assert.equal(item.source_artifact_sha256,profile.source.sha256);
   assert.notEqual(item.sourceId,'gox_facade_panel_face_fixing_r3_'+role);
   assert.equal(row.procurement_eligible,true);assert.equal(row.cost_owner_id,row.row_id);
  }
  const needs=model.resources.filter(row=>row.row_id.startsWith(profile.prefix+':need:'));
  assert.equal(needs.length,source.protectedNeeds.length);
  assert(needs.every(row=>{const metadata=row.source_metadata;if(!metadata)return false;const trace:unknown=metadata.normativeTrace;return Array.isArray(trace)&&trace.length===0;}));
 });
});
