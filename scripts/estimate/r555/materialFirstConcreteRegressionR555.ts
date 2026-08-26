import { compileFormulaGraph, type FormulaAst } from "../../../src/lib/estimate/backendPlatform/formulaGraph";
import { semanticSha256 } from "../concreteBackendR5/support";

export const R555_MATERIAL_FIRST_CONTRACT =
  "r555.material-first-concrete-regression.v1" as const;

export const R555_REGRESSION_CATALOG_IDS = Object.freeze([
  "concrete_foundation_interior_anchor_group_pour_high_load",
  "concrete_foundation_interior_belt_pour_repair",
] as const);

export type R555RegressionCatalogId = (typeof R555_REGRESSION_CATALOG_IDS)[number];

export type R555MaterialFirstParameter = {
  parameterId: string;
  ordinal: number;
  valueType: "decimal" | "integer" | "boolean";
  unitId: string | null;
  titleRu: string;
  required: boolean;
  defaultValue: null;
  constraints: Record<string, unknown>;
};

export type R555MaterialFirstFormula = {
  formulaId: string;
  outputUnitId: string;
  expressionSource: string;
  ast: FormulaAst;
  inputParameterIds: string[];
  astSha256: string;
};

export type R555MaterialFirstResource = {
  rowId: string;
  ordinal: number;
  section: string;
  category: string;
  titleRu: string;
  rowType: "material" | "labor" | "equipment" | "service";
  unitId: string;
  formulaId: string;
  inclusionAst: Record<string, unknown>;
  resourceGraph: Record<string, unknown>;
  semanticOwner: string;
  costOwnerId: string;
  procurementEligible: boolean;
  sourceMetadata: Record<string, unknown>;
  rowSha256: string;
};

export type R555MaterialFirstDefinition = {
  catalogId: R555RegressionCatalogId;
  titleRu: string;
  aliasesRu: string[];
  physicalResultRu: string;
  includedScopeRu: string[];
  excludedScopeRu: string[];
  parameters: R555MaterialFirstParameter[];
  formulas: R555MaterialFirstFormula[];
  resources: R555MaterialFirstResource[];
  baseline: Record<string, number | boolean>;
  passport: Record<string, unknown>;
  applicability: Record<string, unknown>;
  definitionSha256: string;
};

type ParameterSpec = Omit<R555MaterialFirstParameter, "ordinal" | "defaultValue">;
type RowSpec = {
  key: string;
  section: string;
  category: "Материалы" | "Труд" | "Механизмы" | "Доставка" | "Контроль качества";
  titleRu: string;
  rowType: R555MaterialFirstResource["rowType"];
  unitId: string;
  expression: string;
  procurementEligible: boolean;
  sourceRole: "PROJECT" | "KRER" | "SUPPLIER" | "LABORATORY" | "EQUIPMENT";
  packageRu: string;
  deliveryRu: string;
  applicabilityRu: string;
};

const KRER = Object.freeze({
  sourceId: "krer_06_2015",
  documentCode: "КРЕР 81-02-06-2015",
  rateCode: "06-01-001-09",
  officialUrl: "https://minstroy.gov.kg/ru/kyzmat/422/show",
  officialPdfSha256: "45c065fb0e35586948fdb06cd21fe331358e2c454c25a4dc83d4a686bf9f3e4b",
  exactLocator: "КРЕР № 6, таблица 06-01-001, расценка 06-01-001-09, страница PDF 18",
});

const SOURCE_BY_ROLE = Object.freeze({
  PROJECT: {
    sourceId: "approved_project_baseline_r555",
    titleRu: "Утверждённая ведомость объёмов контрольной сметы R5.5.5",
    exactLocator: "Параметры неизменяемого контрольного сценария конкретной работы",
  },
  KRER,
  SUPPLIER: {
    sourceId: "kg_supplier_offer_r555",
    titleRu: "Предложение поставщика для контрольной сметы в Бишкеке",
    exactLocator: "Снимок предложения с датой и характеристиками материала",
  },
  LABORATORY: {
    sourceId: "kg_concrete_laboratory_scope_r555",
    titleRu: "Ведомость услуг лаборатории по контролю бетона",
    exactLocator: "Подвижность, образцы, прочность, геометрия и визуальный контроль",
  },
  EQUIPMENT: {
    sourceId: "kg_equipment_offer_r555",
    titleRu: "Предложение по эксплуатации строительного механизма в Бишкеке",
    exactLocator: "Машино-часы выбранного механизма с оператором",
  },
});

