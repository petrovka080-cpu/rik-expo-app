import type {
  ExpandedComplexBoqRow,
  ExpandedComplexCalculatorOutput,
  ExpandedComplexLineType,
  ExpandedComplexUnit,
  ExpandedComplexWorkFamilyDefinition,
} from "../index";

type CalcInput = { prompt: string; familyId?: string | null };

type RowInput = {
  family: ExpandedComplexWorkFamilyDefinition;
  code: string;
  titleRu: string;
  lineType: ExpandedComplexLineType;
  group: string;
  quantity: number;
  unit: ExpandedComplexUnit;
  formula: string;
  sourceParameters?: Record<string, number | string | boolean | null>;
  materialKey?: string;
  procurement?: boolean;
};

type OutputInput = {
  family: ExpandedComplexWorkFamilyDefinition;
  sourcePrompt: string;
  parameters: Record<string, number | string | boolean | null>;
  rows: ExpandedComplexBoqRow[];
  assumptions: string[];
  missingInputs?: string[];
  formulaSteps: string[];
  unitConversions?: string[];
};

export type S2BCalculatorContext = {
  familyForCalculator: (input: CalcInput, defaultFamilyId: string) => ExpandedComplexWorkFamilyDefinition;
  normalizePrompt: (value: string) => string;
  numberFromText: (text: string, patterns: RegExp[], defaultValue: number) => number;
  extractLengthM: (text: string, defaultValue: number) => number;
  extractAreaM2: (text: string, defaultValue: number) => number;
  extractDiameterMm: (text: string, defaultValue: number) => number;
  extractCount: (text: string, patterns: RegExp[], defaultValue: number) => number;
  commonMissingInputs: (family: ExpandedComplexWorkFamilyDefinition) => string[];
  row: (input: RowInput) => ExpandedComplexBoqRow;
  output: (input: OutputInput) => ExpandedComplexCalculatorOutput;
};

