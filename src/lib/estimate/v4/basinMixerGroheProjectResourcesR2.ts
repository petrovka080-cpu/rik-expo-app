import {basinMixerGrohe33265002KitDefinitionR1,basinMixerGrohe33265002PackR1 as pack} from './basinMixerGrohe33265002KitR1';
import {appendProjectSubworkResourceScheduleR1,type ProjectSubworkResourcePositionR1} from './projectSubworkResourceScheduleR1';
import type {AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';

const p=pack.prefix,id=(key:string)=>p+':'+key;
/** Source manual establishes the method and compatible tools, not their number,
 * a rental period or a purchase norm. Ordinary hand tools are in the work price. */
export const basinMixerGroheProjectPositionsR2:readonly ProjectSubworkResourcePositionR1[]=[
 {key:'mounting-key',titleRu:'Ключ для крепления смесителя',category:'tool',unitId:'piece',operation:'mounting',sharedOperations:['readiness','water-connection'],optional:false,includedOnly:true,
  conditionRu:'Ключ под штатное крепление выбранной поставки; на схеме — 13 мм. Обычный ручной инструмент включён в цену монтажа.',evidence:'GROHE 99.0238.731/10.23, стр.2–4; согласованная граница полного монтажа.'},
 {key:'waste-key',titleRu:'Ключ для донного клапана',category:'tool',unitId:'piece',operation:'waste-connection',sharedOperations:['readiness'],optional:false,includedOnly:true,
  conditionRu:'Инструмент совместим с фактическим клапаном; на схеме — 32 мм. Специальные принадлежности со звёздочкой не объявлены входящими в поставку.',evidence:'GROHE 99.0238.731/10.23, стр.2–4; обычный ручной инструмент включён в цену монтажа.'},
 {key:'water-tray',titleRu:'Ёмкость для сбора воды',category:'tool',unitId:'piece',operation:'water-connection',sharedOperations:['local-check'],optional:true,includedOnly:true,
  conditionRu:'При необходимости по условиям участка. Существующая инвентарная ёмкость не становится новой закупкой.',evidence:'Проектное обеспечение безопасного отключения и местной проверки; договор монтажа.'},
 {key:'surface-protection',titleRu:'Защита раковины и соседних поверхностей',category:'material',unitId:'m2',operation:'readiness',sharedOperations:['mounting','waste-connection'],optional:true,
  conditionRu:'Материал и фактически защищаемая площадь — по состоянию участка. Проверить включение в цену монтажа и повторное использование.',evidence:'Условия объекта и ведомость защиты; инструкция изготовителя не задаёт расход.'},
 {key:'wiping-cloth',titleRu:'Салфетки для проверки соединений и уборки',category:'material',unitId:'piece',operation:'local-check',sharedOperations:['cleanup'],optional:true,
  conditionRu:'Вид, количество и включение расходников подтверждает исполнитель; не назначать комплект салфеток на каждый смеситель автоматически.',evidence:'Ведомость обеспечения местной проверки и уборки.'},
 {key:'check-water',titleRu:'Вода для местной проверки',category:'material',unitId:'m3',operation:'local-check',sharedOperations:[],optional:true,
  conditionRu:'Только фактически отдельно учитываемый объём. Проверить обеспечение объекта и границу монтажа; это не опрессовка сети.',evidence:'Программа местной проверки и фактическая ведомость воды.'},
 {key:'packaging-bags',titleRu:'Мешки для упаковки и мусора',category:'material',unitId:'piece',operation:'cleanup',sharedOperations:[],optional:true,
  conditionRu:'Необходимость, количество и повторное использование по реальному объёму упаковки, без коэффициента на смеситель.',evidence:'Ведомость упаковки и условия уборки объекта.'},
 {key:'kit-delivery',titleRu:'Доставка смесителей на объект',category:'transport',unitId:'trip',operation:'logistics',sharedOperations:['readiness'],optional:true,
  includedInExistingOwners:[{rowId:id('kit-order'),titleRu:'GROHE Eurosmart 33265002, полный комплект'}],
  conditionRu:'Подтвердить партию и маршрут. Если доставка включена в цену комплектов, указать этот источник оплаты; второй транспортный счёт запрещён.',evidence:'Подтверждённые условия поставки и маршрут.'},
 {key:'additional-cleanup',titleRu:'Дополнительная уборка места работ',category:'service',unitId:'m2',operation:'cleanup',sharedOperations:[],optional:true,
  conditionRu:'Только согласованный объём вне включённой местной проверки и обычной уборки исполнителя; сначала проверить договор.',evidence:'Отдельное задание на дополнительную уборку с обмером и границей оплаты.'},
 {key:'packaging-removal',titleRu:'Вывоз упаковки и мусора',category:'transport',unitId:'trip',operation:'cleanup',sharedOperations:['logistics'],optional:true,
  conditionRu:'Маршрут, вместимость и фактические партии по заданию. Если включено в поставку или уборку, отдельная оплата не допускается.',evidence:'Ведомость отходов, условия вывоза и приёмки.'},
];
export function basinMixerGroheProjectResourcesR2():AutomaticOwnerDefinition {
 const original=basinMixerGrohe33265002KitDefinitionR1();
 const owner=id('complete-installation-work');
 const parent={...original,resources:original.resources.map(row=>{
  if(row.row_id!==owner)return row;
  const {row_sha256:_old,...body}=row;
  const changed={...body,resource_graph:{...row.resource_graph,operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',
   groupId:p,groupTitleRu:pack.titleRu,operationId:id('operation:whole-cycle'),operationTitleRu:'Монтаж смесителя',processOrdinal:0,processRole:'COST_SUMMARY',
   completionCriterionRu:'Пять подработ входят в одну подтверждённую расценку за полный монтаж; отдельные часы не начисляются.',
   additionalOperations:pack.operations.map(op=>({operationId:id('operation:'+op.id),operationTitleRu:op.titleRu,processOrdinal:op.ordinal,processRole:'PROCESS',completionCriterionRu:op.criterionRu}))}}};
  return {...changed,row_sha256:estimateDeterministicHash(changed)};
 })} as AutomaticOwnerDefinition;
 return appendProjectSubworkResourceScheduleR1(parent,{key:'grohe_r2',sourceSha256:pack.source.sha256,sourceUrl:pack.source.tpiUrl,
  sourceId:pack.sourceId,sourceLocatorRu:pack.source.locatorRu,primaryParameterId:pack.primaryParameterId,
  active:{kind:'greater_than',parameterId:pack.primaryParameterId,value:0},includedOwnerRowId:owner,positions:basinMixerGroheProjectPositionsR2,replacements:{},
  additionalOperations:[['logistics','Доставить смесители'],['cleanup','Убрать место работ']].map(([key,title])=>({contractVersion:'canonical-operation-resource/v1',groupId:p,groupTitleRu:pack.titleRu,
   operationId:id('operation:'+key),operationTitleRu:title,processOrdinal:key==='logistics'?60:70,completionCriterionRu:'Необходимость, фактический объём и непересекающаяся цена подтверждены отдельно.'}))});
}
