import pack from '../../../../data/estimate-benchmarks/source-packs/led-grid-panel-dvo6560-6562-s27-54.json';
import {buildAutomaticConstructionOwnerR1,compileAutomaticConstructionOwnerR1,type AutomaticOwnerDefinition,
 type AutomaticParameterSpec,type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {effectivePurchaseBalanceExpressionsR1} from './effectivePurchaseBalanceR1';import {estimateDeterministicHash} from '../estimateDeterministicHash';
export const ledGridPanelSourcePackS2754=pack;
const prefix='led-grid:dvo6560-6562',count='panel_count';
export function ledGridProductNameS2754(index:number){const p=pack.products[index];
 return `Светодиодная панель ${p.family}, ${p.sku}, 36 Вт, ${p.colourTemperatureK} К, ${p.diffuserRu.toLowerCase()} рассеиватель`;}
const facts=['grid_ready_confirmed','supply_ready_confirmed','operating_conditions_confirmed','installation_detail_reference'];
const conditional:AutomaticParameterSpec[]=[
 {id:'selected_panel_sku',title:'Артикул и исполнение одной выбраннойLED-панели',valueType:'enum',unitId:null,kind:'conditional',values:pack.products.map(p=>p.sku)},
 {id:'grid_ready_confirmed',title:'Готовность и совместимость потолочной решётки',valueType:'enum',unitId:null,kind:'conditional',values:[pack.gridValue]},
 {id:'supply_ready_confirmed',title:'Готовность существующего питанияL/N/PE',valueType:'enum',unitId:null,kind:'conditional',values:[pack.supplyValue]},
 {id:'operating_conditions_confirmed',title:'Условия помещения для выбранного исполнения',valueType:'enum',unitId:null,kind:'conditional',values:[pack.conditionsValue]},
 {id:'installation_detail_reference',title:'Принятый узел потолка, подключения и применимых подвесов; ссылка или номер',valueType:'text',unitId:null,kind:'conditional'},
 {id:'connector_joint_approval',title:'Подтверждённый совместимый узелIEK–WAGO221-412, обаCu-конца и оболочка',valueType:'enum',unitId:null,kind:'conditional',values:['VERIFIED_COMPATIBLE_IEK_WAGO_JOINT']},
];
const rows:AutomaticRowSpec[]=[];
const add=(id:string,title:string,category:string,unitId:string,expression:string,extra:Partial<AutomaticRowSpec>={})=>rows.push({
 rowId:prefix+':'+id,formulaId:prefix+':formula:'+id,section:pack.titleRu,category,title,unitId,expression,
 procurement:false,inputParameterIds:[...facts,'selected_panel_sku'],...extra});
for(const [index,p] of pack.products.entries()){
 const name=ledGridProductNameS2754(index),owner=prefix+':'+p.key,consumed=count;
 for(const [suffix,title,min] of [['stock','Пригодное наличие выбранного артикула',0],['reserve','Сохраняемый резерв выбранного артикула',0],['quantum','Кратность поставки выбранного артикула',1]] as const)
  conditional.push({id:p.key.replaceAll('-','_')+'_'+suffix,title:title+': '+p.sku,valueType:'integer',unitId:'pcs',kind:'conditional',min,
   requiredWhen:{parameterId:'selected_panel_sku',value:p.sku}});
 const ids={stock:p.key.replaceAll('-','_')+'_stock',reserve:p.key.replaceAll('-','_')+'_reserve',quantum:p.key.replaceAll('-','_')+'_quantum'};
 const balance=effectivePurchaseBalanceExpressionsR1({ownerRowId:owner,orderUnitId:'pcs',consumed,...ids});
 const inclusion={kind:'equals' as const,parameterId:'selected_panel_sku',value:p.sku};
 add(p.key,name,'material','pcs',`ceil(max(0,${count}+${ids.reserve}-${ids.stock})/${ids.quantum})*${ids.quantum}`,{procurement:true,inclusion,...balance.owner});
 add(p.key+'-consumed','Чистая потребность: '+name,'material','pcs',count,{inclusion,costTreatment:'INFORMATIONAL_SCOPE',purchaseBalanceOwnerRowId:owner});
 add(p.key+'-included','Корпус, LED, драйвер, рассеиватель, рамка, заводской вывод и внутренние крепления — в составе '+p.sku,
  'material','pcs',count,{inclusion,costTreatment:'INCLUDED_IN_RESOURCE_ROWS'});
}
add('installed-scope','Количество панелей, устанавливаемых в готовую решётку — справочный объём без отдельной цены','work','pcs',count,{costTreatment:'INFORMATIONAL_SCOPE'});
for(const gap of [...pack.sourceNeeds,pack.connectorCandidate]){
 const parameter='open_qty_'+gap.id.replaceAll('-','_');
 conditional.push({id:parameter,title:gap.nameRu,valueType:'decimal',unitId:gap.unitId,kind:'conditional',min:0});
 add(gap.id,gap.nameRu,gap.id===pack.connectorCandidate.id?'material':('category' in gap?gap.category:'service'),gap.unitId,parameter,
  gap.id===pack.connectorCandidate.id?{procurement:true,inputParameterIds:[...facts,'selected_panel_sku','connector_joint_approval']}:{});
}
const source=pack.source;
const built=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:prefix,sourceId:pack.sourceId,normId:pack.normId,
 sourceMetadata:{source_title:'IEK: руководствоДВО6560–6562, издание5; изделия и встраиваемый монтаж',source_document_version:source.edition,
  definition_hash:source.sha256,artifact_sha256:source.sha256,exact_locator:source.locatorRu},applicabilityRu:pack.scopeRu,
 ordinary:[{id:count,title:'Количество одинаковых устанавливаемыхLED-панелей',valueType:'integer',unitId:'pcs',kind:'ordinary',min:1}],
 profile:[],conditional,rows,deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:pack.excludedRu});