export function calculateStormwaterNetworkEstimate(input: CalcInput, ctx: S2BCalculatorContext): ExpandedComplexCalculatorOutput {
  const family = ctx.familyForCalculator(input, "stormwater_drainage");
  const text = ctx.normalizePrompt(input.prompt);
  const lengthM = ctx.extractLengthM(text, 300);
  const diameterMm = ctx.extractDiameterMm(text, 300);
  const rainInlets = ctx.extractCount(text, [/(\d+)\s*(?:дождеприем|дождеприём|inlet)/i], Math.max(4, Math.ceil(lengthM / 70)));
  const slopePermille = ctx.numberFromText(text, [/уклон\s*([\d\s]+(?:[,.]\d+)?)\s*(?:‰|промилл|мм\/м)?/i], 5);
  const trenchWidthM = Math.max(0.75, diameterMm / 1000 + 0.55);
  const trenchDepthM = 1.4;
  const trenchExcavation = lengthM * trenchWidthM * trenchDepthM;
  const rows = [
    ctx.row({ family, code: "stormwater_profile_slope_set", titleRu: "Профиль ливневой сети, отметки и уклон", lineType: "work", group: "profile", quantity: 1, unit: "set", formula: "profile set with slope input" }),
    ctx.row({ family, code: "stormwater_trench_excavation_m3", titleRu: "Разработка траншеи ливневой сети", lineType: "work", group: "earthworks", quantity: trenchExcavation, unit: "m3", formula: "length_m * trench_width_m * trench_depth_m" }),
    ctx.row({ family, code: "stormwater_pipe_lm", titleRu: `Труба ливневой канализации d${diameterMm}`, lineType: "material", group: "materials", quantity: lengthM * 1.02, unit: "m", formula: "length_m * 1.02", materialKey: "stormwater_pipe" }),
    ctx.row({ family, code: "rain_inlets_pcs", titleRu: "Дождеприёмники", lineType: "material", group: "stormwater_intake", quantity: rainInlets, unit: "pcs", formula: "rain_inlets_count", materialKey: "rain_inlets" }),
    ctx.row({ family, code: "silt_traps_pcs", titleRu: "Пескоуловители", lineType: "material", group: "stormwater_intake", quantity: Math.max(1, Math.ceil(rainInlets / 4)), unit: "pcs", formula: "ceil(rain_inlets_count / 4)", materialKey: "silt_traps" }),
    ctx.row({ family, code: "stormwater_manholes_pcs", titleRu: "Ливневые смотровые колодцы", lineType: "material", group: "stormwater_network", quantity: Math.ceil(lengthM / 60) + 1, unit: "pcs", formula: "ceil(length_m / 60) + 1", materialKey: "stormwater_manhole" }),
    ctx.row({ family, code: "outlet_structure_set", titleRu: "Выпуск ливневой сети", lineType: "material", group: "stormwater_outlet", quantity: 1, unit: "set", formula: "one outlet structure", materialKey: "stormwater_outlet" }),
    ctx.row({ family, code: "surface_restoration_m2", titleRu: "Восстановление покрытия после ливневой сети", lineType: "work", group: "restoration", quantity: lengthM * trenchWidthM, unit: "m2", formula: "length_m * trench_width_m" }),
    ctx.row({ family, code: "water_flow_test_set", titleRu: "Проверка проливом и актирование уклонов", lineType: "service", group: "commissioning", quantity: 1, unit: "set", formula: "documented flow test", procurement: true }),
    ctx.row({ family, code: "mini_excavator_shifts", titleRu: "Мини-экскаватор для ливневой траншеи", lineType: "equipment", group: "equipment", quantity: Math.ceil(trenchExcavation / 180), unit: "shift", formula: "ceil(trench_excavation_m3 / 180)" }),
  ];
  return ctx.output({
    family,
    sourcePrompt: input.prompt,
    parameters: { length_m: lengthM, diameter_mm: diameterMm, rain_inlets_count: rainInlets, slope_permille: slopePermille, trench_width_m: trenchWidthM, trench_depth_m: trenchDepthM },
    rows,
    assumptions: ["Ливневая сеть рассчитывается отдельно от бытовой канализации; водосбор и выпуск требуют проектных отметок."],
    formulaSteps: ["stormwater_trench_excavation_m3 = length_m * trench_width_m * trench_depth_m", "stormwater_manholes_pcs = ceil(length_m / 60) + 1"],
    missingInputs: [...ctx.commonMissingInputs(family), "Расчётный расход дождя", "Отметки выпуска", "Водосборная площадь"],
  });
}

