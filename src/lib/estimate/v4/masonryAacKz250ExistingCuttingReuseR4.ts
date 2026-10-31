import cutting from '../../../../data/estimate-benchmarks/source-packs/masonry-aac-cutting-mbs510-r1.json';
import {MASONRY_AAC_KZ250_WHOLE_R4 as whole} from './masonryAacKz250WholeCycleR4';
import {buildMasonryAacKz250CurrentCardSuccessorR4,masonryAacExactV5ParentR4,MASONRY_AAC_KZ250_PRIMARY_AREA_R4} from './masonryAacKz250CurrentCardR4';
import {buildMasterParameterCalculationConsumers} from '../backendPlatform/canonicalDefinitionParameterConsumersR1';
import {canonicalEstimateOperationReferences} from '../backendPlatform/canonicalEstimateOperationComposition';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';
import type {PurchaseGroupRepresentative as Rep} from '../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';

type Json=Record<string,unknown>;
const key=(value:string)=>'aac_cut_'+value.replaceAll('-','_')+'_r1';
const row=(value:string)=>cutting.prefix+':'+value;
const selected={kind:'selected',parameterId:whole.selectorId,value:whole.selectorValue};
const cutSelected={kind:'selected',parameterId:cutting.selectorId,value:cutting.selectorValue};
const active={kind:'and',operands:[selected,cutSelected,{kind:'formula_greater_than',expression:MASONRY_AAC_KZ250_PRIMARY_AREA_R4,unitId:'m2',value:0}]};
const check=(value:unknown,code:string):void=>{if(!value)throw Error('AAC_KZ250_EXISTING_CUTTING_R4_'+code);};
const object=(value:unknown):Json=>{check(value!=null&&typeof value==='object'&&!Array.isArray(value),'OBJECT_REQUIRED');return value as Json;};
const rehash=(resource:Rep['resources'][number]):Rep['resources'][number]=>{const {row_sha256:_old,...body}=resource;return {...body,row_sha256:hash(body)};};
export const MASONRY_AAC_KZ250_CUTTING_OPERATION_R4=whole.prefix+':operation:sawing-fitting';

/** Reattach the captured whole physical cutting component in place. A known
 * assembly is not manufacturer proof that this block fits, a consumption
 * norm, a commercial package, or a second paid cutting crew. */