function formula(catalogId: string, key: string, unitId: string, expression: string): R555MaterialFirstFormula {
  const compiled = compileFormulaGraph(expression);
  return {
    formulaId: `r555:${catalogId}:${key}:formula`,
    outputUnitId: unitId,
    expressionSource: compiled.source,
    ast: compiled.ast,
    inputParameterIds: compiled.inputParameterIds,
    astSha256: semanticSha256(compiled.ast),
  };
}

function commonParameters(): ParameterSpec[] {
  return [
    { parameterId: "work_included", valueType: "boolean", unitId: null, titleRu: "Работа включена в смету", required: true, constraints: {} },
    { parameterId: "concrete_volume_m3", valueType: "decimal", unitId: "m3", titleRu: "Объём бетона в конструкции", required: true, constraints: { min: 0.1, max: 10_000 } },
    { parameterId: "reinforcement_mass_kg", valueType: "decimal", unitId: "kg", titleRu: "Масса арматуры по проектной ведомости", required: true, constraints: { min: 1, max: 10_000_000 } },
    { parameterId: "formwork_area_m2", valueType: "decimal", unitId: "m2", titleRu: "Площадь контакта опалубки с бетоном", required: true, constraints: { min: 0.1, max: 1_000_000 } },
    { parameterId: "curing_area_m2", valueType: "decimal", unitId: "m2", titleRu: "Площадь ухода за бетоном", required: true, constraints: { min: 0.1, max: 1_000_000 } },
    { parameterId: "technological_waste_percent", valueType: "decimal", unitId: "percent", titleRu: "Технологический запас бетонной смеси", required: true, constraints: { min: 0, max: 10 } },
    { parameterId: "delivery_distance_km", valueType: "decimal", unitId: "km", titleRu: "Расстояние доставки до объекта", required: true, constraints: { min: 0.1, max: 2_000 } },
    { parameterId: "pump_productivity_m3_h", valueType: "decimal", unitId: "m3_per_hour", titleRu: "Производительность автобетононасоса", required: true, constraints: { min: 1, max: 200 } },
    { parameterId: "vibrator_productivity_m3_h", valueType: "decimal", unitId: "m3_per_hour", titleRu: "Производительность глубинного вибратора", required: true, constraints: { min: 1, max: 100 } },
    { parameterId: "test_lot_volume_m3", valueType: "decimal", unitId: "m3", titleRu: "Объём партии для одного комплекта испытаний", required: true, constraints: { min: 1, max: 1_000 } },
  ];
}

