import pack from '../../../../data/estimate-benchmarks/source-packs/ct29-indoor-plaster-s27-54.json';
import accepted from '../../../../data/estimate-norms/professional/plaster.json';
import {buildAutomaticConstructionOwnerR1,compileAutomaticConstructionOwnerR1,type AutomaticOwnerDefinition,type AutomaticParameterSpec,type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {effectivePurchaseBalanceExpressionsR1} from './effectivePurchaseBalanceR1';import {estimateDeterministicHash} from '../estimateDeterministicHash';
export const ct29IndoorPlasterPackS2754=pack;export const ct29IndoorPlasterPrefixS2754='plaster:ct29-indoor-manual';
export type Ct29PlasterSourcePackS2754=typeof pack & {weatherProtectionValue?:string;sourceTitleRu?:string;applicationPresentationRu?:string;completenessCondition?:string;
  applicationModeValue?:string;baseParameterTitleRu?:string};
export function buildCt29PlasterDefinitionS2754(pack:Ct29PlasterSourcePackS2754,prefix:string):AutomaticOwnerDefinition {
const norm=accepted.norm_items.find(item=>item.norm_id===pack.normId);
if(!norm||norm.rate.value!==1.8||accepted.source_pack_version!==pack.acceptedPhysicalSourceVersion||norm.applicability.documented_bag_sizes_kg.join(',')!=='5,25')throw Error('ACCEPTED_CT29_AREA_THICKNESS_PROFILE_REQUIRED');
const area='plaster_area_m2',thickness='layer_thickness_mm',net=`${area}*${thickness}*${norm.rate.value}`,
 facts=['base_confirmed','conditions_confirmed','layer_applicability_confirmed','project_detail_reference',...(pack.weatherProtectionValue?['weather_protection_confirmed','weather_protection_reference']:[]),
  ...(pack.applicationModeValue?['application_mode_confirmed']:[])];
const conditional:AutomaticParameterSpec[]=[
 {id:facts[0],title:pack.baseParameterTitleRu??'Подготовленное низко-впитывающее бетонное основание',valueType:'enum',unitId:null,kind:'conditional',values:[pack.baseValue]},
 {id:facts[1],title:pack.weatherProtectionValue?'Температура, солнце и сухие условия наружного нанесения':'Температура, влажность основания и условия твердения внутри помещения',valueType:'enum',unitId:null,kind:'conditional',values:[pack.conditionsValue]},
 {id:facts[2],title:'Принятый узел и применимость назначенной толщины CT29',valueType:'enum',unitId:null,kind:'conditional',values:[pack.layerValue]},
 {id:facts[3],title:'Конкретная ссылка или номер узла/инструкции, обосновывающих назначенную толщину CT29',valueType:'text',unitId:null,kind:'conditional'},
 {id:'selected_ct29_bag',title:'Одна выбранная фасовка CT29 и соответствующая рецептура замеса',valueType:'enum',unitId:null,kind:'conditional',values:pack.products.map(p=>String(p.bagKg)+' кг')},
 {id:'water_stock_l',title:'Пригодное наличие чистой холодной воды в л',valueType:'decimal',unitId:'l',kind:'conditional',min:0},
 {id:'water_reserve_l',title:'Сохраняемый резерв воды в л',valueType:'decimal',unitId:'l',kind:'conditional',min:0},
 {id:'water_quantum_l',title:'Фактическая кратность подачи или поставки воды в л',valueType:'decimal',unitId:'l',kind:'conditional',min:0.001},
];
if(pack.weatherProtectionValue)conditional.push(
 {id:'weather_protection_confirmed',title:'Защита наружного слоя от дождя и быстрого высыхания минимум24ч',valueType:'enum',unitId:null,kind:'conditional',values:[pack.weatherProtectionValue]},
 {id:'weather_protection_reference',title:'Ссылка на принятое задание: способ защиты, установка и обеспечение минимум24ч',valueType:'text',unitId:null,kind:'conditional'});
if(pack.applicationModeValue)conditional.push({id:'application_mode_confirmed',title:'Подтверждён штукатурный слой CT29 по площади и толщине, без тонкой шпаклёвки и глубоких выбоин',
 valueType:'enum',unitId:null,kind:'conditional',values:[pack.applicationModeValue]});
const rows:AutomaticRowSpec[]=[];
const add=(id:string,title:string,operation:string,category:string,unitId:string,expression:string,extra:Partial<AutomaticRowSpec>={})=>rows.push({
 rowId:prefix+':'+id,formulaId:prefix+':formula:'+id,section:operation,category,title,unitId,expression,procurement:false,inputParameterIds:facts,...extra});
add('net-mixture','Приблизительная потребность Ceresit CT29 по площади и назначенной толщине','mixing','material','kg',net,{costTreatment:'INFORMATIONAL_SCOPE'});
for(const p of pack.products){
 const key='ct29_'+p.key,selection=String(p.bagKg)+' кг',selected={kind:'equals' as const,parameterId:'selected_ct29_bag',value:selection},
  planned=key+'_planned_whole_batches',stock=key+'_stock_bags',reserve=key+'_reserve_bags',multiple=key+'_supplier_bag_multiple',dose=key+'_water_l_per_batch',
  prepared=`${planned}*${p.bagKg}`,minBatches=`ceil((${net})/${p.bagKg})`,water=`${planned}*${dose}`;
 for(const [id,title,min] of [[planned,'Подтверждённый последовательный план целых замесов CT29 '+selection,1],
  [stock,'Пригодное наличие целых мешков CT29 '+selection,0],[reserve,'Сохраняемый резерв целых мешков CT29 '+selection,0],
  [multiple,'Фактическая кратность поставщика в мешках CT29 '+selection,1]] as const)
  conditional.push({id,title,valueType:'integer',unitId:'pcs',kind:'conditional',min,requiredWhen:{parameterId:'selected_ct29_bag',value:selection}});
 conditional.push({id:dose,title:'Фактическая чистая холодная вода на один целый замес CT29 '+selection,valueType:'decimal',unitId:'l',kind:'conditional',
  min:p.waterMinLPerBag,max:p.waterMaxLPerBag,requiredWhen:{parameterId:'selected_ct29_bag',value:selection}});
 const owner=prefix+':'+p.key+'-order',waterOwner=prefix+':'+p.key+'-mix-water-order',balance=effectivePurchaseBalanceExpressionsR1({ownerRowId:owner,orderUnitId:'kg',
  consumed:prepared,stock:`${stock}*${p.bagKg}`,reserve:`${reserve}*${p.bagKg}`,quantum:`${multiple}*${p.bagKg}`}),
  waterBalance=effectivePurchaseBalanceExpressionsR1({ownerRowId:waterOwner,orderUnitId:'l',consumed:water,stock:'water_stock_l',reserve:'water_reserve_l',quantum:'water_quantum_l'}),
  info={inclusion:selected,costTreatment:'INFORMATIONAL_SCOPE' as const},name='Смесь Ceresit CT29 для штукатурного нанесения, мешок '+selection;
 add(p.key+'-minimum-batches','Минимальный расчётный план целых замесов CT29 '+selection+' — не факт приготовления','mixing','material','pcs',minBatches,info);
 add(p.key+'-planned-batches','Подтверждённый последовательный план целых замесов CT29 '+selection,'mixing','material','pcs',planned,info);
 add(p.key+'-plan-coverage','Контроль достаточности плана CT29 '+selection+' — без отдельной цены','mixing','material','pcs',`${planned}-(${minBatches})`,
  {...info,formulaOutputBounds:{schemaVersion:'canonical_formula_output_bounds_v1',unitId:'pcs',minimum:0,
   reasonRu:'Подтверждённый план целых замесов CT29 меньше расчётного минимума для приблизительной потребности'}});
 add(p.key+'-prepared-mixture','Расчётная сухая масса CT29 для подтверждённого плана замесов '+selection,'mixing','material','kg',prepared,{...info,purchaseBalanceOwnerRowId:owner});
 add(p.key+'-plan-excess','Расчётное превышение приготовления CT29 над приблизительной потребностью — не норматив отходов','mixing','material','kg',`(${prepared})-(${net})`,info);
 add(p.key+'-order',name,'mixing','material','kg',`ceil(max(0,(${prepared})+${reserve}*${p.bagKg}-${stock}*${p.bagKg})/(${multiple}*${p.bagKg}))*${multiple}*${p.bagKg}`,{procurement:true,inclusion:selected,...balance.owner});
 add(p.key+'-ordered-bags','Целые мешки CT29 '+selection+' в заказе — без второй цены','mixing','material','pcs',`${balance.effective}/${p.bagKg}`,{...info,purchaseBalanceOwnerRowId:owner});
 for(const [suffix,ratio,title] of [['min',p.waterMinLPerBag,'Нижняя граница'],['max',p.waterMaxLPerBag,'Верхняя граница']] as const)
  add(p.key+'-mix-water-'+suffix,title+' воды подтверждённого плана замесов CT29 '+selection+' — справочно, не заказ','mixing','material','l',`${planned}*${ratio}`,info);
 add(p.key+'-mix-water-consumed','Вода чистая холодная для подтверждённого плана целых замесов CT29 '+selection,'mixing','material','l',water,{...info,purchaseBalanceOwnerRowId:waterOwner});
 add(p.key+'-mix-water-order','Вода чистая холодная для затворения выбранной CT29 '+selection,'mixing','material','l',
  `ceil(max(0,(${water})+water_reserve_l-water_stock_l)/water_quantum_l)*water_quantum_l`,{procurement:true,inclusion:selected,...waterBalance.owner});
}
for(const gap of pack.sourceNeeds){const id='open_qty_'+gap.id.replaceAll('-','_');conditional.push({id,title:gap.nameRu,valueType:'decimal',unitId:gap.unitId,kind:'conditional',min:0});add(gap.id,gap.nameRu,gap.operation,gap.category,gap.unitId,id);}
const built=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:prefix,sourceId:pack.sourceId,normId:pack.normId,
 sourceMetadata:{source_title:pack.sourceTitleRu??'Ceresit CT29: принятое приблизительное потребление и ручная технология внутренней штукатурки',source_document_version:pack.source.edition,
  definition_hash:pack.source.sha256,artifact_sha256:pack.source.sha256,exact_locator:pack.source.locatorRu},applicabilityRu:pack.scopeRu,
 ordinary:[{id:area,title:'Площадь штукатурного нанесения CT29',valueType:'decimal',unitId:'m2',kind:'ordinary',min:0.001},
  {id:thickness,title:'Назначенная проектом толщина слоя CT29; применимость подтверждается отдельным узлом',valueType:'decimal',unitId:'mm',kind:'ordinary',min:0.001}],
 profile:[],conditional,rows,deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:pack.excludedRu});
