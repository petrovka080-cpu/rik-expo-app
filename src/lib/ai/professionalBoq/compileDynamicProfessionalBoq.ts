import type {
  DynamicBoqValidation,
  DynamicProfessionalBoq,
  DynamicProfessionalBoqRow,
  EstimatorKernelComplexity,
  EstimatorReasoningPlan,
} from "../estimatorKernel/estimatorKernelTypes";
import { expandInfrastructureBoqRows } from "../constructionPrimitives/expandInfrastructureBoqRows";
import { validateInfrastructureBoqDepth } from "../constructionPrimitives/validateInfrastructureBoqDepth";

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

function normalizeDynamicRowName(name: string): string {
  if (name.toLocaleLowerCase("ru-RU") === "листы гкл") return "Листы ГКЛ";
  return name;
}

function row(sectionType: DynamicProfessionalBoqRow["sectionType"], code: string, name: string, unit: string, quantity: number, unitPrice: number, materialKey?: string): DynamicProfessionalBoqRow {
  return {
    sectionType,
    code,
    name: normalizeDynamicRowName(name),
    unit,
    quantity,
    unitPrice,
    materialKey,
    rateKey: `dynamic_universal_${code}`,
    sourcePolicy: "configured_reference",
    comment: "Dynamic estimator kernel work-specific BOQ row.",
  };
}

const USER_VISIBLE_OBJECT_LABELS_RU: Record<string, string> = {
  concrete_pedestal: "\u0431\u0435\u0442\u043e\u043d\u043d\u044b\u0435 \u0442\u0443\u043c\u0431\u044b",
  demolition_scope: "\u0434\u0435\u043c\u043e\u043d\u0442\u0430\u0436\u043d\u044b\u0435 \u0440\u0430\u0431\u043e\u0442\u044b",
  drywall_system: "\u043e\u0431\u043b\u0438\u0446\u043e\u0432\u043a\u0430 \u0441\u0442\u0435\u043d \u0413\u041a\u041b",
  industrial_floor: "\u043f\u0440\u043e\u043c\u044b\u0448\u043b\u0435\u043d\u043d\u044b\u0439 \u043f\u043e\u043b",
  masonry_wall: "\u043a\u0438\u0440\u043f\u0438\u0447\u043d\u0430\u044f \u043a\u043b\u0430\u0434\u043a\u0430",
  passenger_elevator: "\u043f\u0430\u0441\u0441\u0430\u0436\u0438\u0440\u0441\u043a\u0438\u0439 \u043b\u0438\u0444\u0442",
  roof_system: "\u043a\u0440\u043e\u0432\u0435\u043b\u044c\u043d\u0430\u044f \u0441\u0438\u0441\u0442\u0435\u043c\u0430",
  waterproofing_surface: "\u043a\u0440\u043e\u0432\u0435\u043b\u044c\u043d\u0430\u044f \u0433\u0438\u0434\u0440\u043e\u0438\u0437\u043e\u043b\u044f\u0446\u0438\u044f",
};

function userVisibleObjectLabel(plan: EstimatorReasoningPlan): string {
  return USER_VISIBLE_OBJECT_LABELS_RU[plan.semanticFrame.object] ?? plan.semanticFrame.object.replace(/_/g, " ");
}

