import pack from '../../../../data/estimate-benchmarks/source-packs/incandescent-vl-luminaire-krer33-04-014-01-s27-58.json';
import {buildAutomaticConstructionOwnerR1,compileAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,
  type AutomaticOwnerDefinition,type AutomaticParameterSpec,type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {effectivePurchaseBalanceExpressionsR1,effectiveResourceQuantityParameterId} from './effectivePurchaseBalanceR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';

export const incandescentVlPackS2758=pack;
export const incandescentVlPrefixS2758='incandescent-vl-luminaire';
export const ownLuminaireTruckS2758='Собственный бортовой автомобиль; водитель включён в стоимость эксплуатации';
export const hiredLuminaireTruckS2758='Аренда бортового автомобиля; водитель включён в ставку машины';
const prefix=incandescentVlPrefixS2758;
const facts=['construction_scope_conditions','ready_support_connection_reference','pole_attachment_height_m','access_method_reference'];
const projectMaterials=pack.materials.filter(m=>m.projectDefined);

export function incandescentVlDefinitionS2758():AutomaticOwnerDefinition{
  const conditional:AutomaticParameterSpec[]=[
    {id:facts[0],title:'Фактические условия строительства',valueType:'enum',unitId:null,kind:'conditional',values:[pack.scopeValueRu]},
    {id:facts[1],title:'Проект готовой опоры, крепления и подключения светильника',valueType:'text',unitId:null,kind:'conditional'},
    {id:facts[2],title:'Фактическая высота места крепления над рабочей площадкой',valueType:'decimal',unitId:'m',kind:'conditional',min:0.000000001},
    {id:facts[3],title:'Фактический способ безопасного доступа к месту крепления',valueType:'text',unitId:null,kind:'conditional'},
    {id:'truck_fulfillment',title:'Собственный бортовой автомобиль или аренда с водителем',valueType:'enum',unitId:null,kind:'conditional',values:[ownLuminaireTruckS2758,hiredLuminaireTruckS2758]},
    {id:'project_material_supply_scope',title:'Фактический состав и раздельная оплата пяти проектных позиций',valueType:'enum',unitId:null,kind:'conditional',values:[pack.projectSupplyScopeRu]},
  ];
  const rows:AutomaticRowSpec[]=[];
  const add=(id:string,title:string,category:string,unitId:string,expression:string,extra:Partial<AutomaticRowSpec>={})=>rows.push({
    rowId:prefix+':'+id,formulaId:prefix+':formula:'+id,section:pack.titleRu,category,title,unitId,expression,procurement:false,inputParameterIds:facts,...extra});
  const positive=(unitId:string)=>({schemaVersion:'canonical_formula_output_bounds_v1' as const,unitId,exclusiveMinimum:0,reasonRu:'Применимый ресурс требует положительного подтверждённого количества.'});
  add('whole-labor','Труд рабочих-строителей, средний разряд4,0; вся операция установки','labor','man_hour','luminaire_count*1.29',{formulaOutputBounds:positive('man_hour')});
  const effectiveTruck=effectiveResourceQuantityParameterId(prefix+':truck-consumed');
  add('truck-consumed','Нормативная работа бортового автомобиля грузоподъёмностью до5т','equipment','machine_hour','luminaire_count*0.06',{costTreatment:'INFORMATIONAL_SCOPE',formulaOutputBounds:positive('machine_hour'),effectiveQuantityOutput:{parameterId:effectiveTruck,unitId:'machine_hour'}});
  for(const [mode,value] of [['own',ownLuminaireTruckS2758],['hired',hiredLuminaireTruckS2758]] as const)
    add('truck-'+mode,'Бортовой автомобиль грузоподъёмностью до5т'+(mode==='hired'?' — аренда с водителем':' — собственный, эксплуатация'),'equipment','machine_hour',effectiveTruck,
      {procurement:mode==='hired',inclusion:{kind:'equals',parameterId:'truck_fulfillment',value},formulaOutputBounds:positive('machine_hour')});
  for(const m of pack.materials){
    const quantityId=m.id+'_project_total',projectSpecId=m.id+'_project_specification';
    if(m.projectDefined)conditional.push(
      {id:quantityId,title:'Итог по проектной ведомости: '+m.nameRu,valueType:m.sourceUnitId==='pcs'?'integer':'decimal',unitId:m.sourceUnitId,kind:'conditional',min:m.sourceUnitId==='pcs'?1:0.000000001,
        ...(m.sourceUnitId==='pcs'?{numericPeerConstraints:{equalToParameter:'luminaire_count'}}:{})},
      {id:projectSpecId,title:'Проектная спецификация и документ: '+m.nameRu,valueType:'text',unitId:null,kind:'conditional'});
    conditional.push({id:m.id+'_supply_specification',title:'Фактическая поставочная спецификация: '+m.nameRu,valueType:'text',unitId:null,kind:'conditional'},
      {id:m.id+'_stock_compatibility_reference',title:'Пригодность имеющегося материала: '+m.nameRu,valueType:'text',unitId:null,kind:'conditional',requiredWhen:{kind:'greater_than',parameterId:m.id+'_stock',value:0}});
    for(const [suffix,title,min] of [['stock','Пригодное наличие',0],['reserve','Сохраняемый резерв',0],['quantum','Кратность фактической поставки',0.000000001]] as const)
      conditional.push({id:m.id+'_'+suffix,title:title+': '+m.nameRu,valueType:m.orderUnitId==='pcs'?'integer':'decimal',unitId:m.orderUnitId,kind:'conditional',min:m.orderUnitId==='pcs'&&suffix==='quantum'?1:min});
    const physicalInputs=[...facts,...(m.projectDefined?[quantityId,projectSpecId]:[])];
    const effectivePhysical=effectiveResourceQuantityParameterId(prefix+':'+m.id+'-consumed');
    const orderConsumed=m.sourceUnitId==='t'&&m.orderUnitId==='kg'?effectivePhysical+'*1000':effectivePhysical;
    if(m.sourceUnitId!==m.orderUnitId&&!(m.sourceUnitId==='t'&&m.orderUnitId==='kg'))throw Error('INCANDESCENT_ORDER_UNIT_CONVERSION_NOT_ADMITTED');
    add(m.id+'-consumed',(m.projectDefined?'Проектный итог: ':'Нормативный расход: ')+m.nameRu,'material',m.sourceUnitId,m.expression,
      {inputParameterIds:physicalInputs,costTreatment:'INFORMATIONAL_SCOPE',purchaseBalanceOwnerRowId:prefix+':'+m.id,formulaOutputBounds:positive(m.sourceUnitId),effectiveQuantityOutput:{parameterId:effectivePhysical,unitId:m.sourceUnitId}});
    const balance=effectivePurchaseBalanceExpressionsR1({ownerRowId:prefix+':'+m.id,orderUnitId:m.orderUnitId,consumed:orderConsumed,stock:m.id+'_stock',reserve:m.id+'_reserve',quantum:m.id+'_quantum'});
    add(m.id,m.nameRu,'material',m.orderUnitId,`ceil(max(0,(${orderConsumed})+${m.id}_reserve-${m.id}_stock)/${m.id}_quantum)*${m.id}_quantum`,
      {...balance.owner,procurement:true,inputParameterIds:[...physicalInputs,...(m.projectDefined?['project_material_supply_scope']:[]),m.id+'_supply_specification',m.id+'_stock_compatibility_reference'],titleParameterIds:[m.id+'_supply_specification']});
  }
  for(const operation of pack.operations)add(operation.id,operation.nameRu,'work','pcs','luminaire_count',{costTreatment:'INCLUDED_IN_RESOURCE_ROWS'});
  for(const gap of pack.gaps){const id='open_scope_qty_'+gap.id.replaceAll('-','_');conditional.push({id,title:gap.nameRu,valueType:'decimal',unitId:null,kind:'conditional',min:0});add(gap.id,gap.nameRu,gap.category,'',id);}
  const original=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:prefix,sourceId:pack.sourceId,normId:pack.normId,
    sourceMetadata:{source_title:pack.titleRu,source_document_version:pack.source.edition,definition_hash:pack.source.sha256,artifact_sha256:pack.source.sha256,exact_locator:pack.source.locatorRu},
    applicabilityRu:pack.scopeRu,ordinary:[{id:'luminaire_count',title:'Количество устанавливаемых светильников',valueType:'integer',unitId:'pcs',kind:'ordinary',min:1}],profile:[],conditional,rows,
    deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:pack.excludedRu});
  return {...original,parameters:original.parameters.map(p=>{
    const id=p.parameter_id,guide=p.truth_metadata.guide as Record<string,unknown>,m=pack.materials.find(x=>id.startsWith(x.id+'_'));
    if(id.startsWith('open_scope_qty_'))return {...p,truth_metadata:unresolvedApplicationNormTruthR1(p.truth_metadata,'Источник не устанавливает применимость, количество и владельца отдельной цены. Это потребность приложения, а не поле для ручного ввода нормы.')};
    if(p.truth_metadata.visibility_role==='INTERNAL_ONLY')return p;
    const project=m?.projectDefined&&(id===m.id+'_project_total'||id===m.id+'_project_specification');
    const required=id==='luminaire_count'||facts.includes(id)||id==='project_material_supply_scope'||project===true||id.endsWith('_supply_specification');
    const text=id===facts[1]?'Укажите фактический проект готовой пригодной опоры ВЛ, детали крепления, точки присоединения и светильника с лампой накаливания. Строительство опоры и питающей сети сюда не входит.':
      id===facts[2]?'Укажите фактическую высоту точки крепления. Норма не задаёт универсальной высоты безопасного доступа; дополнительное оснащение остаётся открытой потребностью.':
      id===facts[3]?'Укажите предусмотренный проектом/технологической картой фактический способ доступа. Вышка из соседней колонки не добавляется; дополнительный состав и количество требуют источника.':
      id==='truck_fulfillment'?'Выберите фактический способ обеспечения. Водитель включён в стоимость эксплуатации/ставку; собственного автомобиля нет в списке аренды.':
      id==='project_material_supply_scope'?'Выберите только подтверждённую раздельную поставку/оплату всех пяти проектных позиций. Если крепёж/кронштейн/хомут/провод включён в другой комплект, данный раздельный заказ остаётся открытым: его нельзя дублировать. Лампа в указанном светильнике не получает второй заказ.':
      project?m!.identityGuideRu:
      id.endsWith('_stock_compatibility_reference')?'При положительном наличии укажите документ/проверку соответствия точной выбранной позиции, полноты комплекта и пригодности. Чужой или непригодный остаток не вычитается.':
      id.endsWith('_supply_specification')?m!.identityGuideRu+' Укажите фактически отдельно поставляемую позицию, состав и единицу заказа '+m!.orderUnitId+'. Включённые в другую поставку компоненты нельзя заказывать повторно.':
      m?'Введите фактическое значение в указанной единице '+m.orderUnitId+' по точной поставочной позиции; нормы расхода приложение рассчитывает самостоятельно.':guide.guide_short_ru;
    return {...p,required,truth_metadata:{...p.truth_metadata,value_source_role:id==='luminaire_count'?'USER_INPUT':id.endsWith('_stock_compatibility_reference')?'CONDITIONAL_PROJECT_FACT':'PROJECT_SPECIFIC_INPUT',source_confirmation_required:false,
      ...(p.constraints_json?.requiredWhen?{required_when:p.constraints_json.requiredWhen}:{}),provenance:{consumer_input_role_v1:id==='luminaire_count'?'OBJECT_GEOMETRY':'OBJECT_FACT'},
      guide:{...guide,guide_short_ru:text,verified_at:'2026-10-10T16:48:05Z',...(project?{source_role:'PROJECT_DOCUMENTATION',source_document:'Фактическая проектная ведомость выбранного объёма',source_locator:'Номер/лист/позиция документа указывается в проектной спецификации',quantity_origin:'DOCUMENTED_PROJECT_TOTAL_NOT_PER_LUMINAIRE_NORM'}:{})}}};
  }),resources:original.resources.map(r=>{
    const key=r.row_id.slice(prefix.length+1),m=pack.materials.find(x=>key===x.id||key===x.id+'-consumed'),gap=pack.gaps.find(g=>g.id===key),operation=pack.operations.find(o=>o.id===key);
    const project=m?.projectDefined===true,order=!!m&&key===m.id,included=!!operation,truck=key.startsWith('truck-'),{row_sha256:_hash,...body}=r;
    const normTrace=gap||project?[]:((r.source_metadata?.normativeTrace??[]) as Record<string,unknown>[]).map(t=>({...t,sourceRole:'OFFICIAL_NORM'}));
    const updated={...body,cost_owner_id:included?prefix+':whole-labor':r.cost_owner_id,resource_graph:{...r.resource_graph,
      ...(included?{parentCostOwnerId:prefix+':whole-labor',includedInResourceOwnerRowId:prefix+':whole-labor'}:{}),
      ...(truck?{physicalNormOwnerRowId:prefix+':truck-consumed',operatorCostOwnership:'DRIVER_INCLUDED_IN_MACHINE_PRICE_NO_SECOND_OWNER'}:{}),
      ...(project?{projectQuantityProvenanceV1:{contractVersion:'canonical-project-quantity-provenance/v1',quantityOrigin:'DOCUMENTED_PROJECT_TOTAL_NOT_OFFICIAL_NUMERIC_NORM',printedQuantityCell:'П',projectQuantityParameterId:m!.id+'_project_total',projectSpecificationParameterId:m!.id+'_project_specification',normProvidesResourceIdentityAndUnitOnly:true}}:{}),
      operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:prefix,groupTitleRu:pack.titleRu,operationId:prefix+':operation:'+(gap?gap.id:truck?'truck':'installation'),
        operationTitleRu:gap?.nameRu??(truck?'Бортовой автомобиль и включённый водитель':'Установка и присоединение светильника'),processOrdinal:gap?40:10,completionCriterionRu:gap?'Определены применимость, количество и включение в стоимость.':'Выполнена точная операция колонки01.'},
      publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:r.title_ru,nameRu:r.title_ru,brandAndModelRu:null,specificationRu:m?.nameRu??null,
        detailsRu:gap?['Потребность не завершена: применимость, единица, количество и владелец цены требуют источника.']:[pack.scopeRu,
          ...(project?['Конкретное количество — документированный итог проектной ведомости; в КРЕР указан ресурс/единица и ненумерическая ячейка П, числовой нормы на светильник нет.']:[]),
          ...(m?.id==='solvent_gasoline'?['Норма0,00006т на светильник; перевод заказа в кг строго×1000, без литров и плотности.']:[]),
          ...(truck?['0,06маш.-ч на светильник; водитель включён, аренда и собственная эксплуатация взаимоисключающие.']:[]),
          ...(included?['Операция включена в единый труд1,29ч на светильник; отдельной оплаты и закупки нет.']:[])]}},
      source_metadata:{...r.source_metadata,normativeTrace:normTrace,sourceRole:gap?'UNRESOLVED_INSTALLATION_SOURCE':order?'DERIVED_PURCHASE_BALANCE':project?'DOCUMENTED_PROJECT_QUANTITY':'OFFICIAL_NORM',
        ...(project?{quantityOrigin:'DOCUMENTED_PROJECT_TOTAL_NOT_OFFICIAL_NUMERIC_NORM',printedQuantityCell:'П',projectQuantityParameterId:m!.id+'_project_total',projectSpecificationParameterId:m!.id+'_project_specification',
          compositionSourceTrace:[{sourceId:pack.sourceId,normId:pack.normId,sourceRole:'OFFICIAL_RESOURCE_IDENTITY_AND_UNIT_ONLY',exactLocator:pack.source.locatorRu,artifactSha256:pack.source.sha256}]}:{}),
        official_url:pack.source.officialUrl,source_artifact_sha256:pack.source.sha256,exact_locator:pack.source.locatorRu,exact_column:'01',sourceMeasure:'ONE_INSTALLED_LUMINAIRE',
        ...(truck?{driverPriceOwnershipSource:pack.guidance}:{}),
        quantityUnitUnconfirmed:!!gap,full_technical_acceptance:false,sourceAdmission:pack.sourceAdmission}};
    return {...updated,row_sha256:estimateDeterministicHash(updated)};
  })};
}
export function compileIncandescentVlS2758(input:Record<string,unknown>){return compileAutomaticConstructionOwnerR1({catalogId:pack.catalogId,compilerVersion:pack.contract,primaryMeasureParameterId:'luminaire_count',definition:incandescentVlDefinitionS2758(),submittedParameters:input});}
export function incandescentVlCompletenessMapS2758(){return {contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'NORMATIVE_OPERATION_MAP',generatedFromCurrentRows:false,
  evidenceSha256:pack.source.sha256,evidenceReferences:[pack.source.officialUrl,pack.source.locatorRu],entries:[
    ...[{id:'whole-labor',unitId:'man_hour',spec:'Труд всей операции1,29ч на светильник'},{id:'truck-consumed',unitId:'machine_hour',spec:'Автомобиль бортовой до5т0,06маш.-ч на светильник'}].map(x=>({expectedResourceId:pack.normId+':'+x.id,operationId:'installation',category:x.id==='whole-labor'?'labor':'equipment',specification:x.spec,condition:pack.scopeRu,sourceId:pack.sourceId,unitId:x.unitId,quantityRule:'EXACT_FIXED_RATE_PER_LUMINAIRE',formulaId:prefix+':formula:'+x.id,resolution:{kind:'ROW',rowId:prefix+':'+x.id}})),
    ...pack.materials.map(m=>({expectedResourceId:pack.normId+':'+m.id,operationId:'installation',category:'material',specification:m.nameRu,condition:pack.scopeRu,sourceId:pack.sourceId,unitId:m.sourceUnitId,quantityRule:m.projectDefined?'DOCUMENTED_PROJECT_TOTAL_DIRECT':'EXACT_FIXED_RATE_PER_LUMINAIRE',formulaId:prefix+':formula:'+m.id+'-consumed',resolution:{kind:'ROW',rowId:prefix+':'+m.id+'-consumed'}})),
    ...pack.operations.map(o=>({expectedResourceId:pack.normId+':operation:'+o.id,operationId:'installation',category:'work',specification:o.nameRu,condition:pack.scopeRu,sourceId:pack.sourceId,unitId:'pcs',quantityRule:'OPERATION_INCLUDED_IN_WHOLE_LABOR_NO_SPLIT_HOURS',formulaId:prefix+':formula:'+o.id,resolution:{kind:'INCLUDED_COMPONENT_ROW',rowId:prefix+':'+o.id,parentRowId:prefix+':whole-labor'}})),
    ...[true,false].map(own=>({expectedResourceId:pack.normId+':truck-fulfillment:'+own,operationId:'truck',category:'equipment',specification:'Бортовой автомобиль до5т с включённым водителем',condition:own?ownLuminaireTruckS2758:hiredLuminaireTruckS2758,sourceId:pack.sourceId,unitId:'machine_hour',quantityRule:'EXCLUSIVE_FULFILLMENT_OF_SINGLE_PHYSICAL_TRUCK_NORM',formulaId:prefix+':formula:truck-'+(own?'own':'hired'),resolution:{kind:'ROW',rowId:prefix+':truck-'+(own?'own':'hired')}})),
    ...pack.gaps.map(g=>({expectedResourceId:pack.normId+':open:'+g.id,operationId:g.id,category:g.category,specification:g.nameRu,condition:'Проверить фактическую применимость, единицу, количество и включение в цену',sourceId:pack.sourceId,unitId:null,quantityRule:'SOURCE_REQUIRED_NOT_QUANTIFIED',formulaId:prefix+':formula:'+g.id,resolution:{kind:'ROW',rowId:prefix+':'+g.id}}))]};}
