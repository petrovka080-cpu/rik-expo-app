import pack from '../../../../data/estimate-benchmarks/source-packs/precast-rc-embankment-runoff-tray-s27-58.json';
import {buildAutomaticConstructionOwnerR1,compileAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,
  type AutomaticOwnerDefinition,type AutomaticParameterSpec,type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {effectivePurchaseBalanceExpressionsR1} from './effectivePurchaseBalanceR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';

export const precastRcTrayPackS2758=pack;
export const precastRcTrayPrefixS2758='precast-rc-embankment-runoff-tray';
export const ownTrayMachinesS2758='Собственные механизмы; машинист и водитель учтены в ставке машины';
export const hiredTrayMachinesS2758='Аренда механизмов; машинист и водитель учтены в ставке машины';
const prefix=precastRcTrayPrefixS2758;
const facts=['construction_scope_conditions','tray_route_project_reference'];
const materials=pack.resources.filter(r=>r.category==='material');

export function precastRcTrayDefinitionS2758():AutomaticOwnerDefinition {
  const conditional:AutomaticParameterSpec[]=[
    {id:facts[0],title:'Условия строительства сборного лотка',valueType:'enum',unitId:null,kind:'conditional',values:[pack.scopeValue]},
    {id:facts[1],title:'Проект линии лотка на откосе и состава работ',valueType:'text',unitId:null,kind:'conditional'},
    {id:'mechanism_fulfillment',title:'Свои механизмы или аренда с машинистами',valueType:'enum',unitId:null,kind:'conditional',values:[ownTrayMachinesS2758,hiredTrayMachinesS2758]},
  ];
  const rows:AutomaticRowSpec[]=[];
  const add=(id:string,title:string,category:string,unitId:string,expression:string,extra:Partial<AutomaticRowSpec>={})=>rows.push({
    rowId:prefix+':'+id,formulaId:prefix+':formula:'+id,section:pack.titleRu,category,title,unitId,expression,
    procurement:false,inputParameterIds:facts,...extra});
  for(const resource of pack.resources){
    const consumed='length_m*'+resource.ratePer100M+'/100';
    if(resource.category==='material'){
      conditional.push(
        {id:resource.id+'_supply_specification',title:'Поставочная спецификация: '+resource.nameRu,valueType:'text',unitId:null,kind:'conditional'},
        {id:resource.id+'_supply_unit',title:'Единица заказа у поставщика: '+resource.nameRu,valueType:'enum',unitId:null,kind:'conditional',values:[pack.unitValue]},
        {id:resource.id+'_stock_compatibility_reference',title:'Пригодность имеющегося материала: '+resource.nameRu,valueType:'text',unitId:null,kind:'conditional',requiredWhen:{kind:'greater_than',parameterId:resource.id+'_stock',value:0}});
      for(const [suffix,title,min] of [['stock','Пригодное наличие',0],['reserve','Сохраняемый резерв',0],['quantum','Кратность поставки',0.000000001]] as const)
        conditional.push({id:resource.id+'_'+suffix,title:title+': '+resource.nameRu,valueType:'decimal',unitId:'m3',kind:'conditional',min});
      const balance=effectivePurchaseBalanceExpressionsR1({ownerRowId:prefix+':'+resource.id,orderUnitId:'m3',consumed,
        stock:resource.id+'_stock',reserve:resource.id+'_reserve',quantum:resource.id+'_quantum'});
      add(resource.id,resource.nameRu,'material','m3',`ceil(max(0,(${consumed})+${resource.id}_reserve-${resource.id}_stock)/${resource.id}_quantum)*${resource.id}_quantum`,
        {...balance.owner,procurement:true,inputParameterIds:[...facts,resource.id+'_supply_specification',resource.id+'_supply_unit',resource.id+'_stock_compatibility_reference'],titleParameterIds:[resource.id+'_supply_specification']});
      add(resource.id+'-consumed','Нормативный расход: '+resource.nameRu,'material','m3',consumed,
        {costTreatment:'INFORMATIONAL_SCOPE',purchaseBalanceOwnerRowId:prefix+':'+resource.id});
    }else if(resource.category==='equipment'||resource.id==='operator'){
      for(const [suffix,value] of [['own',ownTrayMachinesS2758],['hired',hiredTrayMachinesS2758]] as const)
        add(resource.id+'-'+suffix,resource.nameRu+(resource.category==='equipment'&&suffix==='hired'?' — аренда':''),resource.category,resource.unitId,consumed,
          {procurement:resource.category==='equipment'&&suffix==='hired',inclusion:{kind:'equals',parameterId:'mechanism_fulfillment',value},
            ...(resource.id==='operator'?{costTreatment:'INFORMATIONAL_SCOPE'}:{})});
    }else add(resource.id,resource.nameRu,resource.category,resource.unitId,consumed);
  }
  for(const operation of pack.operations)add(operation.id,operation.nameRu,'work','m','length_m',{costTreatment:'INCLUDED_IN_RESOURCE_ROWS'});
  for(const gap of pack.gaps){const id='open_scope_qty_'+gap.id;
    conditional.push({id,title:gap.nameRu,valueType:'decimal',unitId:'pcs',kind:'conditional',min:0});
    add(gap.id,gap.nameRu,'service','pcs',id);
  }
  const original=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:prefix,sourceId:pack.sourceId,normId:pack.normId,
    sourceMetadata:{source_title:'КРЕР27-2015, сборный лоток на откосе насыпи',source_document_version:pack.source.edition,
      definition_hash:pack.source.sha256,artifact_sha256:pack.source.sha256,exact_locator:pack.source.locatorRu},
    applicabilityRu:pack.scopeRu,ordinary:[{id:'length_m',title:'Длина линии сборного лотка по проекту',valueType:'decimal',unitId:'m',kind:'ordinary',min:0.000001}],
    profile:[],conditional,rows,deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:pack.excludedRu});
  return {...original,parameters:original.parameters.map(p=>{
    const required=facts.includes(p.parameter_id)||materials.some(m=>p.parameter_id===m.id+'_supply_specification'||p.parameter_id===m.id+'_supply_unit');
    const condition=p.constraints_json?.requiredWhen;
    const guide=p.truth_metadata.guide as Record<string,unknown>;
    const supplyUnit=p.parameter_id.endsWith('_supply_unit');
    const guideText=p.parameter_id===facts[1]?'Укажите фактический чертёж или спецификацию линии на откосе: ручная траншея, щебёночная подготовка и установка ЖБ элементов. Монтаж по уже готовой траншее и подготовке — другой состав работ.':
      supplyUnit?'Выберите только фактически подтверждённую поставку в м³. Если изделие продаётся поштучно, заказ остаётся нерассчитанным до подтверждения совместимой поставочной единицы; объём одного элемента и перевод в штуки не придуманы.':
      p.parameter_id==='precast_rc_supply_specification'?'Укажите проектное обозначение, геометрию, разновидность и марку сборного ЖБ элемента, документ проекта и фактическую спецификацию поставщика. Нормативное количество 4,62 м³ на 100 м рассчитывает приложение.':
      p.parameter_id==='mortar_supply_specification'?'Укажите фактически поставляемый готовый тяжёлый отделочный цементный раствор 1:3. Кладочный М100, сухая смесь и цементно-известковый раствор имеют другой состав.':
      p.parameter_id==='crushed_stone_supply_specification'?'Укажите фактически поставляемый щебень из природного камня фракции 20–40 мм, марки 400 и документ поставщика.':
      p.parameter_id.endsWith('_stock_compatibility_reference')?'При положительном наличии укажите документ или результат проверки пригодности и соответствия выбранной поставочной позиции. Чужой товар и непригодный остаток не вычитаются.':
      p.parameter_id==='mechanism_fulfillment'?'Выберите фактический способ обеспечения. Собственные машины имеют стоимость эксплуатации. Ставки учитывают машинистов и водителя; второй оплаты нет.':guide.guide_short_ru;
    return {...p,required:p.required||required,truth_metadata:p.parameter_id.startsWith('open_scope_qty_')?
      unresolvedApplicationNormTruthR1(p.truth_metadata,'В источнике не установлены дополнительный состав, количество и владелец цены. Потребность остаётся открытой.'):
      {...p.truth_metadata,...(required?{value_source_role:'PROJECT_SPECIFIC_INPUT'}:{}),source_confirmation_required:false,...(condition?{required_when:condition}:{}),
        provenance:{consumer_input_role_v1:'OBJECT_FACT'},guide:{...guide,guide_short_ru:guideText}}};
  }),resources:original.resources.map(r=>{
    const key=r.row_id.slice(prefix.length+1),sourceKey=key.replace(/-(?:consumed|own|hired)$/u,''),norm=pack.resources.find(x=>x.id===sourceKey),gap=pack.gaps.find(x=>x.id===key);
    const included=r.resource_graph.costTreatment==='INCLUDED_IN_RESOURCE_ROWS',parent=prefix+':labor';
    const group=gap?gap.nameRu:norm?.category==='equipment'||sourceKey==='operator'?'Механизмы и включённые перемещения':key==='trench'?'Ручная траншея':key==='crushed_stone'||key==='crushed_stone-consumed'||key==='bedding'?'Щебёночная подготовка':'Установка элементов и стыки';
    const operationId=gap?gap.id:norm?.category==='equipment'||sourceKey==='operator'?'handling':key==='trench'?'trench':key==='crushed_stone'||key==='crushed_stone-consumed'||key==='bedding'?'bedding':'setting';
    const {row_sha256:_hash,...body}=r;
    const updated={...body,cost_owner_id:included?parent:r.cost_owner_id,resource_graph:{...r.resource_graph,
      ...(included?{parentCostOwnerId:parent,includedInResourceOwnerRowId:parent}:{}),
      operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:prefix,groupTitleRu:pack.titleRu,
        operationId:prefix+':operation:'+operationId,operationTitleRu:group,processOrdinal:gap?50:norm?.category==='equipment'?10:20,
        completionCriterionRu:gap?'Подтверждены применимость, количество и владелец цены.':'Выполнена операция выбранной колонки КРЕР27-02-004-01.'},
      publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:r.title_ru,nameRu:r.title_ru,
        brandAndModelRu:null,specificationRu:norm?.nameRu??null,detailsRu:gap?[gap.reasonRu,'Количество и включение в цену пока не установлены.']:
          [pack.scopeRu,pack.includedTransportRu,...(norm?[`${pack.normId}: ${norm.ratePer100M} ${norm.unitId} на 100 м.`]:[]),
            ...(sourceKey==='operator'?['Суммарный нормативный труд машинистов учтён в стоимости механизмов; самостоятельной оплаты нет.']:[]),
            ...(key.endsWith('-consumed')?['Нормативный расход; отдельной оплаты и повторного заказа нет.']:[])]}},
      source_metadata:{...r.source_metadata,sourceRole:gap?'UNRESOLVED_INSTALLATION_SOURCE':norm?.category==='material'&&!key.endsWith('-consumed')?'DERIVED_PURCHASE_BALANCE':'OFFICIAL_NORM',
        normativeTrace:gap?[]:((r.source_metadata?.normativeTrace??[]) as Record<string,unknown>[]).map(t=>({...t,sourceRole:'OFFICIAL_NORM'})),
        source_artifact_sha256:pack.source.sha256,official_url:pack.source.officialUrl,exact_locator:norm?.sourceLocator??pack.source.locatorRu,
        external_resource_code:norm?.resourceCode??null,exact_column:pack.normId,trafficHalfRoadCoefficientNotApplicable:true,
        ...(sourceKey==='operator'?{operatorCostOwnership:'INCLUDED_IN_MACHINE_PRICES_NO_SINGLE_PARENT',operatorTotalNotAllocatedToOneMachine:true}:{}),
        full_technical_acceptance:false,sourceAdmissionAmendmentSha256:pack.sourceAdmission.amendmentSha256}};
    return {...updated,row_sha256:estimateDeterministicHash(updated)};
  })};
}