export function calculateWellConstructionEstimate(input: CalcInput, ctx: S2BCalculatorContext): ExpandedComplexCalculatorOutput {
  const family = ctx.familyForCalculator(input, "well_construction");
  const text = ctx.normalizePrompt(input.prompt);
  const depthM = ctx.extractLengthM(text, 80);
  const diameterMm = ctx.extractDiameterMm(text, 160);
  const casingLength = depthM * 0.92;
  const filterLength = Math.max(6, depthM * 0.18);
  const rows = [
    ctx.row({ family, code: "well_mobilization_set", titleRu: "Мобилизация буровой установки", lineType: "service", group: "mobilization", quantity: 1, unit: "set", formula: "one drilling rig mobilization", procurement: true }),
    ctx.row({ family, code: "well_geology_interval_set", titleRu: "Геология и интервалы бурения", lineType: "work", group: "engineering", quantity: 1, unit: "set", formula: "geology required before detailed estimate" }),
    ctx.row({ family, code: "well_drilling_lm", titleRu: `Бурение скважины d${diameterMm}`, lineType: "work", group: "drilling", quantity: depthM, unit: "m", formula: "depth_m" }),
    ctx.row({ family, code: "casing_pipe_lm", titleRu: "Обсадная труба скважины", lineType: "material", group: "casing", quantity: casingLength, unit: "m", formula: "depth_m * 0.92", materialKey: "well_casing_pipe" }),
    ctx.row({ family, code: "filter_column_lm", titleRu: "Фильтровая колонна", lineType: "material", group: "filter", quantity: filterLength, unit: "m", formula: "max(6, depth_m * 0.18)", materialKey: "well_filter_column" }),
    ctx.row({ family, code: "gravel_pack_m3", titleRu: "Гравийная обсыпка фильтра", lineType: "material", group: "filter", quantity: depthM * 0.018, unit: "m3", formula: "depth_m * 0.018", materialKey: "well_gravel_pack" }),
    ctx.row({ family, code: "cementing_set", titleRu: "Цементаж затрубного пространства", lineType: "work", group: "sealing", quantity: 1, unit: "set", formula: "annulus cementing set" }),
    ctx.row({ family, code: "well_flushing_set", titleRu: "Промывка скважины", lineType: "service", group: "commissioning", quantity: 1, unit: "set", formula: "flushing set", procurement: true }),
    ctx.row({ family, code: "test_pumping_set", titleRu: "Опытная откачка и определение дебита", lineType: "service", group: "commissioning", quantity: 1, unit: "set", formula: "test pumping set", procurement: true }),
    ctx.row({ family, code: "water_analysis_set", titleRu: "Анализ воды", lineType: "service", group: "quality", quantity: 1, unit: "set", formula: "water analysis set", procurement: true }),
    ctx.row({ family, code: "pump_head_set", titleRu: "Насос, оголовок и подключение", lineType: "equipment", group: "equipment", quantity: 1, unit: "set", formula: "pump head set; price missing until specification", materialKey: "well_pump_head" }),
    ctx.row({ family, code: "well_passport_docs_set", titleRu: "Паспорт скважины и исполнительная документация", lineType: "service", group: "documentation", quantity: 1, unit: "set", formula: "documentation set", procurement: true }),
  ];
  return ctx.output({
    family,
    sourcePrompt: input.prompt,
    parameters: { depth_m: depthM, diameter_mm: diameterMm, casing_length_m: casingLength, filter_length_m: filterLength },
    rows,
    assumptions: ["Способ бурения, геология, санитарная зона и насос не выбираются автоматически."],
    formulaSteps: ["well_drilling_lm = depth_m", "filter_column_lm = max(6, depth_m * 0.18)", "casing_pipe_lm = depth_m * 0.92"],
    missingInputs: [...ctx.commonMissingInputs(family), "Геология разреза", "Способ бурения", "Дебит и насос", "Санитарная зона"],
  });
}

