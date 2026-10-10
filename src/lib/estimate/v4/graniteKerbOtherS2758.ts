import pack from '../../../../data/estimate-benchmarks/source-packs/granite-kerb-1gp-other-pavement-s27-58.json';
import {buildAutomaticConstructionOwnerR1,compileAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,type AutomaticOwnerDefinition,type AutomaticParameterSpec,type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {effectivePurchaseBalanceExpressionsR1,effectiveResourceQuantityParameterId} from './effectivePurchaseBalanceR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';

export const graniteKerbPackS2758=pack;
export const graniteKerbPrefixS2758='granite-kerb:1gp-other-pavement';
const prefix=graniteKerbPrefixS2758;
const length='kerb_length_m';
export function graniteKerbOtherDefinitionS2758():AutomaticOwnerDefinition{
  const facts=pack.scopeFacts.map(x=>x.id);
  const conditional:AutomaticParameterSpec[]=[
    ...pack.scopeFacts.map(f=>({id:f.id,title:({covering_kind:'Фактический вид покрытия возле гранитного борта',prepared_installation_line:'Готовность проектной линии установки и выемки',construction_scope_conditions:'Фактические условия строительства',granite_product_scope:'Исполнение гранитного борта по проекту'} as Record<string,string>)[f.id],valueType:'enum' as const,unitId:null,kind:'conditional' as const,values:[f.value]})),
    ...pack.machines.map(m=>({id:m.parameterId,title:m.parameterTitle,valueType:'enum' as const,unitId:null,kind:'conditional' as const,values:[m.ownValue,m.hiredValue]})),
  ];
  const rows:AutomaticRowSpec[]=[];
  const add=(id:string,title:string,category:string,unitId:string,expression:string,extra:Partial<AutomaticRowSpec>={})=>rows.push({rowId:prefix+':'+id,formulaId:prefix+':formula:'+id,section:pack.titleRu,category,title,unitId,expression,procurement:false,inputParameterIds:facts,...extra});
  const positive=(unitId:string)=>({schemaVersion:'canonical_formula_output_bounds_v1' as const,unitId,exclusiveMinimum:0,reasonRu:'Применимый исходный ресурс требует положительного количества.'});
  add('whole-labor','Труд рабочих-строителей, средний разряд2,7; вся операция установки гранитного борта','labor','man_hour',`${length}*109/100`,{formulaOutputBounds:positive('man_hour')});
  add('machine-operators-included','Затраты труда машинистов, учтённые в ценах работы машин','labor','man_hour',`${length}*0.68/100`,{costTreatment:'INFORMATIONAL_SCOPE',formulaOutputBounds:positive('man_hour')});
  for(const machine of pack.machines){
    const effective=effectiveResourceQuantityParameterId(prefix+':'+machine.id+'-consumed');
    add(machine.id+'-consumed','Нормативная работа: '+machine.nameRu,'equipment','machine_hour',`${length}*${machine.ratePer100M}/100`,{costTreatment:'INFORMATIONAL_SCOPE',formulaOutputBounds:positive('machine_hour'),effectiveQuantityOutput:{parameterId:effective,unitId:'machine_hour'}});
    for(const [mode,value,suffix] of [['own',machine.ownValue,' — собственный, эксплуатация'],['hired',machine.hiredValue,machine.id==='truck'?' — аренда с водителем':' — аренда с машинистом']] as const)
      add(machine.id+'-'+mode,machine.nameRu+suffix,'equipment','machine_hour',effective,{procurement:mode==='hired',inclusion:{kind:'equals',parameterId:machine.parameterId,value},formulaOutputBounds:positive('machine_hour')});
  }
  for(const m of pack.materials){
    conditional.push({id:m.specificationId,title:m.specificationTitle,valueType:'text',unitId:null,kind:'conditional'},
      {id:m.id+'_stock_compatibility_reference',title:'Пригодность имеющегося материала: '+m.nameRu,valueType:'text',unitId:null,kind:'conditional',requiredWhen:{kind:'greater_than',parameterId:m.id+'_stock',value:0}});
    for(const [suffix,title,min] of [['stock','Пригодное наличие',0],['reserve','Сохраняемый резерв',0],['quantum','Кратность фактической поставки',0.000000001]] as const)
      conditional.push({id:m.id+'_'+suffix,title:title+': '+m.nameRu,valueType:'decimal',unitId:m.orderUnitId,kind:'conditional',min});
    const effective=effectiveResourceQuantityParameterId(prefix+':'+m.id+'-consumed');
    const consumed=m.sourceUnitId==='t'&&m.orderUnitId==='kg'?effective+'*1000':effective;
    if(m.sourceUnitId!==m.orderUnitId&&!(m.sourceUnitId==='t'&&m.orderUnitId==='kg'))throw Error('GRANITE_ORDER_UNIT_CONVERSION_NOT_ADMITTED');
    add(m.id+'-consumed','Нормативный расход: '+m.nameRu,'material',m.sourceUnitId,`${length}*${m.ratePer100M}/100`,{costTreatment:'INFORMATIONAL_SCOPE',formulaOutputBounds:positive(m.sourceUnitId),effectiveQuantityOutput:{parameterId:effective,unitId:m.sourceUnitId},purchaseBalanceOwnerRowId:prefix+':'+m.id});
    const balance=effectivePurchaseBalanceExpressionsR1({ownerRowId:prefix+':'+m.id,orderUnitId:m.orderUnitId,consumed,stock:m.id+'_stock',reserve:m.id+'_reserve',quantum:m.id+'_quantum'});
    add(m.id,m.nameRu,'material',m.orderUnitId,`ceil(max(0,(${consumed})+${m.id}_reserve-${m.id}_stock)/${m.id}_quantum)*${m.id}_quantum`,{...balance.owner,procurement:true,inputParameterIds:[...facts,m.specificationId,m.id+'_stock_compatibility_reference'],titleParameterIds:[m.specificationId]});
  }
  for(const operation of pack.operations)add(operation.id,operation.nameRu,'work','m',length,{costTreatment:'INCLUDED_IN_RESOURCE_ROWS'});
  for(const gap of pack.gaps){const id='open_scope_qty_'+gap.id.replaceAll('-','_');conditional.push({id,title:gap.nameRu,valueType:'decimal',unitId:null,kind:'conditional',min:0});add(gap.id,gap.nameRu,gap.category,'',id);}
  const built=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:prefix,sourceId:pack.sourceId,normId:pack.normId,
    sourceMetadata:{source_title:pack.titleRu,source_document_version:pack.source.edition,definition_hash:pack.source.sha256,artifact_sha256:pack.source.sha256,exact_locator:pack.source.locatorRu},
    applicabilityRu:pack.scopeRu,ordinary:[{id:length,title:'Длина устанавливаемой линии гранитных бортов1ГП',valueType:'decimal',unitId:'m',kind:'ordinary',min:0.000000001}],profile:[],conditional,rows,deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:pack.excludedRu});
  return {...built,parameters:built.parameters.map(p=>{
    const id=p.parameter_id;
    if(id.startsWith('open_scope_qty_'))return {...p,truth_metadata:unresolvedApplicationNormTruthR1(p.truth_metadata,'Таблица не устанавливает единицу, применимость, количество и отдельного владельца цены этой дополнительной потребности. Ручное0/1 не заменяет источник.')};
    if(p.truth_metadata.visibility_role==='INTERNAL_ONLY')return p;
    const guide=p.truth_metadata.guide as Record<string,unknown>,material=pack.materials.find(m=>id===m.specificationId||id.startsWith(m.id+'_')),machine=pack.machines.find(m=>id===m.parameterId);
    const required=id===length||facts.includes(id)||pack.materials.some(m=>id===m.specificationId);
    const guideRu=machine?'Выберите фактическое обеспечение этой машины. Собственная эксплуатация и аренда взаимоисключающие; машинист/водитель включён в стоимость машины без второй оплаты. Другой механизм выбирается независимо.':
      material&&id===material.specificationId?material.identityGuideRu:
      id.endsWith('_stock_compatibility_reference')?'При положительном наличии укажите документ соответствия точной поставочной позиции, фактической пригодности и единицы. Чужой или непригодный остаток не вычитается.':
      material?'Укажите фактическое наличие, сохраняемый резерв или реальную кратность поставки в '+material.orderUnitId+'. Нормативный расход рассчитывается приложением, значения поставки не задаются по умолчанию.':guide.guide_short_ru;
    return {...p,required,truth_metadata:{...p.truth_metadata,value_source_role:id===length?'USER_INPUT':id.endsWith('_stock_compatibility_reference')?'CONDITIONAL_PROJECT_FACT':'PROJECT_SPECIFIC_INPUT',source_confirmation_required:false,
      ...(p.constraints_json?.requiredWhen?{required_when:p.constraints_json.requiredWhen}:{}),provenance:{consumer_input_role_v1:id===length?'OBJECT_GEOMETRY':'OBJECT_FACT'},guide:{...guide,guide_short_ru:guideRu,verified_at:pack.verifiedAt}}};
  }),resources:built.resources.map(r=>{
    const key=r.row_id.slice(prefix.length+1),material=pack.materials.find(m=>key===m.id||key===m.id+'-consumed'),machine=pack.machines.find(m=>key.startsWith(m.id+'-')),gap=pack.gaps.find(g=>key===g.id),operation=pack.operations.find(o=>key===o.id),aggregate=key==='machine-operators-included',order=!!material&&key===material.id;
    const {row_sha256:_old,...body}=r;
    const updated={...body,cost_owner_id:operation?prefix+':whole-labor':r.cost_owner_id,resource_graph:{...r.resource_graph,
      ...(operation?{parentCostOwnerId:prefix+':whole-labor',includedInResourceOwnerRowId:prefix+':whole-labor'}:{}),
      ...(machine?{physicalNormOwnerRowId:prefix+':'+machine.id+'-consumed',operatorCostOwnership:machine.operatorCostOwnership}:{}),
      operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:prefix,groupTitleRu:pack.titleRu,operationId:prefix+':operation:'+(gap?.id??machine?.id??(aggregate?'operators':'installation')),operationTitleRu:gap?.nameRu??machine?.nameRu??(aggregate?'Совокупные машинисты, включённые в цены машин':'Устройство основания и установка гранитных бортов'),processOrdinal:gap?40:10,completionCriterionRu:gap?'Подтверждены применимость, единица, количество и граница отдельной цены.':'Выполнена точная операция27-02-010-04.'},
      publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:r.title_ru,nameRu:r.title_ru,brandAndModelRu:null,specificationRu:material?.nameRu??null,detailsRu:gap?['Открытая потребность: источник количества, единицы и отдельной цены отсутствует.']:[pack.scopeRu,pack.includedTransportRu,
        ...(material?[material.identityGuideRu,`${pack.normId}: ${material.ratePer100M} ${material.sourceUnitId} на100м; ${material.sourceCode??'префикс кода не подтверждён, точная именованная строка на стр.27'}.`]:[]),
        ...(machine?[`${machine.ratePer100M} маш.-ч на100м; машинист/водитель включён в цену машины.`]:[]),
        ...(aggregate?['Совокупные0,68ч на100м — информационная строка труда; отдельной оплаты, закупки и распределения на единственного родителя нет.']:[]),
        ...(operation?['Включено в общий труд109ч на100м. Очистка гранитных бортов уже входит; отдельные часы и расходники не придуманы.']:[])]}},
      source_metadata:{...r.source_metadata,normativeTrace:gap?[]:((r.source_metadata?.normativeTrace??[]) as Record<string,unknown>[]).map(t=>({...t,sourceRole:'OFFICIAL_NORM'})),sourceRole:gap?'UNRESOLVED_INSTALLATION_SOURCE':order?'DERIVED_PURCHASE_BALANCE':'OFFICIAL_NORM',sourceCode:material?.sourceCode??machine?.sourceCode??(key==='whole-labor'?pack.labor.sourceCode:null),official_url:pack.source.officialUrl,source_artifact_sha256:pack.source.sha256,exact_locator:pack.source.locatorRu,exact_column:pack.normId,sourceMeasure:'100_LINEAR_METRES_OF_INSTALLED_GRANITE_1GP',
        ...(aggregate?{operatorPriceOwnershipSource:pack.guidance,aggregateOperatorQuantityNotAllocatedToSingleParent:true}:{}),...(machine?{machineOperatorPriceOwnershipSource:pack.guidance}:{}),quantityUnitUnconfirmed:!!gap,graniteCleaningIncluded:true,full_technical_acceptance:false,sourceAdmission:pack.sourceAdmission}};
    return {...updated,row_sha256:estimateDeterministicHash(updated)};
  })};
}
export function compileGraniteKerbOtherS2758(input:Record<string,unknown>){return compileAutomaticConstructionOwnerR1({catalogId:pack.catalogId,compilerVersion:pack.contract,primaryMeasureParameterId:length,definition:graniteKerbOtherDefinitionS2758(),submittedParameters:input});}
export function graniteKerbOtherCompletenessMapS2758(){return {contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'NORMATIVE_OPERATION_MAP',generatedFromCurrentRows:false,evidenceSha256:pack.source.sha256,evidenceReferences:[pack.source.officialUrl,pack.source.locatorRu],entries:[
  ...[{id:'whole-labor',category:'labor',unit:'man_hour',spec:'Труд всей операции109ч на100м; средний разряд2,7'},{id:'machine-operators-included',category:'labor',unit:'man_hour',spec:'Совокупные машинисты0,68ч на100м; информационно без единственного родителя'},
    {id:'crane-consumed',category:'equipment',unit:'machine_hour',spec:'Кран автомобильный10т;0,68маш.-ч на100м'},{id:'truck-consumed',category:'equipment',unit:'machine_hour',spec:'Автомобиль бортовой до5т;0,04маш.-ч на100м'},
    {id:'nails-consumed',category:'material',unit:'t',spec:'Гвозди строительные0,001т на100м'},{id:'timber-consumed',category:'material',unit:'m3',spec:'Брусья хвойные необрезные4–6,5м, толщина100/125мм, IV сорт;0,17м³ на100м'},
    {id:'concrete-consumed',category:'material',unit:'m3',spec:'Бетон тяжёлыйВ15 (М200);5,9м³ на100м'},{id:'mortar-consumed',category:'material',unit:'m3',spec:'Раствор готовый кладочный цементно-известковыйМ100;0,06м³ на100м'},{id:'stone-consumed',category:'material',unit:'m',spec:'Камень бортовой из горных пород1ГП;100п.м на100м'}].map(x=>({expectedResourceId:pack.normId+':'+x.id,operationId:'installation',category:x.category,specification:x.spec,condition:pack.scopeRu,sourceId:pack.sourceId,unitId:x.unit,quantityRule:'EXACT_OFFICIAL_RATE_PER_100_M',formulaId:prefix+':formula:'+x.id,resolution:{kind:'ROW',rowId:prefix+':'+x.id}})),
  ...pack.operations.map(o=>({expectedResourceId:pack.normId+':operation:'+o.id,operationId:'installation',category:'work',specification:o.nameRu,condition:pack.scopeRu,sourceId:pack.sourceId,unitId:'m',quantityRule:'INCLUDED_OPERATION_NO_ARBITRARY_LABOR_SPLIT',formulaId:prefix+':formula:'+o.id,resolution:{kind:'INCLUDED_COMPONENT_ROW',rowId:prefix+':'+o.id,parentRowId:prefix+':whole-labor'}})),
  ...pack.machines.flatMap(m=>[true,false].map(own=>({expectedResourceId:pack.normId+':'+m.id+'-fulfillment:'+own,operationId:m.id,category:'equipment',specification:m.nameRu,condition:own?m.ownValue:m.hiredValue,sourceId:pack.sourceId,unitId:'machine_hour',quantityRule:'EXCLUSIVE_FULFILLMENT_OF_SINGLE_EFFECTIVE_PHYSICAL_MACHINE',formulaId:prefix+':formula:'+m.id+'-'+(own?'own':'hired'),resolution:{kind:'ROW',rowId:prefix+':'+m.id+'-'+(own?'own':'hired')}}))),
  ...pack.gaps.map(g=>({expectedResourceId:pack.normId+':open:'+g.id,operationId:g.id,category:g.category,specification:g.nameRu,condition:'Требуется фактический источник единицы, количества и отдельной цены',sourceId:pack.sourceId,unitId:null,quantityRule:'SOURCE_REQUIRED_NOT_QUANTIFIED',formulaId:prefix+':formula:'+g.id,resolution:{kind:'ROW',rowId:prefix+':'+g.id}}))]};}
