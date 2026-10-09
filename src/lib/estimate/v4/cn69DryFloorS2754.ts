import pack from '../../../../data/estimate-benchmarks/source-packs/cn69-dry-floor-s27-54.json';
import accepted from '../../../../data/estimate-norms/professional/flooring.json';
import {buildAutomaticConstructionOwnerR1,compileAutomaticConstructionOwnerR1,type AutomaticOwnerDefinition,type AutomaticParameterSpec,type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {effectivePurchaseBalanceExpressionsR1} from './effectivePurchaseBalanceR1';import {estimateDeterministicHash} from '../estimateDeterministicHash';
export const cn69DryFloorPackS2754=pack;export const cn69DryFloorPrefixS2754='floor:cn69-global-25kg';
const norm=accepted.norm_items.find(item=>item.norm_id===pack.normId),primer=accepted.norm_items.find(item=>item.norm_id==='flooring_ceresit_ct17_primer_flooring_l_m2_v1');
if(!norm||!primer||accepted.source_pack_version!==pack.acceptedPhysicalSourceVersion||norm.rate.value!==1.3||norm.applicability.documented_bag_size_kg!==25)throw Error('ACCEPTED_CN69_GLOBAL_25KG_PROFILE_REQUIRED');
const prefix=cn69DryFloorPrefixS2754,area='floor_area_m2',net=`${area}*layer_thickness_mm*${norm.rate.value}`,primerUsed=`${area}*ct17_rate_l_m2*ct17_coat_count`,
 water=`(${net})/25*cn69_water_l_per_25kg`,facts=['base_confirmed','moisture_ingress_prevented','conditions_confirmed','primer_drying_confirmed','product_variant_confirmed'];
const conditional:AutomaticParameterSpec[]=[
 ...[pack.baseValue,pack.moistureValue,pack.conditionsValue,pack.primerValue,pack.productValue].map((value,index)=>({id:facts[index],title:['Готовность и влажность цементного основания','Предотвращение поступления влаги','Условия нанесения CN69 и CT17','Полное высыхание CT17 и проверка впитываемости','Поставленная версия CN69global25кг'][index],valueType:'enum' as const,unitId:null,kind:'conditional' as const,values:[value]})),
 {id:'ct17_rate_l_m2',title:'Фактический расход неразбавленного CT17 на один проход:0,1–0,5л/м²',valueType:'decimal',unitId:'l',kind:'conditional',min:0.1,max:0.5},
 {id:'ct17_coat_count',title:'Подтверждённое число проходов CT17 по впитываемости',valueType:'integer',unitId:'pcs',kind:'conditional',min:1},
 {id:'ct17_container',title:'Одна выбранная фасовка CT17 Profi global',valueType:'enum',unitId:null,kind:'conditional',values:pack.primerContainerSizesL.map(size=>size+' л')},
 {id:'cn69_water_l_per_25kg',title:'Фактическая чистая вода затворения CN69:5,5–6л/25кг смешиваемой массы',valueType:'decimal',unitId:'l',kind:'conditional',min:5.5,max:6},
];
for(const [key,name,unit] of [['cn69','CN69global25кг','kg'],['ct17','CT17 Profi global','l'],['water','чистой воды затворения','l']])
 for(const [suffix,label,min] of [['stock','Пригодное наличие',0],['reserve','Сохраняемый резерв',0]] as const)
  conditional.push({id:key+'_'+suffix,title:label+': '+name,valueType:'decimal',unitId:unit,kind:'conditional',min});
conditional.push({id:'cn69_supplier_bag_multiple',title:'Фактическая кратность поставщика в мешках CN69 по25кг',valueType:'integer',unitId:'pcs',kind:'conditional',min:1},
 {id:'water_quantum_l',title:'Фактическая кратность подачи/поставки воды в л',valueType:'decimal',unitId:'l',kind:'conditional',min:0.001});
const rows:AutomaticRowSpec[]=[];
const add=(id:string,title:string,operation:string,category:string,unitId:string,expression:string,extra:Partial<AutomaticRowSpec>={})=>rows.push({rowId:prefix+':'+id,
 formulaId:prefix+':formula:'+id,section:operation,category,title,unitId,expression,procurement:false,inputParameterIds:facts,...extra});
for(const [key,name,unit,used,quantum] of [['cn69','Самовыравнивающаяся смесь Ceresit CN69 NIVEL SUPER global, мешок25кг','kg',net,'25*cn69_supplier_bag_multiple'],
 ['water','Вода чистая для затворения Ceresit CN69 global','l',water,'water_quantum_l']]){
 const owner=prefix+':'+key+'-order',balance=effectivePurchaseBalanceExpressionsR1({ownerRowId:owner,orderUnitId:unit,consumed:used,stock:key+'_stock',reserve:key+'_reserve',quantum});
 add(key+'-consumed','Чистая приблизительная потребность: '+name,'mixing','material',unit,used,{costTreatment:'INFORMATIONAL_SCOPE',purchaseBalanceOwnerRowId:owner});
 add(key+'-order',name,'mixing','material',unit,`ceil(max(0,(${used})+${key}_reserve-${key}_stock)/(${quantum}))*(${quantum})`,{procurement:true,...balance.owner});
 if(key==='cn69')add('cn69-bags','Мешки CN69 по25кг в заказе — без второй цены','mixing','material','pcs',`${balance.effective}/25`,{costTreatment:'INFORMATIONAL_SCOPE',purchaseBalanceOwnerRowId:owner});
}
add('ct17-consumed','Чистая потребность: грунтовка Ceresit CT17 Profi global03.24','priming','material','l',primerUsed,{costTreatment:'INFORMATIONAL_SCOPE'});
for(const size of pack.primerContainerSizesL){const choice=size+' л',multiple='ct17_'+size+'l_supplier_multiple',owner=prefix+':ct17-'+size+'l-order',inclusion={kind:'equals' as const,parameterId:'ct17_container',value:choice};
 conditional.push({id:multiple,title:'Фактическая кратность поставщика CT17 в фасовках'+choice,valueType:'integer',unitId:'pcs',kind:'conditional',min:1,requiredWhen:{parameterId:'ct17_container',value:choice}});
 const balance=effectivePurchaseBalanceExpressionsR1({ownerRowId:owner,orderUnitId:'l',consumed:primerUsed,stock:'ct17_stock',reserve:'ct17_reserve',quantum:`${size}*${multiple}`});
 add('ct17-'+size+'l-order','Грунтовка Ceresit CT17 Profi global03.24, ёмкость '+choice,'priming','material','l',`ceil(max(0,(${primerUsed})+ct17_reserve-ct17_stock)/(${size}*${multiple}))*${size}*${multiple}`,{procurement:true,...balance.owner,inclusion});
 add('ct17-'+size+'l-containers','Ёмкости CT17 по '+choice+' в заказе — без второй цены','priming','material','pcs',`${balance.effective}/${size}`,{costTreatment:'INFORMATIONAL_SCOPE',purchaseBalanceOwnerRowId:owner,inclusion});
}
for(const [id,dose,title] of [['water-min',5.5,'Нижняя граница'],['water-max',6,'Верхняя граница']] as const)
 add(id,title+' воды затворения CN69 — справочно, не заказ','mixing','material','l',`(${net})/25*${dose}`,{costTreatment:'INFORMATIONAL_SCOPE'});
for(const gap of pack.sourceNeeds){const id='open_qty_'+gap.id.replaceAll('-','_');conditional.push({id,title:gap.nameRu,valueType:'decimal',unitId:gap.unitId,kind:'conditional',min:0});add(gap.id,gap.nameRu,gap.operation,gap.category,gap.unitId,id);}
const built=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:prefix,sourceId:pack.sourceId,normId:pack.normId,
 sourceMetadata:{source_title:'Ceresit CN69global25кг и CT17global: выравнивание сухого внутреннего пола',source_document_version:pack.sources.cn69.edition,
  definition_hash:pack.sources.cn69.sha256,artifact_sha256:pack.sources.cn69.sha256,exact_locator:pack.sources.cn69.locatorRu},applicabilityRu:pack.scopeRu,
 ordinary:[{id:area,title:'Площадь выравнивания пола CN69',valueType:'decimal',unitId:'m2',kind:'ordinary',min:0.001},
  {id:'layer_thickness_mm',title:'Фактическая толщина CN69 в диапазоне2–10мм',valueType:'decimal',unitId:'mm',kind:'ordinary',min:2,max:10}],
 profile:[],conditional,rows,deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:pack.excludedRu});
