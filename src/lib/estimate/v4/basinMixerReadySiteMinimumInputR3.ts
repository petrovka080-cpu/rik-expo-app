import {basinMixerGrohe33265002PackR1 as source} from './basinMixerGrohe33265002KitR1';
import {buildAutomaticConstructionOwnerR1,type AutomaticOwnerDefinition,type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {effectivePurchaseBalanceExpressionsR1} from './effectivePurchaseBalanceR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';

/** An explicit new-order scope of the existing mixer work. Product composition
 * comes from its exact selected-product passport. Inventory, delivery and a
 * different installation site are outside this scope, never assumed zero. */
export const basinMixerReadySiteMinimumInputR3={
 contract:'basin-mixer-ready-site-minimum-input/r3',
 prefix:'plumbing:basin-mixer:ready-site:r3',
 catalogId:source.catalogId,
 countParameterId:source.primaryParameterId,
 siteParameterId:'mixer_ready_site_scope_r3',
 selectorValueRu:'Монтаж нового комплектного смесителя; закупка по потребности без вычета остатков и резерва',
 siteValueRu:source.siteValueRu+'; обычный доступ; дополнительная защита, специальное оснащение и вывоз отходов не требуются',
 scopeRu:'Монтаж комплектного смесителя на готовую совместимую раковину. Один полный комплект на одно место; крепление, штатные подключения и местная проверка входят в один монтаж. Расчёт нового заказа без вычета складских остатков и добавления резерва. Доставка, общая опрессовка и переделки — отдельные работы.',
} as const;

export function basinMixerReadySiteMinimumInputDefinitionR3():AutomaticOwnerDefinition{
 const profile=basinMixerReadySiteMinimumInputR3,p=profile.prefix,id=(key:string)=>p+':'+key;
 const n=profile.countParameterId,site=profile.siteParameterId;
 const active={kind:'greater_than' as const,parameterId:n,value:0};
 const ready={kind:'and' as const,operands:[active,{kind:'equals' as const,parameterId:site,value:profile.siteValueRu}]};
 const balance=effectivePurchaseBalanceExpressionsR1({ownerRowId:id('kit-order'),orderUnitId:'item',consumed:n,stock:'0',reserve:'0',quantum:'1'});
 const rows:AutomaticRowSpec[]=[];
 const add=(key:string,title:string,category:string,unitId:string,expression:string,extra:Partial<AutomaticRowSpec>={})=>rows.push({
  rowId:id(key),formulaId:id('formula:'+key),section:'Монтаж смесителя',title,category,unitId,expression,
  inclusion:active,inputParameterIds:[site],procurement:false,costTreatment:'INFORMATIONAL_SCOPE',...extra});
 add('kit-consumed','Комплектный смеситель для установки','material','item',n,{purchaseBalanceOwnerRowId:id('kit-order')});
 add('kit-order','Смеситель с подводкой, креплением и донным клапаном','material','item',`ceil(${n})`,{
  ...balance.owner,procurement:true,costTreatment:'OWN_COST',purchaseBalance:{
   quantityMode:'supply_quantum',balanceScope:'new_order_vs_required_consumption',requirementBasis:'selected_supply_order',
   unitId:'item',stockExpression:'0',reserveExpression:'0',orderQuantumExpression:'1',
   consumedExpression:n,plannedConsumptionExpression:n}});
 for(const [key,title,expression]of[
  ['kit-remaining','Остаток нового заказа после монтажа',balance.remaining],
  ['kit-free','Превышение нового заказа над потребностью',balance.free],
  ['kit-shortage','Недостающие комплекты нового заказа',balance.consumptionShortage],
  ['kit-reserve-deficit','Проверка границы заказа без резерва',balance.reserveDeficit],
 ]as const)add(key,title,'material','item',expression,{purchaseBalanceOwnerRowId:id('kit-order')});
 const components={
  'flexible-hoses-reference':'Комплект гибкой подводки смесителя',
  'waste-set-reference':'Донный клапан 1¼',
  'mounting-set-reference':'Комплект крепления смесителя',
 };
 for(const component of source.components)add(component.id,components[component.id as keyof typeof components],'material','item',n,{purchaseBalanceOwnerRowId:id('kit-order')});
 add('complete-installation-work','Монтаж смесителя','work','item',n,{costTreatment:'OWN_COST'});
 for(const operation of source.operations)add('process-'+operation.id,operation.titleRu,'work','item',n);
 for(const need of source.needs)add('open-'+need.id,need.titleRu,need.category,'',id('scope_'+need.id).replace(/[^A-Za-z0-9_]/gu,'_'));
 const tools=[
  {key:'mounting-key',title:'Ключ для крепления смесителя',operationId:'mounting'},
  {key:'waste-key',title:'Ключ для донного клапана',operationId:'waste-connection'},
 ];
 for(const tool of tools)add(tool.key,tool.title,'tool','piece',id('provision_'+tool.key).replace(/[^A-Za-z0-9_]/gu,'_'));
 const nonNumeric=[...source.needs.map(need=>({key:'open-'+need.id,parameter:id('scope_'+need.id).replace(/[^A-Za-z0-9_]/gu,'_')})),
  ...tools.map(tool=>({key:tool.key,parameter:id('provision_'+tool.key).replace(/[^A-Za-z0-9_]/gu,'_')}))];
 const built=buildAutomaticConstructionOwnerR1({contract:profile.contract,semanticOwner:p,operationCompositionGroupId:p,
  sourceId:source.sourceId,normId:source.normId,sourceMetadata:{source_title:'Монтаж комплектного смесителя на готовом узле',
   source_document_version:source.source.edition,definition_hash:source.source.sha256,artifact_sha256:source.source.sha256,exact_locator:source.source.locatorRu},
  applicabilityRu:profile.scopeRu,ordinary:[{id:n,title:'Сколько смесителей установить?',kind:'ordinary',valueType:'integer',unitId:'item',min:0,max:1_000_000}],
  conditional:[{id:site,title:'Место готово к обычному монтажу?',kind:'conditional',valueType:'enum',unitId:null,values:[profile.siteValueRu],requiredWhen:active},
   ...nonNumeric.map(item=>({id:item.parameter,title:'Обеспечение и граница: '+item.key,kind:'internal' as const,valueType:'decimal' as const,unitId:null,min:0}))],
  profile:[],rows,deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:[...source.exclusionsRu,
   'Unknown total warehouse inventory is not a zero. This explicitly selected new order does not deduct inventory.',
   'Included ordinary tools do not have an invented count, purchase or separate price.']});
 const parameters=built.parameters.map(parameter=>({...parameter,truth_metadata:{...parameter.truth_metadata,
  source_confirmation_required:false,...(parameter.parameter_id===n||parameter.parameter_id===site?{
   value_source_role:'PROJECT_SPECIFIC_INPUT',provenance:{consumer_input_role_v1:'OBJECT_FACT'},
   guide:{...(parameter.truth_metadata.guide as Record<string,unknown>),guide_short_ru:parameter.parameter_id===n
    ?'Укажите число монтажных мест. Комплект и штатные детали определяет выбранное исполнение.'
    :'Подтвердите готовность раковины, выводов и слива. При переделках или специальном обеспечении выберите расширенный состав.'}}:{}),
 }}));
 const resources=built.resources.map(row=>{
  const key=row.row_id.slice(p.length+1),component=source.components.find(item=>item.id===key),tool=tools.find(item=>item.key===key);
  const need=source.needs.find(item=>'open-'+item.id===key),processKey=key.startsWith('process-')?key.slice(8):undefined;
  const operation=source.operations.find(item=>item.id===(component?.operationId??tool?.operationId??need?.operationId??processKey??'mounting'))!;
  const whole=key==='complete-installation-work',kit=key==='kit-order';
  const notes=need?['Не входит в выбранную границу обычного монтажа. При необходимости добавьте соответствующую работу.',need.reasonRu]
   :tool?['Обычный ручной инструмент обеспечивает исполнитель в составе монтажа. Отдельная покупка, количество и вторая оплата не назначаются.']
   :component?['Входит в один оплачиваемый комплект. Количество означает число установленных комплектов, отдельно не покупать.']
   :kit?['Новый заказ по числу монтажных мест; складской остаток и резерв в этой границе заказа не учитываются.']
   :whole?['Одна расценка за крепление, штатные подключения и местную проверку. Производительность и человеко-часы не заявлены.']:[];
  const scope=need||tool?{scopeRequirementV1:{contractVersion:'canonical-scope-requirement/v1',
   kind:tool?'INCLUDED':'NOT_APPLICABLE',groupId:id('operation:'+operation.id),groupTitleRu:operation.titleRu,
   titleRu:row.title_ru,reasonRu:notes.join(' '),exactScopeWhen:ready,coveringRowIds:tool?[id('complete-installation-work')]:[],
   originalRowIds:[],...(tool?{costExclusionBreaksScopeV1:true}:{}),sourceEvidence:[{sha256:source.source.sha256,locator:source.source.locatorRu}]}}:{};
  const {row_sha256:_old,...body}=row;
  const changed={...body,cost_owner_id:component?id('kit-order'):processKey||tool?id('complete-installation-work'):row.cost_owner_id,
   resource_graph:{...row.resource_graph,...scope,
    ...(need||tool?{inputParameterIds:[site]}:{}),
    operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:p,groupTitleRu:'Монтаж смесителя',
     operationId:id('operation:'+operation.id),operationTitleRu:operation.titleRu,processOrdinal:whole?0:operation.ordinal,
     processRole:whole?'COST_SUMMARY':'PROCESS',completionCriterionRu:operation.criterionRu,
     ...(whole||kit?{additionalOperations:source.operations.filter(item=>item.id!==operation.id).map(item=>({operationId:id('operation:'+item.id),
      operationTitleRu:item.titleRu,processOrdinal:item.ordinal,processRole:'PROCESS',completionCriterionRu:item.criterionRu}))}:{})},
    publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:row.title_ru,nameRu:row.title_ru,
     brandAndModelRu:kit||component?'GROHE Eurosmart 33265002, EAN 4005176861543':null,
     specificationRu:kit?'Выбранное исполнение: хром, штатная подводка, донный клапан 1¼ и крепление. Точный артикул и источник сохранены в характеристиках.':null,
     detailsRu:notes,...(need||tool||processKey?{rowKind:'PROCESS_NOTE'}:key.startsWith('kit-')&&!kit?{rowKind:'CALCULATION_DETAIL'}:{})}},
   source_metadata:{...row.source_metadata,normativeTrace:kit||component?row.source_metadata?.normativeTrace:[],
    sourceRole:kit||component?'MANUFACTURER_COMPLETE_PRODUCT_SCOPE':whole?'DECLARED_COMPLETE_INSTALLATION_UNIT':tool?'INCLUDED_ORDINARY_TOOL':'DECLARED_SELECTED_WORK_SCOPE',
    automaticGenericPriceInheritanceAllowed:false,selectedNewOrderWithoutInventoryDeduction:true,numericToolNormInvented:false,
    full_technical_acceptance:false,publicationAllowed:false}};
  return{...changed,row_sha256:estimateDeterministicHash(changed)};
 });
 return{...built,parameters,resources};
}

