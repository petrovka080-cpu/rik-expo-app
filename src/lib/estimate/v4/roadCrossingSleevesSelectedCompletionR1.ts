import type { AutomaticInclusionCondition, AutomaticParameterSpec, AutomaticRowSpec } from "./automaticConstructionOwnerR1";
import { ROAD_CROSSING_SLEEVES_CIVIL_METHODS_R1 as methods } from "./roadCrossingSleevesCivilGeometryR1";
import { ROAD_CROSSING_SLEEVES_INTERNAL_FILL_APPLICABILITY_R1 as internalFill,
  ROAD_CROSSING_SLEEVES_INTERNAL_FILL_EXPRESSIONS_R1 as internalQuantities } from "./roadCrossingSleevesInternalFillR1";
import { reconcileDeclaredPurchaseBalanceRowsR1, type DeclaredPurchaseBalanceRowsR1 } from "./effectivePurchaseBalanceR1";

/** Finite programme for the selected jacked crossing. PJA distinguishes pit
 * seals and external lubrication from the jacking system and internal fill:
 * https://pipejacking.org/about_pipe_jacking
 * https://www.pipejacking.org/assets/pj/static/flipbook/inc/html/23.html
 * These sources provide scope, never project quantities, rates or approval.
 * Each programme consumes an actual inventory/method/allocation. No implicit
 * absence, generic loss allowance, borrowed pressure or extra mix-water order.
 */
export const ROAD_CROSSING_SLEEVES_COMPLETION_MODES_R1 = Object.freeze({
  separate: "Применимая операция с отдельными ресурсами исполнителя по фактической программе",
  included: "Все ресурсы этой операции включены в указанный существующий оплачиваемый owner без повторной оплаты",
  otherParty: "Вся применимая операция обеспечена другой стороной без оплаты исполнителем",
  notRequired: "Операция не требуется по фактическому проектному решению и подтверждённой границе",
});
export const ROAD_CROSSING_SLEEVES_COMPLETION_SUPPLY_MODES_R1 = Object.freeze({
  separate: "Отдельный новый заказ этого совместимого материала после наличия и сохраняемого резерва",
  included: "Весь материал включён в указанный оплачиваемый комплект без повторного заказа",
  otherParty: "Весь материал обеспечивает другая сторона без заказа исполнителем",
});
export const ROAD_CROSSING_SLEEVES_COMPLETION_COST_BASES_R1 = Object.freeze({
  crew: "Все исполнители только этой операции, включая операторов; без техники, энергии, материалов и доставки; смешивание/размещение уже в FILL_EXECUTION",
  equipment: "Полный совместимый комплект только этой операции с энергией; без всех исполнителей, материалов, доставки и других уже оплаченных операций",
  material: "Только новый заказ этого совместимого материала; без работы, техники, энергии, доставки и повторной оплаты включённого материала",
});
export const ROAD_CROSSING_SLEEVES_RESTORATION_CONSTRUCTIONS_R1 = Object.freeze({
  granular: "Один отдельный однородный зернистый слой по подтверждённой конструкции; без асфальта и других слоёв",
  existingOwnerRequired: "Другая или многослойная конструкция: требуется присоединённый существующий полный owner её ресурсов",
});
export const ROAD_CROSSING_SLEEVES_EXTERNAL_FILL_GEOMETRIES_R1 = Object.freeze({
  uniformAnnulus: "Подтверждённое полное равномерное кольцо одного прямого футляра по фактическому диаметру выработки; без отдельного геологического/injection объёма",
  existingOwnerRequired: "Иной фактический геологический/injection объём: требуется присоединённый существующий полный owner геометрии и ресурсов",
});
const jacking: AutomaticInclusionCondition = { kind: "equals", parameterId: "rcs_civil_installation_method", value: methods.pipeJacking };
const both = (...operands: AutomaticInclusionCondition[]): AutomaticInclusionCondition => ({ kind: "and", operands });
const id = (key: string, suffix: string) => `rcs_completion_${key}_${suffix}`;
const selected = (key: string): AutomaticInclusionCondition => both(jacking,
  { kind: "equals", parameterId: id(key, "mode"), value: ROAD_CROSSING_SLEEVES_COMPLETION_MODES_R1.separate });
