import {
  buildAutomaticConstructionOwnerR1, compileAutomaticConstructionOwnerR1,
  type AutomaticParameterSpec, type AutomaticRowSpec, type AutomaticInclusionCondition,
} from './automaticConstructionOwnerR1';
import { effectivePurchaseBalanceExpressionsR1 } from './effectivePurchaseBalanceR1';
import { interiorFinishesDomainFactory } from './domains/interiorFinishesComplete/domainPackage';
import { INTERIOR_FINISHES_DOMAIN_INVENTORY } from './domains/interiorFinishesComplete/inventory';
import { estimateDeterministicHash } from '../estimateDeterministicHash';
import sourcePack from '../../../../data/estimate-benchmarks/source-packs/drywall-partition-c111-s27-36.json';

export const C111_WORK_KEY_S2736 = 'drywall_ceiling_interior_drywall_partition_install_standard';
export const C111_CATALOG_S2736 = 'canonical-work:base:' + C111_WORK_KEY_S2736;
export const C111_CONTRACT_S2736 = 'drywall-partition-c111:s27-36.v1';
export const C111_SOURCE_ID_S2736 = 'src_drywall_partition_c111_s27_36';
export const C111_NORM_ID_S2736 = 'project:drywall-partition:c111:s27-36.v1';
const sourceHash = 'b981d031cc05ca11e41bc6800afb0fc9f6f482110e7befb67fc4d20612f3e107';
export const C111_SOURCE_METADATA_S2736 = {
  source_title: 'C111: каркас, однослойная обшивка обеих сторон, изоляция, Q1 и грунтование',
  source_authority: 'КНАУФ C11 02/2025, Фуген 07/2025, Тифенгрунд 06/2026 и выбранные изделия; КРЕР10-05-001-01; открытый план объекта',
  source_document_version: C111_CONTRACT_S2736, definition_hash: sourceHash, artifact_sha256: sourceHash,
  exact_locator: 'КНАУФ C11 PDFстр.4 C111; Фуген PDFстр.2–3 Q1 на каждую сторону; КРЕР10 PDFстр.123–124 колонка10-05-001-01,100м²; source-packs/drywall-partition-c111-s27-36.json',
  use_restriction: 'Предварительно прямая сухая перегородка без проёмов: один слой ГСП-А12.5мм на каждой стороне, ПН/ПС50, цельные листы/стойки3м, высота до3м. Стыки сторон смещены на600мм, половинные полосы используются внутри раскроя. Q1 и неразбавленное грунтование под последующий непокрасочный финиш. Не сплошная шпаклёвка, окраска, сертифицированная огнестойкость/звукоизоляция или влажная зона. Материалы уже на рабочем месте; отдельная доставка/вывоз за пределами профиля. Оснащение, доступ и расходники предоставляет подрядчик с включением в ставку. Геометрия, крепления, применимость исторического труда при современных материалах и покрытие расходов ставкой подтверждаются по проекту. Обрезки не становятся целыми изделиями на складе.',
};
if (sourcePack.contract !== C111_CONTRACT_S2736 || sourcePack.fugen.q1_kg_per_cladding_face_m2 !== 0.25 ||
  sourcePack.krer.rates_per_100_partition_m2.worker_man_hour !== 98) throw Error('C111_SOURCE_DRIFT');

