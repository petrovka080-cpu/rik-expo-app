import {strict as assert} from 'node:assert';
import type {CanonicalPublisherJson as Json} from './canonicalDefinitionPublisherR1';
import type {CanonicalEstimateOperationReference as Operation} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition';

export const foundationSpecialWorkflowThreeContractR1='rik-expo-app.foundation-special3-subwork-layout.r1';
type Stage={key:string;title:string};
const slabStages:Stage[]=[
 {key:'site',title:'Подготовка рабочей зоны'},
 {key:'setting-out',title:'Разбивка осей и контроль отметок'},
 {key:'boundary',title:'Монтаж и снятие временного ограждения'},
 {key:'excavation',title:'Разработка котлована и вывоз грунта'},
 {key:'geotextile',title:'Раскладка и фиксация разделительного геотекстиля'},
 {key:'drainage',title:'Устройство и контроль дренажа'},
 {key:'base',title:'Устройство песчано-щебёночного основания'},
 {key:'blinding',title:'Устройство бетонной подготовки'},
 {key:'waterproofing',title:'Устройство гидроизоляции'},
 {key:'insulation',title:'Укладка утеплителя XPS'},
 {key:'formwork',title:'Сборка, закрепление и распалубка'},
 {key:'reinforcement',title:'Изготовление и сборка арматурных сеток'},
 {key:'embeds',title:'Установка гильз, закладных и заземления'},
 {key:'placing',title:'Приём, укладка, уплотнение и отделка бетона плиты'},
 {key:'curing',title:'Устройство и поддержание системы ухода за бетоном'},
 {key:'quality',title:'Контроль поставок, укладки и испытаний'},
 {key:'repair',title:'Подготовка и локальный ремонт дефектов'},
 {key:'backfill',title:'Обратная засыпка и послойное уплотнение'},
 {key:'cleanup',title:'Уборка и вывоз строительных отходов'},
 {key:'demobilization',title:'Демобилизация временного обеспечения'},
];
const stripStages:Stage[]=[
 {key:'preparation',title:'Подготовка захватки и безопасной рабочей зоны'},
 {key:'receiving',title:'Приём бетонной смеси и поставка бетона'},
 {key:'placing',title:'Подача, укладка и распределение бетонной смеси'},
 {key:'consolidation',title:'Послойное виброуплотнение бетонной смеси'},
 {key:'finishing',title:'Выравнивание и отделка поверхности бетона'},
 {key:'curing-install',title:'Укрытие бетона плёнкой для ухода'},
 {key:'curing-maintain',title:'Контроль и поддержание защиты бетона'},
 {key:'curing-remove',title:'Снятие плёнки после ухода за бетоном'},
 {key:'joint',title:'Устройство рабочего шва с гидрошпонкой'},
 {key:'laboratory',title:'Отбор проб и лабораторные испытания бетона'},
 {key:'acceptance',title:'Приёмочный контроль и исполнительная документация'},
];
const stripRows:Readonly<Record<string,readonly string[]>>={
 preparation:['organization:work-zone','quality:pre-pour'],
 receiving:['work:receive','material:ready-mix','delivery:mixer-trips','quality:delivery-acceptance','document:delivery-tickets'],
 placing:['work:place','equipment:pump','included:pump-operator','included:pump-pipeline','included:pump-consumables','logistics:pump-mobilization','logistics:pump-setup'],
 consolidation:['work:consolidate','equipment:vibrator','included:vibrator-operator','included:vibrator-consumables','equipment:reserve-vibrator','logistics:vibrator-mobilization','quality:consolidation'],
 finishing:['work:finish-surface'],
 'curing-install':['work:install-curing','material:curing-sheet'],
 'curing-maintain':['work:maintain-curing'],
 'curing-remove':['work:remove-curing'],
 joint:['joint:install-waterstop','joint:waterstop'],
 laboratory:['quality:sampling','quality:slump','quality:temperature','quality:specimens','quality:specimen-care','quality:compression','document:lab-protocols'],
 acceptance:['quality:geometry','document:pour-log','document:execution-set'],
};
const stripStageByRow=new Map(Object.entries(stripRows).flatMap(([stage,ids])=>ids.map(id=>['strip-pour:'+id,stage] as const)));
assert.equal(stripStageByRow.size,38);