function commonRows(): RowSpec[] {
  return [
    { key: "concrete_b25", section: "Основные материалы", category: "Материалы", titleRu: "Бетонная смесь тяжёлая B25, W6, F150, подвижность П4", rowType: "material", unitId: "m3", expression: "concrete_volume_m3 * (1 + technological_waste_percent / 100)", procurementEligible: true, sourceRole: "SUPPLIER", packageRu: "Отпуск автобетоносмесителями по 7 м³; закупка по фактическому объёму заказа", deliveryRu: "Отдельной строкой по маршруту от бетонного завода", applicabilityRu: "Основной материал монолитного железобетона" },
    { key: "reinforcement_a500c_12", section: "Основные материалы", category: "Материалы", titleRu: "Арматура стальная A500C, диаметр 12 мм", rowType: "material", unitId: "kg", expression: "reinforcement_mass_kg", procurementEligible: true, sourceRole: "SUPPLIER", packageRu: "Прутки длиной 11,7 м; закупка по массе проектной ведомости", deliveryRu: "Отдельной строкой по массе и расстоянию", applicabilityRu: "Рабочее армирование конструкции" },
    { key: "binding_wire_1_2", section: "Вспомогательные материалы", category: "Материалы", titleRu: "Проволока вязальная отожжённая, диаметр 1,2 мм, моток 20 кг", rowType: "material", unitId: "coil_20kg", expression: "ceil(reinforcement_mass_kg * 0.012 / 20)", procurementEligible: true, sourceRole: "SUPPLIER", packageRu: "Моток 20 кг; закупочное округление вверх до целого мотка", deliveryRu: "В составе доставки арматурной стали", applicabilityRu: "Вязка пересечений арматурного каркаса" },
    { key: "spacer_40", section: "Вспомогательные материалы", category: "Материалы", titleRu: "Фиксатор защитного слоя арматуры 40 мм, упаковка 200 шт.", rowType: "material", unitId: "package_200pcs", expression: "ceil(formwork_area_m2 / 0.5 / 200)", procurementEligible: true, sourceRole: "SUPPLIER", packageRu: "Упаковка 200 шт.; закупочное округление вверх", deliveryRu: "В составе доставки арматурной стали", applicabilityRu: "Фиксация проектного защитного слоя 40 мм" },
    { key: "curing_film", section: "Защитные материалы", category: "Материалы", titleRu: "Плёнка полиэтиленовая для ухода за бетоном, 150 мкм, рулон 150 м²", rowType: "material", unitId: "roll_150m2", expression: "ceil(curing_area_m2 * 1.1 / 150)", procurementEligible: true, sourceRole: "SUPPLIER", packageRu: "Рулон 150 м²; 10 процентов на нахлёсты и крепление", deliveryRu: "В составе доставки расходных материалов", applicabilityRu: "Защита свежеуложенного бетона от потери влаги" },

    { key: "base_preparation_labor", section: "Трудовые операции", category: "Труд", titleRu: "Подготовка и очистка основания перед бетонированием", rowType: "labor", unitId: "worker_h", expression: "concrete_volume_m3 * 0.45", procurementEligible: false, sourceRole: "KRER", packageRu: "Не применяется", deliveryRu: "Не применяется", applicabilityRu: "Подготовка зоны бетонирования" },
    { key: "formwork_install_labor", section: "Трудовые операции", category: "Труд", titleRu: "Установка и выверка щитовой опалубки", rowType: "labor", unitId: "worker_h", expression: "formwork_area_m2 * 0.55", procurementEligible: false, sourceRole: "KRER", packageRu: "Не применяется", deliveryRu: "Не применяется", applicabilityRu: "Формирование проектной геометрии конструкции" },
    { key: "reinforcement_install_labor", section: "Трудовые операции", category: "Труд", titleRu: "Монтаж и вязка арматурного каркаса", rowType: "labor", unitId: "worker_h", expression: "reinforcement_mass_kg * 0.012", procurementEligible: false, sourceRole: "KRER", packageRu: "Не применяется", deliveryRu: "Не применяется", applicabilityRu: "Монтаж проектной арматуры" },
    { key: "concrete_receive_labor", section: "Трудовые операции", category: "Труд", titleRu: "Приём и распределение бетонной смеси", rowType: "labor", unitId: "worker_h", expression: "concrete_volume_m3 * 0.65", procurementEligible: false, sourceRole: "KRER", packageRu: "Не применяется", deliveryRu: "Не применяется", applicabilityRu: "Укладка товарного бетона в опалубку" },
    { key: "concrete_vibration_labor", section: "Трудовые операции", category: "Труд", titleRu: "Послойное вибрирование бетонной смеси", rowType: "labor", unitId: "worker_h", expression: "concrete_volume_m3 * 0.18", procurementEligible: false, sourceRole: "KRER", packageRu: "Не применяется", deliveryRu: "Не применяется", applicabilityRu: "Уплотнение уложенной бетонной смеси" },
    { key: "surface_level_labor", section: "Трудовые операции", category: "Труд", titleRu: "Выравнивание открытой поверхности бетона", rowType: "labor", unitId: "worker_h", expression: "curing_area_m2 * 0.15", procurementEligible: false, sourceRole: "KRER", packageRu: "Не применяется", deliveryRu: "Не применяется", applicabilityRu: "Получение проектной отметки поверхности" },
    { key: "curing_labor", section: "Трудовые операции", category: "Труд", titleRu: "Укрытие и уход за свежеуложенным бетоном", rowType: "labor", unitId: "worker_h", expression: "curing_area_m2 * 0.08", procurementEligible: false, sourceRole: "KRER", packageRu: "Не применяется", deliveryRu: "Не применяется", applicabilityRu: "Обеспечение влажностного режима твердения" },
    { key: "formwork_remove_labor", section: "Трудовые операции", category: "Труд", titleRu: "Распалубка после достижения требуемой прочности", rowType: "labor", unitId: "worker_h", expression: "formwork_area_m2 * 0.18", procurementEligible: false, sourceRole: "KRER", packageRu: "Не применяется", deliveryRu: "Не применяется", applicabilityRu: "Снятие опалубки по подтверждённой прочности" },

    { key: "concrete_pump", section: "Механизмы и оборудование", category: "Механизмы", titleRu: "Автобетононасос производительностью 25 м³/ч с оператором", rowType: "equipment", unitId: "machine_h", expression: "concrete_volume_m3 / pump_productivity_m3_h", procurementEligible: false, sourceRole: "EQUIPMENT", packageRu: "Не применяется", deliveryRu: "Подача и перебазировка учитываются ценовым предложением", applicabilityRu: "Механизированная подача бетонной смеси" },
    { key: "mixer_7m3", section: "Механизмы и оборудование", category: "Механизмы", titleRu: "Автобетоносмеситель с барабаном 7 м³", rowType: "equipment", unitId: "trip", expression: "ceil(concrete_volume_m3 * (1 + technological_waste_percent / 100) / 7)", procurementEligible: false, sourceRole: "EQUIPMENT", packageRu: "Один рейс на объём до 7 м³", deliveryRu: "Маршрут от бетонного завода до объекта", applicabilityRu: "Перевозка товарной бетонной смеси" },
    { key: "deep_vibrator", section: "Механизмы и оборудование", category: "Механизмы", titleRu: "Глубинный вибратор для бетона с оператором", rowType: "equipment", unitId: "machine_h", expression: "concrete_volume_m3 / vibrator_productivity_m3_h", procurementEligible: false, sourceRole: "EQUIPMENT", packageRu: "Не применяется", deliveryRu: "Доставка на объект включена в сменное задание", applicabilityRu: "Послойное уплотнение бетонной смеси" },

    { key: "concrete_delivery", section: "Доставка", category: "Доставка", titleRu: "Доставка бетонной смеси автобетоносмесителем", rowType: "service", unitId: "t_km", expression: "concrete_volume_m3 * (1 + technological_waste_percent / 100) * 2.4 * delivery_distance_km", procurementEligible: true, sourceRole: "SUPPLIER", packageRu: "Насыпная плотность для логистического расчёта 2,4 т/м³", deliveryRu: "Физический объём × плотность × расстояние", applicabilityRu: "Доставка основного материала до объекта" },
    { key: "reinforcement_delivery", section: "Доставка", category: "Доставка", titleRu: "Доставка арматурной стали бортовым автомобилем", rowType: "service", unitId: "t_km", expression: "reinforcement_mass_kg / 1000 * delivery_distance_km", procurementEligible: true, sourceRole: "SUPPLIER", packageRu: "Прутки длиной 11,7 м", deliveryRu: "Масса арматуры × расстояние", applicabilityRu: "Доставка арматуры до объекта" },

    { key: "slump_test", section: "Испытания и контроль качества", category: "Контроль качества", titleRu: "Контроль подвижности бетонной смеси методом осадки конуса", rowType: "service", unitId: "test", expression: "ceil(concrete_volume_m3 / test_lot_volume_m3)", procurementEligible: false, sourceRole: "LABORATORY", packageRu: "Один контроль на расчётную партию", deliveryRu: "Выезд лаборатории учитывается ценовым предложением", applicabilityRu: "Входной контроль товарного бетона" },
    { key: "sample_sets", section: "Испытания и контроль качества", category: "Контроль качества", titleRu: "Отбор и изготовление комплекта контрольных образцов бетона", rowType: "service", unitId: "set", expression: "ceil(concrete_volume_m3 / test_lot_volume_m3)", procurementEligible: false, sourceRole: "LABORATORY", packageRu: "Комплект образцов на расчётную партию", deliveryRu: "Передача образцов в лабораторию включена в услугу", applicabilityRu: "Контроль прочности партии бетона" },
    { key: "compression_test", section: "Испытания и контроль качества", category: "Контроль качества", titleRu: "Испытание контрольных образцов бетона на прочность при сжатии", rowType: "service", unitId: "set", expression: "ceil(concrete_volume_m3 / test_lot_volume_m3)", procurementEligible: false, sourceRole: "LABORATORY", packageRu: "Один протокол на комплект образцов", deliveryRu: "Не применяется", applicabilityRu: "Подтверждение прочности бетона" },
    { key: "geometry_control", section: "Испытания и контроль качества", category: "Контроль качества", titleRu: "Геодезический контроль геометрии и проектных отметок", rowType: "service", unitId: "inspection", expression: "1", procurementEligible: false, sourceRole: "PROJECT", packageRu: "Один приёмочный контроль", deliveryRu: "Не применяется", applicabilityRu: "Приёмка геометрии готовой конструкции" },
    { key: "surface_control", section: "Испытания и контроль качества", category: "Контроль качества", titleRu: "Визуальный контроль поверхности готового бетона", rowType: "service", unitId: "inspection", expression: "1", procurementEligible: false, sourceRole: "PROJECT", packageRu: "Один приёмочный контроль", deliveryRu: "Не применяется", applicabilityRu: "Приёмка поверхности после распалубки" },
  ];
}