export function calculateRoadLightingEstimate(input: CalcInput, ctx: S2BCalculatorContext): ExpandedComplexCalculatorOutput {
  const family = ctx.familyForCalculator(input, "road_lighting");
  const text = ctx.normalizePrompt(input.prompt);
  const lengthM = ctx.extractLengthM(text, 500);
  const poleStepM = ctx.numberFromText(text, [/шаг\s*([\d\s]+(?:[,.]\d+)?)/i], 35);
  const poles = Math.max(2, Math.ceil(lengthM / poleStepM) + 1);
  const rows = [
    ctx.row({ family, code: "lighting_design_lux_set", titleRu: "Светотехническая схема и уровень освещенности", lineType: "work", group: "engineering", quantity: 1, unit: "set", formula: "lighting design input set" }),
    ctx.row({ family, code: "lighting_trench_m3", titleRu: "Траншея кабеля освещения", lineType: "work", group: "earthworks", quantity: lengthM * 0.45 * 0.8, unit: "m3", formula: "length_m * 0.45 * 0.8" }),
    ctx.row({ family, code: "lighting_cable_lm", titleRu: "Кабель линии освещения", lineType: "material", group: "materials", quantity: lengthM * 1.08, unit: "m", formula: "length_m * 1.08", materialKey: "lighting_cable" }),
    ctx.row({ family, code: "lighting_poles_pcs", titleRu: "Опоры освещения", lineType: "material", group: "poles", quantity: poles, unit: "pcs", formula: "ceil(length_m / pole_step_m) + 1", materialKey: "lighting_poles" }),
    ctx.row({ family, code: "lighting_foundations_m3", titleRu: "Фундаменты опор освещения", lineType: "material", group: "foundations", quantity: poles * 0.22, unit: "m3", formula: "poles_count * 0.22", materialKey: "ready_mix_concrete" }),
    ctx.row({ family, code: "lighting_fixtures_pcs", titleRu: "Светильники наружного освещения", lineType: "equipment", group: "equipment", quantity: poles, unit: "pcs", formula: "poles_count; price missing until specification", materialKey: "lighting_fixtures" }),
    ctx.row({ family, code: "lighting_control_cabinet_set", titleRu: "Шкаф управления освещением", lineType: "equipment", group: "equipment", quantity: 1, unit: "set", formula: "one control cabinet; price missing", materialKey: "lighting_control_cabinet" }),
    ctx.row({ family, code: "lighting_grounding_set", titleRu: "Заземление опор освещения", lineType: "material", group: "grounding", quantity: 1, unit: "set", formula: "grounding set", materialKey: "lighting_grounding" }),
    ctx.row({ family, code: "illumination_measurement_set", titleRu: "Измерение освещенности", lineType: "service", group: "commissioning", quantity: 1, unit: "set", formula: "illumination measurement set", procurement: true }),
    ctx.row({ family, code: "bucket_truck_shifts", titleRu: "Автовышка для монтажа светильников", lineType: "equipment", group: "equipment", quantity: Math.ceil(poles / 12), unit: "shift", formula: "ceil(poles_count / 12)" }),
  ];
  return ctx.output({
    family,
    sourcePrompt: input.prompt,
    parameters: { length_m: lengthM, pole_step_m: poleStepM, poles_count: poles },
    rows,
    assumptions: ["Тип светильников и уровень освещенности не выбираются автоматически."],
    formulaSteps: ["poles_count = ceil(length_m / pole_step_m) + 1", "lighting_trench_m3 = length_m * 0.45 * 0.8"],
    missingInputs: [...ctx.commonMissingInputs(family), "Категория дороги или площадки", "Нормируемая освещенность", "Тип светильников"],
  });
}

