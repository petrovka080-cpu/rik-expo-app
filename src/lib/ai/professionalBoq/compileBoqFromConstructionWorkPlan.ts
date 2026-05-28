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
    { sectionType: "materials", code: "linoleum_roll", name: "Линолеум с запасом на раскрой", unit: "sq_m", quantity: roundQuantity(area * 1.08), unitPrice: 680, comment: "Запас на подрезку и рисунок.", materialKey: "linoleum" },
    { sectionType: "materials", code: "linoleum_fixing", name: "Клей / двухсторонняя лента / фиксация линолеума", unit: "sq_m", quantity: area, unitPrice: 120, comment: "Тип фиксации уточняется по основанию.", materialKey: "adhesive" },
    { sectionType: "materials", code: "linoleum_baseboard", name: "Плинтус напольный", unit: "linear_m", quantity: perimeter, unitPrice: 180, comment: "Ориентировочный периметр по площади.", materialKey: "baseboard" },
    { sectionType: "materials", code: "linoleum_thresholds", name: "Порожки и стыковочные профили", unit: "pcs", quantity: Math.max(1, Math.ceil(area / 35)), unitPrice: 450, comment: "Количество зависит от дверных проемов.", materialKey: "thresholds" },
    { sectionType: "labor", code: "linoleum_cutting", name: "Раскрой линолеума", unit: "sq_m", quantity: area, unitPrice: 85, comment: "Раскрой с учетом примыканий." },
    { sectionType: "labor", code: "linoleum_laying_work", name: "Укладка линолеума", unit: "sq_m", quantity: area, unitPrice: 260, comment: "Основная укладка покрытия." },
    { sectionType: "labor", code: "linoleum_trim_edges", name: "Подрезка примыканий и углов", unit: "linear_m", quantity: perimeter, unitPrice: 75, comment: "Подрезка по стенам, коробкам и трубам." },
    { sectionType: "labor", code: "linoleum_baseboard_install", name: "Монтаж плинтуса", unit: "linear_m", quantity: perimeter, unitPrice: 120, comment: "Монтаж по периметру помещения." },
    { sectionType: "labor", code: "linoleum_threshold_install", name: "Монтаж порожков", unit: "pcs", quantity: Math.max(1, Math.ceil(area / 35)), unitPrice: 250, comment: "Стыки и дверные проемы." },
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
    { sectionType: "labor", code: "apt_measurements", name: "Обмеры квартиры и дефектовка", unit: "set", quantity: 1, unitPrice: 4500, comment: "Обмеры, ведомость помещений и уточнение состава работ." },
    { sectionType: "labor", code: "apt_demolition_finishes", name: "Демонтаж старой отделки", unit: "sq_m", quantity: area, unitPrice: 320, comment: "Демонтаж покрытий в пределах капремонта." },
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
    { sectionType: "materials", code: "apt_floor_screed_material", name: "Стяжка / выравнивание пола: материалы", unit: "sq_m", quantity: area, unitPrice: 280, comment: "Смеси для выравнивания.", materialKey: "floor_leveling" },
    { sectionType: "labor", code: "apt_floor_screed_labor", name: "Стяжка / выравнивание пола", unit: "sq_m", quantity: area, unitPrice: 520, comment: "Черновое выравнивание пола." },
    { sectionType: "materials", code: "apt_floor_covering", name: "Напольное покрытие", unit: "sq_m", quantity: roundQuantity(area * 1.05), unitPrice: 750, comment: "Материал среднего класса.", materialKey: "floor_covering" },
    { sectionType: "labor", code: "apt_floor_covering_labor", name: "Монтаж напольного покрытия", unit: "sq_m", quantity: area, unitPrice: 420, comment: "Укладка покрытия." },
    { sectionType: "materials", code: "apt_tile_material", name: "Плитка для мокрых зон", unit: "sq_m", quantity: roundQuantity(wetArea * 1.12), unitPrice: 950, comment: "Плитка с запасом на подрезку.", materialKey: "tile" },
    { sectionType: "labor", code: "apt_tile_labor", name: "Укладка плитки", unit: "sq_m", quantity: wetArea, unitPrice: 950, comment: "Работы по плитке в мокрых зонах." },
    { sectionType: "materials", code: "apt_doors", name: "Двери межкомнатные и фурнитура", unit: "pcs", quantity: Math.max(2, Math.ceil(area / 18)), unitPrice: 8500, comment: "Ориентировочное количество дверей.", materialKey: "doors" },
    { sectionType: "labor", code: "apt_doors_install", name: "Монтаж дверей", unit: "pcs", quantity: Math.max(2, Math.ceil(area / 18)), unitPrice: 2500, comment: "Монтаж полотен и коробок." },
    { sectionType: "materials", code: "apt_lights_switches", name: "Свет / розетки / выключатели", unit: "pcs", quantity: Math.max(12, Math.ceil(area * 0.7)), unitPrice: 520, comment: "Финишные электроприборы.", materialKey: "electrical_finish" },
    { sectionType: "labor", code: "apt_lights_switches_install", name: "Монтаж света, розеток и выключателей", unit: "pcs", quantity: Math.max(12, Math.ceil(area * 0.7)), unitPrice: 380, comment: "Финишная установка точек." },
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
    { sectionType: "materials", code: "gable_counter_batten", name: "Контробрешётка", unit: "linear_m", quantity: roundQuantity(area * 1.4), unitPrice: 85, comment: "Вентзазор под покрытием.", materialKey: "counter_batten" },
    { sectionType: "materials", code: "gable_batten", name: "Обрешётка", unit: "sq_m", quantity: area, unitPrice: 160, comment: "Обрешетка под выбранное покрытие.", materialKey: "batten" },
    { sectionType: "materials", code: "gable_roof_covering", name: "Кровельное покрытие", unit: "sq_m", quantity: roundQuantity(area * 1.08), unitPrice: 780, comment: "Материал с запасом на подрезку.", materialKey: "roof_covering" },
    { sectionType: "materials", code: "gable_flashings", name: "Доборные элементы кровли", unit: "linear_m", quantity: roundQuantity(Math.sqrt(baseArea) * 5), unitPrice: 420, comment: "Конек, ветровые и карнизные планки.", materialKey: "flashings" },
    { sectionType: "materials", code: "gable_gutter", name: "Водосток", unit: "linear_m", quantity: roundQuantity(Math.sqrt(baseArea) * 2), unitPrice: 650, comment: "Желоба и комплектующие.", materialKey: "gutter" },
    { sectionType: "materials", code: "gable_fasteners", name: "Крепёж для профнастила / кровельного покрытия", unit: "set", quantity: 1, unitPrice: roundQuantity(area * 70), comment: "Кровельные саморезы и крепежные элементы.", materialKey: "fasteners" },
    { sectionType: "materials", code: "gable_antiseptic", name: "Антисептик для деревянной стропильной системы", unit: "sq_m", quantity: roundQuantity(area * 0.8), unitPrice: 55, comment: "Защита древесины.", materialKey: "antiseptic" },
    { sectionType: "labor", code: "gable_wall_plate_install", name: "Монтаж мауэрлата", unit: "linear_m", quantity: roundQuantity(Math.sqrt(baseArea) * 4), unitPrice: 260, comment: "Крепление к основанию." },
    { sectionType: "labor", code: "gable_rafter_system_install", name: "Монтаж стропильной системы", unit: "sq_m", quantity: area, unitPrice: 680, comment: "Сборка стропил, прогонов и стоек." },
    { sectionType: "labor", code: "gable_membrane_batten_install", name: "Монтаж мембраны / обрешётки", unit: "sq_m", quantity: area, unitPrice: 280, comment: "Мембрана, контробрешетка и обрешетка." },
    { sectionType: "labor", code: "gable_roof_covering_install", name: "Монтаж кровли", unit: "sq_m", quantity: area, unitPrice: 520, comment: "Монтаж покрытия и доборов." },
    { sectionType: "labor", code: "gable_gutter_install", name: "Монтаж водостока", unit: "linear_m", quantity: roundQuantity(Math.sqrt(baseArea) * 2), unitPrice: 280, comment: "Крепление желобов и выпусков." },
    { sectionType: "delivery", code: "gable_delivery", name: "Доставка кровельных материалов", unit: "trip", quantity: Math.max(1, Math.ceil(area / 220)), unitPrice: 5200, comment: "Доставка древесины и покрытия." },
    { sectionType: "equipment", code: "gable_scaffold_safety", name: "Леса / страховка для кровельных работ", unit: "set", quantity: 1, unitPrice: roundQuantity(area * 180), comment: "Безопасность работ на высоте." },
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