const requiredFacts=new Set([...facts,'selected_panel_sku','connector_joint_approval']);
export const ledGridPanelDefinitionS2754:AutomaticOwnerDefinition={...built,
 parameters:built.parameters.map(parameter=>({...parameter,required:parameter.required||requiredFacts.has(parameter.parameter_id),
  truth_metadata:parameter.parameter_id.startsWith('open_qty_')||parameter.parameter_id==='connector_joint_approval'?
   {...parameter.truth_metadata,visibility_role:'INTERNAL_ONLY',value_source_role:'UNRESOLVED_APPLICATION_NORM',
    provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL'},unresolved_norm_reason:'Нужны применимый узел/источник и подтверждённое количество; инструкция не содержит монтажных часов и расхода этих дополнительных ресурсов.'}:
   {...parameter.truth_metadata,source_confirmation_required:false}})),
 resources:built.resources.map(resource=>{
  const key=resource.row_id.slice(prefix.length+1),product=pack.products.find(p=>key===p.key||key===p.key+'-consumed'||key===p.key+'-included'),
   gap=pack.sourceNeeds.find(g=>g.id===key),connector=key===pack.connectorCandidate.id,included=key.endsWith('-included'),parent=product?prefix+':'+product.key:null;
  const operation=product?'product':gap?.operation??(connector?'connection':'installation');
  const titles:Record<string,string>={product:'Панель и её заводская комплектность',installation:'Установка в готовую решётку и подключение',connection:'Соединение заводского выводаL/N/PE',
   support:'Применимые подвесы и усиление',equipment:'Доступ и инструмент',acceptance:'Электрические проверки и приёмка',protection:'Защита зоны',delivery:'Доставка и разгрузка',completion:'Уборка и упаковка'};
  const {row_sha256:_old,...content}=resource;
  const result={...content,cost_owner_id:included?parent:resource.cost_owner_id,resource_graph:{...resource.resource_graph,
   ...(included?{parentCostOwnerId:parent,includedInResourceOwnerRowId:parent}:{}),
   operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:prefix,groupTitleRu:pack.titleRu,
    operationId:prefix+':'+operation,operationTitleRu:titles[operation],processOrdinal:product?10:gap?40:20,
    completionCriterionRu:product?'Подтверждён один артикул, его комплектность и реальный заказ.':'Применимый состав, количество и владелец цены подтверждены.'},
   publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:resource.title_ru,nameRu:resource.title_ru,brandAndModelRu:null,
    specificationRu:product?`Артикул${product.sku}; 595×595×20мм,2кг; 230В/50Гц,36Вт,3960лм,IP40,классI; ${product.colourTemperatureK}К; ${product.diffuserRu.toLowerCase()} рассеиватель.`:
     connector?pack.connectorCandidate.characteristicsRu:null,
    detailsRu:product?[`Применение: вместо принятой потолочной плиты600×600 по п.4.7; только выбранный артикул${product.sku}.`,
     ...(included?[pack.includedAssemblyRu,'Это справочный состав изделия, а не количество отдельныхLED-чипов или винтов; повторный заказ запрещён.']:
      key.endsWith('-consumed')?['Чистая потребность равна числу устанавливаемых панелей; заказ учитывает фактические наличие, резерв и упаковку выбранного артикула.']:
      ['Другие артикулы не закупаются вместе с этим. Наличие, резерв и упаковка не назначены автоматически.'])]:
     connector?[pack.connectorCandidate.applicationRu,...pack.connectorCandidate.restrictionsRu,
      'Кандидат: конкретный узел и расход пока не подтверждены, цена и заказ не назначены.']:
      gap?[gap.reasonRu]:[pack.scopeRu,'Справочный объём не заменяет труд и не оплачивается второй раз.']}},
   source_metadata:{...resource.source_metadata,sourceRole:gap||connector?'UNRESOLVED_INSTALLATION_SOURCE':
    product&&!key.endsWith('-consumed')&&!included?'DERIVED_PURCHASE_BALANCE':'VERIFIED_MANUFACTURER_PRODUCT_AND_KNOWN_ITEM_SCOPE',
    normativeTrace:gap||connector?[]:((resource.source_metadata?.normativeTrace??[]) as Record<string,unknown>[]).map(trace=>({...trace,sourceRole:'MANUFACTURER_PRODUCT_FACT_NOT_LABOR_NORM'})),
    source_artifact_sha256:connector?null:source.sha256,
    official_url:connector?pack.connectorCandidate.sources[0].url:source.officialUrl,productSku:product?.sku??null,
    ...(connector?{manufacturerReferences:pack.connectorCandidate.sources,manufacturerByteSnapshotSha256:null,
     sourceEvidenceKind:'SECONDARY_MANUFACTURER_CANDIDATE_WITH_UNCONFIRMED_IEK_COMPATIBILITY',
     sourceAttributionRu:'Характеристики кандидата — по указанным страницамWAGO; руководствоIEK их не подтверждает. Байтовый хеш страницWAGO не получен.',
     compatibleJointApproved:false,quantityNormApproved:false,threePiecesPerPanelNotAssumed:true}:{}),
    full_technical_acceptance:false,integralPartsNotProcuredAgain:true,surfaceFixingsNotInherited:true}};
  return {...result,row_sha256:estimateDeterministicHash(result)};
 })};