function slabStage(rowId:string):string{
 const match=/^slab-full:(\d{2}):/u.exec(rowId);assert(match,'EXACT_SLAB_RESOURCE_PREFIX_REQUIRED');
 switch(match[1]){
  case '01':return rowId.endsWith('operation:site-preparation')?'site':/:(material:survey-stakes|material:marking-cord|labor:setting-out|equipment:survey-kit)$/u.test(rowId)?'setting-out':'boundary';
  case '02':return 'excavation';
  case '03':return rowId.includes('geotextile')?'geotextile':'drainage';
  case '04':return 'base';
  case '05':return 'blinding';
  case '06':return rowId.includes('xps')||rowId.endsWith('labor:insulation')?'insulation':'waterproofing';
  case '07':return 'formwork';
  case '08':return /:(component:pvc-sleeves|component:grounding-strip|component:grounding-connectors|labor:embeds)$/u.test(rowId)?'embeds':'reinforcement';
  case '09':return 'placing';
  case '10':return 'curing';
  case '11':return 'quality';
  case '12':return rowId.includes('repair')?'repair':/(selected-backfill-soil|labor:backfill|equipment:compactor)$/u.test(rowId)?'backfill':rowId.endsWith('service:demobilization')?'demobilization':'cleanup';
  default:throw new Error('UNKNOWN_SLAB_STAGE:'+rowId);
 }
}

/** Declare relationships on the exact saved models. No resources, quantities,
 * payment owners, transport alternatives or physical ordinals are changed. */
export function buildFoundationSpecialWorkflowThreeR1(parent:Json){
 const catalogId=String(parent.definition.catalog_id),slab=/_slab_foundation_pour_(standard|repair)$/u.test(catalogId);
 assert(slab||catalogId.endsWith('_strip_foundation_pour_large_area'),'EXACT_SPECIAL3_TARGET_REQUIRED');
 const expectedVersion=slab?(catalogId.endsWith('_repair')?10:9):9;
 assert.equal(parent.definition.definition_version,expectedVersion);
 assert.equal(parent.resources.length,slab?109:38);assert.equal(parent.formulas.length,slab?127:16);assert.equal(parent.parameters.length,slab?83:26);
 const stages=slab?slabStages:stripStages,resources:Json[]=structuredClone(parent.resources),stageCounts:Record<string,number>={};
 for(const r of resources){
  assert.equal(r.resource_graph.operationCompositionV1,undefined,'EXISTING_OPERATION_RELATIONSHIPS_MUST_NOT_BE_REPLACED');
  const key=slab?slabStage(r.row_id):stripStageByRow.get(r.row_id);assert(key,'EXACT_STRIP_RESOURCE_REQUIRED:'+r.row_id);
  const index=stages.findIndex(s=>s.key===key);assert(index>=0);const stage=stages[index]!;
  const operation:Operation={contractVersion:'canonical-operation-resource/v1',
   groupId:slab?'slab-foundation-full-cycle':'strip-foundation-placement',
   groupTitleRu:slab?'Устройство монолитного плитного фундамента':'Бетонирование ленточного фундамента',
   operationId:(slab?'slab-full:operation:':'strip-pour:operation:')+key,
   operationTitleRu:stage.title,processOrdinal:index+1,processRole:'PROCESS',
   completionCriterionRu:'Выполнить и проверить этап по сохранённому составу работ и подтверждённым проектным данным.'};
  r.resource_graph={...r.resource_graph,operationCompositionV1:operation};stageCounts[key]=(stageCounts[key]??0)+1;
 }
 assert.deepEqual(Object.keys(stageCounts).sort(),stages.map(s=>s.key).sort());
 if(slab)assert.deepEqual(stageCounts,{site:1,'setting-out':4,boundary:4,excavation:6,geotextile:5,drainage:7,base:8,blinding:6,waterproofing:8,insulation:5,formwork:9,reinforcement:8,embeds:4,placing:9,curing:8,quality:4,repair:6,backfill:3,cleanup:3,demobilization:1});
 const withoutOperation=(r:Json)=>({...r,resource_graph:Object.fromEntries(Object.entries(r.resource_graph).filter(([k])=>k!=='operationCompositionV1'))});
 assert.deepEqual(resources.map(withoutOperation),parent.resources,'WORKFLOW_METADATA_CHANGED_STORED_RESOURCE_MEANING');
 return {catalogId,parameters:structuredClone(parent.parameters) as Json[],formulas:structuredClone(parent.formulas) as Json[],resources,
  primaryMeasureParameterId:slab?'slab_area_m2':'plan_dimension_concrete_volume_m3',stageCounts};
}