type Stage = "preparation" | "installation" | "bedding" | "carrier_and_supports" | "internal_fill" | "completion";
type Programme = Readonly<{ key: string; title: string; stage: Stage; unit: string; amount?: string; scope?: AutomaticInclusionCondition; boundary: string }>;
export const ROAD_CROSSING_SLEEVES_COMPLETION_PROGRAMMES_R1: readonly Programme[] = Object.freeze([
  { key: "site", title: "Доступ, расчистка и подготовка рабочей площадки", stage: "preparation", unit: "m2", boundary: "Фактическая площадь доступа/расчистки/рабочей площадки; без котлованов, вывоза уже учтённого грунта и восстановления" },
  { key: "fencing", title: "Временное ограждение рабочей площадки", stage: "preparation", unit: "m", boundary: "Полная фактическая длина применимого временного ограждения с установкой, обслуживанием и снятием; без организации движения" },
  { key: "traffic", title: "Применимая организация движения", stage: "preparation", unit: "day", boundary: "Фактическая длительность полного выбранного плана движения; знаки, огни, барьеры и контролёры по его полной ведомости, без повторного ограждения площадки" },
  { key: "cavity", title: "Подготовка внутренней полости футляра перед заполнением", stage: "internal_fill", unit: "m", amount: "rcs_crossing_length_m", scope: internalFill, boundary: "Только проверка, очистка и подготовка полости перед заполнением; без подготовки сварных стыков/покрытия, смешивания и размещения" },
  { key: "retaining", title: "Удерживающие и выпускные узлы внутреннего заполнения", stage: "internal_fill", unit: "piece", scope: internalFill, boundary: "Полная фактическая ведомость удерживающих/выпускных/инъекционных узлов, монтаж, проверка и применимое снятие по проектным давлению и плавучести; без второго заказа существующих концевых уплотнений" },
  { key: "fill_cleaning", title: "Очистка комплекта и полости после внутреннего заполнения", stage: "internal_fill", unit: "piece", scope: internalFill, boundary: "Фактические циклы отдельной очистки после размещения; вода и отходы этой очистки отдельно от воды затворения и уже оплаченного размещения" },
  { key: "curing", title: "Выдержка и контроль внутреннего заполнения", stage: "internal_fill", unit: "day", scope: internalFill, boundary: "Фактическая длительность режима выдержки и контроля по выбранному продукту/методу; не повторное размещение, не проектный срок по умолчанию" },
  { key: "carrier_testing", title: "Испытание рабочей трубы выбранного перехода", stage: "carrier_and_supports", unit: "piece", boundary: "Фактические отдельные испытательные участки и циклы: границы перехода относительно основной линии, изоляция/концевые узлы, среда, давление, выдержка, безопасность и приёмка; не повторное испытание уже включённого участка основной линии" },
  { key: "restoration", title: "Восстановление территории и покрытия", stage: "completion", unit: "m2", boundary: "Фактическая отдельная граница восстановления вне объёмов уже оплаченной обратной засыпки; один однородный зернистый слой только при соответствующей конструкции, для асфальта/многослойного покрытия нужен существующий полный owner" },
  { key: "cleanup", title: "Финальная уборка выбранного перехода", stage: "completion", unit: "m2", boundary: "Фактическая площадь финальной уборки после отдельно учтённых операций; без повторного вывоза грунта и других уже учтённых потоков отходов" },
  { key: "marker_return", title: "Возврат пригодных материалов разбивки", stage: "completion", unit: "piece", boundary: "Фактическое число пригодных возвращаемых колов/маркеров по инвентаризации и отдельно подтверждённый маршрут; использованные одноразовые изделия не возвращаются в пригодное наличие" },
  { key: "jacking_seals", title: "Входной и выходной герметизирующие узлы котлованов", stage: "installation", unit: "piece", boundary: "Полные совместимые герметизирующие узлы по фактической воде/давлению/диаметру и конструкции стен; не концевые манжеты рабочей трубы, не выдуманное отсутствие герметизации" },
  { key: "lubrication", title: "Наружная смазка футляра при продавливании", stage: "installation", unit: "m", amount: "rcs_crossing_length_m", boundary: "Полная выбранная система наружной смазки с реальными потерями и совместимостью грунта/воды; исключена из ресурсов проходки при отдельной оплате, не внутреннее заполнение" },
  { key: "external_grout", title: "Применимое заполнение снаружи футляра", stage: "installation", unit: "m3",
    amount: "3.141592654/4*(pow(rcs_jacking_confirmed_excavation_diameter_mm,2)-pow(rcs_casing_outside_diameter_mm,2))*rcs_crossing_length_m/1000000",
    boundary: "Только подтверждённое полное равномерное наружное кольцевое заполнение одного прямого футляра по фактическому диаметру выработки, casingOD и длине; gross поставка/выход/потери по выбранному процессу, не внутренний кольцевой объём. Иной геологический/injection объём требует собственного существующего owner и фактической геометрии" },
  { key: "pit_bedding", title: "Применимое основание стартового и приёмного котлованов", stage: "bedding", unit: "m3",
    amount: "rcs_jacking_thrust_excavation_length_m*rcs_jacking_thrust_excavation_width_m*rcs_completion_pit_bedding_thrust_thickness_m+rcs_jacking_reception_excavation_length_m*rcs_jacking_reception_excavation_width_m*rcs_completion_pit_bedding_reception_thickness_m",
    boundary: "Полное прямоугольное основание каждого выбранного котлована по уже указанной геометрии его дна и фактической толщине; выбранный материал/уплотнение/нагрузки, без основания открытой траншеи и бетона реакционного упора" },
]);
const programmeScope = (programme: Programme) => programme.scope ? both(jacking, programme.scope) : jacking;
const restorationGranular: AutomaticInclusionCondition = { kind: "equals", parameterId: id("restoration", "construction"), value: ROAD_CROSSING_SLEEVES_RESTORATION_CONSTRUCTIONS_R1.granular };
const programmeOwn = (programme: Programme) => both(programmeScope(programme), selected(programme.key),
  ...(programme.key === "restoration" ? [restorationGranular] : []),
  ...(programme.key === "external_grout" ? [{ kind: "equals" as const, parameterId: id("external_grout", "geometry_scope"), value: ROAD_CROSSING_SLEEVES_EXTERNAL_FILL_GEOMETRIES_R1.uniformAnnulus }] : []));
