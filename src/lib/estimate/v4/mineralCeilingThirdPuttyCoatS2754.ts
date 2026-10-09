import pack from '../../../../data/estimate-benchmarks/source-packs/mineral-ceiling-third-putty-coat-s27-54.json';
import {buildAutomaticConstructionOwnerR1,compileAutomaticConstructionOwnerR1,type AutomaticParameterSpec,type AutomaticRowSpec,type AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';
import {effectivePurchaseBalanceExpressionsR1} from './effectivePurchaseBalanceR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
export const ceilingThirdPuttySourcePackS2754=pack;
const prefix='ceiling-third-putty:krer150402706',area='ceiling_area_m2';
const facts=['ceiling_substrate','third_coat_project_justification','third_coat_project_reference','room_height_m','room_conditions'];
const conditional:AutomaticParameterSpec[]=[
 {id:'ceiling_substrate',title:'Подтверждённое подготовленное основание потолка',valueType:'enum',unitId:null,kind:'conditional',values:[pack.substrateValue]},
 {id:'third_coat_project_justification',title:'Проектное назначение третьего слоя',valueType:'enum',unitId:null,kind:'conditional',values:[pack.justificationValue]},
 {id:'third_coat_project_reference',title:'Ссылка или номер проекта, обосновывающего третий слой',valueType:'text',unitId:null,kind:'conditional'},
 {id:'room_height_m',title:'Высота помещения от пола до потолка',valueType:'decimal',unitId:'m',kind:'conditional',min:0.000001,max:3.5},
 {id:'room_conditions',title:'Условия применения исходного состава',valueType:'enum',unitId:null,kind:'conditional',
  values:['Сухое помещение; применение исходного масляно-клеевого состава подтверждено проектом']},
];
const rows:AutomaticRowSpec[]=[];
const add=(id:string,title:string,category:string,unitId:string,expression:string,extra:Partial<AutomaticRowSpec>={})=>rows.push({
 rowId:prefix+':'+id,formulaId:prefix+':formula:'+id,section:pack.titleRu,category,title,unitId,expression,
 procurement:false,inputParameterIds:facts,...extra});
for(const resource of pack.resourceTable){
 const consumption=`${area}*${resource.ratePer100M2}/100`;
 if(resource.category==='material'){
  for(const [suffix,title,min] of [['stock','Уже есть на объекте',0],['reserve','Сохранить в запасе',0],['quantum','Подтверждённое количество в одной единице поставки',0.000000001]] as const)
   conditional.push({id:resource.id+'_'+suffix,title:`${title}: ${resource.nameRu}`,valueType:'decimal',unitId:resource.unitId,kind:'conditional',min});
  const balance=effectivePurchaseBalanceExpressionsR1({ownerRowId:prefix+':'+resource.id,orderUnitId:resource.unitId,
   consumed:consumption,stock:resource.id+'_stock',reserve:resource.id+'_reserve',quantum:resource.id+'_quantum'});
  add(resource.id,resource.nameRu,'material',resource.unitId,
   `ceil(max(0,(${consumption})+${resource.id}_reserve-${resource.id}_stock)/${resource.id}_quantum)*${resource.id}_quantum`,
   {procurement:true,...balance.owner});
  add(resource.id+'-consumed','Нормативный расход: '+resource.nameRu,'material',resource.unitId,consumption,
   {costTreatment:'INFORMATIONAL_SCOPE',purchaseBalanceOwnerRowId:prefix+':'+resource.id});
 }else add(resource.id,resource.nameRu,resource.category,resource.unitId,consumption,
  resource.id==='operator'?{costTreatment:'INCLUDED_IN_RESOURCE_ROWS'}:{});
}
add('application','Нанесение третьего слоя шпаклёвки — в общем нормативном труде','work','m2',area,{costTreatment:'INCLUDED_IN_RESOURCE_ROWS'});
add('sanding','Шлифование третьего слоя — в общем нормативном труде','work','m2',area,{costTreatment:'INCLUDED_IN_RESOURCE_ROWS'});
for(const gap of pack.openAdditionalScope){
 conditional.push({id:'open_scope_qty_'+gap.id.replaceAll('-','_'),title:gap.nameRu,valueType:'decimal',unitId:gap.unitId,kind:'conditional',min:0});
 add(gap.id,gap.nameRu,gap.category,gap.unitId,'open_scope_qty_'+gap.id.replaceAll('-','_'));
}
const built=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:prefix,sourceId:pack.sourceId,normId:pack.normId,
 sourceMetadata:{source_title:'КРЕР15-2015, таблица15-04-027-06; исходный масляно-клеевой состав',source_document_version:pack.source.edition,
  definition_hash:pack.source.sha256,artifact_sha256:pack.source.sha256,exact_locator:'Стр.8 п.1.1(г), стр.8–9 п.1.2(а), стр.11 п.1.17; стр.191–192 таблица15-04-027, колонка06'},
 applicabilityRu:pack.scopeRu,ordinary:[{id:area,title:'Площадь подготовленного минерального потолка',valueType:'decimal',unitId:'m2',kind:'ordinary',min:0.000001}],
 profile:[],conditional,rows,deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:pack.excludedRu});
