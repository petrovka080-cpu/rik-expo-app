import {masonryGlassBlockNormalDefinitionR103,masonryGlassBlockNormalSourceR103,
 type MasonryGlassBlockCardKeyR103,type MasonryGlassBlockNormalModelR103} from './masonryGlassBlockNormalCardsR103';
import {canonicalEstimateOperationReferences,type CanonicalEstimateOperationReference}
 from '../backendPlatform/canonicalEstimateOperationComposition';
import {buildMasterParameterCalculationConsumers} from '../backendPlatform/canonicalDefinitionParameterConsumersR1';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';
import {canonicalDefinitionPublicationStableValueR1 as stable}
 from '../backendPlatform/canonicalDefinitionPublicationStableValueR1';

type Json=Record<string,unknown>;
type Related=NonNullable<CanonicalEstimateOperationReference['additionalOperations']>[number];
const record=(v:unknown):v is Json=>v!==null&&typeof v==='object'&&!Array.isArray(v);
function check(v:unknown,c:string):asserts v{if(!v)throw Error('GLASS_M25_DISPLAY_R152_'+c);}
const same=(a:unknown,b:unknown)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
export type MasonryGlassM25OperationModelR152=MasonryGlassBlockNormalModelR103&Readonly<{
 changedM25RowIds:readonly string[];additionalOperationReferenceCount:number;
 changedLabourRowIds:readonly string[];completedExistingLabourReferenceCount:number;
}>;

/** Same native M25 row shown at each included source operation that uses it.
 * No quantity allocation, copied material row, additional paid owner or new
 * norm. Opening-fill source has no pointing operation: it is not invented.
 * R154 completes the same required reader field on existing whole-labour
 * related references using their own included source markers, without new IDs.
 * This module is reached through backend Config; no client import is added. */
export function masonryGlassM25OperationDefinitionR152(key:MasonryGlassBlockCardKeyR103):MasonryGlassM25OperationModelR152{
 const parent=masonryGlassBlockNormalDefinitionR103(key),profiles=masonryGlassBlockNormalSourceR103.profiles.filter(p=>p.physicalResult===key);
 check(profiles.length===2,'EXISTING_TWO_PROFILES');
 const changed:string[]=[],labourChanged:string[]=[];let references=0,labourReferences=0;
 const resources=parent.resources.map(row=>{
  const labour=profiles.find(p=>row.row_id===p.prefix+':whole-labour');
  if(labour){
   const composition=row.resource_graph.operationCompositionV1;check(record(composition),'EXISTING_LABOUR_COMPOSITION');
   const related=composition.additionalOperations;check(Array.isArray(related),'EXISTING_LABOUR_REFS');
   check(related.length===labour.operations.length-1,'EXISTING_OWN_LABOUR_OPERATIONS');
   const primary=canonicalEstimateOperationReferences(composition)[0];check(primary,'EXISTING_LABOUR_OWNER');
   const complete=related.map((value:unknown)=>{
    check(record(value)&&typeof value.operationId==='string','EXISTING_LABOUR_RELATED_ID');
    check(value.completionCriterionRu===undefined,'ONLY_PROVEN_MISSING_CRITERION_REPAIR');
    const operationId=value.operationId;
    const marker=parent.resources.find(r=>r.row_id===operationId);check(marker,'EXISTING_INCLUDED_MARKER');
    const reference=canonicalEstimateOperationReferences(marker.resource_graph.operationCompositionV1)[0];
    check(reference&&reference.groupId===primary.groupId,'SAME_LABOUR_SOURCE_GROUP');
    return{...value,completionCriterionRu:reference.completionCriterionRu};
   });
   labourChanged.push(row.row_id);labourReferences+=complete.length;
   const{row_sha256:_old,...body}=row;
   const next={...body,resource_graph:{...row.resource_graph,operationCompositionV1:{...composition,additionalOperations:complete}}};
   return{...next,row_sha256:hash(next)};
  }
  const profile=profiles.find(p=>row.row_id===p.prefix+':ready-cement-lime-m25');if(!profile)return row;
  const source=profile.rows.find(r=>r.key==='ready-cement-lime-m25');
  check(source?.resourceCode==='03-0405-0002'&&source.unitId==='m3'&&source.ratePer100M2==='0.74','EXACT_OWN_M25');
  check(row.unit_id==='m3'&&row.resource_graph.costTreatment==='INFORMATIONAL_SCOPE'&&!row.procurement_eligible,'UNCHANGED_COMMERCIAL_BOUNDARY');
  const composition=row.resource_graph.operationCompositionV1;check(record(composition),'EXISTING_COMPOSITION');
  const old=canonicalEstimateOperationReferences(composition);
  check(old.length===1&&old[0]!.operationId===profile.prefix+':operation:assemble','GAP_NOT_ALREADY_FIXED');
  const extra:Related[]=profile.operations.filter(op=>op.key!=='assemble').map(op=>{
   const marker=parent.resources.find(r=>r.row_id===profile.prefix+':operation:'+op.key);check(marker,'EXISTING_SOURCE_MARKER');
   const reference=canonicalEstimateOperationReferences(marker.resource_graph.operationCompositionV1)[0];
   check(reference&&reference.groupId===old[0]!.groupId,'SAME_OPERATION_GROUP');
   return{operationId:reference.operationId,operationTitleRu:reference.operationTitleRu,
    completionCriterionRu:reference.completionCriterionRu,processOrdinal:reference.processOrdinal,
    whenResourcePresent:[marker.row_id]};
  });
  check(extra.length===(key==='partition'?2:1),'ONLY_OWN_INCLUDED_OPERATIONS');
  changed.push(row.row_id);references+=extra.length;
  const{row_sha256:_old,...body}=row;
  const next={...body,resource_graph:{...row.resource_graph,
   operationCompositionV1:{...composition,additionalOperations:extra}}};
  return{...next,row_sha256:hash(next)};
 });
 check(changed.length===2&&labourChanged.length===2&&resources.length===parent.resources.length,'FOUR_EXISTING_ROWS_NOT_NEW_ROWS');
 for(const before of parent.resources){const after=resources.find(r=>r.row_id===before.row_id);check(after,'EXISTING_IDS');
  for(const field of ['row_id','formula_id','unit_id','cost_owner_id','procurement_eligible','inclusion_ast','source_metadata'] as const)
   check(same(after[field],before[field]),'PROTECTED_FIELD:'+before.row_id+':'+field);
  if(labourChanged.includes(before.row_id)){
   const{operationCompositionV1:_oldOperation,...beforeGraph}=before.resource_graph;
   const{operationCompositionV1:_newOperation,...afterGraph}=after.resource_graph;
   check(same(afterGraph,beforeGraph),'LABOUR_ONLY_REFERENCE_CRITERION_REPAIR');
  }else if(!changed.includes(before.row_id))check(same(after,before),'UNRELATED_ROW_UNCHANGED');
 }
 check(same(buildMasterParameterCalculationConsumers(parent),
  buildMasterParameterCalculationConsumers({parameters:parent.parameters,formulas:parent.formulas,resources})),'NO_PARAMETER_CONSUMER_CHANGE');
 return{...parent,resources,changedM25RowIds:changed,additionalOperationReferenceCount:references,
  changedLabourRowIds:labourChanged,completedExistingLabourReferenceCount:labourReferences};
}
