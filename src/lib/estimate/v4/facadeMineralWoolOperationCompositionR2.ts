import {facadeCeresitCt190SuccessorDefinitionR1, facadeCeresitCt190PackR1} from './facadeCeresitCt190MaterialSubworksR1';
import type {AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';
import type {CanonicalEstimateOperationReference} from '../backendPlatform/canonicalEstimateOperationComposition';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
import type {CanonicalPublicResourcePresentationV1} from '../backendPlatform/canonicalPublicResourcePresentationV1';

const groupId='facade:mineral-wool120:operations:r2';
const ct=facadeCeresitCt190PackR1.prefix+':';
const legacy={
 labor:'rc09:facade_mineral_wool_install',board:'rc09:facade_mineral_wool_board_120mm',
 adhesive:'rc09:facade_mineral_wool_adhesive',dowel:'rc09:facade_disc_dowel_200mm_metal_pin',
 lift:'rc09:facade_insulation_lift',control:'rc09:facade_insulation_pullout_control',
 fire:'rc09:mineral_wool_fire_barrier_lamella',profile:'rc09:facade_start_profile',
} as const;

/** Execution steps, rather than buckets of resource categories. Quantities,
 * productivity, labour coverage and prices are not inferred by this graph. */
export const facadeMineralWoolOperationsR2=[
 {key:'preparation',title:'Подготовить основание',order:10,
  criterion:'Основание и проект крепления проверены; объём подготовки и испытаний уточняется по проекту и плану контроля.'},
 {key:'handling',title:'Доставить и поднять материалы к месту работ',order:20,
  criterion:'Условия доставки и подъёма подтверждены ППР. Новые рейсы, смены и повторный подъём автоматически не добавляются.'},
 {key:'start-profile',title:'Установить стартовый профиль',order:30,
  criterion:'Применимость, узел, марка и длина стартового профиля заданы проектом. При варианте «не требуется» отдельная операция не создаётся.'},
 {key:'fire-barrier',title:'Устроить противопожарные рассечки',order:40,
  criterion:'Применимость и узлы рассечек заданы противопожарным проектом; длина и материал берутся из него.'},
 {key:'attachment',title:'Приклеить плиты утеплителя 120 мм',order:50,
  criterion:'Плиты приклеены к принятому основанию. Существующая комплексная расценка монтажа имеет одного владельца; её граница требует проверки, дополнительные часы не начисляются.'},
 {key:'mechanical-fixing',title:'Закрепить утеплитель дюбелями',order:60,
  criterion:'Схема и количество креплений приняты по расчёту ветровых зон; контроль выполнен по проектному плану. Общий труд монтажа повторно не оплачивается.'},
 {key:'base-layer',title:'Нанести защитный слой со стеклосеткой',order:70,
  criterion:'Сетка утоплена в слое; соблюдены условия выбранного паспорта CT190. Труд, раскрой сетки и прочие неподтверждённые ресурсы остаются явными потребностями.'},
] as const;
type Step=typeof facadeMineralWoolOperationsR2[number]['key'];

function operation(key:Step):CanonicalEstimateOperationReference {
 const step=facadeMineralWoolOperationsR2.find(item=>item.key===key)!;
 return {contractVersion:'canonical-operation-resource/v1',groupId,
  groupTitleRu:'Монтаж фасадной минераловатной теплоизоляции 120 мм',
  operationId:groupId+':'+key,operationTitleRu:step.title,
  processOrdinal:step.order,processRole:'PROCESS',completionCriterionRu:step.criterion};
}

const technicalKeys=new Set(['attachment-consumed','base-layer-consumed','dry-mix-consumed','dry-mix-bags',
 'dry-mix-remaining','dry-mix-free','dry-mix-shortage','dry-mix-reserve-deficit','water-min','water-max',
 'process-attachment','process-base-layer']);
const publicNames:Record<string,string>={
 [legacy.labor]:'Работа по монтажу утеплителя', [legacy.board]:'Минеральная вата для фасада, 120 мм',
 [legacy.adhesive]:'Клей для фасадного утеплителя', [legacy.dowel]:'Дюбель для утеплителя, 200 мм, металлический стержень',
 [legacy.lift]:'Подъём материалов на фасад', [legacy.control]:'Проверка прочности крепления дюбелей',
 [legacy.fire]:'Минеральная вата для противопожарных рассечек', [legacy.profile]:'Стартовый профиль для утеплителя',
 'dry-mix-order':'Клей Ceresit CT 190 для утеплителя, мешок 25 кг',
 'water-used':'Вода для приготовления клея', 'open-attachment-labor':'Работа по приклеиванию утеплителя',
 'open-base-layer-labor':'Работа по нанесению защитного слоя', 'open-mesh-layout':'Фасадная стеклосетка',
 'open-mixing-tools':'Инструмент для замешивания и нанесения клея', 'open-delivery':'Доставка клея и воды',
 'open-preparation-protection':'Подготовка основания и защита фасада',
 'open-potlife-clarification':'Время использования приготовленного клея',
};

function presentation(rowId:string,titleRu:string):CanonicalPublicResourcePresentationV1 {
 const key=rowId.startsWith(ct)?rowId.slice(ct.length):rowId;
 const rowKind=technicalKeys.has(key)?'CALCULATION_DETAIL':
  ['open-preparation-protection','open-potlife-clarification','open-attachment-labor'].includes(key)?'PROCESS_NOTE':undefined;
 const note=key==='open-potlife-clarification'?'Перед работой уточнить допустимое время использования приготовленного клея.':
  key==='open-preparation-protection'?'До начала работ проверить основание и условия работы. Необходимость ремонта и защиты фасада уточнить.':
  key==='open-attachment-labor'?'Уточнить, входит ли приклеивание в цену работы по монтажу утеплителя. Повторно эту работу не начислять.':null;
 if(!rowKind&&!publicNames[key])throw Error('FACADE_PUBLIC_RESOURCE_NAME_UNMAPPED:'+rowId);
 return {contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:titleRu,
  nameRu:publicNames[key]??titleRu,brandAndModelRu:null,
  specificationRu:key==='dry-mix-order'?'Ceresit CT 190, исполнение KZ, мешок 25 кг. Цена указывается за кг.':null,
  detailsRu:note?[note]:[],...(rowKind?{rowKind}:{})};
}
function related(key:Step):CanonicalEstimateOperationReference {
 return {...operation(key),...(key==='start-profile'?{whenResourcePresent:[legacy.profile]}:
  key==='fire-barrier'?{whenResourcePresent:[legacy.fire]}:{})};
}

function links(rowId:string):{owner:Step;shared:Step[]} {
 if(rowId===legacy.labor)return {owner:'attachment',shared:['start-profile','fire-barrier','mechanical-fixing']};
 if(rowId===legacy.board||rowId===legacy.adhesive)return {owner:'attachment',shared:[]};
 if(rowId===legacy.dowel)return {owner:'mechanical-fixing',shared:[]};
 if(rowId===legacy.lift)return {owner:'handling',shared:['start-profile','fire-barrier','attachment','mechanical-fixing']};
 if(rowId===legacy.control)return {owner:'preparation',shared:['mechanical-fixing']};
 if(rowId===legacy.profile)return {owner:'start-profile',shared:[]};
 if(rowId===legacy.fire)return {owner:'fire-barrier',shared:[]};
 if(!rowId.startsWith(ct))throw Error('FACADE_OPERATION_RESOURCE_UNMAPPED:'+rowId);
 const key=rowId.slice(ct.length);
 if(key==='base-layer-consumed'||key==='process-base-layer'||key==='open-base-layer-labor'||key==='open-mesh-layout')return {owner:'base-layer',shared:[]};
 if(key.startsWith('dry-mix-')||key.startsWith('water-')||key==='open-mixing-tools')return {owner:'attachment',shared:['base-layer']};
 if(key==='open-delivery')return {owner:'handling',shared:['attachment','base-layer']};
 if(key==='open-preparation-protection'||key==='open-potlife-clarification')return {owner:'preparation',shared:['attachment','base-layer']};
 if(['attachment-consumed','process-attachment','open-attachment-labor'].includes(key))return {owner:'attachment',shared:[]};
 throw Error('FACADE_OPERATION_RESOURCE_UNMAPPED:'+rowId);
}

/** A successor of the existing passport. Old definitions and saved revisions
 * keep their complete original graphs. Every old/new resource is assigned to
 * an execution step; shared references never clone a row or its cost owner. */
export function facadeMineralWoolOperationCompositionR2():AutomaticOwnerDefinition {
 const previous=facadeCeresitCt190SuccessorDefinitionR1();
 const resources=previous.resources.map(resource=>{
  const binding=links(resource.row_id);
  const {row_sha256:_previousHash,...body}=resource;
  const changed={...body,resource_graph:{...resource.resource_graph,
   operationCompositionV1:{...operation(binding.owner),additionalOperations:binding.shared.map(related)},
   publicResourcePresentationV1:presentation(resource.row_id,resource.title_ru),
   ...(resource.row_id===legacy.labor?{operationCostBoundaryNoteRu:
    'Сохранённая комплексная расценка монтажа относится к прежнему паспорту. Деление её оплаты между подработами и дополнительные трудозатраты не подтверждены; повторное начисление запрещено.'}:{}),
  }};
  return {...changed,row_sha256:estimateDeterministicHash(changed)};
 });
 return {...previous,resources};
}
