import { createHash } from "node:crypto";

import { canonicalEstimateStableJson } from "../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism";
import { compileFormulaGraph, type FormulaAst } from "../../../src/lib/estimate/backendPlatform/formulaGraph";

export type R41SurfaceParameter = {
  parameterId: string;
  titleRu: string;
  unitId: string;
  valueType: "decimal" | "integer";
  constraints: { min: number; max: number };
  baselineValue: number;
};

export type R41SurfaceRow = {
  rowId: string;
  section: string;
  category: string;
  titleRu: string;
  rowType: "material" | "labor" | "equipment" | "service" | "waste";
  unitId: string;
  quantityFormula: string;
  procurementEligible: boolean;
  referenceUnitPriceKgs: number;
  normativeBasisRu: string;
};

export type R41SurfaceDefinition = {
  catalogId: string;
  workKey: string;
  titleRu: string;
  domain: string;
  groupId: string;
  groupNameRu: string;
  workFamilyId: string;
  systemId: string;
  subsystemId: string;
  assemblyId: string;
  elementType: string;
  operationKind: "NEW_INSTALLATION" | "REPAIR";
  primaryUom: string;
  aliases: readonly string[];
  shortScopeRu: string;
  includedBoundaries: readonly string[];
  excludedBoundaries: readonly string[];
  parameters: readonly R41SurfaceParameter[];
  rows: readonly R41SurfaceRow[];
};

export type R41CompiledSurfaceRow = R41SurfaceRow & {
  formulaId: string;
  ast: FormulaAst;
  inputParameterIds: string[];
  astSha256: string;
  rowSha256: string;
};

function sha256(value: unknown): string {
  return createHash("sha256").update(
    typeof value === "string" ? value : canonicalEstimateStableJson(value),
  ).digest("hex");
}

function parameter(
  parameterId: string,
  titleRu: string,
  unitId: string,
  min: number,
  max: number,
  baselineValue: number,
  valueType: "decimal" | "integer" = "decimal",
): R41SurfaceParameter {
  return { parameterId, titleRu, unitId, valueType, constraints: { min, max }, baselineValue };
}

function row(
  rowId: string,
  section: string,
  category: string,
  titleRu: string,
  rowType: R41SurfaceRow["rowType"],
  unitId: string,
  quantityFormula: string,
  referenceUnitPriceKgs: number,
  procurementEligible = rowType === "material",
  normativeBasisRu = "Количество рассчитывается из явно введённых размеров и состава работ; ставка является датированной локальной справочной ставкой кандидата.",
): R41SurfaceRow {
  return {
    rowId,
    section,
    category,
    titleRu,
    rowType,
    unitId,
    quantityFormula,
    procurementEligible,
    referenceUnitPriceKgs,
    normativeBasisRu,
  };
}

