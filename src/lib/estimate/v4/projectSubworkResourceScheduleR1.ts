import {buildAutomaticConstructionOwnerR1, type AutomaticOwnerDefinition, type AutomaticInclusionCondition,
 type AutomaticParameterSpec, type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
import {compileFormulaGraph} from '../backendPlatform/formulaGraph';
import {canonicalEstimateOperationReferences, type CanonicalEstimateOperationReference} from '../backendPlatform/canonicalEstimateOperationComposition';

export type ProjectSubworkResourcePositionR1=Readonly<{
 key:string; titleRu:string; category:'material'|'tool'|'equipment'|'service'|'transport'|'work'; unitId:string;
 operation:string; sharedOperations:readonly string[]; optional:boolean; conditionRu:string; evidence:string;
 active?:AutomaticInclusionCondition;
 includedInPositionKeys?:readonly string[];
 includedInExistingOwners?:readonly Readonly<{rowId:string;titleRu:string}>[];
 includedOnly?:boolean;
}>;
export type ProjectSubworkResourceScheduleR1=Readonly<{
 key:string; sourceSha256:string; sourceUrl:string; sourceLocatorRu:string; sourceId:string;
 primaryParameterId:string; active:AutomaticInclusionCondition; includedOwnerRowId:string;
 positions:readonly ProjectSubworkResourcePositionR1[]; replacements:Readonly<Record<string,readonly string[]>>;
 additionalOperations?:readonly CanonicalEstimateOperationReference[];
 sharedOperationResourceConditions?:Readonly<Record<string,readonly string[]>>;
}>;
export const projectResourceSeparateR1='Оплачивается отдельно';
export const projectResourceIncludedR1='Входит в подтверждённую цену основной работы';
export const projectResourceRequiredR1='Требуется';
export const projectResourceNotRequiredR1='Не требуется по проекту';
export const projectResourceParameterPrefixR1=(scheduleKey:string,positionKey:string)=>'subwork_'+scheduleKey+'_'+positionKey.replaceAll('-','_');
export const projectResourceIncludedInPositionR1=(titleRu:string)=>'Входит в подтверждённую цену: '+titleRu;

/** An explicit project/supply schedule, using the existing compiler. The method
 * source establishes applicability only. No universal tool count, labour rate,
 * mesh allowance, supplier packaging, trips or rental period is invented here. */
export function appendProjectSubworkResourceScheduleR1(parent:AutomaticOwnerDefinition,schedule:ProjectSubworkResourceScheduleR1):AutomaticOwnerDefinition {
 const owner=parent.resources.find(row=>row.row_id===schedule.includedOwnerRowId);
 if(!owner||owner.resource_graph.costTreatment==='INFORMATIONAL_SCOPE')throw Error('PROJECT_RESOURCE_CONFIRMED_PARENT_OWNER_REQUIRED');
 if(!/^[a-f0-9]{64}$/u.test(schedule.sourceSha256)||!schedule.positions.length
  ||new Set(schedule.positions.map(p=>p.key)).size!==schedule.positions.length)throw Error('PROJECT_RESOURCE_SCHEDULE_INVALID');
 const operations=new Map<string,CanonicalEstimateOperationReference>();
 for(const resource of parent.resources)for(const operation of canonicalEstimateOperationReferences(resource.resource_graph.operationCompositionV1)){
  const key=operation.operationId.split(':').at(-1)!;operations.set(key,operation);
 }
 for(const operation of schedule.additionalOperations??[]){
  if(!canonicalEstimateOperationReferences(operation).length||operations.has(operation.operationId.split(':').at(-1)!))throw Error('PROJECT_RESOURCE_ADDITIONAL_SUBWORK_INVALID');
  operations.set(operation.operationId.split(':').at(-1)!,operation);
 }
 for(const [key,ids]of Object.entries(schedule.sharedOperationResourceConditions??{})){
  if(!operations.has(key)||!ids.length||new Set(ids).size!==ids.length||ids.some(id=>!parent.resources.some(row=>row.row_id===id)
   &&!schedule.positions.some(position=>['separate','included'].some(branch=>id==='subwork-resource:'+schedule.key+':'+position.key+':'+branch))))throw Error('PROJECT_RESOURCE_SHARED_OPERATION_CONDITION_INVALID');
 }
 const conditional:AutomaticParameterSpec[]=[],rows:AutomaticRowSpec[]=[];
 const rowBindings:{position:ProjectSubworkResourcePositionR1;ownerRowId:string|null}[]=[];
 const paymentOwnerGuards=new Map<string,Record<string,unknown>[]>();
 const references=new Set<string>();
 const collect=(value:unknown):void=>{if(!value||typeof value!=='object')return;if(Array.isArray(value)){value.forEach(collect);return;}
  const object=value as Record<string,unknown>;if(typeof object.parameterId==='string')references.add(object.parameterId);Object.values(object).forEach(collect);};
 collect(schedule.active);schedule.positions.forEach(position=>collect(position.active));
 const ordinary:AutomaticParameterSpec[]=[...references].map(id=>{
  const parameter=parent.parameters.find(p=>p.parameter_id===id);
  if(!parameter||parameter.value_type==='boolean')throw Error('PROJECT_RESOURCE_EXISTING_CONDITION_REQUIRED:'+id);
  return {id,title:parameter.title_ru,valueType:parameter.value_type as AutomaticParameterSpec['valueType'],unitId:parameter.unit_id,kind:'ordinary'};
 });
 const and=(...operands:AutomaticInclusionCondition[]):AutomaticInclusionCondition=>({kind:'and',operands});
 const equals=(parameterId:string,value:string):AutomaticInclusionCondition=>({kind:'equals',parameterId,value});
 const rowIdFor=(key:string,branch:string)=>'subwork-resource:'+schedule.key+':'+key+':'+branch;
 const applicableFor=(position:ProjectSubworkResourcePositionR1)=>position.active?and(schedule.active,position.active):schedule.active;
 const activeFor=(position:ProjectSubworkResourcePositionR1)=>position.optional
  ?and(applicableFor(position),equals(projectResourceParameterPrefixR1(schedule.key,position.key)+'_required',projectResourceRequiredR1)):applicableFor(position);
 const ownerFormula=parent.formulas.find(formula=>formula.formula_id===owner.formula_id);
 if(!ownerFormula?.expression_source)throw Error('PROJECT_RESOURCE_PARENT_QUANTITY_SOURCE_REQUIRED');
 const mainOwnerAvailable={kind:'and',operands:[owner.inclusion_ast,
  {kind:'formula_greater_than',expression:ownerFormula.expression_source,unitId:owner.unit_id,value:0}]};
 for(const position of schedule.positions){
  if(!operations.has(position.operation)||position.sharedOperations.some(key=>!operations.has(key)))throw Error('PROJECT_RESOURCE_SUBWORK_REQUIRED:'+position.key);
  const prefix=projectResourceParameterPrefixR1(schedule.key,position.key),choice=prefix+'_required',payment=prefix+'_payment',quantity=prefix+'_quantity',
   designation=prefix+'_specification',reference=prefix+'_reference';
  const applicable=applicableFor(position),active=activeFor(position);
  const otherOwners=(position.includedInPositionKeys??[]).map(key=>{
   const other=schedule.positions.find(item=>item.key===key);
   if(!other||other.key===position.key||other.includedInPositionKeys?.length)throw Error('PROJECT_RESOURCE_OWNER_CYCLE_OR_AMBIGUITY:'+position.key);
   return other;
  });
  const existingOwners=(position.includedInExistingOwners??[]).map(selected=>{
   const resource=parent.resources.find(row=>row.row_id===selected.rowId);
   const formula=parent.formulas.find(row=>row.formula_id===resource?.formula_id);
   if(!resource||!formula?.expression_source||resource.row_id===schedule.includedOwnerRowId
    ||resource.resource_graph.costTreatment!=='OWN_COST'||!selected.titleRu.trim())throw Error('PROJECT_RESOURCE_EXISTING_PRICE_OWNER_REQUIRED:'+position.key);
   return {...selected,available:and(resource.inclusion_ast as AutomaticInclusionCondition,
    {kind:'formula_greater_than',expression:formula.expression_source,unitId:resource.unit_id,value:0})};
  });
  const ownerTitles=[...otherOwners.map(other=>other.titleRu),...existingOwners.map(other=>other.titleRu)];
  if(new Set(ownerTitles).size!==ownerTitles.length||new Set(existingOwners.map(other=>other.rowId)).size!==existingOwners.length)
   throw Error('PROJECT_RESOURCE_OWNER_LABEL_AMBIGUOUS');
  if(new Set(otherOwners.map(other=>other.titleRu)).size!==otherOwners.length)throw Error('PROJECT_RESOURCE_OWNER_LABEL_AMBIGUOUS');
  const guards:Record<string,unknown>[]=[{kind:'and',operands:[active,equals(payment,projectResourceIncludedR1),{kind:'not',operand:mainOwnerAvailable}]}];
  for(const other of otherOwners){const p=projectResourceParameterPrefixR1(schedule.key,other.key);
   guards.push({kind:'and',operands:[active,equals(payment,projectResourceIncludedInPositionR1(other.titleRu)),{kind:'not',operand:{kind:'and',operands:[activeFor(other),
    {kind:'greater_than',parameterId:p+'_quantity',value:0},{kind:'or',operands:[equals(p+'_payment',projectResourceSeparateR1),equals(p+'_payment',projectResourceIncludedR1)]}]}}]});
  }
  for(const other of existingOwners)guards.push({kind:'and',operands:[active,equals(payment,projectResourceIncludedInPositionR1(other.titleRu)),
   {kind:'not',operand:other.available}]});
  paymentOwnerGuards.set(payment,guards);
  if(position.optional)conditional.push({id:choice,title:'Нужно ли: '+position.titleRu+'?',kind:'conditional',valueType:'enum',unitId:null,
   values:[projectResourceRequiredR1,projectResourceNotRequiredR1],requiredWhen:applicable});
  conditional.push(
   {id:payment,title:'Как оплачивается: '+position.titleRu+'?',kind:'conditional',valueType:'enum',unitId:null,
    values:[...(position.includedOnly?[]:[projectResourceSeparateR1]),projectResourceIncludedR1,...ownerTitles.map(projectResourceIncludedInPositionR1)],requiredWhen:active},
   {id:designation,title:'Что предусмотрено: '+position.titleRu+'?',kind:'conditional',valueType:'text',unitId:null,requiredWhen:active},
   {id:quantity,title:'Какое количество: '+position.titleRu+'?',kind:'conditional',valueType:position.unitId==='piece'||position.unitId==='trip'||position.unitId==='test'?'integer':'decimal',
    unitId:position.unitId,min:position.unitId==='piece'||position.unitId==='trip'||position.unitId==='test'?1:0.000001,requiredWhen:active},
   {id:reference,title:'Чем подтверждены количество и состав цены: '+position.titleRu+'?',kind:'conditional',valueType:'text',unitId:null,
    requiredWhen:active});
  const branches:{branch:string;value:string;ownerRowId:string|null;condition?:AutomaticInclusionCondition;inputs?:string[]}[]=[
   ...(position.includedOnly?[]:[{branch:'separate',value:projectResourceSeparateR1,ownerRowId:null}]),{branch:'included',value:projectResourceIncludedR1,ownerRowId:schedule.includedOwnerRowId},
   ...otherOwners.flatMap(other=>['separate','included'].map(branch=>{
    const p=projectResourceParameterPrefixR1(schedule.key,other.key);
    return {branch:'included-in-'+other.key+'-'+branch,value:projectResourceIncludedInPositionR1(other.titleRu),ownerRowId:rowIdFor(other.key,branch),
     condition:and(activeFor(other),equals(p+'_payment',branch==='separate'?projectResourceSeparateR1:projectResourceIncludedR1)),inputs:[p+'_payment',p+'_quantity',p+'_reference']};
   })),
   ...existingOwners.map((other,index)=>({branch:'included-in-existing-'+index,value:projectResourceIncludedInPositionR1(other.titleRu),ownerRowId:other.rowId})),
  ];
  for(const {branch,value,ownerRowId,condition,inputs}of branches){
   const rowId=rowIdFor(position.key,branch);
   rows.push({rowId,formulaId:rowId+':quantity',section:position.titleRu,title:position.titleRu,category:position.category,unitId:position.unitId,
    expression:quantity,procurement:ownerRowId===null&&position.category!=='work',costTreatment:ownerRowId===null?'OWN_COST':'INCLUDED_IN_RESOURCE_ROWS',
    inclusion:and(active,equals(payment,value),...(condition?[condition]:[])),inputParameterIds:[...(position.optional?[choice]:[]),payment,designation,quantity,reference,...(inputs??[])],titleParameterIds:[designation]});
   rowBindings.push({position,ownerRowId});
  }
 }
 const sourceId=schedule.sourceId+':explicit-project-resource-schedule';
 const added=buildAutomaticConstructionOwnerR1({contract:'project-subwork-resource-schedule/r1',semanticOwner:schedule.key,
  sourceId,normId:'approved-project-resource-schedule-not-a-consumption-norm',
  sourceMetadata:{source_title:'Ресурсы подработ по проекту и подтверждённому обеспечению',source_document_version:'explicit-project-takeoff-no-defaults/r1',
   definition_hash:schedule.sourceSha256,artifact_sha256:schedule.sourceSha256,exact_locator:schedule.sourceLocatorRu},
  applicabilityRu:'Перечень проверяется по выбранному способу работ. Количество и самостоятельная стоимость подтверждаются ведомостью и условиями поставки.',
  ordinary,profile:[],conditional,rows,deferMissingProjectFactsToRows:true,
  excludedUnownedAssumptions:['automatic quantity per work area','automatic tool purchase','automatic rental duration','automatic trips',
   'second payment for included labour, water, material or mechanism','unknown inventory means zero','method evidence is a universal quantity norm']});
 const parameters=added.parameters.filter(p=>!references.has(p.parameter_id)).map(parameter=>{
  const position=schedule.positions.find(p=>parameter.parameter_id.startsWith(projectResourceParameterPrefixR1(schedule.key,p.key)+'_'))!;
  const guide=parameter.parameter_id.endsWith('_quantity')
   ?'Для отдельной позиции укажите только подтверждённую дополнительную покупку, аренду или услугу с учётом имеющегося обеспечения. Для включённой — фактическое количество в составе основной цены. Значение берётся из ведомости, не из условного коэффициента на площадь.'
   :parameter.parameter_id.endsWith('_reference')?'Укажите ведомость или предложение с составом цены и количеством. При отсутствии потребности — проектное основание. Проверьте, что позиция уже не оплачена в основной работе, поставке материала или другой смете.'
   :position.conditionRu;
  const guards=paymentOwnerGuards.get(parameter.parameter_id);
  return {...parameter,...(guards?{constraints_json:{...parameter.constraints_json,forbiddenWhen:{kind:'or',operands:guards}}}:{}),
   truth_metadata:{...parameter.truth_metadata,value_source_role:'PROJECT_SPECIFIC_INPUT',source_confirmation_required:false,
   provenance:{consumer_input_role_v1:'OBJECT_FACT'},guide:{...(parameter.truth_metadata.guide as Record<string,unknown>),guide_short_ru:guide,
    full_condition_ru:position.conditionRu,source_role:'PROJECT_DOCUMENTATION',source_document:sourceId,source_locator:position.evidence}}};
 });
 const resources=added.resources.map((row,index)=>{
  const {position,ownerRowId}=rowBindings[index]!;
  const primary=operations.get(position.operation)!;
  const {whenResourcePresent:_condition,additionalOperations:_oldShared,...main}=primary;
  const shared=position.sharedOperations.map(key=>{const {additionalOperations:_nested,...operation}=operations.get(key)!;
   const required=schedule.sharedOperationResourceConditions?.[key];return {...operation,...(required?{whenResourcePresent:required}:{})};});
  const graph={...row.resource_graph,scopeContextParameterIds:[schedule.primaryParameterId],
   operationCompositionV1:{...main,...(shared.length?{additionalOperations:shared}:{})},
   ...(ownerRowId?{includedInResourceOwnerRowId:ownerRowId}:{}),
   derivedQuantityEditPolicyV1:{contractVersion:'canonical-derived-quantity-edit-policy/v1',mode:'PARAMETERS_ONLY',unitId:row.unit_id,
    parameterIds:[projectResourceParameterPrefixR1(schedule.key,position.key)+'_quantity'],reasonRu:'Измените подтверждённое количество в ведомости обеспечения этой подработы.'},
   stageInputPresentationV1:{contractVersion:'canonical-stage-input-presentation/v1',parameterIds:[]},
   publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:row.title_ru,nameRu:position.titleRu,
    brandAndModelRu:null,specificationRu:null,detailsRu:[]},
   individualProjectResourcePaymentV1:{quantityBasis:'EXPLICIT_SELECTED_SUPPLY_SCHEDULE',existingInventoryMustBeConsidered:true,
    includedOwnerRowId:ownerRowId,mutuallyExclusivePayment:true,rateOrProductivityInferred:false},
   publicResourceAlternativesV1:{contractVersion:'canonical-public-resource-alternatives/v1',groupId:rowIdFor(position.key,'alternatives'),
    sourceRowIds:rowBindings.flatMap((binding,i)=>binding.position.key===position.key?[added.resources[i]!.row_id]:[])},
  };
  const {row_sha256:_old,...body}=row;
  // The parent relationship is financial coverage, not a unit-price route.
  // A parent's m² labour price must never become a mesh or tool unit price.
  const changed={...body,resource_graph:graph,cost_owner_id:row.row_id,
   source_metadata:{...row.source_metadata,sourceRole:'APPROVED_PROJECT_RESOURCE_SCHEDULE',normativeTrace:[],
    methodEvidence:{url:schedule.sourceUrl,sha256:schedule.sourceSha256,locator:position.evidence},
    projectTakeoffNotNorm:true,universal_consumption_claimed:false,universal_productivity_claimed:false,automaticGenericPriceInheritanceAllowed:false}};
  return {...changed,row_sha256:estimateDeterministicHash(changed)};
 });
 // Reuse the platform scope check for explicit financial exclusions. A user
 // may exclude an owner, but that cannot silently confirm its included tools.
 const ownershipChecks=new Map<string,{conditions:AutomaticInclusionCondition[];memberRowIds:string[]}>();
 rowBindings.forEach((binding,index)=>{
  if(!binding.ownerRowId)return;
  const group=ownershipChecks.get(binding.ownerRowId)??{conditions:[],memberRowIds:[]};
  group.conditions.push(rows[index]!.inclusion!);
  group.memberRowIds.push(resources[index]!.row_id);ownershipChecks.set(binding.ownerRowId,group);
 });
 const controlAst=compileFormulaGraph('0');
 const checks=[...ownershipChecks].map(([ownerRowId,group],index)=>{
  const rowId='subwork-resource:'+schedule.key+':ownership-check:'+index,formulaId=rowId+':formula';
  const operation=operations.values().next().value!;
  const {additionalOperations:_shared,...primary}=operation;
  const body={id:'resource-'+rowId,row_id:rowId,ordinal:resources.length+index,section:'Проверка обеспечения',category:'service',title_ru:'Проверка включённого обеспечения',
   unit_id:'',formula_id:formulaId,inclusion_ast:{kind:'or',operands:group.conditions},procurement_eligible:false,cost_owner_id:null,
   resource_graph:{formulaId,normalizedUom:'',costOwner:'scope',costTreatment:'INFORMATIONAL_SCOPE',operationCompositionV1:primary,
    scopeRequirementV1:{contractVersion:'canonical-scope-requirement/v1',kind:'INCLUDED',groupId:primary.groupId,
     groupTitleRu:primary.groupTitleRu,titleRu:'Подтвердить владельца включённых ресурсов',
     reasonRu:'Включённые ресурсы обеспечиваются действующей позицией. Если её стоимость исключена, восстановите позицию или измените способ обеспечения ресурсов.',
     sourceEvidence:[{sha256:schedule.sourceSha256,locator:'Условия обеспечения и граница выбранной цены; без дополнительной нормы или повторной оплаты'}],
     exactScopeWhen:{kind:'literal',value:true},coveringRowIds:[ownerRowId],originalRowIds:group.memberRowIds,costExclusionBreaksScopeV1:true},
    publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:'Проверка включённого обеспечения',nameRu:'Проверка включённого обеспечения',
     brandAndModelRu:null,specificationRu:null,detailsRu:[],rowKind:'CALCULATION_DETAIL'}},
   source_metadata:{sourceRole:'PROJECT_RESOURCE_OWNER_SCOPE_CHECK',numericNormAccepted:false,separatePaymentAccepted:false,automaticGenericPriceInheritanceAllowed:false}};
  return {resource:{...body,row_sha256:estimateDeterministicHash(body)},formula:{formula_id:formulaId,expression_source:'0',output_unit_id:'',ast:controlAst.ast,
   input_parameter_ids:controlAst.inputParameterIds,ast_sha256:estimateDeterministicHash(controlAst.ast)}};
 });
 // Retire an aggregate gap only when its complete replacement is declared.
 // The original historical definition remains untouched. New missing facts
 // become needs on the real, individually named physical resource rows.
 const replaced=parent.resources.map(row=>{
  const keys=schedule.replacements[row.row_id];
  const operation=row.resource_graph.operationCompositionV1 as Record<string,unknown>|undefined;
  const shared=Array.isArray(operation?.additionalOperations)?operation.additionalOperations.map(value=>{
   if(!value||typeof value!=='object'||Array.isArray(value))return value;
   const related=value as Record<string,unknown>,key=typeof related.operationId==='string'?related.operationId.split(':').at(-1):undefined;
   const condition=key?schedule.sharedOperationResourceConditions?.[key]:undefined;
   return condition?{...related,whenResourcePresent:condition}:value;
  }):null;
  const operationGraph=shared?{operationCompositionV1:{...operation,additionalOperations:shared}}:{};
  if(!keys){if(!shared)return row;const {row_sha256:_old,...body}=row;const changed={...body,resource_graph:{...row.resource_graph,...operationGraph}};return {...changed,row_sha256:estimateDeterministicHash(changed)};}
  if(!keys.length||keys.some(key=>!schedule.positions.some(position=>position.key===key)))throw Error('PROJECT_RESOURCE_REPLACEMENT_INCOMPLETE:'+row.row_id);
  if(row.resource_graph.costTreatment!=='INFORMATIONAL_SCOPE'||row.procurement_eligible)throw Error('PROJECT_RESOURCE_CANNOT_RETIRE_PAID_ROW:'+row.row_id);
  const {row_sha256:_old,...body}=row;
  const changed={...body,inclusion_ast:{kind:'literal',value:false},resource_graph:{...row.resource_graph,...operationGraph,
   supersededAggregateNeedV1:{contractVersion:'project-subwork-resource-schedule/r1',resourceRowIds:resources.filter(resource=>keys.some(key=>resource.row_id.startsWith(rowIdFor(key,'')))).map(resource=>resource.row_id)}}};
  return {...changed,row_sha256:estimateDeterministicHash(changed)};
 });
 const allIds=new Set(parent.parameters.map(p=>p.parameter_id));
 if(parameters.some(p=>allIds.has(p.parameter_id)))throw Error('PROJECT_RESOURCE_PARAMETER_COLLISION');
 return {...parent,parameters:[...parent.parameters,...parameters].map((p,ordinal)=>({...p,ordinal})),formulas:[...parent.formulas,...added.formulas,...checks.map(check=>check.formula)],
  resources:[...replaced,...resources,...checks.map(check=>check.resource)].map((row,ordinal)=>{
   const {row_sha256:_old,...body}=row,changed={...body,ordinal};return {...changed,row_sha256:estimateDeterministicHash(changed)};
  })};
}
