// Exact road upper-layer source owner. No interior/generic gravel or asphalt graph is imported.
import pack from '../../../../data/estimate-benchmarks/source-packs/road-upper-gravel150-krer27-005-02-r1.json';
import {buildAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,type AutomaticOwnerDefinition,
 type AutomaticParameterSpec,type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {effectivePurchaseBalanceExpressionsR1} from './effectivePurchaseBalanceR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
export const roadUpperGravel150PackR1=pack;
export const roadUpperGravel150CatalogIdR1='canonical-work:master:road_upper_crushed_stone_150mm_m1200_two_layer_krer27_04_005_02';
export const roadUpperGravel150WorkKeyR1='road_upper_crushed_stone_150mm_m1200_two_layer_krer27_04_005_02';
const prefix=pack.prefix,area=pack.primaryMeasureParameterId,projectFacts=['road_upper_project_conditions','accepted_lower_layer'];
const owner=(suffix:string)=>prefix+':'+suffix;
export const roadUpperGravel150MachineCoverageRowsR1=pack.machineCoverageAdmissionRequired.resourceRows;
export function roadUpperGravel150DefinitionR1():AutomaticOwnerDefinition {
 if(pack.normId!=='KRER27-04-005-02'||pack.source.column!=='27-04-005-02'
  ||pack.resources.length!==11||pack.machineCoverageAdmissionRequired.resourceRows.length!==6)
  throw Error('ROAD_UPPER02_EXACT_SOURCE_TABLE_REQUIRED');
 const conditional:AutomaticParameterSpec[]=[
  {id:projectFacts[0],title:'Применимость выбранной дорожной конструкции и доступ тяжёлых механизмов',kind:'conditional',valueType:'enum',unitId:null,values:[pack.projectConditionsValueRu]},
  {id:projectFacts[1],title:'Принятие существующего нижнего слоя',kind:'conditional',valueType:'enum',unitId:null,values:[pack.acceptedLowerLayerValueRu]},
  {id:'road_upper_machine_fulfillment',title:'Обеспечение нормативными механизмами и граница ставки',kind:'conditional',valueType:'enum',unitId:null,values:pack.machineFulfillmentValues},
 ];
 const rows:AutomaticRowSpec[]=[];
 const add=(id:string,title:string,category:string,unitId:string,expression:string,extra:Partial<AutomaticRowSpec>={})=>rows.push({
  rowId:owner(id),formulaId:owner('formula:'+id),title,section:pack.titleRu,category,unitId,expression,
  procurement:false,inputParameterIds:projectFacts,...extra});
 for(const resource of pack.resources){
  const consumed=`${area}*${resource.rate}/1000`;
  if(resource.unitId==='m3'){
   const key=pack.materialFactIds[resource.id as keyof typeof pack.materialFactIds];if(!key)throw Error('ROAD_UPPER02_EXACT_MATERIAL_ID_REQUIRED');
   for(const [suffix,title,min] of [['stock','Пригодное совместимое наличие',0],['reserve','Сохраняемый резерв',0],['quantum','Подтверждённая кратность поставки',0.000000001]] as const)
    conditional.push({id:key+'_'+suffix,title:title+': '+resource.titleRu,kind:'conditional',valueType:'decimal',unitId:'m3',min});
   conditional.push({id:key+'_specification',title:'Фактическая поставочная спецификация: '+resource.titleRu,kind:'conditional',valueType:'text',unitId:null});
   conditional.push({id:key+'_stock_reference',title:'Подтверждение пригодности имеющегося материала по выбранной спецификации: '+resource.titleRu,
    kind:'conditional',valueType:'text',unitId:null,requiredWhen:{kind:'greater_than',parameterId:key+'_stock',value:0}});
   const id='material:'+resource.id,balance=effectivePurchaseBalanceExpressionsR1({ownerRowId:owner(id),orderUnitId:'m3',consumed,
    stock:key+'_stock',reserve:key+'_reserve',quantum:key+'_quantum'});
   add(id,resource.titleRu,'material','m3',`ceil(max(0,(${consumed})+${key}_reserve-${key}_stock)/${key}_quantum)*${key}_quantum`,
    {...balance.owner,procurement:true,titleParameterIds:[key+'_specification'],inputParameterIds:[...projectFacts,key+'_specification',key+'_stock_reference']});
   add(id+':consumed','Нормативный расход: '+resource.titleRu,'material','m3',consumed,{costTreatment:'INFORMATIONAL_SCOPE',purchaseBalanceOwnerRowId:owner(id)});
   for(const [suffix,title,unit,expression] of [
    ['packages','Партии к заказу','item',balance.packages],['remaining','Остаток после устройства слоя','m3',balance.remaining],
    ['free','Свободный остаток сверх резерва','m3',balance.free],
    ['shortage','Недостаток материала для слоя','m3',balance.consumptionShortage],['reserve-deficit','Непокрытый резерв','m3',balance.reserveDeficit],
   ] as const)add(id+':'+suffix,title+': '+resource.titleRu,'material',unit,expression,
    {costTreatment:'INFORMATIONAL_SCOPE',purchaseBalanceOwnerRowId:owner(id),
     ...(['shortage','reserve-deficit'].includes(suffix)?{inclusion:{kind:'formula_greater_than' as const,expression,unitId:'m3',value:0}}:{})});
  }else if(resource.unitId==='machine_hour')add('equipment:'+resource.id,resource.titleRu,'equipment','machine_hour',consumed,
   {inputParameterIds:[...projectFacts,'road_upper_machine_fulfillment']});
  else add(resource.id,resource.titleRu,'labor','man_hour',consumed,
   {costTreatment:resource.id==='operators'?'INFORMATIONAL_SCOPE':'OWN_COST',inputParameterIds:resource.id==='operators'?[...projectFacts,'road_upper_machine_fulfillment']:projectFacts});
 }
 for(const [id,title] of [['spread-level','Россыпь и разравнивание щебня'],['roll-water','Укатка и поливка водой'],['profile-grade','Профилирование и планировка щебня']])
  add('included:'+id,title+' — в исходном составе, повторная оплата исключена','work','m2',area,{costTreatment:'INCLUDED_IN_RESOURCE_ROWS'});
 for(const gap of pack.unresolvedNeeds){const id='unresolved_'+gap.id.replaceAll('-','_');
  conditional.push({id,title:gap.titleRu,kind:'conditional',valueType:'decimal',unitId:gap.unitId,min:0});
  add('open:'+gap.id,gap.titleRu,'service',gap.unitId,id);
 }
 const base=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:prefix,sourceId:pack.sourceId,normId:pack.normId,
  sourceMetadata:{source_title:'КРЕР27-2015,27-04-005-02: верхний слой двухслойного основания150мм',source_document_version:pack.source.edition,
   definition_hash:pack.source.sha256,artifact_sha256:pack.source.sha256,exact_locator:'Физическая/печатная стр.48; только колонка27-04-005-02; измеритель1000м² этого верхнего150мм слоя'},
  applicabilityRu:pack.projectConditionsValueRu+' '+pack.acceptedLowerLayerValueRu,
  ordinary:[{id:area,title:'Площадь только выбранного верхнего150мм дорожного слоя по проекту или обмеру',kind:'ordinary',valueType:'decimal',unitId:'m2',min:0.000001}],
  profile:[],conditional:conditional.map(spec=>spec.id.startsWith('unresolved_')?spec:{...spec,requiredWhen:spec.requiredWhen??{kind:'greater_than' as const,parameterId:area,value:0}}),rows,deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:pack.excluded});
 return {...base,parameters:base.parameters.map(p=>({...p,truth_metadata:p.parameter_id.startsWith('unresolved_')
  ?unresolvedApplicationNormTruthR1(p.truth_metadata,'Фактический состав, количество и граница оплаты этой потребности не подтверждены исходной таблицей27-04-005-02.')
  :p.truth_metadata.visibility_role==='INTERNAL_ONLY'?p.truth_metadata:{...p.truth_metadata,source_confirmation_required:false,provenance:{consumer_input_role_v1:'OBJECT_FACT'}}})),
  resources:base.resources.map(r=>{
   const gap=r.row_id.startsWith(owner('open:')),norm=pack.resources.find(n=>r.row_id===owner(n.unitId==='machine_hour'?'equipment:'+n.id:n.unitId==='m3'?'material:'+n.id:n.id)
    ||r.row_id===owner('material:'+n.id+':consumed'));
   const machine=pack.machineCoverageAdmissionRequired.resourceRows.find(m=>m.rowId===r.row_id),included=r.row_id.startsWith(owner('included:'));
   const {row_sha256:_old,...body}=r;
   const value={...body,resource_graph:{...r.resource_graph,
    ...(included?{parentCostOwnerId:owner('worker')}:{}),
    operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:prefix,groupTitleRu:pack.titleRu,
     operationId:prefix+':upper-layer',operationTitleRu:'Устройство выбранного верхнего слоя; нижний слой уже принят',
     completionCriterionRu:'Нормативные ресурсы верхнего слоя учтены; проект, фактические поставки, границы оплаты и дополнительный контроль требуют своих данных'},
    publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:r.title_ru,nameRu:r.title_ru,brandAndModelRu:null,specificationRu:null,
     detailsRu:gap?['Количество и граница оплаты остаются неизвестными; расход из площади не выдуман.']:
      [pack.titleRu,'Норма относится только к верхнему150мм слою; нижний слой и асфальт не добавлены.',
       r.row_id===owner('operators')?'Суммарные52.72чел.-ч входят в ставки шести машин; отдельная оплата запрещена.':machine?'Машино-час требует подтверждённой полной эксплуатационной ставки с предусмотренным машинистом; материалы отдельными строками не дублируются.':'Источник: колонка02,1000м²; исторические базовые цены не перенесены.']}},
    source_metadata:{...r.source_metadata,sourceRole:gap?'UNRESOLVED_APPLICATION_NORM':norm?'OFFICIAL_NORM':included?'INCLUDED_SOURCE_OPERATION':'DERIVED_PURCHASE_BALANCE',
     sourceNormQuantityAccepted:!gap&&Boolean(norm||included),normativeTrace:gap?[]:r.source_metadata?.normativeTrace,
     normativeResourceCode:norm?.resourceCode??null,exactColumn:'27-04-005-02',full_technical_acceptance:false,
     ...(machine?{normativeResourceCode:machine.resourceCode,machinePriceCoverageRequired:'FULL_MACHINE_SOURCE_COST',machineCoverageAdmissionPending:true}:{}),
     ...(r.row_id===owner('operators')?{operatorHoursInformationalOnly:true,machineRateOwnerRowIds:pack.machineCoverageAdmissionRequired.resourceRows.map(m=>m.rowId)}:{})}};
   return {...value,row_sha256:estimateDeterministicHash(value)};
  })};
}