export const ceilingThirdPuttyDefinitionS2754:AutomaticOwnerDefinition={...built,
 parameters:built.parameters.map(parameter=>({...parameter,truth_metadata:parameter.parameter_id.startsWith('open_scope_qty_')?
  {...parameter.truth_metadata,visibility_role:'INTERNAL_ONLY',value_source_role:'UNRESOLVED_APPLICATION_NORM',
   provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL'},unresolved_norm_reason:'Дополнительная применимость, объём и владелец цены не подтверждены; исходная таблица их не устанавливает.'}:
  {...parameter.truth_metadata,source_confirmation_required:false}})),
 resources:built.resources.map(resource=>{
  const key=resource.row_id.slice(prefix.length+1),norm=pack.resourceTable.find(r=>r.id===key.replace('-consumed','')),
   gap=pack.openAdditionalScope.find(r=>r.id===key),included=resource.resource_graph.costTreatment==='INCLUDED_IN_RESOURCE_ROWS';
  const parent=prefix+(key==='operator'?':lift':':labor');
  const {row_sha256:_old,...content}=resource;
  const result={...content,cost_owner_id:included?parent:resource.cost_owner_id,resource_graph:{...resource.resource_graph,
   ...(included?{parentCostOwnerId:parent,includedInResourceOwnerRowId:parent}:{}),
   operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:prefix,groupTitleRu:pack.titleRu,
    operationId:prefix+':'+(gap?.operation??norm?.operation??'coat-and-sand'),
    operationTitleRu:gap?.operation==='completion'?'Контроль, уборка и отходы':gap?.operation==='protection'?'Защита прилегающих поверхностей':gap?.operation==='equipment'?'Дополнительное оснащение':norm?.operation==='supply-access'?'Нормативная механизация':'Третий слой и шлифование',
    completionCriterionRu:gap?'Применимость, объём и включение в цену подтверждены.':'Назначенный третий слой нанесён и отшлифован в заявленных границах.',
    processOrdinal:gap?40:norm?.operation==='supply-access'?10:20},
   publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:resource.title_ru,
    nameRu:resource.title_ru,brandAndModelRu:null,specificationRu:norm?.characteristicsRu??null,
    detailsRu:gap?[gap.quantityGap,'Включение в комплексную цену и отсутствие повторной оплаты требуют подтверждения.']:
     [`Применение: ${norm?.applicationRu??pack.scopeRu}`,
      ...(norm?[`КРЕР15-04-027-06: ${norm.ratePer100M2} ${norm.unitId} на100м²; ресурс ${norm.resourceCode??'машинист по таблице'}.`]:[]),
      ...(key.endsWith('-consumed')?['Нормативный расход показан отдельно от заказа; повторно не оплачивается.']:[]),
      ...(norm?.category==='material'&&!key.endsWith('-consumed')?['КРЕР подтверждает расход. Заказ рассчитывает общий баланс по фактическому наличию, резерву и подтверждённой единице поставки.']:[])]}},
   source_metadata:{...resource.source_metadata,sourceRole:gap?'UNRESOLVED_INSTALLATION_SOURCE':norm?.category==='material'&&!key.endsWith('-consumed')?'DERIVED_PURCHASE_BALANCE':'OFFICIAL_NORM',
    normativeTrace:gap?[]:((resource.source_metadata?.normativeTrace??[]) as Record<string,unknown>[]).map(trace=>({...trace,sourceRole:'OFFICIAL_NORM'})),
    source_artifact_sha256:pack.source.sha256,official_url:pack.source.officialUrl,official_pdf_url:pack.source.pdfUrl,
    exact_column:pack.normId,originalMaterialSystemOnly:true,full_technical_acceptance:false}};
  return {...result,row_sha256:estimateDeterministicHash(result)};
 })};
export function compileCeilingThirdPuttyS2754(input:Record<string,unknown>){return compileAutomaticConstructionOwnerR1({
 catalogId:pack.catalogId,compilerVersion:pack.contract,primaryMeasureParameterId:area,definition:ceilingThirdPuttyDefinitionS2754,submittedParameters:input});}