export function compilePrecastRcTrayS2758(input:Record<string,unknown>){return compileAutomaticConstructionOwnerR1({
  catalogId:pack.catalogId,compilerVersion:pack.contract,primaryMeasureParameterId:'length_m',definition:precastRcTrayDefinitionS2758(),submittedParameters:input});}

/** Expectations come from the printed source inventory and composition, separately from generated rows. */
export function precastRcTrayCompletenessMapS2758(){return {contract:'rik-expo-app.s26-3.independent-completeness-map.v1',
  sourceKind:'NORMATIVE_OPERATION_MAP',generatedFromCurrentRows:false,evidenceSha256:pack.source.sha256,
  evidenceReferences:[pack.source.officialUrl,pack.source.locatorRu,pack.guidance.officialUrl,pack.guidance.locatorRu],
  entries:pack.resources.flatMap(r=>(r.category==='equipment'||r.id==='operator'?['own','hired']:['']).map(suffix=>{
    const id=r.id+(suffix?'-'+suffix:r.category==='material'?'-consumed':'');return {expectedResourceId:pack.normId+':source:'+id,
      operationId:r.category==='equipment'||r.id==='operator'?'handling':'installation',category:r.category,specification:r.nameRu,
      condition:pack.scopeValue+(suffix?'; '+(suffix==='own'?ownTrayMachinesS2758:hiredTrayMachinesS2758):''),sourceId:pack.sourceId,
      unitId:r.unitId,quantityRule:'EXACT_OFFICIAL_RATE_PER_100_M',formulaId:prefix+':formula:'+id,
      resolution:{kind:'ROW',rowId:prefix+':'+id}};}))};}
