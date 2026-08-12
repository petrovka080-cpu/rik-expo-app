import type {
  ProfessionalAssemblyParameterDefinitionV4,
  ProfessionalAssemblyParameterRoleV4,
  ProfessionalAssemblyRowDefinitionV4,
  ProfessionalChildAssemblyV4,
  ProfessionalEstimateScopeModeV4,
} from "../professionalProjectAssemblyV4";

const FULL: readonly ProfessionalEstimateScopeModeV4[] = ["FULL_APPLICABLE_SCOPE"];
const BOTH: readonly ProfessionalEstimateScopeModeV4[] = ["MINIMAL_EXPLICIT_SCOPE", "FULL_APPLICABLE_SCOPE"];

function parameter(
  parameterId: string,
  titleRu: string,
  role: ProfessionalAssemblyParameterRoleV4,
  unitId: string | null,
  requiredFor: readonly ProfessionalEstimateScopeModeV4[] = FULL,
): ProfessionalAssemblyParameterDefinitionV4 {
  return { parameter_id: parameterId, title_ru: titleRu, role, unit_id: unitId, required_for: requiredFor };
}

function row(input: Omit<ProfessionalAssemblyRowDefinitionV4, "formula"> & {
  formulaId: string;
  expression: string;
  inputs: readonly string[];
  unitId: string;
  calculate: (values: Readonly<Record<string, number>>) => number;
}): ProfessionalAssemblyRowDefinitionV4 {
  return {
    row_id: input.row_id,
    section: input.section,
    category: input.category,
    title_ru: input.title_ru,
    formula: {
      formula_id: input.formulaId,
      expression: input.expression,
      input_parameter_ids: input.inputs,
      output_unit_id: input.unitId,
      calculate: input.calculate,
    },
    cost_ownership: input.cost_ownership,
    cost_owner_id: input.cost_owner_id,
    semantic_owner: input.semantic_owner,
    normative_source_ids: input.normative_source_ids,
    inclusion_condition: input.inclusion_condition,
    procurement_eligible: input.procurement_eligible,
  };
}

const projectRow = (
  id: string,
  section: string,
  category: ProfessionalAssemblyRowDefinitionV4["category"],
  titleRu: string,
  parameterId: string,
  unitId: string,
  owner: string,
  procurement = false,
): ProfessionalAssemblyRowDefinitionV4 => row({
  row_id: id,
  section,
  category,
  title_ru: titleRu,
  formulaId: `${id}:formula:v1`,
  expression: parameterId,
  inputs: [parameterId],
  unitId,
  calculate: (values) => values[parameterId],
  cost_ownership: category === "work" ? "informational_output" : "priced_resource",
  cost_owner_id: owner,
  semantic_owner: owner,
  normative_source_ids: ["project_quantity_inputs_v4"],
  inclusion_condition: "typed child assembly selected and project quantity confirmed",
  procurement_eligible: procurement,
});

function rateRow(input: {
  id: string;
  section: string;
  category: "work" | "material" | "labor" | "machinery" | "testing";
  titleRu: string;
  basisId: string;
  basisUnit: string;
  rateId: string;
  rateUnit: string;
  outputUnit: string;
  operation: "multiply" | "divide" | "ceil_divide";
  owner: string;
  procurement?: boolean;
  sourceIds: readonly string[];
}): ProfessionalAssemblyRowDefinitionV4 {
  const expression = input.operation === "multiply"
    ? `${input.basisId} * ${input.rateId}`
    : input.operation === "divide"
      ? `${input.basisId} / ${input.rateId}`
      : `ceil(${input.basisId} / ${input.rateId})`;
  return row({
    row_id: input.id,
    section: input.section,
    category: input.category,
    title_ru: input.titleRu,
    formulaId: `${input.id}:formula:v1`,
    expression,
    inputs: [input.basisId, input.rateId],
    unitId: input.outputUnit,
    calculate: (values) => input.operation === "multiply"
      ? values[input.basisId] * values[input.rateId]
      : input.operation === "divide"
        ? values[input.basisId] / values[input.rateId]
        : Math.ceil(values[input.basisId] / values[input.rateId]),
    cost_ownership: "priced_resource",
    cost_owner_id: input.owner,
    semantic_owner: input.owner,
    normative_source_ids: input.sourceIds,
    inclusion_condition: `explicit ${input.basisId} and verified ${input.rateId}`,
    procurement_eligible: input.procurement === true,
  });
}

const curbParameters = [
  parameter("curb_required", "Включить бортовой камень", "SCOPE_TRIGGER", null),
  parameter("curb_length_m", "Проектная длина бортового камня", "PROJECT_QUANTITY", "m"),
  parameter("curb_bedding_concrete_m3_per_m", "Расход бетона подготовки на 1 м бордюра", "NORM_RATE", "m3_m"),
  parameter("curb_haunch_concrete_m3_per_m", "Расход бетона обоймы на 1 м бордюра", "NORM_RATE", "m3_m"),
  parameter("curb_joint_material_kg_per_m", "Расход материала швов на 1 м бордюра", "NORM_RATE", "kg_m"),
  parameter("curb_installation_m_per_man_hour", "Нормативная производительность труда при установке бордюра", "NORM_RATE", "m_man_hour"),
  parameter("curb_excavator_m_per_machine_hour", "Производительность экскаватора на бордюрной траншее", "NORM_RATE", "m_machine_hour"),
  parameter("curb_compactor_m_per_machine_hour", "Производительность уплотняющей машины бордюрного узла", "NORM_RATE", "m_machine_hour"),
] as const;