export function calculatePowerCableLineEstimate(input: CalcInput, ctx: S2BCalculatorContext): ExpandedComplexCalculatorOutput {
  const family = ctx.familyForCalculator(input, "underground_cable_line");
  const text = ctx.normalizePrompt(input.prompt);
  const lengthM = ctx.extractLengthM(text, 1000);
  const voltageKv = ctx.numberFromText(text, [/([\d\s]+(?:[,.]\d+)?)\s*кв\b/i, /([\d\s]+(?:[,.]\d+)?)\s*kv\b/i], 10);
  const lines = ctx.extractCount(text, [/(\d+)\s*(?:линии|цеп)/i], 1);
  const trenchM3 = lengthM * 0.7 * 1.1;
  const rows = [
    ctx.row({ family, code: "cable_voltage_route_set", titleRu: "Трасса и класс напряжения кабельной линии", lineType: "work", group: "engineering", quantity: 1, unit: "set", formula: "route and voltage design input" }),
    ctx.row({ family, code: "cable_trench_m3", titleRu: "Разработка траншеи кабельной линии", lineType: "work", group: "earthworks", quantity: trenchM3, unit: "m3", formula: "length_m * 0.7 * 1.1" }),
    ctx.row({ family, code: "sand_bedding_m3", titleRu: "Песчаная постель кабеля", lineType: "material", group: "materials", quantity: lengthM * 0.7 * 0.2, unit: "m3", formula: "length_m * 0.7 * 0.2", materialKey: "cable_sand_bedding" }),
    ctx.row({ family, code: "power_cable_lm", titleRu: `Кабель ${voltageKv} кВ`, lineType: "material", group: "cable", quantity: lengthM * lines * 1.04, unit: "m", formula: "length_m * line_count * 1.04", materialKey: "power_cable" }),
    ctx.row({ family, code: "protective_duct_lm", titleRu: "Защитные трубы / футляры кабеля", lineType: "material", group: "protection", quantity: lengthM * 0.18, unit: "m", formula: "length_m * 0.18", materialKey: "cable_protective_duct" }),
    ctx.row({ family, code: "cable_joints_pcs", titleRu: "Соединительные муфты", lineType: "material", group: "joints", quantity: Math.max(2, Math.ceil(lengthM / 400) * lines), unit: "pcs", formula: "max(2, ceil(length_m / 400) * line_count)", materialKey: "cable_joints" }),
    ctx.row({ family, code: "end_terminations_pcs", titleRu: "Концевые муфты", lineType: "material", group: "joints", quantity: lines * 2, unit: "pcs", formula: "line_count * 2", materialKey: "cable_terminations" }),
    ctx.row({ family, code: "warning_tape_lm", titleRu: "Сигнальная лента кабельной линии", lineType: "material", group: "protection", quantity: lengthM * 1.02, unit: "m", formula: "length_m * 1.02", materialKey: "cable_warning_tape" }),
    ctx.row({ family, code: "voltage_testing_set", titleRu: "Высоковольтные испытания кабеля", lineType: "service", group: "commissioning", quantity: 1, unit: "set", formula: "voltage test set", procurement: true }),
    ctx.row({ family, code: "excavator_shifts", titleRu: "Экскаватор для кабельной траншеи", lineType: "equipment", group: "equipment", quantity: Math.ceil(trenchM3 / 220), unit: "shift", formula: "ceil(cable_trench_m3 / 220)" }),
    ctx.row({ family, code: "cable_pulling_equipment_shift", titleRu: "Лебёдка / оборудование протяжки кабеля", lineType: "equipment", group: "equipment", quantity: Math.ceil(lengthM / 700), unit: "shift", formula: "ceil(length_m / 700)" }),
  ];
  return ctx.output({
    family,
    sourcePrompt: input.prompt,
    parameters: { length_m: lengthM, voltage_kv: voltageKv, line_count: lines, cable_trench_m3: trenchM3 },
    rows,
    assumptions: ["Сечение и марка кабеля не выбираются автоматически; цена оборудования отсутствует до спецификации."],
    formulaSteps: ["power_cable_lm = length_m * line_count * 1.04", "cable_trench_m3 = length_m * 0.7 * 1.1"],
    missingInputs: [...ctx.commonMissingInputs(family), "Сечение и материал кабеля", "Способ прокладки", "Схема защиты и испытаний"],
  });
}