const ELECTRICAL_EXPLICIT_ROWS: readonly R41SurfaceRow[] = [
  row("survey_and_circuit_schedule", "Подготовка", "survey", "Обследование объекта и схема розеточных, осветительных и силовых групп", "service", "service", "1", 7200, false),
  row("route_marking", "Подготовка", "marking", "Разметка электрических трасс, розеток, выключателей и точек освещения", "labor", "m2", "area_m2", 62, false),
  row("dust_protection", "Подготовка", "protection", "Защита помещений перед штроблением и прокладкой кабеля", "labor", "m2", "area_m2", 28, false),
  row("power_cable", "Материалы", "cable", "Силовой медный кабель для розеточных линий по проектному сечению", "material", "m", "route_length_m * 1.08 * outlet_count / (outlet_count + switch_count + lighting_point_count)", 118),
  row("lighting_cable", "Материалы", "cable", "Медный кабель линий освещения и выключателей по проектному сечению", "material", "m", "route_length_m * 1.08 * (switch_count + lighting_point_count) / (outlet_count + switch_count + lighting_point_count)", 82),
  row("corrugated_conduit", "Материалы", "containment", "Гофрированная труба и кабель-канал для защищённой прокладки", "material", "m", "route_length_m * 1.05", 46),
  row("cable_fasteners", "Материалы", "fasteners", "Клипсы, дюбели и крепёж кабельной трассы", "material", "pcs", "ceil(route_length_m / 0.5)", 18),
  row("socket_boxes", "Материалы", "devices", "Подрозетники для розеток и выключателей", "material", "pcs", "outlet_count + switch_count", 72),
  row("outlets", "Материалы", "devices", "Розетки с заземляющим контактом", "material", "pcs", "outlet_count", 420),
  row("switches", "Материалы", "devices", "Выключатели освещения", "material", "pcs", "switch_count", 360),
  row("lighting_terminals", "Материалы", "devices", "Комплектующие точек освещения и кабельных выводов", "material", "pcs", "lighting_point_count", 350),
  row("junction_boxes", "Материалы", "devices", "Распределительные коробки с клеммами", "material", "pcs", "ceil((outlet_count + switch_count + lighting_point_count) / 5)", 260),
  row("distribution_panel", "Материалы", "panel", "Корпус распределительного щита с раздельными шинами PE и N", "material", "pcs", "1", 14000),
  row("breakers", "Материалы", "protection", "Автоматические выключатели групповых цепей по расчётным номиналам", "material", "pcs", "ceil((outlet_count + switch_count + lighting_point_count) / 4) + 2", 1200),
  row("cable_laying", "Работы", "installation", "Прокладка кабельных линий в защитной системе", "labor", "m", "route_length_m * 1.08", 145, false),
  row("socket_box_install", "Работы", "installation", "Монтаж и выверка подрозетников", "labor", "pcs", "outlet_count + switch_count", 320, false),
  row("outlet_install", "Работы", "installation", "Монтаж и подключение розеток", "labor", "pcs", "outlet_count", 620, false),
  row("switch_install", "Работы", "installation", "Монтаж и подключение выключателей", "labor", "pcs", "switch_count", 580, false),
  row("lighting_install", "Работы", "installation", "Монтаж точек освещения и кабельных выводов", "labor", "pcs", "lighting_point_count", 640, false),
  row("panel_install", "Работы", "installation", "Монтаж, сборка и маркировка распределительного щита", "labor", "pcs", "1", 9800, false),
  row("termination", "Работы", "termination", "Оконцевание, подключение и маркировка жил кабеля", "labor", "pcs", "(outlet_count + switch_count + lighting_point_count) * 2", 540, false),
  row("chaser_and_vacuum", "Механизмы и инструмент", "equipment", "Штроборез с промышленным пылеудалением", "equipment", "shift", "max(1, ceil(route_length_m / 90))", 6800, false),
  row("insulation_tester", "Механизмы и инструмент", "equipment", "Мегаомметр и комплект электроизмерительного инструмента", "equipment", "set", "1", 5200, false),
  row("continuity_and_insulation_test", "Контроль качества", "testing", "Прозвонка цепей, проверка полярности и сопротивления изоляции", "service", "service", "1", 9200, false),
  row("electrical_delivery", "Логистика", "delivery", "Доставка кабеля, электроустановочных изделий и щита", "service", "trip", "max(1, ceil(route_length_m / 140))", 5200, false),
  row("cable_cutting_loss", "Отходы", "waste", "Технологический запас кабеля на разделку, оконцевание и трассировку", "waste", "m", "route_length_m * 0.03", 118),
  row("as_built_documentation", "Исполнительная документация", "documentation", "Исполнительная однолинейная схема и ведомость групп", "service", "service", "1", 6800, false),
] as const;