const CURB_ASSEMBLY: ProfessionalChildAssemblyV4 = {
  child_passport_id: "professional-estimate-passport:v4:road-curb-installation",
  child_passport_version: "4.1.0",
  domain_owner: "site_improvement",
  assembly_id: "typed-child:road-curb-installation:v1",
  title_ru: "Бортовой камень с подготовкой и ресурсами",
  scope_trigger_parameter: "curb_required",
  scope_trigger_values: [true],
  supported_scope_modes: FULL,
  parameters: curbParameters,
  rows: [
    projectRow("curb:stone", "Бортовой камень", "material", "Бортовой камень проектного типа", "curb_length_m", "m", "curb:stone", true),
    rateRow({ id: "curb:bedding_concrete", section: "Бортовой камень", category: "material", titleRu: "Бетон подготовки под бортовой камень", basisId: "curb_length_m", basisUnit: "m", rateId: "curb_bedding_concrete_m3_per_m", rateUnit: "m3_m", outputUnit: "m3", operation: "multiply", owner: "curb:bedding_concrete", procurement: true, sourceIds: ["kg_krer_2015_collection_27"] }),
    rateRow({ id: "curb:haunch_concrete", section: "Бортовой камень", category: "material", titleRu: "Бетон обоймы бортового камня", basisId: "curb_length_m", basisUnit: "m", rateId: "curb_haunch_concrete_m3_per_m", rateUnit: "m3_m", outputUnit: "m3", operation: "multiply", owner: "curb:haunch_concrete", procurement: true, sourceIds: ["kg_krer_2015_collection_27"] }),
    rateRow({ id: "curb:joint_material", section: "Бортовой камень", category: "material", titleRu: "Материал заполнения и герметизации швов", basisId: "curb_length_m", basisUnit: "m", rateId: "curb_joint_material_kg_per_m", rateUnit: "kg_m", outputUnit: "kg", operation: "multiply", owner: "curb:joint_material", procurement: true, sourceIds: ["project_technical_specification"] }),
    projectRow("curb:installation_output", "Бортовой камень", "work", "Установка бортового камня по проектным отметкам", "curb_length_m", "m", "curb:installation_output"),
    rateRow({ id: "curb:labor", section: "Труд", category: "labor", titleRu: "Труд звена установки бортового камня", basisId: "curb_length_m", basisUnit: "m", rateId: "curb_installation_m_per_man_hour", rateUnit: "m_man_hour", outputUnit: "man_hour", operation: "divide", owner: "curb:labor", sourceIds: ["kg_krer_2015_collection_27"] }),
    rateRow({ id: "curb:excavator", section: "Машины", category: "machinery", titleRu: "Экскаватор для бордюрной траншеи", basisId: "curb_length_m", basisUnit: "m", rateId: "curb_excavator_m_per_machine_hour", rateUnit: "m_machine_hour", outputUnit: "machine_hour", operation: "divide", owner: "curb:excavator", sourceIds: ["verified_equipment_productivity"] }),
    rateRow({ id: "curb:compactor", section: "Машины", category: "machinery", titleRu: "Уплотняющая машина бордюрного узла", basisId: "curb_length_m", basisUnit: "m", rateId: "curb_compactor_m_per_machine_hour", rateUnit: "m_machine_hour", outputUnit: "machine_hour", operation: "divide", owner: "curb:compactor", sourceIds: ["verified_equipment_productivity"] }),
  ],
};

const drainageParameters = [
  parameter("drainage_required", "Включить водоотвод", "SCOPE_TRIGGER", null),
  parameter("drainage_length_m", "Проектная длина линейного водоотвода", "PROJECT_QUANTITY", "m"),
  parameter("drainage_inlet_count", "Количество дождеприёмников", "PROJECT_QUANTITY", "pcs"),
  parameter("drainage_pipe_length_m", "Длина трубопровода водоотвода", "PROJECT_QUANTITY", "m"),
  parameter("drainage_bedding_m3_per_m", "Расход подготовки на 1 м водоотвода", "NORM_RATE", "m3_m"),
  parameter("drainage_excavation_m3_per_m", "Объём разработки траншеи на 1 м", "NORM_RATE", "m3_m"),
  parameter("drainage_installation_m_per_man_hour", "Производительность труда монтажа водоотвода", "NORM_RATE", "m_man_hour"),
  parameter("drainage_excavator_m3_per_machine_hour", "Производительность экскаватора на траншее", "NORM_RATE", "m3_machine_hour"),
] as const;

