import {
  buildAutomaticConstructionOwnerR1, compileAutomaticConstructionOwnerR1,
  type AutomaticParameterSpec, type AutomaticRowSpec,
} from './automaticConstructionOwnerR1';
import { effectivePurchaseBalanceExpressionsR1 } from './effectivePurchaseBalanceR1';
import { estimateDeterministicHash } from '../estimateDeterministicHash';
import sourcePack from '../../../../data/estimate-benchmarks/source-packs/gypsum-pgp-c411-s27-36.json';

export const PGP_C411_WORK_KEY_S2736 = 'masonry_interior_gypsum_pgp_c411_100mm_mount_standard';
export const PGP_C411_CATALOG_S2736 = 'canonical-work:master:' + PGP_C411_WORK_KEY_S2736;
export const PGP_C411_CONTRACT_S2736 = 'gypsum-pgp-c411:s27-36.v1';
export const PGP_C411_SOURCE_ID_S2736 = 'src_gypsum_pgp_c411_s27_36';
export const PGP_C411_NORM_ID_S2736 = 'project:gypsum-pgp:c411:s27-36.v1';
const sourceHash = '5b2646d8009daacf4e4e3f5216d6a60c49226e9cfd27fef01ae02dd6fb88ed53';
export const PGP_C411_SOURCE_METADATA_S2736 = {
  source_title: 'КНАУФ C411: стандартная ПГП100мм, эластичные примыкания, монтаж и местные швы',
  source_authority: 'КНАУФ C411 и Фуген07/2025; КРЕР08-04-001-09; открытый план поставки и оснащения',
  source_document_version: PGP_C411_CONTRACT_S2736, definition_hash: sourceHash, artifact_sha256: sourceHash,
  exact_locator: 'source-packs/gypsum-pgp-c411-s27-36.json; Фуген PDFстр.2/4,1.5кг/м²; КРЕР08 PDFстр.52/54,колонка09,100м²',
  use_restriction: 'Предварительно прямая одинарная стандартная ПГП667×500×100мм в сухом помещении, без проёмов и свободного торца, на готовом ровном минеральном основании. Высота и длина, несущая способность перекрытия, раскладка, крепления, верхний зазор и совместимость узлов требуют проекта. Фуген1.5кг/м² — ориентир текущей редакции на монтаж и местные швы, без гарантии для произвольных примыканий; дополнительная смесь задаётся по их проверке. Потери5%, шаг скоб1м, отсутствие наличия/резерва и поштучная поставка — видимые предварительные планы, не нормы производителя. Исторический труд включает выравнивание основания; его применимость при готовом основании и современные материалы подтверждаются отдельно. Кран/автомобиль не заменены придуманной ручной производительностью; оператор и энергия включаются в машинную ставку. Оснащение подрядчика включено в труд. Доставка до объекта, внешний вывоз, сплошная шпаклёвка, окраска и грунтование под финиш — отдельные операции.',
};
if (sourcePack.contract !== PGP_C411_CONTRACT_S2736 || sourcePack.fugen.mounting_kg_per_partition_m2 !== 1.5 ||
  sourcePack.krer.rates_per_100_partition_m2.worker_man_hour !== 110.71) throw Error('PGP_C411_SOURCE_DRIFT');

const profile = (id: string, title: string, valueType: AutomaticParameterSpec['valueType'], unitId: string | null,
  defaultValue: string | number, extra: Partial<AutomaticParameterSpec> = {}): AutomaticParameterSpec =>
  ({id, title, valueType, unitId, kind: 'profile', defaultValue, ...extra});
