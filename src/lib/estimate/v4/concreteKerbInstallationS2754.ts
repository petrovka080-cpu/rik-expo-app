import pack from '../../../../data/estimate-benchmarks/source-packs/concrete-kerb-installation-s27-54.json';
import {
  buildAutomaticConstructionOwnerR1, compileAutomaticConstructionOwnerR1,
  type AutomaticOwnerDefinition, type AutomaticParameterSpec, type AutomaticRowSpec,
} from './automaticConstructionOwnerR1';
import {effectivePurchaseBalanceExpressionsR1} from './effectivePurchaseBalanceR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';

export const concreteKerbSourcePackS2754 = pack;
export const ownKerbMachinesS2754 = 'Собственные механизмы; ставка учитывает машиниста';
export const hiredKerbMachinesS2754 = 'Аренда механизмов с машинистами; единая ставка за машино-час';
const area = 'kerb_length_m';
const prefixFor = (index: number) => 'concrete-kerb:' + pack.types[index].key;
const materialSpecs: Record<string, {id: string; title: string}> = {
  stone: {id:'kerb_stone_specification', title:'Бетонный борт: марка, размеры, исполнение и характеристики бетона по спецификации'},
  concrete: {id:'concrete_mix_specification', title:'БетонВ15 (М200): подвижность, морозостойкость и водонепроницаемость по проекту'},
  timber: {id:'formwork_timber_specification', title:'Хвойные брусья IV сорта: поставочные ширина, толщина100/125мм и длина4–6,5м'},
  nails: {id:'formwork_nails_specification', title:'Строительные гвозди: диаметр и длина по узлу опалубки'},
};

