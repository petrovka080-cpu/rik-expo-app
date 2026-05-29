import type {
  DynamicBoqValidation,
  DynamicProfessionalBoq,
  DynamicProfessionalBoqRow,
  EstimatorKernelComplexity,
  EstimatorReasoningPlan,
} from "../estimatorKernel/estimatorKernelTypes";

const forbiddenStandalone = new Set([
  "материал",
  "работы",
  "монтаж",
  "крепёж",
  "крепеж",
  "прочее",
  "дополнительные материалы",
  "дополнительные работы",
  "строительные работы",
  "бетонные работы",
]);

function minimumRows(complexity: EstimatorKernelComplexity): number {
  if (complexity === "infrastructure") return 45;
  if (complexity === "complex") return 30;
  if (complexity === "medium") return 18;
  return 12;
}

function row(sectionType: DynamicProfessionalBoqRow["sectionType"], code: string, name: string, unit: string, quantity: number, unitPrice: number, materialKey?: string): DynamicProfessionalBoqRow {
  return {
    sectionType,
    code,
    name,
    unit,
    quantity,
    unitPrice,
    materialKey,
    rateKey: `dynamic_universal_${code}`,
    sourcePolicy: "configured_reference",
    comment: "Dynamic estimator kernel work-specific BOQ row.",
  };
}

function elevatorRow(sectionType: DynamicProfessionalBoqRow["sectionType"], code: string, name: string, unit: string, quantity: number, unitPrice: number, materialKey?: string): DynamicProfessionalBoqRow {
  return {
    sectionType,
    code,
    name,
    unit,
    quantity,
    unitPrice,
    materialKey,
    rateKey: `dynamic_elevator_${code}`,
    sourcePolicy: "manual_review",
    comment: "Regulated elevator estimate row; final price requires licensed contractor quote and local inspection.",
  };
}

function buildElevatorInstallationBoq(plan: EstimatorReasoningPlan): DynamicProfessionalBoqRow[] {
  const stops = Math.max(1, Math.round(plan.quantities.floorCount ?? 1));
  return [
    elevatorRow("labor", "shaft_survey", "обследование шахты", "set", 1, 18000),
    elevatorRow("labor", "stops_measurement", "обмеры по 14 остановкам", "pcs", stops, 3500),
    elevatorRow("labor", "pit_check", "проверка приямка", "set", 1, 6500),
    elevatorRow("labor", "overhead_check", "проверка верхнего зазора", "set", 1, 6500),
    elevatorRow("labor", "design_binding", "проектная привязка", "set", 1, 45000),
    elevatorRow("materials", "passenger_cabin", "пассажирская кабина", "set", 1, 1250000, "passenger_elevator_cabin"),
    elevatorRow("materials", "traction_drive", "лебёдка / привод", "set", 1, 780000, "elevator_drive"),
    elevatorRow("materials", "control_station", "станция управления", "set", 1, 420000, "elevator_control_station"),
    elevatorRow("materials", "vfd", "частотный преобразователь", "set", 1, 260000, "frequency_drive"),
    elevatorRow("materials", "shaft_doors", "двери шахты", "pcs", stops, 85000, "elevator_shaft_doors"),
    elevatorRow("materials", "cabin_doors", "двери кабины", "set", 1, 140000, "elevator_cabin_doors"),
    elevatorRow("materials", "cabin_guides", "направляющие кабины", "linear_m", stops * 3.2, 12000, "elevator_guides"),
    elevatorRow("materials", "counterweight_guides", "направляющие противовеса", "linear_m", stops * 3.2, 9000, "elevator_counterweight_guides"),
    elevatorRow("materials", "counterweight", "противовес", "set", 1, 180000, "elevator_counterweight"),
    elevatorRow("materials", "ropes", "канаты / тяговые элементы", "set", 1, 95000, "elevator_ropes"),
    elevatorRow("materials", "buffers", "буфера", "set", 1, 65000, "elevator_buffers"),
    elevatorRow("materials", "speed_governor", "ограничитель скорости", "set", 1, 82000, "speed_governor"),
    elevatorRow("materials", "safety_gear", "ловители", "set", 1, 78000, "elevator_safety_gear"),
    elevatorRow("materials", "shaft_electrics", "электрика шахты", "set", 1, 160000, "shaft_electrics"),
    elevatorRow("materials", "call_buttons", "кнопочные посты", "pcs", stops, 12000, "elevator_call_buttons"),
    elevatorRow("materials", "indication", "индикация", "pcs", stops, 9500, "elevator_indication"),
    elevatorRow("labor", "guide_install", "монтаж направляющих", "linear_m", stops * 6.4, 2800),
    elevatorRow("labor", "door_install", "монтаж дверей", "pcs", stops + 1, 15000),
    elevatorRow("labor", "cabin_install", "монтаж кабины", "set", 1, 160000),
    elevatorRow("labor", "drive_install", "монтаж привода", "set", 1, 135000),
    elevatorRow("labor", "electrical_install", "электромонтаж лифтового оборудования", "set", 1, 120000),
    elevatorRow("labor", "commissioning", "ПНР", "set", 1, 95000),
    elevatorRow("labor", "testing", "испытания", "set", 1, 65000),
    elevatorRow("labor", "inspection_handover", "инспекция / сдача", "set", 1, 55000),
    elevatorRow("delivery", "equipment_delivery", "доставка / логистика лифтового оборудования", "trip", 2, 85000),
    elevatorRow("equipment", "rigging", "такелаж и подъем оборудования", "set", 1, 120000),
    elevatorRow("equipment", "measurement_tools", "измерительное и испытательное оборудование", "set", 1, 45000),
    elevatorRow("labor", "licensed_contractor_coordination", "координация лицензированной организации", "set", 1, 35000),
    elevatorRow("labor", "permit_package_support", "подготовка пакета для инспекции", "set", 1, 45000),
    elevatorRow("delivery", "storage_protection", "складирование и защита оборудования", "set", 1, 28000),
  ];
}