const operations = ['FRAME', 'CLAD', 'INSULATE', 'FINISH_JOINT'] as const;
const readyAssemblies = operations.map(operation => {
  const work = 'drywall_ceiling_interior_drywall_partition_' + operation.toLowerCase() + '_standard';
  const inventory = INTERIOR_FINISHES_DOMAIN_INVENTORY.find(row => row.work_key === work);
  const technology = inventory && interiorFinishesDomainFactory.technology_by_id.get(inventory.canonical_technology_id);
  const assembly = technology && interiorFinishesDomainFactory.assembly_profile_by_id.get(technology.assembly_profile_id);
  if (!inventory || !assembly) throw Error('C111_READY_OPERATION_MISSING:' + work);
  return { operation, inventory, assembly };
});
export const C111_READY_OPERATIONS_S2736 = readyAssemblies.map(({operation, inventory, assembly}) => ({
  operation, workKey: inventory.work_key, assemblyProfileId: assembly.assembly_profile_id,
  sourceRows: assembly.child_assemblies.flatMap(child => child.rows).map(row => row.row_id),
}));
const ready = (operation: typeof operations[number], candidate: string) => {
  const owner = readyAssemblies.find(item => item.operation === operation)!;
  const row = owner.assembly.child_assemblies.flatMap(child => child.rows).find(item => item.row_id.endsWith(':row:' + candidate));
  if (!row) throw Error('C111_READY_RESOURCE_MISSING:' + candidate);
  return row;
};
const profile = (id: string, title: string, valueType: AutomaticParameterSpec['valueType'], unitId: string | null,
  defaultValue: string | number, extra: Partial<AutomaticParameterSpec> = {}): AutomaticParameterSpec =>
  ({ id, title, valueType, unitId, kind: 'profile', defaultValue, ...extra });
const eq = (parameterId: string, value: string): AutomaticInclusionCondition => ({kind: 'equals', parameterId, value});
const confirmed = eq('applicability_mode', 'CONFIRMED_PROJECT_FACTS');
const insulated = eq('c111_insulation_mode', 'AKUSTIKNAUF_50');
const facts = ['c111_straight_no_openings_confirmed', 'c111_dry_single_layer_system_confirmed',
  'c111_anchors_and_height_confirmed', 'c111_modern_materials_krer_labor_confirmed', 'c111_workplace_and_contractor_costs_confirmed'] as const;
