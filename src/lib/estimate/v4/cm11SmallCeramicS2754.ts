import pack from '../../../../data/estimate-benchmarks/source-packs/cm11-small-ceramic-s27-54.json';
import accepted from '../../../../data/estimate-norms/professional/tile.json';
import {buildAutomaticConstructionOwnerR1,compileAutomaticConstructionOwnerR1,type AutomaticOwnerDefinition,type AutomaticParameterSpec,type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {effectivePurchaseBalanceExpressionsR1} from './effectivePurchaseBalanceR1';import {estimateDeterministicHash} from '../estimateDeterministicHash';
export const cm11SmallCeramicPackS2754=pack;export const cm11SmallCeramicPrefixS2754='ceramic:cm11-10cm-4mm';
const norm=accepted.norm_items.find(item=>item.norm_id===pack.normId),primer=accepted.norm_items.find(item=>item.norm_id==='tile_ceresit_ct17_primer_l_m2_absorbent_substrate_v1');
if(!norm||!primer||accepted.source_pack_version!==pack.acceptedPhysicalSourceVersion||norm.applicability.rate_table_kg_m2?.up_to_10_cm__4_mm!==2||
 primer.applicability.rate_range_l_m2?.join(',')!=='0.1,0.5')throw Error('ACCEPTED_CM11_CT17_EXACT_PROFILE_REQUIRED');
const rate=norm.applicability.rate_table_kg_m2.up_to_10_cm__4_mm,prefix=cm11SmallCeramicPrefixS2754,area='tile_area_m2',
 glue=`${area}*${rate}`,primerUsed=`${area}*ct17_rate_l_m2*ct17_coat_count`,water=`(${glue})/25*cm11_water_l_per_25kg`,
 facts=['geometry_confirmed','base_confirmed','conditions_confirmed','primer_drying_confirmed','supplied_product_confirmed','primer_scheme_confirmed'];
const conditional:AutomaticParameterSpec[]=[
 ...[pack.geometryValue,pack.baseValue,pack.conditionsValue,pack.dryingValue,pack.suppliedProductValue,pack.primerSchemeValue].map((value,index)=>({id:facts[index],title:['Пара размера плитки и шпателя, положение пола','Впитывающее основание и его готовность','Температура и влажность воздуха','Высыхание CT17 перед выбранным CM11','Реальная партия и упаковка CM11','Неразбавленный CT17 и его применение'][index],valueType:'enum' as const,unitId:null,kind:'conditional' as const,values:[value]})),
 {id:'batch_maturing_instruction',title:'Подтверждённая инструкция поставленной партии CM11: выдержка перед повторным перемешиванием; в TDS указаны2мин и около5мин',valueType:'text',unitId:null,kind:'conditional'},
 {id:'tile_specification',title:'Реальный артикул керамической плитки, формат до10см, толщина и пригодность для выбранного пола',valueType:'text',unitId:null,kind:'conditional'},
 {id:'tile_required_m2',title:'Потребность выбранной плитки по фактической раскладке в м², с отдельно обоснованной подрезкой; площадь самих плиток отличается от площади пола из-за швов',valueType:'decimal',unitId:'m2',kind:'conditional',min:0.001},
 {id:'ct17_rate_l_m2',title:'Выбранный расход неразбавленного CT17 на один проход:0,1–0,5л/м²',valueType:'decimal',unitId:'l',kind:'conditional',min:0.1,max:0.5},
 {id:'ct17_coat_count',title:'Подтверждённое число проходов CT17 по впитываемости',valueType:'integer',unitId:'pcs',kind:'conditional',min:1},
 {id:'ct17_container',title:'Одна выбранная фасовка CT17 Profi global',valueType:'enum',unitId:null,kind:'conditional',values:pack.primerContainerSizesL.map(size=>String(size)+' л')},
 {id:'cm11_water_l_per_25kg',title:'Фактическая вода затворения CM11:5,5–6л на25кг смешиваемой массы',valueType:'decimal',unitId:'l',kind:'conditional',min:5.5,max:6},
];
for(const [key,name,unit] of [['tile','выбранной плитки','m2'],['cm11','CM11 PLUS','kg'],['ct17','CT17 Profi global','l'],['water','чистой воды затворения','l']])
 for(const [suffix,label,min] of [['stock','Пригодное наличие',0],['reserve','Сохраняемый резерв',0]] as const)
  conditional.push({id:key+'_'+suffix,title:label+': '+name,valueType:'decimal',unitId:unit,kind:'conditional',min});
for(const [id,title,unit,type,min] of [['tile_quantum_m2','Кратность поставки выбранной плитки в м²','m2','decimal',0.000001],
 ['cm11_supplier_bag_multiple','Фактическая кратность поставщика CM11 в выбранных упаковках25кг','pcs','integer',1],
 ['water_quantum_l','Фактическая кратность подачи или поставки чистой воды в л','l','decimal',0.001]] as const)
 conditional.push({id,title,unitId:unit,valueType:type,kind:'conditional',min});
const rows:AutomaticRowSpec[]=[];
const add=(id:string,title:string,operation:string,category:string,unitId:string,expression:string,extra:Partial<AutomaticRowSpec>={})=>rows.push({
 rowId:prefix+':'+id,formulaId:prefix+':formula:'+id,section:operation,category,title,unitId,expression,procurement:false,inputParameterIds:facts,...extra});
for(const [key,name,operation,unit,used,quantum] of [
 ['tile','Керамическая плитка до10см по подтверждённому артикулу','laying','m2','tile_required_m2','tile_quantum_m2'],
 ['cm11','Клей Ceresit CM11 PLUS global04/2026, выбранная упаковка25кг','mixing','kg',glue,'25*cm11_supplier_bag_multiple'],
 ['water','Вода чистая для затворения Ceresit CM11 PLUS без CC83','mixing','l',water,'water_quantum_l']]){
 const owner=prefix+':'+key+'-order',balance=effectivePurchaseBalanceExpressionsR1({ownerRowId:owner,orderUnitId:unit,consumed:used,stock:key+'_stock',reserve:key+'_reserve',quantum});
 const additional=key==='tile'?['tile_specification']:[];
 add(key+'-consumed','Чистая потребность: '+name,operation,'material',unit,used,{costTreatment:'INFORMATIONAL_SCOPE',purchaseBalanceOwnerRowId:owner,
  ...(key==='tile'?{inputParameterIds:[...facts,...additional],titleParameterIds:additional}:{})});
 add(key+'-order',name,operation,'material',unit,`ceil(max(0,(${used})+${key}_reserve-${key}_stock)/(${quantum}))*(${quantum})`,
  {procurement:true,...balance.owner,inputParameterIds:[...facts,...additional],...(key==='tile'?{titleParameterIds:additional}:{})});
 if(key==='cm11')add('cm11-bags','Количество выбранных25кг упаковок CM11 — справочно, без второй цены',operation,'material','pcs',`${balance.effective}/25`,{costTreatment:'INFORMATIONAL_SCOPE',purchaseBalanceOwnerRowId:owner});
}
add('ct17-consumed','Чистая потребность: грунтовка Ceresit CT17 Profi global03.24','priming','material','l',primerUsed,{costTreatment:'INFORMATIONAL_SCOPE'});
for(const size of pack.primerContainerSizesL){const selection=String(size)+' л',multiple='ct17_'+size+'l_supplier_multiple',owner=prefix+':ct17-'+size+'l-order';
 conditional.push({id:multiple,title:'Фактическая кратность поставщика CT17 в фасовках'+selection,valueType:'integer',unitId:'pcs',kind:'conditional',min:1,requiredWhen:{parameterId:'ct17_container',value:selection}});
 const balance=effectivePurchaseBalanceExpressionsR1({ownerRowId:owner,orderUnitId:'l',consumed:primerUsed,stock:'ct17_stock',reserve:'ct17_reserve',quantum:`${size}*${multiple}`}),inclusion={kind:'equals' as const,parameterId:'ct17_container',value:selection};
 add('ct17-'+size+'l-order','Грунтовка Ceresit CT17 Profi global03.24, ёмкость '+selection,'priming','material','l',
  `ceil(max(0,(${primerUsed})+ct17_reserve-ct17_stock)/(${size}*${multiple}))*${size}*${multiple}`,{procurement:true,...balance.owner,inclusion});
 add('ct17-'+size+'l-containers','Ёмкости CT17 по '+selection+' в заказе — без второй цены','priming','material','pcs',`${balance.effective}/${size}`,{costTreatment:'INFORMATIONAL_SCOPE',purchaseBalanceOwnerRowId:owner,inclusion});
}
for(const [id,dose,title] of [['water-min',pack.waterMinLPer25Kg,'Нижняя граница воды затворения CM11 — справочно, не заказ'],['water-max',pack.waterMaxLPer25Kg,'Верхняя граница воды затворения CM11 — справочно, не заказ']] as const)
 add(id,title,'mixing','material','l',`(${glue})/25*${dose}`,{costTreatment:'INFORMATIONAL_SCOPE'});
for(const gap of pack.sourceNeeds){const id='open_qty_'+gap.id.replaceAll('-','_');conditional.push({id,title:gap.nameRu,valueType:'decimal',unitId:gap.unitId,kind:'conditional',min:0});
 add(gap.id,gap.nameRu,gap.operation,gap.category,gap.unitId,id,gap.id==='labor'?{inputParameterIds:[...facts,'batch_maturing_instruction']}:{});}
const built=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:prefix,sourceId:pack.sourceId,normId:pack.normId,
 sourceMetadata:{source_title:'Ceresit CM11 PLUS04/2026, CT17 Profi03.24: принятый физический профиль малой керамической плитки',source_document_version:pack.sources.cm11.edition,
  definition_hash:pack.sources.cm11.sha256,artifact_sha256:pack.sources.cm11.sha256,exact_locator:pack.sources.cm11.locatorRu},
 applicabilityRu:pack.scopeRu,ordinary:[{id:area,title:'Площадь керамической облицовки выбранного пола',valueType:'decimal',unitId:'m2',kind:'ordinary',min:0.001}],
 profile:[],conditional,rows,deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:pack.excludedRu});