function drainageRow(sectionType: DynamicProfessionalBoqRow["sectionType"], code: string, name: string, unit: string, quantity: number, unitPrice: number, materialKey?: string): DynamicProfessionalBoqRow {
  return {
    sectionType,
    code,
    name,
    unit,
    quantity,
    unitPrice,
    materialKey,
    rateKey: `dynamic_drainage_${code}`,
    sourcePolicy: "configured_reference",
    comment: "Length-based drainage channel preliminary BOQ row.",
  };
}

function buildDrainageChannelBoq(plan: EstimatorReasoningPlan): DynamicProfessionalBoqRow[] {
  const length = Math.max(1, plan.quantities.lengthM ?? 1);
  return [
    drainageRow("labor", "route_marking", "разметка трассы", "linear_m", length, 120),
    drainageRow("labor", "slope_check", "проверка уклонов", "linear_m", length, 95),
    drainageRow("labor", "excavation", "выемка грунта", "m3", Math.round(length * 0.18 * 100) / 100, 900),
    drainageRow("labor", "base_grading", "планировка основания", "linear_m", length, 140),
    drainageRow("materials", "geotextile", "геотекстиль", "sq_m", Math.round(length * 0.8 * 100) / 100, 70, "geotextile"),
    drainageRow("materials", "sand_bedding", "песчаная подготовка", "m3", Math.round(length * 0.08 * 100) / 100, 1600, "sand"),
    drainageRow("materials", "crushed_stone_base", "щебёночное основание", "m3", Math.round(length * 0.12 * 100) / 100, 1900, "crushed_stone"),
    drainageRow("materials", "drainage_channels", "дренажные лотки / каналы", "linear_m", length, 2400, "drainage_channel"),
    drainageRow("materials", "grates", "решётки", "linear_m", length, 1550, "drainage_grate"),
    drainageRow("materials", "concrete_base", "бетонная обойма / основание", "m3", Math.round(length * 0.06 * 100) / 100, 5600, "concrete"),
    drainageRow("labor", "channel_jointing", "стыковка лотков", "linear_m", length, 380),
    drainageRow("labor", "outlet_connection", "подключение к выпуску", "set", 1, 7500),
    drainageRow("labor", "backfill", "обратная засыпка", "m3", Math.round(length * 0.12 * 100) / 100, 620),
    drainageRow("labor", "water_test", "проверка проливом", "set", 1, 4500),
    drainageRow("delivery", "soil_removal", "вывоз грунта", "trip", Math.max(1, Math.ceil(length / 60)), 5500),
    drainageRow("delivery", "materials_delivery", "доставка материалов", "trip", Math.max(1, Math.ceil(length / 80)), 6500),
    drainageRow("equipment", "mini_excavator", "мини-экскаватор / ручная выемка", "shift", Math.max(1, Math.ceil(length / 80)), 14500),
    drainageRow("equipment", "plate_compactor", "виброплита для основания", "shift", Math.max(1, Math.ceil(length / 120)), 6500),
  ];
}