const projectInputs = ['applicability_mode', ...facts];
const systemInputs = [...projectInputs, 'c111_effective_run_length_m'];
const parameters: AutomaticParameterSpec[] = [
  {id: 'area_m2', title: 'Площадь перегородки по одной стороне, без двойного подсчёта обшивки', valueType: 'decimal', unitId: 'm2', kind: 'ordinary', min: 0.001},
  profile('applicability_mode', 'Предварительная C111 либо подтверждённые условия объекта', 'enum', null, 'PRELIMINARY_PROFILE', {values: ['PRELIMINARY_PROFILE', 'CONFIRMED_PROJECT_FACTS']}),
  profile('c111_height_m', 'Предварительная высота2.75м; длина прямой перегородки = площадь/высота, без проёмов', 'decimal', 'm', 2.75, {min: 1, max: 3}),
  profile('c111_stud_step_m', 'Предварительный шаг стоек0.6м, подтвердить расчётом и паспортом системы', 'decimal', 'm', 0.6, {min: 0.6, max: 0.6}),
  profile('c111_insulation_mode', 'Предварительно АкустиКНАУФ50мм; NONE только при допустимости по проекту', 'enum', null, 'AKUSTIKNAUF_50', {values: ['AKUSTIKNAUF_50', 'NONE']}),
  profile('c111_fugen_water_l_kg', 'Вода Фуген: предварительно0.65л/кг фактически замешиваемой потребности; диапазон0.6–0.7', 'decimal', 'l_per_kg', 0.65, {min: 0.6, max: 0.7}),
  profile('c111_cleaning_water_l_m2', 'Вода мойки: предварительный план0.1л/м², не опубликованная норма', 'decimal', 'l_per_m2', 0.1, {min: 0}),
  profile('c111_fugen_pack_kg', 'Выбранный Фуген: мешок5кг, частичные чистые замесы', 'decimal', 'kg', 5, {min: 5, max: 5}),
  profile('c111_anchor_pack_items', 'Предварительно упаковка дюбелей100шт по плану поставки; фасовка не подтверждена паспортом производителя', 'integer', 'piece', 100, {min: 1}),
  profile('c111_water_delivery_l', 'Предварительная кратность доставки воды5л; изменить по фактической поставке', 'decimal', 'l', 5, {min: 0.001}),
  profile('c111_cut_edge_priming_band_m', 'Предварительная ширина обработки резаных кромок20мм; геометрический план, не расходная норма', 'decimal', 'm', 0.02, {min: 0.001, max: 0.1}),
  profile('c111_primer_rate_kg_m2', 'Тифенгрунд06/2026: приблизительно0.1кг/м² каждого обработанного слоя; корректировать по впитываемости', 'decimal', 'kg_per_m2', 0.1, {min: 0.001}),
  ...facts.map(id => ({id, title: ({
    c111_straight_no_openings_confirmed: 'Площадь, высота, прямая геометрия и отсутствие дверных/инженерных проёмов подтверждены',
    c111_dry_single_layer_system_confirmed: 'Подтверждены сухое помещение, акклиматизация листов, завершение мокрых процессов, условия Фуген+10…+30°C и высыхание; ГСП-А12.5мм по одному слою с обеих сторон, ПН/ПС50 и выбранная поставка',
    c111_anchors_and_height_confirmed: 'Несущая способность, высота, основание, тип дюбеля и крепления подтверждены проектом C111',
    c111_modern_materials_krer_labor_confirmed: 'Подтверждена применимость труда/машин КРЕР10-05-001-01 при современных материалах, Q1 и выбранном раскрое',
    c111_workplace_and_contractor_costs_confirmed: 'Материалы на рабочем месте; оснащение, доступ, энергия, расходники и сбор отходов входят в соответствующие ставки; отдельная поставка/вывоз не требуется',
  })[id], valueType: 'enum' as const, unitId: null, kind: 'conditional' as const, requiredWhen: confirmed, values: ['YES']})),
];
const rows: AutomaticRowSpec[] = [];
const provenance = new Map<string, ReturnType<typeof ready>>();
const stage = new Map<string, string>();
function scope(key: string, title: string, unitId: string, expression: string) {
  rows.push({rowId: 'scope:c111:' + key, formulaId: 'c111_scope_' + key.replaceAll('-', '_') + '_v1', section: 'Геометрия и раскрой C111', category: 'service', title, unitId, expression, costTreatment: 'INFORMATIONAL_SCOPE', inputParameterIds: projectInputs,
    ...(key === 'length' ? {effectiveQuantityOutput: {parameterId: 'c111_effective_run_length_m', unitId: 'm'}, formulaOutputBounds: {schemaVersion: 'canonical_formula_output_bounds_v1' as const, unitId: 'm', maximum: 15, reasonRu: 'Длина более15м требует отдельного решения деформационных швов C11; этот прямой профиль без швов не применим'}} : {})});
}
const length = '(area_m2/c111_height_m)';
const sheetCount = `2*ceil(${length}/1.2)`;
const studCount = `ceil(${length}/c111_stud_step_m)+1`;
const jointsFaceA = `ceil(${length}/1.2)-1`;
const jointsFaceB = `ceil(max(0,${length}-0.6)/1.2)`;
const jointsCount = `(${jointsFaceA})+(${jointsFaceB})`;
const cutVerticalCount = `(ceil(${length}/1.2)-floor(${length}/1.2))+1+(ceil(max(0,${length}-0.6)/1.2)-floor(max(0,${length}-0.6)/1.2))`;
scope('area', 'Площадь C111 по одной стороне; труд по этой площади', 'm2', 'area_m2');
scope('length', 'Длина прямой перегородки из площади и выбранной высоты', 'm', length);
scope('sheet-net', 'Чистая площадь двух сторон, по одному слою', 'm2', '2*area_m2');
scope('sheet-cut', 'Обрезки раскроя листов3000×1200мм; не целые листы для нового заказа', 'm2', `(${sheetCount})*3.6-2*area_m2`);
scope('stud-cut', 'Обрезки цельных стоек3м; не новые цельные стойки и не направляющий профиль', 'm', `(${studCount})*(3-c111_height_m)`);
const cutPrimeArea = `(2*${length}*ceil(max(0,3-c111_height_m)/3)+(${cutVerticalCount})*c111_height_m)*c111_cut_edge_priming_band_m`;
scope('cut-prime', 'Площадь подготовки резаных кромок: предварительная полоса, заводские продольные кромки не грунтуются перед Фуген', 'm2', cutPrimeArea);
scope('joint-length', 'Вертикальные стыки обеих сторон: фактический раскрой со смещением600мм, без горизонтальных швов', 'm', `(${jointsCount})*c111_height_m`);
scope('tn25-norm', 'Справочный расход TN25 по C11; физические штуки округляются до целых и проверяются по раскрою', 'piece', 'area_m2*29');
scope('dowel-norm', 'Справочный расход дюбелей C11; физические штуки округляются и проверяются минимумом креплений', 'piece', 'area_m2*1.6');
function supply(key: string, operation: string, title: string, unitId: string, consumed: string, quantum: string,
  source?: ReturnType<typeof ready>, extra: Partial<AutomaticRowSpec> = {}) {
  const rowId = 'material:c111:' + key, prefix = 'c111_' + key.replaceAll('-', '_');
  const type = unitId === 'piece' ? 'integer' : 'decimal';
  parameters.push(profile(prefix + '_stock', title + ': пригодное совместимое наличие, предварительно0; обрезки листов/стоек не целые изделия', type, unitId, 0, {min: 0}),
    profile(prefix + '_reserve', title + ': сохраняемый совместимый резерв, предварительно0', type, unitId, 0, {min: 0}));
  rows.push({rowId, formulaId: prefix + '_order_v1', section: 'Ресурсы C111', category: 'material', title, unitId,
    expression: `ceil(max(0,(${consumed})+${prefix}_reserve-${prefix}_stock)/(${quantum}))*(${quantum})`, procurement: true,
    ...effectivePurchaseBalanceExpressionsR1({ownerRowId: rowId, orderUnitId: unitId, consumed, stock: prefix + '_stock', reserve: prefix + '_reserve', quantum}).owner,
    inputParameterIds: systemInputs, ...extra});
  stage.set(rowId, operation);if (source) provenance.set(rowId, source);
}
supply('pn50', 'FRAME', 'КНАУФ ПН50×40×0.6мм, длина3м: направляющие пола и потолка, каждую линию округлять по раскрою', 'piece', `2*ceil(${length}/3)`, '1', ready('FRAME', 'system_frame'));
supply('ps50', 'FRAME', 'КНАУФ ПС50×50×0.6мм, цельная стойка3м без стыка; концевые стойки включены', 'piece', studCount, '1', ready('FRAME', 'system_frame'));
supply('dowel', 'FRAME', 'КНАУФ дюбель К6/35, минеральное основание; целые штуки и минимум3 на профиль, тип и раскладку подтвердить', 'piece', `max(ceil(area_m2*1.6),6*ceil(${length}/3)+6)`, 'c111_anchor_pack_items', ready('FRAME', 'frame_fasteners'));
supply('sealing-tape', 'FRAME', 'КНАУФ Дихтунгсбанд50мм под направляющие и концевые стойки', 'm', `2*(${length}+c111_height_m)`, '30');
supply('board', 'CLAD', 'КНАУФ-лист ГСП-А ПЛУК3000×1200×12.5мм; один слой каждой стороны, стыки смещены600мм', 'piece', sheetCount, '1', ready('CLAD', 'system_board'));
supply('tn25', 'CLAD', 'КНАУФ шуруп TN25,3.5×25мм, пачка1000шт; целые штуки, C11 и проверка шага250мм по раскрою', 'piece', `max(ceil(area_m2*29),(2*(${studCount})+(${jointsCount}))*(ceil(c111_height_m/0.25)+1))`, '1000', ready('CLAD', 'board_fasteners'));
supply('insulation', 'INSULATE', 'АкустиКНАУФ50×610×1230мм,16 плит; заявленная упаковка12м², характеристики системы подтвердить', 'm2', 'area_m2', '12', ready('INSULATE', 'system_insulation'), {inclusion: insulated, titleParameterIds: ['c111_insulation_mode']});
supply('fugen', 'FINISH_JOINT', 'КНАУФ-Фуген, мешок5кг: Q1 по0.25кг/м² обшивки каждой стороны, без сплошного финиша', 'kg', '2*area_m2*0.25', 'c111_fugen_pack_kg', ready('FINISH_JOINT', 'joint_compound'));
supply('joint-tape', 'FINISH_JOINT', 'КНАУФ бумажная перфорированная лента52мм, рулон50м, Фуген/Q1: стыки обеих сторон по раскрою', 'm', `(${jointsCount})*c111_height_m`, '50', ready('FINISH_JOINT', 'joint_tape'));
supply('separation-tape', 'FINISH_JOINT', 'КНАУФ разделительная лента Треннфикс65мм на примыкания обеих обшивок к несущим конструкциям', 'm', `4*(${length}+c111_height_m)`, '50');
supply('tiefengrund', 'FINISH_JOINT', 'КНАУФ Тифенгрунд06/2026, ведро5кг, неразбавленный: резаные кромки и затем обе стороны по приблизительно0.1кг/м²', 'kg', `(2*area_m2+${cutPrimeArea})*c111_primer_rate_kg_m2`, '5');
supply('water', 'FINISH_JOINT', 'Чистая холодная вода: фактические частичные замесы Фуген и мойка, один заказ', 'l', '2*area_m2*0.25*c111_fugen_water_l_kg+area_m2*c111_cleaning_water_l_m2', 'c111_water_delivery_l');
for (const [key, title, expression] of [
  ['mixing', 'Вода Фуген: от замешиваемой потребности, не от закупки/резерва', '2*area_m2*0.25*c111_fugen_water_l_kg'],
  ['cleaning', 'Вода мойки: открытый предварительный план объекта', 'area_m2*c111_cleaning_water_l_m2'],
] as const) {
  const rowId = 'allocation:c111:water:' + key;
  rows.push({rowId, formulaId: 'c111_water_' + key + '_v1', section: 'Общая вода', category: 'material', title, unitId: 'l', expression, costTreatment: 'INCLUDED_IN_RESOURCE_ROWS', procurement: false, purchaseBalanceOwnerRowId: 'material:c111:water'});stage.set(rowId, 'FINISH_JOINT');
}
for (const [key, title, category, unit, rate, operation] of [
  ['worker', 'Рабочие-строители, разряд3.5: вся C111 по КРЕР10-05-001-01, труд этапов отдельно не оплачивается', 'labor', 'man_hour', 98, 'INSTALL'],
  ['shears', 'Ножницы электрические:0.36маш.-ч/100м² перегородки по КРЕР10-05-001-01', 'equipment', 'machine_hour', 0.36, 'FRAME'],
  ['perforator', 'Перфоратор электрический:0.6маш.-ч/100м² перегородки по КРЕР10-05-001-01', 'equipment', 'machine_hour', 0.6, 'FRAME'],
  ['driver', 'Шуруповёрт:2.9маш.-ч/100м² перегородки по КРЕР10-05-001-01', 'equipment', 'machine_hour', 2.9, 'CLAD'],
] as const) {
  const rowId = 'work:c111:' + key;
  rows.push({rowId, formulaId: 'c111_krer_' + key + '_v1', section: 'Труд и машины всей перегородки', category, title, unitId: unit, expression: `area_m2*${rate}/100`, inputParameterIds: systemInputs});stage.set(rowId, operation);
}
const tools = [
  ['laser', 'Лазерный нивелир разметки', 'FRAME'], ['measure', 'Рулетка', 'FRAME'], ['level', 'Строительный уровень', 'FRAME'],
  ['drill-bit', 'Бур6мм под выбранный дюбель', 'FRAME'], ['access', 'Подмости для выбранной высоты, подбор по ППР', 'INSTALL'],
  ['punch', 'Просекатель соединения ПН/ПС методом просечки с отгибом', 'FRAME'],
  ['ph2', 'Бита PH2 для TN25', 'CLAD'], ['knife', 'Нож раскроя ГСП-А', 'CLAD'], ['plane', 'Рубанок подготовки резаной кромки', 'CLAD'],
  ['insulation-knife', 'Нож резки минеральной ваты', 'INSULATE'], ['bucket', 'Чистая ёмкость частичного замеса Фуген', 'FINISH_JOINT'],
  ['spatula', 'Шпатель-кельма ручного перемешивания Фуген', 'FINISH_JOINT'], ['joint-spatula', 'Шпатель заполнения швов и вдавливания ленты', 'FINISH_JOINT'],
  ['sanding-holder', 'Тёрка доводки швов Q1', 'FINISH_JOINT'], ['abrasive', 'Шлифовальная сетка для высохшего Фуген, зерно по пробному участку', 'FINISH_JOINT'],
  ['brush', 'Кисть Тифенгрунд для резаных кромок', 'FINISH_JOINT'], ['roller', 'Валик Тифенгрунд для поверхности', 'FINISH_JOINT'],
  ['gloves', 'Одна пара химстойких защитных перчаток', 'INSTALL'], ['eye-protection', 'Защитные очки', 'INSTALL'], ['dust-protection', 'Подобранный по условиям противопылевой респиратор', 'INSTALL'],
  ['vacuum', 'Строительный пылесос очистки сухой поверхности', 'FINISH_JOINT'], ['dust-bag', 'Совместимый пылесборный мешок', 'FINISH_JOINT'], ['waste-bag', 'Мешок сбора отходов на рабочем месте, без внешнего вывоза', 'INSTALL'],
] as const;
for (const [key, title, operation] of tools) {
  const parameter = 'c111_tool_' + key.replaceAll('-', '_') + '_required';
  parameters.push(profile(parameter, title + ': предварительно1 единица оснащения подрядчика, стоимость включается в соответствующую ставку, не опубликованная норма', 'integer', 'piece', 1, {min: 0}));
  const rowId = 'tool:c111:' + key;
  rows.push({rowId, formulaId: parameter + '_v1', section: 'Оснащение подрядчика, учесть в ставке', category: 'material', title: title + '; предоставляет подрядчик с включением в ставку', unitId: 'piece', expression: parameter, procurement: false, costTreatment: 'INCLUDED_IN_RESOURCE_ROWS', inputParameterIds: systemInputs, ...(operation === 'INSULATE' ? {inclusion: insulated} : {})});stage.set(rowId, operation);
}
const built = buildAutomaticConstructionOwnerR1({contract: C111_CONTRACT_S2736, semanticOwner: 'drywall-partition-c111', sourceId: C111_SOURCE_ID_S2736, normId: C111_NORM_ID_S2736,
  sourceMetadata: C111_SOURCE_METADATA_S2736, applicabilityRu: C111_SOURCE_METADATA_S2736.use_restriction,
  ordinary: parameters.filter(p => p.kind === 'ordinary'), profile: parameters.filter(p => p.kind === 'profile'), conditional: parameters.filter(p => p.kind === 'conditional'), rows,
  deferMissingProjectFactsToRows: true, excludedUnownedAssumptions: ['Дверные/инженерные проёмы, закладные и усиления', 'Огнестойкость/звукоизоляция как подтверждённые характеристики', 'Горизонтальные стыки/удлинение стоек', 'Мокрая зона, окраска, сплошная шпаклёвка', 'Исторические цены и потолочная норма', 'Автоматическое согласование замены материалов', 'Обрезки/мокрый Фуген как целое сухое наличие']});