const required=new Set([...facts,'tile_specification','ct17_container','batch_maturing_instruction']);
export const cm11SmallCeramicDefinitionS2754:AutomaticOwnerDefinition={...built,parameters:built.parameters.map(parameter=>({...parameter,
 required:parameter.required||required.has(parameter.parameter_id),truth_metadata:parameter.parameter_id.startsWith('open_qty_')||parameter.parameter_id==='batch_maturing_instruction'?
 {...parameter.truth_metadata,visibility_role:'INTERNAL_ONLY',value_source_role:'UNRESOLVED_APPLICATION_NORM',provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL'},
  unresolved_norm_reason:parameter.parameter_id==='batch_maturing_instruction'?'CM11: APPLICATION2мин и TECHNICAL DATAоколо5мин; необходима подтверждённая инструкция поставленной партии.':'Применимые состав и количество/часы требуют подтверждения; кандидаты CE40/CS25 не получили автоматического расхода.'}:
 {...parameter.truth_metadata,source_confirmation_required:false}})),resources:built.resources.map(resource=>{
 const key=resource.row_id.slice(prefix.length+1),gap=pack.sourceNeeds.find(item=>item.id===key),isPrimer=key.startsWith('ct17-'),isTile=key.startsWith('tile-'),isWater=key.startsWith('water-'),
  source=key==='grout-ce40'?pack.sources.ce40:isPrimer?pack.sources.ct17:pack.sources.cm11,operation=gap?.operation??(isPrimer?'priming':isTile?'laying':'mixing');
 const titles:Record<string,string>={priming:'Грунтование впитывающего основания',mixing:'Затворение CM11 PLUS',laying:'Укладка керамической плитки до10см',grouting:'Заполнение обычных межплиточных швов',
  'movement-joints':'Деформационные и примыкающие швы',acceptance:'Контроль контакта, защита и приёмка',completion:'Доставка, уборка и дополнительные ресурсы'};
 const {row_sha256:_old,...content}=resource;
 const result={...content,resource_graph:{...resource.resource_graph,
  operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:prefix,groupTitleRu:pack.titleRu,operationId:prefix+':'+operation,operationTitleRu:titles[operation],processOrdinal:isPrimer?10:20,
   completionCriterionRu:'Подтверждены конкретное изделие, применимые расход и реальный заказ; один владелец цены.'},
  publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:resource.title_ru,nameRu:resource.title_ru,brandAndModelRu:null,
   specificationRu:isPrimer?'Ceresit CT17 Profi global03.24; неразбавленный; расход0,1–0,5л/м² на подтверждённый проход; фасовки1/2/5/10л, одна выбранная.':
    key.startsWith('cm11-')?'Ceresit CM11 PLUS global04/2026; C1T; точная пара керамика≤10см/зуб4мм: приблизительно2кг/м². Реальная упаковка25кг подтверждается поставкой.':
     isWater?'Вода чистая:5,5–6л на25кг фактически смешиваемой CM11 без CC83; дозировка явная, не среднее по умолчанию.':null,
   detailsRu:gap?[gap.reasonRu]:isPrimer?['Применение: грунтование принятой впитывающей цементной стяжки перед CM11; CT17global и ru_KZ не смешиваются.',
    'Выбран расход по впитываемости и число проходов. Перед CM11 требуется полное высыхание и не менее2ч; правило15мин сюда не перенесено.',
    'Только выбранная фасовка закупается; остальные не суммируются. Наличие, резерв и кратность фактические.']:
    isWater?['Вода считается по чистому расходу клея, не по округлённой закупке упаковок. Границы справочные, не два заказа.',
     'Вода очистки и затирки раскрыта отдельной открытой позицией.']:
    isTile?['Применение: выбранный реальный артикул керамической плитки до10см; количество по раскладке, подрезка обосновывается отдельно.']:
     ['Применение: керамика до10см, шпатель4мм, внутренний горизонтальный пол на готовой впитывающей цементной стяжке; контакт≥65%.',
      'Чистое приблизительное потребление отдельно от закупки; автоматического запаса7% нет.',
      'TDS задаёт25кг как массу замеса; реальные25кг упаковки нужно подтвердить поставкой.',
      'Выдержка перед повторным перемешиванием требует инструкции поставленной партии: APPLICATION2мин и TECHNICAL DATAоколо5мин различаются.']}},
  source_metadata:{...resource.source_metadata,official_url:source.officialUrl,source_artifact_sha256:source.sha256,
   normativeTrace:gap||isTile?[]:((resource.source_metadata?.normativeTrace??[]) as Record<string,unknown>[]).map(trace=>({...trace,
    source_title:isPrimer?'Ceresit CT17 Profi global03.24':trace.source_title,source_document_version:source.edition,
    normId:isPrimer?primer.norm_id:trace.normId,norm_id:isPrimer?primer.norm_id:trace.norm_id,normVersion:source.edition,
    source_definition_hash:source.sha256,definition_hash:source.sha256,artifact_sha256:source.sha256,exact_locator:source.locatorRu})),
   sourceRole:gap?'CANDIDATE_OR_UNRESOLVED_INSTALLATION_QUANTITY':isTile?'EXPLICIT_PROJECT_PRODUCT_AND_LAYOUT':key.endsWith('-order')||key.includes('containers')||key==='cm11-bags'?'DERIVED_PURCHASE_BALANCE':'VERIFIED_MANUFACTURER_PHYSICAL_CONSUMPTION',
   acceptedPhysicalProfileId:pack.acceptedPhysicalProfileId,approximateConsumption:true,waterNotFromOrderedBags:true,
   ...(key==='sealant-cs25'?{sourceEvidenceKind:'NAME_AND_APPLICATION_REFERENCED_IN_CM11_NOT_OWN_CS25_TDS',ownProductPassportSha256:null,quantityNormApproved:false}:{}),
   ...(key==='grout-ce40'?{quantityNormApproved:false,otherTileGeometryNormNotTransferred:true}:{}),
   full_technical_acceptance:false,oldBroadDefinitionsNotReplaced:true}};
 return {...result,row_sha256:estimateDeterministicHash(result)};
})};
export function compileCm11SmallCeramicS2754(input:Record<string,unknown>){return compileAutomaticConstructionOwnerR1({catalogId:pack.catalogId,compilerVersion:pack.contract,
 primaryMeasureParameterId:area,definition:cm11SmallCeramicDefinitionS2754,submittedParameters:input});}