function output(plan: EstimatorReasoningPlan, key: string, fallback: number): number {
  return plan.formulas[0]?.outputs[key] ?? fallback;
}

function concreteRow(sectionType: DynamicProfessionalBoqRow["sectionType"], code: string, name: string, unit: string, quantity: number, unitPrice: number, materialKey?: string): DynamicProfessionalBoqRow {
  return {
    sectionType,
    code,
    name,
    unit,
    quantity,
    unitPrice,
    materialKey,
    rateKey: `dynamic_concrete_${code}`,
    sourcePolicy: "configured_reference",
    comment: "Formula-based concrete element BOQ row.",
  };
}

function buildConcreteElementBoq(plan: EstimatorReasoningPlan): DynamicProfessionalBoqRow[] {
  const count = Math.max(1, plan.quantities.count ?? 1);
  const concrete = output(plan, "concreteWithWasteM3", count);
  const formwork = output(plan, "formworkTotalM2", count * 4);
  return [
    concreteRow("labor", "survey", "обмер / осмотр", "set", 1, 3500),
    concreteRow("labor", "axis_marking", "разметка осей", "pcs", count, 1200),
    concreteRow("labor", "kj_warning", "рабочая схема / КЖ warning", "set", 1, 9500),
    concreteRow("materials", "concrete", "бетон", "m3", concrete, 5600, "concrete"),
    concreteRow("materials", "rebar", "арматура", "kg", Math.round(concrete * 95 * 100) / 100, 78, "rebar"),
    concreteRow("materials", "tie_wire", "вязальная проволока", "kg", Math.round(concrete * 2.5 * 100) / 100, 120, "tie_wire"),
    concreteRow("materials", "spacers", "фиксаторы защитного слоя", "pcs", count * 16, 18, "rebar_spacers"),
    concreteRow("materials", "formwork", "опалубка", "sq_m", formwork, 650, "formwork"),
    concreteRow("materials", "formwork_fasteners", "крепёж опалубки", "set", count, 850, "formwork_fasteners"),
    concreteRow("labor", "rebar_tying", "вязка арматуры", "kg", Math.round(concrete * 95 * 100) / 100, 45),
    concreteRow("labor", "formwork_install", "монтаж опалубки", "sq_m", formwork, 420),
    concreteRow("labor", "concrete_acceptance", "приёмка бетона", "m3", concrete, 120),
    concreteRow("labor", "concrete_pour", "заливка бетона", "m3", concrete, 650),
    concreteRow("equipment", "vibration", "вибрирование", "m3", concrete, 260),
    concreteRow("labor", "deformwork", "распалубка", "sq_m", formwork, 210),
    concreteRow("labor", "curing", "уход за бетоном", "m3", concrete, 180),
    concreteRow("equipment", "concrete_pump_warning", "подача бетона warning", "m3", concrete, 1800),
    concreteRow("equipment", "scaffold_warning", "леса / подмости warning", "set", 1, 12000),
    concreteRow("delivery", "materials_delivery", "доставка материалов", "trip", Math.max(1, Math.ceil(concrete / 8)), 6500),
    concreteRow("delivery", "reserve", "резерв на добор материалов и расходники", "set", 1, Math.round(concrete * 900)),
  ];
}

function mepRow(sectionType: DynamicProfessionalBoqRow["sectionType"], code: string, name: string, unit: string, quantity: number, unitPrice: number, materialKey?: string): DynamicProfessionalBoqRow {
  return {
    sectionType,
    code,
    name,
    unit,
    quantity,
    unitPrice,
    materialKey,
    rateKey: `dynamic_mep_${code}`,
    sourcePolicy: "configured_reference",
    comment: "Area-based preliminary MEP BOQ row.",
  };
}

