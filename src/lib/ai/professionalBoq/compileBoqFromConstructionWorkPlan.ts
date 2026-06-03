import type {
  ConstructionComplexity,
  ConstructionWorkPlan,
} from "../constructionInterpreter/constructionSemanticTypes";
import type { GlobalEstimateSectionType } from "../globalEstimate/globalEstimateTypes";

export type ProfessionalConstructionBoqRow = {
  sectionType: GlobalEstimateSectionType;
  code: string;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  comment: string;
  confidence?: "high" | "medium" | "low";
  materialKey?: string;
};

export type ProfessionalConstructionBoq = {
  plan: ConstructionWorkPlan;
  rows: ProfessionalConstructionBoqRow[];
  assumptions: string[];
  exclusions: string[];
  costIncreaseFactors: string[];
  clarifyingQuestions: string[];
};

export function roundQuantity(value: number): number {
  return Math.max(0.01, Math.round(value * 100) / 100);
}


function buildLinoleumBoq(plan: ConstructionWorkPlan): ProfessionalConstructionBoq {
  const area = plan.quantity.volume;
  const perimeter = roundQuantity(Math.sqrt(area) * 4);
  const rows: ProfessionalConstructionBoqRow[] = [
    { sectionType: "labor", code: "linoleum_measurement", name: "Обмер помещения и карта раскроя", unit: "set", quantity: 1, unitPrice: 1200, comment: "Фиксация площади, порогов и примыканий." },
    { sectionType: "labor", code: "linoleum_base_preparation", name: "Подготовка основания под линолеум", unit: "sq_m", quantity: area, unitPrice: 95, comment: "Очистка и подготовка поверхности." },
    { sectionType: "labor", code: "linoleum_local_base_repair", name: "Ремонт локальных дефектов основания", unit: "sq_m", quantity: roundQuantity(area * 0.12), unitPrice: 420, comment: "Локальные выбоины и трещины." },
    { sectionType: "materials", code: "linoleum_primer", name: "Грунтовка / обеспыливание основания", unit: "sq_m", quantity: area, unitPrice: 35, comment: "Материал и расходники для обеспыливания.", materialKey: "primer" },
    { sectionType: "materials", code: "linoleum_roll", name: "Напольное покрытие: линолеум с запасом на раскрой покрытия", unit: "sq_m", quantity: roundQuantity(area * 1.08), unitPrice: 680, comment: "Запас на подрезку и рисунок.", materialKey: "linoleum" },
    { sectionType: "materials", code: "linoleum_fixing", name: "Подложка / клей / фиксация линолеума", unit: "sq_m", quantity: area, unitPrice: 120, comment: "Тип фиксации уточняется по основанию.", materialKey: "adhesive" },
    { sectionType: "materials", code: "linoleum_baseboard", name: "Плинтус напольный", unit: "linear_m", quantity: perimeter, unitPrice: 180, comment: "Ориентировочный периметр по площади.", materialKey: "baseboard" },
    { sectionType: "materials", code: "linoleum_thresholds", name: "Порожки и стыковочные профили", unit: "pcs", quantity: Math.max(1, Math.ceil(area / 35)), unitPrice: 450, comment: "Количество зависит от дверных проемов.", materialKey: "thresholds" },
    { sectionType: "materials", code: "linoleum_seam_welding_material", name: "Холодная сварка швов линолеума", unit: "linear_m", quantity: roundQuantity(area * 0.15), unitPrice: 95, comment: "Материал для стыков полотен.", materialKey: "linoleum_seam_welding" },
    { sectionType: "materials", code: "linoleum_floor_leveling_spots", name: "Шпатлевка основания под напольное покрытие", unit: "kg", quantity: roundQuantity(area * 0.28), unitPrice: 80, comment: "Локальная доводка основания перед укладкой.", materialKey: "floor_leveling_mix" },
    { sectionType: "labor", code: "linoleum_roll_acclimation", name: "Акклиматизация рулонов напольного покрытия", unit: "set", quantity: 1, unitPrice: 1500, comment: "Выдержка материала перед раскроем." },
    { sectionType: "labor", code: "linoleum_cutting", name: "Раскрой покрытия: раскрой линолеума", unit: "sq_m", quantity: area, unitPrice: 85, comment: "Раскрой с учетом примыканий." },
    { sectionType: "labor", code: "linoleum_laying_work", name: "Укладка линолеума", unit: "sq_m", quantity: area, unitPrice: 260, comment: "Основная укладка покрытия." },
    { sectionType: "labor", code: "linoleum_trim_edges", name: "Подрезка примыканий и углов", unit: "linear_m", quantity: perimeter, unitPrice: 75, comment: "Подрезка по стенам, коробкам и трубам." },
    { sectionType: "labor", code: "linoleum_seam_welding_work", name: "Проклейка / холодная сварка швов покрытия", unit: "linear_m", quantity: roundQuantity(area * 0.15), unitPrice: 140, comment: "Обработка стыков после укладки полотен." },
    { sectionType: "labor", code: "linoleum_baseboard_install", name: "Монтаж плинтуса", unit: "linear_m", quantity: perimeter, unitPrice: 120, comment: "Монтаж по периметру помещения." },
    { sectionType: "labor", code: "linoleum_threshold_install", name: "Монтаж порожков", unit: "pcs", quantity: Math.max(1, Math.ceil(area / 35)), unitPrice: 250, comment: "Стыки и дверные проемы." },
    { sectionType: "equipment", code: "linoleum_hand_tools", name: "Ручной инструмент для раскроя покрытия", unit: "set", quantity: 1, unitPrice: 1800, comment: "Ножи, линейки, ролики и прижимы." },
    { sectionType: "equipment", code: "linoleum_vacuum", name: "Строительный пылесос для подготовки основания", unit: "shift", quantity: Math.max(1, Math.ceil(area / 180)), unitPrice: 2600, comment: "Пылеудаление перед грунтованием и укладкой." },
    { sectionType: "delivery", code: "linoleum_material_delivery", name: "Доставка рулонов напольного покрытия и клея", unit: "trip", quantity: Math.max(1, Math.ceil(area / 180)), unitPrice: 4200, comment: "Доставка рулонов и сопутствующих материалов." },
    { sectionType: "delivery", code: "linoleum_waste_removal", name: "Вывоз обрезков и упаковки", unit: "set", quantity: 1, unitPrice: 900, comment: "Небольшой объем отходов после раскроя." },
  ];
  return {
    plan,
    rows,
    assumptions: [
      "Основание пригодно для укладки после локальной подготовки.",
      "Демонтаж старого покрытия не включен, если он не указан отдельно.",
      "Локальный контекст, валюта и налог берутся из GlobalEstimateResult.",
    ],
    exclusions: ["Сложное выравнивание пола", "Демонтаж старого покрытия", "Мебельные работы"],
    costIncreaseFactors: ["Неровное основание", "Сложная геометрия помещения", "Много дверных проемов и примыканий"],
    clarifyingQuestions: ["Какое текущее основание пола?", "Нужен ли демонтаж старого покрытия?", "Какой класс линолеума нужен?"],
  };
}