const params: AutomaticParameterSpec[] = [];
const rows: AutomaticRowSpec[] = [];
const equipmentCargos: { key: string; title: string; quantityExpression: string; selected: AutomaticInclusionCondition; facts: readonly string[]; designationId: string }[] = [];
for (const programme of ROAD_CROSSING_SLEEVES_COMPLETION_PROGRAMMES_R1) {
  const { key, title } = programme, scope = programmeScope(programme), own = programmeOwn(programme);
  const parameter = (suffix: string, caption: string, valueType: AutomaticParameterSpec["valueType"], unitId: string | null,
    requiredWhen: AutomaticInclusionCondition = own, extra: Partial<AutomaticParameterSpec> = {}): AutomaticParameterSpec => ({
    id: id(key, suffix), title: `${title}: ${caption}`, kind: "conditional", valueType, unitId, requiredWhen, ...extra });
  const amount = programme.amount ?? id(key, "amount");
  const facts = ["rcs_civil_installation_method", id(key, "mode"), id(key, "programme_reference"),
    ...(key === "external_grout" ? [id(key, "geometry_scope")] : [])];
  params.push(parameter("mode", "фактическая применимость и граница оплаты всей операции", "enum", null, scope, { values: Object.values(ROAD_CROSSING_SLEEVES_COMPLETION_MODES_R1) }),
    parameter("programme_reference", programme.boundary, "text", null, scope));
  if (!programme.amount) params.push(parameter("amount", "фактический объём всей операции по той же программе, не закупленный резерв", programme.unit === "piece" ? "integer" : "decimal", programme.unit, own, { min: 0.000_001 }));
  rows.push({ rowId: `rcs:completion:${key}:allocation`, formulaId: `rcs:completion:${key}:allocation`, section: title, category: "service",
    title: `${title}: подтверждённая применимость и граница ресурсов`, unitId: "piece", expression: "1", inclusion: scope,
    costTreatment: "INFORMATIONAL_SCOPE", inputParameterIds: facts });
  rows.push({ rowId: `rcs:completion:${key}:finished_amount`, formulaId: `rcs:completion:${key}:finished_amount`, section: title, category: "service",
    title: `${title}: исходный объём всей подтверждённой операции; не заказ или резерв`, unitId: programme.unit, expression: amount, inclusion: own,
    costTreatment: "INFORMATIONAL_SCOPE", inputParameterIds: facts,
    formulaOutputBounds: { schemaVersion: "canonical_formula_output_bounds_v1", unitId: programme.unit, minimum: 0,
      reasonRu: "Исходная подтверждённая геометрия/объём операции не может быть отрицательной; manual количество работы или заказа не исправляет исходную несовместимость." } });
  for (const owner of ["crew", "equipment"] as const) {
    const unit = owner === "crew" ? "man_hour" : "machine_hour";
    params.push(parameter(`${owner}_designation`, owner === "crew" ? "все исполнители, включая операторов" : "фактический полный совместимый комплект", "text", null),
      parameter(`${owner}_hours_per_unit`, "подтверждённые часы на единицу всей операции, включая все её предусмотренные циклы", "decimal", `${unit}_per_${programme.unit}`, own, { min: 0 }),
      parameter(`${owner}_cost_basis`, "точная отдельная граница стоимости", "enum", null, own, { values: [ROAD_CROSSING_SLEEVES_COMPLETION_COST_BASES_R1[owner]] }));
    rows.push({ rowId: `rcs:completion:${key}:${owner}_hours`, formulaId: `rcs:completion:${key}:${owner}_hours`, section: title,
      title: `${title}: ${owner === "crew" ? "суммарный труд всех исполнителей" : "полный совместимый комплект с энергией"}`, category: owner === "crew" ? "labor" : "equipment",
      unitId: unit, expression: `(${amount})*${id(key, `${owner}_hours_per_unit`)}`, inclusion: own, procurement: true,
      titleParameterIds: [id(key, `${owner}_designation`)], inputParameterIds: [...facts, id(key, `${owner}_designation`), id(key, `${owner}_cost_basis`)] });
  }
  params.push(parameter("complete_equipment_count", "фактические целые полные комплекты для доставки/возврата, включая предусмотренный резерв; не часы работы", "integer", "piece", own, { min: 0 }));
  equipmentCargos.push({ key: `completion_${key}`, title, quantityExpression: id(key, "complete_equipment_count"), selected: own,
    designationId: id(key, "equipment_designation"), facts: [...facts, id(key, "equipment_designation")] });
}
params.push({ id: id("external_grout", "geometry_scope"), title: "Наружное заполнение: подтверждённая фактическая геометрическая граница; диаметр выработки не определяет иной геологический/injection объём",
  kind: "conditional", valueType: "enum", unitId: null, values: Object.values(ROAD_CROSSING_SLEEVES_EXTERNAL_FILL_GEOMETRIES_R1), requiredWhen: selected("external_grout") });