function buildFallbackObjectSpecificRows(plan: EstimatorReasoningPlan, quantity: number): DynamicProfessionalBoqRow[] {
  if (plan.semanticFrame.object === "drywall_system") {
    return [
      row(
        "materials",
        "drywall_screws",
        "\u0441\u0430\u043c\u043e\u0440\u0435\u0437\u044b \u0434\u043b\u044f \u0413\u041a\u041b \u0438 \u043f\u0440\u043e\u0444\u0438\u043b\u044f",
        "pcs",
        Math.max(100, Math.ceil(quantity * 18)),
        2,
        "drywall_screws",
      ),
    ];
  }
  return [];
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
    elevatorRow("labor", "safety_chain_check", "\u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0430 \u0446\u0435\u043f\u0435\u0439 \u0431\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e\u0441\u0442\u0438 \u043b\u0438\u0444\u0442\u0430", "set", 1, 52000),
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
    concreteRow("materials", "formwork_release_oil", "\u0441\u043c\u0430\u0437\u043a\u0430 \u043e\u043f\u0430\u043b\u0443\u0431\u043a\u0438", "sq_m", formwork, 45, "formwork_release_oil"),
    concreteRow("materials", "chamfer_strips", "\u0444\u0430\u0441\u043a\u0438 / \u0440\u0435\u0439\u043a\u0438 \u0434\u043b\u044f \u043e\u043f\u0430\u043b\u0443\u0431\u043a\u0438", "linear_m", count * 4, 140, "formwork_chamfer_strips"),
    concreteRow("materials", "anchor_bolts_warning", "\u0430\u043d\u043a\u0435\u0440\u043d\u044b\u0435 \u0431\u043e\u043b\u0442\u044b warning", "pcs", count * 4, 320, "anchor_bolts"),
    concreteRow("labor", "base_preparation", "\u043f\u043e\u0434\u0433\u043e\u0442\u043e\u0432\u043a\u0430 \u043e\u0441\u043d\u043e\u0432\u0430\u043d\u0438\u044f \u043f\u043e\u0434 \u0442\u0443\u043c\u0431\u044b", "sq_m", formwork, 180),
    concreteRow("labor", "rebar_cutting", "\u0440\u0435\u0437\u043a\u0430 \u0438 \u0433\u0438\u0431\u043a\u0430 \u0430\u0440\u043c\u0430\u0442\u0443\u0440\u044b", "kg", Math.round(concrete * 95 * 100) / 100, 38),
    concreteRow("labor", "embedded_parts_check", "\u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0430 \u0437\u0430\u043a\u043b\u0430\u0434\u043d\u044b\u0445 \u0434\u0435\u0442\u0430\u043b\u0435\u0439", "pcs", count, 950),
    concreteRow("labor", "rebar_tying", "вязка арматуры", "kg", Math.round(concrete * 95 * 100) / 100, 45),
    concreteRow("labor", "formwork_install", "монтаж опалубки", "sq_m", formwork, 420),
    concreteRow("labor", "concrete_acceptance", "приёмка бетона", "m3", concrete, 120),
    concreteRow("labor", "concrete_pour", "заливка бетона", "m3", concrete, 650),
    concreteRow("equipment", "vibration", "вибрирование", "m3", concrete, 260),
    concreteRow("labor", "deformwork", "распалубка", "sq_m", formwork, 210),
    concreteRow("labor", "curing", "уход за бетоном", "m3", concrete, 180),
    concreteRow("labor", "level_control", "\u043a\u043e\u043d\u0442\u0440\u043e\u043b\u044c \u043e\u0442\u043c\u0435\u0442\u043e\u043a \u0442\u0443\u043c\u0431", "pcs", count, 420),
    concreteRow("labor", "surface_finish", "\u0437\u0430\u0442\u0438\u0440\u043a\u0430 \u0432\u0435\u0440\u0445\u0430 \u0442\u0443\u043c\u0431", "pcs", count, 380),
    concreteRow("equipment", "concrete_pump_warning", "подача бетона warning", "m3", concrete, 1800),
    concreteRow("equipment", "scaffold_warning", "леса / подмости warning", "set", 1, 12000),
    concreteRow("equipment", "laser_level", "\u043b\u0430\u0437\u0435\u0440\u043d\u044b\u0439 \u0443\u0440\u043e\u0432\u0435\u043d\u044c", "shift", 1, 1800),
    concreteRow("delivery", "materials_delivery", "доставка материалов", "trip", Math.max(1, Math.ceil(concrete / 8)), 6500),
    concreteRow("labor", "handover_scheme", "\u0438\u0441\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044c\u043d\u0430\u044f \u0441\u0445\u0435\u043c\u0430 \u0442\u0443\u043c\u0431", "set", 1, 2500),
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
  if (electrical) return buildElectricalInstallationRows(plan);
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
    row("materials", "trusses_beams", "\u0424\u0435\u0440\u043c\u044b / \u0431\u0430\u043b\u043a\u0438 \u043c\u0435\u0442\u0430\u043b\u043b\u0438\u0447\u0435\u0441\u043a\u0438\u0435", "kg", Math.round(steelKg * 0.38 * 100) / 100, 98, "steel_trusses"),
    row("materials", "purlins", "прогоны", "linear_m", Math.round(Math.sqrt(area) * 7 * 100) / 100, 520, "purlins"),
    row("materials", "bracing", "связи / раскосы", "kg", Math.round(steelKg * 0.12 * 100) / 100, 95, "bracing"),
    row("materials", "roof_covering", "\u043a\u0440\u043e\u0432\u0435\u043b\u044c\u043d\u043e\u0435 \u043f\u043e\u043a\u0440\u044b\u0442\u0438\u0435 \u0434\u043b\u044f \u043d\u0430\u0432\u0435\u0441\u0430", "sq_m", Math.round(area * 1.08 * 100) / 100, 780, "roof_covering"),
    row("materials", "roof_fasteners", "крепёж кровельного покрытия навеса", "set", 1, Math.round(area * 55), "roof_fasteners"),
    row("materials", "gutter", "водосток", "linear_m", Math.round(Math.sqrt(area) * 2 * 100) / 100, 650, "gutter"),
    row("materials", "welding_materials", "\u0441\u0432\u0430\u0440\u043e\u0447\u043d\u044b\u0435 \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b", "set", 1, Math.round(steelKg * 18), "welding"),
    row("materials", "primer", "антикоррозионная грунтовка", "kg", Math.round(steelKg * 0.08 * 100) / 100, 240, "anticorrosion_primer"),
    row("labor", "frame_install", "монтаж металлокаркаса", "kg", steelKg, 85),
    row("labor", "columns_install", "\u043c\u043e\u043d\u0442\u0430\u0436 \u0441\u0442\u043e\u0435\u043a", "pcs", columns, 1800),
    row("labor", "trusses_install", "\u043c\u043e\u043d\u0442\u0430\u0436 \u0444\u0435\u0440\u043c / \u0431\u0430\u043b\u043e\u043a", "kg", Math.round(steelKg * 0.38 * 100) / 100, 42),
    row("labor", "purlins_install", "\u043c\u043e\u043d\u0442\u0430\u0436 \u043f\u0440\u043e\u0433\u043e\u043d\u043e\u0432", "linear_m", Math.round(Math.sqrt(area) * 7 * 100) / 100, 180),
    row("labor", "roof_install", "монтаж кровельного покрытия навеса", "sq_m", area, 520),
    row("labor", "primer_labor", "нанесение антикоррозионной грунтовки", "kg", Math.round(steelKg * 0.08 * 100) / 100, 120),
    row("equipment", "crane_lift", "кран / автовышка", "shift", Math.max(1, Math.ceil(area / 300)), 18000),
    row("delivery", "steel_delivery", "\u0434\u043e\u0441\u0442\u0430\u0432\u043a\u0430 \u043c\u0435\u0442\u0430\u043b\u043b\u0430", "trip", Math.max(1, Math.ceil(steelKg / 2500)), 8500),
    row("delivery", "roof_delivery", "доставка кровельного покрытия", "trip", Math.max(1, Math.ceil(area / 300)), 6500),
    row("labor", "handover", "контроль геометрии и сдача навеса", "set", 1, 4500),
  ];
}