const HOUSE_ELECTRICAL_ROWS: readonly R41SurfaceRow[] = [
  row("house_survey", "Подготовка", "survey", "Обследование дома и схема размещения электрических точек", "service", "service", "1", 7200, false),
  row("house_route_marking", "Подготовка", "marking", "Разметка трасс, розеток, выключателей и освещения", "labor", "m2", "area_m2", 62, false),
  row("house_power_cable", "Материалы", "cable", "Силовой медный кабель розеточных групп по проектному сечению", "material", "m", "area_m2 * 1.9", 118),
  row("house_lighting_cable", "Материалы", "cable", "Медный кабель групп освещения и выключателей", "material", "m", "area_m2 * 1.1", 82),
  row("house_containment", "Материалы", "containment", "Гофрированная труба и кабель-канал для кабельных трасс", "material", "m", "area_m2 * 2.8", 46),
  row("house_fasteners", "Материалы", "fasteners", "Клипсы, дюбели и крепёж электрических трасс", "material", "pcs", "ceil(area_m2 * 5.6)", 18),
  row("house_outlets", "Материалы", "devices", "Розетки с заземляющим контактом", "material", "pcs", "max(4, ceil(area_m2 / 8))", 420),
  row("house_switches", "Материалы", "devices", "Выключатели освещения", "material", "pcs", "max(2, ceil(area_m2 / 18))", 360),
  row("house_lighting_points", "Материалы", "devices", "Комплектующие точек освещения и выводов", "material", "pcs", "max(3, ceil(area_m2 / 12))", 350),
  row("house_socket_boxes", "Материалы", "devices", "Подрозетники и распределительные коробки", "material", "pcs", "max(6, ceil(area_m2 / 5))", 160),
  row("house_panel", "Материалы", "panel", "Распределительный щит дома с шинами PE и N", "material", "pcs", "1", 22000),
  row("house_breakers", "Материалы", "protection", "Автоматические выключатели и устройства защитного отключения по проекту", "material", "pcs", "max(8, ceil(area_m2 / 15) + 2)", 1800),
  row("house_grounding", "Материалы", "grounding", "Главная защитная шина и проводники уравнивания потенциалов", "material", "set", "1", 6800),
  row("house_cable_laying", "Работы", "installation", "Прокладка силовых и осветительных кабельных линий", "labor", "m", "area_m2 * 3", 145, false),
  row("house_point_install", "Работы", "installation", "Монтаж розеток, выключателей и точек освещения", "labor", "pcs", "max(9, ceil(area_m2 / 4))", 620, false),
  row("house_panel_install", "Работы", "installation", "Сборка, монтаж и маркировка распределительного щита дома", "labor", "pcs", "1", 12500, false),
  row("house_chasing", "Работы", "installation", "Штробление и восстановительная заделка кабельных трасс", "labor", "m", "area_m2 * 2.2", 340, false),
  row("house_tools", "Механизмы и инструмент", "equipment", "Штроборез, промышленный пылесос и инструмент электрика", "equipment", "shift", "max(1, ceil(area_m2 / 45))", 6800, false),
  row("house_testing", "Контроль качества", "testing", "Измерение сопротивления изоляции, непрерывности PE и проверка защит", "service", "service", "1", 12000, false),
  row("house_delivery", "Логистика", "delivery", "Доставка кабеля, щита, защитных аппаратов и электроустановочных изделий", "service", "trip", "max(1, ceil(area_m2 / 150))", 6500, false),
  row("house_cable_reserve", "Отходы", "waste", "Запас кабеля на разделку, оконцевание и изменение трасс", "waste", "m", "area_m2 * 0.12", 118),
  row("house_documentation", "Исполнительная документация", "documentation", "Исполнительная однолинейная схема и ведомость групп дома", "service", "service", "1", 6800, false),
] as const;