for (const pit of ["thrust", "reception"] as const) params.push({ id: id("pit_bedding", `${pit}_thickness_m`), title: `Основание ${pit === "thrust" ? "стартового" : "приёмного"} котлована: фактическая законченная толщина по всей уже указанной площади дна`,
  kind: "conditional", valueType: "decimal", unitId: "m", min: 0, requiredWhen: selected("pit_bedding") });
params.push({ id: id("restoration", "construction"), title: "Восстановление: фактическая конструкция; разные слои и материалы не одна SKU/закупка", kind: "conditional", valueType: "enum", unitId: null,
  values: Object.values(ROAD_CROSSING_SLEEVES_RESTORATION_CONSTRUCTIONS_R1), requiredWhen: selected("restoration") },
{ id: id("restoration", "finished_thickness_m"), title: "Восстановление: фактическая законченная толщина единственного однородного зернистого слоя", kind: "conditional", valueType: "decimal", unitId: "m", min: 0.000_001,
  requiredWhen: both(selected("restoration"), restorationGranular) },
{ id: id("restoration", "existing_full_owner_binding"), title: "Восстановление: недостающая фактическая привязка существующего полного owner другой/многослойной конструкции, с отдельными материалами/слоями/работой/закупкой; текстовое имя не заменяет присоединение его ресурсов",
  kind: "conditional", valueType: "text", unitId: null, requiredWhen: both(selected("restoration"), { kind: "equals", parameterId: id("restoration", "construction"), value: ROAD_CROSSING_SLEEVES_RESTORATION_CONSTRUCTIONS_R1.existingOwnerRequired }) });
for (const [key, suffix, title, unitId, valueType] of [
  ["traffic", "physical_complete_places", "фактические целые полные места знаков/барьеров/сигнальных устройств по ведомости; длительность дежурства не умножает повторно набор", "piece", "integer"],
  ["traffic", "actual_replacement_places", "фактические дополнительные целые места на реальные замены в этой программе; не процент износа и не число календарных дней", "piece", "integer"],
  ["curing", "application_area_m2", "фактическая отдельная площадь применения материала ухода по выбранному продукту и процедуре; не длительность выдержки и не выдуманная поверхность", "m2", "decimal"],
  ["curing", "application_count", "фактическое целое число предусмотренных применений материала на этой площади; одноразовое покрытие не умножается на дни", "piece", "integer"],
] as const) params.push({ id: id(key, suffix), title: `${key === "traffic" ? "Организация движения" : "Уход за заполнением"}: ${title}`, kind: "conditional", valueType, unitId, min: 0, requiredWhen: selected(key) });
for (const key of ["fill_cleaning", "carrier_testing"] as const) params.push({ id: id(key, "actual_discarded_water_l"),
  title: `${key === "fill_cleaning" ? "Очистка после заполнения" : "Испытание рабочей трубы"}: фактический полный отдельный сброс воды/остатков по программе и реальному повторному использованию; положительный сброс не нулевая партия отходов, плотность/масса не предполагаются`,
  kind: "conditional", valueType: "decimal", unitId: "l", min: 0, requiredWhen: programmeOwn(ROAD_CROSSING_SLEEVES_COMPLETION_PROGRAMMES_R1.find(programme => programme.key === key)!) });