function buildElectricalInstallationRows(plan: EstimatorReasoningPlan): DynamicProfessionalBoqRow[] {
  const area = Math.max(1, plan.quantities.areaM2 ?? 1);
  const points = Math.max(plan.quantities.count ?? 0, Math.ceil(area / 6), 10);
  const outlets = Math.max(plan.quantities.count ?? 0, Math.ceil(points * 0.55), 10);
  const switches = Math.max(2, Math.ceil(points * 0.45));
  const cableLength = Math.round(area * 2.4 * 100) / 100;
  const lightingCableLength = Math.round(area * 0.85 * 100) / 100;
  const trunkLength = Math.round(area * 0.45 * 100) / 100;
  const groups = Math.max(4, Math.ceil(points / 8));
  return [
    mepRow("labor", "electrical_survey", "обследование объекта и схема электрики", "set", 1, 7200),
    mepRow("labor", "electrical_load_groups", "разбивка розеточных и осветительных групп", "set", 1, 6800),
    mepRow("labor", "electrical_route_marking", "разметка электрических трасс кабеля, розеток и выключателей", "sq_m", area, 62),
    mepRow("labor", "electrical_wall_scanning", "проверка скрытых коммуникаций перед штроблением", "sq_m", area, 34),
    mepRow("labor", "electrical_dust_protection", "защита помещений от пыли перед электромонтажом", "sq_m", area, 28),
    mepRow("materials", "electrical_power_cable", "кабельные линии ВВГнг-LS / аналог для розеточных линий", "linear_m", cableLength, 118, "electrical_cable_power"),
    mepRow("materials", "electrical_lighting_cable", "кабель для осветительных и выключательных линий", "linear_m", lightingCableLength, 82, "electrical_cable_lighting"),
    mepRow("materials", "electrical_corrugation_channel", "гофра / кабель-канал для прокладки кабеля", "linear_m", Math.round((cableLength + lightingCableLength) * 0.65 * 100) / 100, 46, "electrical_corrugation"),
    mepRow("materials", "electrical_socket_boxes", "подрозетники", "pcs", outlets + switches, 72, "socket_boxes"),
    mepRow("materials", "electrical_outlets", "розетки", "pcs", outlets, 420, "electrical_outlets"),
    mepRow("materials", "electrical_switches", "выключатели", "pcs", switches, 360, "electrical_switches"),
    mepRow("materials", "electrical_junction_boxes", "распределительные коробки", "pcs", Math.max(3, groups), 260, "junction_boxes"),
    mepRow("materials", "electrical_panel", "щит и автоматика / квартирный щит", "set", 1, 42000, "electrical_panel"),
    mepRow("materials", "electrical_breakers", "автоматы, УЗО / дифзащита по группам", "pcs", groups + 2, 1850, "electrical_breakers"),
    mepRow("materials", "electrical_ground_bus", "шина PE/N и маркировка групп", "set", 1, 3800, "electrical_panel_accessories"),
    mepRow("materials", "electrical_fasteners", "крепеж кабеля, клипсы и расходники электромонтажа", "set", 1, Math.round(area * 85), "electrical_fasteners"),
    mepRow("labor", "electrical_chasing_or_channel", "штробление или монтаж кабель-канала по трассам", "linear_m", trunkLength, 260),
    mepRow("labor", "electrical_cable_laying", "прокладка кабеля и кабельных линий", "linear_m", cableLength + lightingCableLength, 145),
    mepRow("labor", "electrical_socket_box_install", "монтаж подрозетников", "pcs", outlets + switches, 320),
    mepRow("labor", "electrical_junction_box_install", "монтаж распределительных коробок", "pcs", Math.max(3, groups), 520),
    mepRow("labor", "electrical_panel_mount", "монтаж и расключение электрического щита", "set", 1, 28000),
    mepRow("labor", "electrical_outlet_install", "монтаж розеток", "pcs", outlets, 620),
    mepRow("labor", "electrical_switch_install", "монтаж выключателей", "pcs", switches, 580),
    mepRow("labor", "electrical_line_continuity", "прозвонка линий и проверка цепей", "set", 1, 6800),
    mepRow("labor", "electrical_insulation_test", "проверка сопротивления изоляции", "set", 1, 9200),
    mepRow("labor", "electrical_group_labeling", "маркировка групп в щите и на линиях", "set", 1, 4200),
    mepRow("labor", "electrical_chase_repair_warning", "заделка штроб warning: объем зависит от отделки", "linear_m", trunkLength, 190),
    mepRow("equipment", "electrical_chaser", "штроборез и пылеудаление", "shift", Math.max(1, Math.ceil(area / 90)), 6800),
    mepRow("equipment", "electrical_testing_tools", "тестер, мегаомметр и измерительный инструмент", "set", 1, 5200),
    mepRow("delivery", "electrical_material_delivery", "доставка кабеля, розеток, выключателей и щита", "trip", Math.max(1, Math.ceil(area / 140)), 5200),
    mepRow("delivery", "electrical_waste_removal", "вынос и вывоз мусора после штробления", "trip", Math.max(1, Math.ceil(area / 160)), 3800),
    mepRow("materials", "electrical_reserve", "резерв кабеля и электроустановочных изделий", "set", 1, Math.round((cableLength + lightingCableLength) * 12), "electrical_reserve"),
  ];
}

function buildLowVoltageCablingRows(plan: EstimatorReasoningPlan): DynamicProfessionalBoqRow[] {
  const area = Math.max(1, plan.quantities.areaM2 ?? 1);
  const ports = Math.max(plan.quantities.count ?? 0, Math.ceil(area / 10), 8);
  const cableLength = Math.round(area * 1.7 * 100) / 100;
  const traysLength = Math.round(area * 0.35 * 100) / 100;
  const racks = Math.max(1, Math.ceil(ports / 48));
  return [
    mepRow("labor", "low_voltage_survey", "обследование помещений и схема слаботочных трасс", "set", 1, 6200),
    mepRow("labor", "low_voltage_ports_schedule", "ведомость портов RJ45 и точек подключения", "pcs", ports, 180),
    mepRow("labor", "low_voltage_route_marking", "разметка слаботочных трасс", "sq_m", area, 48),
    mepRow("materials", "low_voltage_utp_cable", "UTP кабель Cat.6 / аналог", "linear_m", cableLength, 78, "low_voltage_utp_cable"),
    mepRow("materials", "low_voltage_patch_panel", "патч-панель", "pcs", racks, 12500, "low_voltage_patch_panel"),
    mepRow("materials", "low_voltage_rj45_outlets", "розетки RJ45 и информационные модули", "pcs", ports, 520, "low_voltage_rj45_outlets"),
    mepRow("materials", "low_voltage_cable_channel", "кабель-канал / лоток для слаботочных линий", "linear_m", traysLength, 260, "low_voltage_cable_channel"),
    mepRow("materials", "low_voltage_cabinet", "слаботочный шкаф / коммутационная зона", "pcs", racks, 28000, "low_voltage_cabinet"),
    mepRow("materials", "low_voltage_patch_cords", "патч-корды и маркировочные элементы", "pcs", ports, 220, "low_voltage_patch_cords"),
    mepRow("materials", "low_voltage_fasteners", "крепеж кабель-канала и расходники СКС", "set", 1, Math.round(area * 65), "low_voltage_fasteners"),
    mepRow("labor", "low_voltage_channel_install", "монтаж кабель-канала / лотка для СКС", "linear_m", traysLength, 180),
    mepRow("labor", "low_voltage_cable_laying", "прокладка кабеля", "linear_m", cableLength, 95),
    mepRow("labor", "low_voltage_outlet_mount", "монтаж розеток RJ45", "pcs", ports, 420),
    mepRow("labor", "low_voltage_patch_panel_mount", "монтаж и расключение патч-панели", "pcs", racks, 6500),
    mepRow("labor", "low_voltage_line_termination", "оконцевание линий и обжим коннекторов", "pcs", ports * 2, 160),
    mepRow("labor", "low_voltage_labeling", "маркировка портов и кабельного журнала", "pcs", ports, 120),
    mepRow("equipment", "low_voltage_cable_tester", "кабельный тестер для проверки линий", "set", 1, 3600),
    mepRow("equipment", "low_voltage_crimp_tool", "обжимной инструмент и тон-генератор", "set", 1, 2400),
    mepRow("labor", "low_voltage_network_testing", "тестирование сети и проверка распиновки", "pcs", ports, 260),
    mepRow("delivery", "low_voltage_delivery", "доставка кабеля, патч-панели и розеток RJ45", "trip", Math.max(1, Math.ceil(area / 180)), 4200),
    mepRow("materials", "low_voltage_reserve", "резерв UTP кабеля и модулей RJ45", "set", 1, Math.round(cableLength * 12), "low_voltage_reserve"),
  ];
}