const ROOF_WATERPROOFING_ROWS: readonly R41SurfaceRow[] = [
  row("roof_survey", "Подготовка", "survey", "Обследование кровли, воронок, примыканий и дефектов основания", "service", "service", "1", 3500, false),
  row("roof_cleaning", "Подготовка", "cleaning", "Очистка кровли от загрязнений и непрочных участков", "labor", "m2", "area_m2", 95, false),
  row("roof_base_preparation", "Подготовка", "base", "Подготовка и локальный ремонт основания кровли", "labor", "m2", "area_m2", 130, false),
  row("roof_defect_repair_mix", "Материалы", "repair", "Ремонтная смесь для дефектов основания кровли", "material", "kg", "area_m2 * 0.42", 80),
  row("roof_primer", "Материалы", "primer", "Праймер битумный для кровельного основания", "material", "l", "area_m2 * 0.3", 210),
  row("roof_membrane", "Материалы", "membrane", "Рулонная гидроизоляционная кровельная мембрана", "material", "m2", "area_m2 * 1.08", 560),
  row("roof_reinforcing_tape", "Материалы", "junctions", "Армирующая лента для примыканий и проходок", "material", "m", "max(8, area_m2 * 0.4)", 120),
  row("roof_sealant", "Материалы", "sealant", "Кровельный герметик для примыканий и проходок", "material", "cartridge", "max(2, ceil(area_m2 * 0.4 / 8))", 420),
  row("roof_drains", "Материалы", "drainage", "Кровельные воронки и водоприёмные узлы", "material", "pcs", "max(1, ceil(area_m2 / 120))", 2200),
  row("roof_primer_apply", "Работы", "installation", "Нанесение праймера на подготовленное основание", "labor", "m2", "area_m2", 110, false),
  row("roof_membrane_install", "Работы", "installation", "Монтаж гидроизоляционной кровельной мембраны", "labor", "m2", "area_m2", 360, false),
  row("roof_junction_sealing", "Работы", "junctions", "Герметизация примыканий, парапетов и проходок", "labor", "m", "max(8, area_m2 * 0.4)", 240, false),
  row("roof_drain_detailing", "Работы", "drainage", "Герметизация кровельных воронок и водоприёмных узлов", "labor", "pcs", "max(1, ceil(area_m2 / 120))", 950, false),
  row("roof_safety", "Механизмы и инструмент", "safety", "Страховочная система, ограждение зоны и ручной кровельный инструмент", "equipment", "set", "1", 4500, false),
  row("roof_leak_test", "Контроль качества", "testing", "Проверка нахлёстов, герметичности и контроль протечек", "service", "service", "1", 5500, false),
  row("roof_delivery", "Логистика", "delivery", "Доставка мембраны, праймера, герметика и водоприёмных узлов", "service", "trip", "max(1, ceil(area_m2 / 180))", 4200, false),
  row("roof_waste_removal", "Логистика", "waste_removal", "Сбор, упаковка и вывоз кровельных обрезков", "service", "trip", "max(1, ceil(area_m2 / 300))", 2500, false),
  row("roof_membrane_reserve", "Отходы", "waste", "Запас мембраны на нахлёсты, примыкания и подрезку", "waste", "m2", "area_m2 * 0.04", 560),
] as const;

const PAVING_ROWS: readonly R41SurfaceRow[] = [
  row("paving_survey", "Подготовка", "survey", "Обмер участка и схема мощения с высотными отметками", "service", "service", "1", 3500, false),
  row("paving_marking", "Подготовка", "marking", "Разметка границ покрытия, уклонов и водоотвода", "labor", "m2", "area_m2", 70, false),
  row("paving_excavation", "Подготовка", "earthworks", "Выемка грунта под конструкцию основания", "labor", "m3", "area_m2 * 0.18", 850, false),
  row("paving_base_grading", "Подготовка", "earthworks", "Планировка и профилирование земляного основания", "labor", "m2", "area_m2", 120, false),
  row("paving_geotextile", "Материалы", "separation", "Геотекстиль с запасом на нахлёсты", "material", "m2", "area_m2 * 1.08", 70),
  row("paving_sand", "Материалы", "base", "Песок для выравнивающего слоя", "material", "m3", "area_m2 * 0.05", 1550),
  row("paving_crushed_stone", "Материалы", "base", "Щебень фракционный для несущего основания", "material", "m3", "area_m2 * 0.12", 1900),
  row("paving_bedding_mix", "Материалы", "bedding", "Отсев или пескоцементная смесь для постели", "material", "m3", "area_m2 * 0.04", 2100),
  row("paving_curb", "Материалы", "curb", "Бордюрный камень или поребрик", "material", "m", "max(8, area_m2 * 0.4)", 520),
  row("paving_curb_concrete", "Материалы", "curb", "Бетон для основания и обоймы бордюра", "material", "m3", "max(8, area_m2 * 0.4) * 0.035", 5600),
  row("paving_stone", "Материалы", "covering", "Брусчатка или тротуарная плитка выбранной толщины", "material", "m2", "area_m2 * 1.06", 720),
  row("paving_joint_sand", "Материалы", "joints", "Сухой песок для заполнения межплиточных швов", "material", "m3", "area_m2 * 0.01", 1550),
  row("paving_curb_install", "Работы", "installation", "Установка бордюра по отметкам и натянутому шнуру", "labor", "m", "max(8, area_m2 * 0.4)", 260, false),
  row("paving_stone_cutting", "Работы", "cutting", "Подрезка брусчатки у примыканий и криволинейных участков", "labor", "m", "max(2, area_m2 * 0.1)", 180, false),
  row("paving_stone_laying", "Работы", "installation", "Укладка брусчатки по выровненной постели", "labor", "m2", "area_m2", 480, false),
  row("paving_compaction", "Механизмы и инструмент", "compaction", "Виброуплотнение основания и покрытия виброплитой с защитным ковриком", "equipment", "shift", "max(1, ceil(area_m2 / 250))", 6500, false),
  row("paving_joint_filling", "Работы", "joints", "Заполнение и уплотнение межплиточных швов", "labor", "m2", "area_m2", 95, false),
  row("paving_quality", "Контроль качества", "testing", "Контроль отметок, уклонов, швов и приёмка мощения", "service", "m2", "area_m2", 45, false),
  row("paving_delivery", "Логистика", "delivery", "Доставка брусчатки, бордюра и инертных материалов", "service", "trip", "max(1, ceil(area_m2 / 250))", 6500, false),
  row("paving_soil_removal", "Логистика", "waste_removal", "Погрузка и вывоз вынутого грунта", "service", "trip", "max(1, ceil(area_m2 * 0.18 / 8))", 5500, false),
  row("paving_cutting_reserve", "Отходы", "waste", "Запас брусчатки на подрезку и бой", "waste", "m2", "area_m2 * 0.04", 720),
] as const;