export const ROAD_CROSSING_SLEEVES_COMPLETION_WATER_WASTE_SCOPES_R1 = Object.freeze(["fill_cleaning", "carrier_testing"].map(key => {
  const programme = ROAD_CROSSING_SLEEVES_COMPLETION_PROGRAMMES_R1.find(value => value.key === key)!;
  return { key: `completion_${key}`, title: `${programme.title}: отдельный полный поток фактического сброса/остатков без повторной работы и воды`, selected: programmeOwn(programme),
    facts: [id(key, "mode"), id(key, "programme_reference")], wipesExpression: "0", wipesProductId: id(key, "programme_reference"),
    discardedFlow: { expression: id(key, "actual_discarded_water_l"), unitId: "l" } };
}));

type Material = Readonly<{ key: string; programme: string; title: string; unit: "piece" | "m" | "m3" | "kg" | "l" }>;
export const ROAD_CROSSING_SLEEVES_COMPLETION_MATERIALS_R1: readonly Material[] = Object.freeze([
  { key: "site_surface", programme: "site", title: "Полный совместимый материал временного доступа и рабочей площадки", unit: "m3" },
  { key: "fence", programme: "fencing", title: "Полные секции временного ограждения с опорами и крепежом", unit: "piece" },
  { key: "traffic", programme: "traffic", title: "Полные совместимые места знаков, барьеров и сигнальных устройств", unit: "piece" },
  { key: "cavity_cleaner", programme: "cavity", title: "Совместимый очиститель подготовки полости", unit: "l" },
  { key: "retaining_nodes", programme: "retaining", title: "Полные удерживающие, инъекционные и выпускные узлы по ведомости", unit: "piece" },
  { key: "cleaning_water", programme: "fill_cleaning", title: "Совместимая вода очистки после заполнения, отдельно от затворения", unit: "m3" },
  { key: "curing_material", programme: "curing", title: "Совместимый материал предусмотренного режима выдержки", unit: "kg" },
  { key: "test_water", programme: "carrier_testing", title: "Полный отдельный объём совместимой воды испытания перехода", unit: "m3" },
  { key: "test_nodes", programme: "carrier_testing", title: "Полные временные узлы изоляции, заполнения, дренирования и контроля испытания", unit: "piece" },
  { key: "restoration", programme: "restoration", title: "Один совместимый зернистый материал единственного слоя восстановления", unit: "m3" },
  { key: "jacking_seals", programme: "jacking_seals", title: "Полные входной и выходной герметизирующие узлы с принадлежностями", unit: "piece" },
  { key: "lubricant", programme: "lubrication", title: "Совместимый наружный смазочный состав с полными процессными потерями", unit: "kg" },
  { key: "external_grout", programme: "external_grout", title: "Совместимый наружный состав заполнения с полными процессными потерями", unit: "kg" },
  { key: "pit_bedding", programme: "pit_bedding", title: "Совместимый материал основания обоих котлованов в подтверждённом поставляемом состоянии", unit: "m3" },
]);
const balances: DeclaredPurchaseBalanceRowsR1[] = [];
const cargos: { key: string; title: string; rowId: string; stockId: string; unit: Material["unit"]; quantum: string }[] = [];
for (const material of ROAD_CROSSING_SLEEVES_COMPLETION_MATERIALS_R1) {
  const key = `material_${material.key}`, programme = ROAD_CROSSING_SLEEVES_COMPLETION_PROGRAMMES_R1.find(value => value.key === material.programme)!;
  const scope = programmeOwn(programme), prefix = `rcs:completion-material:${material.key}`;
  const amount = programme.amount ?? id(programme.key, "amount");
  const finishedAmount = material.key === "restoration" ? `(${amount})*${id("restoration", "finished_thickness_m")}`
    : material.key === "curing_material" ? `${id("curing", "application_area_m2")}*${id("curing", "application_count")}` : amount;
  const basisUnit = material.key === "restoration" ? "m3" : material.key === "curing_material" ? "m2" : programme.unit;
  const rawConsumed = material.key === "traffic" ? `${id("traffic", "physical_complete_places")}+${id("traffic", "actual_replacement_places")}`
    : `(${finishedAmount})*${id(key, "gross_per_programme_unit")}`;
  const consumed = material.unit === "piece" ? `ceil(${rawConsumed})` : rawConsumed;
  const positive = both(scope, { kind: "formula_greater_than", expression: consumed, unitId: material.unit, value: 0 });
  const own = both(positive, { kind: "equals", parameterId: id(key, "supply_mode"), value: ROAD_CROSSING_SLEEVES_COMPLETION_SUPPLY_MODES_R1.separate });
  const fact = (suffix: string, caption: string, valueType: AutomaticParameterSpec["valueType"], unitId: string | null,
    requiredWhen = own, extra: Partial<AutomaticParameterSpec> = {}): AutomaticParameterSpec => ({ id: id(key, suffix), title: `${material.title}: ${caption}`,
    kind: "conditional", valueType, unitId, requiredWhen, ...extra });
  if (material.key !== "traffic") params.push(fact("gross_per_programme_unit", `фактический полный gross расход на ${material.key === "restoration" ? "м³ законченного слоя" : material.key === "curing_material" ? "м² одного предусмотренного применения" : programme.unit} всей операции со всеми процессными потерями по той же ведомости; подтверждённый ноль допустим, запас не расход`, "decimal", `${material.unit}_per_${basisUnit}`, scope, { min: 0 }));
  params.push(fact("inventory_reference", "полная фактическая ведомость состава/совместимости/состояния/расхода и границы без повторения существующих материалов; без универсальной нормы", "text", null, scope),
    fact("supply_mode", "фактический владелец поставки всей партии", "enum", null, positive, { values: Object.values(ROAD_CROSSING_SLEEVES_COMPLETION_SUPPLY_MODES_R1) }),
    fact("product_designation", "фактический выбранный совместимый материал/полный комплект", "text", null, positive),
    fact("allocation_reference", "фактическая граница поставки/оплаты, совместимое наличие и сохраняемый резерв в том же состоянии; включённый owner указан явно", "text", null, positive),
    fact("stock", "выделенное пригодное совместимое наличие", "decimal", material.unit, own, { min: 0 }),
    fact("reserve", "сохраняемый пригодный резерв после полного расхода", "decimal", material.unit, own, { min: 0 }),
    fact("quantum", "фактическая неделимая кратность нового заказа", material.unit === "piece" ? "integer" : "decimal", material.unit, own, { min: 0.000_001 }),
    fact("cost_basis", "отдельная граница стоимости нового материала", "enum", null, own, { values: [ROAD_CROSSING_SLEEVES_COMPLETION_COST_BASES_R1.material] }));
  const stock = id(key, "stock"), reserve = id(key, "reserve"), quantum = id(key, "quantum");
  const ordered = `ceil(max(0,${consumed}+${reserve}-${stock})/${quantum})*${quantum}`;
  const source = [id(material.programme, "mode"), id(material.programme, "programme_reference"), id(key, "inventory_reference")];
  for (const [suffix, expression, unitId] of [["consumed", consumed, material.unit], ["ordered", ordered, material.unit],
    ["supplier_pack_count", `(${ordered})/${quantum}`, "package"], ["remaining", `${stock}+(${ordered})-${consumed}`, material.unit],
    ["free_beyond_reserve", `max(0,${stock}+(${ordered})-${consumed}-${reserve})`, material.unit]] as const) {
    rows.push({ rowId: `${prefix}:${suffix}`, formulaId: `${prefix}:${suffix}`, section: material.title, title: `${material.title}: ${suffix === "ordered" ? "новый заказ" : suffix === "consumed" ? "полный расход программы" : suffix === "remaining" ? "пригодный остаток" : suffix === "free_beyond_reserve" ? "свободный остаток сверх резерва" : "целые упаковки заказа"}`,
      category: "material", unitId, expression, inclusion: suffix === "consumed" ? scope : own,
      costTreatment: suffix === "ordered" ? "OWN_COST" : "INFORMATIONAL_SCOPE", procurement: suffix === "ordered",
      inputParameterIds: suffix === "consumed" ? source : [...source, id(key, "supply_mode"), id(key, "product_designation"), id(key, "allocation_reference"), ...(suffix === "ordered" ? [id(key, "cost_basis")] : [])],
      ...(suffix === "ordered" ? { titleParameterIds: [id(key, "product_designation")] } : {}) });
  }
  balances.push({ ownerRowId: `${prefix}:ordered`, consumedRowId: `${prefix}:consumed`, stock, reserve, quantum,
    packagesRowId: `${prefix}:supplier_pack_count`, remainingRowId: `${prefix}:remaining`, freeRowId: `${prefix}:free_beyond_reserve` });
  cargos.push({ key: `completion_${material.key}`, title: material.title, rowId: `${prefix}:ordered`, stockId: stock, unit: material.unit, quantum });
}