const DRAINAGE_ASSEMBLY: ProfessionalChildAssemblyV4 = {
  child_passport_id: "professional-estimate-passport:v4:surface-drainage",
  child_passport_version: "4.1.0",
  domain_owner: "water_supply_sewerage",
  assembly_id: "typed-child:surface-drainage:v1",
  title_ru: "Линейный и точечный поверхностный водоотвод",
  scope_trigger_parameter: "drainage_required",
  scope_trigger_values: [true],
  supported_scope_modes: FULL,
  parameters: drainageParameters,
  rows: [
    projectRow("drainage:channel", "Водоотвод", "material", "Лотки или каналы водоотвода проектного типа", "drainage_length_m", "m", "drainage:channel", true),
    projectRow("drainage:inlets", "Водоотвод", "material", "Дождеприёмники проектного типа", "drainage_inlet_count", "pcs", "drainage:inlets", true),
    projectRow("drainage:pipe", "Водоотвод", "material", "Трубы подключения дождеприёмников", "drainage_pipe_length_m", "m", "drainage:pipe", true),
    rateRow({ id: "drainage:bedding", section: "Водоотвод", category: "material", titleRu: "Материал подготовки под элементы водоотвода", basisId: "drainage_length_m", basisUnit: "m", rateId: "drainage_bedding_m3_per_m", rateUnit: "m3_m", outputUnit: "m3", operation: "multiply", owner: "drainage:bedding", procurement: true, sourceIds: ["project_drainage_detail"] }),
    rateRow({ id: "drainage:excavation", section: "Водоотвод", category: "work", titleRu: "Разработка траншей водоотвода", basisId: "drainage_length_m", basisUnit: "m", rateId: "drainage_excavation_m3_per_m", rateUnit: "m3_m", outputUnit: "m3", operation: "multiply", owner: "drainage:excavation", sourceIds: ["project_drainage_profile"] }),
    projectRow("drainage:installation_output", "Водоотвод", "work", "Монтаж и сопряжение элементов водоотвода", "drainage_length_m", "m", "drainage:installation_output"),
    rateRow({ id: "drainage:labor", section: "Труд", category: "labor", titleRu: "Труд монтажного звена водоотвода", basisId: "drainage_length_m", basisUnit: "m", rateId: "drainage_installation_m_per_man_hour", rateUnit: "m_man_hour", outputUnit: "man_hour", operation: "divide", owner: "drainage:labor", sourceIds: ["kg_krer_2015_collection_27"] }),
    row({ row_id: "drainage:excavator", section: "Машины", category: "machinery", title_ru: "Экскаватор на траншеях водоотвода", formulaId: "drainage:excavator:formula:v1", expression: "drainage_length_m * drainage_excavation_m3_per_m / drainage_excavator_m3_per_machine_hour", inputs: ["drainage_length_m", "drainage_excavation_m3_per_m", "drainage_excavator_m3_per_machine_hour"], unitId: "machine_hour", calculate: (v) => v.drainage_length_m * v.drainage_excavation_m3_per_m / v.drainage_excavator_m3_per_machine_hour, cost_ownership: "priced_resource", cost_owner_id: "drainage:excavator", semantic_owner: "drainage:excavator", normative_source_ids: ["verified_equipment_productivity"], inclusion_condition: "explicit trench volume and verified excavator productivity", procurement_eligible: false }),
  ],
};

const MARKING_ASSEMBLY: ProfessionalChildAssemblyV4 = {
  child_passport_id: "professional-estimate-passport:v4:road-marking",
  child_passport_version: "4.1.0",
  domain_owner: "road_safety",
  assembly_id: "typed-child:road-marking:v1",
  title_ru: "Дорожная разметка и световозвращающие материалы",
  scope_trigger_parameter: "marking_required",
  scope_trigger_values: [true],
  supported_scope_modes: FULL,
  parameters: [
    parameter("marking_required", "Включить разметку", "SCOPE_TRIGGER", null),
    parameter("marking_area_m2", "Проектная площадь разметки", "PROJECT_QUANTITY", "m2"),
    parameter("marking_material_rate_kg_m2", "Расход материала разметки", "NORM_RATE", "kg_m2"),
    parameter("marking_glass_beads_rate_kg_m2", "Расход стеклошариков", "NORM_RATE", "kg_m2"),
    parameter("marking_productivity_m2_per_man_hour", "Производительность труда разметочного звена", "NORM_RATE", "m2_man_hour"),
    parameter("marking_machine_productivity_m2_per_machine_hour", "Производительность разметочной машины", "NORM_RATE", "m2_machine_hour"),
  ],
  rows: [
    rateRow({ id: "marking:compound", section: "Разметка", category: "material", titleRu: "Материал дорожной разметки проектного типа", basisId: "marking_area_m2", basisUnit: "m2", rateId: "marking_material_rate_kg_m2", rateUnit: "kg_m2", outputUnit: "kg", operation: "multiply", owner: "marking:compound", procurement: true, sourceIds: ["project_marking_specification", "eaeu_tr_ts_014_2011"] }),
    rateRow({ id: "marking:beads", section: "Разметка", category: "material", titleRu: "Световозвращающие стеклошарики", basisId: "marking_area_m2", basisUnit: "m2", rateId: "marking_glass_beads_rate_kg_m2", rateUnit: "kg_m2", outputUnit: "kg", operation: "multiply", owner: "marking:beads", procurement: true, sourceIds: ["project_marking_specification", "eaeu_tr_ts_014_2011"] }),
    projectRow("marking:application_output", "Разметка", "work", "Нанесение дорожной разметки по ПОДД", "marking_area_m2", "m2", "marking:application_output"),
    rateRow({ id: "marking:labor", section: "Труд", category: "labor", titleRu: "Труд разметочного звена", basisId: "marking_area_m2", basisUnit: "m2", rateId: "marking_productivity_m2_per_man_hour", rateUnit: "m2_man_hour", outputUnit: "man_hour", operation: "divide", owner: "marking:labor", sourceIds: ["verified_ratebook:road_marking"] }),
    rateRow({ id: "marking:machine", section: "Машины", category: "machinery", titleRu: "Разметочная машина", basisId: "marking_area_m2", basisUnit: "m2", rateId: "marking_machine_productivity_m2_per_machine_hour", rateUnit: "m2_machine_hour", outputUnit: "machine_hour", operation: "divide", owner: "marking:machine", sourceIds: ["verified_equipment_productivity"] }),
  ],
};

