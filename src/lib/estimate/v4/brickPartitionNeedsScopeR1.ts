import pack from '../../../../data/estimate-benchmarks/source-packs/brick-partition-half-unreinforced-krer08-002-05-r1.json';
import type {AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';
import type {CanonicalScopeRequirementV1} from '../backendPlatform/canonicalScopeRequirementV1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';

// AUTHORING COPY ONLY. Proposed canonical destination: src/lib/estimate/v4/.
// Apply after the current brick definition/delivery overlay; do not replace
// either source owner or its compiler, material balance, price, or trip engine.
export const BRICK_PARTITION_NEEDS_SCOPE_R1='brick-partition-eight-needs-scope-r1';
const prefix=pack.rowPrefix;
const row=(suffix:string)=>prefix+':'+suffix;
const krer={sha256:pack.source.sha256,locator:'КРЕР08-2015: PDF5 §1.2; PDF6 §1.3; PDF7 §§1.12–1.13,1.18,1.21; PDF8 §2.10; PDF19–20,08-02-002-05'};
const general={sha256:'5f9f8fc4511678ad84ec3c78424d2064df672fa2a830efbcfff78a014e2493b9',locator:'Общие указания КРЕР-2015: PDF6 §2.8; PDF10 §4.12'};
const overhead={sha256:'89afde6f0135bb465db576dc8e6d1a1154054df6887e8011447e6fcdee114a76',locator:'Методические указания по накладным расходам, редакция05.12.2017: PDF22,приложение6 II.4/III.1–2; PDF24–25,III.7–9,11–12; PDF7 §4.3'};
const exactScopeWhen={kind:'and',operands:[
 {kind:'greater_than',parameterId:'net_partition_area_m2',value:0},
 {kind:'greater_than',parameterId:'storey_height_m',value:0},
 {kind:'less_than_or_equal',parameterId:'storey_height_m',value:4},
 ...pack.scopeFacts.map(f=>({kind:'equals',parameterId:f.id,value:f.value})),
 ...pack.requiredProjectReferences.map(parameterId=>({kind:'present',parameterId})),
]};
type Entry={id:string;kind:CanonicalScopeRequirementV1['kind'];titleRu:string;reasonRu:string;covers?:string[];evidence:typeof krer[]};
const entries:Entry[]=[
 {id:'base-and-dpc',kind:'PROJECT_SCOPE',titleRu:'Готовность опоры и отдельная гидроизоляция по проекту',
  reasonRu:'Принятая несущая опора и отметки — условие начала кладки. Гидроизоляция не включена автоматически в08-02-002-05: §1.3 относится к перечисленным фундаментным нормам. Выравнивание и DPC получают свой проектный состав и владельца стоимости; новая работа не следует из одной площади перегородки.',evidence:[krer,general]},
 {id:'connections-lintels',kind:'PROJECT_SCOPE',titleRu:'Связи, верхнее примыкание и перемычки по проектной ведомости',
  reasonRu:'Деревянные пробки уже предусмотрены §1.2; это не норматив числа анкеров. Связи, верхний зазор и перемычки требуют проектного узла и ведомости. Арматуру колонок01–04 не переносят в неармированную005; §1.12 не задаёт проектное количество.',evidence:[krer]},
 {id:'access-boundary',kind:'INCLUDED',titleRu:'Обычная установка, перестановка и разборка подмостей до4м',
  reasonRu:'КРЕР08 §1.13 включает обычный цикл подмостей для выбранной высоты. Общие143.99ч/100м² не делятся: сохраняются существующие труд, древесина и поковки. Дополнительную аренду или монтаж поверх этих ресурсов не назначают; иной доступ требует отдельной непересекающейся границы ППР.',covers:['whole-labor','timber-consumed','forgings-consumed','timber','forgings'],evidence:[krer]},
 {id:'tools-ppe',kind:'FINANCIAL_POLICY',titleRu:'Инструмент и СИЗ: правило накладных расходов',
  reasonRu:'Приложение6 относит износ и ремонт обычного инструмента кIII.1, охрану труда и СИЗ — кII.4. Нового комплекта на площадь нет. В этой смете отдельный владелец начисления накладных расходов не подтверждён: классификация не означает, что сумма уже начислена или оплачена.',evidence:[overhead]},
 {id:'curing-protection',kind:'PROCESS',titleRu:'Выдержка раствора и защита кладки по условиям объекта',
  reasonRu:'Это требование к выполнению, а не отдельная количественная норма. Существующая вода0.3м³/100м² остаётся одной нормой без приписывания ей всего специального ухода. Дополнительные укрытия, полив или прогрев рассчитывают только по паспорту выбранного М50/ППР и измеримому составу; нормы ухода за бетоном не переносятся.',evidence:[krer,general]},
 {id:'quality-control',kind:'PROCESS',titleRu:'Контроль и приёмка кладки без выдуманного числа осмотров',
  reasonRu:'Геометрия и качество проверяются в процессе и при приёмке; число осмотров из площади не следует. Геодезия и производственные лаборатории отнесены к накладным расходам, приложение6 III.7/9. Отдельная экспертиза, испытание или представитель заказчика требуют своей программы и границы договора; начисление накладных расходов здесь не подтверждено.',evidence:[krer,general,overhead]},
 {id:'external-logistics',kind:'PARTLY_INCLUDED',titleRu:'Переноска5м включена; внешняя партия — существующий владелец доставки',
  reasonRu:'Переноска кирпича5м по§1.21 и нормативная работа крана уже рассчитаны исходными владельцами. Внешние подтверждённые рейсы оплачивает только delivery:selected-material:ford-transit-v363 через имеющийся расчёт выбранной партии. Разгрузку и переноску сверх5м сначала сверяют с договором, краном и ППР; рейсы, тонны и часы из площади не выводятся.',covers:['whole-labor','crane-consumed'],evidence:[krer]},
 {id:'cleanup-waste',kind:'FINANCIAL_POLICY',titleRu:'Обычная уборка и сдача: накладные расходы; особые отходы — отдельная граница',
  reasonRu:'Приложение6 III.11/12 относит обычную уборку территории и подготовку к сдаче, включая указанный там вывоз мусора, к накладным расходам. Здесь начисление не подтверждено. Пригодные остатки учитываются существующим балансом материала; особый поток отходов требует фактической ведомости и исключения пересечения с накладными расходами. Процент боя, контейнер и рейс не назначаются.',evidence:[overhead]},
];

/** Classify the eight existing obligations. No new quantity, price, norm,
 * resource, parameter or payment owner is created. Input is not mutated.
 * Source/code checks deliberately allow the already attached delivery row. */
export function applyBrickPartitionNeedsScopeR1<T extends Pick<AutomaticOwnerDefinition,'parameters'|'formulas'|'resources'>>(parent:T):T{
 const ids=new Set(parent.resources.map(r=>r.row_id));
 if(ids.size!==parent.resources.length || entries.some(e=>!ids.has(row(e.id))))throw Error('BRICK_EIGHT_ORIGINAL_NEEDS_REQUIRED');
 const labor=parent.resources.find(r=>r.row_id===row('whole-labor'));
 if(labor?.source_metadata?.source_artifact_sha256!==pack.source.sha256 || labor?.source_metadata?.exact_column!==pack.normId)
  throw Error('BRICK_EXACT_OFFICIAL_COLUMN005_REQUIRED');
 const parameterIds=new Set(parent.parameters.map(p=>p.parameter_id));
 if(['net_partition_area_m2','storey_height_m',...pack.scopeFacts.map(f=>f.id),...pack.requiredProjectReferences].some(id=>!parameterIds.has(id)))
  throw Error('BRICK_EXACT_SOURCE_FACTS_REQUIRED');
 const result=structuredClone(parent);
 const resources=result.resources.map(original=>{
  const entry=entries.find(e=>original.row_id===row(e.id));
  if(!entry)return original;
  const covers=(entry.covers??[]).map(row);
  if(covers.some(id=>!ids.has(id)))throw Error('BRICK_EXISTING_COVERING_OWNER_REQUIRED');
  const scope:CanonicalScopeRequirementV1={contractVersion:'canonical-scope-requirement/v1',kind:entry.kind,
   groupId:prefix+':scope:'+entry.id,groupTitleRu:entry.titleRu,titleRu:entry.titleRu,reasonRu:entry.reasonRu,
   exactScopeWhen,sourceEvidence:entry.evidence,coveringRowIds:covers,originalRowIds:[],
   ...(covers.length?{costExclusionBreaksScopeV1:true as const}:{}),
  };
  const {row_sha256:_old,...body}=original;
  const updated={...body,title_ru:entry.titleRu,procurement_eligible:false,
   resource_graph:{...original.resource_graph,costTreatment:'INFORMATIONAL_SCOPE',scopeRequirementV1:scope,
    publicResourcePresentationV1:{...(original.resource_graph.publicResourcePresentationV1 as Record<string,unknown>??{}),
     contractVersion:'canonical-public-resource-presentation/v1',nameRu:entry.titleRu,sourceTitleRu:entry.titleRu,
     detailsRu:[entry.reasonRu]},
   },
   source_metadata:{...original.source_metadata,sourceRole:'SOURCE_CLASSIFIED_SCOPE_REQUIREMENT',
    scopeClassificationContract:BRICK_PARTITION_NEEDS_SCOPE_R1,numericNormAccepted:false,separatePaymentAccepted:false,
    full_technical_acceptance:false},
  };
  return {...updated,row_sha256:estimateDeterministicHash(updated)};
 });
 return {...result,resources};
}