// BOM belongs to the existing full mixer/pump/hose package. It cannot acquire
// another payable rental, even through a saved explicit inclusion amendment.
for (const member of ["mixer", "pump", "hoses"] as const) {
  const countId = `rcs_completion_fill_package_${member}_count`;
  const memberSelected = both(jacking, internalFill, { kind: "greater_than", parameterId: countId, value: 0 });
  params.push({ id: countId, title: `Внутреннее заполнение: фактическое целое количество ${member === "mixer" ? "смесителей" : member === "pump" ? "насосных комплектов" : "полных комплектов рукавов/соединений"} во всей уже оплаченной ведомости смешивания/размещения; отсутствие только явным 0 по той же технологии`,
    kind: "conditional", valueType: "integer", unitId: "piece", min: 0, requiredWhen: both(jacking, internalFill) });
  params.push({ id: `rcs_completion_fill_package_${member}_designation`, title: `Внутреннее заполнение: совместимый ${member === "mixer" ? "смеситель" : member === "pump" ? "насос" : "комплект рукавов и соединений"} внутри уже выбранного полного комплекта смешивания/размещения`,
    kind: "conditional", valueType: "text", unitId: null, requiredWhen: memberSelected });
  rows.push({ rowId: `rcs:completion:fill-package:${member}`, formulaId: `rcs:completion:fill-package:${member}`, section: "Состав комплекта внутреннего заполнения",
    title: `Включённый ${member === "mixer" ? "смеситель" : member === "pump" ? "насос" : "комплект рукавов"}`, unitId: "piece", expression: countId, category: "equipment",
    inclusion: memberSelected, costTreatment: "INCLUDED_IN_RESOURCE_ROWS",
    titleParameterIds: [`rcs_completion_fill_package_${member}_designation`], inputParameterIds: ["rcs_fill_internal_equipment_designation", "rcs_fill_internal_equipment_cost_basis", "rcs_fill_internal_method_reference", `rcs_completion_fill_package_${member}_designation`] });
}
params.push({ id: "rcs_completion_fill_priming_discard_reference", title: "Внутреннее заполнение: фактическая схема priming/discard и полный учёт её сухого материала/воды в существующем gross расходе; без второго заказа порошка и воды затворения",
  kind: "conditional", valueType: "text", unitId: null, requiredWhen: both(jacking, internalFill) });