export const R41_OFFICIAL_ANDROID_SURFACE_DEFINITIONS: readonly R41SurfaceDefinition[] = [
  {
    catalogId: "r41_surface_electrical_turnkey_explicit",
    workKey: "electrical_turnkey_explicit_scope",
    titleRu: "Электрика под ключ по заданным длине трассы и количеству точек",
    domain: "electrical",
    groupId: "r41_surface_electrical_turnkey",
    groupNameRu: "Комплексный электромонтаж",
    workFamilyId: "electrical_turnkey",
    systemId: "electrical_distribution",
    subsystemId: "house_wiring",
    assemblyId: "complete_wiring_scope",
    elementType: "electrical_network",
    operationKind: "NEW_INSTALLATION",
    primaryUom: "m2",
    aliases: [
      "электрика под ключ площадь длина трассы розеток выключателей точек освещения",
      "электрика под ключ розетки выключатели освещение",
    ],
    shortScopeRu: "Кабельные линии, розетки, выключатели, освещение, щит, монтаж, испытания, доставка и технологический запас.",
    includedBoundaries: ["кабельные линии", "розетки", "выключатели", "точки освещения", "распределительный щит", "электроизмерения"],
    excludedBoundaries: ["проект внешнего электроснабжения", "увеличение выделенной мощности", "скрытые строительные дефекты"],
    parameters: [
      parameter("area_m2", "Площадь помещений", "m2", 1, 100_000, 100),
      parameter("route_length_m", "Подтверждённая длина кабельной трассы", "m", 1, 1_000_000, 500),
      parameter("outlet_count", "Количество розеток", "pcs", 1, 100_000, 10, "integer"),
      parameter("switch_count", "Количество выключателей", "pcs", 1, 100_000, 10, "integer"),
      parameter("lighting_point_count", "Количество точек освещения", "pcs", 1, 100_000, 10, "integer"),
    ],
    rows: ELECTRICAL_EXPLICIT_ROWS,
  },
  {
    catalogId: "r41_surface_house_electrical_area",
    workKey: "house_electrical_area_baseline",
    titleRu: "Электромонтаж дома по площади с открытыми расчётными допущениями",
    domain: "electrical",
    groupId: "r41_surface_house_electrical",
    groupNameRu: "Электромонтаж дома",
    workFamilyId: "house_electrical",
    systemId: "electrical_distribution",
    subsystemId: "house_wiring",
    assemblyId: "area_based_house_wiring",
    elementType: "house_electrical_network",
    operationKind: "NEW_INSTALLATION",
    primaryUom: "m2",
    aliases: ["электромонтаж дома", "электрика дома"],
    shortScopeRu: "Предварительная смета домашней электропроводки по площади с раздельными кабелями, точками, щитом, защитой, работами и контролем.",
    includedBoundaries: ["кабельные линии", "электрические точки", "щит и защита", "монтаж", "измерения", "доставка"],
    excludedBoundaries: ["окончательные номиналы без проекта", "внешнее электроснабжение", "увеличение мощности"],
    parameters: [parameter("area_m2", "Площадь дома", "m2", 1, 100_000, 180)],
    rows: HOUSE_ELECTRICAL_ROWS,
  },
  {
    catalogId: "r41_surface_roof_waterproofing",
    workKey: "roof_waterproofing",
    titleRu: "Гидроизоляция кровли рулонной мембраной",
    domain: "roofing",
    groupId: "r41_surface_roof_waterproofing",
    groupNameRu: "Гидроизоляция кровли",
    workFamilyId: "roof_waterproofing",
    systemId: "roofing",
    subsystemId: "waterproofing",
    assemblyId: "membrane_waterproofing",
    elementType: "roof_surface",
    operationKind: "REPAIR",
    primaryUom: "m2",
    aliases: ["гидроизоляция крыши", "гидроизоляция кровли"],
    shortScopeRu: "Подготовка кровли, праймер, мембрана, примыкания, воронки, монтаж, контроль герметичности, доставка и отходы.",
    includedBoundaries: ["подготовка основания", "праймер", "мембрана", "герметизация примыканий", "воронки", "контроль протечек"],
    excludedBoundaries: ["замена несущих конструкций", "полная теплоизоляционная система", "проектирование водоотвода"],
    parameters: [parameter("area_m2", "Площадь гидроизоляции кровли", "m2", 1, 1_000_000, 100)],
    rows: ROOF_WATERPROOFING_ROWS,
  },
  {
    catalogId: "r41_surface_paving_stone_laying",
    workKey: "paving_stone_laying",
    titleRu: "Укладка брусчатки с основанием и бордюром",
    domain: "roadworks_landscaping",
    groupId: "r41_surface_paving_stone",
    groupNameRu: "Мощение брусчаткой",
    workFamilyId: "paving_stone",
    systemId: "site_improvement",
    subsystemId: "paving",
    assemblyId: "paving_stone_with_base",
    elementType: "paved_surface",
    operationKind: "NEW_INSTALLATION",
    primaryUom: "m2",
    aliases: ["укладку брусчатки", "укладка брусчатки", "мощение брусчаткой"],
    shortScopeRu: "Выемка грунта, геотекстиль, песок, щебень, постель, бордюр, брусчатка, уплотнение, доставка и вывоз грунта.",
    includedBoundaries: ["земляные работы", "основание", "бордюр", "брусчатка", "виброуплотнение", "контроль уклонов"],
    excludedBoundaries: ["ливневая сеть вне покрытия", "перенос подземных коммуникаций", "проект вертикальной планировки"],
    parameters: [parameter("area_m2", "Площадь мощения", "m2", 1, 1_000_000, 587)],
    rows: PAVING_ROWS,
  },
] as const;