const SIGN_ASSEMBLY: ProfessionalChildAssemblyV4 = {
  child_passport_id: "professional-estimate-passport:v4:traffic-signs",
  child_passport_version: "4.1.0",
  domain_owner: "road_safety",
  assembly_id: "typed-child:traffic-signs:v1",
  title_ru: "Дорожные знаки, стойки и основания",
  scope_trigger_parameter: "signing_required",
  scope_trigger_values: [true],
  supported_scope_modes: FULL,
  parameters: [
    parameter("signing_required", "Включить дорожные знаки", "SCOPE_TRIGGER", null),
    parameter("sign_count", "Количество знаков по проекту организации движения", "PROJECT_QUANTITY", "pcs"),
    parameter("sign_post_count", "Количество стоек знаков", "PROJECT_QUANTITY", "pcs"),
    parameter("sign_foundation_concrete_m3_per_post", "Расход бетона фундамента на стойку", "NORM_RATE", "m3_pcs"),
    parameter("sign_installation_pcs_per_man_hour", "Производительность труда монтажа знаков", "NORM_RATE", "pcs_man_hour"),
    parameter("sign_drill_pcs_per_machine_hour", "Производительность буровой установки", "NORM_RATE", "pcs_machine_hour"),
  ],
  rows: [
    projectRow("sign:panel", "Знаки", "material", "Щиты дорожных знаков проектных типоразмеров", "sign_count", "pcs", "sign:panel", true),
    projectRow("sign:post", "Знаки", "material", "Стойки дорожных знаков", "sign_post_count", "pcs", "sign:post", true),
    rateRow({ id: "sign:foundation_concrete", section: "Знаки", category: "material", titleRu: "Бетон фундаментов стоек знаков", basisId: "sign_post_count", basisUnit: "pcs", rateId: "sign_foundation_concrete_m3_per_post", rateUnit: "m3_pcs", outputUnit: "m3", operation: "multiply", owner: "sign:foundation", procurement: true, sourceIds: ["project_sign_foundation_detail"] }),
    projectRow("sign:installation_output", "Знаки", "work", "Монтаж дорожных знаков по ПОДД", "sign_count", "pcs", "sign:installation_output"),
    rateRow({ id: "sign:labor", section: "Труд", category: "labor", titleRu: "Труд звена монтажа дорожных знаков", basisId: "sign_count", basisUnit: "pcs", rateId: "sign_installation_pcs_per_man_hour", rateUnit: "pcs_man_hour", outputUnit: "man_hour", operation: "divide", owner: "sign:labor", sourceIds: ["verified_ratebook:traffic_signs"] }),
    rateRow({ id: "sign:drill", section: "Машины", category: "machinery", titleRu: "Буровая машина для фундаментов стоек", basisId: "sign_post_count", basisUnit: "pcs", rateId: "sign_drill_pcs_per_machine_hour", rateUnit: "pcs_machine_hour", outputUnit: "machine_hour", operation: "divide", owner: "sign:drill", sourceIds: ["verified_equipment_productivity"] }),
  ],
};