for (const [suffix, title, unitId] of [["dry_kg", "фактическая сухая масса смеси внутри всего priming/discard/непригодного замеса, уже включённая в исходный gross расход", "kg"],
  ["wet_l", "фактический объём всего priming/discard/непригодного замеса; не плотность и не новый заказ воды", "l"]] as const) {
  params.push({ id: `rcs_completion_fill_discard_${suffix}`, title: `Внутреннее заполнение: ${title}`, valueType: "decimal", unitId,
    kind: "conditional", min: 0, requiredWhen: both(jacking, internalFill) });
}
params.push({ id: "rcs_completion_fill_placed_dry_kg_per_finished_m3", title: "Внутреннее заполнение: подтверждённая сухая масса, реально остающаяся в 1 м³ готового заполнения по выходу выбранного продукта/процедуре; не gross расход с потерями", valueType: "decimal", unitId: "kg_per_m3",
  kind: "conditional", min: 0.000_001, requiredWhen: both(jacking, internalFill) },
{ id: "rcs_completion_fill_actual_yield_reference", title: "Внутреннее заполнение: фактический источник выхода/сухой массы готового заполнения и полного баланса gross/размещено/priming/discard/прочих потерь; положительный готовый объём не может содержать нулевой сухой материал",
  valueType: "text", unitId: null, kind: "conditional", requiredWhen: both(jacking, internalFill) });
rows.push({ rowId: "rcs:completion:fill-priming-discard", formulaId: "rcs:completion:fill-priming-discard", section: "Внутреннее заполнение", title: "Priming/discard включены в исходный полный процессный расход",
  unitId: "piece", expression: "1", category: "material", inclusion: both(jacking, internalFill), costTreatment: "INFORMATIONAL_SCOPE",
  inputParameterIds: ["rcs_completion_fill_priming_discard_reference", "rcs_internal_fill_gross_dry_mass_ratio", "rcs_internal_fill_mixing_water_l_for_selected_bag"] });