export function concreteKerbDefinitionS2754(index: number): AutomaticOwnerDefinition {
  const type = pack.types[index];
  if (!type) throw new Error('CONCRETE_KERB_EXACT_TWO_COLUMNS_ONLY');
  const prefix = prefixFor(index);
  const facts = ['covering_kind', 'prepared_installation_line'];
  const conditional: AutomaticParameterSpec[] = [
    {id:'covering_kind', title:'Подтверждённый вид покрытия возле борта', valueType:'enum', unitId:null, kind:'conditional', values:[type.coveringValue]},
    {id:'prepared_installation_line', title:'Готовность линии установки и земляного основания', valueType:'enum', unitId:null, kind:'conditional', values:[pack.preparedLineValue]},
    {id:'mechanism_fulfillment', title:'Обеспечение нормативными механизмами', valueType:'enum', unitId:null, kind:'conditional', values:[ownKerbMachinesS2754,hiredKerbMachinesS2754]},
    ...Object.values(materialSpecs).map(spec => ({id:spec.id, title:spec.title, valueType:'text' as const, unitId:null, kind:'conditional' as const})),
  ];
  const rows: AutomaticRowSpec[] = [];
  const add = (id:string, title:string, category:string, unitId:string, expression:string, extra:Partial<AutomaticRowSpec>={}) => rows.push({
    rowId:prefix+':'+id, formulaId:prefix+':formula:'+id, section:type.titleRu,
    category, title, unitId, expression, procurement:false, inputParameterIds:facts, ...extra,
  });
  for (const resource of pack.resourceTable) {
    const rate = resource.id === 'concrete' ? type.concreteRateM3Per100M : resource.ratePer100M;
    if (rate == null) throw new Error('CONCRETE_KERB_RATE_MISSING:' + resource.id);
    const consumed = `${area}*${rate}/100`;
    if (resource.category === 'material') {
      for (const [suffix,title,min] of [['stock','Пригодное наличие',0],['reserve','Сохраняемый резерв',0],['quantum','Подтверждённая кратность поставки',0.000000001]] as const) {
        conditional.push({id:resource.id+'_'+suffix, title:title+': '+resource.nameRu, valueType:'decimal', unitId:resource.unitId, kind:'conditional', min});
      }
      const balance = effectivePurchaseBalanceExpressionsR1({ownerRowId:prefix+':'+resource.id, orderUnitId:resource.unitId,
        consumed, stock:resource.id+'_stock', reserve:resource.id+'_reserve', quantum:resource.id+'_quantum'});
      const spec = materialSpecs[resource.id];
      add(resource.id, resource.nameRu, 'material', resource.unitId,
        `ceil(max(0,(${consumed})+${resource.id}_reserve-${resource.id}_stock)/${resource.id}_quantum)*${resource.id}_quantum`,
        {procurement:true, ...balance.owner, inputParameterIds:[...facts,...(spec?[spec.id]:[])], ...(spec?{titleParameterIds:[spec.id]}:{})});
      add(resource.id+'-consumed', 'Нормативный расход: '+resource.nameRu, 'material', resource.unitId, consumed,
        {costTreatment:'INFORMATIONAL_SCOPE',purchaseBalanceOwnerRowId:prefix+':'+resource.id});
    } else if (resource.category === 'equipment' || resource.id === 'operator') {
      for (const [suffix, fulfillment, procurement] of [['own',ownKerbMachinesS2754,false],['hired',hiredKerbMachinesS2754,true]] as const) {
        add(resource.id+'-'+suffix, resource.nameRu + (resource.category === 'equipment' && procurement ? ' — аренда с машинистом' : ''),
          resource.category, resource.unitId, consumed, {procurement:resource.category==='equipment' && procurement,
            inclusion:{kind:'equals',parameterId:'mechanism_fulfillment',value:fulfillment},
            ...(resource.id==='operator'?{costTreatment:'INCLUDED_IN_RESOURCE_ROWS'}:{})});
      }
    } else add(resource.id,resource.nameRu,resource.category,resource.unitId,consumed);
  }
  for (const [id,title] of [
    ['foundation-operation','Устройство и уплотнение бетонного основания — в общем нормативном труде'],
    ['formwork-operation','Установка и снятие опалубки — в общем нормативном труде'],
    ['installation-operation','Установка и подтёска бетонных камней — в общем нормативном труде'],
    ['joints-operation','Заполнение и расшивка швов — в общем нормативном труде'],
  ]) add(id,title,'work','m',area,{costTreatment:'INCLUDED_IN_RESOURCE_ROWS'});
  for (const gap of pack.additionalScopeNeeds) {
    const parameterId='open_scope_qty_'+gap.id.replaceAll('-','_');
    conditional.push({id:parameterId,title:gap.nameRu,valueType:'decimal',unitId:gap.unitId,kind:'conditional',min:0});
    add(gap.id,gap.nameRu,gap.category,gap.unitId,parameterId);
  }
  const built = buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:prefix,sourceId:pack.sourceId,normId:type.column,
    sourceMetadata:{source_title:'КРЕР27-2015: установка бетонных бортовых камней',source_document_version:pack.source.edition,
      definition_hash:pack.source.sha256,artifact_sha256:pack.source.sha256,exact_locator:pack.source.locatorRu},
    applicabilityRu:pack.scopeRu+' '+type.coveringValue+'. '+pack.includedTransportRu,
    ordinary:[{id:area,title:'Длина устанавливаемой линии бетонных бортов',valueType:'decimal',unitId:'m',kind:'ordinary',min:0.000001}],
    profile:[],conditional,rows,deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:pack.excludedRu});
  return {...built,
    parameters:built.parameters.map(parameter=>({...parameter,
      required:parameter.required || facts.includes(parameter.parameter_id) || Object.values(materialSpecs).some(spec=>spec.id===parameter.parameter_id),
      truth_metadata:parameter.parameter_id.startsWith('open_scope_qty_')?
      {...parameter.truth_metadata,visibility_role:'INTERNAL_ONLY',value_source_role:'UNRESOLVED_APPLICATION_NORM',
        provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL'},unresolved_norm_reason:'Норма не устанавливает дополнительный состав, количество и включение в цену.'}:
      {...parameter.truth_metadata,source_confirmation_required:false}})),
    resources:built.resources.map(resource=>{
      const key=resource.row_id.slice(prefix.length+1);
      const sourceKey=key.replace(/-(consumed|own|hired)$/u,'');
      const norm=pack.resourceTable.find(r=>r.id===sourceKey);
      const gap=pack.additionalScopeNeeds.find(r=>r.id===key);
      const included=resource.resource_graph.costTreatment==='INCLUDED_IN_RESOURCE_ROWS';
      const parent=prefix+(key.startsWith('operator-')?':crane-'+key.split('-')[1]:':labor');
      const operation=gap?.operation ?? norm?.operation ?? (key.startsWith('foundation-')?'foundation':key.startsWith('formwork-')?'formwork':key.startsWith('joints-')?'joints':'installation');
      const operationTitle:Record<string,string>={foundation:'Бетонное основание',formwork:'Деревянная опалубка основания',
        installation:'Установка бетонных камней',joints:'Заполнение и расшивка швов',handling:'Нормативные механизмы и включённые перемещения',
        'foundation-completion':'Уход за бетоном основания',protection:'Защита зоны работ',completion:'Контроль, уборка и отходы',logistics:'Дополнительная доставка',equipment:'Дополнительное оснащение'};
      const {row_sha256:_old,...content}=resource;
      const result={...content,cost_owner_id:included?parent:resource.cost_owner_id,
        resource_graph:{...resource.resource_graph,...(included?{parentCostOwnerId:parent,includedInResourceOwnerRowId:parent}:{}),
          operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:prefix,groupTitleRu:type.titleRu,
            operationId:prefix+':'+operation,operationTitleRu:operationTitle[operation],processOrdinal:gap?50:operation==='handling'?10:20,
            completionCriterionRu:gap?'Применимость, количество и владелец цены подтверждены.':'Операция выполнена в границах выбранной колонкиКРЕР27-02-010.'},
          publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:resource.title_ru,
            nameRu:resource.title_ru,brandAndModelRu:null,specificationRu:norm && 'characteristicsRu' in norm?norm.characteristicsRu:null,
            detailsRu:gap?[gap.reasonRu,'Это открытая потребность; число, текущая цена и включение в комплексную цену не придуманы.']:
              [`Применение: ${norm?.applicationRu??pack.scopeRu}`,pack.includedTransportRu,
                ...(norm?[`${type.column}: ${norm.id==='concrete'?type.concreteRateM3Per100M:norm.ratePer100M} ${norm.unitId} на100м; ресурс${norm.resourceCode??'машинисты по таблице'}.`]:[]),
                ...(key.endsWith('-consumed')?['Нормативный расход; отдельной оплаты и повторного заказа нет.']:[]),
                ...(norm?.category==='material'&&!key.endsWith('-consumed')?['Заказ рассчитывается по наличию, резерву и реальной кратности поставки; неизвестное значение остаётся пустым.']:[])]}},
        source_metadata:{...resource.source_metadata,sourceRole:gap?'UNRESOLVED_INSTALLATION_SOURCE':norm?.category==='material'&&!key.endsWith('-consumed')?'DERIVED_PURCHASE_BALANCE':'OFFICIAL_NORM',
          normativeTrace:gap?[]:((resource.source_metadata?.normativeTrace??[]) as Record<string,unknown>[]).map(trace=>({...trace,sourceRole:'OFFICIAL_NORM'})),
          source_artifact_sha256:pack.source.sha256,official_url:pack.source.officialUrl,exact_column:type.column,
          full_technical_acceptance:false,graniteCleaningNotIncluded:true,externalDeliveryNotAutomaticallyIncluded:true}};
      return {...result,row_sha256:estimateDeterministicHash(result)};
    })};
}

