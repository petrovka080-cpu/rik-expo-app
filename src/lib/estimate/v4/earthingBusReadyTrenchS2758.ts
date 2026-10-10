import pack from '../../../../data/estimate-benchmarks/source-packs/earthing-bus-ready-trench-krer33-04-015-01-s27-58.json';
import {buildAutomaticConstructionOwnerR1,compileAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,type AutomaticOwnerDefinition,type AutomaticParameterSpec,type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {effectivePurchaseBalanceExpressionsR1,effectiveResourceQuantityParameterId} from './effectivePurchaseBalanceR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';

export const earthingBusPackS2758=pack;
export const earthingBusPrefixS2758='earthing-bus:ready-trench';
const prefix=earthingBusPrefixS2758,length='earthing_bus_length_m';
const steelFacts=['project_earthing_steel_mass_t','project_earthing_steel_specification','project_earthing_steel_document_reference','project_bom_length_m'];
export function earthingBusReadyTrenchDefinitionS2758():AutomaticOwnerDefinition{
  const facts=pack.scopeFacts.map(f=>f.id);
  const conditional:AutomaticParameterSpec[]=[
    ...pack.scopeFacts.map(f=>({id:f.id,title:f.title,valueType:f.valueType as 'text'|'enum',unitId:null,kind:'conditional' as const,...(f.valueType==='enum'?{values:[f.value!]}:{})})),
    ...pack.machines.map(m=>({id:m.parameterId,title:m.parameterTitle,valueType:'enum' as const,unitId:null,kind:'conditional' as const,values:[m.ownValue,m.hiredValue]})),
    {id:steelFacts[0],title:'Общая масса стали по проекту',valueType:'decimal',unitId:'t',kind:'conditional',min:0.000000001},
    {id:steelFacts[1],title:'Сталь шин по проекту',valueType:'text',unitId:null,kind:'conditional'},
    {id:steelFacts[2],title:'Документ и позиция ведомости стали',valueType:'text',unitId:null,kind:'conditional'},
    {id:steelFacts[3],title:'Длина участка по ведомости стали',valueType:'decimal',unitId:'m',kind:'conditional',min:0.000000001,numericPeerConstraints:{equalToParameter:length}},
  ];
  const rows:AutomaticRowSpec[]=[];
  const add=(id:string,title:string,category:string,unitId:string,expression:string,extra:Partial<AutomaticRowSpec>={})=>rows.push({rowId:prefix+':'+id,formulaId:prefix+':formula:'+id,section:pack.titleRu,category,title,unitId,expression,procurement:false,inputParameterIds:facts,...extra});
  const positive=(unitId:string)=>({schemaVersion:'canonical_formula_output_bounds_v1' as const,unitId,exclusiveMinimum:0,reasonRu:'Для применимого ресурса требуется положительное подтверждённое количество.'});
  add('whole-labor','Труд рабочих по укладке и сварке шин, средний разряд2,9','labor','man_hour',`${length}*1.8/10`,{formulaOutputBounds:positive('man_hour')});
  for(const machine of pack.machines){
    const effective=effectiveResourceQuantityParameterId(prefix+':'+machine.id+'-consumed');
    add(machine.id+'-consumed','Нормативная работа: '+machine.nameRu,'equipment','machine_hour',`${length}*${machine.ratePer10M}/10`,{costTreatment:'INFORMATIONAL_SCOPE',formulaOutputBounds:positive('machine_hour'),effectiveQuantityOutput:{parameterId:effective,unitId:'machine_hour'}});
    for(const [mode,value,suffix] of [['own',machine.ownValue,' — собственный, эксплуатация'],['hired',machine.hiredValue,machine.id==='truck'?' — аренда с водителем':' — аренда с персоналом']] as const)
      add(machine.id+'-'+mode,machine.nameRu+suffix,'equipment','machine_hour',effective,{procurement:mode==='hired',inclusion:{kind:'equals',parameterId:machine.parameterId,value},formulaOutputBounds:positive('machine_hour')});
  }
  for(const m of pack.materials){
    conditional.push({id:m.id+'_supply_specification',title:'Поставка: '+m.nameRu,valueType:'text',unitId:null,kind:'conditional'},
      {id:m.id+'_stock_compatibility_reference',title:'Пригодность остатка: '+m.nameRu,valueType:'text',unitId:null,kind:'conditional',requiredWhen:{kind:'greater_than',parameterId:m.id+'_stock',value:0}});
    for(const [suffix,title,min] of [['stock','Пригодное наличие',0],['reserve','Сохраняемый резерв',0],['quantum','Кратность поставки',0.000000001]] as const)
      conditional.push({id:m.id+'_'+suffix,title:title+': '+m.nameRu,valueType:'decimal',unitId:m.orderUnitId,kind:'conditional',min});
    const physicalInputs=[...facts,...(m.projectDefined?steelFacts:[])],effective=effectiveResourceQuantityParameterId(prefix+':'+m.id+'-consumed');
    const consumed=m.sourceUnitId==='t'&&m.orderUnitId==='kg'?effective+'*1000':effective;
    if(m.sourceUnitId!==m.orderUnitId&&!(m.sourceUnitId==='t'&&m.orderUnitId==='kg'))throw Error('EARTHING_ORDER_UNIT_CONVERSION_NOT_ADMITTED');
    add(m.id+'-consumed',(m.projectDefined?'Проектный итог: ':'Нормативный расход: ')+m.nameRu,'material',m.sourceUnitId,m.projectDefined?steelFacts[0]:`${length}*${m.ratePer10M}/10`,{inputParameterIds:physicalInputs,costTreatment:'INFORMATIONAL_SCOPE',formulaOutputBounds:positive(m.sourceUnitId),effectiveQuantityOutput:{parameterId:effective,unitId:m.sourceUnitId},purchaseBalanceOwnerRowId:prefix+':'+m.id});
    const balance=effectivePurchaseBalanceExpressionsR1({ownerRowId:prefix+':'+m.id,orderUnitId:m.orderUnitId,consumed,stock:m.id+'_stock',reserve:m.id+'_reserve',quantum:m.id+'_quantum'});
    add(m.id,m.nameRu,'material',m.orderUnitId,`ceil(max(0,(${consumed})+${m.id}_reserve-${m.id}_stock)/${m.id}_quantum)*${m.id}_quantum`,{...balance.owner,procurement:true,inputParameterIds:[...physicalInputs,m.id+'_supply_specification',m.id+'_stock_compatibility_reference'],titleParameterIds:[m.id+'_supply_specification']});
  }
  for(const operation of pack.operations)add(operation.id,operation.nameRu,'work','m',length,{costTreatment:'INCLUDED_IN_RESOURCE_ROWS'});
  for(const gap of pack.gaps){const id='open_scope_qty_'+gap.id.replaceAll('-','_');conditional.push({id,title:gap.nameRu,valueType:'decimal',unitId:null,kind:'conditional',min:0});add(gap.id,gap.nameRu,gap.category,'',id);}
  const built=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:prefix,sourceId:pack.sourceId,normId:pack.normId,
    sourceMetadata:{source_title:pack.titleRu,source_document_version:pack.source.edition,definition_hash:pack.source.sha256,artifact_sha256:pack.source.sha256,exact_locator:pack.source.locatorRu},
    applicabilityRu:pack.scopeRu,ordinary:[{id:length,title:'Длина укладываемых шин заземления',valueType:'decimal',unitId:'m',kind:'ordinary',min:0.000000001}],profile:[],conditional,rows,deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:pack.excludedRu});
  return {...built,parameters:built.parameters.map(p=>{
    const id=p.parameter_id;
    if(id.startsWith('open_scope_qty_'))return {...p,truth_metadata:unresolvedApplicationNormTruthR1(p.truth_metadata,'Для дополнительной потребности нет подтверждённых единицы, количества и отдельной цены. Ручное0/1 не заменяет источник.')};
    if(p.truth_metadata.visibility_role==='INTERNAL_ONLY')return p;
    const guide=p.truth_metadata.guide as Record<string,unknown>,project=steelFacts.includes(id),material=pack.materials.find(m=>id.startsWith(m.id+'_')),machine=pack.machines.find(m=>m.parameterId===id);
    const guideRu=pack.scopeFacts.find(f=>f.id===id)?.guideRu??(project?pack.materials[1].identityGuideRu+(id===steelFacts[3]?' Длина ведомости должна совпадать с длиной выбранной работы; изменение длины требует соответствующей ведомости, общая масса автоматически не масштабируется.':''):
      machine?'Укажите фактическое обеспечение этой машины. Собственная эксплуатация и аренда взаимоисключающие; персонал включён в цену машины. Другой механизм выбирается независимо.':
      id.endsWith('_stock_compatibility_reference')?'Укажите документ соответствия точной поставочной позиции, единицы и пригодности имеющегося остатка. Чужой остаток не вычитается.':
      id.endsWith('_supply_specification')?material!.identityGuideRu+' Укажите отдельно поставляемую позицию; включённый в другую поставку материал не заказывайте повторно.':
      material?'Укажите фактическое наличие, сохраняемый резерв или кратность поставки в '+material.orderUnitId+'. Приложение рассчитывает расход, поставочных значений по умолчанию нет.':guide.guide_short_ru);
    return {...p,required:id===length||facts.includes(id)||project||id.endsWith('_supply_specification'),truth_metadata:{...p.truth_metadata,value_source_role:id===length?'USER_INPUT':id.endsWith('_stock_compatibility_reference')?'CONDITIONAL_PROJECT_FACT':'PROJECT_SPECIFIC_INPUT',source_confirmation_required:false,
      ...(p.constraints_json?.requiredWhen?{required_when:p.constraints_json.requiredWhen}:{}),provenance:{consumer_input_role_v1:id===length?'OBJECT_GEOMETRY':'OBJECT_FACT'},guide:{...guide,guide_short_ru:guideRu,verified_at:pack.verifiedAt,...(project?{source_role:'PROJECT_DOCUMENTATION',source_document:'Фактическая ведомость стали выбранного участка',source_locator:'Документ, редакция, лист и позиция ведомости',quantity_origin:'DOCUMENTED_PROJECT_TOTAL_NOT_PER_METRE_NORM'}:{})}}};
  }),resources:built.resources.map(r=>{
    const key=r.row_id.slice(prefix.length+1),material=pack.materials.find(m=>key===m.id||key===m.id+'-consumed'),machine=pack.machines.find(m=>key.startsWith(m.id+'-')),gap=pack.gaps.find(g=>key===g.id),operation=pack.operations.find(o=>key===o.id),project=material?.projectDefined===true,order=!!material&&key===material.id;
    const {row_sha256:_old,...body}=r;
    const updated={...body,cost_owner_id:operation?prefix+':whole-labor':r.cost_owner_id,resource_graph:{...r.resource_graph,
      ...(operation?{parentCostOwnerId:prefix+':whole-labor',includedInResourceOwnerRowId:prefix+':whole-labor'}:{}),
      ...(machine?{physicalNormOwnerRowId:prefix+':'+machine.id+'-consumed',operatorCostOwnership:machine.operatorCostOwnership}:{}),
      ...(project?{projectQuantityProvenanceV1:{contractVersion:'canonical-project-quantity-provenance/v1',quantityOrigin:'DOCUMENTED_PROJECT_TOTAL_NOT_OFFICIAL_NUMERIC_NORM',printedQuantityCell:'П',projectQuantityParameterId:steelFacts[0],projectSpecificationParameterId:steelFacts[1],projectDocumentReferenceParameterId:steelFacts[2],projectCoverageParameterId:steelFacts[3],normProvidesResourceIdentityAndUnitOnly:true}}:{}),
      operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:prefix,groupTitleRu:pack.titleRu,operationId:prefix+':operation:'+(gap?.id??machine?.id??'installation'),operationTitleRu:gap?.nameRu??machine?.nameRu??'Укладка и сварка шин заземления',processOrdinal:gap?40:10,completionCriterionRu:gap?'Подтверждены применимость, единица, количество и граница отдельной цены.':'Выполнена укладка и сварка по точной операции33-04-015-01.'},
      publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:r.title_ru,nameRu:r.title_ru,brandAndModelRu:null,specificationRu:material?.nameRu??null,detailsRu:gap?['Потребность не завершена: источник единицы, количества и отдельной цены отсутствует.']:[pack.scopeRu,
        ...(material?[material.identityGuideRu]:[]),...(machine?[machine.sourceLabelLimitRu,`${machine.ratePer10M} маш.-ч на10м; персонал включён в цену машины.`]:[]),...(operation?['Включено в общий труд1,8ч на10м; часы по подоперациям не разделены и повторно не оплачиваются.']:[])]}},
      source_metadata:{...r.source_metadata,normativeTrace:gap||project?[]:((r.source_metadata?.normativeTrace??[]) as Record<string,unknown>[]).map(t=>({...t,sourceRole:'OFFICIAL_NORM'})),sourceRole:gap?'UNRESOLVED_INSTALLATION_SOURCE':order?'DERIVED_PURCHASE_BALANCE':project?'DOCUMENTED_PROJECT_QUANTITY':'OFFICIAL_NORM',
        ...(project?{quantityOrigin:'DOCUMENTED_PROJECT_TOTAL_NOT_OFFICIAL_NUMERIC_NORM',sourceNormQuantityAccepted:false,printedQuantityCell:'П',projectQuantityParameterId:steelFacts[0],projectSpecificationParameterId:steelFacts[1],projectDocumentReferenceParameterId:steelFacts[2],compositionSourceTrace:[{sourceId:pack.sourceId,normId:pack.normId,sourceRole:'OFFICIAL_RESOURCE_IDENTITY_AND_UNIT_ONLY',exactLocator:pack.source.locatorRu,artifactSha256:pack.source.sha256}]}:{}),
        sourceCode:machine?.sourceCode??null,official_url:pack.source.officialUrl,source_artifact_sha256:pack.source.sha256,exact_locator:pack.source.locatorRu,exact_column:pack.normId,sourceMeasure:'TEN_LINEAR_METRES_OF_EARTHING_BUS',
        ...(machine?{machineOperatorPriceOwnershipSource:pack.guidance}:{}),quantityUnitUnconfirmed:!!gap,noSeparateOperatorAggregateInSource:true,full_technical_acceptance:false,sourceAdmission:pack.sourceAdmission}};
    return {...updated,row_sha256:estimateDeterministicHash(updated)};
  })};
}
export function compileEarthingBusReadyTrenchS2758(input:Record<string,unknown>){return compileAutomaticConstructionOwnerR1({catalogId:pack.catalogId,compilerVersion:pack.contract,primaryMeasureParameterId:length,definition:earthingBusReadyTrenchDefinitionS2758(),submittedParameters:input});}
export function earthingBusCompletenessMapS2758(){return {contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'NORMATIVE_OPERATION_MAP',generatedFromCurrentRows:false,evidenceSha256:pack.source.sha256,evidenceReferences:[pack.source.officialUrl,pack.source.locatorRu],entries:[
  ...[{id:'whole-labor',category:'labor',unit:'man_hour',spec:'Труд всей операции1,8ч на10м, разряд2,9'},{id:'welder-consumed',category:'equipment',unit:'machine_hour',spec:'Передвижной дизельный сварочный агрегат04-0027;0,5маш.-ч на10м'},{id:'truck-consumed',category:'equipment',unit:'machine_hour',spec:'Бортовой автомобиль до5т;0,1маш.-ч на10м'},{id:'electrodes-consumed',category:'material',unit:'t',spec:'Электроды Э42 диаметром4мм;0,00012т на10м'},{id:'steel-consumed',category:'material',unit:'t',spec:'Сталь диаметром до10мм; фактический общий итог проекта, ячейкаП'}].map(x=>({expectedResourceId:pack.normId+':'+x.id,operationId:'installation',category:x.category,specification:x.spec,condition:pack.scopeRu,sourceId:pack.sourceId,unitId:x.unit,quantityRule:x.id==='steel-consumed'?'DOCUMENTED_PROJECT_TOTAL_DIRECT':'EXACT_OFFICIAL_RATE_PER_10_M',formulaId:prefix+':formula:'+x.id,resolution:{kind:'ROW',rowId:prefix+':'+x.id}})),
  ...pack.operations.map(o=>({expectedResourceId:pack.normId+':operation:'+o.id,operationId:'installation',category:'work',specification:o.nameRu,condition:pack.scopeRu,sourceId:pack.sourceId,unitId:'m',quantityRule:'INCLUDED_OPERATION_NO_ARBITRARY_LABOR_SPLIT',formulaId:prefix+':formula:'+o.id,resolution:{kind:'INCLUDED_COMPONENT_ROW',rowId:prefix+':'+o.id,parentRowId:prefix+':whole-labor'}})),
  ...pack.machines.flatMap(m=>[true,false].map(own=>({expectedResourceId:pack.normId+':'+m.id+'-fulfillment:'+own,operationId:m.id,category:'equipment',specification:m.nameRu,condition:own?m.ownValue:m.hiredValue,sourceId:pack.sourceId,unitId:'machine_hour',quantityRule:'EXCLUSIVE_FULFILLMENT_OF_SINGLE_EFFECTIVE_PHYSICAL_MACHINE',formulaId:prefix+':formula:'+m.id+'-'+(own?'own':'hired'),resolution:{kind:'ROW',rowId:prefix+':'+m.id+'-'+(own?'own':'hired')}}))),
  ...pack.gaps.map(g=>({expectedResourceId:pack.normId+':open:'+g.id,operationId:g.id,category:g.category,specification:g.nameRu,condition:'Требуется фактический источник единицы, количества и отдельной цены',sourceId:pack.sourceId,unitId:null,quantityRule:'SOURCE_REQUIRED_NOT_QUANTIFIED',formulaId:prefix+':formula:'+g.id,resolution:{kind:'ROW',rowId:prefix+':'+g.id}}))]};}