/** Forward authoring on a complete captured definition. Existing branches,
 * rows, prices and saved versions retain their meaning. Publication still uses
 * the ordinary retained-parent admission and publisher. */
export function appendBasinMixerReadySiteMinimumInputR3(
 parent:Pick<AutomaticOwnerDefinition,'parameters'|'formulas'|'resources'>,
 selectorParameterId='mixer_composition_method',
){
 const profile=basinMixerReadySiteMinimumInputR3,subject=basinMixerReadySiteMinimumInputDefinitionR3();
 const selector=parent.parameters.find(parameter=>parameter.parameter_id===selectorParameterId);
 const primary=parent.parameters.find(parameter=>parameter.parameter_id===profile.countParameterId);
 const values=selector?.constraints_json?.values;
 if(!selector||!primary||primary.unit_id!=='item'||!Array.isArray(values)||values.includes(profile.selectorValueRu)
  ||subject.resources.some(row=>parent.resources.some(old=>old.row_id===row.row_id)))throw Error('COMPLETE_EXISTING_MIXER_PARENT_REQUIRED');
 const selected={kind:'equals',parameterId:selectorParameterId,value:profile.selectorValueRu};
 const parameters=[...parent.parameters.map(parameter=>parameter===selector?{...parameter,
  constraints_json:{...parameter.constraints_json,values:[...values,profile.selectorValueRu]},
  truth_metadata:{...parameter.truth_metadata,resource_branch_consumers:[...new Set([
   ...(Array.isArray(parameter.truth_metadata.resource_branch_consumers)?parameter.truth_metadata.resource_branch_consumers:[]),...subject.resources.map(row=>row.row_id)])]}}
  :parameter===primary?{...parameter,constraints_json:{...parameter.constraints_json,
   requiredWhen:{kind:'or',operands:[parameter.constraints_json?.requiredWhen??{kind:'greater_than',parameterId:profile.countParameterId,value:0},selected]}}}:parameter),
  ...subject.parameters.filter(parameter=>parameter.parameter_id!==profile.countParameterId).map(parameter=>({...parameter,required:false,
   constraints_json:{...parameter.constraints_json,...(parameter.constraints_json?.requiredWhen?{
    requiredWhen:{kind:'and',operands:[selected,parameter.constraints_json.requiredWhen]}}:{})}}))]
  .map((parameter,ordinal)=>({...parameter,ordinal}));
 const resources=[...parent.resources,...subject.resources.map(row=>{
  const {row_sha256:_old,...body}=row;const changed={...body,inclusion_ast:{kind:'and',operands:[selected,row.inclusion_ast]}};
  return{...changed,row_sha256:estimateDeterministicHash(changed)};
 })].map((row,ordinal)=>({...row,ordinal}));
 return{parameters,formulas:[...parent.formulas,...subject.formulas],resources,
  newPrimarySelection:{selectorValue:profile.selectorValueRu,primaryMeasureParameterId:profile.countParameterId,unitId:'item'},
  newlySourceBoundRowIds:subject.resources.filter(row=>row.row_id.endsWith(':kit-consumed')
   ||source.components.some(component=>row.row_id.endsWith(':'+component.id))).map(row=>row.row_id)};
}
