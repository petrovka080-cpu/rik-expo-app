import type {
  DynamicBoqValidation,
  DynamicProfessionalBoq,
  DynamicProfessionalBoqRow,
  EstimatorKernelComplexity,
  EstimatorReasoningPlan,
} from "../estimatorKernel/estimatorKernelTypes";
import { expandInfrastructureBoqRows } from "../constructionPrimitives/expandInfrastructureBoqRows";
import { validateInfrastructureBoqDepth } from "../constructionPrimitives/validateInfrastructureBoqDepth";
import {
  buildVisibleBoqRowName,
  toVisibleEstimateLabel,
  visibleEstimateLabelViolations,
  visibleObjectLabelForKey,
} from "../../estimatePresentation/visibleEstimateLabelPolicy";
import {
  ELECTRICAL_PROFESSIONAL_BOQ_NORM_METADATA,
  buildElectricalProfessionalBoqV1Rows,
} from "../../estimate/v4/electrical/electricalProfessionalBoqV1";

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
    name: toVisibleEstimateLabel({
      label: normalizeDynamicRowName(name),
      materialKey,
      sectionType,
    }),
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
  acoustic_panel_system: "акустические панели",
  air_conditioning_system: "система кондиционирования",
  concrete_pedestal: "\u0431\u0435\u0442\u043e\u043d\u043d\u044b\u0435 \u0442\u0443\u043c\u0431\u044b",
  bms_automation_system: "BMS автоматика",
  cold_room_system: "холодильная камера",
  demolition_scope: "\u0434\u0435\u043c\u043e\u043d\u0442\u0430\u0436\u043d\u044b\u0435 \u0440\u0430\u0431\u043e\u0442\u044b",
  dock_leveler: "доклевеллер",
  drywall_system: "\u043e\u0431\u043b\u0438\u0446\u043e\u0432\u043a\u0430 \u0441\u0442\u0435\u043d \u0413\u041a\u041b",
  industrial_equipment: "промышленное оборудование",
  industrial_floor: "\u043f\u0440\u043e\u043c\u044b\u0448\u043b\u0435\u043d\u043d\u044b\u0439 \u043f\u043e\u043b",
  masonry_wall: "\u043a\u0438\u0440\u043f\u0438\u0447\u043d\u0430\u044f \u043a\u043b\u0430\u0434\u043a\u0430",
  passenger_elevator: "\u043f\u0430\u0441\u0441\u0430\u0436\u0438\u0440\u0441\u043a\u0438\u0439 \u043b\u0438\u0444\u0442",
  roof_system: "\u043a\u0440\u043e\u0432\u0435\u043b\u044c\u043d\u0430\u044f \u0441\u0438\u0441\u0442\u0435\u043c\u0430",
  sauna_lighting_system: "\u043f\u043e\u0434\u0441\u0432\u0435\u0442\u043a\u0430 \u0441\u0430\u0443\u043d\u044b",
  theatrical_lighting_hanger_system: "\u0441\u0432\u0435\u0442\u043e\u0432\u044b\u0435 \u043f\u043e\u0434\u0432\u0435\u0441\u044b \u0441\u0446\u0435\u043d\u044b",
  salt_room_lighting_system: "\u043f\u043e\u0434\u0441\u0432\u0435\u0442\u043a\u0430 \u0441\u043e\u043b\u044f\u043d\u043e\u0439 \u043a\u043e\u043c\u043d\u0430\u0442\u044b",
  automation_commissioning_system: "\u043f\u0443\u0441\u043a\u043e\u043d\u0430\u043b\u0430\u0434\u043a\u0430 \u0430\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u043a\u0438",
  outdoor_lighting_system: "\u043d\u0430\u0440\u0443\u0436\u043d\u043e\u0435 \u043e\u0441\u0432\u0435\u0449\u0435\u043d\u0438\u0435",
  fountain_lighting_system: "\u043f\u043e\u0434\u0441\u0432\u0435\u0442\u043a\u0430 \u0444\u043e\u043d\u0442\u0430\u043d\u0430",
  fire_pump_station: "\u043f\u043e\u0436\u0430\u0440\u043d\u0430\u044f \u043d\u0430\u0441\u043e\u0441\u043d\u0430\u044f \u0441\u0442\u0430\u043d\u0446\u0438\u044f",
  boiler_automation_system: "\u0430\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u043a\u0430 \u043a\u043e\u0442\u0435\u043b\u044c\u043d\u043e\u0439",
  heat_point_automation_system: "\u0430\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u043a\u0430 \u0418\u0422\u041f",
  entrance_group_automation: "\u0430\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u043a\u0430 \u0432\u0445\u043e\u0434\u043d\u043e\u0439 \u0433\u0440\u0443\u043f\u043f\u044b",
  illuminated_signage: "\u0441\u0432\u0435\u0442\u043e\u0432\u0430\u044f \u0432\u044b\u0432\u0435\u0441\u043a\u0430",
  furniture_lighting_system: "\u043c\u0435\u0431\u0435\u043b\u044c\u043d\u0430\u044f \u043f\u043e\u0434\u0441\u0432\u0435\u0442\u043a\u0430",
  energy_efficiency_lighting_scope: "\u044d\u043d\u0435\u0440\u0433\u043e\u0430\u0443\u0434\u0438\u0442 \u043e\u0441\u0432\u0435\u0449\u0435\u043d\u0438\u044f",
  fire_damper_system: "\u043f\u0440\u043e\u0442\u0438\u0432\u043e\u043f\u043e\u0436\u0430\u0440\u043d\u044b\u0435 \u043a\u043b\u0430\u043f\u0430\u043d\u044b",
  automation_control_cabinet: "\u0448\u043a\u0430\u0444 \u0430\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u043a\u0438",
  pump_automation_control_system: "\u0430\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u043a\u0430 \u043d\u0430\u0441\u043e\u0441\u043d\u043e\u0439",
  temporary_site_lighting: "\u0432\u0440\u0435\u043c\u0435\u043d\u043d\u043e\u0435 \u043e\u0441\u0432\u0435\u0449\u0435\u043d\u0438\u0435 \u0441\u0442\u0440\u043e\u0438\u0442\u0435\u043b\u044c\u043d\u043e\u0433\u043e \u0433\u043e\u0440\u043e\u0434\u043a\u0430",
  greenhouse_climate_control_system: "\u0430\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u043a\u0430 \u043c\u0438\u043a\u0440\u043e\u043a\u043b\u0438\u043c\u0430\u0442\u0430 \u0442\u0435\u043f\u043b\u0438\u0446",
  water_well: "\u0441\u043a\u0432\u0430\u0436\u0438\u043d\u0430",
  smoke_extraction_system: "\u0441\u0438\u0441\u0442\u0435\u043c\u0430 \u0434\u044b\u043c\u043e\u0443\u0434\u0430\u043b\u0435\u043d\u0438\u044f",
  waterproofing_surface: "\u0433\u0438\u0434\u0440\u043e\u0438\u0437\u043e\u043b\u044f\u0446\u0438\u044f",
};

function userVisibleObjectLabel(plan: EstimatorReasoningPlan): string {
  const openWorldLabelPrefix = "open_world_label:";
  if (plan.semanticFrame.materialSystem?.startsWith(openWorldLabelPrefix)) {
    return plan.semanticFrame.materialSystem.slice(openWorldLabelPrefix.length);
  }
  return USER_VISIBLE_OBJECT_LABELS_RU[plan.semanticFrame.object] ?? visibleObjectLabelForKey(plan.semanticFrame.object);
}

function visibleGenericRowContext(plan: EstimatorReasoningPlan): {
  objectKey?: string;
  domainKey: string;
  operationKey: string;
} {
  return {
    objectKey: plan.semanticFrame.object === "metal_canopy" ? undefined : plan.semanticFrame.object,
    domainKey: plan.semanticFrame.domain,
    operationKey: plan.semanticFrame.operation,
  };
}

function visibleGenericObjectLabel(plan: EstimatorReasoningPlan): string {
  const context = visibleGenericRowContext(plan);
  return visibleObjectLabelForKey(context.objectKey ?? context.domainKey);
}

function visibleFastenersRowName(plan: EstimatorReasoningPlan): string {
  return toVisibleEstimateLabel({
    label: `\u041a\u0440\u0435\u043f\u0451\u0436 \u0438 \u043c\u043e\u043d\u0442\u0430\u0436\u043d\u044b\u0435 \u0440\u0430\u0441\u0445\u043e\u0434\u043d\u0438\u043a\u0438: ${visibleGenericObjectLabel(plan)}`,
    sectionType: "materials",
  });
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
  const label = userVisibleObjectLabel(plan).toLocaleLowerCase("ru-RU");
  if (/вывоз.*мусор|мусор/.test(label)) {
    return [
      row("materials", "debris_bags_containers", "мешки/контейнер для строительного мусора", "pcs", Math.max(1, Math.ceil(quantity / 3)), 320, "debris_bags_containers"),
      row("labor", "debris_loading", "погрузка строительного мусора", "ton", Math.max(1, quantity), 850),
      row("equipment", "debris_loading_equipment", "погрузчик / ручная погрузка мусора", "shift", Math.max(1, Math.ceil(quantity / 12)), 6200),
    ];
  }
  if (/доставк.*под[ъь]?[её]м|под[ъь]?[её]м.*материал/.test(label)) {
    return [
      row("labor", "lifting_workers", "грузчики для подъёма материалов", "ton", Math.max(1, quantity), 1400),
      row("equipment", "lifting_rigging_tools", "тележки и такелаж для подъёма материалов", "set", 1, 2200),
    ];
  }
  return [];
}

function elevatorRow(sectionType: DynamicProfessionalBoqRow["sectionType"], code: string, name: string, unit: string, quantity: number, unitPrice: number, materialKey?: string): DynamicProfessionalBoqRow {
  return {
    sectionType,
    code,
    name: toVisibleEstimateLabel({
      label: name,
      materialKey,
      sectionType,
    }),
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
    elevatorRow("labor", "licensed_contractor_coordination", "только лицензированная организация: координация работ", "set", 1, 35000),
    elevatorRow("labor", "permit_package_support", "подготовка пакета для инспекции", "set", 1, 45000),
    elevatorRow("delivery", "storage_protection", "складирование и защита оборудования", "set", 1, 28000),
  ];
}

