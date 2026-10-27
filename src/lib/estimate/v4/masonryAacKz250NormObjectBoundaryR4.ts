import {MASONRY_AAC_KZ250_WHOLE_R4 as own} from './masonryAacKz250WholeCycleR4';
import {buildAutomaticConstructionOwnerR1,type AutomaticParameterSpec,type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {buildMasterParameterCalculationConsumers} from '../backendPlatform/canonicalDefinitionParameterConsumersR1';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';
import type {PurchaseGroupRepresentative as Rep} from '../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';
import type {CanonicalPublisherJson as Json} from '../../../../scripts/estimate/r4a13/canonicalDefinitionPublisherR1';

export const MASONRY_AAC_KZ250_NORM_OBJECT_BOUNDARY_R4={
 contract:'masonry-aac-kz250-norm-object-boundary/r4',
 rowId:own.prefix+':need:source-system-fit',formulaId:own.prefix+':formula:need:source-system-fit',
 operationId:own.prefix+':operation:identity-design',
 facts:[
  {id:'aackz4_wall_material_batch_reference',title:'Документ фактической партии блоков и кладочного клея',role:'MANUFACTURER_CONFIRMED'},
  {id:'aackz4_wall_source_compatibility_reference',title:'Проверка материалов и технологии по исходному способу стены',role:'PROJECT_DOCUMENTATION'},
  {id:'aackz4_wall_structural_design_reference',title:'Конструктивный проект стены, опирания и связей',role:'ENGINEERING_DESIGN'},
 ],
} as const;
const boundary=MASONRY_AAC_KZ250_NORM_OBJECT_BOUNDARY_R4;
const active={kind:'and',operands:[{kind:'selected',parameterId:own.selectorId,value:own.selectorValue},{kind:'formula_greater_than',expression:'(m33_masonry_wall_length_m*m33_masonry_wall_height_m-m33_masonry_openings_area_m2)*0.25',unitId:'m3',value:0}]};
const check=(value:unknown,code:string):void=>{if(!value)throw Error('AAC_KZ250_NORM_OBJECT_BOUNDARY_R4_'+code);};
const decl=(value:Json):Json=>Object.fromEntries(Object.entries(value).filter(([key])=>!['id','definition_version_id','created_at','updated_at','row_sha256'].includes(key)));
const rehash=(value:Json):Json=>{const{row_sha256:_old,...body}=value;return{...body,row_sha256:hash(body)};};

/** Known quantities from the exact own international norm remain calculable.
 * Actual product/project compatibility is a separate mandatory requirement,
 * using the existing shared contract. It never supplies a missing norm. */
export function applyMasonryAacKz250NormObjectBoundaryR4(parent:Rep):Rep{
 check(parent.definition.id===own.currentParent.definitionId&&parent.definition.definition_sha256===own.currentParent.definitionSha256,'EXACT_AAC_PARENT');
 check(parent.definition.applicability.masonryAacKz250CurrentCardR4?.selectorValue===own.selectorValue,'EXACT_OWN_PROFILE');
 check(!parent.resources.some(resource=>resource.row_id===boundary.rowId)&&!boundary.facts.some(fact=>parent.parameters.some(parameter=>parameter.parameter_id===fact.id)),'BOUNDARY_ALREADY_PRESENT');
 const result=structuredClone(parent),oldIds=new Set(parent.parameters.map(parameter=>parameter.parameter_id));
 const paidIds=['aac_blocks','dry_adhesive','main-labour'].map(key=>own.prefix+':'+key);
 for(const id of paidIds)check(result.resources.some(resource=>resource.row_id===id&&resource.resource_graph.costTreatment==='OWN_COST'),'EXISTING_OWN_PAID_OWNER:'+id);
 const ordinary:AutomaticParameterSpec[]=boundary.facts.map(fact=>({id:fact.id,title:fact.title,valueType:'text',unitId:null,kind:'ordinary'}));
 const row:AutomaticRowSpec={rowId:boundary.rowId,formulaId:boundary.formulaId,section:'Соответствие материалов и проекта стены',title:'Совместимость фактических материалов и проекта стены',category:'service',unitId:'set',expression:'0',inputParameterIds:boundary.facts.map(fact=>fact.id),costTreatment:'INFORMATIONAL_SCOPE',procurement:false};
 const part=buildAutomaticConstructionOwnerR1({contract:boundary.contract,semanticOwner:own.prefix,sourceId:own.sourceId,normId:'ACTUAL_OBJECT_COMPATIBILITY_NOT_A_CONSUMPTION_OR_REGIONAL_ADOPTION_NORM',sourceMetadata:{source_title:'Собственная стена из газобетонных блоков 250 мм: соответствие объекта',source_document_version:'Kazakhstan2019; exact own method/edition retained',definition_hash:own.source.sha256,artifact_sha256:own.source.sha256,exact_locator:'KZ2019 own wall250 calculation3/table3; first row/laying/bond/material requirements PDF12-19'},applicabilityRu:'Исходный расход международного способа считается по измеренной геометрии. Фактическая партия, совместимость блока и клея, роль стены, опирание, связи и конструктивный проект подтверждаются своими документами. Условия не заменяются выбором профиля или региональным переключателем.',ordinary,profile:[],conditional:[],rows:[row],deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:['No actual project or product confirmation from source selection','No KG compliance claim from international quantities','No missing developer norm invented by object documents','No extra payment or procurement']});
 for(const parameter of part.parameters){
  const fact=boundary.facts.find(fact=>fact.id===parameter.parameter_id)!;
  const sourceConstraints=parameter.constraints_json,provenance=parameter.truth_metadata.provenance??{},guide=parameter.truth_metadata.guide;
  if(sourceConstraints===null||!provenance||typeof provenance!=='object'||Array.isArray(provenance)
    ||!guide||typeof guide!=='object'||Array.isArray(guide))throw Error('AAC_KZ250_NORM_OBJECT_BOUNDARY_R4_GENERATED_PARAMETER_OBJECT');
  const{requiredWhen:_old,...constraints}=sourceConstraints;
  result.parameters.push({...decl(parameter),ordinal:result.parameters.length,required:false,default_value:null,constraints_json:constraints,truth_metadata:{...parameter.truth_metadata,visibility_role:'INTERNAL_ONLY',visible_when:active,value_source_role:fact.role,source_confirmation_required:true,runtime_profile_value:false,hidden_default_forbidden:true,provenance:{...provenance,consumer_input_role_v1:'APPLICATION_TECHNICAL',input_channel_v1:'BOUND_ACTUAL_OBJECT_DOCUMENT_NOT_CONSUMER_SCALAR',normAndObjectBoundaryV1:{contract:boundary.contract,sourceProfileIsNotAnObjectDocument:true}},guide:{...guide,guide_kind:'PROJECT_DEFINED',source_role:fact.role,guide_short_ru:fact.title+': отдельная привязанная запись фактического объекта. Обычная форма не запрашивает техническое подтверждение; неизвестное не подставляется из нормативного примера.'}}});
 }
 result.formulas.push({...decl(part.formulas[0]!),ordinal:result.formulas.length});
 const resource=part.resources[0]!;
 result.resources.push(rehash({...decl(resource),ordinal:result.resources.length,inclusion_ast:active,resource_graph:{...resource.resource_graph,
  operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:own.prefix,groupTitleRu:own.titleRu,operationId:boundary.operationId,operationTitleRu:'Соответствие материалов и проекта стены',processOrdinal:0,completionCriterionRu:'Фактические материалы и конструктивный проект проверены для выбранного собственного способа.'},
  scopeRequirementV1:{contractVersion:'canonical-scope-requirement/v1',kind:'OBJECT_SCOPE',groupId:boundary.rowId,groupTitleRu:'Соответствие материалов и проекта стены',titleRu:resource.title_ru,reasonRu:'Известный нормативный расход не подтверждает блоки, клей и конструктивный проект объекта. Эту проверку нельзя исключить или завершить ручным нулём; документы не создают недостающие нормы и не присваивают полную готовность.',exactScopeWhen:active,sourceEvidence:[{...own.source,locator:'KZ2019 PDF12-19 material/laying/first row and structural interfaces; PDF39 table3; PDF50 calculation3 wall250mm'}],coveringRowIds:[],originalRowIds:paidIds,objectFactParameterId:boundary.facts[0].id,unknownObjectValues:[],objectFactMode:'PROJECT_APPLICABILITY_ONLY',requiredFactParameterIds:boundary.facts.map(fact=>fact.id)},
 },source_metadata:{...resource.source_metadata,contract:boundary.contract,sourceCountry:'Kazakhstan',sourceEdition:'2019',kgComplianceClaim:false,internationalNormativeQuantitySeparateFromActualObject:true,sourceChoiceNotActualProject:true,developerNormClosedByDocuments:false,newPaidOwner:false,newProcurementOwner:false,closedParentNeeds:0,fullTechnicalAcceptance:false}}));
 const consumers=buildMasterParameterCalculationConsumers(result);
 for(const parameter of result.parameters){const key=parameter.parameter_id;parameter.truth_metadata={...parameter.truth_metadata,formula_consumers:consumers.formulaConsumers[key],resource_branch_consumers:consumers.resourceConsumers[key]};result.baseline.formula_consumer_ids[key]=consumers.formulaConsumers[key];result.baseline.resource_consumer_row_ids[key]=consumers.resourceConsumers[key];result.baseline.uom_by_parameter[key]=parameter.unit_id;result.baseline.guide_provenance_ru[key]=parameter.truth_metadata.guide?.guide_short_ru??parameter.title_ru;if(!oldIds.has(key))result.baseline.normative_source_ids[key]=[own.sourceId];}
 check(hash(parent.formulas)===hash(result.formulas.slice(0,parent.formulas.length)),'EXISTING_FORMULA_DRIFT');
 for(const resource of parent.resources){const current=result.resources.find(current=>current.row_id===resource.row_id)!;check(hash(resource)===hash(current),'EXISTING_RESOURCE_DRIFT:'+resource.row_id);}
 result.definition.applicability={...result.definition.applicability,masonryAacNormObjectBoundaryR4:{contract:boundary.contract,mandatoryRequirementRowId:boundary.rowId,knownNormativeQuantitiesDoNotConfirmObject:true,ordinaryTechnicalQuestions:0,kgComplianceClaim:false,wholeTechnicalAcceptance:false}};
 result.passport.decision={...result.passport.decision,completeTechnicalEstimateAccepted:false,masonryAacNormObjectBoundaryR4:{contract:boundary.contract,newPaidOwners:0,newProcurementOwners:0,closedParentNeeds:0,full:0}};
 return result;
}

export function masonryAacKz250NormObjectCompletenessEntryR4(){return{expectedResourceId:own.prefix+':expected:own-norm-object-boundary',operationId:boundary.operationId,requiredOperationIds:[boundary.operationId],sourceId:own.sourceId,condition:own.selectorId+'='+own.selectorValue,category:'service',unitId:'set',specification:'Actual wall material/source/structural compatibility',quantityRule:'MANDATORY_OBJECT_SCOPE_SEPARATE_FROM_INTERNATIONAL_NORMATIVE_QUANTITIES',formulaId:boundary.formulaId,resolution:{kind:'ROW',rowId:boundary.rowId}};}