const confirmed = {kind: 'equals' as const, parameterId: 'applicability_mode', value: 'CONFIRMED_PROJECT_FACTS'};
const facts = {
  pgp_geometry_and_system_confirmed: 'Подтверждены сухая стандартная ПГП100мм, геометрия без проёмов/свободного торца и допустимость высоты/нагрузки на перекрытие',
  pgp_junctions_and_glue_confirmed: 'Проект подтвердил эластичные узлы, скобы/крепёж, верхний зазор, расход Фуген и дополнительную смесь на примыкания;1.5кг/м² не гарантированный расход любого узла',
  pgp_ready_substrate_and_krer_confirmed: 'Готовое ровное основание проверено; применимость КРЕР08-04-001-09, включая отличие от выравнивания основания, и исторических крана/автомобиля подтверждена',
  pgp_delivery_and_cost_owners_confirmed: 'Поставка, потери, пригодное наличие/резерв, покрытие операторов/энергии машинными ставками и оснащения трудом подтверждены; внешняя доставка/вывоз вне этапа',
};
const factIds = Object.keys(facts);
const inputs = ['applicability_mode', ...factIds];
const parameters: AutomaticParameterSpec[] = [
  {id: 'area_m2', title: 'Чистая площадь прямой ПГП по одной стороне, без двойного подсчёта', valueType: 'decimal', unitId: 'm2', kind: 'ordinary', min: 0.001},
  profile('applicability_mode', 'Предварительный профиль ПГП либо подтверждённые условия объекта', 'enum', null, 'PRELIMINARY_PROFILE', {values: ['PRELIMINARY_PROFILE', 'CONFIRMED_PROJECT_FACTS']}),
  profile('pgp_height_m', 'Предварительная высота2.75м; длина=площадь/высота, допустимость подтвердить проектом', 'decimal', 'm', 2.75, {min: 1, max: 3.6, numericPeerConstraints: {lessThanOrEqualParameter: 'pgp_floor_height_m'}}),
  profile('pgp_floor_height_m', 'Предварительная высота этажа2.75м для КРЕР08-04-001-09; это отдельное условие от высоты перегородки', 'decimal', 'm', 2.75, {min: 1, max: 4}),
  profile('pgp_plate_loss_fraction', 'Предварительный план боя/раскроя ПГП5%; не норма производителя, заменить по раскладке', 'decimal', 'ratio', 0.05, {min: 0, max: 1}),
  profile('pgp_bracket_step_m', 'Предварительный шаг скоб по периметру1м; проектный план, не опубликованный предельный шаг', 'decimal', 'm', 1, {min: 0.1, max: 1}),
  profile('pgp_extra_junction_glue_kg', 'Дополнительная сухая смесь на проверенные примыкания; предварительно0, текущие1.5кг/м² не гарантируют любой верхний зазор', 'decimal', 'kg', 0, {min: 0}),
  profile('pgp_fugen_water_l_kg', 'Вода фактически замешиваемого Фуген: предварительно0.65л/кг, паспорт0.6–0.7', 'decimal', 'l_per_kg', 0.65, {min: 0.6, max: 0.7}),
  profile('pgp_cleaning_water_l_m2', 'Предварительный план мойки0.1л/м²; не опубликованная норма', 'decimal', 'l_per_m2', 0.1, {min: 0}),
  profile('pgp_water_delivery_l', 'Предварительная кратность подачи воды5л, заменить по поставке', 'decimal', 'l', 5, {min: 0.001}),
  profile('pgp_cork_delivery_m', 'Предварительная поставка пробковой полосы по1м; длина рулона поставщика не подтверждена', 'decimal', 'm', 1, {min: 0.001}),
  ...Object.entries(facts).map(([id,title]) => ({id,title,valueType: 'enum' as const,unitId:null,kind:'conditional' as const,requiredWhen:confirmed,values:['YES']})),
];
const rows: AutomaticRowSpec[] = [];
const stage = new Map<string,string>();
const add = (row: AutomaticRowSpec, operation: string) => {rows.push(row);stage.set(row.rowId,operation);};
const length = '(area_m2/pgp_height_m)';
const perimeter = `2*(${length}+pgp_height_m)`;
const brackets = `max(ceil(area_m2),2*ceil(${length}/pgp_bracket_step_m)+2*max(3,ceil(pgp_height_m/pgp_bracket_step_m)+1))`;
const mountingPowder = 'area_m2*1.5';
const powder = `(${mountingPowder}+pgp_extra_junction_glue_kg)`;
for (const [key,title,unit,expression] of [
  ['area','Чистая площадь ПГП по одной стороне; норма труда по этой площади','m2','area_m2'],
  ['length','Длина прямой ПГП из площади и выбранной высоты','m',length],
  ['perimeter','Примыкания к полу, потолку и двум стенам; свободного торца нет','m',perimeter],
  ['plate-net','ПГП667×500мм: теоретическая потребность до проекта боя/раскроя','piece','area_m2/(0.667*0.5)'],
] as const) add({rowId:'scope:pgp:'+key,formulaId:'pgp_scope_'+key.replaceAll('-','_')+'_v1',section:'Геометрия ПГП',category:'service',title,unitId:unit,expression,costTreatment:'INFORMATIONAL_SCOPE',inputParameterIds:inputs},'PREPARE');

