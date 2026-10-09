import pack from '../../../../data/estimate-benchmarks/source-packs/paving-tile-prepared-base-s27-54.json';
import {buildAutomaticConstructionOwnerR1,compileAutomaticConstructionOwnerR1,type AutomaticOwnerDefinition,
  type AutomaticParameterSpec,type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {effectivePurchaseBalanceExpressionsR1} from './effectivePurchaseBalanceR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
export const pavingTileSourcePackS2754=pack;
export const ownPavingMachinesS2754='Собственные механизмы; ставки включают машинистов, материалы отдельно';
export const hiredPavingMachinesS2754='Аренда с машинистами; ставки не включают отдельно учтённые материалы';
const area='paving_area_m2',prefixFor=(index:number)=>'paving-tile:'+pack.types[index].key;
const specs:Record<string,{id:string;title:string}>={
 tile:{id:'tile_specification',title:'Тротуарная плитка: марка, формат, толщина, материал и свойства по проекту; совместимость с раскладкой и виброуплотнением'},
 sand:{id:'sand_specification',title:'Природный строительный песок: состав и пригодность для швов выбранной плитки'},
 water:{id:'water_supply_specification',title:'Фактический источник и пригодность воды для выбранного покрытия'},
};
export function pavingTileDefinitionS2754(index:number):AutomaticOwnerDefinition{
 const type=pack.types[index];if(!type)throw new Error('PAVING_TILE_EXACT_THREE_COLUMNS_ONLY');
 const prefix=prefixFor(index),facts=['prepared_base','no_cut_layout','traffic_condition','water_transport_km'];
 const conditional:AutomaticParameterSpec[]=[
  {id:'prepared_base',title:'Готовность и принятие основания',valueType:'enum',unitId:null,kind:'conditional',values:[pack.preparedBaseValue]},
  {id:'no_cut_layout',title:'Раскладка без резки для выбранной плотности плиток',valueType:'enum',unitId:null,kind:'conditional',values:[pack.noCutValue]},
  {id:'traffic_condition',title:'Условия движения рядом с рабочим участком',valueType:'enum',unitId:null,kind:'conditional',values:[pack.trafficValue]},
  {id:'water_transport_km',title:'Фактическое расстояние доставки воды; эта норма включает до5км',valueType:'decimal',unitId:'km',kind:'conditional',min:0,max:5},
  {id:'mechanism_fulfillment',title:'Обеспечение нормативными механизмами',valueType:'enum',unitId:null,kind:'conditional',values:[ownPavingMachinesS2754,hiredPavingMachinesS2754]},
  ...Object.values(specs).map(spec=>({id:spec.id,title:spec.title,valueType:'text' as const,unitId:null,kind:'conditional' as const})),
 ];
 const rows:AutomaticRowSpec[]=[];
 const add=(id:string,title:string,category:string,unitId:string,expression:string,extra:Partial<AutomaticRowSpec>={})=>rows.push({
  rowId:prefix+':'+id,formulaId:prefix+':formula:'+id,section:type.titleRu,category,title,unitId,expression,procurement:false,inputParameterIds:facts,...extra});
 for(const resource of pack.resourceTable){
  const rate=resource.id==='labor'?type.laborRatePer10M2:resource.ratePer10M2;if(rate==null)throw new Error('PAVING_TILE_RATE_MISSING:'+resource.id);
  const consumed=`${area}*${rate}/10`;
  if(resource.category==='material'){
   for(const [suffix,title,min] of [['stock','Пригодное наличие',0],['reserve','Сохраняемый резерв',0],['quantum','Подтверждённая кратность поставки',0.000000001]] as const)
    conditional.push({id:resource.id+'_'+suffix,title:title+': '+resource.nameRu,valueType:'decimal',unitId:resource.unitId,kind:'conditional',min});
   const balance=effectivePurchaseBalanceExpressionsR1({ownerRowId:prefix+':'+resource.id,orderUnitId:resource.unitId,consumed,
    stock:resource.id+'_stock',reserve:resource.id+'_reserve',quantum:resource.id+'_quantum'});
   add(resource.id,resource.nameRu,'material',resource.unitId,
    `ceil(max(0,(${consumed})+${resource.id}_reserve-${resource.id}_stock)/${resource.id}_quantum)*${resource.id}_quantum`,
    {procurement:true,...balance.owner,inputParameterIds:[...facts,specs[resource.id].id],titleParameterIds:[specs[resource.id].id]});
   add(resource.id+'-consumed','Нормативный расход: '+resource.nameRu,'material',resource.unitId,consumed,
    {costTreatment:'INFORMATIONAL_SCOPE',purchaseBalanceOwnerRowId:prefix+':'+resource.id});
  }else if(resource.category==='equipment'){
   for(const [suffix,value,procurement] of [['own',ownPavingMachinesS2754,false],['hired',hiredPavingMachinesS2754,true]] as const)
    add(resource.id+'-'+suffix,resource.nameRu+(procurement?' — аренда с машинистом':''),resource.category,resource.unitId,consumed,
     {procurement,inclusion:{kind:'equals',parameterId:'mechanism_fulfillment',value}});
  }else add(resource.id,resource.id==='labor'?resource.nameRu+', средний разряд '+type.laborGrade:resource.nameRu,resource.category,resource.unitId,consumed,
   resource.id==='operator'?{costTreatment:'INFORMATIONAL_SCOPE',inputParameterIds:[...facts,'mechanism_fulfillment']}:{});
 }
 for(const [id,title] of [['laying-operation','Укладка плитки с пригонкой и проверкой уровня — в общем нормативном труде'],
  ['joints-operation','Заполнение швов песком — в общем нормативном труде'],['compaction-operation','Виброуплотнение до заполнения швов — в общем нормативном труде'],
  ['wetting-cleaning-operation','Увлажнение и очистка поверхности — в общем нормативном труде']])
   add(id,title,'work','m2',area,{costTreatment:'INCLUDED_IN_RESOURCE_ROWS'});
 for(const gap of pack.sourceNeeds){const id='open_scope_qty_'+gap.id.replaceAll('-','_');
  conditional.push({id,title:gap.nameRu,valueType:'decimal',unitId:gap.unitId,kind:'conditional',min:0});add(gap.id,gap.nameRu,gap.category,gap.unitId,id);}
 const requiredFacts=new Set([...facts,...Object.values(specs).map(spec=>spec.id),'mechanism_fulfillment']);
 const built=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:prefix,sourceId:pack.sourceId,normId:type.column,
  sourceMetadata:{source_title:'КРЕР27-2015: покрытия из тротуарной плитки',source_document_version:pack.source.edition,
   definition_hash:pack.source.sha256,artifact_sha256:pack.source.sha256,exact_locator:pack.source.locatorRu},
  applicabilityRu:pack.scopeRu+' Плотность '+type.density+'шт./м².',ordinary:[{id:area,title:'Площадь покрытия из тротуарной плитки',valueType:'decimal',unitId:'m2',kind:'ordinary',min:0.000001}],
  profile:[],conditional,rows,deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:pack.excludedRu});
 return {...built,parameters:built.parameters.map(parameter=>({...parameter,required:parameter.required||requiredFacts.has(parameter.parameter_id),
  truth_metadata:parameter.parameter_id.startsWith('open_scope_qty_')?{...parameter.truth_metadata,visibility_role:'INTERNAL_ONLY',value_source_role:'UNRESOLVED_APPLICATION_NORM',
   provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL'},unresolved_norm_reason:'Дополнительная применимость, состав и владелец цены не подтверждены этой нормой.'}:
   {...parameter.truth_metadata,source_confirmation_required:false}})),
  resources:built.resources.map(resource=>{
   const key=resource.row_id.slice(prefix.length+1),norm=pack.resourceTable.find(r=>r.id===key.replace(/-(consumed|own|hired)$/u,'')),gap=pack.sourceNeeds.find(r=>r.id===key);
   const operation=gap?.operation??norm?.operation??key.replace('-operation',''),included=resource.resource_graph.costTreatment==='INCLUDED_IN_RESOURCE_ROWS',parent=prefix+':labor';
   const titles:Record<string,string>={laying:'Укладка на готовом основании',joints:'Заполнение швов песком',compaction:'Виброуплотнение плитки',
    'wetting-cleaning':'Увлажнение и очистка поверхности',mechanisms:'Нормативные механизмы',protection:'Защита зоны работ',equipment:'Дополнительное оснащение',completion:'Дополнительная приёмка и обращение с отходами'};
   const {row_sha256:_old,...content}=resource;
   const result={...content,cost_owner_id:included?parent:resource.cost_owner_id,resource_graph:{...resource.resource_graph,
    ...(included?{parentCostOwnerId:parent,includedInResourceOwnerRowId:parent}:{}),
    operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:prefix,groupTitleRu:type.titleRu,
     operationId:prefix+':'+operation,operationTitleRu:titles[operation],processOrdinal:gap?50:operation==='mechanisms'?10:20,
     completionCriterionRu:gap?'Применимость, состав и цена подтверждены.':'Выбранное покрытие уложено и очищено в границах исходной колонки.'},
    publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:resource.title_ru,nameRu:resource.title_ru,
     brandAndModelRu:null,specificationRu:norm&&'characteristicsRu' in norm?norm.characteristicsRu:null,
     detailsRu:gap?[gap.reasonRu]:[`Применение: ${norm?.applicationRu??pack.scopeRu}`,
      ...(key.endsWith('-consumed')?['Нормативный расход; повторная оплата и заказ исключены.']:[]),
      ...(norm?.id==='tile'?['Плотность по выбранной колонке: '+type.density+'шт./м². Исходный расход уже включает10,2м² на10м².']:[]),
      ...(norm?.id==='operator'?['Машинисты включены в подтверждённые ставки механизмов. Общие0,06чел.-ч на10м² между машинами не распределяются.']:[])]}},
    source_metadata:{...resource.source_metadata,sourceRole:gap?'UNRESOLVED_INSTALLATION_SOURCE':norm?.category==='material'&&!key.endsWith('-consumed')?'DERIVED_PURCHASE_BALANCE':'OFFICIAL_NORM',
     normativeTrace:gap?[]:((resource.source_metadata?.normativeTrace??[]) as Record<string,unknown>[]).map(trace=>({...trace,sourceRole:'OFFICIAL_NORM'})),
     ...(norm?.id==='operator'?{aggregateOperatorHoursOnly:true,operatorDistributionNotEstablished:true,
      machineRateOwnerRowIds:['forklift','plate','water-truck','truck'].flatMap(id=>['own','hired'].map(suffix=>prefix+':'+id+'-'+suffix))}:{}),
     source_artifact_sha256:pack.source.sha256,official_url:pack.source.officialUrl,exact_column:type.column,full_technical_acceptance:false}};
   return {...result,row_sha256:estimateDeterministicHash(result)};
  })};
}
export function compilePavingTileS2754(index:number,input:Record<string,unknown>){return compileAutomaticConstructionOwnerR1({
 catalogId:pack.types[index].catalogId,compilerVersion:pack.contract,primaryMeasureParameterId:area,definition:pavingTileDefinitionS2754(index),submittedParameters:input});}
