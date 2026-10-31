import whole from '../../../../data/estimate-benchmarks/source-packs/masonry-ceramic250-whole-family-composition-r2.json';
import flow from '../../../../data/estimate-benchmarks/source-packs/masonry-ready-m50-whole-supply-cycle-r2.json';
import {canonicalEstimateOperationReference,canonicalEstimateOperationReferences} from '../backendPlatform/canonicalEstimateOperationComposition';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';
import type {PurchaseGroupRepresentative as Rep} from '../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';

export const MASONRY_CERAMIC250_RELATED_CONSUMER_GATES_R4='masonry-ceramic250-related-consumer-gates/r4';
const check=(value:unknown,code:string):void=>{if(!value)throw Error('MASONRY_BRICK_RELATED_GATES_R4_'+code);};
const same=(left:unknown,right:unknown)=>JSON.stringify(left)===JSON.stringify(right);

/** These are the saved whole physical declarations, never a new inventory,
 * productivity norm, procurement owner or payment allocation. */
export function masonryCeramic250PhysicalRelatedConsumersR4(){
 return[
  ...flow.roster.map(item=>({rowId:flow.prefix+':'+item.key,operationIds:item.operations.map(key=>flow.prefix+':operation:'+key)})),
  ...whole.stock.map(item=>({rowId:whole.prefix+':'+item.key,operationIds:item.operationKeys.map(key=>whole.prefix+':operation:'+key)})),
 ];
}

/** The existing projector already honours marker-presence gates. Apply that
 * same saved contract to the brick physical roster's related displays only.
 * The primary owner, source quantity and actual-object requirements remain. */
export function applyMasonryCeramic250RelatedConsumerGatesR4(parent:Rep):Rep{
 check(parent.definition.id===whole.parent.definitionId&&parent.definition.definition_version===whole.parent.version
  &&parent.definition.definition_sha256===whole.parent.definitionSha256,'EXACT_PARENT');
 const declarations=masonryCeramic250PhysicalRelatedConsumersR4();
 check(declarations.length===38&&new Set(declarations.map(value=>value.rowId)).size===38,'EXACT_WHOLE_DECLARATIONS');
 const declared=new Map(declarations.map(value=>[value.rowId,value]));
 const byId=new Map(parent.resources.map(resource=>[resource.row_id,resource]));
 const result=structuredClone(parent),changedRows:string[]=[];
 result.resources=result.resources.map(resource=>{
  const expected=declared.get(resource.row_id);if(!expected)return resource;
  check(resource.resource_graph.costTreatment==='INFORMATIONAL_SCOPE'&&resource.procurement_eligible===false
   &&resource.source_metadata.sourceInventoryNotConsumption===true,'SOURCE_PHYSICAL_OWNER:'+resource.row_id);
  const primary=canonicalEstimateOperationReference(resource.resource_graph.operationCompositionV1);
  check(primary?.groupId===whole.operationGroup.id,'EXACT_PRIMARY_GROUP:'+resource.row_id);
  if(!primary)throw Error('MASONRY_BRICK_RELATED_GATES_R4_PRIMARY_REQUIRED');
  const references=canonicalEstimateOperationReferences(primary);
  check(same(references.map(reference=>reference.operationId),expected.operationIds),'EXACT_SOURCE_CONSUMERS:'+resource.row_id);
  check(Array.isArray(primary.additionalOperations)&&primary.additionalOperations.length===expected.operationIds.length-1,'EXACT_RELATED_COUNT:'+resource.row_id);
  let changed=false;
  const related=primary.additionalOperations!.map(reference=>{
   const marker=byId.get(reference.operationId),markerReference=canonicalEstimateOperationReference(marker?.resource_graph.operationCompositionV1);
   check(markerReference?.operationId===reference.operationId&&markerReference.groupId===primary.groupId,'EXACT_MARKER:'+reference.operationId);
   if(reference.whenResourcePresent!==undefined){check(same(reference.whenResourcePresent,[reference.operationId]),'EXISTING_GATE_DRIFT:'+resource.row_id);return reference;}
   changed=true;return{...reference,whenResourcePresent:[reference.operationId]};
  });
  check(changed,'SOURCE_ALREADY_GATED:'+resource.row_id);changedRows.push(resource.row_id);
  const{row_sha256:_old,...body}=resource;
  const updated={...body,resource_graph:{...resource.resource_graph,operationCompositionV1:{...primary,additionalOperations:related}}};
  return{...updated,row_sha256:hash(updated)};
 });
 check(changedRows.length===38,'ALL_WHOLE_PHYSICAL_OWNERS');
 check(same(result.formulas,parent.formulas)&&same(result.parameters,parent.parameters)
  &&same(result.baseline,parent.baseline)&&same(result.bindings,parent.bindings),'UNCHANGED_QUANTITIES_SOURCES_AND_BINDINGS');
 result.definition.applicability={...result.definition.applicability,masonryCeramic250RelatedConsumerGatesR4:{
  contract:MASONRY_CERAMIC250_RELATED_CONSUMER_GATES_R4,changedSharedOwnerRows:changedRows,
  primaryOwnersPreserved:true,newPaidOwners:0,newProcurementOwners:0,wholeTechnicalAcceptance:false}};
 return result;
}