const required=new Set([...facts,'ct17_container']);
export const cn69DryFloorDefinitionS2754:AutomaticOwnerDefinition={...built,parameters:built.parameters.map(parameter=>({...parameter,required:parameter.required||required.has(parameter.parameter_id),
 truth_metadata:parameter.parameter_id.startsWith('open_qty_')?{...parameter.truth_metadata,visibility_role:'INTERNAL_ONLY',value_source_role:'UNRESOLVED_APPLICATION_NORM',
  provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL'},unresolved_norm_reason:'Применимые количество/часы и границы цены не опубликованы и требуют источника или принятого проекта.'}:
 {...parameter.truth_metadata,source_confirmation_required:false}})),resources:built.resources.map(resource=>{
 const key=resource.row_id.slice(prefix.length+1),gap=pack.sourceNeeds.find(item=>item.id===key),isPrimer=key.startsWith('ct17-'),isMixWater=key==='water-order'||key==='water-consumed'||key==='water-min'||key==='water-max',
  source=isPrimer?pack.sources.ct17:pack.sources.cn69,operation=gap?.operation??(isPrimer?'priming':'mixing');
 const titles:Record<string,string>={priming:'Грунтование впитывающего основания',mixing:'Затворение CN69',placing:'Распределение слоя CN69',deaeration:'Выпуск захваченного воздуха',acceptance:'Контроль влажности и приёмка',protection:'Защита зоны и слоя',completion:'Доставка, уборка и дополнительные ресурсы'};
 const {row_sha256:_old,...content}=resource;
 const result={...content,resource_graph:{...resource.resource_graph,operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:prefix,groupTitleRu:pack.titleRu,
  operationId:prefix+':'+operation,operationTitleRu:titles[operation],processOrdinal:isPrimer?10:20,completionCriterionRu:'Подтверждены конкретное изделие, расход, реальный заказ и единственный владелец цены.'},
  publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:resource.title_ru,nameRu:resource.title_ru,brandAndModelRu:null,
   specificationRu:gap?null:isPrimer?'CT17 Profi global03.24; неразбавленный; расход0,1–0,5л/м² на подтверждённый проход; одна фасовка1/2/5/10л.':
    isMixWater?'Вода чистая;5,5–6л/25кг фактически смешиваемой CN69; дозировка явная.':
     'Ceresit CN69 NIVEL SUPER global C_CN69_TDS_1_0420;25кг; цементно-гипсовая смесь с кварцевым песком, полимером и добавками; слой2–10мм, приблизительно1,3кг/м²/мм.',
   detailsRu:gap?[gap.reasonRu]:isPrimer?['Применение: готовое впитывающее цементное основание перед CN69 в сухом помещении. Расход и проходы выбираются по реальной впитываемости.',
    'Перед заливкой требуется полное высыхание; если впитываемость сохранилась, грунтование повторяют. Ускоренные15мин для приклеивания плитки сюда не переносятся.',
    'В заказ включается одна выбранная фасовка. Наличие, резерв и кратность фактические.']:
    isMixWater?['Применение: вода замеса CN69 по чистому приблизительному расходу смеси, отдельно от округления закупки. Границы справочные, не два заказа.',
     'Жизнеспособность максимум40мин; последовательные партии наносятся мокрым по мокрому. Вода очистки раскрыта отдельно.']:
     [pack.scopeRu,'Чистая приблизительная потребность зависит от фактических площади и толщины; заказ учитывает реальный пригодный остаток, резерв и25кг мешки.',
      'Прочностной класс не назначен: в одном первичном TDS указаны C25 и C35. Готовность к покрытию требует полного высыхания и принятия основания.']}},
  source_metadata:{...resource.source_metadata,official_url:source.officialUrl,source_artifact_sha256:source.sha256,
   normativeTrace:gap?[]:((resource.source_metadata?.normativeTrace??[]) as Record<string,unknown>[]).map(trace=>({...trace,normId:isPrimer?primer.norm_id:trace.normId,
    norm_id:isPrimer?primer.norm_id:trace.norm_id,normVersion:source.edition,source_title:isPrimer?'Ceresit CT17 Profi global03.24':trace.source_title,
    exact_locator:source.locatorRu,source_definition_hash:source.sha256,source_document_version:source.edition,
    definition_hash:source.sha256,artifact_sha256:source.sha256})),sourceRole:gap?'UNRESOLVED_INSTALLATION_QUANTITY':key.endsWith('-order')||key.includes('containers')||key==='cn69-bags'?'DERIVED_PURCHASE_BALANCE':'VERIFIED_APPROXIMATE_MANUFACTURER_CONSUMPTION',
   acceptedPhysicalProfileId:pack.acceptedPhysicalProfileId,waterNotFromOrderedBags:true,strengthClassUnresolvedC25C35:true,noStrengthClassAssigned:true,
   strictClimateBoundariesPreserved:true,full_technical_acceptance:false,oldBroadFlooringPassportNotReplaced:true}};
 return {...result,row_sha256:estimateDeterministicHash(result)};
})};
export function compileCn69DryFloorS2754(input:Record<string,unknown>){return compileAutomaticConstructionOwnerR1({catalogId:pack.catalogId,compilerVersion:pack.contract,primaryMeasureParameterId:area,definition:cn69DryFloorDefinitionS2754,submittedParameters:input});}
export function cn69DryFloorCompletenessMapS2754(){return {contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'PRODUCT_SYSTEM_TDS',generatedFromCurrentRows:false,
 evidenceSha256:pack.sources.cn69.sha256,evidenceReferences:Object.values(pack.sources).map(s=>s.officialUrl),entries:[
 ...['cn69','water','ct17'].map(key=>({expectedResourceId:key,operationId:key==='ct17'?'priming':'mixing',category:'material',specification:key==='cn69'?'CN69global25кг2–10мм':key==='ct17'?'CT17global03.24':'Чистая вода смешиваемой массы',condition:'EXACT_DRY_INDOOR_CEMENT_FLOOR_PROFILE',sourceId:pack.sourceId,unitId:key==='cn69'?'kg':'l',quantityRule:key==='cn69'?'AREA_THICKNESS_APPROXIMATE_1_3':key==='ct17'?'ACTUAL_RATE_AND_COAT_COUNT':'ACTUAL_SELECTED_WATER_DOSE',formulaId:prefix+':formula:'+key+'-consumed',resolution:{kind:'ROW',rowId:prefix+':'+key+'-consumed'}})),
 ...pack.sourceNeeds.map(gap=>({expectedResourceId:gap.id,operationId:gap.operation,category:gap.category,specification:gap.nameRu,condition:'OPEN_APPLICABLE_SOURCE_SCOPE',sourceId:pack.sourceId,unitId:gap.unitId,quantityRule:'OPEN_NO_ASSUMED_QUANTITY',formulaId:prefix+':formula:'+gap.id,resolution:{kind:'ROW',rowId:prefix+':'+gap.id}}))]};}