rows.push({ rowId: "rcs:completion:fill-discard-dry-margin", formulaId: "rcs:completion:fill-discard-dry-margin", section: "Внутреннее заполнение", title: "Исходный gross расход покрывает весь выброшенный сухой материал",
  unitId: "kg", expression: `(${internalQuantities.consumed_dry_kg})-rcs_completion_fill_discard_dry_kg-(${internalQuantities.net_fill_m3})*rcs_completion_fill_placed_dry_kg_per_finished_m3`,
  category: "material", inclusion: both(jacking, internalFill), costTreatment: "INFORMATIONAL_SCOPE", inputParameterIds: ["rcs_completion_fill_priming_discard_reference", "rcs_completion_fill_actual_yield_reference"],
  formulaOutputBounds: { schemaVersion: "canonical_formula_output_bounds_v1", unitId: "kg", minimum: 0,
    reasonRu: "Исходный gross расход покрывает подтверждённый сухой материал готового заполнения и весь фактический discard; нельзя выбросить весь расход при положительном готовом объёме или заказать потери второй раз." } });
rows.push({ rowId: "rcs:completion:fill-placed-dry-kg", formulaId: "rcs:completion:fill-placed-dry-kg", section: "Внутреннее заполнение", title: "Подтверждённый сухой материал в готовом заполнении без gross потерь",
  unitId: "kg", expression: `(${internalQuantities.net_fill_m3})*rcs_completion_fill_placed_dry_kg_per_finished_m3`, category: "material", inclusion: both(jacking, internalFill), costTreatment: "INFORMATIONAL_SCOPE",
  inputParameterIds: ["rcs_completion_fill_actual_yield_reference", "rcs_fill_internal_method_reference", "rcs_internal_fill_dry_product_designation"] });

export const ROAD_CROSSING_SLEEVES_SELECTED_COMPLETION_PARAMETERS_R1 = Object.freeze(params);
export const ROAD_CROSSING_SLEEVES_SELECTED_COMPLETION_ROWS_R1 = Object.freeze(reconcileDeclaredPurchaseBalanceRowsR1(rows, balances));
export const ROAD_CROSSING_SLEEVES_SELECTED_COMPLETION_CARGOS_R1 = Object.freeze(cargos);
export const ROAD_CROSSING_SLEEVES_SELECTED_COMPLETION_EQUIPMENT_CARGOS_R1 = Object.freeze(equipmentCargos);
/** Publication of a chosen scope cannot promote open-cut or a missing child
 * owner to technical completeness. Actual source admission stays separate. */
export function assertRoadCrossingSleevesSelectedCompletionScopeR1(inputs: Readonly<Record<string, unknown>>): void {
  if (inputs.rcs_civil_installation_method !== methods.pipeJacking) throw new Error("RCS_FULL_SELECTED_SCOPE_REQUIRES_JACKING");
  if (inputs.rcs_completion_restoration_mode === ROAD_CROSSING_SLEEVES_COMPLETION_MODES_R1.separate
    && inputs.rcs_completion_restoration_construction !== ROAD_CROSSING_SLEEVES_RESTORATION_CONSTRUCTIONS_R1.granular) {
    throw new Error("RCS_RESTORATION_EXISTING_FULL_OWNER_NOT_BOUND");
  }
  if (inputs.rcs_completion_external_grout_mode === ROAD_CROSSING_SLEEVES_COMPLETION_MODES_R1.separate
    && inputs.rcs_completion_external_grout_geometry_scope !== ROAD_CROSSING_SLEEVES_EXTERNAL_FILL_GEOMETRIES_R1.uniformAnnulus) {
    throw new Error("RCS_EXTERNAL_FILL_EXISTING_FULL_OWNER_NOT_BOUND");
  }
}
export function roadCrossingSleevesCompletionStageRowsR1(stage: Stage): readonly AutomaticRowSpec[] {
  const programmes = new Set(ROAD_CROSSING_SLEEVES_COMPLETION_PROGRAMMES_R1.filter(value => value.stage === stage).map(value => value.key));
  const materialPrefixes = ROAD_CROSSING_SLEEVES_COMPLETION_MATERIALS_R1.filter(value => programmes.has(value.programme)).map(value => `rcs:completion-material:${value.key}:`);
  return ROAD_CROSSING_SLEEVES_SELECTED_COMPLETION_ROWS_R1.filter(row => [...programmes].some(key => row.rowId.startsWith(`rcs:completion:${key}:`))
    || materialPrefixes.some(prefix => row.rowId.startsWith(prefix)) || (stage === "internal_fill" && (row.rowId.startsWith("rcs:completion:fill-package:") || row.rowId.startsWith("rcs:completion:fill-"))));
}