function buildPavingStoneBoq(plan: ConstructionWorkPlan): ProfessionalConstructionBoq {
  const area = plan.quantity.volume;
  const edge = roundQuantity(Math.sqrt(area) * 4);
  const rows: ProfessionalConstructionBoqRow[] = [
    { sectionType: "labor", code: "paving_marking", name: "Разметка участка под мощение", unit: "set", quantity: 1, unitPrice: 2500, comment: "Оси, отметки и границы покрытия." },
    { sectionType: "labor", code: "paving_grade_plan", name: "Планировка основания", unit: "sq_m", quantity: area, unitPrice: 95, comment: "Планировка с уклонами для водоотвода." },
    { sectionType: "labor", code: "paving_excavation", name: "Выемка грунта / подготовка корыта", unit: "m3", quantity: roundQuantity(area * 0.18), unitPrice: 620, comment: "Ориентировочная глубина корыта 18 см." },
    { sectionType: "materials", code: "paving_geotextile", name: "Геотекстиль под основание", unit: "sq_m", quantity: roundQuantity(area * 1.05), unitPrice: 42, comment: "Разделительный слой.", materialKey: "geotextile" },
    { sectionType: "materials", code: "paving_sand", name: "Песок для основания", unit: "m3", quantity: roundQuantity(area * 0.06), unitPrice: 1350, comment: "Песчаный слой.", materialKey: "sand" },
    { sectionType: "materials", code: "paving_crushed_stone", name: "Щебень для несущего слоя", unit: "m3", quantity: roundQuantity(area * 0.12), unitPrice: 1750, comment: "Щебеночная подушка.", materialKey: "crushed_stone" },
    { sectionType: "materials", code: "paving_bedding_mix", name: "Отсев / пескоцементная смесь", unit: "m3", quantity: roundQuantity(area * 0.04), unitPrice: 1650, comment: "Выравнивающий слой.", materialKey: "screenings_mix" },
    { sectionType: "materials", code: "paving_border", name: "Бордюр / поребрик", unit: "linear_m", quantity: edge, unitPrice: 420, comment: "Ориентировочный периметр покрытия.", materialKey: "curb" },
    { sectionType: "materials", code: "paving_border_concrete", name: "Бетон под бордюр", unit: "m3", quantity: roundQuantity(edge * 0.035), unitPrice: 5200, comment: "Бетонная обойма бордюра.", materialKey: "concrete" },
    { sectionType: "materials", code: "paving_stone_material", name: "Брусчатка / тротуарная плитка", unit: "sq_m", quantity: roundQuantity(area * 1.07), unitPrice: 820, comment: "Запас на резку и бой.", materialKey: "paving_stone" },
    { sectionType: "labor", code: "paving_geodesy_axis", name: "Геодезическая разбивка осей мощения", unit: "set", quantity: 1, unitPrice: 5200, comment: "Оси, границы и реперы для покрытия." },
    { sectionType: "labor", code: "paving_level_marks", name: "Перенос высотных отметок и уклонов покрытия", unit: "set", quantity: 1, unitPrice: 4800, comment: "Отметки под водоотвод и сопряжения." },
    { sectionType: "labor", code: "paving_existing_surface_check", name: "Обследование существующего основания и водоотвода", unit: "set", quantity: 1, unitPrice: 3600, comment: "Проверка основания до разработки корыта." },
    { sectionType: "labor", code: "paving_site_clearance", name: "Подготовка площадки и расчистка зоны работ", unit: "sq_m", quantity: area, unitPrice: 45, comment: "Расчистка перед земляными работами." },
    { sectionType: "labor", code: "paving_topsoil_removal", name: "Снятие плодородного слоя / слабого грунта", unit: "m3", quantity: roundQuantity(area * 0.08), unitPrice: 720, comment: "Слабые слои до устройства основания." },
    { sectionType: "delivery", code: "paving_soil_loading", name: "Погрузка вынутого грунта", unit: "m3", quantity: roundQuantity(area * 0.18), unitPrice: 260, comment: "Погрузка грунта после разработки корыта." },
    { sectionType: "delivery", code: "paving_soil_haulage", name: "Вывоз грунта после устройства корыта", unit: "trip", quantity: Math.max(1, Math.ceil(roundQuantity(area * 0.18) / 8)), unitPrice: 5600, comment: "Рейсы самосвала по объему корыта." },
    { sectionType: "labor", code: "paving_subgrade_compaction", name: "Уплотнение грунтового основания", unit: "sq_m", quantity: area, unitPrice: 85, comment: "Уплотнение основания перед слоями пирога." },
    { sectionType: "labor", code: "paving_subgrade_acceptance", name: "Контроль плотности и отметок основания", unit: "sq_m", quantity: area, unitPrice: 35, comment: "Контроль до засыпки инертных материалов." },
    { sectionType: "materials", code: "paving_geotextile_overlap", name: "Геотекстиль с нахлестами и подрезкой", unit: "sq_m", quantity: roundQuantity(area * 1.12), unitPrice: 74, comment: "Запас на нахлесты и выпуск к краям.", materialKey: "geotextile" },
    { sectionType: "labor", code: "paving_geotextile_laying", name: "Укладка геотекстиля с выпуском к краям", unit: "sq_m", quantity: roundQuantity(area * 1.12), unitPrice: 38, comment: "Монтаж разделительного слоя." },
    { sectionType: "materials", code: "paving_sand_leveling_layer", name: "Песчаный выравнивающий слой", unit: "m3", quantity: roundQuantity(area * 0.05), unitPrice: 1550, comment: "Подготовительный слой под основание.", materialKey: "sand" },
    { sectionType: "labor", code: "paving_sand_spreading", name: "Распределение и протяжка песчаного слоя", unit: "sq_m", quantity: area, unitPrice: 90, comment: "Распределение материала по отметкам." },
    { sectionType: "materials", code: "paving_lower_crushed_stone_layer", name: "Нижний слой щебеночного основания", unit: "m3", quantity: roundQuantity(area * 0.12 * 0.58), unitPrice: 1900, comment: "Нижняя фракция несущего слоя.", materialKey: "crushed_stone" },
    { sectionType: "materials", code: "paving_upper_crushed_stone_layer", name: "Верхний слой щебеночного основания", unit: "m3", quantity: roundQuantity(area * 0.12 * 0.42), unitPrice: 2050, comment: "Верхняя фракция для профилирования.", materialKey: "crushed_stone" },
    { sectionType: "equipment", code: "paving_layer_plate_compactor", name: "Послойное уплотнение основания виброплитой", unit: "shift", quantity: Math.max(1, Math.ceil(area / 220)), unitPrice: 6800, comment: "Механизация уплотнения слоев." },
    { sectionType: "equipment", code: "paving_roller", name: "Каток для уплотнения основания при большой площади", unit: "shift", quantity: Math.max(1, Math.ceil(area / 600)), unitPrice: 16500, comment: "Тяжелое уплотнение на больших объемах." },
    { sectionType: "labor", code: "paving_drainage_slope_forming", name: "Формирование уклонов к водоотводу", unit: "sq_m", quantity: area, unitPrice: 65, comment: "Профилирование основания под сток воды." },
    { sectionType: "labor", code: "paving_curb_trench", name: "Разработка канавки под бордюр / поребрик", unit: "linear_m", quantity: edge, unitPrice: 150, comment: "Подготовка посадочного места бордюра." },
    { sectionType: "materials", code: "paving_edge_restraint", name: "Краевые ограничители и крепеж мощения", unit: "linear_m", quantity: edge, unitPrice: 210, comment: "Фиксация кромок покрытия.", materialKey: "edge_restraint" },
    { sectionType: "labor", code: "paving_hatches_adjustment", name: "Подгонка отметок люков и примыканий", unit: "pcs", quantity: Math.max(1, Math.ceil(area / 250)), unitPrice: 2800, comment: "Сопряжения с люками и входными группами." },
    { sectionType: "materials", code: "paving_tactile_or_edge_tiles", name: "Доборные / тактильные элементы при примыканиях", unit: "sq_m", quantity: roundQuantity(area * 0.02), unitPrice: 980, comment: "Доборы и специальные элементы кромок.", materialKey: "paving_stone" },
    { sectionType: "labor", code: "paving_pattern_layout", name: "Раскладка рисунка и стартовых рядов брусчатки", unit: "sq_m", quantity: area, unitPrice: 65, comment: "Схема рядов до массовой укладки." },
    { sectionType: "labor", code: "paving_edge_zone_laying", name: "Укладка краевых зон и примыканий", unit: "linear_m", quantity: edge, unitPrice: 180, comment: "Отдельная трудоемкость по кромкам." },
    { sectionType: "labor", code: "paving_curve_cutting", name: "Резка брусчатки по радиусам и люкам", unit: "linear_m", quantity: roundQuantity(edge * 0.22), unitPrice: 260, comment: "Подрезка сложных участков." },
    { sectionType: "equipment", code: "paving_cutting_tool", name: "Аренда резчика брусчатки / алмазного инструмента", unit: "shift", quantity: Math.max(1, Math.ceil(edge / 80)), unitPrice: 6200, comment: "Резка доборных элементов." },
    { sectionType: "equipment", code: "paving_compaction_mat", name: "Виброуплотнение покрытия через защитный коврик", unit: "shift", quantity: Math.max(1, Math.ceil(area / 260)), unitPrice: 7200, comment: "Финишное уплотнение без повреждения лицевого слоя." },
    { sectionType: "labor", code: "paving_joint_second_sweep", name: "Повторная прометка и досыпка швов после уплотнения", unit: "sq_m", quantity: area, unitPrice: 45, comment: "Досыпка после осадки заполнителя." },
    { sectionType: "labor", code: "paving_drainage_interface", name: "Сопряжение мощения с лотками / водоприемниками", unit: "linear_m", quantity: Math.max(4, roundQuantity(edge * 0.18)), unitPrice: 220, comment: "Примыкания к водоотводным элементам." },
    { sectionType: "delivery", code: "paving_unloading", name: "Разгрузка и складирование брусчатки и инертных", unit: "trip", quantity: Math.max(1, Math.ceil(area / 220)), unitPrice: 5200, comment: "Приемка паллет и инертных материалов." },
    { sectionType: "delivery", code: "paving_internal_movement", name: "Перемещение паллет и инертных по площадке", unit: "set", quantity: 1, unitPrice: roundQuantity(area * 18), comment: "Внутриплощадочная логистика материалов." },
    { sectionType: "labor", code: "paving_quality_levels", name: "Контроль ровности покрытия правилом", unit: "sq_m", quantity: area, unitPrice: 35, comment: "Контроль плоскости после укладки." },
    { sectionType: "labor", code: "paving_quality_thickness", name: "Контроль толщины слоев основания", unit: "set", quantity: 1, unitPrice: 3600, comment: "Фиксация пирога основания." },
    { sectionType: "labor", code: "paving_as_built_measurement", name: "Исполнительный обмер фактической площади мощения", unit: "set", quantity: 1, unitPrice: 2800, comment: "Фактическая площадь для закрывающих документов." },
    { sectionType: "materials", code: "paving_waste_reserve", name: "Резерв брусчатки на бой и добор", unit: "sq_m", quantity: roundQuantity(area * 0.03), unitPrice: 720, comment: "Отдельный резерв для доборов и боя.", materialKey: "paving_stone_reserve" },
    { sectionType: "labor", code: "paving_border_install", name: "Установка бордюра на бетон", unit: "linear_m", quantity: edge, unitPrice: 260, comment: "Выставление по отметкам." },
    { sectionType: "labor", code: "paving_stone_cutting", name: "Резка брусчатки", unit: "sq_m", quantity: roundQuantity(area * 0.08), unitPrice: 520, comment: "Подрезка у бордюров и люков." },
    { sectionType: "labor", code: "paving_stone_laying_work", name: "Укладка брусчатки", unit: "sq_m", quantity: area, unitPrice: 480, comment: "Рядовая укладка по подготовленному основанию." },
    { sectionType: "equipment", code: "paving_plate_compactor", name: "Виброуплотнение / виброплита", unit: "shift", quantity: Math.max(1, Math.ceil(area / 300)), unitPrice: 5500, comment: "Уплотнение основания и покрытия." },
    { sectionType: "labor", code: "paving_joint_filling", name: "Заполнение швов песком / смесью", unit: "sq_m", quantity: area, unitPrice: 65, comment: "Финишная засыпка швов." },
    { sectionType: "delivery", code: "paving_material_delivery", name: "Доставка брусчатки, песка и щебня", unit: "trip", quantity: Math.max(1, Math.ceil(area / 180)), unitPrice: 4200, comment: "Количество рейсов зависит от плеча доставки." },
    { sectionType: "labor", code: "paving_final_cleaning", name: "Финишная очистка покрытия", unit: "sq_m", quantity: area, unitPrice: 35, comment: "Уборка поверхности после заполнения швов." },
    { sectionType: "materials", code: "paving_reserve", name: "Резерв на бой и добор брусчатки", unit: "sq_m", quantity: roundQuantity(area * 0.03), unitPrice: 820, comment: "Небольшой резерв материала.", materialKey: "paving_stone_reserve" },
  ];
  return {
    plan,
    rows,
    assumptions: ["Мощение рассчитано по площади покрытия.", "Кирпичная кладка и кладочные материалы не применяются.", "Толщина слоев уточняется по нагрузке и грунтам."],
    exclusions: ["Ливневая канализация", "Демонтаж существующего покрытия", "Геодезия и проект водоотвода"],
    costIncreaseFactors: ["Слабое основание", "Большая толщина пирога", "Сложная геометрия и много подрезки"],
    clarifyingQuestions: ["Какая нагрузка на покрытие: пешеходная или автомобильная?", "Нужен ли водоотвод?", "Какой формат и толщина брусчатки?"],
  };
}