export function calculateElectricalNetworkEstimate(input: CalcInput, ctx: S2BCalculatorContext): ExpandedComplexCalculatorOutput {
  const family = ctx.familyForCalculator(input, "low_voltage_system");
  const text = ctx.normalizePrompt(input.prompt);
  const areaM2 = ctx.extractAreaM2(text, 180);
  const powerKw = ctx.numberFromText(text, [/([\d\s]+(?:[,.]\d+)?)\s*(?:квт|kw)\b/i], Math.max(12, areaM2 * 0.08));
  const points = Math.max(18, Math.ceil(areaM2 * 0.45));
  const cableLength = Math.max(80, areaM2 * 2.4);
  const rows = [
    ctx.row({ family, code: "electrical_load_power_kw", titleRu: "Расчетная мощность электрики здания", lineType: "work", group: "engineering", quantity: powerKw, unit: "set", formula: "power_kw from input or area coefficient" }),
    ctx.row({ family, code: "cable_routes_lm", titleRu: "Кабельные трассы внутри здания", lineType: "work", group: "routes", quantity: cableLength, unit: "m", formula: "max(80, area_m2 * 2.4)" }),
    ctx.row({ family, code: "power_cable_lm", titleRu: "Силовой кабель", lineType: "material", group: "cable", quantity: cableLength * 1.08, unit: "m", formula: "cable_routes_lm * 1.08", materialKey: "building_power_cable" }),
    ctx.row({ family, code: "conduit_tray_lm", titleRu: "Гофра, трубы или лотки", lineType: "material", group: "cable_support", quantity: cableLength * 0.75, unit: "m", formula: "cable_routes_lm * 0.75", materialKey: "conduit_tray" }),
    ctx.row({ family, code: "junction_boxes_pcs", titleRu: "Распределительные коробки", lineType: "material", group: "accessories", quantity: Math.ceil(points / 4), unit: "pcs", formula: "ceil(points / 4)", materialKey: "junction_boxes" }),
    ctx.row({ family, code: "socket_switch_points_pcs", titleRu: "Точки розеток, выключателей и выводов", lineType: "material", group: "finish_points", quantity: points, unit: "pcs", formula: "max(18, ceil(area_m2 * 0.45))", materialKey: "electrical_points" }),
    ctx.row({ family, code: "distribution_panel_set", titleRu: "Распределительный щит", lineType: "equipment", group: "panels", quantity: 1, unit: "set", formula: "one distribution panel; price missing until specification", materialKey: "distribution_panel" }),
    ctx.row({ family, code: "breakers_rcd_pcs", titleRu: "Автоматы и УЗО", lineType: "material", group: "protection", quantity: Math.max(8, Math.ceil(points / 6)), unit: "pcs", formula: "max(8, ceil(points / 6))", materialKey: "breakers_rcd" }),
    ctx.row({ family, code: "grounding_set", titleRu: "Заземление и уравнивание потенциалов", lineType: "material", group: "grounding", quantity: 1, unit: "set", formula: "grounding set", materialKey: "building_grounding" }),
    ctx.row({ family, code: "commissioning_measurements_set", titleRu: "Измерения и протоколы электролаборатории", lineType: "service", group: "commissioning", quantity: 1, unit: "set", formula: "commissioning measurement set", procurement: true }),
  ];
  return ctx.output({
    family,
    sourcePrompt: input.prompt,
    parameters: { area_m2: areaM2, power_kw: powerKw, points_count: points, length_m: cableLength },
    rows,
    assumptions: ["Сечения кабелей, группы и защита должны подтверждаться схемой; кВ и кв. м разделяются по параметрам."],
    formulaSteps: ["cable_routes_lm = max(80, area_m2 * 2.4)", "points_count = max(18, ceil(area_m2 * 0.45))"],
    missingInputs: [...ctx.commonMissingInputs(family), "Однолинейная схема", "Сечение и материал кабеля", "Тип защиты"],
  });
}