const TARGETS: Readonly<Record<R555RegressionCatalogId, {
  titleRu: string;
  aliasesRu: string[];
  physicalResultRu: string;
  includedScopeRu: string[];
  excludedScopeRu: string[];
  extraParameters: ParameterSpec[];
  extraRows: RowSpec[];
  baseline: Record<string, number | boolean>;
}>> = Object.freeze({
  concrete_foundation_interior_anchor_group_pour_high_load: {
    titleRu: "Бетонирование высоконагруженной анкерной группы во внутреннем фундаменте",
    aliasesRu: ["бетонирование анкерной группы", "бетон вокруг анкеров", "внутренний фундамент с анкерами"],
    physicalResultRu: "Монолитный участок внутреннего фундамента с установленной и выверенной анкерной группой",
    includedScopeRu: ["арматура", "опалубка", "анкерная группа", "бетон B25", "укладка", "уход", "контроль качества", "доставка"],
    excludedScopeRu: ["предварительное напряжение", "демонтаж бетона", "инъектирование", "испытание муфт", "ультразвуковой контроль"],
    extraParameters: [
      { parameterId: "anchor_group_count", valueType: "integer", unitId: "group", titleRu: "Количество устанавливаемых анкерных групп", required: true, constraints: { min: 1, max: 10_000 } },
    ],
    extraRows: [
      { key: "anchor_group", section: "Закладные детали", category: "Материалы", titleRu: "Анкерная группа M24 с опорной плитой и крепёжными гайками", rowType: "material", unitId: "group", expression: "anchor_group_count", procurementEligible: true, sourceRole: "PROJECT", packageRu: "Одна собранная анкерная группа по проектной спецификации", deliveryRu: "В составе доставки закладных деталей", applicabilityRu: "Передача расчётного усилия от оборудования в фундамент" },
      { key: "anchor_install_labor", section: "Трудовые операции", category: "Труд", titleRu: "Установка и геодезическая выверка анкерных групп", rowType: "labor", unitId: "worker_h", expression: "anchor_group_count * 0.75", procurementEligible: false, sourceRole: "KRER", packageRu: "Не применяется", deliveryRu: "Не применяется", applicabilityRu: "Фиксация анкеров в проектном положении до бетонирования" },
    ],
    baseline: { work_included: true, concrete_volume_m3: 10, reinforcement_mass_kg: 950, formwork_area_m2: 28, curing_area_m2: 24, technological_waste_percent: 2, delivery_distance_km: 20, pump_productivity_m3_h: 25, vibrator_productivity_m3_h: 12, test_lot_volume_m3: 20, anchor_group_count: 8 },
  },
  concrete_foundation_interior_belt_pour_repair: {
    titleRu: "Ремонтное бетонирование внутренней фундаментной ленты",
    aliasesRu: ["ремонт фундаментной ленты", "ремонтное бетонирование ленты", "восстановление бетонной ленты"],
    physicalResultRu: "Восстановленный монолитный участок внутренней фундаментной ленты с подготовленными зонами ремонта",
    includedScopeRu: ["подготовка зон ремонта", "арматура", "опалубка", "ремонтный состав", "бетон B25", "укладка", "уход", "контроль качества", "доставка"],
    excludedScopeRu: ["полный демонтаж фундамента", "предварительное напряжение", "инъектирование трещин", "керны", "испытание на морозостойкость"],
    extraParameters: [
      { parameterId: "repair_area_m2", valueType: "decimal", unitId: "m2", titleRu: "Площадь локальной подготовки зон ремонта", required: true, constraints: { min: 0.1, max: 100_000 } },
    ],
    extraRows: [
      { key: "repair_mortar", section: "Вспомогательные материалы", category: "Материалы", titleRu: "Ремонтный безусадочный состав для бетона, мешок 25 кг", rowType: "material", unitId: "bag_25kg", expression: "ceil(repair_area_m2 * 2.5 / 25)", procurementEligible: true, sourceRole: "SUPPLIER", packageRu: "Мешок 25 кг; расход 2,5 кг/м²; закупочное округление вверх", deliveryRu: "В составе доставки расходных материалов", applicabilityRu: "Локальное выравнивание подготовленных кромок и раковин перед бетонированием" },
      { key: "repair_preparation_labor", section: "Трудовые операции", category: "Труд", titleRu: "Очистка и подготовка локальных зон ремонта фундаментной ленты", rowType: "labor", unitId: "worker_h", expression: "repair_area_m2 * 0.35", procurementEligible: false, sourceRole: "KRER", packageRu: "Не применяется", deliveryRu: "Не применяется", applicabilityRu: "Подготовка существующего бетона к восстановлению" },
    ],
    baseline: { work_included: true, concrete_volume_m3: 8, reinforcement_mass_kg: 700, formwork_area_m2: 45, curing_area_m2: 40, technological_waste_percent: 2, delivery_distance_km: 20, pump_productivity_m3_h: 25, vibrator_productivity_m3_h: 12, test_lot_volume_m3: 20, repair_area_m2: 12 },
  },
});