function buildMetalCanopyBoq(plan: ConstructionWorkPlan): ProfessionalConstructionBoq {
  const area = plan.quantity.volume;
  const columns = Math.max(4, Math.ceil(area / 45) * 2);
  const steelKg = roundQuantity(area * 22);
  const beamsLm = roundQuantity(Math.sqrt(area) * 7);
  const rows: ProfessionalConstructionBoqRow[] = [
    { sectionType: "labor", code: "canopy_measure_scheme", name: "Обмер / схема металлического навеса", unit: "set", quantity: 1, unitPrice: 3500, comment: "Габариты, уклоны, точки опирания." },
    { sectionType: "labor", code: "canopy_snow_wind_calc", name: "Расчёт снеговой и ветровой нагрузки", unit: "set", quantity: 1, unitPrice: 6500, comment: "Предварительная проверка с учетом региона." },
    { sectionType: "materials", code: "canopy_foundations", name: "Фундаменты под стойки", unit: "m3", quantity: roundQuantity(columns * 0.16), unitPrice: 5400, comment: "Бетон под стойки.", materialKey: "concrete" },
    { sectionType: "materials", code: "canopy_embeds_anchors", name: "Закладные / анкера для стоек", unit: "pcs", quantity: columns, unitPrice: 950, comment: "Анкерная группа на каждую стойку.", materialKey: "anchors" },
    { sectionType: "materials", code: "canopy_columns", name: "Стойки металлические", unit: "pcs", quantity: columns, unitPrice: 9500, comment: "Количество стоек по площади навеса.", materialKey: "steel_columns" },
    { sectionType: "materials", code: "canopy_trusses_beams", name: "Фермы / балки металлические", unit: "kg", quantity: roundQuantity(steelKg * 0.38), unitPrice: 98, comment: "Несущие элементы покрытия.", materialKey: "steel_trusses" },
    { sectionType: "materials", code: "canopy_purlins", name: "Прогоны металлические", unit: "linear_m", quantity: beamsLm, unitPrice: 520, comment: "Прогоны под кровельное покрытие.", materialKey: "purlins" },
    { sectionType: "materials", code: "canopy_bracing", name: "Связи / раскосы металлического каркаса", unit: "kg", quantity: roundQuantity(steelKg * 0.12), unitPrice: 95, comment: "Пространственная жесткость.", materialKey: "bracing" },
    { sectionType: "materials", code: "canopy_roof_covering", name: "Кровельное покрытие для навеса", unit: "sq_m", quantity: roundQuantity(area * 1.08), unitPrice: 780, comment: "Профнастил/поликарбонат по выбранному решению.", materialKey: "roof_covering" },
    { sectionType: "materials", code: "canopy_roof_fasteners", name: "Саморезы / крепёж кровли навеса", unit: "set", quantity: 1, unitPrice: roundQuantity(area * 55), comment: "Крепление покрытия и доборов.", materialKey: "roof_fasteners" },
    { sectionType: "materials", code: "canopy_gutter", name: "Водосток навеса", unit: "linear_m", quantity: roundQuantity(Math.sqrt(area) * 2), unitPrice: 620, comment: "Водоотвод по нижним кромкам.", materialKey: "gutter" },
    { sectionType: "materials", code: "canopy_welding_consumables", name: "Сварочные материалы", unit: "kg", quantity: roundQuantity(steelKg * 0.018), unitPrice: 230, comment: "Электроды/проволока и газы.", materialKey: "welding" },
    { sectionType: "materials", code: "canopy_anticorrosion_primer", name: "Антикоррозионная грунтовка металла", unit: "kg", quantity: roundQuantity(steelKg * 0.025), unitPrice: 260, comment: "Грунт по металлу.", materialKey: "primer" },
    { sectionType: "materials", code: "canopy_base_plates", name: "Опорные пластины стоек навеса", unit: "pcs", quantity: columns, unitPrice: 1450, comment: "Пластины под крепление стоек к фундаментам.", materialKey: "base_plates" },
    { sectionType: "materials", code: "canopy_gusset_plates", name: "Косынки и фасонки узлов ферм", unit: "kg", quantity: roundQuantity(steelKg * 0.06), unitPrice: 112, comment: "Усиление сварных узлов и опор.", materialKey: "gusset_plates" },
    { sectionType: "materials", code: "canopy_flashings", name: "Доборные элементы кровельного покрытия навеса", unit: "linear_m", quantity: roundQuantity(Math.sqrt(area) * 4), unitPrice: 360, comment: "Торцевые планки, примыкания и капельники.", materialKey: "roof_flashings" },
    { sectionType: "materials", code: "canopy_roof_sealants", name: "Уплотнители и герметик кровли навеса", unit: "set", quantity: 1, unitPrice: roundQuantity(area * 35), comment: "Герметизация креплений и примыканий.", materialKey: "roof_sealants" },
    { sectionType: "labor", code: "canopy_foundation_excavation", name: "Разработка ям под фундаменты стоек", unit: "m3", quantity: roundQuantity(columns * 0.2), unitPrice: 850, comment: "Подготовка посадочных мест под опоры." },
    { sectionType: "labor", code: "canopy_embeds_install", name: "Установка закладных и анкерных групп", unit: "pcs", quantity: columns, unitPrice: 650, comment: "Выставление анкерных групп по осям." },
    { sectionType: "labor", code: "canopy_welding_quality", name: "Контроль сварных швов и геометрии металлокаркаса", unit: "kg", quantity: steelKg, unitPrice: 9, comment: "Визуальный контроль узлов перед окраской." },
    { sectionType: "equipment", code: "canopy_welding_equipment", name: "Сварочное оборудование и кабельные линии", unit: "shift", quantity: Math.max(1, Math.ceil(area / 250)), unitPrice: 5200, comment: "Оборудование для сборки металлокаркаса." },
    { sectionType: "delivery", code: "canopy_unloading", name: "Доставка и разгрузка металлоконструкций", unit: "trip", quantity: Math.max(1, Math.ceil(steelKg / 3500)), unitPrice: 4800, comment: "Такелаж и раскладка элементов на площадке." },
    { sectionType: "labor", code: "canopy_metal_painting", name: "Окраска металла", unit: "kg", quantity: steelKg, unitPrice: 24, comment: "Окраска каркаса после подготовки." },
    { sectionType: "labor", code: "canopy_column_install", name: "Монтаж стоек металлического навеса", unit: "pcs", quantity: columns, unitPrice: 1800, comment: "Установка и выверка стоек." },
    { sectionType: "labor", code: "canopy_truss_install", name: "Монтаж металлокаркаса: ферм / балок навеса", unit: "kg", quantity: roundQuantity(steelKg * 0.38), unitPrice: 32, comment: "Подъем и закрепление несущих элементов." },
    { sectionType: "labor", code: "canopy_purlin_install", name: "Монтаж прогонов", unit: "linear_m", quantity: beamsLm, unitPrice: 160, comment: "Монтаж прогонов по фермам." },
    { sectionType: "labor", code: "canopy_roof_install", name: "Монтаж кровельного покрытия навеса", unit: "sq_m", quantity: area, unitPrice: 360, comment: "Крепление листов и доборов." },
    { sectionType: "equipment", code: "canopy_lift_crane", name: "Кран / автовышка для монтажа навеса", unit: "shift", quantity: Math.max(1, Math.ceil(area / 220)), unitPrice: 18000, comment: "Механизация подъема элементов." },
    { sectionType: "delivery", code: "canopy_steel_delivery", name: "Доставка металла", unit: "trip", quantity: Math.max(1, Math.ceil(steelKg / 3500)), unitPrice: 6500, comment: "Доставка металлоконструкций." },
    { sectionType: "delivery", code: "canopy_roof_delivery", name: "Доставка кровельного покрытия", unit: "trip", quantity: Math.max(1, Math.ceil(area / 350)), unitPrice: 5200, comment: "Доставка листового материала." },
    { sectionType: "materials", code: "canopy_reserve", name: "Резерв на усиление узлов навеса", unit: "set", quantity: 1, unitPrice: roundQuantity(area * 180), comment: "Резерв на фасонки, косынки и узлы.", materialKey: "canopy_reserve" },
  ];
  return {
    plan,
    rows,
    assumptions: ["Навес считается как металлический каркас с кровельным покрытием.", "Нагрузки требуют проверки по району строительства.", "Фундаменты рассчитаны ориентировочно по числу стоек."],
    exclusions: ["Рабочий проект КМ/КМД", "Сложные земляные работы", "Подключение освещения и ливневая канализация"],
    costIncreaseFactors: ["Высокая снеговая нагрузка", "Большие пролеты без промежуточных стоек", "Ограниченный доступ техники"],
    clarifyingQuestions: ["Какое покрытие навеса нужно?", "Какая высота стоек и пролеты?", "Есть ли проект или требования по снеговой нагрузке?"],
  };
}


