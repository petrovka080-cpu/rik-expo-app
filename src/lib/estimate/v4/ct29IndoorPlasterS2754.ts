import pack from '../../../../data/estimate-benchmarks/source-packs/ct29-indoor-plaster-s27-54.json';
import geometryPack from '../../../../data/estimate-benchmarks/source-packs/ct29-indoor-geometry-r1.json';
import accepted from '../../../../data/estimate-norms/professional/plaster.json';
import {buildAutomaticConstructionOwnerR1,compileAutomaticConstructionOwnerR1,type AutomaticOwnerDefinition,type AutomaticParameterSpec,type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {effectivePurchaseBalanceExpressionsR1} from './effectivePurchaseBalanceR1';import {estimateDeterministicHash} from '../estimateDeterministicHash';
export const ct29IndoorPlasterPackS2754=pack;export const ct29IndoorPlasterPrefixS2754='plaster:ct29-indoor-manual';
export type Ct29PlasterSourcePackS2754=typeof pack & {weatherProtectionValue?:string;sourceTitleRu?:string;applicationPresentationRu?:string;completenessCondition?:string;
  applicationModeValue?:string;baseParameterTitleRu?:string;ordinaryGeometryProfileR1?:true};
export function buildCt29AdvancedPlasterDefinitionS2754(pack:Ct29PlasterSourcePackS2754,prefix:string):AutomaticOwnerDefinition {
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
export function buildCt29AdvancedPlasterCompletenessMapS2754(pack:Ct29PlasterSourcePackS2754,prefix:string){return {contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'PRODUCT_SYSTEM_TDS',generatedFromCurrentRows:false,
 evidenceSha256:pack.source.sha256,evidenceReferences:[pack.source.officialUrl,pack.source.locatorRu,pack.acceptedPhysicalSourcePack],entries:[
 {expectedResourceId:'net-ct29',operationId:'mixing',category:'material',specification:'CT29: штукатурное нанесение по площади и назначенной толщине',condition:pack.completenessCondition??'PREPARED_INDOOR_LOW_ABSORPTION_CONCRETE_APPROVED_LAYER',sourceId:pack.sourceId,unitId:'kg',quantityRule:'APPROXIMATE_AREA_THICKNESS_1_8',formulaId:prefix+':formula:net-mixture',resolution:{kind:'ROW',rowId:prefix+':net-mixture'}},
 ...pack.products.map(p=>({expectedResourceId:'mixing-water-'+p.key,operationId:'mixing',category:'material',specification:`Чистая холодная вода ${p.waterMinLPerBag}–${p.waterMaxLPerBag}л/${p.bagKg}кг`,condition:'ONLY_SELECTED_BAG_AND_CONFIRMED_WHOLE_BATCH_PLAN',sourceId:pack.sourceId,unitId:'l',quantityRule:'CONFIRMED_BATCH_COUNT_X_ACTUAL_SELECTED_DOSE_NOT_PURCHASE',formulaId:prefix+':formula:'+p.key+'-mix-water-consumed',resolution:{kind:'ROW',rowId:prefix+':'+p.key+'-mix-water-consumed'}})),
 ...pack.sourceNeeds.map(gap=>({expectedResourceId:gap.id,operationId:gap.operation,category:gap.category,specification:gap.nameRu,condition:'OPEN_APPLICABLE_SOURCE_OR_PROJECT_SCOPE',sourceId:pack.sourceId,unitId:gap.unitId,quantityRule:'OPEN_NO_ASSUMED_QUANTITY',formulaId:prefix+':formula:'+gap.id,resolution:{kind:'ROW',rowId:prefix+':'+gap.id}}))]};}

export function ct29IndoorPlasterCompletenessMapS2754(){return buildCt29PlasterCompletenessMapS2754(pack,ct29IndoorPlasterPrefixS2754);}


/** Ordinary geometry is an explicit successor for this exact catalogue branch.
 * Historical production plans and outside systems retain their advanced factory. */
export const ct29IndoorGeometrySourcePackR1=geometryPack;
export const ct29IndoorGeometrySourceSha256R1='ca4fda77d160ec06db47c0e8636feafa7ef02a297d92cef240f8dd8c3c53f24b';
export function buildCt29PlasterDefinitionS2754(source:Ct29PlasterSourcePackS2754,prefix:string):AutomaticOwnerDefinition {
 return source.ordinaryGeometryProfileR1===true
  ?buildCt29IndoorGeometryDefinitionR1(source,prefix):buildCt29AdvancedPlasterDefinitionS2754(source,prefix);
}
export function buildCt29PlasterCompletenessMapS2754(source:Ct29PlasterSourcePackS2754,prefix:string){
 if(source.ordinaryGeometryProfileR1!==true)return buildCt29AdvancedPlasterCompletenessMapS2754(source,prefix);
 const entries=[
  ['net-ct29','mixing','material','kg','APPROXIMATE_AREA_THICKNESS_1_8','net-mixture'],
  ['whole-batch-mixture','mixing','material','kg','CEIL_NET_OVER_25_X_25_NOT_PURCHASE','25kg-prepared-mixture'],
  ['purchase-ct29','mixing','material','kg','WHOLE_BATCH_REQUIREMENT_LESS_ASSIGNED_WHOLE_BAG_STOCK','25kg-order'],
  ['mixing-water','mixing','material','l','WHOLE_BATCHES_X_UPPER_PUBLISHED_6_2_L_PLANNING','25kg-mix-water-consumed'],
  ['normative-labor','application','labor','man_hour','51_89_PER_100M2_X_MAX_1_T_OVER_10','labor'],
  ['normative-mixer65l','mixing','equipment','machine_hour','1_67_PER_100M2_X_MAX_1_T_OVER_10','mixer'],
  ['normative-loader5t','handling','equipment','machine_hour','0_04_PER_100M2_X_MAX_1_T_OVER_10','loader'],
  ['normative-lift500kg','handling','equipment','machine_hour','0_16_PER_100M2_X_MAX_1_T_OVER_10','hoist'],
  ['curing-water','curing','material','l','OPEN_APPLICATION_SOURCE_QUANTITY_NEVER_USER_INPUT','curing-water'],
  ['logistics-cleanup','completion','service','item','OPEN_APPLICATION_SOURCE_QUANTITY_NEVER_USER_INPUT','logistics-cleanup'],
 ] as const;
 return {contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'PRODUCT_TDS_AND_KRER_MANUAL_SINGLE_COAT',
  generatedFromCurrentRows:false,evidenceSha256:ct29IndoorGeometrySourceSha256R1,
  evidenceReferences:geometryPack.sources.map(s=>s.url),fullTechnicalAcceptance:false,
  entries:entries.map(([expectedResourceId,operationId,category,unitId,quantityRule,key])=>({expectedResourceId,operationId,category,unitId,quantityRule,
   specification:expectedResourceId,condition:'EXACT_PREPARED_CEMENT_LIME_INSIDE_SINGLE_COAT_TO_20MM',sourceId:geometryPack.contract,
   formulaId:prefix+':formula:'+key,resolution:{kind:'ROW',rowId:prefix+':'+key}})),
  documentedIncludedScopes:[{expectedResourceId:'ordinary-hand-tools-access-ppe',resolution:{kind:'INCLUDED',coveringRowIds:[prefix+':labor']},
   sourceId:'kr_overheads',locator:'PDF22,appendix6,III.1-2 and II.4; cost exclusion breaks coverage'}],
  openAuthorObligations:geometryPack.readiness.openAuthorObligationsRu};
}

export function buildCt29IndoorGeometryDefinitionR1(source:Ct29PlasterSourcePackS2754,prefix:string):AutomaticOwnerDefinition {
 if(source.catalogId!==geometryPack.catalogId||source.weatherProtectionValue)throw Error('EXACT_CT29_CEMENT_LIME_INDOOR_GEOMETRY_SCOPE_REQUIRED');
 const norm=accepted.norm_items.find(item=>item.norm_id===source.normId);
 if(!norm||norm.rate.value!==1.8||accepted.source_pack_version!==source.acceptedPhysicalSourceVersion
  ||norm.applicability.documented_bag_sizes_kg.join(',')!=='5,25')throw Error('ACCEPTED_CT29_AREA_THICKNESS_PROFILE_REQUIRED');
 const rowId=(key:string)=>prefix+':'+key,area='plaster_area_m2',thickness='layer_thickness_mm',stock='ct29_25kg_stock_bags';
 const derived=[
  ['ct29_net_kg','Приблизительная сухая потребность CT29','kg',`${area}*${thickness}*1.8`],
  ['ct29_whole_batches','Минимальный план последовательных целых замесов по 25 кг','pcs','ceil(ct29_net_kg/25)'],
  ['ct29_prepared_kg','Сухая масса целых замесов, не закупка','kg','ct29_whole_batches*25'],
  ['ct29_norm_units','Нормативные100 м² с поправкой только на превышение10 мм','m2',`${area}/100*max(1,${thickness}/10)`],
 ] as const;
 const rows:AutomaticRowSpec[]=[],binding=new Map<string,{operation:string;source:number;included?:boolean;scope?:boolean}>();
 const add=(key:string,title:string,operation:string,category:string,unitId:string,expression:string,sourceIndex:number,
  extra:Partial<AutomaticRowSpec>={},flags:{included?:boolean;scope?:boolean}={})=>{
  const id=rowId(key);rows.push({rowId:id,formulaId:rowId('formula:'+key),section:operation,category,title,unitId,expression,
   procurement:false,inputParameterIds:[area,thickness],...extra});binding.set(id,{operation,source:sourceIndex,...flags});
 };
 const owner=rowId('25kg-order'),balance=effectivePurchaseBalanceExpressionsR1({ownerRowId:owner,orderUnitId:'kg',consumed:'ct29_prepared_kg',
  stock:`${stock}*25`,reserve:'0',quantum:'25'});
 const info={costTreatment:'INFORMATIONAL_SCOPE' as const};
 add('net-mixture','CT29 en_GL: приблизительная потребность1.8 кг/м²/мм','mixing','material','kg','ct29_net_kg',1,info);
 add('25kg-minimum-batches','План последовательных целых замесов25 кг — расчётный минимум','mixing','material','pcs','ct29_whole_batches',1,info);
 add('25kg-prepared-mixture','CT29: сухая масса плана целых замесов по 25 кг','mixing','material','kg','ct29_prepared_kg',1,
  {...info,purchaseBalanceOwnerRowId:owner});
 add('25kg-plan-excess','Превышение плана замесов над net — не норма отходов','mixing','material','kg','ct29_prepared_kg-ct29_net_kg',1,info);
 add('25kg-order','Ceresit CT29 en_GL,25 кг: закупаемая сухая масса после выделенного остатка','mixing','material','kg',
  `max(0,ct29_whole_batches-${stock})*25`,1,{procurement:true,...balance.owner});
 add('25kg-ordered-bags','Целые25 кгмешки CT29 в заказе — без второй цены','mixing','material','pcs',`${balance.effective}/25`,1,
  {...info,purchaseBalanceOwnerRowId:owner});
 add('25kg-mix-water-min','Нижняя граница рецепта воды5.7 л/25 кг — справочно','mixing','material','l','ct29_whole_batches*5.7',1,info);
 add('25kg-mix-water-max','Верхняя граница рецепта воды6.2 л/25 кг — справочно','mixing','material','l','ct29_whole_batches*6.2',1,info);
 add('25kg-mix-water-consumed','Вода чистая холодная: план целых замесов CT29, верхний рецепт6.2 л/25 кг','mixing','material','l',
  'ct29_whole_batches*6.2',1,{procurement:true});
 add('labor','Нормативный труд ручной однослойной штукатурки, разряд 3.6; с предоставлением обычного инвентаря','application','labor','man_hour',
  'ct29_norm_units*51.89',2);
 add('mixer','Нормативный растворосмеситель 65 л; фактически допустима малая механизация по§4.2','mixing','equipment','machine_hour','ct29_norm_units*1.67',2);
 add('loader','Нормативный автопогрузчик 5 т: внутриобъектная подача','handling','equipment','machine_hour','ct29_norm_units*0.04',2);
 add('hoist','Нормативный одномачтовый подъёмник 500 кг, 45 м: внутриобъектная подача','handling','equipment','machine_hour','ct29_norm_units*0.16',2);
 add('machine-operators','Труд машинистов уже в стоимости нормативных машин — без второй цены','handling','labor','man_hour','ct29_norm_units*1.87',2,
  info);
 add('stage-mixing','Приготовление и последовательное затворение целых мешков 25 кг','mixing','work','pcs','ct29_whole_batches',1,
  {costTreatment:'INCLUDED_IN_RESOURCE_ROWS'},{included:true});
 add('stage-application','Ручное нанесение, разглаживание и затирка CT29 до 20 мм за проход','application','work','m2',area,0,
  {costTreatment:'INCLUDED_IN_RESOURCE_ROWS'},{included:true});
 add('curing-water','Вода лёгкого распыления при уходе CT29: применимая норма ещё не подтверждена','curing','material','l','ct29_curing_water_l',1);
 add('logistics-cleanup','Доставка CT29, разгрузка, уборка и передача фактической упаковки и остатков','completion','service','item','ct29_logistics_cleanup_qty',1);
 add('scope-tools','Обычный ручной инвентарь, доступ до 3.5 м и СИЗ в накладном составе трудового владельца','application','service','',
  'ct29_tools_scope',5,info,{scope:true});
 const conditional:AutomaticParameterSpec[]=[...derived.map(([id,title,unitId])=>({id,title,unitId,valueType:'decimal' as const,kind:'conditional' as const,min:0})),
  {id:stock,title:'Выделенные пригодные целые мешки CT29 25 кг на объекте (необязательно)',unitId:'pcs',valueType:'integer',kind:'conditional',min:0},
  {id:'ct29_curing_water_l',title:'Источник приложения: расход воды ухода и граница труда',unitId:'l',valueType:'decimal',kind:'internal',min:0},
  {id:'ct29_logistics_cleanup_qty',title:'Источник приложения: внешний транспорт и завершение',unitId:'item',valueType:'decimal',kind:'internal',min:0},
  {id:'ct29_tools_scope',title:'Документированное предоставление обычного инвентаря',unitId:null,valueType:'decimal',kind:'internal'},
 ];
 const built=buildAutomaticConstructionOwnerR1({contract:geometryPack.contract,semanticOwner:prefix,sourceId:source.sourceId,normId:source.normId,
  sourceMetadata:{source_title:geometryPack.titleRu,source_document_version:'C_CT29_TDS_1_0120 + КРЕР15-2015',
   definition_hash:ct29IndoorGeometrySourceSha256R1,artifact_sha256:ct29IndoorGeometrySourceSha256R1,
   exact_locator:'CT29en_GL TDS1–2; globalpage max20 мм; КРЕР15 PDF10§1.5,137–138табл15-02-019-03; общиеКРЕР PDF9§4.2; МетодикаPDF15§4.23; накладныеPDF22прил6'},
  applicabilityRu:geometryPack.scopeRu,ordinary:[
   {id:area,title:'Площадь штукатурного выравнивания CT29, м²',valueType:'decimal',unitId:'m2',kind:'ordinary',min:.001},
   {id:thickness,title:'Толщина однослойного CT29, мм (до 20 мм за проход)',valueType:'decimal',unitId:'mm',kind:'ordinary',min:.001,max:20},
  ],profile:[],conditional,rows,deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:[geometryPack.scopeRu,...geometryPack.forbiddenRu]});
 const derivedExpressions=new Map<string,string>(derived.map(([id,,,expression])=>[id,expression]));
 const parameters=built.parameters.map(parameter=>{
  const isStock=parameter.parameter_id===stock,expression=isStock?'0':derivedExpressions.get(parameter.parameter_id);
  const truth={...parameter.truth_metadata,source_confirmation_required:false,
   ...(expression?{visibility_role:isStock?'USER_INPUT':'INTERNAL_ONLY',value_source_role:'VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE',
    provenance:{consumer_input_role_v1:isStock?'OBJECT_FACT':'APPLICATION_TECHNICAL'},runtime_profile_classification:'PRELIMINARY_SOURCE_FORMULA',
    runtime_profile_value:true,preliminary_compilation_allowed:true,
    preliminary_value_formula_v1:{version:'canonical-preliminary-parameter-formula:v1',expression,
     ...(isStock?{}:{explicitValuePolicy:'REQUIRE_MATCH'}),when:{kind:'literal',value:true}},
    ...(isStock?{guide:{...(parameter.truth_metadata.guide as Record<string,unknown>),guide_kind:'MEASUREMENT_RULE',
     guide_short_ru:'Необязательный выделенный пригодный остаток целых мешков 25 кг. Если не указан, кредит закупки0; net, целые замесы и вода от остатка не уменьшаются.',
     source_role:'OPTIONAL_ASSIGNED_PROJECT_STOCK',guide_validation_policy:'MANDATORY_BLOCK'}}:{})}:{}),
  };
  return {...parameter,truth_metadata:['ct29_curing_water_l','ct29_logistics_cleanup_qty'].includes(parameter.parameter_id)
   ?{...truth,visibility_role:'INTERNAL_ONLY',value_source_role:'UNRESOLVED_APPLICATION_NORM',provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL'},
    unresolved_norm_reason:parameter.parameter_id==='ct29_curing_water_l'
     ?'TDS требует лёгкое распыление, но л/м², число поливов и прямая граница труда ухода в019 не доказаны. Это обязанность автора источника; число пользователя не заменяет норму.'
     :'Внешняя доставка и фактический вывоз не закрыты внутриобъектными машино-часами. Нужен технологический источник приложения; ручной бюджет сохраняется без подтверждения нормы.'}:truth};
 });
 const titles:Record<string,string>={handling:'Внутриобъектная подача CT29',mixing:'Целые последовательные замесы CT29',
  application:'Однослойное ручное нанесение и разглаживание',curing:'Защита слоя CT29 от быстрого высыхания',completion:'Доставка, уборка и упаковка'};
 const operation=(key:string)=>({operationId:rowId('operation:'+key),operationTitleRu:titles[key],processOrdinal:
  ({handling:10,mixing:20,application:30,curing:40,completion:50} as Record<string,number>)[key],processRole:'PROCESS' as const,
  completionCriterionRu:key==='curing'?'Лёгкое распыление выполняется по TDS; числовая норма воды и прямая граница труда требуют первоисточника.':
   'Ресурс рассчитан существующим ядром по геометрии; фактическое выполнение и контроль подтверждаются отдельно.'});
 const laborOwner=rowId('labor');
 const resources=built.resources.map(resource=>{
  const b=binding.get(resource.row_id)!,evidence=geometryPack.sources[b.source]!,key=resource.row_id.slice(prefix.length+1),
   gap=key==='curing-water'||key==='logistics-cleanup',machineOperator=key==='machine-operators',isLabor=key==='labor';
  const owner=machineOperator?rowId('mixer'):laborOwner;
  const {row_sha256:_old,...body}=resource;
  const changed={...body,...(b.included||b.scope?{cost_owner_id:owner}:{}),
   resource_graph:{...resource.resource_graph,
    ...(b.included||b.scope?{parentCostOwnerId:owner,includedInResourceOwnerRowId:owner}:{}),
    
    operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:prefix,groupTitleRu:geometryPack.titleRu,...operation(b.operation),
     ...(isLabor?{processRole:'COST_SUMMARY',processOrdinal:0,additionalOperations:[operation('mixing'),operation('application')]}:{})},
    ...(b.scope?{scopeRequirementV1:{contractVersion:'canonical-scope-requirement/v1',kind:'INCLUDED',groupId:prefix,groupTitleRu:geometryPack.titleRu,
     titleRu:resource.title_ru,reasonRu:geometryPack.costScopeRu,exactScopeWhen:{kind:'greater_than',parameterId:area,value:0},
     coveringRowIds:[laborOwner],originalRowIds:[],costExclusionBreaksScopeV1:true,
     sourceEvidence:[{sha256:evidence.sha256,locator:'Накладные расходы,PDF22,приложение6III.1–2 и II.4; выбранный трудовой owner содержит этот состав'},
      {sha256:geometryPack.sources[2]!.sha256,locator:'КРЕР15,PDF8,§1.2(a): обычный доступ до 3.5 м'}]}}:{}),
    publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:resource.title_ru,nameRu:resource.title_ru,
     brandAndModelRu:b.source===1&&!gap?'Ceresit CT29 en_GL':null,
     specificationRu:gap?null:key==='mixer'?'Нормативный 65 л растворосмеситель;1.67 маш-ч/100 м². Часы фактической дрели не заявлены.':
      key.includes('water')?'Рецепт 5.7–6.2 л на целый мешок 25 кг; верхняя граница — планирование, не факт приготовления.':null,
     detailsRu:[geometryPack.scopeRu,...(gap?(key==='curing-water'
      ?[geometryPack.readiness.openAuthorObligationsRu[0],geometryPack.readiness.openAuthorObligationsRu[1]]
      :[geometryPack.readiness.openAuthorObligationsRu[2]]):
      [geometryPack.planningPolicyRu]),...(isLabor||b.scope?[geometryPack.costScopeRu]:[])],...(b.scope?{rowKind:'PROCESS_NOTE'}:{})}},
   source_metadata:{...resource.source_metadata,official_url:evidence.url,artifact_sha256:evidence.sha256,exact_locator:JSON.stringify(evidence.locators),
    sourceRole:gap?'UNRESOLVED_INSTALLATION_QUANTITY':b.scope?'DOCUMENTED_OVERHEAD_INCLUDED_TOOL_SCOPE':b.source===2?'KRER_NORMATIVE_MANUAL_SINGLE_COAT_RESOURCE':
     'SPECIFIC_CT29_TDS_GEOMETRY_AND_WHOLE_PACK_PLAN',
    normativeTrace:gap?[]:[{sourceId:evidence.id,normId:b.source===2?'КРЕР15-02-019-03':geometryPack.contract,source_url:evidence.url,
     source_definition_hash:evidence.sha256,exact_locator:JSON.stringify(evidence.locators)}],
    full_technical_acceptance:false,geometryOnlyFullBranch:false,requiredNonGeometryQuestions:0,
    sourceAuthorObligations:geometryPack.readiness.openAuthorObligationsRu,
    ...(machineOperator?{operatorHoursIncludedInMachineRows:[rowId('mixer'),rowId('loader'),rowId('hoist')]}:{}),
    normativeMachineNotActualDrillTime:key==='mixer',waterNotFromPurchaseQuantity:key.includes('water'),
    waterPoolNotClaimed:true,actualPreparationNotClaimed:true,acceptedPhysicalProfileId:source.acceptedPhysicalProfileId,
    materialDemandBasis:'TDS1.8×geometry; Методика4.23',machineSubstitutionBasis:'ОбщиеКРЕР4.2; граница1.4',
    automaticGenericPriceInheritanceAllowed:false}};
  return {...changed,row_sha256:estimateDeterministicHash(changed)};
 });
 return {...built,parameters,resources};
}
