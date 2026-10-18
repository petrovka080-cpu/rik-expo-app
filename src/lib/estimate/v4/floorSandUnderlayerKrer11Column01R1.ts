import pack from '../../../../data/estimate-benchmarks/source-packs/floor-sand-underlayer-krer11-002-01-r1.json';
import {
  buildAutomaticConstructionOwnerR1, unresolvedApplicationNormTruthR1,
  type AutomaticOwnerDefinition, type AutomaticParameterSpec, type AutomaticRowSpec,
} from './automaticConstructionOwnerR1';
import {effectivePurchaseBalanceExpressionsR1} from './effectivePurchaseBalanceR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';

export const floorSandUnderlayerPackR1 = pack;
/** Proposed source-specific identity; actual binding remains gated by the current preimage. */
export const floorSandUnderlayerCatalogIdR1 = pack.expectedAppend.catalogId;
export const floorSandUnderlayerMachineCoverageRowsR1 = pack.machineCoverageAdmissionRequired.resourceRows;
const prefix = pack.prefix, volume = pack.primaryMeasureParameterId;
const projectFacts = ['floor_sand_project_conditions', 'floor_sand_accepted_base', 'floor_sand_net_volume_basis'];
const owner = (suffix:string) => prefix + ':' + suffix;

export function floorSandUnderlayerDefinitionR1():AutomaticOwnerDefinition {
  if (pack.normId !== 'KRER11-01-002-01' || pack.source.column !== '11-01-002-01'
      || pack.resources.length !== 7 || floorSandUnderlayerMachineCoverageRowsR1.length !== 3)
    throw Error('FLOOR_SAND_EXACT_SOURCE_TABLE_REQUIRED');
  const conditional:AutomaticParameterSpec[] = [
    {id:projectFacts[0], title:'Применимость именно песчаного подстилающего слоя под полы и исходной схемы', kind:'conditional', valueType:'enum', unitId:null, values:[pack.projectConditionsValueRu]},
    {id:projectFacts[1], title:'Принятие исходного основания и единственная включённая планировка', kind:'conditional', valueType:'enum', unitId:null, values:[pack.acceptedBaseValueRu]},
    {id:projectFacts[2], title:'Чистый объём слоя по КРЕР11 §2.1', kind:'conditional', valueType:'enum', unitId:null, values:[pack.netVolumeValueRu]},
    {id:'floor_sand_machine_fulfillment', title:'Обеспечение нормативными механизмами и граница ставки', kind:'conditional', valueType:'enum', unitId:null, values:pack.machineFulfillmentValues},
  ];
  const rows:AutomaticRowSpec[] = [];
  const add = (id:string, title:string, category:string, unitId:string, expression:string, extra:Partial<AutomaticRowSpec>={}) => rows.push({
    rowId:owner(id), formulaId:owner('formula:'+id), title, section:pack.titleRu, category, unitId, expression,
    procurement:false, inputParameterIds:projectFacts, ...extra,
  });
  for (const resource of pack.resources) {
    const consumed = `${volume}*${resource.rate}`;
    if (resource.unitId === 'm3') {
      const key = pack.materialFactIds[resource.id as keyof typeof pack.materialFactIds];
      if (!key) throw Error('FLOOR_SAND_EXACT_MATERIAL_ID_REQUIRED');
      for (const [suffix,title,min] of [
        ['stock','Пригодное совместимое наличие',0], ['reserve','Сохраняемый резерв',0], ['quantum','Подтверждённая кратность поставки',0.000000001],
      ] as const) conditional.push({id:key+'_'+suffix,title:title+': '+resource.titleRu,kind:'conditional',valueType:'decimal',unitId:'m3',min});
      conditional.push({id:key+'_specification',title:'Фактическая поставочная спецификация: '+resource.titleRu,kind:'conditional',valueType:'text',unitId:null});
      conditional.push({id:key+'_stock_reference',title:'Подтверждение совместимости имеющегося материала с выбранной спецификацией: '+resource.titleRu,
        kind:'conditional',valueType:'text',unitId:null,requiredWhen:{kind:'greater_than',parameterId:key+'_stock',value:0}});
      const id = 'material:'+resource.id;
      const balance = effectivePurchaseBalanceExpressionsR1({ownerRowId:owner(id),orderUnitId:'m3',consumed,
        stock:key+'_stock',reserve:key+'_reserve',quantum:key+'_quantum'});
      add(id,resource.titleRu,'material','m3',`ceil(max(0,(${consumed})+${key}_reserve-${key}_stock)/${key}_quantum)*${key}_quantum`,
        {...balance.owner,procurement:true,titleParameterIds:[key+'_specification'],inputParameterIds:[...projectFacts,key+'_specification',key+'_stock_reference']});
      add(id+':consumed','Нормативный расход: '+resource.titleRu,'material','m3',consumed,{costTreatment:'INFORMATIONAL_SCOPE',purchaseBalanceOwnerRowId:owner(id)});
      for (const [suffix,title,unit,expression] of [
        ['packages','Партии к заказу','item',balance.packages], ['remaining','Остаток после устройства слоя','m3',balance.remaining],
        ['free','Свободный остаток сверх резерва','m3',balance.free], ['shortage','Недостаток материала для слоя','m3',balance.consumptionShortage],
        ['reserve-deficit','Непокрытый резерв','m3',balance.reserveDeficit],
      ] as const) add(id+':'+suffix,title+': '+resource.titleRu,'material',unit,expression,{costTreatment:'INFORMATIONAL_SCOPE',purchaseBalanceOwnerRowId:owner(id),
        ...(['shortage','reserve-deficit'].includes(suffix)?{inclusion:{kind:'formula_greater_than' as const,expression,unitId:'m3',value:0}}:{})});
    } else if (resource.unitId === 'machine_hour') {
      add('equipment:'+resource.id,resource.titleRu,'equipment','machine_hour',consumed,{inputParameterIds:[...projectFacts,'floor_sand_machine_fulfillment']});
    } else {
      add(resource.id,resource.titleRu,'labor','man_hour',consumed,{costTreatment:resource.id==='operators'?'INFORMATIONAL_SCOPE':'OWN_COST',
        inputParameterIds:resource.id==='operators'?[...projectFacts,'floor_sand_machine_fulfillment']:projectFacts});
    }
  }
  for (const op of pack.includedOperations)
    add('included:'+op.id,op.titleRu+' — в исходном составе, повторная оплата исключена','work','m3',volume,{costTreatment:'INCLUDED_IN_RESOURCE_ROWS'});
  for (const gap of pack.unresolvedNeeds) {
    const id = 'unresolved_'+gap.id.replaceAll('-','_');
    conditional.push({id,title:gap.titleRu,kind:'conditional',valueType:'decimal',unitId:gap.unitId,min:0});
    add('open:'+gap.id,gap.titleRu,'service',gap.unitId,id);
  }
  const base = buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:prefix,sourceId:pack.sourceId,normId:pack.normId,
    sourceMetadata:{source_title:'КРЕР11-2015,11-01-002-01: песчаный подстилающий слой под полы',source_document_version:pack.source.edition,
      definition_hash:pack.source.sha256,artifact_sha256:pack.source.sha256,exact_locator:'Физические/печатные стр.6 §2.1, стр.7 состав01–04, стр.8 только11-01-002-01; измеритель м³ чистого слоя'},
    applicabilityRu:pack.projectConditionsValueRu+' '+pack.acceptedBaseValueRu+' '+pack.netVolumeValueRu,
    ordinary:[{id:volume,title:'Чистый объём песчаного подстилающего слоя под полы по проекту или обмеру',kind:'ordinary',valueType:'decimal',unitId:'m3',min:0.000001}],
    profile:[],conditional:conditional.map(spec=>spec.id.startsWith('unresolved_')?spec:{...spec,requiredWhen:spec.requiredWhen??{kind:'greater_than' as const,parameterId:volume,value:0}}),
    rows,deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:pack.excluded});
  return {...base,
    parameters:base.parameters.map(p=>({...p,truth_metadata:p.parameter_id.startsWith('unresolved_')
      ?unresolvedApplicationNormTruthR1(p.truth_metadata,'Конкретные задача и владелец доказательства заданы source-pack; таблица11-01-002-01 не подтверждает количество и границу отдельной оплаты этой потребности.')
      :p.truth_metadata.visibility_role==='INTERNAL_ONLY'?p.truth_metadata:{...p.truth_metadata,source_confirmation_required:false,provenance:{consumer_input_role_v1:'OBJECT_FACT'}}})),
    resources:base.resources.map(r=>{
      const gap = pack.unresolvedNeeds.find(g=>r.row_id===owner('open:'+g.id));
      const norm = pack.resources.find(n=>r.row_id===owner(n.unitId==='machine_hour'?'equipment:'+n.id:n.unitId==='m3'?'material:'+n.id:n.id)
        ||r.row_id===owner('material:'+n.id+':consumed'));
      const machine = floorSandUnderlayerMachineCoverageRowsR1.find(m=>m.rowId===r.row_id), included = r.row_id.startsWith(owner('included:'));
      const {row_sha256:_old,...body} = r;
      const value = {...body,resource_graph:{...r.resource_graph,
        ...(included?{parentCostOwnerId:owner('worker')}:{}),
        operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:prefix,groupTitleRu:pack.titleRu,
          operationId:prefix+':floor-underlayer',operationTitleRu:'Планировка основания и устройство песчаного подстилающего слоя под полы',
          completionCriterionRu:'Ресурсы исходной колонки учтены; проектная приёмка, поставки и дополнительные обязанности требуют отдельных фактов'},
        publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:r.title_ru,nameRu:r.title_ru,brandAndModelRu:null,specificationRu:null,
          detailsRu:gap?[gap.taskRu,'Владелец недостающего доказательства: '+gap.missingFactOwner]:[
            pack.titleRu,'Чистый объём по §2.1; 1.2м³ песка на м³ слоя учтено один раз, это не20% отходов.',
            r.row_id===owner('operators')?'0.30ч машинистов относятся к автопогрузчику0.08 и компрессору0.22; отдельная оплата исключена.':
              machine?.resourceCode==='33-0741'?pack.rammerPriceConfirmationRu:
              machine?'Полная эксплуатационная ставка автопогрузчика или компрессора с предусмотренным машинистом; отдельно нормированные песок и вода не дублируются.':'Точная колонка01, измеритель1м³; исторические базовые цены не перенесены.']}},
        source_metadata:{...r.source_metadata,sourceRole:gap?'UNRESOLVED_APPLICATION_NORM':norm?'OFFICIAL_NORM':included?'INCLUDED_SOURCE_OPERATION':'DERIVED_PURCHASE_BALANCE',
          sourceNormQuantityAccepted:!gap&&Boolean(norm||included),normativeTrace:gap?[]:r.source_metadata?.normativeTrace,
          normativeResourceCode:norm?.resourceCode??null,exactColumn:'11-01-002-01',full_technical_acceptance:false,
          ...(gap?{missingEvidenceTask:gap.taskRu,missingEvidenceOwner:gap.missingFactOwner}:{}),
          ...(machine?{normativeResourceCode:machine.resourceCode,machinePriceCoverageRequired:machine.machinePriceCoverageRequired,
            machinePriceOperationScope:machine.operationScope,machineCoverageAdmissionPending:true,
            ...(machine.resourceCode==='33-0741'?{machinePriceSeparatePaidOwnerRowIds:[owner('worker'),owner('equipment:compressor')],
              machinePriceSeparatePaidOwners:[{rowId:owner('worker'),resourceCode:'000-1002-5',unitId:'man_hour',sourceQuantityPerNetM3:'2.3'},
                {rowId:owner('equipment:compressor'),resourceCode:'05-0005',unitId:'machine_hour',sourceQuantityPerNetM3:'0.22'}]}:{})}:{}),
          ...(r.row_id===owner('operators')?{operatorHoursInformationalOnly:true,machineRateOwnerRowIds:floorSandUnderlayerMachineCoverageRowsR1.filter(m=>m.operator!=='NO_ADDITIONAL_OPERATOR_NORM').map(m=>m.rowId)}:{})}};
      return {...value,row_sha256:estimateDeterministicHash(value)};
    }),
  };
}