function buildSolarPowerSystemRows(plan: EstimatorReasoningPlan): DynamicProfessionalBoqRow[] {
  const powerKw = Math.max(1, plan.quantities.powerKw ?? 30);
  const panelCount = Math.max(4, Math.ceil(powerKw / 0.55));
  const roofArea = Math.round(panelCount * 2.4 * 100) / 100;
  const dcCableLength = Math.round(powerKw * 5.2 * 100) / 100;
  return [
    row("labor", "solar_site_survey", "обследование крыши и точки подключения", "set", 1, 12000),
    row("labor", "solar_roof_capacity_check", "проверка несущей способности кровли warning", "set", 1, 16000),
    row("labor", "solar_shading_layout", "обмер затенения и схема раскладки солнечных панелей", "set", 1, 9500),
    row("labor", "solar_power_scheme", "расчет мощности, строк и электрической схемы", "set", 1, 14000),
    row("materials", "solar_panels", "солнечные панели", "pcs", panelCount, 15500, "solar_panels"),
    row("materials", "solar_inverter", "инвертор сетевой / гибридный", "set", 1, powerKw * 11500, "solar_inverter"),
    row("materials", "solar_mounting_rails", "крепежная система и направляющие", "sq_m", roofArea, 950, "solar_mounting"),
    row("materials", "solar_roof_hooks", "кровельные крюки / анкера креплений", "pcs", panelCount * 2, 420, "solar_mounting_hooks"),
    row("materials", "solar_clamps", "прижимы и межпанельные зажимы", "pcs", panelCount * 4, 160, "solar_clamps"),
    row("materials", "solar_dc_cable", "DC кабели солнечной станции", "linear_m", dcCableLength, 260, "solar_dc_cable"),
    row("materials", "solar_ac_cable", "AC кабель от инвертора до щита", "linear_m", Math.max(15, powerKw * 1.8), 360, "solar_ac_cable"),
    row("materials", "solar_connectors", "MC4 коннекторы и кабельные вводы", "set", Math.max(1, Math.ceil(panelCount / 8)), 2800, "solar_connectors"),
    row("materials", "solar_dc_protection", "DC защита, предохранители и разъединитель", "set", 1, powerKw * 1800, "solar_dc_protection"),
    row("materials", "solar_ac_protection", "AC защита и автоматика подключения", "set", 1, powerKw * 1600, "solar_ac_protection"),
    row("materials", "solar_grounding", "заземление и уравнивание потенциалов", "set", 1, powerKw * 950, "solar_grounding"),
    row("materials", "solar_metering", "узел учета / мониторинг генерации warning", "set", 1, 18000, "solar_monitoring"),
    row("materials", "solar_labels", "маркировка кабелей и предупреждающие таблички", "set", 1, 3200, "solar_labels"),
    row("labor", "solar_safety_setup", "организация страховки на крыше", "set", 1, 8500),
    row("labor", "solar_material_lift", "подъем солнечных панелей на кровлю", "pcs", panelCount, 280),
    row("labor", "solar_mount_layout", "разметка креплений солнечной станции", "sq_m", roofArea, 75),
    row("labor", "solar_mounting_install", "монтаж креплений и направляющих", "sq_m", roofArea, 380),
    row("labor", "solar_panel_mount", "монтаж солнечных панелей", "pcs", panelCount, 650),
    row("labor", "solar_dc_cabling", "прокладка DC кабелей по кровле", "linear_m", dcCableLength, 180),
    row("labor", "solar_string_termination", "оконцевание строк и подключение MC4", "set", Math.max(1, Math.ceil(panelCount / 12)), 3200),
    row("labor", "solar_inverter_mount", "монтаж инвертора", "set", 1, 12000),
    row("labor", "solar_ac_cabling", "прокладка AC кабеля до точки подключения", "linear_m", Math.max(15, powerKw * 1.8), 240),
    row("labor", "solar_protection_install", "монтаж DC/AC защиты и автоматики", "set", 1, 15000),
    row("labor", "solar_grounding_install", "монтаж заземления солнечной станции", "set", 1, 8500),
    row("labor", "solar_monitoring_setup", "настройка мониторинга инвертора", "set", 1, 6500),
    row("labor", "solar_insulation_measurement", "электроизмерения и проверка изоляции", "set", 1, 9500),
    row("labor", "solar_commissioning", "пусконаладка солнечной электростанции", "set", 1, powerKw * 850),
    row("labor", "solar_documentation", "исполнительная схема и маркировочная ведомость", "set", 1, 6500),
    row("equipment", "solar_roof_safety", "страховка на крыше и временные ограждения", "set", 1, 12000),
    row("equipment", "solar_lift", "подъемник / такелаж для панелей", "shift", Math.max(1, Math.ceil(panelCount / 36)), 16500),
    row("equipment", "solar_electrical_meter", "мегаомметр, мультиметр и клещи постоянного тока", "set", 1, 6200),
    row("equipment", "solar_torque_tools", "динамометрический инструмент для креплений", "set", 1, 4200),
    row("delivery", "solar_panel_delivery", "доставка солнечных панелей", "trip", Math.max(1, Math.ceil(panelCount / 60)), 18500),
    row("delivery", "solar_inverter_delivery", "доставка инвертора и автоматики", "trip", 1, 6500),
    row("delivery", "solar_roof_logistics", "перемещение панелей по кровле", "set", 1, Math.round(panelCount * 160)),
    row("delivery", "solar_waste_removal", "вывоз упаковки и отходов монтажа", "trip", 1, 4200),
    row("labor", "solar_quality_fasteners", "контроль затяжки креплений", "pcs", panelCount * 4, 45),
    row("labor", "solar_quality_strings", "проверка полярности и напряжения строк", "set", Math.max(1, Math.ceil(panelCount / 12)), 1800),
    row("labor", "solar_grid_sync_warning", "синхронизация с сетью warning: по условиям энергоснабжающей организации", "set", 1, 12000),
    row("labor", "solar_owner_training", "инструктаж владельца по эксплуатации и отключению", "set", 1, 4500),
    row("materials", "solar_reserve", "резерв кабеля, коннекторов и крепежа", "set", 1, Math.round(powerKw * 1250), "solar_reserve"),
  ];
}

