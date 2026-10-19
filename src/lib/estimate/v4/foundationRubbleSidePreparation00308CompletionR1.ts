// WORK-only source-bound completion. No identity, registry, price or publication admission.
import pack from '../../../../data/estimate-benchmarks/source-packs/foundation-rubble-side-preparation-krer08-003-08-r1.json';
import {buildAutomaticConstructionOwnerR1,type AutomaticParameterSpec,type AutomaticRowSpec,type AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';
import {foundationSideHotBitumenDefinitionR1,foundationSideHotBitumenSyntheticFactsR1,foundationSideHotBitumenCompletenessMapR1} from './foundationSideHotBitumenTwoCoatsKrer08R1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
export const foundationRubblePreparationPackR1=pack;
type Json=Record<string,unknown>;
const p=pack.prefix, area=pack.measurement.parameterId, oldArea=pack.measurement.sameFaceAreaMustEqualSeparatelySuppliedParentArea;
const state=pack.selectionParameter, oldReady='waterproofing_prepared_substrate', oldReference='waterproofing_base_reference';
const selected=(value:string):Json=>({kind:'selected',parameterId:state,value});
const present=(parameterId:string):Json=>({kind:'present',parameterId});
const equals=(parameterId:string,value:string):Json=>({kind:'equals',parameterId,value});
const and=(...operands:Json[]):Json=>({kind:'and',operands});
const or=(...operands:Json[]):Json=>({kind:'or',operands});
const required=selected(pack.states.required), done=selected(pack.states.acceptedWork), noWork=selected(pack.states.alreadyReady);
const acceptedBase=and(equals(oldReady,'PREPARED_EVEN_RUBBLE_MASONRY'),present(oldReference),present(pack.readinessReferenceId));
const applicable=or(required,and(done,acceptedBase));
const workCondition={kind:'or' as const,operands:[{kind:'equals' as const,parameterId:state,value:pack.states.required},{kind:'equals' as const,parameterId:state,value:pack.states.acceptedWork}]};
const context=pack.scopeFacts.map(f=>f.id);
const methodParameter='rubble_prep_profile',method=pack.scopeFacts.find(f=>f.id===methodParameter)!.values![0];
// Existing formula graph compares exact fixed-decimal differences, not JS Number or strings.
const unequalAreas=or({kind:'formula_greater_than',expression:area+'-'+oldArea,unitId:'m2',value:0},
 {kind:'formula_greater_than',expression:oldArea+'-'+area,unitId:'m2',value:0});
export function foundationRubblePreparationCoverageConditionR1():Json{
 return or(and(applicable,{kind:'greater_than',parameterId:area,value:0},present(oldArea),...context.map(present)),
  and(noWork,acceptedBase,present(oldArea),equals(methodParameter,method),present('rubble_prep_project_reference')));
}
function rehash<T extends {row_sha256:string}>(row:T):T{
 const{row_sha256:_old,...body}=row;return{...body,row_sha256:estimateDeterministicHash(body)} as T;
}
/** Appends only 003-08 to the exact existing source-only 003-07 owner. Old readiness is never inferred. */
export function foundationRubblePreparationDefinitionR1():AutomaticOwnerDefinition{
 const parent=foundationSideHotBitumenDefinitionR1();
 if(pack.normId!=='08-01-003-08'||pack.parentNormId!=='08-01-003-07'||pack.measurement.basis!=='100'||pack.catalogId!==null
  ||JSON.stringify([parent.parameters.length,parent.formulas.length,parent.resources.length])!==JSON.stringify(pack.parentExpectedShape))throw Error('RUBBLE_PREPARATION_EXACT_PARENT_AND_SOURCE_REQUIRED');
 const parentPrimary=parent.parameters.find(q=>q.parameter_id===oldArea), oldNeed=parent.resources.find(r=>r.row_id===pack.targetNeedRowId);
 if(!parentPrimary||parentPrimary.unit_id!=='m2'||parentPrimary.value_type!=='decimal'||!oldNeed||oldNeed.unit_id!==''
  ||!Array.isArray(oldNeed.source_metadata?.normativeTrace)||oldNeed.source_metadata.normativeTrace.length!==0)throw Error('RUBBLE_PREPARATION_UNRESOLVED_PARENT_NEED_REQUIRED');
 const conditional:AutomaticParameterSpec[]=[
  {id:state,title:'Нужна ли подготовка бутовой поверхности и подтверждена ли её готовность',kind:'conditional',valueType:'enum',unitId:null,values:Object.values(pack.states)},
  {id:area,title:'Отдельно измеренная полная площадь того же бутового участка, м²',kind:'conditional',valueType:'decimal',unitId:'m2',min:0,requiredWhen:workCondition},
  ...pack.scopeFacts.map((f):AutomaticParameterSpec=>({id:f.id,title:f.titleRu,kind:'conditional',valueType:Array.isArray(f.values)?'enum':'text',unitId:null,...(Array.isArray(f.values)?{values:f.values}:{}),requiredWhen:workCondition})),
  {id:pack.readinessReferenceId,title:'Отдельное подтверждение готовности и приёмки бутового основания',kind:'conditional',valueType:'text',unitId:null,
   requiredWhen:{kind:'or',operands:[{kind:'equals',parameterId:state,value:pack.states.acceptedWork},{kind:'equals',parameterId:state,value:pack.states.alreadyReady}]}}
 ];
 const rows:AutomaticRowSpec[]=[...pack.physicalSourceRows.map((r):AutomaticRowSpec=>({rowId:p+':'+r.id,formulaId:p+':formula:'+r.id,title:r.titleRu,section:pack.titleRu,category:r.category,unitId:r.unitId,
  expression:area+'*'+r.ratePer100M2+'/100',inputParameterIds:context,procurement:false,costTreatment:r.costTreatment==='OWN_COST'?'OWN_COST':'INFORMATIONAL_SCOPE',
  formulaOutputBounds:{schemaVersion:'canonical_formula_output_bounds_v1',unitId:r.unitId,exclusiveMinimum:0,reasonRu:'Положительная площадь подготовки требует положительного исходного количества колонки 008.'}})),
  ...pack.includedOperations.map((r):AutomaticRowSpec=>({rowId:p+':'+r.id,formulaId:p+':formula:'+r.id,title:r.titleRu,section:pack.titleRu,category:'work',unitId:'m2',expression:area,
   inputParameterIds:context,procurement:false,costTreatment:'INCLUDED_IN_RESOURCE_ROWS'}))];
 const built=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:p,sourceId:pack.sourceId,normId:pack.normId,
  sourceMetadata:{source_title:pack.titleRu,source_document_version:pack.source.edition,definition_hash:pack.source.sha256,artifact_sha256:pack.source.sha256,exact_locator:pack.source.exactLocatorRu},
  applicabilityRu:'Только один отдельно измеренный боковой участок бутовой кладки, требующий частичной приколки и выравнивания готовым раствором по 003-08. Кирпич и бетон исключены. Готовность основания для 003-07 подтверждается отдельно.',
  // Declare the original primary locally for explicit resource gating; retain its exact original definition below.
  ordinary:[{id:oldArea,title:parentPrimary.title_ru,kind:'ordinary',valueType:'decimal',unitId:'m2',min:0}],profile:[],conditional,rows,
  deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:[
   'Площадь подготовки вводится отдельным обмером; равенство той же площади гидроизоляции — узкая граница этого соединения работ, не новая норма.',
   'Частичная приколка и выравнивание оплачиваются одним целым трудом 96,70 чел.-ч на 100 м². Дополнительная грунтовка, разогрев и нанесение 003-07 не добавляются.',
   'Не выводить толщину, плотность, состав раствора 1:3, коммерческий заказ, отходы или обслуживающего работника из исходных количеств.',
   'Норма количества не подтверждает выполненную работу, приёмку основания или цену; отсутствующее подтверждение не создаёт готовность.']});
 const oldParameterIds=new Set(parent.parameters.map(q=>q.parameter_id));
 const additions=built.parameters.filter(q=>!oldParameterIds.has(q.parameter_id)).map((q,index)=>{
  const guide=q.truth_metadata.guide;
  if(guide===null||typeof guide!=='object'||Array.isArray(guide))throw Error('RUBBLE_PREPARATION_SOURCE_GUIDE_REQUIRED');
  return{...q,ordinal:parent.parameters.length+index,required:false,
  constraints_json:{...q.constraints_json,...(q.parameter_id===area?{min:0,exclusiveMin:0,forbiddenWhen:unequalAreas}:{}),...(q.parameter_id===state?{forbiddenWhen:or(
   and(required,present(oldReady)),and(or(required,done,noWork),or(equals(oldReady,'PREPARED_EVEN_BRICK'),equals(oldReady,'PREPARED_EVEN_CONCRETE'))))}: {})},
  truth_metadata:{...q.truth_metadata,value_source_role:'PROJECT_SPECIFIC_INPUT',source_confirmation_required:false,provenance:{consumer_input_role_v1:'OBJECT_FACT'},guide:{...guide,
   guide_short_ru:q.parameter_id===area?'Укажите отдельный обмер того же участка. Не вычисляйте его из объёма, длины или площади другой работы. Равенство двух независимо заданных площадей ограничивает только этот способ соединения работ.':q.title_ru+'; расчёт не подтверждает фактическую приёмку.'}}};
 });
 const addedResources=built.resources.map((r,index)=>{
  const key=r.row_id.slice(p.length+1),source=pack.physicalSourceRows.find(s=>s.id===key),included=pack.includedOperations.some(s=>s.id===key),whole=key==='whole-preparation-labour';
  const formula=built.formulas.find(f=>f.formula_id===r.formula_id)!;
  return rehash({...r,ordinal:parent.resources.length+index,inclusion_ast:applicable,cost_owner_id:included?p+':whole-preparation-labour':r.cost_owner_id,
   resource_graph:{...r.resource_graph,inputParameterIds:[oldArea,...context,pack.readinessReferenceId],
    derivedQuantityEditPolicyV1:{contractVersion:'canonical-derived-quantity-edit-policy/v1',mode:'PARAMETERS_ONLY',unitId:r.unit_id,parameterIds:[...formula.input_parameter_ids],reasonRu:'Исходная колонка 008 изменяется отдельным фактом площади; ручное количество не заменяет норматив.'},
    ...(included?{parentCostOwnerId:p+':whole-preparation-labour',includedInResourceOwnerRowId:p+':whole-preparation-labour'}:{}),
    publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:r.title_ru,nameRu:r.title_ru,brandAndModelRu:null,specificationRu:source?.titleRu??null,
     detailsRu:[pack.source.exactLocatorRu,included?'Операция включена в тот же цельный труд 96,70 чел.-ч на 100 м², отдельная оплата не создаётся.':whole?'Цельный труд частичной приколки и выравнивания; без повторной грунтовки или разогрева последующей гидроизоляции.':source?.category==='equipment'?'Только исходные машино-часы; оплачиваемая ставка и роль обслуживающего работника не установлены.':'Только исходный расход. Коммерческая поставка не допущена; толщина, рецепт смеси, плотность и упаковка не выводятся.'] }},
   source_metadata:{...r.source_metadata,sourceRole:whole?'OFFICIAL_WHOLE_PREPARATION_LABOUR_NORM':included?'INCLUDED_WHOLE_PREPARATION_STEP':source?.category==='equipment'?'SOURCE_MACHINE_QUANTITY_PRICE_SCOPE_PENDING':'SOURCE_MATERIAL_QUANTITY_COMMERCIAL_SCOPE_PENDING',
    sourceCode:source?.code??null,source_artifact_sha256:pack.source.sha256,official_url:pack.source.officialUrl,exact_column:pack.normId,exact_locator:pack.source.exactLocatorRu,
    ...(!whole?{automaticGenericPriceInheritanceAllowed:false}:{}),commercialProcurementAdmitted:false,
    ...(source?.category==='equipment'?{machinePriceScopePending:true,operatorRoleNotAdmitted:true,noAdditionalOperatorInferred:false,priceScopeNeedRowId:pack.targetNeedRowId.replace('substrate-preparation','machine-price-scope')}:{}),
    ...(source?.category==='material'?{commercialAdmissionNeedRowId:pack.targetNeedRowId.replace('substrate-preparation','commercial-supply-stock')}:{}),
    full_technical_acceptance:false,publicationAllowed:false}});
 });
 const resources=parent.resources.map(r=>r.row_id===pack.targetNeedRowId?rehash({...r,
  inclusion_ast:and(r.inclusion_ast,{kind:'not',operand:foundationRubblePreparationCoverageConditionR1()}),
  // Reuse the existing retained-unbound-need contract; no old source is relabelled as norm 008.
  source_metadata:{...r.source_metadata,completionNeedTransitionV1:{featureContract:pack.contract,selectedMethodParameterId:methodParameter,
   resolvedOnlyForMethod:method,resolvedThroughPaidOwnerRowId:p+':whole-preparation-labour',automaticLegacyPriceOrQuantityTransferAllowed:false}}}):r);
 return{...parent,parameters:[...parent.parameters,...additions],formulas:[...parent.formulas,...built.formulas],resources:[...resources,...addedResources]};
}
/** Synthetic test facts only: both separate measured areas are supplied by the caller. No production defaults. */
export function foundationRubblePreparationSyntheticFactsR1(parentAreaValue:string,preparationAreaValue:string,selection: keyof typeof pack.states='required'):Record<string,unknown>{
 const old=foundationSideHotBitumenSyntheticFactsR1(parentAreaValue);
 if(selection==='required'){delete old[oldReady];delete old[oldReference];}
 return{...old,[area]:preparationAreaValue,[state]:pack.states[selection],...Object.fromEntries(pack.scopeFacts.map(f=>[f.id,Array.isArray(f.values)?f.values[0]:'QA_ONLY separate measured/project/payment reference'])),
  ...(['acceptedWork','alreadyReady'].includes(selection)?{[pack.readinessReferenceId]:'QA_ONLY explicit separate acceptance record; not generated by calculation'}:{})};
}
export function foundationRubblePreparationCompletenessMapR1(){
 const previous=foundationSideHotBitumenCompletenessMapR1();return{...previous,evidenceReferences:[...previous.evidenceReferences,pack.source.officialUrl,pack.source.exactLocatorRu],entries:[...previous.entries,
  ...pack.physicalSourceRows.map(s=>({expectedResourceId:pack.normId+':'+s.code,operationId:'rubble-side-preparation',sourceId:pack.sourceId,condition:'EXPLICIT_SOURCE00308_RUBBLE_SAME_FACE_REQUIRED_OR_SEPARATELY_ACCEPTED_WORK',category:s.category,unitId:s.unitId,quantityRule:'PRINTED_RATE_PER100_M2_NO_NEW_THICKNESS_RECIPE_OR_PRICE',specification:s.titleRu,formulaId:p+':formula:'+s.id,resolution:{kind:'ROW',rowId:p+':'+s.id}})),
  ...pack.includedOperations.map(s=>({expectedResourceId:pack.normId+':'+s.id,operationId:'rubble-side-preparation',sourceId:pack.sourceId,condition:'INCLUDED_IN_SINGLE_WHOLE00308_LABOUR',category:'work',unitId:'m2',quantityRule:'INCLUDED_STEP_NOT_SECOND_PAYMENT',specification:s.titleRu,formulaId:p+':formula:'+s.id,resolution:{kind:'INCLUDED_COMPONENT_ROW',rowId:p+':'+s.id,parentRowId:p+':whole-preparation-labour'}}))]};
}
