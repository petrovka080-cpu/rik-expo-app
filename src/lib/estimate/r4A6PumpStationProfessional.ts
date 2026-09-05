import { compileFormulaGraph, evaluateFormulaGraph } from "./backendPlatform/formulaGraph";

export type R4A6PumpParameterTier = "P0" | "P1" | "P2";

export type R4A6PumpParameter = {
  parameterId: string;
  titleRu: string;
  valueType: "boolean" | "decimal" | "integer" | "text";
  unitId: string | null;
  tier: R4A6PumpParameterTier;
  required: boolean;
  defaultValue: string | number | boolean | null;
  requiredWhen?: { parameterId: string; equals: boolean };
};

export type R4A6PumpRow = {
  rowId: string;
  titleRu: string;
  specificationRu: string;
  rowType: "material" | "labor" | "equipment" | "service";
  category: "material" | "labor" | "equipment" | "service" | "delivery";
  unitId: string;
  expression: string;
  procurementEligible: boolean;
  inclusionAst: Record<string, unknown>;
  scopeOwner: string;
  sourceLocator: string;
};

export const R4_A6_PUMP_STATION_CATALOG_ID = "canonical-work:expanded:booster_pumping_station";
export const R4_A6_PUMP_STATION_TITLE_RU = "Строительство повысительной насосной станции";
export const R4_A6_PUMP_STATION_METHOD_ID = "r4-a6-pump-station-engineering-method-2026-09-04";

const p = (
  parameterId: string,
  titleRu: string,
  valueType: R4A6PumpParameter["valueType"],
  unitId: string | null,
  tier: R4A6PumpParameterTier,
  required: boolean,
  defaultValue: R4A6PumpParameter["defaultValue"],
  requiredWhen?: R4A6PumpParameter["requiredWhen"],
): R4A6PumpParameter => ({
  parameterId,
  titleRu,
  valueType,
  unitId,
  tier,
  required,
  defaultValue,
  ...(requiredWhen ? { requiredWhen } : {}),
});

export const R4_A6_PUMP_STATION_PARAMETERS: readonly R4A6PumpParameter[] = [
  p("design_flow_m3_h", "Расчётный расход станции", "decimal", "m3_h", "P0", true, null),
  p("design_head_m", "Расчётный напор", "decimal", "m", "P0", true, null),
  p("duty_pump_count", "Количество рабочих насосов", "integer", "pcs", "P0", true, null),
  p("standby_pump_count", "Количество резервных насосов", "integer", "pcs", "P0", true, null),
  p("pump_power_kw", "Мощность одного насосного агрегата", "decimal", "kW", "P0", true, null),
  p("suction_manifold_diameter_mm", "Диаметр всасывающего коллектора", "decimal", "mm", "P0", true, null),
  p("discharge_manifold_diameter_mm", "Диаметр напорного коллектора", "decimal", "mm", "P0", true, null),
  p("suction_manifold_length_m", "Длина всасывающего коллектора", "decimal", "m", "P0", true, null),
  p("discharge_manifold_length_m", "Длина напорного коллектора", "decimal", "m", "P0", true, null),
  p("power_cable_length_m", "Длина силовой кабельной трассы", "decimal", "m", "P0", true, null),
  p("foundation_length_m", "Длина фундаментной плиты", "decimal", "m", "P0", true, null),
  p("foundation_width_m", "Ширина фундаментной плиты", "decimal", "m", "P0", true, null),
  p("foundation_thickness_m", "Толщина фундаментной плиты", "decimal", "m", "P0", true, null),
  p("automation_scope", "Состав автоматики и диспетчеризации", "text", null, "P0", true, null),
  p("power_supply_voltage_v", "Напряжение электроснабжения", "decimal", "V", "P0", true, null),
  p("ventilation_required", "Требуется механическая вентиляция", "boolean", null, "P0", true, null),
  p("ventilation_airflow_m3_h", "Расход воздуха вентиляции", "decimal", "m3_h", "P0", false, null, { parameterId: "ventilation_required", equals: true }),
  p("drainage_required", "Требуется дренажный приямок", "boolean", null, "P0", true, null),
  p("drainage_sump_volume_m3", "Объём дренажного приямка", "decimal", "m3", "P0", false, null, { parameterId: "drainage_required", equals: true }),
  p("lifting_device_required", "Требуется стационарное грузоподъёмное устройство", "boolean", null, "P1", false, null),
  p("delivery_required", "Доставка оборудования входит в состав", "boolean", null, "P1", false, null),
  p("delivery_distance_km", "Расстояние доставки оборудования", "decimal", "km", "P1", false, null, { parameterId: "delivery_required", equals: true }),
  p("project_location", "Площадка строительства", "text", null, "P2", false, null),
  p("equipment_specification", "Спецификация насосного оборудования", "text", null, "P2", false, null),
];

