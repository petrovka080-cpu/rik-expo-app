import {buildMasonrySilicate65M75CurrentCardR4,MASONRY_SILICATE65_M75_R4 as wall} from './masonrySilicate65M75CurrentCardR4';
import {buildMasonryBearingDpcLoosePartR4,MASONRY_BEARING_DPC_LOOSE_R4 as source} from './masonryBearingDpcLooseWholeMethodR4';
import {masonrySilicate65M75DpcIndependentCompletenessR4} from './masonrySilicate65M75DpcCompletenessR4';
import {buildAutomaticConstructionOwnerR1,type AutomaticParameterSpec,type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {buildMasterParameterCalculationConsumers} from '../backendPlatform/canonicalDefinitionParameterConsumersR1';
import {canonicalEstimateOperationReferences} from '../backendPlatform/canonicalEstimateOperationComposition';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';
import type {PurchaseGroupRepresentative as Rep} from '../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';
import type {CanonicalPublisherJson as Json} from '../../../../scripts/estimate/r4a13/canonicalDefinitionPublisherR1';
import type {CanonicalEstimateResourceDefinition} from '../backendPlatform/canonicalEstimateCompileCore';

type WholeDpcPart=Omit<ReturnType<typeof buildMasonryBearingDpcLoosePartR4>,'resources'>&{resources:readonly CanonicalEstimateResourceDefinition[]};

export const MASONRY_SILICATE65_DPC_REUSE_CONTRACT_R4='gox-build.masonry-silicate65-existing-dpc-reuse/r4';
export const MASONRY_SILICATE65_DPC_SCOPE_R4='ms75dpc_scope';
export const MASONRY_SILICATE65_DPC_LAYOUT_R4='ms75dpc_layout_ref';
export const MASONRY_SILICATE65_DPC_EXACT_SCOPE_R4='GROUND_CONTACT_STRAIGHT_UNPENETRATED_LOOSE_200MM';
const prefix='masonry:bearing-dpc:loose-polyolefin:r4',own='masonry:silicate65:m75:dpc-reuse:r4';
const L='m33_masonry_wall_length_m',scopeId=MASONRY_SILICATE65_DPC_SCOPE_R4,layoutId=MASONRY_SILICATE65_DPC_LAYOUT_R4;
const check=(value:unknown,code:string):void=>{if(!value)throw Error('MASONRY_SILICATE65_DPC_REUSE_R4_'+code);};
const object=(value:unknown):Record<string,unknown>=>{if(!value||typeof value!=='object'||Array.isArray(value))throw Error('MASONRY_SILICATE65_DPC_REUSE_R4_RECORD');return value as Record<string,unknown>;};
const decl=(value:Json):Json=>Object.fromEntries(Object.entries(value).filter(([key])=>!['id','definition_version_id','created_at','updated_at','row_sha256'].includes(key)));
const rehash=(value:Json):Json=>{const{row_sha256:_old,...body}=value;return{...body,row_sha256:hash(body)};};
const selected={kind:'selected',parameterId:wall.selectorId,value:wall.selectorValue};
const active={kind:'and',operands:[selected,{kind:'formula_greater_than',expression:wall.primaryId,unitId:'m3',value:0},{kind:'selected',parameterId:scopeId,value:MASONRY_SILICATE65_DPC_EXACT_SCOPE_R4}]};
const componentRows=['strip-installed','strip-gross-rolls','strip-offcuts','bed-mortar','installation-labour','measuring-cutting-tools','disposed-waste'] as const;

/** Linked continuation over immutable M75: reuse the whole existing seven-row
 * bounded DPC method. No bed, installation time, toolkit or disposal norm is
 * fabricated; actual source choice/layout are trusted object imports only.
 * This adapter does not close the original broad support/base requirement. */
export function buildMasonrySilicate65M75DpcReuseR4(parent:Rep):Rep{
 const result=buildMasonrySilicate65M75CurrentCardR4(parent),before=structuredClone(result),part:WholeDpcPart=buildMasonryBearingDpcLoosePartR4('0.25',L);
 const length=result.parameters.find(parameter=>parameter.parameter_id===L);check(length?.unit_id==='m'&&length.value_type==='decimal','EXISTING_LENGTH');
 check(part.resources.length===7&&part.wholeMethodOperations.length===4,'WHOLE_COMPONENT');
 check(componentRows.every(key=>part.resources.some(resource=>resource.row_id===prefix+':'+key)),'EXACT_COMPONENT_IDS');
 check(!result.resources.some(resource=>resource.row_id.startsWith(prefix+':')||resource.row_id.startsWith(own+':')),'ONCE_NO_EXISTING_BOUND_DPC_REWRITE');
 check(!result.parameters.some(parameter=>[scopeId,layoutId].includes(parameter.parameter_id)),'NEW_SOURCE_SCOPE_IDS');

 const facts:AutomaticParameterSpec[]=[{id:scopeId,title:'Привязанная проектная область отсечки капиллярной влаги у основания внутренней стены',valueType:'enum',unitId:null,kind:'ordinary',values:[MASONRY_SILICATE65_DPC_EXACT_SCOPE_R4,'NO_DPC_BY_ACTUAL_DESIGN','OTHER_DPC_METHOD_REQUIRED']},{id:layoutId,title:'Фактическая схема опирания и прямого участка отсечки влаги',valueType:'text',unitId:null,kind:'ordinary'}];
 const guardSpecs:AutomaticRowSpec[]=[{rowId:own+':actual-scope',formulaId:own+':formula:actual-scope',section:source.publicTitleRu,title:'Применимость прямой отсечки влаги к фактическому опиранию',category:'service',unitId:'set',expression:'0',inputParameterIds:[scopeId,layoutId],costTreatment:'INFORMATIONAL_SCOPE',procurement:false},{rowId:own+':whole-component',formulaId:own+':formula:whole-component',section:source.publicTitleRu,title:'Сохранность полного состава прямой отсечки влаги',category:'service',unitId:'set',expression:'0',costTreatment:'INFORMATIONAL_SCOPE',procurement:false}];
 const guards=buildAutomaticConstructionOwnerR1({contract:MASONRY_SILICATE65_DPC_REUSE_CONTRACT_R4,semanticOwner:own,sourceId:source.sourceId,normId:'EXISTING_OWN_MAKER_DPC_SCOPE_NOT_A_NEW_WALL_RATE',sourceMetadata:{source_title:source.publicTitleRu,source_document_version:'Existing own Germany TDS12.21,DoP2016 and captured maker application; no edition merging',definition_hash:source.sources[1]!.sha256,artifact_sha256:source.sources[1]!.sha256,exact_locator:'Own maker Application; direct straight unpierced loose200mm-lap method, W4-E; no source bed thickness/grade or labour rate'},applicabilityRu:'Только фактически подтверждённый прямой непрерывный участок опирания стены250мм в контакте с грунтом, без углов, ступеней и проходок. Типовое поле длины не выбирает эту область автоматически.',ordinary:facts,profile:[],conditional:[],rows:guardSpecs,deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:['No AAC.017 or M150/steel transfer','No .234wall mortar as a guessed DPC bed','No assumed31mm or universal meshkg','No whole support/structural scope closure','No duplicate paid mortar/labour or inventory purchase']});
 for(const parameter of [...part.parameters.filter(parameter=>parameter.parameter_id!==L),...guards.parameters]){
  check(!result.parameters.some(prior=>prior.parameter_id===parameter.parameter_id),'PARAMETER_COLLISION');
  const truth=parameter.truth_metadata,guide=object(truth.guide),provenance=object(truth.provenance??{}),constraints=object(parameter.constraints_json??{}),norm=truth.value_source_role==='UNRESOLVED_APPLICATION_NORM';
  check(norm||[scopeId,layoutId].includes(parameter.parameter_id),'EXACT_FOUR_NORMS_AND_TWO_OBJECT_FACTS');
  result.parameters.push({...decl(parameter),ordinal:result.parameters.length,required:false,default_value:null,constraints_json:norm?constraints:{...constraints,forbiddenWhen:{kind:'not',operand:selected}},truth_metadata:{...truth,visibility_role:'INTERNAL_ONLY',visible_when:{kind:'literal',value:false},value_source_role:norm?'UNRESOLVED_APPLICATION_NORM':'ENGINEERING_DESIGN',provenance:{...provenance,consumer_input_role_v1:'APPLICATION_TECHNICAL',dpcSourceChoiceNotGeometryDefault:true,carryForwardToOtherWallSourceProfile:false},guide:{...guide,source_role:norm?'UNRESOLVED_APPLICATION_NORM':'ENGINEERING_DESIGN',guide_short_ru:norm?'Неизвестная норма приложения остаётся незаполненной; проектный документ и ручной ноль её не заменяют.':'Отдельная фактическая схема и область опирания; обычная форма не запрашивает это техническое значение.'}}});
 }
 for(const formula of [...part.formulas,...guards.formulas])result.formulas.push({...decl(formula),ordinal:result.formulas.length});
 for(const resource of part.resources){
  check(resource.resource_graph.costTreatment==='INFORMATIONAL_SCOPE'&&resource.procurement_eligible===false,'NO_NEW_PAYMENT_OR_ORDER');
  const composition=object(resource.resource_graph.operationCompositionV1);
  result.resources.push(rehash({...decl(resource),ordinal:result.resources.length,inclusion_ast:active,resource_graph:{...resource.resource_graph,operationCompositionV1:{...composition,groupId:wall.groupId,groupTitleRu:wall.groupTitleRu},silicate65DpcExistingWholeReuseV1:{contract:MASONRY_SILICATE65_DPC_REUSE_CONTRACT_R4,wholeSevenRows:true,sourceOwnerId:resource.cost_owner_id,noOwnMortarOrLabourNorm:true,sourceFirstCourseNotReconciled:true}},source_metadata:structuredClone(resource.source_metadata)}));
 }
 const evidence=source.sources.map(item=>({path:item.path,sha256:item.sha256,locator:item.locator})),original=[wall.prefix+':ready-m75-mortar',wall.prefix+':main-labour'];
 const operation={contractVersion:'canonical-operation-resource/v1',groupId:wall.groupId,groupTitleRu:wall.groupTitleRu,operationId:prefix+':operation:accept-base',operationTitleRu:'Подготовка и приёмка опирания',processOrdinal:0,completionCriterionRu:'Привязана точная область и сохранён весь состав; неизвестная постель, труд, комплект и остатки не считаются закрытыми. Отсечка не разрешает силикатный фундамент, наружную стену подвала или цоколя.'};
 for(const resource of guards.resources){
  const actual=resource.row_id===own+':actual-scope';
  const scope={contractVersion:'canonical-scope-requirement/v1',kind:actual?'OBJECT_SCOPE':'INCLUDED',groupId:own,groupTitleRu:source.publicTitleRu,titleRu:resource.title_ru,reasonRu:actual?'Фактический проект должен подтвердить нагрузку, сдвиг, влажностную область, прямолинейность и примыкания; выбор исходного способа не является подтверждением.':'Состав отсечки должен оставаться целым; исключение позиции или неизвестная норма сохраняют незакрытое требование.',exactScopeWhen:active,sourceEvidence:evidence,coveringRowIds:actual?[]:componentRows.map(key=>prefix+':'+key),originalRowIds:original,...(actual?{objectFactParameterId:layoutId,unknownObjectValues:[],objectFactMode:'PROJECT_APPLICABILITY_ONLY',requiredFactParameterIds:[scopeId,layoutId]}:{costExclusionBreaksScopeV1:true})};
  result.resources.push(rehash({...decl(resource),ordinal:result.resources.length,inclusion_ast:active,resource_graph:{...resource.resource_graph,operationCompositionV1:operation,scopeRequirementV1:scope},source_metadata:{...resource.source_metadata,baseBroadNeedNotClosed:true,fullTechnicalAcceptance:false}}));
 }
 for(const resource of before.resources)check(JSON.stringify(result.resources.find(row=>row.row_id===resource.row_id))===JSON.stringify(resource),'OLD_ROW_UNCHANGED:'+resource.row_id);
 check(JSON.stringify(result.formulas.slice(0,before.formulas.length))===JSON.stringify(before.formulas)&&JSON.stringify(result.bindings)===JSON.stringify(before.bindings),'OLD_FORMULAS_BINDINGS_UNCHANGED');
 for(const key of componentRows){const resource=result.resources.find(resource=>resource.row_id===prefix+':'+key)!;check(canonicalEstimateOperationReferences(resource.resource_graph.operationCompositionV1).length>0,'REAL_OPERATION_READER');}
 const oldParameterIds=new Set(before.parameters.map(parameter=>parameter.parameter_id)),consumers=buildMasterParameterCalculationConsumers(result);
 for(const parameter of result.parameters){const key=parameter.parameter_id;parameter.truth_metadata={...parameter.truth_metadata,formula_consumers:consumers.formulaConsumers[key],resource_branch_consumers:consumers.resourceConsumers[key]};result.baseline.formula_consumer_ids[key]=consumers.formulaConsumers[key];result.baseline.resource_consumer_row_ids[key]=consumers.resourceConsumers[key];result.baseline.uom_by_parameter[key]=parameter.unit_id;result.baseline.guide_provenance_ru[key]=parameter.truth_metadata.guide?.guide_short_ru??parameter.title_ru;if(!oldParameterIds.has(key))result.baseline.normative_source_ids[key]=parameter.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM'?[]:[source.sourceId];}
 result.definition.applicability={...result.definition.applicability,masonrySilicate65M75ExistingDpcReuseR4:{contract:MASONRY_SILICATE65_DPC_REUSE_CONTRACT_R4,sourceChoiceParameterId:scopeId,wholeExistingRows:7,ordinaryInputsAdded:0,sourceCountry:'Germany',kgConformityClaim:false,sourceChoiceNotInferredFromGeometry:true,dpcAtAcceptedBaseDoesNotPermitSilicateFoundationOrExteriorBasementPlinth:true,ownWallRestrictionLocator:'SGB5.1-2025 section5.16 PDF29/printed26; whole method5.19',unknownBedLabourToolKitDisposal:true,newPaidOwners:0,newProcurementOwners:0,closedBroadNeeds:0,full:false}};
 result.passport.decision={...result.passport.decision,completeTechnicalEstimateAccepted:false,independentCompletenessMap:masonrySilicate65M75DpcIndependentCompletenessR4(result.passport.decision.independentCompletenessMap),masonrySilicate65M75ExistingDpcReuseR4:{contract:MASONRY_SILICATE65_DPC_REUSE_CONTRACT_R4,originalBroadBaseNeed:wall.prefix+':need:project-and-ready-base',sourceBedNotAssignedToM75NormOwner:true,unknownApplicationNormsRemain:4,independentCompletenessContinuation:'NINE_SOURCE_EXPECTATIONS_NOT_GENERATED_FROM_CURRENT_ROWS',full:false}};
 return result;
}