export function buildMasonryAacKz250ExistingCuttingReuseR4(parent:Rep):Rep{
 const result=buildMasonryAacKz250CurrentCardSuccessorR4(parent),captured=masonryAacExactV5ParentR4();
 const expectedKeys=[...cutting.roster.map(part=>part.key),'actual-unit-gate',...cutting.internalGaps.map(gap=>'need:'+gap.key)];
 const sourceRows=captured.resources.filter(resource=>resource.row_id.startsWith(cutting.prefix+':'));
 check(sourceRows.length===expectedKeys.length&&expectedKeys.every(value=>sourceRows.some(resource=>resource.row_id===row(value))),'EXACT_CAPTURED_WHOLE_COMPONENT');
 check(cutting.source.sha256==='67ba30f5c89a62af6d06af6ffabb84d96c84f0b16851af0bab761b9830183f44'&&cutting.equipmentFitSource.sha256==='f503948988703a152df4b297d82ee947594b7c931e9d165f592dac927ef15519','EXACT_MANUFACTURER_SOURCE');
 check(cutting.full===0&&cutting.wholeOrganization.dimensionAxisNotInferred,'MANUFACTURER_AXIS_GAP_RETAINED');
 const mainOwner=whole.prefix+':main-labour',main=result.resources.find(resource=>resource.row_id===mainOwner);
 const sawing=canonicalEstimateOperationReferences(main?.resource_graph.operationCompositionV1).find(reference=>reference.operationId===MASONRY_AAC_KZ250_CUTTING_OPERATION_R4);
 check(sawing,'EXISTING_SOURCE_SAWING_OPERATION');
 const projectIds=new Set(cutting.projectFacts.map(fact=>key(fact.key+'_reference'))),conditionIds=new Set(cutting.conditionFacts.map(fact=>key(fact.key)));
 const numericIds=new Set([key('workpiece_height'),key('workpiece_mass')]);
 const gapIds=new Set(cutting.internalGaps.map(gap=>key('unresolved_'+gap.key)));
 const componentIds=new Set([cutting.selectorId,...projectIds,...conditionIds,...numericIds,...gapIds]);
 check(componentIds.size===26&&[...componentIds].every(id=>result.parameters.some(parameter=>parameter.parameter_id===id)),'EXACT_CAPTURED_PARAMETERS');
 for(const parameter of result.parameters.filter(parameter=>componentIds.has(parameter.parameter_id))){
  const oldTruth=structuredClone(parameter.truth_metadata),isSelector=parameter.parameter_id===cutting.selectorId;
  const isGap=gapIds.has(parameter.parameter_id);
  // No source quantity, passport or worksite document becomes a consumer
  // question. The ordinary successor still exposes only four measurements.
  const role=isGap?'UNRESOLVED_APPLICATION_NORM':isSelector?'SOURCE_BACKED_PRELIMINARY_PROFILE':numericIds.has(parameter.parameter_id)?'SITE_SURVEY':projectIds.has(parameter.parameter_id)&&parameter.parameter_id===key('machine-passport_reference')?'SELECTED_EQUIPMENT_PASSPORT':'PROJECT_DOCUMENTATION';
  parameter.required=false;parameter.default_value=null;
  parameter.truth_metadata={...oldTruth,visibility_role:'INTERNAL_ONLY',value_source_role:role,visible_when:{kind:'literal',value:false},provenance:{...object(oldTruth.provenance??{}),consumer_input_role_v1:'APPLICATION_TECHNICAL',capturedCuttingSourceBoundaryV1:{definitionId:parent.definition.id,truthMetadata:oldTruth}},guide:{...object(oldTruth.guide),source_role:role,guide_short_ru:isGap?'Неизвестная норма приложения остаётся незаполненной; паспортный пробел не подтверждается пользовательским вводом.':isSelector?'Приложение связывает существующий режущий узел с кладкой. Выбор не утверждает допуск заготовки в рабочую зону.':'Отдельный проверенный документ или обмер фактического режущего узла; обычная форма этого не запрашивает.'}};
  if(isSelector){
   const priorForbidden=parameter.constraints_json.forbiddenWhen;
   parameter.constraints_json={...parameter.constraints_json,...(priorForbidden?{forbiddenWhen:{kind:'and',operands:[priorForbidden,{kind:'not',operand:selected}]}}:{})};
  }else if(!isGap){
   const priorRequired=parameter.constraints_json.requiredWhen;
   parameter.constraints_json={...parameter.constraints_json,requiredWhen:priorRequired?{kind:'or',operands:[priorRequired,active]}:active};
  }
 }
 result.resources=result.resources.map(resource=>{
  if(!resource.row_id.startsWith(cutting.prefix+':'))return resource;
  const original=sourceRows.find(source=>source.row_id===resource.row_id)!;
  check(resource.formula_id===original.formula_id&&resource.unit_id===original.unit_id&&resource.cost_owner_id===original.cost_owner_id&&resource.resource_graph.costTreatment==='INFORMATIONAL_SCOPE'&&!resource.procurement_eligible,'UNCHANGED_PHYSICAL_OWNER');
  const suffix=resource.row_id.slice(cutting.prefix.length+1),gap=cutting.internalGaps.find(gap=>'need:'+gap.key===suffix);
  const condition=gap&&gap.condition!=='always'?cutting.conditionFacts.find(fact=>fact.condition===gap.condition):undefined;
  check(!gap||gap.condition==='always'||condition,'EXACT_CONDITION_REQUIRED');
  const kzInclusion=condition?{kind:'and',operands:[active,{kind:'equals',parameterId:key(condition.key),value:condition.trigger}]}:active;
  const operation=object(resource.resource_graph.operationCompositionV1),related=Array.isArray(operation.additionalOperations)?operation.additionalOperations:[];
  const graph={...resource.resource_graph,operationCompositionV1:{...operation,groupId:whole.prefix,groupTitleRu:whole.titleRu,additionalOperations:[...related,{operationId:sawing!.operationId,operationTitleRu:sawing!.operationTitleRu,completionCriterionRu:sawing!.completionCriterionRu,processOrdinal:sawing!.processOrdinal,whenResourcePresent:[mainOwner]}]}};
  if(suffix==='need:workpiece-axis-authority')Object.assign(graph,{scopeRequirementV1:{contractVersion:'canonical-scope-requirement/v1',kind:'OBJECT_SCOPE',groupId:whole.prefix,groupTitleRu:whole.titleRu,titleRu:resource.title_ru,reasonRu:'Высота и масса сами по себе не доказывают, что блок в принятой ориентации помещается в рабочую зону. Требуется точный чертёж или разъяснение изготовителя; ссылка на проект раскроя не заменяет его.',exactScopeWhen:active,sourceEvidence:[{sha256:cutting.source.sha256,locator:gap!.locator}],coveringRowIds:[],originalRowIds:[mainOwner],objectFactParameterId:cutting.selectorId,unknownObjectValues:[cutting.noPostValue],objectFactMode:'PROJECT_APPLICABILITY_ONLY',requiredFactParameterIds:[key('unresolved_workpiece-axis-authority')]}});
  return rehash({...resource,inclusion_ast:{kind:'or',operands:[resource.inclusion_ast,kzInclusion]},resource_graph:{...graph,kz250ExistingWholePhysicalReuseR4:{capturedDefinitionId:parent.definition.id,sourceOperationId:sawing!.operationId,paidMainLabourOwnerRowId:mainOwner,secondPaidCuttingNormAdded:false,operatorCountNotHours:true,manufacturerWorkEnvelopeUnresolved:true,knownComponentsNotWholeAcceptance:true,sourceMaterialUnchanged:true}}});
 });
 const consumers=buildMasterParameterCalculationConsumers(result);
 for(const parameter of result.parameters){const id=parameter.parameter_id;parameter.truth_metadata={...parameter.truth_metadata,formula_consumers:consumers.formulaConsumers[id],resource_branch_consumers:consumers.resourceConsumers[id]};result.baseline.formula_consumer_ids[id]=consumers.formulaConsumers[id];result.baseline.resource_consumer_row_ids[id]=consumers.resourceConsumers[id];}
 for(const resource of result.resources.filter(resource=>resource.row_id.startsWith(cutting.prefix+':')))check(canonicalEstimateOperationReferences(resource.resource_graph.operationCompositionV1).some(reference=>reference.groupId===whole.prefix&&reference.operationId===sawing!.operationId),'ACTUAL_PROJECTOR_REFERENCE');
 result.definition.applicability={...result.definition.applicability,masonryAacKz250ExistingCuttingReuseR4:{contract:'masonry-aac-kz250-existing-cutting-reuse/r4',retainedPhysicalRowIds:sourceRows.map(resource=>resource.row_id),sourceManagedParameterIds:[...componentIds],newRows:0,newNorms:0,newPaidOwners:0,manufacturerWorkEnvelopeUnresolved:true,wholeCuttingReady:false}};
 result.passport.decision={...result.passport.decision,completeTechnicalEstimateAccepted:false,technicalScopeStatus:'NEEDS_SOURCE',masonryAacKz250ExistingCuttingReuseR4:{wholePhysicalSourceReused:true,sourceOwnerId:cutting.sourceId,paidOwnerId:mainOwner,full:0,closedPhysicalNeeds:0,manufacturerWorkEnvelopeUnresolved:true}};
 return result;
}