function supply(key: string, title: string, unit: string, consumed: string, quantum: string, operation: string) {
  const rowId = 'material:pgp:'+key, prefix = 'pgp_'+key.replaceAll('-','_');
  const type = unit==='piece'?'integer':'decimal';
  parameters.push(profile(prefix+'_stock',title+': предварительно пригодное наличие0; обрезки/мокрая смесь не целые плиты/сухой Фуген',type,unit,0,{min:0}),
    profile(prefix+'_reserve',title+': предварительно сохраняемый совместимый резерв0',type,unit,0,{min:0}));
  add({rowId,formulaId:prefix+'_order_v1',section:'Материалы ПГП',category:'material',title,unitId:unit,
    expression:`ceil(max(0,(${consumed})+${prefix}_reserve-${prefix}_stock)/(${quantum}))*(${quantum})`,procurement:true,
    ...effectivePurchaseBalanceExpressionsR1({ownerRowId:rowId,orderUnitId:unit,consumed,stock:prefix+'_stock',reserve:prefix+'_reserve',quantum}).owner,
    inputParameterIds:inputs},operation);
}
supply('plate','КНАУФ-гипсоплита стандарт667×500×100мм, целые штуки; бой/раскрой по видимому плану, не по неподтверждённой паллете','piece','ceil(area_m2/(0.667*0.5)*(1+pgp_plate_loss_fraction))','1','MOUNT');
supply('fugen','КНАУФ-Фуген07/2025, мешок5кг: ориентир1.5кг/м² на монтаж и местные швы плюс проверенные примыкания; не сплошной финиш','kg',powder,'5','MOUNT');
supply('cork','Пробковая эластичная полоса100×5мм, плотность250кг/м³; по действительному периметру, совместимость и поставку подтвердить','m',perimeter,'pgp_cork_delivery_m','JUNCTION');
supply('bracket','Скоба С1 для ПГП, оцинкованная1×20×215мм; ориентирC411 и видимый предварительный периметральный план','piece',brackets,'1','JUNCTION');
supply('tn35','КНАУФ шуруп TN35,3.5×35мм: пять на выбранную скобу по соотношениюC411; схема крепления и фасовка требуют подтверждения','piece',`5*(${brackets})`,'1','JUNCTION');
supply('dowel','Дюбель-гвоздь6×40 для подтверждённого минерального основания; пять на выбранную скобу по соотношениюC411, фасовка не назначена','piece',`5*(${brackets})`,'1','JUNCTION');
supply('water','Чистая холодная вода для частичных замесов Фуген и мойки; один совместимый заказ','l',`${powder}*pgp_fugen_water_l_kg+area_m2*pgp_cleaning_water_l_m2`,'pgp_water_delivery_l','MOUNT');
for(const [key,title,expression] of [
  ['mount','Сухой Фуген на монтаж и местные швы; включён в один заказ','area_m2*1.5'],
  ['junction','Дополнительный сухой Фуген на примыкания; включён в тот же заказ','pgp_extra_junction_glue_kg'],
] as const) add({rowId:'allocation:pgp:fugen:'+key,formulaId:'pgp_fugen_allocation_'+key+'_v1',section:'Распределение Фуген',category:'material',title,unitId:'kg',expression,costTreatment:'INCLUDED_IN_RESOURCE_ROWS',procurement:false,purchaseBalanceOwnerRowId:'material:pgp:fugen'},key==='mount'?'MOUNT':'JUNCTION');
for(const [key,title,expression] of [
  ['mix','Вода фактически замешиваемой потребности Фуген, без воды на сухой резерв/остаток',`${powder}*pgp_fugen_water_l_kg`],
  ['clean','Вода мойки по открытому плану объекта','area_m2*pgp_cleaning_water_l_m2'],
] as const) add({rowId:'allocation:pgp:water:'+key,formulaId:'pgp_water_allocation_'+key+'_v1',section:'Распределение воды',category:'material',title,unitId:'l',expression,costTreatment:'INCLUDED_IN_RESOURCE_ROWS',procurement:false,purchaseBalanceOwnerRowId:'material:pgp:water'},'MOUNT');
for(const [key,title,category,unit,rate] of [
  ['worker','Рабочие-строители,разряд3.8: КРЕР08-04-001-09,110.71чел.-ч/100м²; применимость подготовленного основания проверить','labor','man_hour',110.71],
  ['crane','Кран башенный8т: КРЕР08-04-001-09,1.95маш.-ч/100м²; оператор/энергия включаются в ставку, применимость подтвердить','equipment','machine_hour',1.95],
  ['truck','Автомобиль бортовой5т: КРЕР08-04-001-09,0.99маш.-ч/100м²; в границе нормы, внешняя доставка не включена','equipment','machine_hour',0.99],
] as const) add({rowId:'work:pgp:'+key,formulaId:'pgp_krer_'+key+'_v1',section:'Единый труд и машины монтажа ПГП',category,title,unitId:unit,expression:`area_m2*${rate}/100`,inputParameterIds:[...inputs,'pgp_floor_height_m']},'MOUNT');
add({rowId:'allocation:pgp:machinist',formulaId:'pgp_krer_machinist_v1',section:'Оператор включён в машины',category:'labor',title:'Машинист1.95чел.-ч/100м² по КРЕР; включён в полную стоимость крана и отдельно не оплачивается',unitId:'man_hour',expression:'area_m2*1.95/100',costTreatment:'INCLUDED_IN_RESOURCE_ROWS',procurement:false,inputParameterIds:inputs},'MOUNT');
const tools = [
  ['laser','Лазерный нивелир разметки','PREPARE'],['measure','Рулетка','PREPARE'],['level','Строительный уровень','MOUNT'],
  ['saw','Ручная ножовка для гипсовой ПГП','MOUNT'],['plane','Рубанок снятия гребня и подрезки верхнего ряда','MOUNT'],
  ['mallet','Резиновая киянка','MOUNT'],['bucket','Чистая ёмкость частичного замеса Фуген','MOUNT'],
  ['trowel','Нержавеющая шпатель-кельма замеса и нанесения','MOUNT'],['joint-spatula','Нержавеющий шпатель заделки местных стыков','MOUNT'],
  ['drill','Перфоратор креплений к проверенному основанию','JUNCTION'],['drill-bit','Бур6мм для выбранного дюбеля','JUNCTION'],
  ['driver','Шуруповёрт креплений скоб','JUNCTION'],['ph2','Бита PH2 под TN35','JUNCTION'],
  ['cork-knife','Нож раскроя пробковой полосы','JUNCTION'],['access','Подмости доступа, подбор по ППР','MOUNT'],
  ['gloves','Одна пара химстойких защитных перчаток','MOUNT'],['eye-protection','Защитные очки','MOUNT'],
  ['dust-protection','Подобранный противопылевой респиратор','MOUNT'],['vacuum','Строительный пылесос очистки','PREPARE'],
  ['dust-bag','Совместимый пылесборный мешок','PREPARE'],['waste-bag','Мешок сбора отходов на рабочем месте','MOUNT'],
] as const;
for(const [key,title,operation] of tools){
  const parameter='pgp_tool_'+key.replaceAll('-','_')+'_required';
  parameters.push(profile(parameter,title+': предварительно1 единица подрядчика, учесть в трудовой ставке; не расходная норма','integer','piece',1,{min:0}));
  add({rowId:'tool:pgp:'+key,formulaId:parameter+'_v1',section:'Оснащение подрядчика, включено в труд',category:'material',title:title+'; предоставляет подрядчик с включением в ставку',unitId:'piece',expression:parameter,costTreatment:'INCLUDED_IN_RESOURCE_ROWS',procurement:false,inputParameterIds:inputs},operation);
}
const built = buildAutomaticConstructionOwnerR1({contract:PGP_C411_CONTRACT_S2736,semanticOwner:'gypsum-pgp-c411',sourceId:PGP_C411_SOURCE_ID_S2736,normId:PGP_C411_NORM_ID_S2736,
  sourceMetadata:PGP_C411_SOURCE_METADATA_S2736,applicabilityRu:PGP_C411_SOURCE_METADATA_S2736.use_restriction,
  ordinary:parameters.filter(p=>p.kind==='ordinary'),profile:parameters.filter(p=>p.kind==='profile'),conditional:parameters.filter(p=>p.kind==='conditional'),rows,deferMissingProjectFactsToRows:true,
  excludedUnownedAssumptions:['Проёмы, перемычки, штрабы и свободные торцы','Гидрофобная/двойная/80мм ПГП','Выравнивающий раствор на негоризонтальном основании','Сплошная шпаклёвка, окраска и финишное грунтование','Инженерное утверждение акустики/огнестойкости/высоты','Историческая норма материала и цена вместо выбранного продукта','Неподтверждённая паллета и целые плиты из обрезков','Доставка на объект и внешний вывоз']});