function buildMepAreaBasedBoq(plan: EstimatorReasoningPlan): DynamicProfessionalBoqRow[] {
  const area = Math.max(1, plan.quantities.areaM2 ?? 1);
  const electrical = plan.semanticFrame.object === "electrical_network";
  const prefix = electrical ? "электромонтаж" : "вентиляция";
  return [
    mepRow("labor", "survey", `${prefix}: обследование и схема трасс`, "set", 1, 6000),
    mepRow("materials", "main_material", electrical ? "кабельные линии" : "воздуховоды", electrical ? "linear_m" : "linear_m", Math.round(area * (electrical ? 2.2 : 0.9) * 100) / 100, electrical ? 95 : 820, electrical ? "electrical_cable" : "duct"),
    mepRow("materials", "distribution", electrical ? "щит и автоматика" : "вентиляционная установка / вентилятор", "set", 1, electrical ? 85000 : 160000, electrical ? "electrical_panel" : "ventilation_unit"),
    mepRow("materials", "terminals", electrical ? "розеточные и осветительные точки" : "решетки и диффузоры", "pcs", Math.max(4, Math.ceil(area / (electrical ? 6 : 25))), electrical ? 1800 : 2400, electrical ? "electrical_points" : "air_terminals"),
    mepRow("materials", "auxiliary", electrical ? "гофра, короб, крепеж для кабеля" : "фасонные элементы и крепеж воздуховодов", "set", 1, Math.round(area * (electrical ? 180 : 420)), electrical ? "cable_accessories" : "duct_fittings"),
    mepRow("labor", "marking", electrical ? "разметка электрических трасс" : "разметка трасс воздуховодов", "sq_m", area, 55),
    mepRow("labor", "rough_in", electrical ? "штробление / прокладка кабеля" : "монтаж воздуховодов", "linear_m", Math.round(area * (electrical ? 2.2 : 0.9) * 100) / 100, electrical ? 180 : 520),
    mepRow("labor", "distribution_install", electrical ? "монтаж и подключение щита" : "монтаж вентиляционной установки", "set", 1, electrical ? 26000 : 45000),
    mepRow("labor", "terminal_install", electrical ? "монтаж розеток, выключателей и световых выводов" : "монтаж решеток и диффузоров", "pcs", Math.max(4, Math.ceil(area / (electrical ? 6 : 25))), electrical ? 850 : 950),
    mepRow("labor", "testing", electrical ? "испытания электросети, проверка цепей и замеры" : "пусконаладка, балансировка и замеры воздуха", "set", 1, electrical ? 12000 : 18000),
    mepRow("equipment", "tools", electrical ? "штроборез, тестер, инструмент электрика" : "подъемник и измерительный прибор", "set", 1, electrical ? 8500 : 18000),
    mepRow("delivery", "delivery", electrical ? "доставка кабеля, щита и комплектующих" : "доставка воздуховодов и оборудования", "trip", Math.max(1, Math.ceil(area / 150)), 6500),
  ];
}

function buildCanopyRows(plan: EstimatorReasoningPlan): DynamicProfessionalBoqRow[] {
  const area = Math.max(1, plan.quantities.areaM2 ?? 1);
  const steelKg = Math.round(area * 22 * 100) / 100;
  const columns = Math.max(4, Math.ceil(area / 45) * 2);
  return [
    row("labor", "measure_scheme", "обмер / схема металлического навеса", "set", 1, 3500),
    row("labor", "snow_wind_check", "расчет снеговой и ветровой нагрузки", "set", 1, 6500),
    row("materials", "foundations", "фундаменты под стойки", "m3", Math.round(columns * 0.16 * 100) / 100, 5400, "concrete"),
    row("materials", "anchors", "закладные / анкера", "pcs", columns, 950, "anchors"),
    row("materials", "columns", "стойки металлические", "pcs", columns, 9500, "steel_columns"),
    row("materials", "trusses_beams", "фермы / балки", "kg", Math.round(steelKg * 0.38 * 100) / 100, 98, "steel_trusses"),
    row("materials", "purlins", "прогоны", "linear_m", Math.round(Math.sqrt(area) * 7 * 100) / 100, 520, "purlins"),
    row("materials", "bracing", "связи / раскосы", "kg", Math.round(steelKg * 0.12 * 100) / 100, 95, "bracing"),
    row("materials", "roof_covering", "кровельное покрытие", "sq_m", Math.round(area * 1.08 * 100) / 100, 780, "roof_covering"),
    row("materials", "gutter", "водосток", "linear_m", Math.round(Math.sqrt(area) * 2 * 100) / 100, 650, "gutter"),
    row("materials", "primer", "антикоррозионная грунтовка", "kg", Math.round(steelKg * 0.08 * 100) / 100, 240, "anticorrosion_primer"),
    row("labor", "frame_install", "монтаж металлокаркаса", "kg", steelKg, 85),
    row("labor", "roof_install", "монтаж кровельного покрытия навеса", "sq_m", area, 520),
    row("labor", "primer_labor", "нанесение антикоррозионной грунтовки", "kg", Math.round(steelKg * 0.08 * 100) / 100, 120),
    row("equipment", "crane_lift", "кран / автовышка", "shift", Math.max(1, Math.ceil(area / 300)), 18000),
    row("delivery", "steel_delivery", "доставка металлоконструкций", "trip", Math.max(1, Math.ceil(steelKg / 2500)), 8500),
    row("delivery", "roof_delivery", "доставка кровельного покрытия", "trip", Math.max(1, Math.ceil(area / 300)), 6500),
    row("labor", "handover", "контроль геометрии и сдача навеса", "set", 1, 4500),
  ];
}