function buildApartmentRenovationBoq(plan: ConstructionWorkPlan): ProfessionalConstructionBoq {
  const area = plan.quantity.volume;
  const wetArea = roundQuantity(Math.max(6, area * 0.18));
  const rows: ProfessionalConstructionBoqRow[] = [
    { sectionType: "labor", code: "apt_measurements", name: "Обмер квартиры: обмеры и дефектовка", unit: "set", quantity: 1, unitPrice: 4500, comment: "Обмер, ведомость помещений и уточнение состава работ." },
    { sectionType: "labor", code: "apt_demolition_finishes", name: "Демонтаж warning: старая отделка и скрытые дефекты", unit: "sq_m", quantity: area, unitPrice: 320, comment: "Демонтаж покрытий в пределах капремонта; скрытые дефекты уточняются после вскрытия." },
    { sectionType: "delivery", code: "apt_waste_removal", name: "Вывоз мусора после демонтажа", unit: "trip", quantity: Math.max(1, Math.ceil(area / 25)), unitPrice: 3800, comment: "Рейсы зависят от этажа и подъезда." },
    { sectionType: "materials", code: "apt_electrical_cable", name: "Электрика: кабель, гофра, автоматы", unit: "set", quantity: 1, unitPrice: roundQuantity(area * 1850), comment: "Материалы для базовой замены электрики.", materialKey: "electrical" },
    { sectionType: "labor", code: "apt_electrical_labor", name: "Электрика: штробы, линии, щит и точки", unit: "set", quantity: 1, unitPrice: roundQuantity(area * 2300), comment: "Работы выполняет профильный специалист." },
    { sectionType: "materials", code: "apt_plumbing_materials", name: "Сантехника: трубы, фитинги, коллекторы", unit: "set", quantity: 1, unitPrice: roundQuantity(area * 1450), comment: "Материалы мокрых зон.", materialKey: "plumbing" },
    { sectionType: "labor", code: "apt_plumbing_labor", name: "Сантехника: разводка и монтаж черновых узлов", unit: "set", quantity: 1, unitPrice: roundQuantity(area * 1700), comment: "Черновая сантехника." },
    { sectionType: "materials", code: "apt_wet_waterproofing_material", name: "Гидроизоляция мокрых зон: материалы", unit: "sq_m", quantity: wetArea, unitPrice: 260, comment: "Праймер, мастика/мембрана и лента.", materialKey: "wet_waterproofing" },
    { sectionType: "labor", code: "apt_wet_waterproofing_labor", name: "Гидроизоляция мокрых зон: работы", unit: "sq_m", quantity: wetArea, unitPrice: 420, comment: "Нанесение и герметизация примыканий." },
    { sectionType: "materials", code: "apt_plaster_material", name: "Штукатурка стен: смесь и маяки", unit: "sq_m", quantity: roundQuantity(area * 2.4), unitPrice: 210, comment: "Ориентировочная площадь стен.", materialKey: "plaster" },
    { sectionType: "labor", code: "apt_plaster_labor", name: "Штукатурка стен", unit: "sq_m", quantity: roundQuantity(area * 2.4), unitPrice: 480, comment: "Выравнивание стен." },
    { sectionType: "materials", code: "apt_putty_material", name: "Шпаклёвка: материалы", unit: "sq_m", quantity: roundQuantity(area * 2.4), unitPrice: 120, comment: "Старт/финиш по стенам.", materialKey: "putty" },
    { sectionType: "labor", code: "apt_putty_labor", name: "Шпаклёвка стен", unit: "sq_m", quantity: roundQuantity(area * 2.4), unitPrice: 260, comment: "Подготовка под финишную отделку." },
    { sectionType: "materials", code: "apt_primer", name: "Грунтовка стен, потолков и пола", unit: "sq_m", quantity: roundQuantity(area * 3.5), unitPrice: 38, comment: "Межслойная грунтовка.", materialKey: "primer" },
    { sectionType: "materials", code: "apt_ceiling_materials", name: "Потолки: материалы", unit: "sq_m", quantity: area, unitPrice: 360, comment: "Материалы выбранного потолочного решения.", materialKey: "ceiling" },
    { sectionType: "labor", code: "apt_ceiling_labor", name: "Потолки: монтаж / отделка", unit: "sq_m", quantity: area, unitPrice: 520, comment: "Финиш потолков." },
    { sectionType: "materials", code: "apt_floor_screed_material", name: "Черновые смеси: стяжка / выравнивание пола", unit: "sq_m", quantity: area, unitPrice: 280, comment: "Смеси для выравнивания.", materialKey: "floor_leveling" },
    { sectionType: "labor", code: "apt_floor_screed_labor", name: "Стяжка / выравнивание пола", unit: "sq_m", quantity: area, unitPrice: 520, comment: "Черновое выравнивание пола." },
    { sectionType: "materials", code: "apt_floor_covering", name: "Финишные покрытия: напольное покрытие", unit: "sq_m", quantity: roundQuantity(area * 1.05), unitPrice: 750, comment: "Материал среднего класса.", materialKey: "floor_covering" },
    { sectionType: "labor", code: "apt_floor_covering_labor", name: "Монтаж напольного покрытия", unit: "sq_m", quantity: area, unitPrice: 420, comment: "Укладка покрытия." },
    { sectionType: "materials", code: "apt_tile_material", name: "Плитка для мокрых зон", unit: "sq_m", quantity: roundQuantity(wetArea * 1.12), unitPrice: 950, comment: "Плитка с запасом на подрезку.", materialKey: "tile" },
    { sectionType: "labor", code: "apt_tile_labor", name: "Укладка плитки", unit: "sq_m", quantity: wetArea, unitPrice: 950, comment: "Работы по плитке в мокрых зонах." },
    { sectionType: "materials", code: "apt_doors", name: "Двери межкомнатные и фурнитура", unit: "pcs", quantity: Math.max(2, Math.ceil(area / 18)), unitPrice: 8500, comment: "Ориентировочное количество дверей.", materialKey: "doors" },
    { sectionType: "labor", code: "apt_doors_install", name: "Монтаж дверей", unit: "pcs", quantity: Math.max(2, Math.ceil(area / 18)), unitPrice: 2500, comment: "Монтаж полотен и коробок." },
    { sectionType: "materials", code: "apt_lights_switches", name: "Свет / розетки / выключатели", unit: "pcs", quantity: Math.max(12, Math.ceil(area * 0.7)), unitPrice: 520, comment: "Финишные электроприборы.", materialKey: "electrical_finish" },
    { sectionType: "labor", code: "apt_lights_switches_install", name: "Монтаж света, розеток и выключателей", unit: "pcs", quantity: Math.max(12, Math.ceil(area * 0.7)), unitPrice: 380, comment: "Финишная установка точек." },
    { sectionType: "equipment", code: "apt_perforator_tools", name: "Перфоратор, миксер и пылезащита", unit: "shift", quantity: Math.max(1, Math.ceil(area / 60)), unitPrice: 1800, comment: "Инструмент и пылезащита для демонтажа и черновых работ." },
    { sectionType: "materials", code: "apt_consumables", name: "Расходники для капитального ремонта", unit: "set", quantity: 1, unitPrice: roundQuantity(area * 650), comment: "Пленка, крепеж, диски, ленты, мешки.", materialKey: "consumables" },
    { sectionType: "delivery", code: "apt_material_delivery", name: "Доставка материалов", unit: "trip", quantity: Math.max(2, Math.ceil(area / 20)), unitPrice: 3200, comment: "Партии черновых и финишных материалов." },
    { sectionType: "labor", code: "apt_final_cleaning", name: "Финишная уборка квартиры", unit: "sq_m", quantity: area, unitPrice: 160, comment: "Уборка после ремонта." },
    { sectionType: "materials", code: "apt_reserve", name: "Резерв на скрытые дефекты и доборы", unit: "set", quantity: 1, unitPrice: roundQuantity(area * 1200), comment: "Резерв без подмены детальной дефектовки.", materialKey: "apartment_reserve" },
  ];
  return {
    plan,
    rows,
    assumptions: ["Капитальный ремонт рассчитан по площади квартиры.", "Состав работ является предварительным и уточняется дефектовкой.", "Опасные электромонтажные и сантехнические работы выполняют профильные специалисты."],
    exclusions: ["Дизайн-проект", "Мебель и бытовая техника", "Перепланировка и согласования"],
    costIncreaseFactors: ["Старый фонд и скрытые дефекты", "Сложная электрика/сантехника", "Высокий этаж, отсутствие лифта, срочность"],
    clarifyingQuestions: ["Нужна ли перепланировка?", "Какой класс материалов нужен?", "Есть ли демонтаж, перенос мокрых зон или замена окон?"],
  };
}