export function compileR41SurfaceDefinitionRows(
  definition: R41SurfaceDefinition,
): R41CompiledSurfaceRow[] {
  return definition.rows.map((source) => {
    const formula = compileFormulaGraph(source.quantityFormula);
    const formulaId = `r41:${definition.catalogId}:formula:${source.rowId}:v1`;
    const astSha256 = sha256(formula.ast);
    const rowSha256 = sha256({
      catalogId: definition.catalogId,
      ...source,
      formulaId,
      astSha256,
      contract: "r4.1-official-android-surface-port.v1",
    });
    return {
      ...source,
      formulaId,
      ast: formula.ast,
      inputParameterIds: formula.inputParameterIds,
      astSha256,
      rowSha256,
    };
  });
}

export function r41SurfaceDefinitionSha256(definition: R41SurfaceDefinition): string {
  return sha256({
    ...definition,
    rows: compileR41SurfaceDefinitionRows(definition),
    contract: "r4.1-official-android-surface-port.v2",
  });
}

export function r41SurfaceContentSha256(): string {
  return sha256(R41_OFFICIAL_ANDROID_SURFACE_DEFINITIONS.map((definition) => ({
    catalogId: definition.catalogId,
    definitionSha256: r41SurfaceDefinitionSha256(definition),
  })));
}