export function compileConcreteKerbS2754(index:number,input:Record<string,unknown>) {
  return compileAutomaticConstructionOwnerR1({catalogId:pack.types[index].catalogId,compilerVersion:pack.contract,
    primaryMeasureParameterId:area,definition:concreteKerbDefinitionS2754(index),submittedParameters:input});
}

/** Source expectations are taken from table27-02-010 and its printed work
 * composition, independently of the resource array generated above. */
export function concreteKerbCompletenessMapS2754(index:number) {
  const prefix=prefixFor(index);
  const expectations = pack.resourceTable.flatMap(resource=> {
    if(resource.category==='equipment'||resource.id==='operator') return ['own','hired'].map(suffix=>({...resource,id:resource.id+'-'+suffix,
      sourceResourceId:resource.id,condition:suffix==='own'?ownKerbMachinesS2754:hiredKerbMachinesS2754}));
    return [{...resource,id:resource.id+(resource.category==='material'?'-consumed':''),sourceResourceId:resource.id,condition:'EXACT_SELECTED_CONCRETE_COLUMN'}];
  });
  return {contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'NORMATIVE_OPERATION_MAP',generatedFromCurrentRows:false,
    evidenceSha256:pack.source.sha256,evidenceReferences:[pack.source.officialUrl,pack.source.locatorRu],
    entries:expectations.map(resource=>({expectedResourceId:'norm:'+resource.resourceCode+':'+resource.id,operationId:resource.operation,
      category:resource.category,specification:resource.nameRu,condition:resource.condition,sourceId:pack.sourceId,
      unitId:resource.unitId,quantityRule:'EXACT_OFFICIAL_RATE_PER_100_M',formulaId:prefix+':formula:'+resource.id,
      resolution:resource.sourceResourceId==='operator'?{kind:'INCLUDED_COMPONENT_ROW',rowId:prefix+':'+resource.id,
        parentRowId:prefix+':crane-'+resource.id.split('-')[1]}:{kind:'ROW',rowId:prefix+':'+resource.id}}))};
}