export function cm11SmallCeramicCompletenessMapS2754(){return {contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'PRODUCT_SYSTEM_TDS',generatedFromCurrentRows:false,
 evidenceSha256:pack.sources.cm11.sha256,evidenceReferences:Object.values(pack.sources).map(source=>source.officialUrl),
 entries:[...['tile','cm11','water','ct17'].map(key=>({expectedResourceId:key,operationId:key==='tile'?'laying':key==='ct17'?'priming':'mixing',category:'material',
  specification:key==='tile'?'Реальный артикул по раскладке':key==='cm11'?'CM11 PLUS точная пара≤10см/4мм':key==='water'?'Чистая вода смешиваемой массы':'CT17 Profi global03.24',
  condition:'EXACT_SMALL_CERAMIC_READY_ABSORBENT_CEMENT_FLOOR',sourceId:pack.sourceId,unitId:key==='tile'?'m2':key==='cm11'?'kg':'l',
  quantityRule:key==='tile'?'EXPLICIT_PROJECT_LAYOUT':key==='ct17'?'SELECTED_RANGE_AND_COAT_COUNT':key==='cm11'?'APPROXIMATE_EXACT_TABLE_PAIR':'SELECTED_ACTUAL_RECIPE',
  formulaId:prefix+':formula:'+key+'-consumed',resolution:{kind:'ROW',rowId:prefix+':'+key+'-consumed'}})),
 ...pack.sourceNeeds.map(gap=>({expectedResourceId:gap.id,operationId:gap.operation,category:gap.category,specification:gap.nameRu,
  condition:'OPEN_APPLICABLE_SOURCE_OR_PROJECT_SCOPE',sourceId:pack.sourceId,unitId:gap.unitId,quantityRule:'OPEN_NO_ASSUMED_QUANTITY',formulaId:prefix+':formula:'+gap.id,resolution:{kind:'ROW',rowId:prefix+':'+gap.id}}))]};}