function buildPavingStoneRows(plan: EstimatorReasoningPlan): DynamicProfessionalBoqRow[] {
  const area = Math.max(1, plan.quantities.areaM2 ?? 1);
  const curbLength = Math.max(8, Math.round(Math.sqrt(area) * 4 * 100) / 100);
  const sandM3 = Math.round(area * 0.05 * 100) / 100;
  const crushedStoneM3 = Math.round(area * 0.12 * 100) / 100;
  const beddingM3 = Math.round(area * 0.04 * 100) / 100;
  const soilM3 = Math.round(area * 0.18 * 100) / 100;
  return [
    row("labor", "survey", "обмер и схема мощения брусчаткой", "set", 1, 3500),
    row("labor", "marking", "разметка покрытия и отметок", "sq_m", area, 70),
    row("labor", "excavation", "выемка грунта под основание", "m3", soilM3, 850),
    row("labor", "base_grading", "планировка основания", "sq_m", area, 120),
    row("materials", "geotextile", "геотекстиль", "sq_m", Math.round(area * 1.08 * 100) / 100, 70, "geotextile"),
    row("materials", "sand", "песок для подготовки", "m3", sandM3, 1550, "sand"),
    row("materials", "crushed_stone", "щебень основания", "m3", crushedStoneM3, 1900, "crushed_stone"),
    row("materials", "bedding_mix", "отсев / пескоцементная смесь", "m3", beddingM3, 2100, "bedding_mix"),
    row("materials", "curb", "бордюр / поребрик", "linear_m", curbLength, 520, "curb"),
    row("materials", "curb_concrete", "бетон под бордюр", "m3", Math.round(curbLength * 0.035 * 100) / 100, 5600, "concrete"),
    row("materials", "paving_stone", "Брусчатка / тротуарная плитка", "sq_m", Math.round(area * 1.06 * 100) / 100, 720, "paving_stone"),
    row("materials", "joint_sand", "песок для заполнения швов", "m3", Math.round(area * 0.01 * 100) / 100, 1550, "joint_sand"),
    row("labor", "curb_install", "установка бордюра", "linear_m", curbLength, 260),
    row("labor", "stone_cutting", "резка брусчатки", "linear_m", Math.round(curbLength * 0.25 * 100) / 100, 180),
    row("labor", "stone_laying", "укладка брусчатки", "sq_m", area, 480),
    row("equipment", "compaction", "виброуплотнение / виброплита", "shift", Math.max(1, Math.ceil(area / 250)), 6500),
    row("labor", "joint_filling", "заполнение швов", "sq_m", area, 95),
    row("labor", "quality", "контроль уклонов и приемка мощения", "sq_m", area, 45),
    row("delivery", "materials_delivery", "доставка брусчатки и основания", "trip", Math.max(1, Math.ceil(area / 250)), 6500),
    row("delivery", "soil_removal", "вывоз грунта", "trip", Math.max(1, Math.ceil(soilM3 / 8)), 5500),
    row("materials", "reserve", "резерв брусчатки на подрезку", "sq_m", Math.round(area * 0.04 * 100) / 100, 720, "paving_stone_reserve"),
  ];
}

function buildGableRoofRows(plan: EstimatorReasoningPlan): DynamicProfessionalBoqRow[] {
  const baseArea = Math.max(1, plan.quantities.areaM2 ?? 1);
  const ridgeHeight = Math.max(1.5, plan.quantities.lengthM ?? plan.quantities.heightM ?? 2);
  const roofArea = Math.round(baseArea * 1.18 * 100) / 100;
  const perimeter = Math.round(Math.sqrt(baseArea) * 4 * 100) / 100;
  const rafters = Math.max(10, Math.ceil(roofArea / 4));
  return [
    row("labor", "survey", "обмер основания и высоты конька", "set", 1, 4500),
    row("labor", "roof_scheme", "рабочая схема двускатной крыши", "set", 1, 8500),
    row("materials", "wall_plate", "мауэрлат", "linear_m", perimeter, 720, "wall_plate"),
    row("materials", "rafters", "стропила", "pcs", rafters, 1450, "rafters"),
    row("materials", "ridge_beam", "коньковый прогон", "linear_m", Math.round(Math.sqrt(baseArea) * 100) / 100, 980, "ridge_beam"),
    row("materials", "antiseptic", "антисептик для древесины", "kg", Math.round((perimeter + rafters * ridgeHeight) * 0.12 * 100) / 100, 240, "wood_antiseptic"),
    row("materials", "membrane", "мембрана", "sq_m", Math.round(roofArea * 1.1 * 100) / 100, 95, "roof_membrane"),
    row("materials", "counter_batten", "контробрешётка", "linear_m", Math.round(roofArea * 1.2 * 100) / 100, 85, "counter_batten"),
    row("materials", "batten", "обрешётка", "sq_m", roofArea, 180, "roof_batten"),
    row("materials", "roof_covering", "кровельное покрытие", "sq_m", Math.round(roofArea * 1.08 * 100) / 100, 760, "roof_covering"),
    row("materials", "flashings", "доборные элементы", "linear_m", perimeter, 420, "roof_flashings"),
    row("materials", "gutter", "водосток", "linear_m", Math.round(perimeter * 0.5 * 100) / 100, 650, "gutter"),
    row("materials", "fasteners", "крепёж кровельной системы", "set", 1, Math.round(roofArea * 75), "roof_fasteners"),
    row("labor", "wood_treatment", "антисептическая обработка древесины", "linear_m", perimeter + rafters, 55),
    row("labor", "rafter_install", "монтаж стропильной системы", "pcs", rafters, 850),
    row("labor", "membrane_install", "монтаж мембраны", "sq_m", roofArea, 120),
    row("labor", "counter_batten_install", "монтаж контробрешётки", "linear_m", Math.round(roofArea * 1.2 * 100) / 100, 90),
    row("labor", "batten_install", "монтаж обрешётки", "sq_m", roofArea, 180),
    row("labor", "roof_install", "монтаж кровли", "sq_m", roofArea, 520),
    row("labor", "flashings_install", "монтаж доборных элементов", "linear_m", perimeter, 260),
    row("labor", "gutter_install", "монтаж водостока", "linear_m", Math.round(perimeter * 0.5 * 100) / 100, 300),
    row("equipment", "scaffold", "леса / страховка", "set", 1, 12000),
    row("equipment", "lift", "подъемник для кровельных материалов", "shift", Math.max(1, Math.ceil(roofArea / 180)), 15000),
    row("delivery", "roof_delivery", "доставка кровли и пиломатериалов", "trip", Math.max(1, Math.ceil(roofArea / 180)), 6500),
    row("materials", "reserve", "резерв кровельных материалов", "sq_m", Math.round(roofArea * 0.04 * 100) / 100, 760, "roof_material_reserve"),
  ];
}