export function pavingTileCompletenessMapS2754(index:number){
 const prefix=prefixFor(index),type=pack.types[index];
 const expectations=pack.resourceTable.flatMap(resource=>resource.category==='equipment'?['own','hired'].map(suffix=>({...resource,
  id:resource.id+'-'+suffix,condition:suffix==='own'?ownPavingMachinesS2754:hiredPavingMachinesS2754})):
  [{...resource,id:resource.id+(resource.category==='material'?'-consumed':''),condition:'EXACT_DENSITY_PREPARED_BASE_NO_CUT_NORMAL_TRAFFIC_WATER_MAX_5KM'}]);
 return {contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'NORMATIVE_OPERATION_MAP',generatedFromCurrentRows:false,
  evidenceSha256:pack.source.sha256,evidenceReferences:[pack.source.officialUrl,pack.source.locatorRu],
  entries:[...expectations.map(resource=>({expectedResourceId:'norm:'+(resource.id==='labor'?type.laborCode:resource.resourceCode)+':'+resource.id,
   operationId:resource.operation,category:resource.category,specification:resource.nameRu,condition:resource.condition,sourceId:pack.sourceId,
   unitId:resource.unitId,quantityRule:'EXACT_OFFICIAL_RATE_PER_10_M2',formulaId:prefix+':formula:'+resource.id,
   resolution:{kind:'ROW',rowId:prefix+':'+resource.id}})),
   ...['laying','joints','compaction','wetting-cleaning'].map(operation=>({expectedResourceId:'printed-operation:'+operation,
    operationId:operation,category:'work',specification:'Операция исходного состава27-07-005; в общем нормативном труде',
    condition:'EXACT_DENSITY_PREPARED_BASE_NO_CUT_NORMAL_TRAFFIC_WATER_MAX_5KM',sourceId:pack.sourceId,unitId:'m2',
    quantityRule:'INSTALLED_AREA_INCLUDED_IN_NORMATIVE_LABOR',formulaId:prefix+':formula:'+operation+'-operation',
    resolution:{kind:'INCLUDED_COMPONENT_ROW',rowId:prefix+':'+operation+'-operation',parentRowId:prefix+':labor'}}))]};
}