const LIGHTING_ASSEMBLY: ProfessionalChildAssemblyV4 = {
  child_passport_id: "professional-estimate-passport:v4:outdoor-lighting",
  child_passport_version: "4.1.0",
  domain_owner: "electrical",
  assembly_id: "typed-child:outdoor-lighting:v1",
  title_ru: "Наружное освещение, кабельные линии и заземление",
  scope_trigger_parameter: "lighting_required",
  scope_trigger_values: [true],
  supported_scope_modes: FULL,
  parameters: [
    parameter("lighting_required", "Включить наружное освещение", "SCOPE_TRIGGER", null),
    parameter("lighting_pole_count", "Количество опор освещения", "PROJECT_QUANTITY", "pcs"),
    parameter("lighting_luminaire_count", "Количество светильников", "PROJECT_QUANTITY", "pcs"),
    parameter("lighting_cable_length_m", "Длина кабельной линии", "PROJECT_QUANTITY", "m"),
    parameter("lighting_cabinet_count", "Количество шкафов управления", "PROJECT_QUANTITY", "pcs"),
    parameter("lighting_foundation_concrete_m3", "Проектный объём бетона фундаментов опор", "PROJECT_QUANTITY", "m3"),
    parameter("lighting_earthing_conductor_length_m", "Длина заземляющего проводника", "PROJECT_QUANTITY", "m"),
    parameter("lighting_labor_man_hours", "Трудозатраты электромонтажного звена по норме/ППР", "NORM_RATE", "man_hour"),
    parameter("lighting_crane_machine_hours", "Машино-часы автокрана по норме/ППР", "NORM_RATE", "machine_hour"),
    parameter("lighting_test_count", "Количество электрических измерений и испытаний", "CONTROL_PLAN_VALUE", "test"),
  ],
  rows: [
    projectRow("lighting:poles", "Освещение", "equipment", "Опоры наружного освещения", "lighting_pole_count", "pcs", "lighting:poles", true),
    projectRow("lighting:luminaires", "Освещение", "equipment", "Светильники наружного освещения", "lighting_luminaire_count", "pcs", "lighting:luminaires", true),
    projectRow("lighting:cable", "Освещение", "material", "Силовой кабель проектной марки", "lighting_cable_length_m", "m", "lighting:cable", true),
    projectRow("lighting:cabinets", "Освещение", "equipment", "Шкафы управления освещением", "lighting_cabinet_count", "pcs", "lighting:cabinets", true),
    projectRow("lighting:foundation_concrete", "Освещение", "material", "Бетон фундаментов опор освещения", "lighting_foundation_concrete_m3", "m3", "lighting:foundation", true),
    projectRow("lighting:earthing", "Освещение", "material", "Заземляющий проводник", "lighting_earthing_conductor_length_m", "m", "lighting:earthing", true),
    projectRow("lighting:installation_output", "Освещение", "work", "Монтаж и подключение системы наружного освещения", "lighting_pole_count", "pcs", "lighting:installation_output"),
    projectRow("lighting:labor", "Труд", "labor", "Труд электромонтажного звена", "lighting_labor_man_hours", "man_hour", "lighting:labor"),
    projectRow("lighting:crane", "Машины", "machinery", "Автокран для установки опор", "lighting_crane_machine_hours", "machine_hour", "lighting:crane"),
    projectRow("lighting:tests", "Испытания", "testing", "Измерение сопротивления изоляции и заземления", "lighting_test_count", "test", "lighting:tests"),
  ],
};

const PARKING_GEOMETRY_ASSEMBLY: ProfessionalChildAssemblyV4 = {
  child_passport_id: "professional-estimate-passport:v4:parking-geometry-and-manoeuvring",
  child_passport_version: "4.1.0",
  domain_owner: "site_improvement",
  assembly_id: "typed-child:parking-geometry-and-manoeuvring:v1",
  title_ru: "Разбивка машино-мест, маневровых проездов и въездов-выездов парковки",
  scope_trigger_parameter: "parking_geometry_required",
  scope_trigger_values: [true],
  supported_scope_modes: FULL,
  parameters: [
    parameter("parking_geometry_required", "Включить проектную геометрию парковки", "SCOPE_TRIGGER", null),
    parameter("area_m2", "Площадь парковки", "PROJECT_QUANTITY", "m2"),
    parameter("parking_space_count", "Количество машино-мест по проекту", "PROJECT_QUANTITY", "pcs"),
    parameter("parking_aisle_length_m", "Длина маневровых проездов по проекту", "PROJECT_QUANTITY", "m"),
    parameter("parking_entry_exit_count", "Количество въездов-выездов по проекту", "PROJECT_QUANTITY", "pcs"),
    parameter("parking_layout_consumable_kg_per_space", "Расход разбивочного материала на машино-место", "NORM_RATE", "kg_pcs"),
    parameter("parking_layout_productivity_space_per_man_hour", "Производительность разбивочного звена", "NORM_RATE", "pcs_man_hour"),
    parameter("parking_survey_productivity_space_per_machine_hour", "Производительность геодезического прибора", "NORM_RATE", "pcs_machine_hour"),
    parameter("parking_geometry_control_interval_m2_per_test", "Площадь парковки на один контроль геометрии", "CONTROL_PLAN_VALUE", "m2_test"),
  ],
  rows: [
    rateRow({ id: "parking_geometry:layout_consumable", section: "Геометрия парковки", category: "material", titleRu: "Разбивочный материал парковочных мест и маневровых проездов", basisId: "parking_space_count", basisUnit: "pcs", rateId: "parking_layout_consumable_kg_per_space", rateUnit: "kg_pcs", outputUnit: "kg", operation: "multiply", owner: "parking_geometry:layout_consumable", procurement: true, sourceIds: ["project_parking_layout"] }),
    projectRow("parking_geometry:bay_setting_out", "Геометрия парковки", "work", "Разбивка машино-мест по проектной схеме", "parking_space_count", "pcs", "parking_geometry:bay_setting_out"),
    projectRow("parking_geometry:aisle_setting_out", "Геометрия парковки", "work", "Разбивка маневровых проездов", "parking_aisle_length_m", "m", "parking_geometry:aisle_setting_out"),
    projectRow("parking_geometry:entry_exit_setting_out", "Геометрия парковки", "work", "Разбивка и проверка сопряжений въездов-выездов", "parking_entry_exit_count", "pcs", "parking_geometry:entry_exit_setting_out"),
    rateRow({ id: "parking_geometry:layout_labor", section: "Труд", category: "labor", titleRu: "Труд разбивочного звена парковки", basisId: "parking_space_count", basisUnit: "pcs", rateId: "parking_layout_productivity_space_per_man_hour", rateUnit: "pcs_man_hour", outputUnit: "man_hour", operation: "divide", owner: "parking_geometry:layout_labor", sourceIds: ["project_parking_work_plan"] }),
    rateRow({ id: "parking_geometry:survey_instrument", section: "Машины", category: "machinery", titleRu: "Геодезический прибор для разбивки парковки", basisId: "parking_space_count", basisUnit: "pcs", rateId: "parking_survey_productivity_space_per_machine_hour", rateUnit: "pcs_machine_hour", outputUnit: "machine_hour", operation: "divide", owner: "parking_geometry:survey_instrument", sourceIds: ["project_parking_work_plan"] }),
    rateRow({ id: "parking_geometry:control_lots", section: "Контроль качества", category: "testing", titleRu: "Контроль размеров мест, проездов и уклонов парковки", basisId: "area_m2", basisUnit: "m2", rateId: "parking_geometry_control_interval_m2_per_test", rateUnit: "m2_test", outputUnit: "test", operation: "ceil_divide", owner: "parking_geometry:control_lots", sourceIds: ["project_parking_quality_control_plan"] }),
    projectRow("parking_geometry:sightline_acceptance", "Контроль качества", "testing", "Проверка обзорности и безопасности маневров на въездах-выездах", "parking_entry_exit_count", "test", "parking_geometry:sightline_acceptance"),
  ],
};

