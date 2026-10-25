// Pure admission and delta guard. The existing Master publisher remains the only writer.
import {createHash} from 'node:crypto';
import {canonicalDefinitionPublicationStableValueR1 as stable} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionPublicationStableValueR1';
import {canonicalEstimateOperationReferences} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition';
import type {MasterRetainedParentCaptureR1} from './masterSingleDefinitionRetainParentBindingsR1';
type Json=Record<string,any>;
export type MasterOperationCompositionOnlyR1=Readonly<{
  contract:'master-operation-composition-only/r1';
  capturedContentPassport:Json; capturedContentPassportSha256:string;
  operationByRowId:Readonly<Record<string,Json>>; operationMapSha256:string;
}>;
const anchors:Readonly<Record<string,readonly[string,string]>>={
  'canonical-work:base:paving_roads_landscape_interior_asphalt_level_standard':[
    'dc4793f44bbeb7098a6cca4c5e40fac94eb1dd9815a890fd7ae4097f8d35b481','ba6162e806e363867fa38064b40ab1edda26d7c54422f62fbed3d9b49e8eb24d'],
  'canonical-work:base:paving_roads_landscape_interior_asphalt_compact_standard':[
    '72e638685b51fe76eb80fafb0241c30bcb61ec775fb3d14c90978d1af32a81ff','c506f71b14034d18ddf279923efcd4ec5c6c58bcb76bf6e2d319fc74391e5b69'],
  'canonical-work:expanded:bridge_asphalt':[
    'fb1a1131bf9d4305e346e887963639ca7dbf0d0e52a17b830252e9083e478617','e904a0c9902e09bd46bea995a706c906410c34bdf9228a8f7b5a498faab8b3e4'],
};
const encoded=(v:unknown)=>JSON.stringify(stable(JSON.parse(JSON.stringify(v))));
export const masterOperationValueSha256R1=(v:unknown)=>createHash('sha256').update(encoded(v)).digest('hex');
const same=(a:unknown,b:unknown)=>encoded(a)===encoded(b);
const object=(v:unknown):v is Json=>v!=null&&typeof v==='object'&&!Array.isArray(v);
const omit=(v:Json,keys:readonly string[])=>Object.fromEntries(Object.entries(v).filter(([key])=>!keys.includes(key)));
function check(v:unknown,code:string):asserts v {if(!v)throw Error('MASTER_OPERATION_ONLY_'+code);}
export function assertMasterOperationCompositionDeclarationR1(input:Readonly<{
  catalogId:string;capture:MasterRetainedParentCaptureR1;captureSha256:string;mode:MasterOperationCompositionOnlyR1;
  newParameterSources:unknown;
}>):void{
  const {capture:c,mode:m}=input,anchor=anchors[input.catalogId];
  check(object(m)&&same(Object.keys(m).sort(),['contract','capturedContentPassport','capturedContentPassportSha256','operationByRowId','operationMapSha256'].sort())
    &&m.contract==='master-operation-composition-only/r1','DECLARATION');
  check(anchor&&anchor[0]===input.captureSha256&&anchor[1]===m.capturedContentPassportSha256
    &&masterOperationValueSha256R1(m.capturedContentPassport)===anchor[1],'REVIEWED_PARENT_AND_PASSPORT');
  check(m.capturedContentPassport.definition_version_id===c.definition.id
    &&m.capturedContentPassport.catalog_id===input.catalogId
    &&m.capturedContentPassport.identity_mode==='WORK'&&m.capturedContentPassport.redirect_catalog_id===null,'PASSPORT_ANCHOR');
  check(same(input.newParameterSources,{})&&!Object.hasOwn(c.definition.source_metadata,'operationCompositionSuccessorV1'),'NO_NEW_QUANTITY_OR_COLLIDING_SLOT');
  check(object(m.operationByRowId)&&same(Object.keys(m.operationByRowId).sort(),c.resources.map(r=>r.row_id).sort())
    &&masterOperationValueSha256R1(m.operationByRowId)===m.operationMapSha256,'EXACT_ROW_MAP');
  const ids=new Set(c.resources.map(r=>r.row_id));
  const stageKeys=['operationId','operationTitleRu','completionCriterionRu','processOrdinal','processRole','whenResourcePresent'];
  const stages=new Map<string,string>();
  for(const operation of Object.values(m.operationByRowId)){
    check(object(operation)&&Object.keys(operation).every(k=>['contractVersion','groupId','groupTitleRu','additionalOperations',...stageKeys].includes(k)),'OPERATION_KEYS');
    const related=operation.additionalOperations;
    check(related===undefined||(Array.isArray(related)&&related.length<=64&&related.every(v=>object(v)&&Object.keys(v).every(k=>stageKeys.includes(k)))),'RELATED_SHAPE');
    const refs=canonicalEstimateOperationReferences(operation);
    check(refs.length===1+(related?.length??0),'NO_IGNORED_OR_DUPLICATE_REFERENCE');
    for(const ref of refs){
      check(ref.processRole===undefined||['PROCESS','REFERENCE_ONLY','COST_SUMMARY'].includes(ref.processRole),'PROCESS_ROLE');
      check(ref.processOrdinal===undefined||(Number.isInteger(ref.processOrdinal)&&ref.processOrdinal>=0),'PROCESS_ORDINAL');
      check(ref.whenResourcePresent===undefined||ref.whenResourcePresent.every(id=>ids.has(id)),'RESOURCE_GATE_CLOSURE');
      const key=encoded([ref.groupId,ref.operationId]),value=encoded([ref.groupTitleRu,ref.operationTitleRu,ref.processRole,ref.processOrdinal,ref.completionCriterionRu]);
      check(!stages.has(key)||stages.get(key)===value,'CONFLICTING_STAGE');stages.set(key,value);
    }
  }
}
export function assertMasterOperationCompositionComputationR1(c:MasterRetainedParentCaptureR1,m:MasterOperationCompositionOnlyR1,
  next:Readonly<{parameters:readonly Json[];formulas:readonly Json[];resources:readonly Json[]}>,phase:'REPRESENTATIVE'|'PLAN'):void{
  for(const [kind,idKey]of [['parameters','parameter_id'],['formulas','formula_id'],['resources','row_id']]as const){
    check(next[kind].length===c[kind].length&&new Set(next[kind].map(r=>r[idKey])).size===c[kind].length,'NO_ADDED_OR_REMOVED_'+kind);
    for(const old of c[kind]){
      const actual=next[kind].find(r=>r[idKey]===old[idKey]);check(actual,'MISSING_'+kind);
      if(phase==='REPRESENTATIVE'){
        const expected=kind==='resources'?{...old,resource_graph:{...old.resource_graph,operationCompositionV1:m.operationByRowId[old.row_id]}}:old;
        check(same(expected,actual),'REPRESENTATIVE_'+kind+'_DRIFT');
      }else{
        const keys=['definition_version_id','created_at',...(kind==='parameters'?['approved_template_baseline_id']:[]),...(kind==='resources'?['id','row_sha256']:[])];
        const expected=kind==='resources'?{...old,resource_graph:{...old.resource_graph,operationCompositionV1:m.operationByRowId[old.row_id]}}:old;
        check(same(omit(expected,keys),omit(actual,keys)),'PLAN_'+kind+'_DRIFT');
      }
    }
  }
}
export function masterOperationCompositionRepresentativeR1(c:MasterRetainedParentCaptureR1,m:MasterOperationCompositionOnlyR1,provenance:Json){
  check(provenance.parentDefinitionId===c.definition.id&&provenance.parentBaselineId===c.baseline.id,'SUCCESSOR_PARENT');
  return {bindings:c.bindings.map(b=>({row_id:c.resources.find(r=>r.id===b.resource_spec_id)!.row_id,locator_id:b.locator_id,applicability:b.applicability})),
    normativeSourceIds:c.baseline.normative_source_ids,
    sourceMetadata:{...c.definition.source_metadata,operationCompositionSuccessorV1:{...provenance,contract:m.contract,
      capturedContentPassportSha256:m.capturedContentPassportSha256,operationMapSha256:m.operationMapSha256,quantitySourcesChanged:false}},
    expectedNormativeBindingCount:c.bindings.length,normativeSourceClosure:c.normativeSources.map(s=>s.source_key)};
}
export function assertMasterOperationCompositionPlanR1(c:MasterRetainedParentCaptureR1,m:MasterOperationCompositionOnlyR1,
  plan:Readonly<{baseline:Json;definition:Json;passport?:Json}>):void{
  const old=c.baseline;
  const semantic=['input_values','input_classification','uom_by_parameter','formula_consumer_ids','resource_consumer_row_ids','normative_source_ids','guide_provenance_ru','proposal_source_refs','contract_version'];
  check(semantic.every(k=>same(plan.baseline[k],old[k])),'BASELINE_SEMANTICS');
  check(same(plan.definition.passport,c.definition.passport)&&same(plan.definition.applicability,c.definition.applicability),'DEFINITION_SCOPE');
  check(plan.passport&&same(omit(plan.passport,['definition_version_id','release_id','payload_sha256','source_head','source_tree','created_at']),
    omit(m.capturedContentPassport,['definition_version_id','release_id','payload_sha256','source_head','source_tree','created_at'])),'CONTENT_SCOPE_AND_READINESS');
}