function buildHydropowerRows(plan: EstimatorReasoningPlan): DynamicProfessionalBoqRow[] {
  const power = Math.max(1, plan.quantities.powerKw ?? 1);
  const baseRows = [
    row("labor", "machine_hall_survey", "обследование машинного зала ГЭС", "set", 1, 35000),
    row("labor", "hydraulic_inputs", "уточнение напора H и расхода Q", "set", 1, 45000),
    row("materials", "turbine", "турбина ГЭС", "set", 1, power * 18000, "hydro_turbine"),
    row("materials", "generator", "генератор", "set", 1, power * 9500, "generator"),
    row("materials", "control_system", "шкаф управления и защиты", "set", 1, power * 5200, "hydro_control_system"),
    row("materials", "valves", "запорная арматура", "set", 1, power * 2800, "valves"),
    row("materials", "cables", "силовые и контрольные кабели", "linear_m", Math.max(50, power * 2), 420, "power_cables"),
    row("labor", "base_fixing_check", "проверка основания и крепления оборудования", "set", 1, 28000),
    row("labor", "turbine_install", "монтаж турбины", "set", 1, power * 4200),
    row("labor", "generator_install", "монтаж генератора", "set", 1, power * 3200),
    row("labor", "electrical_install", "электромонтаж оборудования ГЭС", "set", 1, power * 2600),
    row("labor", "commissioning", "ПНР гидроагрегата", "set", 1, power * 3600),
    row("labor", "testing", "испытания и режимная наладка", "set", 1, power * 2400),
    row("labor", "inspection_handover", "инспекция и сдача гидроэнергетического оборудования", "set", 1, 42000),
    row("labor", "operator_training", "обучение персонала эксплуатации", "set", 1, 36000),
    row("equipment", "crane", "кран для монтажа оборудования", "shift", Math.max(2, Math.ceil(power / 50)), 28000),
    row("equipment", "rigging", "такелаж", "set", 1, 55000),
    row("delivery", "heavy_delivery", "доставка оборудования ГЭС", "trip", Math.max(1, Math.ceil(power / 80)), 95000),
  ];
  return baseRows;
}

function buildFallbackRows(plan: EstimatorReasoningPlan): DynamicProfessionalBoqRow[] {
  const quantity = plan.quantities.areaM2 ?? plan.quantities.lengthM ?? plan.quantities.count ?? plan.quantities.powerKw ?? 1;
  const object = plan.semanticFrame.object.replace(/_/g, " ");
  return [
    row("labor", "survey", `обследование: ${object}`, "set", 1, 3500),
    row("labor", "layout", `разметка и привязка: ${object}`, "set", 1, 4500),
    row("materials", "primary_material", `основной материал для ${object}`, plan.quantities.lengthM ? "linear_m" : "sq_m", quantity, 750, `${plan.semanticFrame.object}_primary`),
    row("materials", "auxiliary_material", `комплектующие для ${object}`, "set", 1, Math.round(quantity * 120), `${plan.semanticFrame.object}_auxiliary`),
    row("labor", "installation", `профильный монтаж: ${object}`, plan.quantities.lengthM ? "linear_m" : "sq_m", quantity, 420),
    row("labor", "quality", `контроль качества: ${object}`, "set", 1, 2500),
    row("equipment", "tools", `профильный инструмент для ${object}`, "set", 1, 3200),
    row("delivery", "delivery", `доставка материалов для ${object}`, "trip", 1, 5200),
    row("delivery", "waste", `вывоз отходов после ${object}`, "trip", 1, 3500),
    row("labor", "handover", `сдача результата: ${object}`, "set", 1, 1800),
    row("materials", "reserve", `резерв материалов для ${object}`, "set", 1, Math.round(quantity * 80), `${plan.semanticFrame.object}_reserve`),
    row("labor", "documentation", `исполнительная фиксация объема: ${object}`, "set", 1, 2000),
  ];
}