const ACCESSIBLE_PARKING_ASSEMBLY: ProfessionalChildAssemblyV4 = {
  child_passport_id: "professional-estimate-passport:v4:accessible-parking",
  child_passport_version: "4.1.0",
  domain_owner: "site_improvement",
  assembly_id: "typed-child:accessible-parking:v1",
  title_ru: "Доступные парковочные места, знаки и самостоятельная разметка",
  scope_trigger_parameter: "accessible_parking_required",
  scope_trigger_values: [true],
  supported_scope_modes: FULL,
  parameters: [
    parameter("accessible_parking_required", "Включить доступные парковочные места", "SCOPE_TRIGGER", null),
    parameter("accessible_space_count", "Количество доступных парковочных мест", "PROJECT_QUANTITY", "pcs"),
    parameter("accessible_sign_count", "Количество знаков доступной парковки", "PROJECT_QUANTITY", "pcs"),
    parameter("accessible_sign_post_count", "Количество стоек знаков доступной парковки", "PROJECT_QUANTITY", "pcs"),
    parameter("accessible_sign_foundation_concrete_m3_per_post", "Расход бетона фундамента на стойку", "NORM_RATE", "m3_pcs"),
    parameter("accessible_symbol_area_m2", "Площадь символов и зон доступной парковки", "PROJECT_QUANTITY", "m2"),
    parameter("accessible_symbol_compound_kg_m2", "Расход материала специальной разметки", "NORM_RATE", "kg_m2"),
    parameter("accessible_symbol_beads_kg_m2", "Расход стеклошариков специальной разметки", "NORM_RATE", "kg_m2"),
    parameter("accessible_marking_productivity_m2_per_man_hour", "Производительность труда специальной разметки", "NORM_RATE", "m2_man_hour"),
    parameter("accessible_sign_installation_pcs_per_man_hour", "Производительность монтажа знаков доступной парковки", "NORM_RATE", "pcs_man_hour"),
    parameter("accessible_sign_drill_pcs_per_machine_hour", "Производительность буровой машины", "NORM_RATE", "pcs_machine_hour"),
    parameter("accessible_marking_machine_productivity_m2_per_machine_hour", "Производительность разметочной машины", "NORM_RATE", "m2_machine_hour"),
  ],
  rows: [
    projectRow("accessible:sign_panel", "Доступная парковка", "material", "Знаки обозначения доступных парковочных мест", "accessible_sign_count", "pcs", "accessible:sign_panel", true),
    projectRow("accessible:sign_post", "Доступная парковка", "material", "Стойки знаков доступной парковки", "accessible_sign_post_count", "pcs", "accessible:sign_post", true),
    rateRow({ id: "accessible:sign_foundation", section: "Доступная парковка", category: "material", titleRu: "Бетон фундаментов стоек знаков доступной парковки", basisId: "accessible_sign_post_count", basisUnit: "pcs", rateId: "accessible_sign_foundation_concrete_m3_per_post", rateUnit: "m3_pcs", outputUnit: "m3", operation: "multiply", owner: "accessible:sign_foundation", procurement: true, sourceIds: ["project_accessible_parking_detail", "kg_sn_parkings_2018"] }),
    rateRow({ id: "accessible:marking_compound", section: "Доступная парковка", category: "material", titleRu: "Материал символов и зон доступной парковки", basisId: "accessible_symbol_area_m2", basisUnit: "m2", rateId: "accessible_symbol_compound_kg_m2", rateUnit: "kg_m2", outputUnit: "kg", operation: "multiply", owner: "accessible:marking_compound", procurement: true, sourceIds: ["project_accessible_parking_marking_schedule", "kg_krer_2015_collection_27"] }),
    rateRow({ id: "accessible:marking_beads", section: "Доступная парковка", category: "material", titleRu: "Световозвращающие стеклошарики специальной разметки", basisId: "accessible_symbol_area_m2", basisUnit: "m2", rateId: "accessible_symbol_beads_kg_m2", rateUnit: "kg_m2", outputUnit: "kg", operation: "multiply", owner: "accessible:marking_beads", procurement: true, sourceIds: ["project_accessible_parking_marking_schedule", "kg_krer_2015_collection_27"] }),
    projectRow("accessible:space_designation", "Доступная парковка", "work", "Устройство и обозначение доступных парковочных мест", "accessible_space_count", "pcs", "accessible:space_designation"),
    projectRow("accessible:marking_output", "Доступная парковка", "work", "Нанесение символов и зон доступной парковки", "accessible_symbol_area_m2", "m2", "accessible:marking_output"),
    rateRow({ id: "accessible:marking_labor", section: "Труд", category: "labor", titleRu: "Труд звена специальной разметки", basisId: "accessible_symbol_area_m2", basisUnit: "m2", rateId: "accessible_marking_productivity_m2_per_man_hour", rateUnit: "m2_man_hour", outputUnit: "man_hour", operation: "divide", owner: "accessible:marking_labor", sourceIds: ["kg_krer_2015_collection_27"] }),
    rateRow({ id: "accessible:sign_labor", section: "Труд", category: "labor", titleRu: "Труд монтажа знаков доступной парковки", basisId: "accessible_sign_count", basisUnit: "pcs", rateId: "accessible_sign_installation_pcs_per_man_hour", rateUnit: "pcs_man_hour", outputUnit: "man_hour", operation: "divide", owner: "accessible:sign_labor", sourceIds: ["kg_krer_2015_collection_27"] }),
    rateRow({ id: "accessible:sign_drill", section: "Машины", category: "machinery", titleRu: "Буровая машина для стоек доступной парковки", basisId: "accessible_sign_post_count", basisUnit: "pcs", rateId: "accessible_sign_drill_pcs_per_machine_hour", rateUnit: "pcs_machine_hour", outputUnit: "machine_hour", operation: "divide", owner: "accessible:sign_drill", sourceIds: ["kg_krer_2015_collection_27"] }),
    rateRow({ id: "accessible:marking_machine", section: "Машины", category: "machinery", titleRu: "Разметочная машина для символов доступной парковки", basisId: "accessible_symbol_area_m2", basisUnit: "m2", rateId: "accessible_marking_machine_productivity_m2_per_machine_hour", rateUnit: "m2_machine_hour", outputUnit: "machine_hour", operation: "divide", owner: "accessible:marking_machine", sourceIds: ["kg_krer_2015_collection_27"] }),
    projectRow("accessible:acceptance_control", "Контроль качества", "testing", "Контроль размеров и обозначения доступных парковочных мест", "accessible_space_count", "test", "accessible:acceptance_control"),
  ],
};