export function calculateHeatingVentilationEstimate(input: CalcInput, ctx: S2BCalculatorContext): ExpandedComplexCalculatorOutput {
  const defaultFamilyId = /вентиляц|ventilation|smoke|cooling/i.test(input.prompt) ? "ventilation_system" : "HVAC_plant_room";
  const family = ctx.familyForCalculator(input, defaultFamilyId);
  const text = ctx.normalizePrompt(input.prompt);
  const areaM2 = ctx.extractAreaM2(text, 200);
  const volumeM3 = ctx.numberFromText(text, [/([\d\s]+(?:[,.]\d+)?)\s*(?:м3|м³|m3)\b/i], areaM2 * 3);
  const heatLoadKw = ctx.numberFromText(text, [/([\d\s]+(?:[,.]\d+)?)\s*(?:квт|kw)\b/i], Math.max(12, areaM2 * 0.1));
  const airflowM3h = ctx.numberFromText(text, [/([\d\s]+(?:[,.]\d+)?)\s*(?:м3\/ч|м³\/ч|m3\/h)\b/i], Math.max(300, volumeM3 * 3));
  const ductLength = Math.max(20, areaM2 * 0.65);
  const pipeLength = Math.max(35, areaM2 * 0.75);
  const isVentilation = /вентиляц|ventilation|smoke|cooling/i.test(text) || family.work_family_id.includes("ventilation");
  const rows = [
    ctx.row({ family, code: "heat_load_kw", titleRu: "Тепловая нагрузка", lineType: "work", group: "engineering", quantity: heatLoadKw, unit: "set", formula: "heat_load_kw from input or area coefficient" }),
    ctx.row({ family, code: "airflow_m3h", titleRu: "Воздухообмен и расход воздуха", lineType: "work", group: "engineering", quantity: airflowM3h, unit: "m3_h", formula: "airflow from input or volume_m3 * air_changes" }),
    ctx.row({ family, code: "heating_pipe_lm", titleRu: "Трубопроводы отопления", lineType: "material", group: "heating", quantity: isVentilation ? pipeLength * 0.35 : pipeLength, unit: "m", formula: "pipe length by area", materialKey: "heating_pipe" }),
    ctx.row({ family, code: "radiators_pcs", titleRu: "Отопительные приборы", lineType: "equipment", group: "heating", quantity: isVentilation ? 0 : Math.max(4, Math.ceil(areaM2 / 18)), unit: "pcs", formula: "heating case: max(4, ceil(area_m2 / 18))", materialKey: "radiators" }),
    ctx.row({ family, code: "ducts_lm", titleRu: "Воздуховоды", lineType: "material", group: "ventilation", quantity: isVentilation ? ductLength : ductLength * 0.25, unit: "m", formula: "duct length by area", materialKey: "ventilation_ducts" }),
    ctx.row({ family, code: "duct_fittings_pcs", titleRu: "Фасонные изделия воздуховодов", lineType: "material", group: "ventilation", quantity: Math.ceil(ductLength / 8), unit: "pcs", formula: "ceil(duct_length_m / 8)", materialKey: "duct_fittings" }),
    ctx.row({ family, code: "fans_units_pcs", titleRu: "Вентиляторы / приточно-вытяжные агрегаты", lineType: "equipment", group: "equipment", quantity: isVentilation ? Math.max(1, Math.ceil(airflowM3h / 2500)) : 1, unit: "pcs", formula: "ceil(airflow_m3_h / 2500); price missing until spec", materialKey: "ventilation_fans" }),
    ctx.row({ family, code: "filters_set", titleRu: "Фильтры и шумоглушители", lineType: "material", group: "ventilation", quantity: isVentilation ? 1 : 0, unit: "set", formula: "ventilation case filter set", materialKey: "filters_silencers" }),
    ctx.row({ family, code: "insulation_m2", titleRu: "Изоляция труб и воздуховодов", lineType: "material", group: "insulation", quantity: pipeLength * 0.35 + ductLength * 0.8, unit: "m2", formula: "pipe_length_m * 0.35 + duct_length_m * 0.8", materialKey: "hvac_insulation" }),
    ctx.row({ family, code: "automation_power_set", titleRu: "Автоматика и электропитание", lineType: "equipment", group: "automation", quantity: 1, unit: "set", formula: "automation set; price missing until specification", materialKey: "hvac_automation" }),
    ctx.row({ family, code: "balancing_commissioning_set", titleRu: "Балансировка, испытания и ПНР", lineType: "service", group: "commissioning", quantity: 1, unit: "set", formula: "balancing and commissioning set", procurement: true }),
  ];
  return ctx.output({
    family,
    sourcePrompt: input.prompt,
    parameters: { area_m2: areaM2, volume_m3: volumeM3, heat_load_kw: heatLoadKw, airflow_m3_h: airflowM3h, length_m: isVentilation ? ductLength : pipeLength },
    rows,
    assumptions: ["Вентиляция не рассчитывается только по площади: назначение, воздухообмен и фильтрация остаются missing design inputs."],
    formulaSteps: ["airflow_m3_h = input airflow or volume_m3 * air_changes", "duct_length_m and pipe_length_m derive from area only for preliminary BOQ"],
    missingInputs: [...ctx.commonMissingInputs(family), "Назначение объекта", "Воздухообмен / кратность", "Температурный график", "Автоматика"],
  });
}