function buildFloorCoveringRows(plan: EstimatorReasoningPlan): DynamicProfessionalBoqRow[] {
  const area = Math.max(1, plan.quantities.areaM2 ?? 1);
  const perimeter = Math.max(8, Math.round(Math.sqrt(area) * 4 * 100) / 100);
  const thresholds = Math.max(1, Math.ceil(area / 45));
  const materialSystem = plan.semanticFrame.materialSystem ?? "";
  const isLaminate = materialSystem.includes("laminate");
  const isParquet = materialSystem.includes("parquet");
  const isPvc = materialSystem.includes("pvc");
  const isLinoleum = materialSystem.includes("linoleum");
  const coveringName =
    isLaminate ? "ламинат" :
      isParquet ? "паркет / паркетная доска" :
        isPvc ? "ПВХ покрытие" :
          isLinoleum ? "линолеум" :
            "напольное покрытие";
  const adhesiveName = isLaminate ? "подложка / клей для порогов" : "подложка / клей";
  const layingName =
    isLaminate ? "укладка ламината" :
      isParquet ? "укладка паркета" :
        isPvc ? "укладка ПВХ покрытия" :
          isLinoleum ? "укладка линолеума" :
            "укладка покрытия";
  const cuttingName = isLinoleum ? "раскрой линолеума / раскрой покрытия" : "раскрой покрытия";
  return [
    row("labor", "survey", `обмер помещений под ${coveringName}`, "set", 1, 3000),
    row("labor", "base_check", "проверка ровности основания", "sq_m", area, 45),
    row("labor", "base_preparation", "подготовка основания", "sq_m", area, 150),
    row("labor", "local_defect_repair", "ремонт локальных дефектов основания", "sq_m", Math.round(area * 0.12 * 100) / 100, 420),
    row("materials", "primer", "грунтовка основания", "sq_m", area, 55, "floor_primer"),
    row("materials", "leveling_mix", "ремонтная смесь для локальных дефектов", "kg", Math.round(area * 0.35 * 100) / 100, 80, "floor_repair_mix"),
    row("materials", "floor_covering", `напольное покрытие: ${coveringName}`, "sq_m", Math.round(area * 1.08 * 100) / 100, isParquet ? 1250 : isLaminate ? 680 : 520, `${materialSystem || "floor_covering"}_covering`),
    row("materials", "underlay_or_adhesive", adhesiveName, isLaminate ? "sq_m" : "kg", isLaminate ? Math.round(area * 1.05 * 100) / 100 : Math.round(area * 0.35 * 100) / 100, isLaminate ? 95 : 170, `${materialSystem || "floor_covering"}_adhesive_underlay`),
    ...(isLinoleum ? [row("materials", "linoleum_fixation", "клей / фиксация линолеума", "kg", Math.round(area * 0.35 * 100) / 100, 170, "linoleum_adhesive")] : []),
    row("materials", "baseboard", "плинтус", "linear_m", perimeter, 260, "baseboard"),
    row("materials", "thresholds", "порожки", "pcs", thresholds, 850, "thresholds"),
    row("materials", "consumables", "ножи, ленты и расходники для раскроя", "set", 1, Math.round(area * 35), "linoleum_consumables"),
    row("labor", "cutting", cuttingName, "sq_m", area, 120),
    row("labor", "laying", layingName, "sq_m", area, isParquet ? 520 : 340),
    row("labor", "edge_trimming", "подрезка примыканий", "linear_m", perimeter, 95),
    row("labor", "baseboard_install", "монтаж плинтуса", "linear_m", perimeter, 180),
    row("labor", "threshold_install", "установка порожков", "pcs", thresholds, 450),
    row("equipment", "vacuum", "строительный пылесос", "shift", Math.max(1, Math.ceil(area / 180)), 2800),
    row("equipment", "hand_tools", "ручной инструмент для раскроя", "set", 1, 1800),
    row("delivery", "delivery", "доставка рулонного покрытия и расходников", "trip", Math.max(1, Math.ceil(area / 180)), 4200),
    row("delivery", "waste_removal", "вынос отходов и упаковки", "trip", 1, 2500),
    row("materials", "reserve", `резерв ${coveringName} на подрезку`, "sq_m", Math.round(area * 0.03 * 100) / 100, isParquet ? 1250 : isLaminate ? 680 : 520, `${materialSystem || "floor_covering"}_reserve`),
  ];
}