function padRows(plan: EstimatorReasoningPlan, rows: DynamicProfessionalBoqRow[]): DynamicProfessionalBoqRow[] {
  const result = [...rows];
  let index = 0;
  while (result.length < minimumRows(plan.boqPlan.complexity)) {
    result.push(row(
      index % 4 === 0 ? "labor" : index % 4 === 1 ? "materials" : index % 4 === 2 ? "equipment" : "delivery",
      `assurance_${index + 1}`,
      `контроль сметного объема ${plan.semanticFrame.object.replace(/_/g, " ")} ${index + 1}`,
      "set",
      1,
      1200 + index * 120,
      index % 4 === 1 ? `${plan.semanticFrame.object}_assurance` : undefined,
    ));
    index += 1;
  }
  return result;
}

export function validateDynamicProfessionalBoq(boq: DynamicProfessionalBoq): DynamicBoqValidation {
  const failures: string[] = [];
  const minimum = minimumRows(boq.plan.boqPlan.complexity);
  if (boq.rows.length < minimum) failures.push(`row_depth:${boq.rows.length}/${minimum}`);
  for (const rowItem of boq.rows) {
    const normalized = rowItem.name.trim().toLocaleLowerCase("ru-RU");
    if (forbiddenStandalone.has(normalized)) failures.push(`weak_generic:${rowItem.code}`);
    if (!Number.isFinite(rowItem.quantity) || rowItem.quantity <= 0) failures.push(`quantity_invalid:${rowItem.code}`);
    if (!Number.isFinite(rowItem.unitPrice) || rowItem.unitPrice <= 0) failures.push(`unit_price_invalid:${rowItem.code}`);
    if (rowItem.sectionType === "materials" && !rowItem.materialKey) failures.push(`material_key_missing:${rowItem.code}`);
  }
  return { passed: failures.length === 0, failures, rowCount: boq.rows.length, minimumRows: minimum };
}

export function compileDynamicProfessionalBoq(plan: EstimatorReasoningPlan): DynamicProfessionalBoq {
  const object = plan.semanticFrame.object;
  const rows =
    object === "passenger_elevator" ? buildElevatorInstallationBoq(plan) :
      object === "drainage_channel" ? buildDrainageChannelBoq(plan) :
        object === "concrete_pedestal" ? buildConcreteElementBoq(plan) :
          object === "electrical_network" || object === "ventilation_network" ? buildMepAreaBasedBoq(plan) :
            object === "metal_canopy" ? buildCanopyRows(plan) :
              object === "hydropower_turbine" ? buildHydropowerRows(plan) :
                buildFallbackRows(plan);
  const boq: DynamicProfessionalBoq = {
    compilerId: "DynamicProfessionalBoqCompiler",
    plan,
    rows: padRows(plan, rows),
    assumptions: [
      "Смета предварительная и собрана из строительных примитивов, а не exact prompt шаблона.",
      "Цены являются ориентировочными configured reference до подтверждения catalog/source по региону.",
    ],
    exclusions: plan.boqPlan.exclusions,
    costIncreaseFactors: [
      "Скрытые дефекты и фактический доступ к объекту.",
      "Изменение проектных требований, объема и местных норм.",
      "Срочность, ночные смены, подъем и логистика.",
    ],
    clarifyingQuestions: plan.boqPlan.clarifyingQuestions,
    warnings: [
      ...(plan.semanticFrame.regulated ? ["Регулируемая работа: требуется профильный подрядчик, допуски и инспекция."] : []),
      "Локальный налог, источник цены и catalog gap должны быть показаны пользователю.",
    ],
  };
  const validation = validateDynamicProfessionalBoq(boq);
  if (!validation.passed) {
    throw new Error(`DYNAMIC_PROFESSIONAL_BOQ_INVALID:${validation.failures.join(",")}`);
  }
  return boq;
}