const required=new Set([...facts,'selected_ct29_bag']);
return {...built,parameters:built.parameters.map(parameter=>({...parameter,
 required:parameter.required||required.has(parameter.parameter_id),truth_metadata:parameter.parameter_id.startsWith('open_qty_')?
 {...parameter.truth_metadata,visibility_role:'INTERNAL_ONLY',value_source_role:'UNRESOLVED_APPLICATION_NORM',provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL'},
  unresolved_norm_reason:'Технология известна, применимые часы, количества и границы оплаты требуют источника или принятого проекта.'}:
 {...parameter.truth_metadata,source_confirmation_required:false}})),resources:built.resources.map(resource=>{
 const key=resource.row_id.slice(prefix.length+1),gap=pack.sourceNeeds.find(item=>item.id===key),p=pack.products.find(product=>key.startsWith(product.key+'-')),
  waterRow=key.includes('-mix-water-'),operation=gap?.operation??'mixing',titles:Record<string,string>={mixing:'Затворение CT29 по плану целых замесов',application:'Ручное нанесение и разглаживание',curing:'Уход за штукатурным слоем',protection:'Доступ и защита исполнителя',acceptance:'Контроль и приёмка',completion:'Доставка, уборка и упаковка'};
 const {row_sha256:_old,...content}=resource;
 const result={...content,resource_graph:{...resource.resource_graph,operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:prefix,groupTitleRu:pack.titleRu,
  operationId:prefix+':'+operation,operationTitleRu:titles[operation],processOrdinal:operation==='mixing'?10:20,completionCriterionRu:'Приняты узел и толщина, подтверждён план замесов, расход и единственный владелец цены.'},
  publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:resource.title_ru,nameRu:resource.title_ru,brandAndModelRu:null,
   specificationRu:gap?null:waterRow&&p?`Вода чистая холодная; рецепт ${p.waterMinLPerBag}–${p.waterMaxLPerBag} л на целый мешок ${p.bagKg} кг; дозировка явная.`:
    'Ceresit CT29; минеральная цементная смесь с микроволокнами, CS IV, W1, A1; приблизительно1,8кг/м²/мм для штукатурного нанесения.',
   detailsRu:gap?[gap.reasonRu]:waterRow?['Применение: только подтверждённый последовательный план целых замесов выбранной фасовки; жизнеспособность до2часов.',
    'Вода не рассчитывается по закупленному запасу или другой фасовке. Диапазоны5кг и25кг различны; границы не два заказа. Вода ухода раскрыта отдельно.']:
    [pack.applicationPresentationRu??'Применение: ручное нанесение и разглаживание на готовой влажной, без мокрой поверхности, низко-впитывающей бетонной стене внутри помещения.',
     'Приблизительное потребление по площади/толщине отдельно от подтверждённого плана целых замесов и заказа с фактическими целыми мешками, резервом и кратностью.',
     'Расчётный минимум не назначает фактический план автоматически. Расчётное превышение приготовления не доказывает фактические отходы или массу вывоза.',
     'Числовые пределы допустимой толщины в TDS не установлены; положительное число не заменяет принятый узел/инструкцию.']}},
  source_metadata:{...resource.source_metadata,official_url:pack.source.officialUrl,source_artifact_sha256:pack.source.sha256,
   ...(gap?{normativeTrace:[]}:{}),sourceRole:gap?'UNRESOLVED_INSTALLATION_QUANTITY':key.endsWith('-order')?'DERIVED_PURCHASE_BALANCE':key==='net-mixture'?'VERIFIED_APPROXIMATE_MANUFACTURER_AREA_THICKNESS_CONSUMPTION':
    waterRow?'MANUFACTURER_RECIPE_FROM_CONFIRMED_WHOLE_BATCH_PLAN':'DERIVED_EXPLICIT_WHOLE_BATCH_PLAN_AND_PURCHASE_BALANCE',
   acceptedPhysicalProfileId:pack.acceptedPhysicalProfileId,actualPreparationNotClaimed:true,approximateNetConsumption:true,waterNotFromPurchaseQuantity:true,
   layerNumericalRangeNotPublished:true,projectLayerReferenceRequired:true,openBagsExcluded:true,full_technical_acceptance:false,oldGypsumPassportNotReplaced:true}};
 return {...result,row_sha256:estimateDeterministicHash(result)};
})};
}
export const ct29IndoorPlasterDefinitionS2754=buildCt29PlasterDefinitionS2754(pack,ct29IndoorPlasterPrefixS2754);
export function compileCt29IndoorPlasterS2754(input:Record<string,unknown>){return compileAutomaticConstructionOwnerR1({catalogId:pack.catalogId,compilerVersion:pack.contract,
 primaryMeasureParameterId:'plaster_area_m2',definition:ct29IndoorPlasterDefinitionS2754,submittedParameters:input});}