function buildGableRoofBoq(plan: ConstructionWorkPlan): ProfessionalConstructionBoq {
  const area = plan.quantity.volume;
  const baseArea = plan.quantity.dimensions?.baseAreaSqM ?? area;
  const ridgeLm = roundQuantity(Math.sqrt(baseArea));
  const rows: ProfessionalConstructionBoqRow[] = [
    { sectionType: "materials", code: "gable_wall_plate", name: "Мауэрлат", unit: "linear_m", quantity: roundQuantity(Math.sqrt(baseArea) * 4), unitPrice: 520, comment: "Опорный брус по периметру.", materialKey: "wall_plate" },
    { sectionType: "materials", code: "gable_rafters", name: "Стропила", unit: "linear_m", quantity: roundQuantity(area * 0.85), unitPrice: 480, comment: "Стропильные ноги по площади скатов.", materialKey: "rafters" },
    { sectionType: "materials", code: "gable_ridge_beam", name: "Коньковый прогон", unit: "linear_m", quantity: ridgeLm, unitPrice: 620, comment: "Конек не является первичным объемом сметы.", materialKey: "ridge" },
    { sectionType: "materials", code: "gable_ridge_posts", name: "Стойки конькового прогона", unit: "pcs", quantity: Math.max(2, Math.ceil(ridgeLm / 3)), unitPrice: 540, comment: "Опоры конькового прогона.", materialKey: "ridge_posts" },
    { sectionType: "materials", code: "gable_membrane", name: "Мембрана / гидроизоляция кровли", unit: "sq_m", quantity: roundQuantity(area * 1.12), unitPrice: 95, comment: "Подкровельная мембрана с нахлестом.", materialKey: "membrane" },
    { sectionType: "materials", code: "gable_counter_batten", name: "Контробрешётка / контробрешетка", unit: "linear_m", quantity: roundQuantity(area * 1.4), unitPrice: 85, comment: "Вентзазор под покрытием.", materialKey: "counter_batten" },
    { sectionType: "materials", code: "gable_batten", name: "Обрешётка / обрешетка", unit: "sq_m", quantity: area, unitPrice: 160, comment: "Обрешетка под выбранное покрытие.", materialKey: "batten" },
    { sectionType: "materials", code: "gable_roof_covering", name: "Кровельное покрытие", unit: "sq_m", quantity: roundQuantity(area * 1.08), unitPrice: 780, comment: "Материал с запасом на подрезку.", materialKey: "roof_covering" },
    { sectionType: "materials", code: "gable_flashings", name: "Доборные элементы кровли", unit: "linear_m", quantity: roundQuantity(Math.sqrt(baseArea) * 5), unitPrice: 420, comment: "Конек, ветровые и карнизные планки.", materialKey: "flashings" },
    { sectionType: "materials", code: "gable_gutter", name: "Водосток", unit: "linear_m", quantity: roundQuantity(Math.sqrt(baseArea) * 2), unitPrice: 650, comment: "Желоба и комплектующие.", materialKey: "gutter" },
    { sectionType: "materials", code: "gable_fasteners", name: "Крепёж для профнастила / кровельного покрытия", unit: "set", quantity: 1, unitPrice: roundQuantity(area * 70), comment: "Кровельные саморезы и крепежные элементы.", materialKey: "fasteners" },
    { sectionType: "materials", code: "gable_antiseptic", name: "Антисептик для деревянной стропильной системы", unit: "sq_m", quantity: roundQuantity(area * 0.8), unitPrice: 55, comment: "Защита древесины.", materialKey: "antiseptic" },
    { sectionType: "materials", code: "gable_timber_connectors", name: "Перфорированные пластины и уголки стропильной системы", unit: "set", quantity: 1, unitPrice: roundQuantity(area * 85), comment: "Узловой крепеж стропил, мауэрлата и прогонов.", materialKey: "timber_connectors" },
    { sectionType: "materials", code: "gable_vapor_barrier", name: "Пароизоляционная пленка под кровельный пирог", unit: "sq_m", quantity: roundQuantity(area * 1.08), unitPrice: 70, comment: "Дополнительный слой защиты пирога.", materialKey: "vapor_barrier" },
    { sectionType: "materials", code: "gable_eaves_board", name: "Карнизная доска / подшивка свесов", unit: "linear_m", quantity: roundQuantity(Math.sqrt(baseArea) * 4), unitPrice: 360, comment: "Материал карнизных выпусков.", materialKey: "eaves_board" },
    { sectionType: "materials", code: "gable_end_trim", name: "Ендовы / торцевые планки кровли", unit: "linear_m", quantity: roundQuantity(Math.sqrt(baseArea) * 3), unitPrice: 390, comment: "Доборы сложных примыканий и торцов.", materialKey: "end_trim" },
    { sectionType: "materials", code: "gable_snow_guards", name: "Снегозадержатели warning: по снеговой нагрузке", unit: "linear_m", quantity: roundQuantity(Math.sqrt(baseArea) * 2), unitPrice: 720, comment: "Предварительная позиция, уточняется по проекту.", materialKey: "snow_guards" },
    { sectionType: "labor", code: "gable_wall_plate_install", name: "Монтаж мауэрлата", unit: "linear_m", quantity: roundQuantity(Math.sqrt(baseArea) * 4), unitPrice: 260, comment: "Крепление к основанию." },
    { sectionType: "labor", code: "gable_rafter_system_install", name: "Монтаж стропильной системы", unit: "sq_m", quantity: area, unitPrice: 680, comment: "Сборка стропил, прогонов и стоек." },
    { sectionType: "labor", code: "gable_timber_treatment", name: "Антисептическая обработка стропил и мауэрлата", unit: "sq_m", quantity: roundQuantity(area * 0.8), unitPrice: 65, comment: "Обработка древесины до закрытия пирога." },
    { sectionType: "labor", code: "gable_ridge_install", name: "Монтаж конькового прогона и стоек", unit: "linear_m", quantity: ridgeLm, unitPrice: 340, comment: "Сборка верхнего несущего узла." },
    { sectionType: "labor", code: "gable_membrane_batten_install", name: "Монтаж мембраны / обрешётки / обрешетки", unit: "sq_m", quantity: area, unitPrice: 280, comment: "Мембрана, контробрешетка и обрешетка." },
    { sectionType: "labor", code: "gable_batten_install", name: "Монтаж обрешётки / монтаж обрешетки", unit: "sq_m", quantity: area, unitPrice: 180, comment: "Отдельная расценка на шаг и крепление обрешетки." },
    { sectionType: "labor", code: "gable_roof_covering_install", name: "Монтаж кровли", unit: "sq_m", quantity: area, unitPrice: 520, comment: "Монтаж покрытия и доборов." },
    { sectionType: "labor", code: "gable_flashings_install", name: "Монтаж доборных элементов кровли", unit: "linear_m", quantity: roundQuantity(Math.sqrt(baseArea) * 5), unitPrice: 240, comment: "Конек, ветровые планки и примыкания." },
    { sectionType: "labor", code: "gable_eaves_install", name: "Устройство карнизных свесов", unit: "linear_m", quantity: roundQuantity(Math.sqrt(baseArea) * 4), unitPrice: 260, comment: "Подшивка и подготовка карнизов." },
    { sectionType: "labor", code: "gable_gutter_install", name: "Монтаж водостока", unit: "linear_m", quantity: roundQuantity(Math.sqrt(baseArea) * 2), unitPrice: 280, comment: "Крепление желобов и выпусков." },
    { sectionType: "labor", code: "gable_roof_geometry_control", name: "Контроль диагоналей и плоскости скатов", unit: "set", quantity: 1, unitPrice: 3600, comment: "Контроль геометрии до монтажа покрытия." },
    { sectionType: "delivery", code: "gable_delivery", name: "Доставка кровельных материалов", unit: "trip", quantity: Math.max(1, Math.ceil(area / 220)), unitPrice: 5200, comment: "Доставка древесины и покрытия." },
    { sectionType: "delivery", code: "gable_lumber_delivery", name: "Доставка пиломатериалов для стропильной системы", unit: "trip", quantity: Math.max(1, Math.ceil(area / 160)), unitPrice: 5600, comment: "Отдельная поставка мауэрлата, стропил и обрешетки." },
    { sectionType: "equipment", code: "gable_scaffold_safety", name: "Леса / страховка для кровельных работ", unit: "set", quantity: 1, unitPrice: roundQuantity(area * 180), comment: "Безопасность работ на высоте." },
    { sectionType: "equipment", code: "gable_lift", name: "Подъемник для кровельных материалов", unit: "shift", quantity: Math.max(1, Math.ceil(area / 180)), unitPrice: 15000, comment: "Подача покрытия и пиломатериалов на высоту." },
    { sectionType: "materials", code: "gable_reserve", name: "Резерв на примыкания и подрезку кровли", unit: "set", quantity: 1, unitPrice: roundQuantity(area * 120), comment: "Резерв на сложные узлы.", materialKey: "gable_reserve" },
  ];
  return {
    plan,
    rows,
    assumptions: ["Двускатная крыша рассчитывается по площади скатов, а не по высоте конька.", "Тип покрытия и уклон уточняются перед договором.", "Работы на высоте требуют безопасного доступа."],
    exclusions: ["Утепление мансарды", "Проект стропильной системы", "Демонтаж старой кровли"],
    costIncreaseFactors: ["Большой уклон", "Сложные примыкания", "Высота и ограниченный доступ"],
    clarifyingQuestions: ["Какой тип покрытия нужен?", "Есть ли проект стропил?", "Нужны ли утепление, снегозадержатели и водосток?"],
  };
}


