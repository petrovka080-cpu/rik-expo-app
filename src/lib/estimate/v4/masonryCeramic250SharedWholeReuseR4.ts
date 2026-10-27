import whole from '../../../../data/estimate-benchmarks/source-packs/masonry-ceramic250-whole-family-composition-r2.json';
import {buildMasonryCeramic250EffectiveLiftSuccessorR4} from './masonryM50EffectiveLiftCorrectionR4';
import {MASONRY_M50_WHOLE_CYCLE_R2 as flow} from './masonryReadyM50WholeSupplyCycleR2';
import {canonicalEstimateOperationReference,canonicalEstimateOperationReferences} from '../backendPlatform/canonicalEstimateOperationComposition';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';
import type {PurchaseGroupRepresentative as Rep} from '../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';
import type {CanonicalPublisherJson as Json} from '../../../../scripts/estimate/r4a13/canonicalDefinitionPublisherR1';

const check=(value:unknown,code:string):void=>{if(!value)throw Error('MASONRY_CERAMIC250_SHARED_WHOLE_REUSE_R4_'+code);};
const rehash=(resource:Json):Json=>{const {row_sha256:_old,...body}=resource;return {...body,row_sha256:hash(body)};};
export function masonryCeramic250SharedWholeConsumersR4(){
 return whole.sharedRetainedResourceUses.map(use=>({rowId:whole.operationGroup.id+':'+use.rowKey,operationIds:use.operations.map(key=>key.startsWith('m50:')?flow.prefix+':operation:'+key.slice(4):whole.prefix+':operation:'+key.slice(6))}));
}

/** Reuse the saved whole flow and its effective-quantity safety correction.
 * This delta repairs presentation relationships only. It creates no quantity,
 * purchase, payment, runtime profile or implicit project confirmation. */
export function buildMasonryCeramic250SharedWholeReuseR4(parent:Rep):Rep{
 const result=buildMasonryCeramic250EffectiveLiftSuccessorR4(parent);
 const retainedIds=new Set(parent.resources.map(resource=>resource.row_id));
 const declared=masonryCeramic250SharedWholeConsumersR4();
 const sourceOperations=new Map<string,ReturnType<typeof canonicalEstimateOperationReference>>();
 for(const resource of parent.resources){const operation=canonicalEstimateOperationReference(resource.resource_graph.operationCompositionV1);if(operation)sourceOperations.set(JSON.stringify([operation.groupId,operation.operationId]),operation);}
 const changed:string[]=[];
 result.resources=result.resources.map(resource=>{
  if(!retainedIds.has(resource.row_id)||!declared.some(use=>use.rowId===resource.row_id))return resource;
  const operation=resource.resource_graph.operationCompositionV1 as Json;
  let repaired=false;
  const related=(operation.additionalOperations??[]).map((reference:Json)=>{
   if(typeof reference.completionCriterionRu==='string'&&reference.completionCriterionRu.trim())return reference;
   check(reference.groupId==null||reference.groupId===operation.groupId,'FOREIGN_GROUP_REFERENCE');
   const existing=sourceOperations.get(JSON.stringify([operation.groupId,reference.operationId]));
   check(existing&&existing.operationTitleRu===reference.operationTitleRu,'SOURCE_OPERATION_COMPLETION_REQUIRED');
   repaired=true;
   return {...reference,completionCriterionRu:existing!.completionCriterionRu};
  });
  if(!repaired)return resource;
  changed.push(resource.row_id);
  return rehash({...resource,resource_graph:{...resource.resource_graph,operationCompositionV1:{...operation,additionalOperations:related}}});
 });
 // Call the real common reader. A payload additionalOperations array alone
 // never proves that an ordinary section can display the shared owner.
 for(const use of declared){
  const resource=result.resources.find(resource=>resource.row_id===use.rowId);
  check(resource,'SOURCE_OWNER_REQUIRED');
  const references=canonicalEstimateOperationReferences(resource!.resource_graph.operationCompositionV1);
  for(const operationId of use.operationIds)check(references.some(reference=>reference.groupId===whole.operationGroup.id&&reference.operationId===operationId),'ACTUAL_CONSUMER_REFERENCE_REQUIRED:'+operationId);
 }
 result.definition.applicability={...result.definition.applicability,masonryCeramic250SharedWholeReuseR4:{contract:'masonry-ceramic250-shared-whole-reuse/r4',correctedWholeFactoryReused:true,sourceOwnerConsumerMapReused:true,repairedInheritedOperationOwnerRows:changed,quantityOrPaymentChanged:false,wholeTechnicalAcceptance:false}};
 return result;
}