function buildRoofWaterproofingRows(plan: EstimatorReasoningPlan): DynamicProfessionalBoqRow[] {
  const area = Math.max(1, plan.quantities.areaM2 ?? 1);
  const perimeter = Math.max(8, Math.round(Math.sqrt(area) * 4 * 100) / 100);
  const drains = Math.max(1, Math.ceil(area / 120));
  return [
    row("labor", "roof_survey", "обследование кровли и отметок", "set", 1, 3500),
    row("labor", "roof_cleaning", "очистка кровли", "sq_m", area, 95),
    row("labor", "base_preparation", "подготовка основания кровли", "sq_m", area, 130),
    row("labor", "defect_repair", "ремонт дефектов основания кровли", "sq_m", Math.round(area * 0.12 * 100) / 100, 420),
    row("materials", "primer", "праймер для кровли", "sq_m", area, 80, "roof_waterproofing_primer"),
    row("materials", "waterproofing", "гидроизоляция кровли / гидроизоляционный материал", "sq_m", Math.round(area * 1.08 * 100) / 100, 560, "roof_waterproofing_membrane"),
    row("materials", "reinforcing_tape", "армирующая лента примыканий", "linear_m", perimeter, 120, "reinforcing_tape"),
    row("materials", "sealant", "герметик для примыканий и проходок", "linear_m", perimeter, 180, "roof_sealant"),
    row("materials", "drains", "воронки / водоприемные узлы", "pcs", drains, 2200, "roof_drains"),
    row("labor", "primer_apply", "нанесение праймера", "sq_m", area, 110),
    row("labor", "waterproofing_install", "нанесение / монтаж гидроизоляции", "sq_m", area, 360),
    row("labor", "junction_sealing", "герметизация примыканий", "linear_m", perimeter, 240),
    row("labor", "drain_detailing", "герметизация воронки и проходок", "pcs", drains, 950),
    row("labor", "leak_test", "проверка герметичности", "set", 1, 5500),
    row("equipment", "torch_warning", "газовая горелка warning / ручной инструмент", "set", 1, 3500),
    row("delivery", "delivery", "доставка гидроизоляции", "trip", Math.max(1, Math.ceil(area / 180)), 4200),
    row("delivery", "waste", "утилизация отходов", "trip", 1, 2500),
    row("materials", "reserve", "резерв гидроизоляционного материала", "sq_m", Math.round(area * 0.04 * 100) / 100, 560, "roof_waterproofing_reserve"),
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

function buildIndustrialFloorRows(plan: EstimatorReasoningPlan): DynamicProfessionalBoqRow[] {
  const area = Math.max(1, plan.quantities.areaM2 ?? 1);
  const perimeter = Math.max(8, Math.round(Math.sqrt(area) * 4 * 100) / 100);
  const concreteM3 = Math.round(area * 0.16 * 100) / 100;
  return [
    row("labor", "industrial_floor_survey", "обследование основания промышленного пола", "set", 1, 8500),
    row("labor", "industrial_floor_load_review", "уточнение расчетной нагрузки и класса пола", "set", 1, 12000),
    row("labor", "industrial_floor_level_marks", "разбивка высотных отметок лазерным уровнем", "sq_m", area, 38),
    row("labor", "industrial_floor_base_cleaning", "очистка основания перед устройством пола", "sq_m", area, 45),
    row("labor", "industrial_floor_base_milling", "локальная фрезеровка / подготовка слабых зон", "sq_m", Math.round(area * 0.12 * 100) / 100, 220),
    row("materials", "industrial_floor_geotextile_warning", "разделительный слой / пленка под плиту пола", "sq_m", Math.round(area * 1.05 * 100) / 100, 45, "floor_membrane"),
    row("materials", "industrial_floor_sand_leveling", "песчаная подготовка под плиту пола", "m3", Math.round(area * 0.04 * 100) / 100, 1550, "sand"),
    row("materials", "industrial_floor_crushed_stone", "щебеночная подготовка под промышленный пол", "m3", Math.round(area * 0.08 * 100) / 100, 1900, "crushed_stone"),
    row("equipment", "industrial_floor_base_compaction", "уплотнение основания виброкатком", "shift", Math.max(1, Math.ceil(area / 700)), 18000),
    row("materials", "industrial_floor_vapor_barrier", "пароизоляция / полиэтиленовая мембрана", "sq_m", Math.round(area * 1.08 * 100) / 100, 55, "vapor_barrier"),
    row("materials", "industrial_floor_dowel_bars", "штырьевые соединения в рабочих швах", "set", Math.max(1, Math.ceil(perimeter / 6)), 850, "dowel_bars"),
    row("materials", "industrial_floor_rebar_mesh", "арматурная сетка промышленного пола", "sq_m", Math.round(area * 1.05 * 100) / 100, 280, "rebar_mesh"),
    row("materials", "industrial_floor_fiber", "фибра для бетонного пола", "kg", Math.round(concreteM3 * 25 * 100) / 100, 160, "fiber"),
    row("materials", "industrial_floor_concrete", "бетон для промышленного пола", "m3", concreteM3, 5600, "concrete"),
    row("materials", "industrial_floor_hardener", "топпинг / упрочнитель поверхности", "kg", Math.round(area * 4.5 * 100) / 100, 75, "dry_shake_hardener"),
    row("materials", "industrial_floor_curing_compound", "состав для ухода за покрытием пола", "sq_m", area, 65, "curing_compound"),
    row("labor", "industrial_floor_rebar_laying", "укладка арматурной сетки и фиксаторов", "sq_m", area, 120),
    row("labor", "industrial_floor_concrete_acceptance", "приемка бетона и контроль подвижности смеси", "m3", concreteM3, 120),
    row("labor", "industrial_floor_concrete_pour", "заливка бетонной плиты промышленного пола", "m3", concreteM3, 720),
    row("equipment", "industrial_floor_pump", "подача бетона / бетононасос", "shift", Math.max(1, Math.ceil(concreteM3 / 80)), 28000),
    row("equipment", "industrial_floor_laser_screed", "виброрейка / лазерный укладчик", "shift", Math.max(1, Math.ceil(area / 1000)), 42000),
    row("labor", "industrial_floor_vibration", "виброуплотнение и протяжка смеси пола", "sq_m", area, 95),
    row("labor", "industrial_floor_hardener_broadcast", "нанесение топпинга по свежему слою пола", "sq_m", area, 140),
    row("equipment", "industrial_floor_power_trowel", "затирочные машины для промышленного пола", "shift", Math.max(1, Math.ceil(area / 600)), 16500),
    row("labor", "industrial_floor_troweling", "затирка и финишная обработка поверхности", "sq_m", area, 160),
    row("labor", "industrial_floor_curing", "уход за покрытием после заливки", "sq_m", area, 45),
    row("labor", "industrial_floor_joint_cutting", "нарезка усадочных швов", "linear_m", Math.round(area / 12 * 100) / 100, 180),
    row("materials", "industrial_floor_joint_sealant", "герметик для швов промышленного пола", "linear_m", Math.round(area / 12 * 100) / 100, 220, "joint_sealant"),
    row("labor", "industrial_floor_joint_sealing", "заполнение и герметизация швов", "linear_m", Math.round(area / 12 * 100) / 100, 160),
    row("labor", "industrial_floor_flatness_control", "контроль ровности и перепадов поверхности", "sq_m", area, 32),
    row("labor", "industrial_floor_strength_protocol", "оформление протокола контроля и сдачи пола", "set", 1, 6500),
    row("delivery", "industrial_floor_material_delivery", "доставка бетона, топпинга и расходников", "trip", Math.max(1, Math.ceil(concreteM3 / 8)), 6200),
    row("delivery", "industrial_floor_cleanup", "уборка и вывоз отходов после устройства пола", "trip", Math.max(1, Math.ceil(area / 1200)), 5200),
    row("materials", "industrial_floor_reserve", "резерв расходных материалов промышленного пола", "set", 1, Math.round(area * 45), "industrial_floor_reserve"),
  ];
}

function buildFallbackRows(plan: EstimatorReasoningPlan): DynamicProfessionalBoqRow[] {
  const quantity = plan.quantities.areaM2 ?? plan.quantities.lengthM ?? plan.quantities.count ?? plan.quantities.powerKw ?? 1;
  const object = userVisibleObjectLabel(plan);
  const measuredUnit = plan.quantities.lengthM ? "linear_m" : plan.quantities.count ? "pcs" : plan.quantities.powerKw ? "set" : "sq_m";
  const unitFor = (
    name: string,
    sectionType: DynamicProfessionalBoqRow["sectionType"],
    fallbackUnit: string,
  ): string => {
    const normalized = name.toLocaleLowerCase("ru-RU");
    if (sectionType === "delivery" && /доставка|вывоз|мобилизац/.test(normalized)) return "trip";
    if (/кран|автовыш|виброплит/.test(normalized)) return "shift";
    if (/доставка|вывоз|мобилизац/.test(normalized)) return "trip";
    if (/стойк|анкер|закладн/.test(normalized) && !/фундамент|бетон/.test(normalized)) return "pcs";
    if (/ферм|балк|связ|раскос|металл|сталь|арматур/.test(normalized) && !/обмер|схем|доставка|окраск|стойк/.test(normalized)) return "kg";
    if (/бетон|фундамент/.test(normalized) && !/монтаж|установ|устройств/.test(normalized)) return "m3";
    if (/бордюр|водосток|прогон|плинтус|труб|кабел|трасс|перил|рельс|забор|огражден|лотк|канал|дренаж/.test(normalized)) return "linear_m";
    if (/двер|окн|стеклопакет|датчик|камера|радиатор|спринклер|панел|насос|котел|бойлер|ступен|розет|светильник|точк|колодц|клапан/.test(normalized)) return "pcs";
    if (sectionType === "equipment") return "set";
    if (sectionType === "delivery") return "trip";
    return fallbackUnit;
  };
  const materialRows = plan.boqPlan.requiredMaterials.map((name, index) =>
    row(
      "materials",
      `material_${index + 1}`,
      name,
      unitFor(name, "materials", index === 0 ? measuredUnit : "set"),
      index === 0 ? quantity : 1,
      650 + index * 180,
      `${plan.semanticFrame.object}_material_${index + 1}`,
    ),
  );
  const laborRows = plan.boqPlan.requiredLabor.map((name, index) =>
    row(
      "labor",
      `labor_${index + 1}`,
      name,
      unitFor(name, "labor", index === plan.boqPlan.requiredLabor.length - 1 ? "set" : measuredUnit),
      index === plan.boqPlan.requiredLabor.length - 1 ? 1 : quantity,
      360 + index * 95,
    ),
  );
  const equipmentRows = plan.boqPlan.requiredEquipmentOrWarnings.map((name, index) =>
    row("equipment", `equipment_${index + 1}`, name, unitFor(name, "equipment", "set"), 1, 2800 + index * 900),
  );
  const logisticsRows = plan.boqPlan.requiredLogisticsOrWarnings.map((name, index) =>
    row("delivery", `logistics_${index + 1}`, name, unitFor(name, "delivery", index === 0 ? "trip" : "set"), 1, 4200 + index * 900),
  );
  const objectSpecificRows = buildFallbackObjectSpecificRows(plan, quantity);
  return [
    row("labor", "survey", `обследование и обмер: ${object}`, "set", 1, 3500),
    row("labor", "layout", `разметка и технологическая привязка: ${object}`, "set", 1, 4500),
    ...materialRows,
    ...objectSpecificRows,
    row("materials", "profile_fasteners", `крепёж и профильные расходники: ${object}`, "set", 1, Math.round(quantity * 55), `${plan.semanticFrame.object}_fasteners`),
    ...laborRows,
    ...equipmentRows,
    ...logisticsRows,
    row("labor", "quality", `контроль качества и приемка: ${object}`, "set", 1, 2500),
    row("materials", "reserve", `резерв профильных материалов: ${object}`, "set", 1, Math.round(quantity * 80), `${plan.semanticFrame.object}_reserve`),
    row("labor", "documentation", `исполнительная фиксация объема: ${object}`, "set", 1, 2000),
  ];
}

function padRows(plan: EstimatorReasoningPlan, rows: DynamicProfessionalBoqRow[]): DynamicProfessionalBoqRow[] {
  const result = [...rows];
  const object = userVisibleObjectLabel(plan);
  let index = 0;
  while (result.length < minimumRows(plan.boqPlan.complexity)) {
    result.push(row(
      index % 4 === 0 ? "labor" : index % 4 === 1 ? "materials" : index % 4 === 2 ? "equipment" : "delivery",
      `assurance_${index + 1}`,
      `контроль сметного объема ${object} ${index + 1}`,
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
  const baseRows =
    object === "passenger_elevator" ? buildElevatorInstallationBoq(plan) :
      object === "drainage_channel" ? buildDrainageChannelBoq(plan) :
          object === "concrete_pedestal" ? buildConcreteElementBoq(plan) :
            object === "low_voltage_system" ? buildLowVoltageCablingRows(plan) :
              object === "solar_power_system" ? buildSolarPowerSystemRows(plan) :
                object === "electrical_network" || object === "ventilation_network" ? buildMepAreaBasedBoq(plan) :
                  object === "metal_canopy" ? buildCanopyRows(plan) :
                    object === "paving_stone" ? buildPavingStoneRows(plan) :
                      object === "roof_system" ? buildGableRoofRows(plan) :
                        object === "floor_covering" ? buildFloorCoveringRows(plan) :
                          object === "waterproofing_surface" && plan.semanticFrame.materialSystem === "roof_waterproofing_system" ? buildRoofWaterproofingRows(plan) :
                            object === "hydropower_turbine" ? buildHydropowerRows(plan) :
                              object === "industrial_floor" ? buildIndustrialFloorRows(plan) :
                                buildFallbackRows(plan);
  const rows = expandInfrastructureBoqRows(plan, baseRows);
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
  const infrastructureValidation = validateInfrastructureBoqDepth(boq);
  const failures = [
    ...validation.failures,
    ...infrastructureValidation.blockers,
  ];
  if (failures.length > 0) {
    throw new Error(`DYNAMIC_PROFESSIONAL_BOQ_INVALID:${failures.join(",")}`);
  }
  return boq;
}