function drainageRow(sectionType: DynamicProfessionalBoqRow["sectionType"], code: string, name: string, unit: string, quantity: number, unitPrice: number, materialKey?: string): DynamicProfessionalBoqRow {
  return {
    sectionType,
    code,
    name: toVisibleEstimateLabel({
      label: name,
      materialKey,
      sectionType,
    }),
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

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function concreteRow(sectionType: DynamicProfessionalBoqRow["sectionType"], code: string, name: string, unit: string, quantity: number, unitPrice: number, materialKey?: string): DynamicProfessionalBoqRow {
  return {
    sectionType,
    code,
    name: toVisibleEstimateLabel({
      label: name,
      materialKey,
      sectionType,
    }),
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
  const excavation = output(plan, "excavationM3", count * 0.13);
  const cushion = output(plan, "sandGravelM3", count * 0.04);
  const rebar = output(plan, "rebarKg", concrete * 95);
  const anchors = output(plan, "anchorsPcs", count * 4);
  const laborHours = output(plan, "laborManHours", count * 2.2);
  return [
    concreteRow("labor", "survey", "обмер / осмотр", "set", 1, 3500),
    concreteRow("labor", "axis_marking", "разметка осей и мест установки тумб", "pcs", count, 1200),
    concreteRow("labor", "kj_warning", "рабочая схема / КЖ warning", "set", 1, 9500),
    concreteRow("labor", "excavation", "выемка грунта под отдельные тумбы", "m3", excavation, 900),
    concreteRow("labor", "base_leveling", "планировка дна выемок под тумбы", "pcs", count, 340),
    concreteRow("labor", "base_compaction", "уплотнение основания под тумбы", "pcs", count, 420),
    concreteRow("materials", "geotextile_warning", "геотекстиль, если требуется по грунту warning", "sq_m", Math.round(count * 0.36 * 100) / 100, 70, "geotextile"),
    concreteRow("materials", "sand_gravel_cushion", "песчано-щебеночная подушка под тумбы", "m3", cushion, 1900, "sand_gravel_mix"),
    concreteRow("labor", "cushion_install", "устройство песчано-щебеночной подушки", "m3", cushion, 850),
    concreteRow("materials", "concrete", "бетон B20/B25 с запасом для тумб", "m3", concrete, 5600, "concrete"),
    concreteRow("materials", "rebar", "арматура / арматурный каркас тумб", "kg", Math.round(rebar * 100) / 100, 78, "rebar"),
    concreteRow("materials", "tie_wire", "вязальная проволока / фиксаторы защитного слоя", "kg", Math.round(concrete * 2.5 * 100) / 100, 120, "tie_wire"),
    concreteRow("materials", "spacers", "фиксаторы защитного слоя", "pcs", count * 16, 18, "rebar_spacers"),
    concreteRow("materials", "formwork", "опалубка тумб", "sq_m", formwork, 650, "formwork"),
    concreteRow("materials", "formwork_fasteners", "крепёж опалубки", "set", count, 850, "formwork_fasteners"),
    concreteRow("materials", "formwork_release_oil", "\u0441\u043c\u0430\u0437\u043a\u0430 \u043e\u043f\u0430\u043b\u0443\u0431\u043a\u0438", "sq_m", formwork, 45, "formwork_release_oil"),
    concreteRow("materials", "chamfer_strips", "\u0444\u0430\u0441\u043a\u0438 / \u0440\u0435\u0439\u043a\u0438 \u0434\u043b\u044f \u043e\u043f\u0430\u043b\u0443\u0431\u043a\u0438", "linear_m", count * 4, 140, "formwork_chamfer_strips"),
    concreteRow("materials", "anchor_bolts_warning", "закладные детали / анкерные болты warning", "pcs", anchors, 320, "anchor_bolts"),
    concreteRow("labor", "base_preparation", "\u043f\u043e\u0434\u0433\u043e\u0442\u043e\u0432\u043a\u0430 \u043e\u0441\u043d\u043e\u0432\u0430\u043d\u0438\u044f \u043f\u043e\u0434 \u0442\u0443\u043c\u0431\u044b", "sq_m", formwork, 180),
    concreteRow("labor", "rebar_cutting", "\u0440\u0435\u0437\u043a\u0430 \u0438 \u0433\u0438\u0431\u043a\u0430 \u0430\u0440\u043c\u0430\u0442\u0443\u0440\u044b", "kg", Math.round(rebar * 100) / 100, 38),
    concreteRow("labor", "embedded_parts_check", "\u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0430 \u0437\u0430\u043a\u043b\u0430\u0434\u043d\u044b\u0445 \u0434\u0435\u0442\u0430\u043b\u0435\u0439", "pcs", count, 950),
    concreteRow("labor", "rebar_tying", "вязка арматуры тумб", "kg", Math.round(rebar * 100) / 100, 45),
    concreteRow("labor", "formwork_install", "изготовление и установка опалубки тумб", "sq_m", formwork, 420),
    concreteRow("labor", "concrete_acceptance", "приёмка бетона", "m3", concrete, 120),
    concreteRow("labor", "concrete_pour", "подача / укладка бетона / заливка бетона в тумбы", "m3", concrete, 650),
    concreteRow("equipment", "vibration", "вибрирование бетона глубинным вибратором", "m3", concrete, 260),
    concreteRow("labor", "deformwork", "распалубка и зачистка граней тумб", "sq_m", formwork, 210),
    concreteRow("labor", "curing", "уход за бетоном", "m3", concrete, 180),
    concreteRow("labor", "level_control", "контроль геометрии и отметок тумб", "pcs", count, 420),
    concreteRow("labor", "surface_finish", "выравнивание верха тумб по отметке", "pcs", count, 380),
    concreteRow("labor", "backfill_cleanup", "обратная засыпка / зачистка вокруг тумб", "m3", Math.max(0.01, Math.round((excavation - concrete) * 100) / 100), 620),
    concreteRow("equipment", "concrete_pump_warning", "средство подачи бетона к тумбам warning", "m3", concrete, 1800),
    concreteRow("equipment", "scaffold_warning", "леса / подмости warning", "set", 1, 12000),
    concreteRow("equipment", "laser_level", "\u043b\u0430\u0437\u0435\u0440\u043d\u044b\u0439 \u0443\u0440\u043e\u0432\u0435\u043d\u044c", "shift", 1, 1800),
    concreteRow("delivery", "materials_delivery", "доставка материалов для бетонных тумб", "trip", Math.max(1, Math.ceil(concrete / 8)), 6500),
    concreteRow("labor", "handover_scheme", "\u0438\u0441\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044c\u043d\u0430\u044f \u0441\u0445\u0435\u043c\u0430 \u0442\u0443\u043c\u0431", "set", 1, 2500),
    concreteRow("labor", "labor_allowance", "трудозатраты на комплекс тумб", "set", Math.max(1, Math.ceil(laborHours / 8)), 1920),
    concreteRow("delivery", "reserve", "резерв на добор материалов и расходники", "set", 1, Math.round(concrete * 900)),
  ];
}

function mepRow(sectionType: DynamicProfessionalBoqRow["sectionType"], code: string, name: string, unit: string, quantity: number, unitPrice: number, materialKey?: string): DynamicProfessionalBoqRow {
  return {
    sectionType,
    code,
    name: toVisibleEstimateLabel({
      label: name,
      materialKey,
      sectionType,
    }),
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

function buildAirConditioningSystemBoq(plan: EstimatorReasoningPlan): DynamicProfessionalBoqRow[] {
  const area = Math.max(1, plan.quantities.areaM2 ?? output(plan, "areaM2", 1));
  const coolingLoadKw = Math.max(2.5, output(plan, "coolingLoadKw", area * 0.12));
  const indoorUnits = Math.max(1, Math.ceil(output(plan, "indoorUnitsApprox", coolingLoadKw / 5)));
  const outdoorUnits = Math.max(1, Math.ceil(output(plan, "outdoorUnitsApprox", indoorUnits / 4)));
  const refrigerantLineM = Math.max(5, output(plan, "refrigerantLineM", round2(area * 0.45)));
  const condensateDrainM = Math.max(5, output(plan, "condensateDrainM", round2(area * 0.35)));
  const controlCableM = round2(refrigerantLineM * 1.08);
  const powerCableM = round2(area * 0.28);
  const coreDrills = Math.max(indoorUnits, Math.ceil(refrigerantLineM / 18));
  const commissioningZones = Math.max(indoorUnits, Math.ceil(area / 45));

  return [
    mepRow("labor", "hvac_survey", "обследование помещений и тепловых зон кондиционирования", "sq_m", area, 45),
    mepRow("labor", "hvac_cooling_load_check", `проверка предварительной холодопроизводительности ${round2(coolingLoadKw)} кВт`, "set", 1, 8500),
    mepRow("labor", "hvac_zoning_scheme", "схема зон, трасс и мест установки блоков кондиционирования", "set", 1, 12500),
    mepRow("materials", "hvac_indoor_units", "внутренние блоки кондиционирования", "pcs", indoorUnits, 62000, "hvac_indoor_units"),
    mepRow("materials", "hvac_outdoor_units", "наружные блоки кондиционирования", "pcs", outdoorUnits, 185000, "hvac_outdoor_units"),
    mepRow("materials", "hvac_copper_line", "медная фреоновая трасса жидкость/газ", "linear_m", refrigerantLineM, 1450, "hvac_copper_line"),
    mepRow("materials", "hvac_line_insulation", "теплоизоляция медной трассы кондиционирования", "linear_m", refrigerantLineM, 260, "hvac_line_insulation"),
    mepRow("materials", "hvac_condensate_drain", "дренаж конденсата для системы кондиционирования", "linear_m", condensateDrainM, 320, "hvac_condensate_drain"),
    mepRow("materials", "hvac_drain_pumps_warning", "дренажные насосы warning при невозможности самотека", "pcs", Math.max(1, Math.ceil(indoorUnits / 3)), 9800, "hvac_drain_pumps"),
    mepRow("materials", "hvac_wall_brackets", "кронштейны наружных блоков с виброопорами", "pcs", outdoorUnits, 8200, "hvac_wall_brackets"),
    mepRow("materials", "hvac_mounting_frames", "монтажные рамы и площадки под наружные блоки", "pcs", outdoorUnits, 12500, "hvac_mounting_frames"),
    mepRow("materials", "hvac_control_cable", "кабель управления между блоками кондиционирования", "linear_m", controlCableM, 95, "hvac_control_cable"),
    mepRow("materials", "hvac_power_cable", "кабель питания для групп кондиционирования", "linear_m", powerCableM, 135, "hvac_power_cable"),
    mepRow("materials", "hvac_breakers", "автоматы защиты и сервисные выключатели кондиционирования", "pcs", Math.max(outdoorUnits + 1, 2), 1850, "hvac_breakers"),
    mepRow("materials", "hvac_refrigerant", "хладагент для дозаправки после трасс", "kg", Math.max(1, round2(refrigerantLineM * 0.035)), 3200, "hvac_refrigerant"),
    mepRow("materials", "hvac_vibration_mounts", "виброопоры и антивибрационные прокладки", "set", outdoorUnits, 4500, "hvac_vibration_mounts"),
    mepRow("materials", "hvac_consumables", "азот, припой, фитинги и расходники фреоновой трассы", "set", 1, Math.round(refrigerantLineM * 420), "hvac_consumables"),
    mepRow("labor", "hvac_route_marking", "разметка трасс кондиционирования", "sq_m", area, 42),
    mepRow("labor", "hvac_core_drilling", "алмазное бурение проходов под фреоновую трассу", "pcs", coreDrills, 2800),
    mepRow("labor", "hvac_indoor_mounting", "монтаж внутренних блоков кондиционирования", "pcs", indoorUnits, 6800),
    mepRow("labor", "hvac_outdoor_mounting", "монтаж наружных блоков кондиционирования", "pcs", outdoorUnits, 18500),
    mepRow("labor", "hvac_copper_install", "прокладка медных фреоновых трасс", "linear_m", refrigerantLineM, 680),
    mepRow("labor", "hvac_brazing_pressure_test", "пайка, азотная продувка и опрессовка трассы", "linear_m", refrigerantLineM, 420),
    mepRow("labor", "hvac_drain_install", "монтаж дренажа конденсата с уклонами", "linear_m", condensateDrainM, 390),
    mepRow("labor", "hvac_electrical_connection", "подключение питания и межблочного кабеля", "pcs", indoorUnits + outdoorUnits, 2400),
    mepRow("labor", "hvac_vacuuming", "вакуумирование фреонового контура", "circuit", Math.max(1, outdoorUnits), 7600),
    mepRow("labor", "hvac_refrigerant_charge", "дозаправка хладагента и контроль утечек", "circuit", Math.max(1, outdoorUnits), 6200),
    mepRow("labor", "hvac_commissioning", "пусконаладка системы кондиционирования", "zone", commissioningZones, 4800),
    mepRow("labor", "hvac_airflow_temperature_check", "проверка температурного режима по зонам", "zone", commissioningZones, 2600),
    mepRow("equipment", "hvac_vacuum_pump", "вакуумный насос и манометрический коллектор", "shift", Math.max(1, outdoorUnits), 6200),
    mepRow("equipment", "hvac_core_drill", "алмазная установка для проходов трасс", "shift", Math.max(1, Math.ceil(coreDrills / 8)), 8500),
    mepRow("equipment", "hvac_lift_warning", "подъемник / такелаж наружных блоков warning", "shift", Math.max(1, Math.ceil(outdoorUnits / 2)), 18000),
    mepRow("delivery", "hvac_equipment_delivery", "доставка блоков кондиционирования и трассовых материалов", "trip", Math.max(1, Math.ceil((indoorUnits + outdoorUnits) / 8)), 9500),
    mepRow("delivery", "hvac_packaging_cleanup", "вывоз упаковки и расходных остатков после монтажа", "trip", 1, 4200),
    mepRow("labor", "hvac_handover_docs", "исполнительная схема трасс и акт запуска кондиционирования", "set", 1, 6500),
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
    row("materials", "flashing_sealant", "\u0433\u0435\u0440\u043c\u0435\u0442\u0438\u043a \u0438 \u043f\u043b\u0430\u043d\u043a\u0438 \u043f\u0440\u0438\u043c\u044b\u043a\u0430\u043d\u0438\u044f \u043d\u0430\u0432\u0435\u0441\u0430", "linear_m", Math.round(Math.sqrt(area) * 2.4 * 100) / 100, 420, "canopy_flashing"),
    row("materials", "end_caps_trim", "\u0442\u043e\u0440\u0446\u0435\u0432\u044b\u0435 \u0437\u0430\u0433\u043b\u0443\u0448\u043a\u0438 \u0438 \u043d\u0430\u043a\u043b\u0430\u0434\u043a\u0438 \u043d\u0430\u0432\u0435\u0441\u0430", "set", 1, Math.round(area * 75), "canopy_end_caps"),
    row("materials", "drip_edge", "\u043a\u0430\u043f\u0435\u043b\u044c\u043d\u0438\u043a \u0438 \u043e\u0442\u043b\u0438\u0432 \u043f\u043e \u043a\u0440\u043e\u043c\u043a\u0435 \u043d\u0430\u0432\u0435\u0441\u0430", "linear_m", Math.round(Math.sqrt(area) * 2 * 100) / 100, 360, "canopy_drip_edge"),
    row("materials", "gutter", "водосток", "linear_m", Math.round(Math.sqrt(area) * 2 * 100) / 100, 650, "gutter"),
    row("materials", "welding_materials", "\u0441\u0432\u0430\u0440\u043e\u0447\u043d\u044b\u0435 \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b", "set", 1, Math.round(steelKg * 18), "welding"),
    row("materials", "primer", "антикоррозионная грунтовка", "kg", Math.round(steelKg * 0.08 * 100) / 100, 240, "anticorrosion_primer"),
    row("labor", "frame_install", "монтаж металлокаркаса", "kg", steelKg, 85),
    row("labor", "columns_install", "\u043c\u043e\u043d\u0442\u0430\u0436 \u0441\u0442\u043e\u0435\u043a", "pcs", columns, 1800),
    row("labor", "trusses_install", "\u043c\u043e\u043d\u0442\u0430\u0436 \u0444\u0435\u0440\u043c / \u0431\u0430\u043b\u043e\u043a", "kg", Math.round(steelKg * 0.38 * 100) / 100, 42),
    row("labor", "purlins_install", "\u043c\u043e\u043d\u0442\u0430\u0436 \u043f\u0440\u043e\u0433\u043e\u043d\u043e\u0432", "linear_m", Math.round(Math.sqrt(area) * 7 * 100) / 100, 180),
    row("labor", "flashing_install", "\u043c\u043e\u043d\u0442\u0430\u0436 \u043f\u043b\u0430\u043d\u043e\u043a \u043f\u0440\u0438\u043c\u044b\u043a\u0430\u043d\u0438\u044f \u043d\u0430\u0432\u0435\u0441\u0430", "linear_m", Math.round(Math.sqrt(area) * 2.4 * 100) / 100, 260),
    row("labor", "roof_install", "монтаж кровельного покрытия навеса", "sq_m", area, 520),
    row("labor", "primer_labor", "нанесение антикоррозионной грунтовки", "kg", Math.round(steelKg * 0.08 * 100) / 100, 120),
    row("equipment", "crane_lift", "кран / автовышка", "shift", Math.max(1, Math.ceil(area / 300)), 18000),
    row("delivery", "steel_delivery", "\u0434\u043e\u0441\u0442\u0430\u0432\u043a\u0430 \u043c\u0435\u0442\u0430\u043b\u043b\u0430", "trip", Math.max(1, Math.ceil(steelKg / 2500)), 8500),
    row("delivery", "roof_delivery", "доставка кровельного покрытия", "trip", Math.max(1, Math.ceil(area / 300)), 6500),
    row("labor", "handover_scheme", "\u0438\u0441\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044c\u043d\u0430\u044f \u0441\u0445\u0435\u043c\u0430 \u0438 \u043f\u0435\u0440\u0435\u0434\u0430\u0447\u0430 \u0443\u0437\u043b\u043e\u0432 \u043d\u0430\u0432\u0435\u0441\u0430", "set", 1, 4500),
  ];
}

function buildElectricalInstallationRows(plan: EstimatorReasoningPlan): DynamicProfessionalBoqRow[] {
  const parameters = plan.canonicalParameters ?? {};
  const hasParameter = (key: string): boolean =>
    Object.prototype.hasOwnProperty.call(parameters, key);
  const numberParameter = (key: string, fallback = 0): number => {
    const value = parameters[key];
    return typeof value === "number" && Number.isFinite(value) ? value : fallback;
  };
  const booleanParameter = (key: string, fallback: boolean): boolean => {
    const value = parameters[key];
    return typeof value === "boolean" ? value : fallback;
  };
  const stringParameter = (key: string, fallback: string): string => {
    const value = parameters[key];
    return typeof value === "string" && value.trim() ? value : fallback;
  };
  const roundQuantity = (value: number): number => Math.round(value * 1000) / 1000;
  const area = numberParameter("area_m2", plan.quantities.areaM2 ?? 0);
  const routeLength = numberParameter("route_length_m", plan.quantities.lengthM ?? 0);
  const outlets = Math.max(0, Math.round(numberParameter("outlet_count")));
  const switches = Math.max(0, Math.round(numberParameter("switch_count")));
  const lightingPoints = Math.max(0, Math.round(numberParameter("lighting_point_count")));
  const totalPoints = outlets + switches + lightingPoints;
  const lines = Math.max(1, Math.round(numberParameter("line_count", 1)));
  const groups = Math.max(1, Math.round(numberParameter("group_count", 1)));
  const reserveFactor = Math.max(1, numberParameter("cable_reserve_factor", 1));
  const totalCableLength = roundQuantity(routeLength * lines * reserveFactor);
  const powerShare = totalPoints > 0 ? outlets / totalPoints : 1;
  const powerCableLength = roundQuantity(totalCableLength * powerShare);
  const lightingCableLength = roundQuantity(totalCableLength - powerCableLength);
  const workScopeType = stringParameter("work_scope_type", "unspecified");
  const estimatedLoadKw = numberParameter("estimated_load_kw");
  const wiringMethod = stringParameter("wiring_method", "unspecified");
  const containmentType = stringParameter("containment_type", "unspecified");
  const wallMaterial = stringParameter("wall_material", "unspecified");
  const cableType = stringParameter("cable_type", "тип по проекту");
  const cableSection = numberParameter("cable_section_mm2");
  const phaseCount = Math.max(1, Math.round(numberParameter("phase_count", 1)));
  const panelIncluded = booleanParameter("panel_included", true);
  const protectiveDevicesIncluded = booleanParameter("protective_devices_included", true);
  const groundingIncluded = booleanParameter("grounding_included", true);
  const demolitionIncluded = booleanParameter("demolition_included", false);
  const installationHeightM = numberParameter("installation_height_m");
  const accessCondition = stringParameter("access_condition", "unspecified");
  const estimatedLoadKnown =
    hasParameter("estimated_load_kw") &&
    estimatedLoadKw > 0;
  const cableSpecificationKnown =
    hasParameter("cable_type") &&
    hasParameter("cable_section_mm2") &&
    cableSection > 0;
  const containmentKnown = hasParameter("containment_type");
  const wiringMethodKnown = hasParameter("wiring_method");
  const chasingBasisKnown =
    wiringMethodKnown &&
    (wiringMethod === "open" || hasParameter("wall_material"));
  const containmentUnitPrice = containmentType === "tray"
    ? 290
    : containmentType === "cable_channel"
      ? 185
      : containmentType === "conduit"
        ? 220
        : 46;
  const containmentLabel = containmentType === "tray"
    ? "Кабельный лоток по трассе"
    : containmentType === "cable_channel"
      ? "Кабель-канал по трассе"
      : containmentType === "conduit"
        ? "Жёсткая труба по трассе"
        : containmentType === "corrugation"
          ? "Гофрированная труба по трассе"
          : "Система прокладки кабеля: тип требует уточнения";
  const chasingUnitPrice = wiringMethod === "open"
    ? 145
    : wallMaterial === "concrete"
      ? 340
      : wallMaterial === "drywall"
        ? 175
        : 260;
  const cableLabel = cableSection > 0
    ? `${cableType}, сечение ${cableSection} мм²`
    : `${cableType}, сечение требует уточнения`;
  const rows: DynamicProfessionalBoqRow[] = [];
  const push = (
    item: DynamicProfessionalBoqRow,
    quantityFormula: string,
    sourceParameterIds: readonly string[],
  ) => {
    rows.push({
      ...item,
      formulaId: `electrical-canonical:${item.code}:v1`,
      quantityFormula,
      calculationTrace: [
        `calculationVersion=${plan.calculationVersion ?? "electrical-canonical:v1"}`,
        `parameters=${sourceParameterIds.join(",")}`,
        `formula=${quantityFormula}`,
        `result=${item.quantity}`,
        `unit=${item.unit}`,
      ].join("; "),
    });
  };
  const blocked = (
    item: DynamicProfessionalBoqRow,
    blockerIds: readonly string[],
  ): DynamicProfessionalBoqRow => ({
    ...item,
    unitPrice: 0,
    sourcePolicy: "manual_review",
    includedInEstimate: false,
    includedInProcurement: false,
    optional: true,
    editable: true,
    parameterBlockerIds: [...blockerIds],
  });
  const scopeLabel = workScopeType === "new_installation"
    ? "новая электропроводка"
    : workScopeType === "partial_replacement"
      ? "частичная замена электропроводки"
      : workScopeType === "extension"
        ? "расширение существующей электросети"
        : "вид работ требует уточнения";
  push(
    mepRow(
      "labor",
      "electrical_survey",
      `обследование объекта и схема электрики: ${scopeLabel}`,
      "set",
      1,
      7200,
    ),
    "1 объект",
    ["work_scope_type"],
  );
  push(mepRow("labor", "electrical_load_groups", "разбивка розеточных и осветительных групп", "set", 1, 6800), "1 схема групп", ["group_count"]);
  if (area > 0) {
    push(mepRow("labor", "electrical_route_marking", "разметка электрических трасс, розеток, выключателей и освещения", "sq_m", area, 62), "area_m2", ["area_m2"]);
    push(mepRow("labor", "electrical_wall_scanning", "проверка скрытых коммуникаций перед прокладкой", "sq_m", area, 34), "area_m2", ["area_m2", "wall_material"]);
    push(mepRow("labor", "electrical_dust_protection", "защита помещений перед электромонтажом", "sq_m", area, 28), "area_m2", ["area_m2"]);
  }
  if (routeLength > 0) {
    if (powerCableLength > 0) {
      const cableRow = mepRow("materials", "electrical_power_cable", `Кабельные линии розеток: ${cableLabel}`, "linear_m", powerCableLength, 118, "electrical_cable_power");
      push(
        cableSpecificationKnown
          ? cableRow
          : blocked(cableRow, ["cable_type", "cable_section_mm2"]),
        "route_length_m × line_count × cable_reserve_factor × outlet_count / electrical_points_total",
        ["route_length_m", "line_count", "cable_reserve_factor", "outlet_count", "electrical_points_total", "cable_type", "cable_section_mm2"],
      );
    }
    if (lightingCableLength > 0) {
      const cableRow = mepRow("materials", "electrical_lighting_cable", `Кабельные линии освещения и выключателей: ${cableLabel}`, "linear_m", lightingCableLength, 82, "electrical_cable_lighting");
      push(
        cableSpecificationKnown
          ? cableRow
          : blocked(cableRow, ["cable_type", "cable_section_mm2"]),
        "route_length_m × line_count × cable_reserve_factor × (switch_count + lighting_point_count) / electrical_points_total",
        ["route_length_m", "line_count", "cable_reserve_factor", "switch_count", "lighting_point_count", "electrical_points_total", "cable_type", "cable_section_mm2"],
      );
    }
    const containmentRow = mepRow("materials", "electrical_corrugation_channel", containmentLabel, "linear_m", routeLength, containmentUnitPrice, "electrical_containment");
    push(
      containmentKnown
        ? containmentRow
        : blocked(containmentRow, ["containment_type"]),
      "route_length_m",
      ["route_length_m", "wiring_method", "containment_type"],
    );
    if (!(wiringMethod === "open" && containmentType === "cable_channel")) {
      const chasingRow = mepRow("labor", "electrical_chasing_or_channel", wiringMethod === "open" ? `Монтаж открытой системы по трассе: ${containmentLabel}` : wiringMethod === "concealed" ? "Штробление и скрытая прокладка по трассе" : "Прокладка трассы: способ требует уточнения", "linear_m", routeLength, chasingUnitPrice);
      push(
        chasingBasisKnown
          ? chasingRow
          : blocked(chasingRow, wiringMethodKnown ? ["wall_material"] : ["wiring_method"]),
        "route_length_m",
        ["route_length_m", "wiring_method", "containment_type", "wall_material"],
      );
    }
    push(mepRow("labor", "electrical_cable_laying", "Прокладка кабельных линий — прокладка кабеля", "linear_m", totalCableLength, 145), "route_length_m × line_count × cable_reserve_factor", ["route_length_m", "line_count", "cable_reserve_factor"]);
    push(mepRow("labor", "electrical_cable_termination", "Оконцевание и подключение кабельных линий", "pcs", Math.max(2, lines * 2), 540), "line_count × 2", ["line_count"]);
  } else {
    push(
      blocked(
        mepRow(
          "materials",
          "electrical_cable_parameters_required",
          "Кабельные линии розеток: длина трассы, тип и сечение требуют уточнения",
          "linear_m",
          0,
          0,
          "electrical_cable_pending_parameters",
        ),
        [
          "route_length_m",
          "cable_type",
          "cable_section_mm2",
          "line_count",
          "cable_reserve_factor",
        ],
      ),
      "not_calculated_until(route_length_m, cable_type, cable_section_mm2)",
      [
        "route_length_m",
        "cable_type",
        "cable_section_mm2",
        "line_count",
        "cable_reserve_factor",
      ],
    );
    push(
      blocked(
        mepRow(
          "materials",
          "electrical_lighting_cable_parameters_required",
          "Кабельные линии освещения и выключателей: длина трассы, тип и сечение требуют уточнения",
          "linear_m",
          0,
          0,
          "electrical_lighting_cable_pending_parameters",
        ),
        ["route_length_m", "cable_type", "cable_section_mm2", "line_count", "cable_reserve_factor"],
      ),
      "not_calculated_until(route_length_m, cable_type, cable_section_mm2)",
      ["route_length_m", "cable_type", "cable_section_mm2", "line_count", "cable_reserve_factor"],
    );
    push(
      blocked(
        mepRow("materials", "electrical_containment_parameters_required", "Гофра и короб для кабельной трассы: длина и тип системы требуют уточнения", "linear_m", 0, 0, "electrical_containment_pending_parameters"),
        ["route_length_m", "containment_type"],
      ),
      "not_calculated_until(route_length_m, containment_type)",
      ["route_length_m", "containment_type"],
    );
    push(
      blocked(
        mepRow("labor", "electrical_chasing_parameters_required", "Штробление или монтаж открытой трассы: способ прокладки и материал стен требуют уточнения", "linear_m", 0, 0),
        ["route_length_m", "wiring_method", "wall_material"],
      ),
      "not_calculated_until(route_length_m, wiring_method, wall_material)",
      ["route_length_m", "wiring_method", "wall_material"],
    );
    push(
      blocked(
        mepRow("labor", "electrical_cable_laying_parameters_required", "Прокладка кабельных линий — прокладка кабеля: длина трассы и количество линий требуют уточнения", "linear_m", 0, 0),
        ["route_length_m", "line_count", "cable_reserve_factor"],
      ),
      "not_calculated_until(route_length_m, line_count)",
      ["route_length_m", "line_count", "cable_reserve_factor"],
    );
  }
  if (outlets + switches > 0) {
    push(mepRow("materials", "electrical_socket_boxes", "Подрозетники", "pcs", outlets + switches, 72, "socket_boxes"), "outlet_count + switch_count", ["outlet_count", "switch_count"]);
    push(mepRow("labor", "electrical_socket_box_install", "Монтаж подрозетников", "pcs", outlets + switches, 320), "outlet_count + switch_count", ["outlet_count", "switch_count"]);
  }
  if (outlets > 0) {
    push(mepRow("materials", "electrical_outlets", "Розетки", "pcs", outlets, 420, "electrical_outlets"), "outlet_count", ["outlet_count"]);
    push(mepRow("labor", "electrical_outlet_install", "Монтаж розеток", "pcs", outlets, 620), "outlet_count", ["outlet_count"]);
  } else if (!hasParameter("outlet_count")) {
    push(blocked(mepRow("materials", "electrical_outlets_parameters_required", "Розеточные точки: количество розеток требует уточнения", "pcs", 0, 0, "electrical_outlets_pending_count"), ["outlet_count"]), "not_calculated_until(outlet_count)", ["outlet_count"]);
    push(blocked(mepRow("labor", "electrical_outlet_install_parameters_required", "Монтаж розеток: количество требует уточнения", "pcs", 0, 0), ["outlet_count"]), "not_calculated_until(outlet_count)", ["outlet_count"]);
  }
  if (switches > 0) {
    push(mepRow("materials", "electrical_switches", "Выключатели", "pcs", switches, 360, "electrical_switches"), "switch_count", ["switch_count"]);
    push(mepRow("labor", "electrical_switch_install", "Монтаж выключателей", "pcs", switches, 580), "switch_count", ["switch_count"]);
  } else if (!hasParameter("switch_count")) {
    push(blocked(mepRow("materials", "electrical_switches_parameters_required", "Выключатели: количество требует уточнения", "pcs", 0, 0, "electrical_switches_pending_count"), ["switch_count"]), "not_calculated_until(switch_count)", ["switch_count"]);
    push(blocked(mepRow("labor", "electrical_switch_install_parameters_required", "Монтаж выключателей: количество требует уточнения", "pcs", 0, 0), ["switch_count"]), "not_calculated_until(switch_count)", ["switch_count"]);
  }
  if (lightingPoints > 0) {
    push(mepRow("materials", "electrical_lighting_points", "Комплектующие точек освещения и выводов", "pcs", lightingPoints, 350, "electrical_lighting_points"), "lighting_point_count", ["lighting_point_count"]);
    push(mepRow("labor", "electrical_lighting_point_install", "Монтаж точек освещения и выводов", "pcs", lightingPoints, 640), "lighting_point_count", ["lighting_point_count"]);
  } else if (!hasParameter("lighting_point_count")) {
    push(blocked(mepRow("materials", "electrical_lighting_points_parameters_required", "Точки освещения и выводы: количество требует уточнения", "pcs", 0, 0, "electrical_lighting_points_pending_count"), ["lighting_point_count"]), "not_calculated_until(lighting_point_count)", ["lighting_point_count"]);
    push(blocked(mepRow("labor", "electrical_lighting_point_install_parameters_required", "Монтаж точек освещения: количество требует уточнения", "pcs", 0, 0), ["lighting_point_count"]), "not_calculated_until(lighting_point_count)", ["lighting_point_count"]);
  }
  push(mepRow("materials", "electrical_junction_boxes", "Распределительные коробки", "pcs", groups, 260, "junction_boxes"), "group_count", ["group_count"]);
  if (panelIncluded) {
    const loadLabel = estimatedLoadKw > 0
      ? `, расчётная нагрузка ${estimatedLoadKw} кВт`
      : ", нагрузка требует уточнения";
    const panelModules = Math.max(12, (groups + 2) * 2);
    push(mepRow("materials", "electrical_panel", `Корпус распределительного щита на ${panelModules} модулей: ${phaseCount === 3 ? "трёхфазное исполнение" : "однофазное исполнение"}${loadLabel}`, "pcs", 1, phaseCount === 3 ? 22000 : 14000, "electrical_panel"), "panel_included ? 1 : 0", ["panel_included", "phase_count", "estimated_load_kw", "group_count"]);
    push(mepRow("labor", "electrical_panel_mount", "Установка и крепление корпуса распределительного щита", "pcs", 1, phaseCount === 3 ? 12500 : 9800), "panel_included ? 1 : 0", ["panel_included", "phase_count", "group_count"]);
  }
  if (protectiveDevicesIncluded) {
    const protectiveDeviceCount = estimatedLoadKw > 0
      ? Math.max(groups + 2, Math.ceil(estimatedLoadKw / 3.5) + 1)
      : groups + 2;
    push(mepRow("materials", "electrical_breakers", "Автоматические выключатели групповых цепей: номиналы и характеристики по расчёту", "pcs", protectiveDeviceCount, 1200, "electrical_breakers"), "max(group_count + 2, ceil(estimated_load_kw / 3.5) + 1)", ["group_count", "protective_devices_included", "phase_count", "estimated_load_kw"]);
  }
  if (groundingIncluded) {
    push(mepRow("materials", "electrical_ground_bus", "Раздельные шины PE и N распределительного щита", "set", 1, 3800, "electrical_panel_accessories"), "grounding_included ? 1 : 0", ["grounding_included"]);
    push(mepRow("labor", "electrical_grounding_test", "Проверка присоединения вводного PE-проводника к главной защитной шине", "set", 1, 6200), "grounding_included ? 1 : 0", ["grounding_included"]);
  }
  if (demolitionIncluded && routeLength > 0) {
    push(mepRow("labor", "electrical_demolition", "Демонтаж существующей проводки", "linear_m", routeLength, 125), "demolition_included ? route_length_m : 0", ["demolition_included", "route_length_m"]);
    push(mepRow("delivery", "electrical_demolition_waste", "Вывоз демонтированной проводки и мусора", "trip", Math.max(1, Math.ceil(routeLength / 200)), 3800), "ceil(route_length_m / 200)", ["demolition_included", "route_length_m"]);
  }
  push(mepRow("labor", "electrical_junction_box_install", "Монтаж распределительных коробок", "pcs", groups, 520), "group_count", ["group_count"]);
  push(mepRow("labor", "electrical_line_continuity", "Прозвонка линий и проверка цепей", "set", 1, 6800), "1 комплекс", ["line_count"]);
  push(mepRow("labor", "electrical_insulation_test", "Проверка сопротивления изоляции", "set", 1, 9200), "1 комплекс", ["line_count"]);
  push(mepRow("labor", "electrical_group_labeling", "Изготовление и размещение кабельных маркеров отходящих линий", "set", 1, 4200), "1 комплект", ["group_count"]);
  push(mepRow("labor", "electrical_as_built_circuit_schedule", "Исполнительная однолинейная схема электроснабжения", "set", 1, 6800), "1 комплект исполнительной схемы", ["group_count", "phase_count", "panel_included"]);
  if (wiringMethod !== "open") {
    push(mepRow("equipment", "electrical_chaser", "Штроборез и пылеудаление", "shift", Math.max(1, Math.ceil(Math.max(area, routeLength) / 90)), 6800), "max(1, ceil(max(area_m2, route_length_m) / 90))", ["area_m2", "route_length_m", "wiring_method", "wall_material"]);
  }
  if (
    installationHeightM > 2.5 ||
    accessCondition === "restricted" ||
    accessCondition === "height_equipment"
  ) {
    const accessShifts = Math.max(
      1,
      Math.ceil(Math.max(area, routeLength, 1) / (
        accessCondition === "restricted" ? 60 : 120
      )),
    );
    push(
      mepRow(
        "equipment",
        "electrical_access_equipment",
        accessCondition === "height_equipment" || installationHeightM > 2.5
          ? `Вышка / подмости для монтажа на высоте ${installationHeightM || "по месту"} м`
          : "Оборудование для работ в стеснённых условиях",
        "shift",
        accessShifts,
        accessCondition === "restricted" ? 12500 : 18000,
      ),
      "max(1, ceil(max(area_m2, route_length_m) / access_productivity))",
      ["installation_height_m", "access_condition", "area_m2", "route_length_m"],
    );
  }
  for (const specification of buildElectricalProfessionalBoqV1Rows({
    areaM2: area,
    routeLengthM: routeLength,
    totalCableLengthM: totalCableLength,
    outletCount: outlets,
    switchCount: switches,
    lightingPointCount: lightingPoints,
    lineCount: lines,
    groupCount: groups,
    phaseCount,
    panelIncluded,
    protectiveDevicesIncluded,
    groundingIncluded,
    wiringMethod,
    containmentType,
    containmentKnown,
    cableSpecificationKnown,
    estimatedLoadKnown,
  })) {
    const norm = ELECTRICAL_PROFESSIONAL_BOQ_NORM_METADATA[
      specification.normKey
    ];
    const detailedRow: DynamicProfessionalBoqRow = {
      ...mepRow(
        specification.sectionType,
        specification.code,
        specification.name,
        specification.unit,
        specification.quantity,
        specification.unitPrice,
        specification.materialKey,
      ),
      ...norm,
      comment:
        "Electrical professional BOQ scope row; exact norm table, device rating and current rate remain subject to the stated review status.",
    };
    push(
      specification.blockerIds?.length
        ? blocked(detailedRow, specification.blockerIds)
        : detailedRow,
      specification.quantityFormula,
      specification.sourceParameterIds,
    );
  }
  push(mepRow("equipment", "electrical_testing_tools", "Измеритель сопротивления изоляции (мегаомметр)", "set", 1, 5200), "1 комплект", []);
  push(mepRow("delivery", "electrical_material_delivery", "Доставка кабеля, розеток, выключателей и щита", "trip", Math.max(1, Math.ceil(Math.max(area, routeLength) / 140)), 5200), "max(1, ceil(max(area_m2, route_length_m) / 140))", ["area_m2", "route_length_m"]);
  return rows;
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

type UtilitySolarWbsSection = {
  key: string;
  title: string;
  unit: string;
  quantity: number;
  unitPrice: number;
};

function buildUtilitySolarSectionRows(section: UtilitySolarWbsSection): DynamicProfessionalBoqRow[] {
  const quantity = Math.max(0.01, round2(section.quantity));
  const basePrice = section.unitPrice;
  const logisticsTrips = Math.max(1, Math.ceil(quantity / (section.unit === "pcs" ? 180 : section.unit === "linear_m" ? 1200 : section.unit === "sq_m" ? 50000 : 20)));
  return [
    row("labor", `${section.key}_wbs`, `${section.title}: WBS, рабочая схема и ведомость объемов`, section.unit, quantity, Math.round(basePrice * 0.11)),
    row("materials", `${section.key}_main_materials`, `${section.title}: основные материалы и комплектующие`, section.unit, quantity, Math.round(basePrice * 0.52), `solar_utility_${section.key}_materials`),
    row("labor", `${section.key}_installation`, `${section.title}: строительно-монтажные работы`, section.unit, quantity, Math.round(basePrice * 0.24)),
    row("equipment", `${section.key}_equipment`, `${section.title}: техника, инструмент и измерительное оборудование`, section.unit, quantity, Math.round(basePrice * 0.09)),
    row("delivery", `${section.key}_logistics`, `${section.title}: доставка, разгрузка и внутриплощадочная логистика`, "trip", logisticsTrips, Math.max(1, Math.round(basePrice * 0.08))),
    row("labor", `${section.key}_quality`, `${section.title}: контроль качества и исполнительная фиксация`, section.unit, quantity, Math.round(basePrice * 0.07)),
    row("materials", `${section.key}_consumables`, `${section.title}: расходные изделия, маркировка и крепеж`, section.unit, quantity, Math.round(basePrice * 0.05), `solar_utility_${section.key}_consumables`),
  ];
}

function buildUtilitySolarPowerPlantRows(
  powerKw: number,
  panelCount: number,
  roofArea: number,
  dcCableLength: number,
): DynamicProfessionalBoqRow[] {
  const powerMw = Math.max(1, round2(powerKw / 1000));
  const siteAreaM2 = Math.max(roofArea, Math.round(powerMw * 18000));
  const roadLengthM = Math.max(600, Math.round(powerMw * 45));
  const drainageLengthM = Math.max(800, Math.round(powerMw * 60));
  const pileCount = Math.max(1000, Math.ceil(panelCount / 4));
  const inverterCount = Math.max(1, Math.ceil(powerKw / 2500));
  const transformerCount = Math.max(1, Math.ceil(powerKw / 5000));
  const combinerCount = Math.max(1, Math.ceil(panelCount / 360));
  const stringCount = Math.max(1, Math.ceil(panelCount / 28));
  const fenceLengthM = Math.max(1000, Math.round(Math.sqrt(siteAreaM2) * 4.2));
  const groundingLengthM = Math.max(1000, Math.round(powerMw * 120));
  const communicationsLengthM = Math.max(1000, Math.round(powerMw * 80));
  const overheadLineLengthM = Math.max(500, Math.round(powerMw * 35));
  const lightPoleCount = Math.max(60, Math.ceil(fenceLengthM / 55));
  const cctvCount = Math.max(80, Math.ceil(fenceLengthM / 45));
  const earthworksM3 = Math.max(1000, Math.round(siteAreaM2 * 0.08));
  const steelTon = Math.max(120, round2(powerMw * 9.5));
  const sections: UtilitySolarWbsSection[] = [
    { key: "survey", title: "Инженерные изыскания площадки СЭС", unit: "sq_m", quantity: siteAreaM2, unitPrice: 28 },
    { key: "design", title: "Проектирование и рабочая документация СЭС", unit: "set", quantity: Math.max(1, Math.ceil(powerMw / 25)), unitPrice: 1800000 },
    { key: "site_preparation", title: "Подготовка строительной площадки СЭС", unit: "sq_m", quantity: siteAreaM2, unitPrice: 95 },
    { key: "temporary_roads", title: "Временные и постоянные технологические дороги", unit: "linear_m", quantity: roadLengthM, unitPrice: 14500 },
    { key: "drainage", title: "Дренаж и водоотвод площадки", unit: "linear_m", quantity: drainageLengthM, unitPrice: 6800 },
    { key: "earthworks", title: "Земляные работы и планировка рядов", unit: "m3", quantity: earthworksM3, unitPrice: 950 },
    { key: "pile_foundations", title: "Свайные основания под монтажные столы", unit: "pcs", quantity: pileCount, unitPrice: 4200 },
    { key: "concrete_foundations", title: "Бетонные основания КТП и инверторных станций", unit: "m3", quantity: transformerCount * 45 + inverterCount * 12, unitPrice: 8900 },
    { key: "steel_structures", title: "Металлоконструкции опорных систем", unit: "ton", quantity: steelTon, unitPrice: 145000 },
    { key: "tracker_system", title: "Трекеры и узлы ориентации модулей", unit: "pcs", quantity: Math.max(1, Math.ceil(panelCount / 84)), unitPrice: 68000 },
    { key: "pv_modules", title: "Фотоэлектрические модули и раскладка полей", unit: "pcs", quantity: panelCount, unitPrice: 15500 },
    { key: "string_harness", title: "Строки модулей и коммутационные жгуты", unit: "pcs", quantity: stringCount, unitPrice: 17500 },
    { key: "dc_cabling", title: "DC-система кабельных линий", unit: "linear_m", quantity: Math.max(dcCableLength, powerKw * 6.4), unitPrice: 310 },
    { key: "combiner_boxes", title: "Стринговые комбайнеры и DC-защита", unit: "pcs", quantity: combinerCount, unitPrice: 145000 },
    { key: "inverters", title: "Инверторные станции промышленного класса", unit: "pcs", quantity: inverterCount, unitPrice: 9800000 },
    { key: "ac_cabling", title: "AC-система кабельных линий", unit: "linear_m", quantity: Math.max(1000, powerKw * 1.9), unitPrice: 520 },
    { key: "transformer_stations", title: "Комплектные трансформаторные подстанции", unit: "pcs", quantity: transformerCount, unitPrice: 18500000 },
    { key: "main_substation", title: "Главная повышающая подстанция", unit: "set", quantity: 1, unitPrice: 115000000 },
    { key: "overhead_line", title: "ЛЭП присоединения к энергосистеме", unit: "linear_m", quantity: overheadLineLengthM, unitPrice: 42000 },
    { key: "relay_protection", title: "Релейная защита и автоматика", unit: "set", quantity: transformerCount + 1, unitPrice: 2450000 },
    { key: "askue_metering", title: "АСКУЭ и коммерческий учет электроэнергии", unit: "set", quantity: transformerCount + 1, unitPrice: 1850000 },
    { key: "scada", title: "SCADA и диспетчеризация СЭС", unit: "set", quantity: 1, unitPrice: 9500000 },
    { key: "communications", title: "Волоконно-оптическая и слаботочная связь", unit: "linear_m", quantity: communicationsLengthM, unitPrice: 760 },
    { key: "security", title: "Система безопасности, CCTV и периметр", unit: "pcs", quantity: cctvCount, unitPrice: 48000 },
    { key: "fencing", title: "Ограждение промышленной площадки", unit: "linear_m", quantity: fenceLengthM, unitPrice: 3800 },
    { key: "site_lighting", title: "Наружное освещение территории СЭС", unit: "pcs", quantity: lightPoleCount, unitPrice: 68000 },
    { key: "grounding", title: "Заземляющее устройство станции", unit: "linear_m", quantity: groundingLengthM, unitPrice: 1250 },
    { key: "lightning_protection", title: "Молниезащита оборудования и подстанций", unit: "pcs", quantity: Math.max(40, Math.ceil(powerMw * 1.4)), unitPrice: 42000 },
    { key: "testing", title: "Испытания DC, AC и защитных цепей", unit: "set", quantity: Math.max(1, transformerCount), unitPrice: 1450000 },
    { key: "commissioning", title: "Пусконаладка и синхронизация с сетью", unit: "set", quantity: Math.max(1, transformerCount), unitPrice: 2250000 },
    { key: "as_built_docs", title: "Исполнительная документация и паспорта систем", unit: "set", quantity: Math.max(1, Math.ceil(powerMw / 25)), unitPrice: 850000 },
    { key: "spares", title: "Запасные части и аварийный комплект", unit: "set", quantity: Math.max(1, transformerCount), unitPrice: 1750000 },
    { key: "heavy_logistics", title: "Крупногабаритная логистика модулей и КТП", unit: "trip", quantity: Math.max(20, Math.ceil(panelCount / 1800) + transformerCount * 3), unitPrice: 145000 },
    { key: "temporary_infrastructure", title: "Временная инфраструктура стройгородка", unit: "set", quantity: Math.max(1, Math.ceil(powerMw / 50)), unitPrice: 3200000 },
    { key: "land_restoration", title: "Восстановление территории после строительства", unit: "sq_m", quantity: Math.round(siteAreaM2 * 0.35), unitPrice: 85 },
  ];
  return sections.flatMap(buildUtilitySolarSectionRows);
}

function buildSolarPowerSystemRows(plan: EstimatorReasoningPlan): DynamicProfessionalBoqRow[] {
  const powerKw = Math.max(1, plan.quantities.powerKw ?? 30);
  const panelCount = Math.max(4, Math.ceil(powerKw / 0.55));
  const roofArea = Math.round(panelCount * 2.4 * 100) / 100;
  const dcCableLength = Math.round(powerKw * 5.2 * 100) / 100;
  const baseRows = [
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
  if (powerKw < 1000) return baseRows;
  return [
    ...baseRows,
    ...buildUtilitySolarPowerPlantRows(powerKw, panelCount, roofArea, dcCableLength),
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
    row("labor", "leak_test", "проверка герметичности и контроль протечек", "set", 1, 5500),
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
    row("materials", "spare_fasteners", "комплект ЗИП и крепежа турбины ГЭС", "set", 1, power * 950, "hydro_spare_fasteners"),
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

function buildFoundationSystemRows(plan: EstimatorReasoningPlan): DynamicProfessionalBoqRow[] {
  const widthM = Math.max(0.2, plan.quantities.widthM ?? 0.4);
  const lengthM = Math.max(
    1,
    plan.quantities.lengthM ?? (
      plan.quantities.areaM2 != null && widthM > 0
        ? plan.quantities.areaM2 / widthM
        : 1
    ),
  );
  const heightM = Math.max(0.3, plan.quantities.heightM ?? 1.2);
  const baseAreaM2 = round2(lengthM * (widthM + 0.2));
  const concreteM3 = round2(lengthM * widthM * heightM);
  const excavationM3 = round2(lengthM * (widthM + 0.4) * (heightM + 0.2));
  const cushionM3 = round2(baseAreaM2 * 0.1);
  const formworkM2 = round2(lengthM * heightM * 2);
  const waterproofingM2 = round2(formworkM2 * 1.05);
  const rebarKg = round2(concreteM3 * 110);
  const stirrupsKg = round2(concreteM3 * 35);
  const tieWireKg = Math.max(1, round2((rebarKg + stirrupsKg) * 0.015));
  const spacers = Math.max(16, Math.ceil(lengthM * 4));
  const backfillM3 = Math.max(0.01, round2(excavationM3 - concreteM3 - cushionM3 * 2));
  const deliveryTrips = Math.max(1, Math.ceil(concreteM3 / 8));
  const leanConcreteM3 = Math.max(0.05, round2(baseAreaM2 * 0.05));
  const protectionMembraneM2 = Math.max(0.1, round2(waterproofingM2 * 1.04));
  const anchorBolts = Math.max(8, Math.ceil(lengthM / 2));
  const embeddedParts = Math.max(4, Math.ceil(lengthM / 6));

  return [
    row("labor", "foundation_survey", "обмер и проверка осей ленточного фундамента", "set", 1, 3500),
    row("labor", "axis_layout", "разметка осей ленточного фундамента", "set", 1, round2(lengthM * 120)),
    row("labor", "trench_excavation", "выемка грунта под ленту фундамента", "m3", excavationM3, 900),
    row("labor", "trench_bottom_trim", "планировка дна траншеи", "sq_m", baseAreaM2, 140),
    row("labor", "base_compaction", "уплотнение основания под фундамент", "sq_m", baseAreaM2, 180),
    row("materials", "geotextile", "геотекстиль под основание фундамента", "sq_m", round2(baseAreaM2 * 1.08), 70, "foundation_geotextile"),
    row("labor", "geotextile_lay", "укладка геотекстиля под основание", "sq_m", baseAreaM2, 60),
    row("materials", "sand_cushion", "песчаная подушка фундамента", "m3", cushionM3, 1550, "foundation_sand"),
    row("labor", "sand_cushion_install", "устройство песчаной подушки", "m3", cushionM3, 850),
    row("materials", "crushed_stone_base", "щебеночное основание фундамента", "m3", cushionM3, 1900, "foundation_crushed_stone"),
    row("labor", "crushed_stone_install", "устройство щебеночного основания", "m3", cushionM3, 920),
    row("materials", "formwork_panels", "опалубка ленточного фундамента", "sq_m", formworkM2, 650, "foundation_formwork"),
    row("materials", "formwork_fasteners", "крепеж опалубки фундамента", "set", 1, Math.round(formworkM2 * 95), "foundation_formwork_fasteners"),
    row("materials", "formwork_release_oil", "смазка опалубки фундамента", "sq_m", formworkM2, 45, "foundation_formwork_release_oil"),
    row("labor", "formwork_install", "монтаж опалубки ленточного фундамента", "sq_m", formworkM2, 420),
    row("materials", "longitudinal_rebar", "продольная арматура фундамента", "kg", rebarKg, 78, "foundation_rebar"),
    row("materials", "stirrups_rebar", "хомуты и поперечная арматура фундамента", "kg", stirrupsKg, 82, "foundation_stirrups_rebar"),
    row("materials", "tie_wire", "вязальная проволока для арматуры фундамента", "kg", tieWireKg, 120, "foundation_tie_wire"),
    row("materials", "rebar_spacers", "фиксаторы защитного слоя арматуры", "pcs", spacers, 18, "foundation_rebar_spacers"),
    row("labor", "rebar_cut_bend", "резка и гибка арматуры фундамента", "kg", round2(rebarKg + stirrupsKg), 38),
    row("labor", "rebar_tying", "вязка арматурного каркаса фундамента", "kg", round2(rebarKg + stirrupsKg), 45),
    row("materials", "concrete", "бетон фундамента B20/B25 для ленточного основания", "m3", concreteM3, 5600, "foundation_concrete"),
    row("labor", "concrete_acceptance", "приемка бетона на объекте", "m3", concreteM3, 120),
    row("labor", "concrete_pour", "заливка бетона в ленту фундамента", "m3", concreteM3, 650),
    row("equipment", "concrete_vibration", "вибрирование бетона глубинным вибратором", "m3", concreteM3, 260),
    row("materials", "curing_compound", "материалы для ухода за бетоном фундамента", "sq_m", round2(lengthM * widthM), 65, "foundation_curing_compound"),
    row("labor", "curing", "уход за бетоном фундамента", "sq_m", round2(lengthM * widthM), 95),
    row("materials", "waterproofing_primer", "праймер поверхности фундамента", "sq_m", waterproofingM2, 80, "foundation_waterproofing_primer"),
    row("materials", "waterproofing_material", "гидроизоляция фундамента", "sq_m", waterproofingM2, 560, "foundation_waterproofing_material"),
    row("labor", "waterproofing_install", "нанесение или монтаж гидроизоляции фундамента", "sq_m", waterproofingM2, 360),
    row("labor", "backfill", "обратная засыпка пазух фундамента", "m3", backfillM3, 620),
    row("equipment", "excavator", "экскаватор требуется уточнение для разработки траншеи", "shift", Math.max(1, Math.ceil(excavationM3 / 80)), 14500),
    row("equipment", "concrete_pump", "бетононасос или средство подачи бетона", "shift", Math.max(1, Math.ceil(concreteM3 / 60)), 28000),
    row("delivery", "concrete_delivery", "доставка бетона миксерами", "trip", deliveryTrips, 6500),
    row("delivery", "materials_delivery", "доставка арматуры, опалубки и гидроизоляции", "trip", Math.max(1, Math.ceil(lengthM / 80)), 6500),
    row("delivery", "soil_removal", "вывоз лишнего грунта", "trip", Math.max(1, Math.ceil(Math.max(0.01, excavationM3 - backfillM3) / 8)), 5500),
    row("labor", "foundation_benchmark", "геодезическая разбивочная основа и реперы фундамента", "set", 1, 7800),
    row("equipment", "laser_level", "лазерный нивелир и измерительная оснастка для фундамента", "shift", Math.max(1, Math.ceil(lengthM / 120)), 3800),
    row("labor", "trench_dewatering", "водоотлив и осушение траншеи перед бетонированием", "shift", Math.max(1, Math.ceil(excavationM3 / 90)), 5200),
    row("equipment", "dewatering_pump", "дренажный насос для водоотлива траншеи", "shift", Math.max(1, Math.ceil(excavationM3 / 90)), 4600),
    row(
      "labor",
      "trench_shoring",
      "локальное крепление откосов и безопасная организация траншеи",
      "sq_m",
      formworkM2,
      round2((lengthM * 180) / formworkM2),
    ),
    row("materials", "lean_concrete", "подбетонка B7.5 под ленту фундамента", "m3", leanConcreteM3, 4200, "foundation_lean_concrete"),
    row("labor", "lean_concrete_install", "устройство подбетонки под ленту фундамента", "m3", leanConcreteM3, 950),
    row("labor", "formwork_alignment", "выверка, распорки и фиксация опалубки перед приемкой", "sq_m", formworkM2, 120),
    row("labor", "formwork_stripping", "распалубка ленты фундамента после набора прочности", "sq_m", formworkM2, 210),
    row("materials", "embedded_parts", "закладные детали фундамента по исполнительной схеме", "pcs", embeddedParts, 2400, "foundation_embedded_parts"),
    row("labor", "embedded_parts_install", "установка и выверка закладных деталей фундамента", "pcs", embeddedParts, 980),
    row("materials", "anchor_bolts", "анкерные болты и гайки для надземных конструкций", "pcs", anchorBolts, 520, "foundation_anchor_bolts"),
    row("labor", "anchor_bolts_install", "установка анкерных болтов по шаблону", "pcs", anchorBolts, 420),
    row("labor", "rebar_inspection", "приемка армокаркаса, защитного слоя и нахлестов", "kg", round2(rebarKg + stirrupsKg), 12),
    row("labor", "concrete_slump_test", "контроль подвижности бетонной смеси на площадке", "m3", concreteM3, 95),
    row("labor", "concrete_cube_samples", "отбор контрольных образцов бетона для испытаний", "set", Math.max(1, Math.ceil(concreteM3 / 50)), 6200),
    row("materials", "waterproofing_protection_membrane", "защитная мембрана гидроизоляции фундамента", "sq_m", protectionMembraneM2, 180, "foundation_waterproofing_protection"),
    row("labor", "waterproofing_protection_install", "монтаж защиты гидроизоляции перед обратной засыпкой", "sq_m", protectionMembraneM2, 220),
    row("labor", "backfill_compaction_test", "послойная проверка уплотнения обратной засыпки", "m3", backfillM3, 85),
    row("delivery", "waste_loading", "погрузка остатков грунта и строительных отходов фундамента", "m3", Math.max(0.01, round2(excavationM3 - backfillM3)), 260),
    row("labor", "as_built_photo_register", "исполнительная фотофиксация скрытых работ фундамента", "set", 1, 5200),
    row("labor", "quality_control", "контроль геометрии, защитного слоя и отметок", "set", 1, 6500),
    row("labor", "handover_scheme", "исполнительная схема фундамента", "set", 1, 4500),
  ];
}

function buildFenceSystemRows(plan: EstimatorReasoningPlan): DynamicProfessionalBoqRow[] {
  const lengthM = Math.max(1, plan.quantities.lengthM ?? 1);
  const heightM = Math.max(1.2, plan.quantities.heightM ?? 2);
  const postStepM = 2.5;
  const posts = Math.ceil(lengthM / postStepM) + 1;
  const panelAreaM2 = Math.round(lengthM * heightM * 1.06 * 100) / 100;
  const railLengthM = Math.round(lengthM * 2 * 1.03 * 100) / 100;
  const concreteM3 = Math.round(posts * 0.055 * 100) / 100;
  const screws = Math.ceil(panelAreaM2 * 8);

  return [
    row("labor", "fence_route_survey", "обследование трассы забора и отметок рельефа", "linear_m", lengthM, 95),
    row("labor", "fence_line_layout", "разметка линии забора и осей столбов", "linear_m", lengthM, 110),
    row("labor", "fence_strip_clearing", "подготовка полосы монтажа забора", "linear_m", lengthM, 85),
    row("labor", "post_hole_drilling", "бурение лунок под металлические столбы забора", "pcs", posts, 520),
    row("materials", "fence_posts", "металлические столбы забора", "pcs", posts, 1850, "fence_posts"),
    row("materials", "post_concrete", "бетон для бетонирования столбов забора", "m3", concreteM3, 5600, "ready_mix_concrete"),
    row("materials", "horizontal_rails", "горизонтальные лаги забора из профильной трубы", "linear_m", railLengthM, 320, "fence_rails"),
    row("materials", "profile_sheet_panels", "панели / профнастил оцинкованный для секций забора", "sq_m", panelAreaM2, 620, "profile_sheet"),
    row("materials", "profile_sheet_fasteners", "саморезы и крепеж профлиста забора", "pcs", screws, 12, "fence_fasteners"),
    row("materials", "post_caps", "заглушки и защитные колпаки столбов забора", "pcs", posts, 95, "fence_post_caps"),
    row("labor", "post_installation", "установка и выверка металлических столбов забора", "pcs", posts, 680),
    row("labor", "rail_welding", "монтаж и сварка горизонтальных лаг забора", "linear_m", railLengthM, 210),
    row("labor", "profile_sheet_install", "монтаж профлиста на каркас забора", "sq_m", panelAreaM2, 420),
    row("labor", "cut_edges_treatment", "обработка резов и антикоррозионная защита узлов забора", "set", 1, Math.round(lengthM * 55)),
    row("equipment", "motor_auger", "бур / мотобур для бурения лунок под столбы", "shift", Math.max(1, Math.ceil(posts / 35)), 5200),
    row("equipment", "welding_equipment", "сварочное оборудование для лаг забора", "shift", Math.max(1, Math.ceil(lengthM / 80)), 4800),
    row("delivery", "fence_material_delivery", "доставка профлиста, столбов и лаг забора", "trip", Math.max(1, Math.ceil(lengthM / 120)), 6500),
    row("delivery", "fence_soil_removal", "вывоз грунта после бурения лунок забора", "trip", Math.max(1, Math.ceil(posts / 45)), 3800),
    row("labor", "fence_handover", "исполнительная схема линии забора и приемка креплений", "set", 1, 4500),
  ];
}

function buildFallbackRows(plan: EstimatorReasoningPlan): DynamicProfessionalBoqRow[] {
  const quantity = plan.quantities.areaM2 ?? plan.quantities.lengthM ?? plan.quantities.count ?? plan.quantities.powerKw ?? plan.quantities.massTon ?? 1;
  const object = userVisibleObjectLabel(plan);
  const measuredUnit = plan.quantities.lengthM ? "linear_m" : plan.quantities.count ? "pcs" : plan.quantities.powerKw ? "set" : plan.quantities.massTon ? "ton" : "sq_m";
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
  const genericRowContext = visibleGenericRowContext(plan);
  return [
    row("labor", "survey", `обследование и обмер: ${object}`, "set", 1, 3500),
    row("labor", "layout", `разметка и технологическая привязка: ${object}`, "set", 1, 4500),
    ...materialRows,
    ...objectSpecificRows,
    row(
      "materials",
      "profile_fasteners",
      visibleFastenersRowName(plan),
      "set",
      1,
      Math.round(quantity * 55),
      `${plan.semanticFrame.object}_fasteners`,
    ),
    ...laborRows,
    ...equipmentRows,
    ...logisticsRows,
    row(
      "materials",
      "reserve",
      buildVisibleBoqRowName({
        sectionType: "materials",
        ...genericRowContext,
        index: 2,
      }),
      "set",
      1,
      Math.round(quantity * 80),
      `${plan.semanticFrame.object}_reserve`,
    ),
  ];
}

function normalizedRequiredRowToken(value: string): string {
  return value
    .toLocaleLowerCase("ru-RU")
    .replace(/\bwarning\b/g, "")
    .replace(/требуется уточнение/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function requiredRowWords(value: string): string[] {
  return normalizedRequiredRowToken(value)
    .split(/[^\p{L}\p{N}]+/gu)
    .filter((word) => word.length >= 3);
}

function requiredWordMatchesVisibleWord(requiredWord: string, visibleWord: string): boolean {
  if (requiredWord === visibleWord) return true;
  if (
    requiredWord.length >= 3 &&
    (visibleWord.includes(requiredWord) || requiredWord.includes(visibleWord))
  ) {
    return true;
  }
  const sharedPrefixLength = Math.min(requiredWord.length, visibleWord.length, 4);
  return sharedPrefixLength === 4 &&
    requiredWord.slice(0, sharedPrefixLength) === visibleWord.slice(0, sharedPrefixLength);
}

function requiredRowNameIsVisible(requiredName: string, visibleName: string): boolean {
  const normalizedVisibleName = normalizedRequiredRowToken(visibleName);
  const visibleWords = requiredRowWords(visibleName);
  return requiredName
    .split("/")
    .map(normalizedRequiredRowToken)
    .filter(Boolean)
    .some((alternative) => {
      if (normalizedVisibleName.includes(alternative)) return true;
      const requiredWords = requiredRowWords(alternative);
      return requiredWords.length > 0 && requiredWords.every((requiredWord) =>
        visibleWords.some((visibleWord) => requiredWordMatchesVisibleWord(requiredWord, visibleWord))
      );
    });
}

function ensureRequiredPlanRows(
  plan: EstimatorReasoningPlan,
  rows: DynamicProfessionalBoqRow[],
): DynamicProfessionalBoqRow[] {
  const fallbackRows = buildFallbackRows(plan);
  const existingCodes = new Set(rows.map((item) => item.code));
  const result = [...rows];
  const requirements: {
    sectionType: DynamicProfessionalBoqRow["sectionType"];
    names: string[];
    fallbackCodePrefix: string;
  }[] = [
    { sectionType: "materials", names: plan.boqPlan.requiredMaterials, fallbackCodePrefix: "material" },
    { sectionType: "labor", names: plan.boqPlan.requiredLabor, fallbackCodePrefix: "labor" },
    { sectionType: "equipment", names: plan.boqPlan.requiredEquipmentOrWarnings, fallbackCodePrefix: "equipment" },
    { sectionType: "delivery", names: plan.boqPlan.requiredLogisticsOrWarnings, fallbackCodePrefix: "logistics" },
  ];

  for (const requirement of requirements) {
    for (const [requiredIndex, requiredName] of requirement.names.entries()) {
      const alreadyVisible = result.some((item) =>
        item.sectionType === requirement.sectionType &&
        requiredRowNameIsVisible(requiredName, item.name),
      );
      if (alreadyVisible) continue;
      const fallback = fallbackRows.find((item) =>
        item.sectionType === requirement.sectionType &&
        item.code === `${requirement.fallbackCodePrefix}_${requiredIndex + 1}`,
      );
      if (!fallback) continue;
      let code = `required_plan_${fallback.code}`;
      let suffix = 2;
      while (existingCodes.has(code)) {
        code = `required_plan_${fallback.code}_${suffix}`;
        suffix += 1;
      }
      existingCodes.add(code);
      result.push({
        ...fallback,
        code,
        name: requiredName.replace(/\bwarning\b/gi, "требуется уточнение"),
        rateKey: `dynamic_universal_${code}`,
      });
    }
  }
  return result;
}

function padRows(plan: EstimatorReasoningPlan, rows: DynamicProfessionalBoqRow[]): DynamicProfessionalBoqRow[] {
  if (plan.workKey === "electrical_area_installation") {
    return rows;
  }
  const result = [...rows];
  const genericRowContext = visibleGenericRowContext(plan);
  let index = 0;
  while (result.length < minimumRows(plan.boqPlan.complexity)) {
    const sectionType = index % 4 === 0 ? "labor" : index % 4 === 1 ? "materials" : index % 4 === 2 ? "equipment" : "delivery";
    result.push(row(
      sectionType,
      `assurance_${index + 1}`,
      buildVisibleBoqRowName({
        sectionType,
        ...genericRowContext,
        index,
      }),
      "set",
      1,
      1200 + index * 120,
      sectionType === "materials" ? `${plan.semanticFrame.object}_assurance` : undefined,
    ));
    index += 1;
  }
  return result;
}

export function validateDynamicProfessionalBoq(boq: DynamicProfessionalBoq): DynamicBoqValidation {
  const failures: string[] = [];
  const minimum = boq.plan.workKey === "electrical_area_installation"
    ? 1
    : minimumRows(boq.plan.boqPlan.complexity);
  if (boq.rows.length < minimum) failures.push(`row_depth:${boq.rows.length}/${minimum}`);
  const requiredRows: {
    sectionType: DynamicProfessionalBoqRow["sectionType"];
    names: string[];
  }[] = boq.plan.workKey === "electrical_area_installation"
    ? []
    : [
        { sectionType: "materials", names: boq.plan.boqPlan.requiredMaterials },
        { sectionType: "labor", names: boq.plan.boqPlan.requiredLabor },
        { sectionType: "equipment", names: boq.plan.boqPlan.requiredEquipmentOrWarnings },
        { sectionType: "delivery", names: boq.plan.boqPlan.requiredLogisticsOrWarnings },
      ];
  for (const requirement of requiredRows) {
    requirement.names.forEach((requiredName, index) => {
      const found = boq.rows.some((item) =>
        item.sectionType === requirement.sectionType &&
        requiredRowNameIsVisible(requiredName, item.name),
      );
      if (!found) {
        failures.push(`required_plan_row_missing:${requirement.sectionType}:${index + 1}`);
      }
    });
  }
  for (const rowItem of boq.rows) {
    const normalized = rowItem.name.trim().toLocaleLowerCase("ru-RU");
    const isBlockedConditionalRow =
      rowItem.includedInEstimate === false &&
      rowItem.sourcePolicy === "manual_review" &&
      Boolean(rowItem.parameterBlockerIds?.length);
    if (forbiddenStandalone.has(normalized)) failures.push(`weak_generic:${rowItem.code}`);
    const visibleFailures = visibleEstimateLabelViolations(rowItem.name);
    if (visibleFailures.length > 0) failures.push(`visible_label_policy:${rowItem.code}:${visibleFailures.join("|")}`);
    if (!Number.isFinite(rowItem.quantity) || (rowItem.quantity <= 0 && !isBlockedConditionalRow)) failures.push(`quantity_invalid:${rowItem.code}`);
    if (!Number.isFinite(rowItem.unitPrice) || (rowItem.unitPrice <= 0 && !isBlockedConditionalRow)) failures.push(`unit_price_invalid:${rowItem.code}`);
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
                object === "air_conditioning_system" ? buildAirConditioningSystemBoq(plan) :
                  object === "electrical_network" || object === "ventilation_network" ? buildMepAreaBasedBoq(plan) :
                  object === "metal_canopy" ? buildCanopyRows(plan) :
                    object === "paving_stone" ? buildPavingStoneRows(plan) :
                      object === "roof_system" ? buildGableRoofRows(plan) :
                        object === "floor_covering" ? buildFloorCoveringRows(plan) :
                          object === "waterproofing_surface" && plan.semanticFrame.materialSystem === "roof_waterproofing_system" ? buildRoofWaterproofingRows(plan) :
                            object === "hydropower_turbine" ? buildHydropowerRows(plan) :
                              object === "industrial_floor" ? buildIndustrialFloorRows(plan) :
                                object === "foundation_system" ? buildFoundationSystemRows(plan) :
                                  object === "fence_system" ? buildFenceSystemRows(plan) :
                                buildFallbackRows(plan);
  const expandedRows = plan.workKey === "electrical_area_installation"
    ? baseRows
    : expandInfrastructureBoqRows(plan, baseRows);
  const rows = plan.workKey === "electrical_area_installation"
    ? expandedRows
    : ensureRequiredPlanRows(plan, expandedRows);
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
    clarifyingQuestions: [
      ...plan.boqPlan.clarifyingQuestions,
      `Исполнительную фиксацию объема по объекту "${userVisibleObjectLabel(plan)}" оформите как подтверждающий документ, не как платную строку сметы.`,
    ],
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