const BRIDGE_DECK_ACCEPTANCE_ASSEMBLY: ProfessionalChildAssemblyV4 = {
  child_passport_id: "professional-estimate-passport:v4:bridge-deck-acceptance",
  child_passport_version: "4.1.0",
  domain_owner: "bridges",
  assembly_id: "typed-child:bridge-deck-acceptance:v1",
  title_ru: "Приёмка существующей системы мостового полотна перед асфальтированием",
  scope_trigger_parameter: "bridge_deck_system_confirmed",
  scope_trigger_values: [true],
  supported_scope_modes: BOTH,
  parameters: [
    parameter("bridge_deck_system_confirmed", "Система покрытия мостовой плиты подтверждена проектом", "SCOPE_TRIGGER", null, BOTH),
    parameter("area_m2", "Площадь мостового полотна", "PROJECT_QUANTITY", "m2", BOTH),
  ],
  rows: [
    projectRow(
      "bridge:deck_acceptance",
      "Контроль качества",
      "work",
      "Приёмка гидроизоляции, защитного слоя и сопряжений мостовой плиты перед устройством асфальтобетона",
      "area_m2",
      "m2",
      "bridge:deck_acceptance",
    ),
  ],
};

const BRIDGE_ASSEMBLY: ProfessionalChildAssemblyV4 = {
  child_passport_id: "professional-estimate-passport:v4:bridge-deck-waterproofing",
  child_passport_version: "4.1.0",
  domain_owner: "bridges",
  assembly_id: "typed-child:bridge-deck-waterproofing:v1",
  title_ru: "Мостовая гидроизоляция, защитный слой и сопряжения",
  scope_trigger_parameter: "bridge_deck_package_required",
  scope_trigger_values: [true],
  supported_scope_modes: BOTH,
  parameters: [
    parameter("bridge_deck_package_required", "Включить мостовой пакет", "SCOPE_TRIGGER", null, BOTH),
    parameter("area_m2", "Площадь мостового полотна", "PROJECT_QUANTITY", "m2", BOTH),
    parameter("waterproofing_repair_area_m2", "Площадь гидроизоляции", "PROJECT_QUANTITY", "m2", BOTH),
    parameter("waterproofing_material_kg_m2", "Расход гидроизоляционного материала", "NORM_RATE", "kg_m2", BOTH),
    parameter("waterproofing_primer_rate_l_m2", "Расход праймера", "NORM_RATE", "l_m2", BOTH),
    parameter("protective_layer_thickness_mm", "Толщина защитного слоя", "PROJECT_QUANTITY", "mm", BOTH),
    parameter("protective_layer_density_t_m3", "Плотность материала защитного слоя", "MATERIAL_PASSPORT_VALUE", "t_m3", BOTH),
    parameter("expansion_joint_length_m", "Длина сопряжений деформационных швов", "PROJECT_QUANTITY", "m", BOTH),
    parameter("expansion_joint_sealant_kg_m", "Расход герметика сопряжений", "NORM_RATE", "kg_m", BOTH),
    parameter("bridge_waterproofing_productivity_m2_per_man_hour", "Производительность труда гидроизоляционных работ", "NORM_RATE", "m2_man_hour", BOTH),
    parameter("bridge_waterproofing_machine_productivity_m2_per_machine_hour", "Производительность установки нанесения гидроизоляции", "NORM_RATE", "m2_machine_hour", BOTH),
  ],
  rows: [
    rateRow({ id: "bridge:waterproofing", section: "Мостовая плита", category: "material", titleRu: "Гидроизоляционный материал мостового полотна", basisId: "waterproofing_repair_area_m2", basisUnit: "m2", rateId: "waterproofing_material_kg_m2", rateUnit: "kg_m2", outputUnit: "kg", operation: "multiply", owner: "bridge:waterproofing", procurement: true, sourceIds: ["project_bridge_waterproofing_specification"] }),
    rateRow({ id: "bridge:primer", section: "Мостовая плита", category: "material", titleRu: "Праймер гидроизоляции мостового полотна", basisId: "waterproofing_repair_area_m2", basisUnit: "m2", rateId: "waterproofing_primer_rate_l_m2", rateUnit: "l_m2", outputUnit: "l", operation: "multiply", owner: "bridge:primer", procurement: true, sourceIds: ["project_bridge_waterproofing_specification"] }),
    row({ row_id: "bridge:protective_layer", section: "Мостовая плита", category: "material", title_ru: "Материал защитного слоя гидроизоляции", formulaId: "bridge:protective_layer:formula:v1", expression: "area_m2 * protective_layer_thickness_mm / 1000 * protective_layer_density_t_m3", inputs: ["area_m2", "protective_layer_thickness_mm", "protective_layer_density_t_m3"], unitId: "t", calculate: (v) => v.area_m2 * v.protective_layer_thickness_mm / 1000 * v.protective_layer_density_t_m3, cost_ownership: "priced_resource", cost_owner_id: "bridge:protective_layer", semantic_owner: "bridge:protective_layer", normative_source_ids: ["project_bridge_deck_system"], inclusion_condition: "bridge deck system confirmed", procurement_eligible: true }),
    rateRow({ id: "bridge:joint_sealant", section: "Мостовая плита", category: "material", titleRu: "Герметик сопряжений у деформационных швов", basisId: "expansion_joint_length_m", basisUnit: "m", rateId: "expansion_joint_sealant_kg_m", rateUnit: "kg_m", outputUnit: "kg", operation: "multiply", owner: "bridge:joint_sealant", procurement: true, sourceIds: ["project_bridge_joint_detail"] }),
    projectRow("bridge:waterproofing_output", "Мостовая плита", "work", "Устройство гидроизоляции и защитного слоя мостового полотна", "waterproofing_repair_area_m2", "m2", "bridge:waterproofing_output"),
    rateRow({ id: "bridge:labor", section: "Труд", category: "labor", titleRu: "Труд гидроизоляционного звена", basisId: "waterproofing_repair_area_m2", basisUnit: "m2", rateId: "bridge_waterproofing_productivity_m2_per_man_hour", rateUnit: "m2_man_hour", outputUnit: "man_hour", operation: "divide", owner: "bridge:labor", sourceIds: ["verified_ratebook:bridge_waterproofing"] }),
    rateRow({ id: "bridge:machine", section: "Машины", category: "machinery", titleRu: "Установка нанесения мостовой гидроизоляции", basisId: "waterproofing_repair_area_m2", basisUnit: "m2", rateId: "bridge_waterproofing_machine_productivity_m2_per_machine_hour", rateUnit: "m2_machine_hour", outputUnit: "machine_hour", operation: "divide", owner: "bridge:machine", sourceIds: ["verified_equipment_productivity"] }),
  ],
};

export const ASPHALT_ASSOCIATED_WORK_CHILD_ASSEMBLIES_V4: readonly ProfessionalChildAssemblyV4[] = Object.freeze([
  CURB_ASSEMBLY,
  DRAINAGE_ASSEMBLY,
  MARKING_ASSEMBLY,
  SIGN_ASSEMBLY,
  LIGHTING_ASSEMBLY,
  PARKING_GEOMETRY_ASSEMBLY,
  ACCESSIBLE_PARKING_ASSEMBLY,
  BRIDGE_DECK_ACCEPTANCE_ASSEMBLY,
  BRIDGE_ASSEMBLY,
]);