const always = { kind: "literal", value: true } as const;
const when = (parameterId: string): Record<string, unknown> => ({ kind: "parameter", id: parameterId });
const row = (
  rowId: string,
  titleRu: string,
  specificationRu: string,
  rowType: R4A6PumpRow["rowType"],
  category: R4A6PumpRow["category"],
  unitId: string,
  expression: string,
  procurementEligible: boolean,
  scopeOwner: string,
  inclusionAst: Record<string, unknown> = always,
): R4A6PumpRow => ({
  rowId,
  titleRu,
  specificationRu,
  rowType,
  category,
  unitId,
  expression,
  procurementEligible,
  inclusionAst,
  scopeOwner,
  sourceLocator: R4_A6_PUMP_STATION_METHOD_ID,
});

export const R4_A6_PUMP_STATION_ROWS: readonly R4A6PumpRow[] = [
  row("foundation_concrete_m3", "Бетон фундаментной плиты", "Класс бетона уточняется проектом; количество рассчитано из заданной геометрии плиты.", "material", "material", "m3", "foundation_length_m * foundation_width_m * foundation_thickness_m", true, "pump-station:civil:foundation"),
  row("foundation_rebar_kg", "Арматура фундаментной плиты", "Предварительный расход 110 кг/м³ должен быть заменён проектной ведомостью армирования.", "material", "material", "kg", "foundation_length_m * foundation_width_m * foundation_thickness_m * 110", true, "pump-station:civil:foundation"),
  row("pump_base_grout_kg", "Безусадочная смесь под опорные рамы насосов", "Предварительно 25 кг на один рабочий или резервный агрегат.", "material", "material", "kg", "(duty_pump_count + standby_pump_count) * 25", true, "pump-station:mechanical:pump-bases"),
  row("suction_manifold_m", "Трубопровод всасывающего коллектора", "Диаметр хранится отдельным P0 и выводится в спецификации revision.", "material", "material", "m", "suction_manifold_length_m", true, "pump-station:mechanical:suction-manifold"),
  row("discharge_manifold_m", "Трубопровод напорного коллектора", "Диаметр хранится отдельным P0 и выводится в спецификации revision.", "material", "material", "m", "discharge_manifold_length_m", true, "pump-station:mechanical:discharge-manifold"),
  row("pump_isolation_valves_pcs", "Запорная арматура насосных агрегатов", "По одной входной и выходной единице на каждый агрегат.", "material", "material", "pcs", "(duty_pump_count + standby_pump_count) * 2", true, "pump-station:mechanical:pump-valves"),
  row("pump_check_valves_pcs", "Обратные клапаны напорных линий", "По одному клапану на каждый рабочий или резервный агрегат.", "material", "material", "pcs", "duty_pump_count + standby_pump_count", true, "pump-station:mechanical:check-valves"),
  row("flexible_connectors_pcs", "Виброизолирующие соединения насосов", "По два соединения на каждый насосный агрегат.", "material", "material", "pcs", "(duty_pump_count + standby_pump_count) * 2", true, "pump-station:mechanical:flexible-connectors"),
  row("pressure_gauges_pcs", "Манометры напорных линий", "По одному манометру на агрегат и один на общий напорный коллектор.", "material", "material", "pcs", "duty_pump_count + standby_pump_count + 1", true, "pump-station:instrumentation:pressure"),
  row("power_cable_m", "Силовой кабель насосных агрегатов", "Сечение и исполнение определяются мощностью, напряжением и проектом электроснабжения.", "material", "material", "m", "power_cable_length_m", true, "pump-station:electrical:power-cable"),
  row("cable_lugs_pcs", "Кабельные наконечники силовых линий", "По четыре оконцевания на каждый насосный агрегат.", "material", "material", "pcs", "(duty_pump_count + standby_pump_count) * 4", true, "pump-station:electrical:terminations"),
  row("drainage_sump_concrete_m3", "Бетон дренажного приямка", "Количество равно подтверждённому конструктивному объёму приямка.", "material", "material", "m3", "drainage_sump_volume_m3", true, "pump-station:civil:drainage", when("drainage_required")),
  row("duty_pump_units", "Рабочий насосный агрегат", "Расход, напор и мощность заданы P0; производитель и модель не подставляются.", "equipment", "equipment", "pcs", "duty_pump_count", true, "pump-station:mechanical:duty-pumps"),
  row("standby_pump_units", "Резервный насосный агрегат", "Количество резерва задано отдельно и не выводится из длины или площади.", "equipment", "equipment", "pcs", "standby_pump_count", true, "pump-station:mechanical:standby-pumps"),
  row("control_panel_set", "Шкаф управления насосной станцией", "Состав автоматики задаётся P0 без выбора неподтверждённой марки.", "equipment", "equipment", "set", "1", true, "pump-station:automation:control-panel"),
  row("ventilation_unit_set", "Вентиляционная установка насосного помещения", "Производительность задаётся отдельным условно обязательным P0.", "equipment", "equipment", "set", "1", true, "pump-station:mep:ventilation", when("ventilation_required")),
  row("drainage_pump_pcs", "Дренажный насос приямка", "Одна рабочая единица; требование включается отдельным P0.", "equipment", "equipment", "pcs", "1", true, "pump-station:mep:drainage", when("drainage_required")),
  row("station_lifting_device_set", "Стационарное грузоподъёмное устройство насосного помещения", "Грузоподъёмность определяется массой выбранного агрегата.", "equipment", "equipment", "set", "1", true, "pump-station:mechanical:lifting", when("lifting_device_required")),
  row("foundation_installation_hours", "Устройство фундаментной плиты", "Предварительная трудоёмкость 4 чел.-ч на 1 м³ бетона.", "labor", "labor", "hour", "foundation_length_m * foundation_width_m * foundation_thickness_m * 4", false, "pump-station:civil:foundation"),
  row("pump_installation_hours", "Монтаж насосных агрегатов", "Предварительная трудоёмкость 16 чел.-ч на агрегат.", "labor", "labor", "hour", "(duty_pump_count + standby_pump_count) * 16", false, "pump-station:mechanical:pump-installation"),
  row("pump_alignment_hours", "Выверка и центровка насосных агрегатов", "Предварительная трудоёмкость 6 чел.-ч на агрегат.", "labor", "labor", "hour", "(duty_pump_count + standby_pump_count) * 6", false, "pump-station:mechanical:alignment"),
  row("manifold_installation_hours", "Монтаж трубопроводов коллекторов", "Предварительная трудоёмкость 1,2 чел.-ч на метр обоих коллекторов.", "labor", "labor", "hour", "(suction_manifold_length_m + discharge_manifold_length_m) * 1.2", false, "pump-station:mechanical:manifold-installation"),
  row("electrical_installation_hours", "Монтаж силовых линий насосных агрегатов", "Предварительная трудоёмкость 0,35 чел.-ч на метр кабельной трассы.", "labor", "labor", "hour", "power_cable_length_m * 0.35", false, "pump-station:electrical:installation"),
  row("automation_installation_hours", "Монтаж цепей управления и автоматики", "Предварительная трудоёмкость 8 чел.-ч на агрегат.", "labor", "labor", "hour", "(duty_pump_count + standby_pump_count) * 8", false, "pump-station:automation:installation"),
  row("individual_pump_tests", "Индивидуальное испытание насосного агрегата", "Каждый рабочий и резервный агрегат испытывается один раз.", "service", "service", "test", "duty_pump_count + standby_pump_count", false, "pump-station:commissioning:individual-test"),
  row("manifold_pressure_test_m", "Гидравлическое испытание коллекторов", "Один расчётный объём по суммарной длине всасывающего и напорного коллекторов.", "service", "service", "m", "suction_manifold_length_m + discharge_manifold_length_m", false, "pump-station:commissioning:hydraulic-test"),
  row("electrical_measurement_set", "Электротехнические измерения насосной станции", "Единый протокол измерений без повторного учёта ПНР.", "service", "service", "set", "1", false, "pump-station:commissioning:electrical-test"),
  row("automation_commissioning_set", "Наладка автоматики насосной станции", "Один комплект наладки по подтверждённому составу автоматики.", "service", "service", "set", "1", false, "pump-station:commissioning:automation"),
  row("integrated_station_test_set", "Комплексное испытание насосной станции", "Единый итоговый цикл после индивидуальных испытаний, без дублирующей строки ПНР.", "service", "service", "set", "1", false, "pump-station:commissioning:integrated-test"),
  row("pump_equipment_delivery_service", "Доставка насосного оборудования", "Один логистический scope; маршрут задаётся P1, а масса, число рейсов и тариф уточняются поставщиком до оценки.", "service", "delivery", "service", "1", true, "pump-station:logistics:pump-equipment", when("delivery_required")),
  row("manifold_delivery_service", "Доставка трубопроводов и арматуры коллекторов", "Один логистический scope; маршрут задаётся P1, а масса, число рейсов и тариф уточняются поставщиком до оценки.", "service", "delivery", "service", "1", true, "pump-station:logistics:manifolds", when("delivery_required")),
];

export function missingR4A6PumpStationP0(values: Record<string, unknown>): string[] {
  return R4_A6_PUMP_STATION_PARAMETERS
    .filter((parameter) => parameter.tier === "P0")
    .filter((parameter) => {
      if (parameter.requiredWhen && values[parameter.requiredWhen.parameterId] !== parameter.requiredWhen.equals) return false;
      if (!parameter.required && !parameter.requiredWhen) return false;
      const value = values[parameter.parameterId];
      return value == null || (typeof value === "string" && !value.trim());
    })
    .map((parameter) => parameter.parameterId);
}

export function evaluateR4A6PumpStationRows(values: Record<string, unknown>): (R4A6PumpRow & { quantity: number })[] {
  const missing = missingR4A6PumpStationP0(values);
  if (missing.length > 0) return [];
  return R4_A6_PUMP_STATION_ROWS
    .filter((candidate) => candidate.inclusionAst.kind === "literal"
      ? candidate.inclusionAst.value === true
      : values[String(candidate.inclusionAst.id ?? "")] === true)
    .map((candidate) => ({
      ...candidate,
      quantity: Number(evaluateFormulaGraph(compileFormulaGraph(candidate.expression).ast, values as Record<string, string | number>)),
    }));
}