export function isR555RegressionCatalogId(value: string): value is R555RegressionCatalogId {
  return (R555_REGRESSION_CATALOG_IDS as readonly string[]).includes(value);
}

export function buildR555MaterialFirstDefinition(catalogId: R555RegressionCatalogId): R555MaterialFirstDefinition {
  const target = TARGETS[catalogId];
  const parameters = [...commonParameters(), ...target.extraParameters].map((parameter, ordinal) => ({
    ...parameter,
    ordinal,
    defaultValue: null,
  }));
  const rowSpecs = [...commonRows(), ...target.extraRows];
  const formulas = rowSpecs.map((row) => formula(catalogId, row.key, row.unitId, row.expression));
  const formulasByKey = new Map(rowSpecs.map((row, index) => [row.key, formulas[index]!]));
  const resources = rowSpecs.map((row, ordinal): R555MaterialFirstResource => {
    const targetFormula = formulasByKey.get(row.key)!;
    const source = SOURCE_BY_ROLE[row.sourceRole];
    const base = {
      rowId: `r555:${catalogId}:${row.key}`,
      ordinal,
      section: row.section,
      category: row.category,
      titleRu: row.titleRu,
      rowType: row.rowType,
      unitId: row.unitId,
      formulaId: targetFormula.formulaId,
      inclusionAst: { kind: "equals", parameterId: "work_included", value: true },
      resourceGraph: {
        contract: R555_MATERIAL_FIRST_CONTRACT,
        owner: "CANONICAL_BACKEND_ONLY",
        catalogId,
        resourceKey: row.key,
        formulaId: targetFormula.formulaId,
        formulaExpression: targetFormula.expressionSource,
        applicabilityRu: row.applicabilityRu,
        packageRu: row.packageRu,
        deliveryRu: row.deliveryRu,
      },
      semanticOwner: `${catalogId}:${row.key}`,
      costOwnerId: `r555-price:${catalogId}:${row.key}`,
      procurementEligible: row.procurementEligible,
      sourceMetadata: {
        contract: R555_MATERIAL_FIRST_CONTRACT,
        normativeTrace: [{ ...source, applicabilityRu: row.applicabilityRu }],
        priceRequirement: {
          currencyCode: "KGS",
          regionCode: "KG-B",
          effectiveDateRequired: true,
          vatModeRequired: true,
          packageRu: row.packageRu,
          deliveryRu: row.deliveryRu,
          priceKey: `r555-price:${catalogId}:${row.key}`,
        },
        inventedQuantity: false,
        inventedPrice: false,
        epsilonAllowed: false,
      },
    };
    return { ...base, rowSha256: semanticSha256(base) };
  });
  const passport = {
    contract: R555_MATERIAL_FIRST_CONTRACT,
    catalogId,
    canonicalRuName: target.titleRu,
    aliasesRu: target.aliasesRu,
    physicalResultRu: target.physicalResultRu,
    includedScopeRu: target.includedScopeRu,
    excludedScopeRu: target.excludedScopeRu,
    materialApplicability: "REQUIRED",
    materialCompleteness: {
      primary: resources.filter((row) => row.section === "Основные материалы").map((row) => row.rowId),
      auxiliary: resources.filter((row) => row.section === "Вспомогательные материалы").map((row) => row.rowId),
      protective: resources.filter((row) => row.section === "Защитные материалы").map((row) => row.rowId),
      fastening: resources.filter((row) => row.section === "Закладные детали").map((row) => row.rowId),
      wasteAndPurchaseRounding: "FORMULA_EXPLICIT",
      packaging: "ROW_EXPLICIT",
      delivery: "ROWS_EXPLICIT",
      priceSource: "SNAPSHOT_REQUIRED",
    },
    categories: [...new Set(resources.map((row) => row.category))],
    parameterCount: parameters.length,
    formulaCount: formulas.length,
    resourceCount: resources.length,
    paddingRows: 0,
    genericRows: 0,
    epsilonRows: 0,
    publicEnglishWords: 0,
    applicabilityMode: "WORK_SPECIFIC_ONLY",
  };
  const applicability = {
    exactCatalogId: catalogId,
    includedScopeRu: target.includedScopeRu,
    excludedScopeRu: target.excludedScopeRu,
    unrelatedDomainsExcluded: true,
  };
  const definitionWithoutHash = {
    catalogId,
    titleRu: target.titleRu,
    aliasesRu: target.aliasesRu,
    physicalResultRu: target.physicalResultRu,
    includedScopeRu: target.includedScopeRu,
    excludedScopeRu: target.excludedScopeRu,
    parameters,
    formulas,
    resources,
    baseline: target.baseline,
    passport,
    applicability,
  };
  return { ...definitionWithoutHash, definitionSha256: semanticSha256(definitionWithoutHash) };
}

export function buildAllR555MaterialFirstDefinitions(): R555MaterialFirstDefinition[] {
  return R555_REGRESSION_CATALOG_IDS.map(buildR555MaterialFirstDefinition);
}