function buildRoofWaterproofingBoq(plan: ConstructionWorkPlan): ProfessionalConstructionBoq {
  const area = plan.quantity.volume;
  const detailLm = roundQuantity(Math.sqrt(area) * 4);
  const rows: ProfessionalConstructionBoqRow[] = [
    { sectionType: "labor", code: "roof_wp_cleaning", name: "Очистка кровли", unit: "sq_m", quantity: area, unitPrice: 95, comment: "Очистка основания перед гидроизоляцией." },
    { sectionType: "labor", code: "roof_wp_defect_repair", name: "Ремонт дефектов основания кровли", unit: "sq_m", quantity: roundQuantity(area * 0.15), unitPrice: 480, comment: "Локальные дефекты и трещины." },
    { sectionType: "materials", code: "roof_wp_primer", name: "Праймер для кровли", unit: "sq_m", quantity: area, unitPrice: 85, comment: "Грунтование основания.", materialKey: "primer" },
    { sectionType: "materials", code: "roof_wp_membrane", name: "Рулонная гидроизоляция / мембрана / мастика", unit: "sq_m", quantity: roundQuantity(area * 1.12), unitPrice: 520, comment: "Материал с нахлестом.", materialKey: "membrane" },
    { sectionType: "materials", code: "roof_wp_detail_tape", name: "Лента и герметик для примыканий и парапетов", unit: "linear_m", quantity: detailLm, unitPrice: 190, comment: "Примыкания, парапеты и ендовы.", materialKey: "detail_tape" },
    { sectionType: "materials", code: "roof_wp_drains", name: "Воронки / проходки кровли", unit: "pcs", quantity: Math.max(1, Math.ceil(area / 120)), unitPrice: 1450, comment: "Узлы проходов и водоприема.", materialKey: "drains" },
    { sectionType: "labor", code: "roof_wp_primer_labor", name: "Нанесение праймера", unit: "sq_m", quantity: area, unitPrice: 90, comment: "Подготовка адгезии." },
    { sectionType: "labor", code: "roof_wp_application", name: "Монтаж / нанесение гидроизоляции крыши", unit: "sq_m", quantity: area, unitPrice: 430, comment: "Основной гидроизоляционный слой." },
    { sectionType: "labor", code: "roof_wp_detail_sealing", name: "Герметизация узлов и протечек на примыканиях кровли", unit: "linear_m", quantity: detailLm, unitPrice: 260, comment: "Узлы повышенного риска протечек." },
    { sectionType: "labor", code: "roof_wp_penetration_sealing", name: "Герметизация воронок / проходок", unit: "pcs", quantity: Math.max(1, Math.ceil(area / 120)), unitPrice: 900, comment: "Герметизация проходов." },
    { sectionType: "labor", code: "roof_wp_leak_test", name: "Проверка герметичности и контроль протечек", unit: "set", quantity: 1, unitPrice: 3500, comment: "Контроль после устройства слоя." },
    { sectionType: "delivery", code: "roof_wp_delivery", name: "Доставка гидроизоляционных материалов", unit: "trip", quantity: Math.max(1, Math.ceil(area / 250)), unitPrice: 4200, comment: "Доставка рулонов/мастики и расходников." },
    { sectionType: "equipment", code: "roof_wp_safety_access", name: "Леса / страховка для гидроизоляции кровли", unit: "set", quantity: 1, unitPrice: roundQuantity(area * 120), comment: "Безопасный доступ на кровлю." },
  ];
  return {
    plan,
    rows,
    assumptions: ["Гидроизоляция относится к кровле, не к ванной комнате.", "Состояние основания уточняется осмотром.", "Тип материала подбирается по кровельной системе."],
    exclusions: ["Полная замена кровельного пирога", "Утепление", "Ремонт несущих конструкций"],
    costIncreaseFactors: ["Много примыканий", "Старое поврежденное основание", "Высота и сложный доступ"],
    clarifyingQuestions: ["Какая кровля: плоская или скатная?", "Есть ли протечки и повреждения основания?", "Какой материал нужен: рулонный, мембрана или мастика?"],
  };
}