export function compileLedGridPanelS2754(input:Record<string,unknown>){return compileAutomaticConstructionOwnerR1({catalogId:pack.catalogId,
 compilerVersion:pack.contract,primaryMeasureParameterId:count,definition:ledGridPanelDefinitionS2754,submittedParameters:input});}
export function ledGridCompletenessMapS2754(){return {contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'PRODUCT_SYSTEM_TDS',
 generatedFromCurrentRows:false,evidenceSha256:source.sha256,evidenceReferences:[source.officialUrl,source.locatorRu],
 entries:pack.products.flatMap(p=>[
  {expectedResourceId:'product:'+p.sku,operationId:'product',category:'material',specification:'Только выбранная заводская панель'+p.sku,
   condition:'SELECTED_SKU_'+p.sku,sourceId:pack.sourceId,unitId:'pcs',quantityRule:'KNOWN_INSTALLED_ITEM_COUNT_NOT_LABOR_RATE',
   formulaId:prefix+':formula:'+p.key+'-consumed',resolution:{kind:'ROW',rowId:prefix+':'+p.key+'-consumed'}},
  {expectedResourceId:'included-factory-assembly:'+p.sku,operationId:'product',category:'material',specification:pack.includedAssemblyRu,
   condition:'SELECTED_SKU_'+p.sku,sourceId:pack.sourceId,unitId:'pcs',quantityRule:'INTEGRAL_ASSEMBLY_PER_INSTALLED_PRODUCT_NOT_PART_COUNTS',
   formulaId:prefix+':formula:'+p.key+'-included',resolution:{kind:'INCLUDED_COMPONENT_ROW',rowId:prefix+':'+p.key+'-included',parentRowId:prefix+':'+p.key}},
 ])};}