const titles: Record<string, string> = {FRAME: 'Каркас и примыкания', CLAD: 'Однослойная обшивка двух сторон', INSULATE: 'Минеральное заполнение', FINISH_JOINT: 'Швы Q1 и последующее грунтование', INSTALL: 'Вся перегородка: единый труд'};
const productKey: Record<string, keyof typeof sourcePack.products> = {'board': 'sheet', 'pn50': 'pn50', 'ps50': 'ps50',
  'tn25': 'tn25', 'sealing-tape': 'sealing_tape', 'joint-tape': 'joint_tape', 'separation-tape': 'separation_tape', 'insulation': 'insulation', 'tiefengrund': 'tiefengrund'};
function primaryTrace(rowId: string) {
  const key = rowId.slice(rowId.lastIndexOf(':') + 1);
  const source = rowId.startsWith('work:') ? sourcePack.krer : key === 'fugen' || key === 'water' || rowId.startsWith('allocation:') ? sourcePack.fugen :
    rowId.startsWith('material:') && productKey[key] ? sourcePack.products[productKey[key]] : null;
  return source ? [{source_id: C111_SOURCE_ID_S2736, norm_id: C111_NORM_ID_S2736, source_title: C111_SOURCE_METADATA_S2736.source_title,
    source_url: source.url, exact_locator: source.locator, source_definition_hash: sourceHash,
    sourceRole: rowId.startsWith('work:') ? 'KRER_LABOUR_SUBSTITUTION_REQUIRES_PROJECT_APPROVAL' : 'SELECTED_MANUFACTURER_PRODUCT_PROFILE_REQUIRES_DELIVERY_CONFIRMATION'}] : [];
}
export const C111_DEFINITION_S2736 = Object.freeze({...built, parameters: built.parameters.map(parameter => ({...parameter,
  truth_metadata: {...parameter.truth_metadata, guide: {...(parameter.truth_metadata.guide as Record<string, unknown>), verified_at: '2026-10-06T00:00:00+06:00'}}})), resources: built.resources.map(row => {
  const operation = stage.get(row.row_id) || 'INSTALL', source = provenance.get(row.row_id);
  const includedOwner = row.row_id.startsWith('allocation:') ? 'material:c111:water' : row.row_id.startsWith('tool:') ?
    (row.row_id.endsWith('ph2') ? 'work:c111:driver' : 'work:c111:worker') : null;
  const resource = {...row, source_metadata: {...row.source_metadata, engineeringApprovalClaimed: false,
    normativeTrace: [...(row.source_metadata?.normativeTrace as Record<string, unknown>[] ?? []), ...primaryTrace(row.row_id)],
    partitionNormCode: '10-05-001-01', normReplacementApprovalRequired: true, manufacturerSourcePackSha256: sourceHash,
    physicalQuantityBasis: row.row_id.startsWith('tool:') ? 'VISIBLE_CONTRACTOR_PROJECT_PLAN_COST_INCLUDED' : 'VISIBLE_C111_GEOMETRY_AND_SELECTED_MANUFACTURER_PROFILE',
    reusedOperation: source ? {sourceRowId: source.row_id, sourceFormulaId: source.formula.formula_id, reusedBoundaryOnly: true, oldUnresolvedQuantityAndCeilingNormNotImported: true} : null},
    resource_graph: {...row.resource_graph, operationCompositionV1: {contractVersion: 'canonical-operation-resource/v1', groupId: 'drywall-partition-c111', groupTitleRu: 'Прямая перегородка C111 из готовых операций', operationId: operation.toLowerCase(), operationTitleRu: titles[operation], completionCriterionRu: 'Проверить геометрию, крепления, поставку и применимость труда по проекту; проёмы и финиш отдельными операциями'},
      ...(includedOwner ? {includedInResourceOwnerRowId: includedOwner} : {}),
      ...(row.row_id.startsWith('allocation:') ? {purchaseConsumptionAllocationV1: {contractVersion: 'canonical-purchase-consumption-allocation/v1', ownerRowId: 'material:c111:water'}} : {})}};
  return {...resource, row_sha256: estimateDeterministicHash({...resource, row_sha256: ''})};
})});
export function compileDrywallPartitionC111S2736(submittedParameters: Record<string, unknown>) {
  return compileAutomaticConstructionOwnerR1({compilerVersion: C111_CONTRACT_S2736, catalogId: C111_CATALOG_S2736,
    primaryMeasureParameterId: 'area_m2', definition: C111_DEFINITION_S2736, submittedParameters});
}
