import matrix from '../../../../data/estimate-benchmarks/source-packs/remaining-three-project-resource-composition-r5.json';
import {appendProjectSubworkResourceScheduleR1,type ProjectSubworkResourcePositionR1} from './projectSubworkResourceScheduleR1';
import type {AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';
import type {CanonicalEstimateOperationReference} from '../backendPlatform/canonicalEstimateOperationComposition';
import {estimateDeterministicHash} from '../estimateDeterministicHash';

export type RemainingThreeResourceKeyR5='hydro'|'paint'|'trench';
type Configuration={prefix:string;measure:string;owner:string;title:string;
 operations:readonly [string,string][];included:readonly string[];
 assignment:Readonly<Record<string,string>>;notes:Readonly<Record<string,[string,string]>>};
const configuration:Record<RemainingThreeResourceKeyR5,Configuration>={
 hydro:{prefix:'hydrotest:internal-steel:dn50:krer16-005-01',measure:'tested_steel_pipe_length_m',owner:'whole-worker',title:'Гидроиспытание стального водопровода до DN50',
  operations:[['preparation','Подготовить и оградить участок'],['inspection','Осмотреть трубопровод'],['connections','Подключить установку, заглушки и манометр'],
   ['fill','Заполнить систему водой'],['pressure-test','Испытать трубопровод давлением'],['acceptance','Проверить и сдать систему'],
   ['drain','Слить воду'],['disconnect','Снять оснастку и отключить установку'],['logistics','Доставить материалы и установку'],['cleanup','Убрать место работ']],
  included:['inspection','connections','fill','pressure-test','acceptance','drain','disconnect'],
  assignment:{'hydraulic-plant-consumed':'pressure-test','included-step1':'inspection','included-step2':'connections','included-step3':'connections',
   'included-step4':'fill','included-step5':'pressure-test','included-step6':'acceptance','included-step7':'drain','included-step8':'disconnect',
   water:'fill',paint:'connections','linseed-oil':'connections',linen:'connections'},
  notes:{'open:accepted-test-boundary':['Проверить границы испытываемого участка','preparation'],
   'open:approved-test-program':['Подтвердить программу и параметры испытания','pressure-test'],
   'open:machine-price-and-worker-boundary':['Подтвердить оплату установки и оператора','pressure-test'],
   'open:water-supply-discharge':['Согласовать подачу и отведение воды','drain'],
   'open:access-isolation-safety':['Обеспечить доступ и безопасное отключение участка','preparation'],
   'open:external-logistics-material-balance':['Проверить поставку и наличие материалов','logistics']}},
 paint:{prefix:'flat-metal-oil:krer15-04-030-02',measure:'actual_flat_metal_oil_painted_area_m2',owner:'whole-oil-painting-labor',title:'Окраска плоского металла масляной краской в два слоя',
  operations:[['preparation','Защитить соседние поверхности и подготовить место'],['access','Обеспечить доступ к поверхности'],['cleaning','Очистить металл'],
   ['drying-oil-prime','Нанести олифу'],['first-coat','Нанести первый слой краски'],['second-coat','Нанести второй слой краски'],
   ['quality','Выдержать и проверить покрытие'],['logistics','Доставить и подать материалы'],['cleanup','Убрать место работ']],
  included:['cleaning','drying-oil-prime','first-coat','second-coat'],
  assignment:{'machine-operator-info':'logistics','mast-hoist-info':'logistics','truck-info':'logistics','ready-ma25-paint-consumption':'first-coat',
   'natural-drying-oil-consumption':'drying-oil-prime','rags-consumption':'cleaning'},
  notes:{'need:norm-and-project-applicability':['Проверить применимость окраски к поверхности','preparation'],
   'need:prior-coating-and-corrosion-treatment':['Уточнить дополнительную подготовку металла','cleaning'],
   'need:product-conditions-and-drying':['Подтвердить краску и условия высыхания','quality'],
   'need:material-order-and-stock':['Проверить наличие и заказ материалов','logistics'],
   'need:hand-tools-ppe-and-ventilation':['Проверить инструмент, защиту и вентиляцию','preparation'],
   'need:protection-and-junctions':['Защитить примыкания и соседние поверхности','preparation'],
   'need:access-and-scaffolding':['Проверить безопасный доступ','access'],
   'need:machine-and-logistics-payment':['Подтвердить стоимость подъёма и перевозок','logistics'],
   'need:quality-and-acceptance':['Согласовать проверку покрытия','quality'],
   'need:cleanup-and-waste':['Согласовать уборку и обращение с отходами','cleanup']}},
 trench:{prefix:'manual-trench:krer01-02-057-01',measure:'actual_manual_trench_bank_volume_m3',owner:'whole-manual-excavation-labor',title:'Ручная разработка сухой траншеи до 2 м, грунт группы 1',
  operations:[['preparation','Подготовить и оградить участок'],['setting-out','Разметить траншею и проверить отметки'],['water-protection','Защитить сухую выемку от воды'],
   ['dig-and-throw-to-edge','Разработать грунт и выбросить на бровку'],['bottom-and-wall-cleaning','Зачистить дно и стенки'],
   ['throw-back-from-edge','Откинуть грунт от бровки'],['spoil-logistics','Погрузить и вывезти лишний грунт'],['acceptance','Проверить готовую траншею'],
   ['logistics','Доставить инструмент'],['cleanup','Убрать участок']],
  included:['dig-and-throw-to-edge','bottom-and-wall-cleaning','throw-back-from-edge'],assignment:{},
  notes:{'need:project-norm-applicability':['Проверить грунт, глубину и проект откосов','preparation'],
   'need:underground-utilities-and-site-safety':['Проверить подземные сети и безопасность','preparation'],
   'need:site-preparation':['Уточнить предварительную подготовку участка','preparation'],
   'need:setting-out-and-survey':['Подтвердить разбивку и отметки траншеи','setting-out'],
   'need:temporary-water-management':['Согласовать защиту сухой выемки от воды','water-protection'],
   'need:tools-and-consumables':['Проверить инструмент и оснащение','preparation'],
   'need:spoil-balance-and-haul':['Определить использование и вывоз грунта','spoil-logistics'],
   'need:follow-on-work-and-reinstatement':['Учесть последующие работы отдельно','acceptance'],
   'need:acceptance-and-final-cleanup':['Согласовать приёмку и уборку участка','cleanup']}},
};
const rehash=<T extends {row_sha256:string}>(row:T):T=>{const{row_sha256:_old,...body}=row;return {...body,row_sha256:estimateDeterministicHash(body)} as T;};

/** Retained-parent overlay. Source quantities and price-admission gates stay
 * exact; project provision adds no default tool, trip, pressure or rental rate. */
export function remainingThreeProjectResourceCompositionR5(parent:AutomaticOwnerDefinition,key:RemainingThreeResourceKeyR5):AutomaticOwnerDefinition{
 const config=configuration[key],source=matrix.sources[key];
 if(matrix.contract!=='remaining-three-project-resource-composition/r5'||matrix.fullTechnicalAcceptance||matrix.universalConsumptionClaimed)
  throw Error('THREE_RESOURCE_MATRIX_NOT_A_NORM');
 if(parent.resources.some(row=>row.row_id.startsWith('subwork-resource:'+key+'_r5:')))throw Error('THREE_RESOURCE_ALREADY_APPLIED');
 const ownerId=config.prefix+':'+config.owner,owner=parent.resources.find(row=>row.row_id===ownerId);
 const trace=owner?.source_metadata?.normativeTrace;
 if(!owner||owner.resource_graph.costTreatment!=='OWN_COST'||!Array.isArray(trace)||!trace.some(value=>value&&typeof value==='object'
  &&value.sourceId===source.sourceId&&value.normId===source.normId
  &&(value.source_definition_hash??value.source_artifact_sha256)===source.sha256))throw Error('THREE_RESOURCE_EXACT_RETAINED_PARENT_REQUIRED');
 if(!parent.parameters.some(row=>row.parameter_id===config.measure))throw Error('THREE_RESOURCE_MEASURE_REQUIRED');
 const operations=new Map<string,CanonicalEstimateOperationReference>(config.operations.map(([id,title],index)=>[id,{
  contractVersion:'canonical-operation-resource/v1',groupId:config.prefix,groupTitleRu:config.title,
  operationId:config.prefix+':operation:'+id,operationTitleRu:title,processOrdinal:10+index*10,
  completionCriterionRu:'Выполнить по проекту и подтвердить результат; общий труд повторно не распределяется и не оплачивается.'}]));
 const whole:CanonicalEstimateOperationReference={contractVersion:'canonical-operation-resource/v1',groupId:config.prefix,groupTitleRu:config.title,
  operationId:config.prefix+':operation:whole-cycle',operationTitleRu:'Основная работа',completionCriterionRu:'Общий труд включает исходные подработы; дробление количества без подтверждённого распределения запрещено.',
  processOrdinal:0,processRole:'COST_SUMMARY',additionalOperations:config.included.map(id=>({...operations.get(id)!,processRole:'PROCESS' as const}))};
 const resources=parent.resources.map(row=>{
  if(!row.row_id.startsWith(config.prefix+':'))throw Error('THREE_RESOURCE_UNEXPECTED_RETAINED_ROW');
  const suffix=row.row_id.slice(config.prefix.length+1),note=config.notes[suffix];
  if(note&&row.unit_id!=='')throw Error('THREE_RESOURCE_MEASURED_ROW_IS_NOT_A_NOTE');
  const materialKey=key==='hydro'?Object.keys(config.assignment).find(id=>['water','paint','linseed-oil','linen'].includes(id)
   &&(suffix===id||suffix.startsWith(id+':')||suffix===id+'-consumed')):undefined;
  const operationKey=note?.[1]??config.assignment[suffix]??(materialKey?config.assignment[materialKey]:undefined);
  const operation=row.row_id===ownerId?whole:operations.get(operationKey??'preparation')!;
  const naming=(matrix.publicNames[key] as Record<string,{sourceTitleRu:string;nameRu:string;specificationRu:string|null;detailsRu:string[];rowKind?:string}>)[row.row_id];
  if(!naming||naming.sourceTitleRu!==row.title_ru)throw Error('THREE_RESOURCE_PUBLIC_TITLE_SOURCE_CHANGED');
  const graph={...row.resource_graph,operationCompositionV1:operation,
   publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',...naming,
    ...(note?{nameRu:note[0],rowKind:'PROCESS_NOTE'}:{}),brandAndModelRu:null},
   ...(note?{costTreatment:'INFORMATIONAL_SCOPE'}:{})};
  return rehash({...row,resource_graph:graph,...(note?{procurement_eligible:false}:{}),source_metadata:{...row.source_metadata,
   resourceCompositionContract:matrix.contract,noNewNumericalNorm:true,full_technical_acceptance:false}});
 });
 const present=new Set(resources.flatMap(row=>{const op=row.resource_graph.operationCompositionV1 as CanonicalEstimateOperationReference;
  return [op.operationId,...(op.additionalOperations??[]).map(item=>item.operationId)];}));
 const result=appendProjectSubworkResourceScheduleR1({...parent,resources},{key:key+'_r5',sourceSha256:source.sha256,sourceUrl:source.url,
  sourceId:source.sourceId,sourceLocatorRu:source.locatorRu,primaryParameterId:config.measure,active:{kind:'greater_than',parameterId:config.measure,value:0},
  includedOwnerRowId:ownerId,positions:matrix.positions[key] as readonly ProjectSubworkResourcePositionR1[],replacements:{},
  additionalOperations:[...operations.values()].filter(op=>!present.has(op.operationId))});
 if(result.parameters.length>256||result.resources.length>128)throw Error('THREE_RESOURCE_EXISTING_READER_LIMIT');
 return result;
}