export function buildCt29PlasterCompletenessMapS2754(pack:Ct29PlasterSourcePackS2754,prefix:string){return {contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'PRODUCT_SYSTEM_TDS',generatedFromCurrentRows:false,
 evidenceSha256:pack.source.sha256,evidenceReferences:[pack.source.officialUrl,pack.source.locatorRu,pack.acceptedPhysicalSourcePack],entries:[
 {expectedResourceId:'net-ct29',operationId:'mixing',category:'material',specification:'CT29: штукатурное нанесение по площади и назначенной толщине',condition:pack.completenessCondition??'PREPARED_INDOOR_LOW_ABSORPTION_CONCRETE_APPROVED_LAYER',sourceId:pack.sourceId,unitId:'kg',quantityRule:'APPROXIMATE_AREA_THICKNESS_1_8',formulaId:prefix+':formula:net-mixture',resolution:{kind:'ROW',rowId:prefix+':net-mixture'}},
 ...pack.products.map(p=>({expectedResourceId:'mixing-water-'+p.key,operationId:'mixing',category:'material',specification:`Чистая холодная вода ${p.waterMinLPerBag}–${p.waterMaxLPerBag}л/${p.bagKg}кг`,condition:'ONLY_SELECTED_BAG_AND_CONFIRMED_WHOLE_BATCH_PLAN',sourceId:pack.sourceId,unitId:'l',quantityRule:'CONFIRMED_BATCH_COUNT_X_ACTUAL_SELECTED_DOSE_NOT_PURCHASE',formulaId:prefix+':formula:'+p.key+'-mix-water-consumed',resolution:{kind:'ROW',rowId:prefix+':'+p.key+'-mix-water-consumed'}})),
 ...pack.sourceNeeds.map(gap=>({expectedResourceId:gap.id,operationId:gap.operation,category:gap.category,specification:gap.nameRu,condition:'OPEN_APPLICABLE_SOURCE_OR_PROJECT_SCOPE',sourceId:pack.sourceId,unitId:gap.unitId,quantityRule:'OPEN_NO_ASSUMED_QUANTITY',formulaId:prefix+':formula:'+gap.id,resolution:{kind:'ROW',rowId:prefix+':'+gap.id}}))]};}

export function ct29IndoorPlasterCompletenessMapS2754(){return buildCt29PlasterCompletenessMapS2754(pack,ct29IndoorPlasterPrefixS2754);}