const FORBIDDEN_STANDALONE = [
  "материал",
  "кровля",
  "монтаж",
  "крепеж",
  "крепёж",
  "работы",
  "прочее",
  "дополнительные материалы",
  "дополнительные работы",
  "строительные работы",
  "ремонт кровли",
];

export function isWeakGenericRowName(value: string): boolean {
  const normalized = value.replace(/\s+/g, " ").trim().toLocaleLowerCase("ru-RU");
  return FORBIDDEN_STANDALONE.includes(normalized);
}

export function assertNoWeakGenericRows(rows: readonly Pick<ProfessionalConstructionBoqRow, "name" | "code">[]): void {
  const bad = rows.filter((row) => isWeakGenericRowName(row.name));
  if (bad.length > 0) {
    throw new Error(`WEAK_GENERIC_BOQ_ROWS:${bad.map((row) => `${row.code}:${row.name}`).join(",")}`);
  }
}


function minimumRowsFor(complexity: ConstructionComplexity): number {
  if (complexity === "complex") return 30;
  if (complexity === "infrastructure") return 45;
  if (complexity === "medium") return 18;
  return 12;
}

export function validateBoqRowQuality(result: ProfessionalConstructionBoq): {
  passed: boolean;
  failures: string[];
  rowCount: number;
  minimum: number;
} {
  const failures: string[] = [];
  const rowCount = result.rows.length;
  const minimum = minimumRowsFor(result.plan.complexity);
  if (rowCount < minimum) failures.push(`row_depth:${rowCount}/${minimum}`);
  for (const row of result.rows) {
    if (!row.name.trim()) failures.push(`row_name_empty:${row.code}`);
    if (isWeakGenericRowName(row.name)) failures.push(`weak_generic:${row.code}`);
    if (!Number.isFinite(row.quantity) || row.quantity <= 0) failures.push(`quantity_invalid:${row.code}`);
    if (!Number.isFinite(row.unitPrice) || row.unitPrice <= 0) failures.push(`unit_price_invalid:${row.code}`);
  }
  return { passed: failures.length === 0, failures, rowCount, minimum };
}

export function compileBoqFromConstructionWorkPlan(plan: ConstructionWorkPlan): ProfessionalConstructionBoq {
  const result =
    plan.workKey === "linoleum_laying" ? buildLinoleumBoq(plan) :
      plan.workKey === "paving_stone_laying" ? buildPavingStoneBoq(plan) :
        plan.workKey === "metal_canopy_installation" ? buildMetalCanopyBoq(plan) :
          plan.workKey === "apartment_capital_renovation" ? buildApartmentRenovationBoq(plan) :
            plan.workKey === "gable_roof_installation" ? buildGableRoofBoq(plan) :
              plan.workKey === "roof_waterproofing" ? buildRoofWaterproofingBoq(plan) :
                null;

  if (!result) {
    throw new Error(`PROFESSIONAL_BOQ_UNSUPPORTED_WORK_KEY:${plan.workKey}`);
  }
  assertNoWeakGenericRows(result.rows);
  const quality = validateBoqRowQuality(result);
  if (!quality.passed) {
    throw new Error(`PROFESSIONAL_BOQ_ROW_QUALITY_FAILED:${quality.failures.join(",")}`);
  }
  return result;
}