const operationTitles:Record<string,string>={PREPARE:'Геометрия, готовность и очистка',MOUNT:'Монтаж ПГП и местные стыки',JUNCTION:'Эластичные примыкания и крепления'};
export const PGP_C411_DEFINITION_S2736 = Object.freeze({...built,resources:built.resources.map(row=>{
  const includedOwner = row.row_id.startsWith('allocation:pgp:fugen:')?'material:pgp:fugen':row.row_id.startsWith('allocation:pgp:water:')?'material:pgp:water':row.row_id==='allocation:pgp:machinist'?'work:pgp:crane':row.row_id.startsWith('tool:')?'work:pgp:worker':null;
  const primary = row.row_id.startsWith('work:')||row.row_id==='allocation:pgp:machinist'?sourcePack.krer:
    /fugen|water/.test(row.row_id)?sourcePack.fugen:row.row_id==='material:pgp:plate'?sourcePack.product:
      row.row_id==='material:pgp:cork'||row.row_id==='material:pgp:bracket'?sourcePack.legacy_geometry:sourcePack.system;
  const resource={...row,source_metadata:{...row.source_metadata,engineeringApprovalClaimed:false,manufacturerSourcePackSha256:sourceHash,normReplacementApprovalRequired:true,
    normativeTrace:[{source_id:PGP_C411_SOURCE_ID_S2736,norm_id:PGP_C411_NORM_ID_S2736,source_title:PGP_C411_SOURCE_METADATA_S2736.source_title,source_definition_hash:sourceHash,exact_locator:primary.locator,source_url:primary.url}],
    physicalQuantityBasis:row.row_id.startsWith('tool:')?'VISIBLE_CONTRACTOR_PLAN_INCLUDED_IN_LABOR':'VISIBLE_GEOMETRY_AND_PRELIMINARY_PGP_PROFILE',
    historicMaterialRatesNotImported:true,wholeSurfacePrimerNotAssigned:true},resource_graph:{...row.resource_graph,
      operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:'gypsum-pgp-c411',groupTitleRu:'Одинарная ПГП100мм, монтаж из совместимых операций',operationId:(stage.get(row.row_id)||'MOUNT').toLowerCase(),operationTitleRu:operationTitles[stage.get(row.row_id)||'MOUNT'],completionCriterionRu:'Подтвердить раскладку, примыкания, основание, поставку и применимость труда; декоративная отделка отдельным этапом'},
      ...(includedOwner?{includedInResourceOwnerRowId:includedOwner}:{}),
      ...(row.row_id.startsWith('allocation:pgp:fugen:')||row.row_id.startsWith('allocation:pgp:water:')?{purchaseConsumptionAllocationV1:{contractVersion:'canonical-purchase-consumption-allocation/v1',ownerRowId:includedOwner}}:{})}};
  return {...resource,row_sha256:estimateDeterministicHash({...resource,row_sha256:''})};
})});
export function compileGypsumPgpC411S2736(submittedParameters:Record<string,unknown>){
  return compileAutomaticConstructionOwnerR1({compilerVersion:PGP_C411_CONTRACT_S2736,catalogId:PGP_C411_CATALOG_S2736,primaryMeasureParameterId:'area_m2',definition:PGP_C411_DEFINITION_S2736,submittedParameters});
}
