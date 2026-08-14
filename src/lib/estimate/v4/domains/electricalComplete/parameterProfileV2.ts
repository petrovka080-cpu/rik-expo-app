import type { ProfessionalDomainParameterDefinitionV1 } from "../../domainFactory";
import type { CanonicalParameterNormativeSource } from "../../../canonicalParameters/canonicalParameterCore";
import type { ElectricalDomainInventoryRow } from "./inventory";

export type ElectricalParameterSeedV2 = {
  parameter_id: string;
  label_ru: string;
  input_type: ProfessionalDomainParameterDefinitionV1["input_type"];
  unit_id: string | null;
  minimum?: number;
  maximum?: number;
  choices?: readonly { value: string; label_ru: string }[];
  candidate_prefixes: readonly string[];
  normative_source_id: string;
};

const PROJECT = "PROJECT_ELECTRICAL_DESIGN_INPUT";
const KG_RATE = "KG_KRERM_08_2015_ELECTRICAL";
const KG_ACCEPT = "KG_ELECTRICAL_ACCEPTANCE_2023";
const EAEU = "EAEU_TR_TS_004_2011";

function n(parameter_id: string, label_ru: string, unit_id: string, minimum: number, maximum: number, candidate_prefixes: readonly string[], normative_source_id = PROJECT): ElectricalParameterSeedV2 {
  return { parameter_id, label_ru, input_type: "number", unit_id, minimum, maximum, candidate_prefixes, normative_source_id };
}

function t(parameter_id: string, label_ru: string, candidate_prefixes: readonly string[], normative_source_id = PROJECT): ElectricalParameterSeedV2 {
  return { parameter_id, label_ru, input_type: "text", unit_id: null, candidate_prefixes, normative_source_id };
}

function q(parameter_id: string, label_ru: string, values: readonly string[], candidate_prefixes: readonly string[], normative_source_id = PROJECT): ElectricalParameterSeedV2 {
  return { parameter_id, label_ru, input_type: "choice", unit_id: null, choices: values.map((value) => ({ value, label_ru: value })), candidate_prefixes, normative_source_id };
}

const COMMON: readonly ElectricalParameterSeedV2[] = Object.freeze([
  t("physical_deliverable", "Точный физический результат выбранной работы", ["core_", "op_"]),
  q("work_context", "Контекст выполнения", ["NEW_INSTALLATION", "REPLACEMENT", "REPAIR", "TESTING", "COMMISSIONING"], ["core_", "op_"]),
  n("ambient_temperature_c", "Расчётная температура окружающей среды", "degC", -60, 80, ["core_", "panel_", "ups_"]),
  n("mounting_height_m", "Монтажная высота", "m", 0, 100, ["access_", "rigging_", "lighting_", "containment_"]),
  q("access_restriction", "Ограничение доступа", ["OPEN", "RESTRICTED", "CONFINED", "LIVE_FACILITY"], ["access_", "hse_"]),
  q("live_system_context", "Состояние действующей системы", ["DE_ENERGIZED", "ADJACENT_LIVE", "LIVE_WORK_PROHIBITED"], ["hse_", "op_replace_"]),
  n("frequency_hz", "Номинальная частота", "Hz", 0, 400, ["qa_", "panel_test_", "substation_test_"]),
  q("ip_rating", "Требуемая степень защиты IP", ["IP20", "IP31", "IP44", "IP54", "IP55", "IP65", "IP66", "PROJECT_SPECIFIED"], ["device_", "lighting_", "panel_", "ups_"]),
  q("fire_performance_class", "Проектный класс пожарной характеристики", ["STANDARD", "LSZH", "FIRE_RESISTANT", "PROJECT_SPECIFIED"], ["cable_", "containment_"]),
  q("seismic_requirement", "Требование сейсмического крепления", ["NOT_REQUIRED_BY_PROJECT", "PROJECT_CALCULATED"], ["containment_", "panel_", "substation_"]),
]);

const CONTAINMENT: readonly ElectricalParameterSeedV2[] = Object.freeze([
  n("route_length_m", "Длина кабеленесущей трассы по оси", "m", 0.01, 1_000_000, ["containment_"]),
  q("containment_type", "Тип кабеленесущей системы", ["TRAY", "LADDER", "CHANNEL", "RIGID_CONDUIT", "FLEXIBLE_CONDUIT"], ["containment_"]),
  n("containment_width_mm", "Ширина кабеленесущей системы", "mm", 10, 2000, ["containment_"]),
  n("containment_height_mm", "Высота борта", "mm", 5, 500, ["containment_"]),
  n("support_spacing_m", "Проектный шаг опор", "m", 0.1, 6, ["containment_"]),
  n("horizontal_bend_count", "Количество горизонтальных углов", "item", 0, 100_000, ["containment_horizontal_bend"]),
  n("vertical_bend_count", "Количество вертикальных углов", "item", 0, 100_000, ["containment_vertical_"]),
  n("tee_count", "Количество тройников", "item", 0, 100_000, ["containment_tee"]),
  n("penetration_count", "Количество отдельных проходок", "item", 0, 100_000, ["containment_sleeve", "containment_firestop_interface"]),
], );

const CABLE: readonly ElectricalParameterSeedV2[] = Object.freeze([
  n("cable_route_length_m", "Длина кабельной трассы по сегментам", "m", 0.01, 2_000_000, ["cable_power", "cable_control", "cable_laying"]),
  n("vertical_rise_m", "Суммарная длина вертикальных подъёмов", "m", 0, 100_000, ["cable_vertical_allowance"]),
  n("termination_allowance_m", "Проектный запас на оконцевания", "m", 0, 10_000, ["cable_termination_allowance"]),
  q("conductor_material", "Материал проводника", ["COPPER", "ALUMINIUM"], ["cable_"], EAEU),
  n("core_count", "Количество жил", "item", 1, 64, ["cable_"], EAEU),
  n("conductor_section_mm2", "Сечение проводника", "mm2", 0.25, 2500, ["cable_"], EAEU),
  q("cable_installation_method", "Способ прокладки кабеля", ["TRAY", "CONDUIT", "DUCT", "DIRECT_BURIED", "FREE_AIR", "PROJECT_SPECIFIED"], ["cable_"], KG_RATE),
  n("cable_joint_count", "Количество соединительных муфт", "item", 0, 100_000, ["cable_straight_joint", "cable_branch_joint"]),
  n("termination_count", "Количество кабельных концов", "item", 1, 200_000, ["cable_lug_", "cable_termination", "cable_gland"]),
  n("pulling_tension_limit_n", "Допустимое тяговое усилие по паспорту", "N", 1, 10_000_000, ["cable_pull_tension_control", "cable_machine_tension_meter"], EAEU),
]);

const LOAD_PROTECTION: readonly ElectricalParameterSeedV2[] = Object.freeze([
  n("connected_load_kw", "Установленная мощность", "kW", 0.001, 1_000_000, ["panel_calc_load", "protection_rating"]),
  n("demand_factor", "Коэффициент спроса", "ratio", 0.01, 1, ["panel_calc_demand"]),
  n("power_factor", "Коэффициент мощности", "ratio", 0.01, 1, ["panel_calc_load"]),
  n("design_current_a", "Расчётный ток", "A", 0.001, 100_000, ["protection_device", "panel_main_bus"]),
  n("prospective_fault_current_ka", "Ожидаемый ток короткого замыкания", "kA", 0.001, 200, ["protection_breaking", "panel_calc_fault_current"]),
  n("breaking_capacity_ka", "Отключающая способность аппарата", "kA", 0.001, 200, ["protection_breaking", "panel_calc_breaking_capacity"], EAEU),
  q("protection_curve", "Характеристика защитного аппарата", ["B", "C", "D", "K", "Z", "PROJECT_SPECIFIED"], ["protection_device"]),
  n("rcd_sensitivity_ma", "Номинальный дифференциальный ток", "mA", 1, 30_000, ["protection_rcd", "device_test_rcd_trip"]),
  n("maximum_disconnection_time_s", "Максимально допустимое время отключения", "s", 0.01, 10, ["protection_test_rcd", "qa_loop_impedance"]),
]);

const PANEL: readonly ElectricalParameterSeedV2[] = Object.freeze([
  n("panel_way_count", "Количество модульных мест или присоединений", "item", 1, 10_000, ["panel_"]),
  n("incomer_count", "Количество вводов", "item", 1, 100, ["panel_incomer_breaker"]),
  n("outgoing_circuit_count", "Количество отходящих цепей", "item", 0, 10_000, ["panel_outgoing_breaker", "panel_terminal_"]),
  n("busbar_rating_a", "Номинальный ток главных шин", "A", 1, 100_000, ["panel_main_bus", "panel_calc_bus_rating"]),
  n("busbar_withstand_ka", "Токовая стойкость шин", "kA", 0.1, 500, ["panel_main_bus", "panel_calc_bus_rating"]),
  n("panel_width_mm", "Ширина корпуса", "mm", 100, 10_000, ["panel_enclosure"]),
  n("panel_height_mm", "Высота корпуса", "mm", 100, 10_000, ["panel_enclosure"]),
  n("panel_depth_mm", "Глубина корпуса", "mm", 50, 5000, ["panel_enclosure"]),
  n("terminal_count", "Количество клемм по ведомости", "item", 1, 100_000, ["panel_terminal_"]),
  n("cable_entry_count", "Количество кабельных вводов", "item", 1, 100_000, ["panel_gland", "panel_cable_entry"]),
  t("verified_nested_bom_id", "Идентификатор проверенного nested BOM", ["panel_bom_reconcile", "panel_device_install"], EAEU),
]);

const LIGHTING: readonly ElectricalParameterSeedV2[] = Object.freeze([
  n("luminaire_count", "Количество светильников выбранного типа", "item", 1, 1_000_000, ["lighting_luminaire", "lighting_mount"]),
  n("luminaire_power_w", "Мощность одного светильника", "W", 0.1, 100_000, ["lighting_driver"], EAEU),
  n("luminaire_flux_lm", "Световой поток одного светильника", "lm", 1, 10_000_000, ["lighting_luminaire"], EAEU),
  n("target_illuminance_lux", "Проектная освещённость", "lux", 1, 100_000, ["lighting_test_illuminance"]),
  q("lighting_control_type", "Способ управления", ["LOCAL", "SENSOR", "DALI", "CENTRAL", "PROJECT_SPECIFIED"], ["lighting_sensor", "lighting_control_relay", "lighting_dali_component"]),
  n("emergency_duration_min", "Требуемая длительность аварийного режима", "min", 1, 1440, ["lighting_battery", "lighting_test_autonomy"]),
  n("lighting_test_point_count", "Количество контрольных точек измерения", "item", 1, 100_000, ["lighting_test_illuminance"]),
]);

const GROUNDING: readonly ElectricalParameterSeedV2[] = Object.freeze([
  n("target_earth_resistance_ohm", "Проектное сопротивление заземляющего устройства", "ohm", 0.01, 10_000, ["earth_test_resistance"]),
  n("soil_resistivity_ohm_m", "Удельное сопротивление грунта", "ohm_m", 0.1, 100_000, ["earth_rod_electrode", "earth_work_electrode_drive"]),
  n("electrode_count", "Количество заземлителей", "item", 1, 100_000, ["earth_rod_electrode", "earth_work_electrode_drive"]),
  n("electrode_length_m", "Длина одного заземлителя", "m", 0.5, 100, ["earth_rod_electrode"]),
  n("earth_conductor_length_m", "Длина заземляющего проводника", "m", 0.1, 1_000_000, ["earth_strip", "earth_round_conductor"]),
  n("bonding_point_count", "Количество точек уравнивания потенциалов", "item", 1, 1_000_000, ["earth_bonding_clamp", "earth_work_bond"]),
  q("lightning_protection_class", "Класс молниезащиты", ["I", "II", "III", "IV", "NOT_APPLICABLE"], ["lightning_"]),
  n("test_joint_count", "Количество контрольных соединений", "item", 1, 100_000, ["earth_test_joint", "earth_work_test_joint_install"]),
]);

const EXTERNAL: readonly ElectricalParameterSeedV2[] = Object.freeze([
  n("external_route_length_m", "Длина наружной трассы", "m", 0.1, 2_000_000, ["external_", "cable_"]),
  n("trench_depth_m", "Проектная глубина траншеи", "m", 0.1, 20, ["external_civil_excavation_interface", "external_test_depth"]),
  n("trench_width_m", "Проектная ширина траншеи", "m", 0.1, 20, ["external_civil_excavation_interface"]),
  n("duct_count", "Количество кабельных труб в сечении", "item", 1, 1000, ["external_duct", "external_duct_spacer"]),
  n("manhole_count", "Количество кабельных колодцев", "item", 0, 100_000, ["external_manhole", "external_manhole_cover"]),
  n("crossing_count", "Количество инженерных и дорожных пересечений", "item", 0, 100_000, ["external_crossing_coordination", "external_test_separation"]),
  n("groundwater_inflow_m3_h", "Расчётный приток воды", "m3_h", 0, 100_000, ["external_civil_dewatering_interface", "external_machine_dewatering_pump"]),
]);

const RZA: readonly ElectricalParameterSeedV2[] = Object.freeze([
  n("protection_function_count", "Количество функций защиты", "item", 1, 10_000, ["rza_test_", "rza_setting_calculation"]),
  n("binary_input_count", "Количество дискретных входов", "item", 0, 100_000, ["rza_io_module", "rza_test_binary_input"]),
  n("binary_output_count", "Количество дискретных выходов", "item", 0, 100_000, ["rza_io_module", "rza_test_binary_output"]),
  n("analog_channel_count", "Количество аналоговых каналов", "item", 0, 100_000, ["rza_analog_module", "rza_test_analog_scaling"]),
  t("approved_settings_reference", "Ссылка на утверждённый расчёт уставок", ["rza_parameterize", "rza_settings_record"], KG_ACCEPT),
  q("communication_protocol", "Протокол диспетчерского обмена", ["IEC_61850", "IEC_60870_5_104", "MODBUS", "PROJECT_SPECIFIED"], ["rza_gateway", "rza_communications"]),
  n("scada_point_count", "Количество end-to-end диспетчерских точек", "item", 0, 100_000, ["rza_test_scada_point"]),
]);

const UPS: readonly ElectricalParameterSeedV2[] = Object.freeze([
  n("ups_rating_kva", "Номинальная мощность UPS", "kVA", 0.1, 1_000_000, ["ups_rectifier", "ups_inverter"]),
  n("critical_load_kw", "Критическая активная нагрузка", "kW", 0.01, 1_000_000, ["ups_engineering_critical_load"]),
  n("required_autonomy_min", "Требуемая автономия", "min", 1, 100_000, ["ups_engineering_autonomy", "ups_test_autonomy"]),
  q("ups_topology", "Топология UPS", ["ONLINE_DOUBLE_CONVERSION", "LINE_INTERACTIVE", "MODULAR", "PROJECT_SPECIFIED"], ["ups_"]),
  q("ups_redundancy", "Схема резервирования", ["N", "N_PLUS_1", "TWO_N", "PROJECT_SPECIFIED"], ["ups_engineering_redundancy", "ups_test_failover"]),
  q("battery_chemistry", "Химия аккумуляторов", ["VRLA", "VENTED_LEAD_ACID", "LITHIUM_ION", "NICKEL_CADMIUM", "PROJECT_SPECIFIED"], ["battery_"]),
  n("battery_cell_count", "Количество аккумуляторных элементов", "item", 1, 1_000_000, ["battery_cell", "ups_work_cell_install"]),
  n("battery_capacity_ah", "Номинальная ёмкость элемента", "Ah", 0.1, 1_000_000, ["battery_cell", "ups_engineering_battery_capacity"]),
  n("permitted_depth_of_discharge", "Допустимая глубина разряда", "ratio", 0.01, 1, ["ups_engineering_battery_capacity"]),
]);

const SUBSTATION: readonly ElectricalParameterSeedV2[] = Object.freeze([
  n("transformer_rating_kva", "Номинальная мощность трансформатора", "kVA", 1, 2_000_000, ["substation_transformer"]),
  n("hv_voltage_v", "Номинальное напряжение стороны ВН", "V", 1000, 1_000_000, ["substation_hv_"]),
  n("lv_voltage_v", "Номинальное напряжение стороны НН", "V", 100, 100_000, ["substation_lv_"]),
  t("transformer_vector_group", "Группа соединения обмоток", ["substation_transformer", "substation_test_vector_group"], EAEU),
  n("transformer_impedance_percent", "Напряжение короткого замыкания трансформатора", "percent", 0.1, 50, ["substation_transformer"], EAEU),
  n("hv_bay_count", "Количество присоединений ВН", "item", 1, 1000, ["substation_incoming_cell", "substation_outgoing_cell"]),
  n("lv_feeder_count", "Количество отходящих присоединений НН", "item", 1, 10_000, ["panel_outgoing_breaker"]),
  n("substation_fault_level_ka", "Расчётный уровень короткого замыкания", "kA", 0.1, 500, ["substation_circuit_breaker", "panel_calc_fault_current"]),
  t("energization_program_id", "Идентификатор утверждённой программы включения", ["substation_commission_phased_energization", "substation_doc_energization_program"], KG_ACCEPT),
]);

function familyParameters(row: ElectricalDomainInventoryRow): readonly ElectricalParameterSeedV2[] {
  const family = row.electrical_family;
  if (["CABLE_CHANNEL", "cable_ducts"].includes(family)) return CONTAINMENT;
  if (["POWER_CABLE", "VVG_CABLE", "cable_pulling"].includes(family)) return CABLE;
  if (["BREAKER", "RCD"].includes(family)) return LOAD_PROTECTION;
  if (["PANEL", "distribution_board_outdoor"].includes(family)) return [...LOAD_PROTECTION, ...PANEL];
  if (["LIGHTING", "LED_STRIP", "street_lighting_poles"].includes(family)) return LIGHTING;
  if (["grounding_system", "lightning_protection"].includes(family)) return GROUNDING;
  if (["cable_trench", "cable_trench_energy", "underground_cable_line"].includes(family)) return [...CABLE, ...EXTERNAL];
  if (family === "relay_protection_automation" || family === "electrical_testing_commissioning") return RZA;
  if (family === "battery_energy_storage") return [...LOAD_PROTECTION, ...CABLE, ...UPS];
  if (["distribution_substation", "outdoor_switchgear", "package_transformer_substation", "substation_10kv", "substation_35kv", "substation_110kv", "transformer_substation"].includes(family)) return [...LOAD_PROTECTION, ...PANEL, ...CABLE, ...GROUNDING, ...RZA, ...SUBSTATION];
  if (family.startsWith("electrical_poles_") || family.startsWith("overhead_power_line_")) return [...GROUNDING, ...LIGHTING];
  return [];
}

export function electricalParameterProfileV2(row: ElectricalDomainInventoryRow): readonly ElectricalParameterSeedV2[] {
  const values = [...COMMON, ...familyParameters(row)];
  const unique = new Map(values.map((value) => [value.parameter_id, value]));
  return Object.freeze([...unique.values()]);
}

export function electricalApplicableParameterProfileV2(row: ElectricalDomainInventoryRow, candidateIds: readonly string[]): readonly ElectricalParameterSeedV2[] {
  return Object.freeze(electricalParameterProfileV2(row).filter((parameter) =>
    parameter.candidate_prefixes.some((prefix) => candidateIds.some((candidateId) => candidateId.startsWith(prefix)))
  ));
}

const NORMATIVE_BY_PARAMETER = new Map<string, string>();
for (const value of [...COMMON, ...CONTAINMENT, ...CABLE, ...LOAD_PROTECTION, ...PANEL, ...LIGHTING, ...GROUNDING, ...EXTERNAL, ...RZA, ...UPS, ...SUBSTATION]) {
  NORMATIVE_BY_PARAMETER.set(value.parameter_id, value.normative_source_id);
}

export function electricalParameterNormativeSourceV2(parameterId: string): CanonicalParameterNormativeSource {
  const sourceId = NORMATIVE_BY_PARAMETER.get(parameterId) ?? PROJECT;
  return {
    profile: sourceId === PROJECT ? "PROJECT_SPECIFIC_PROFILE" : "KG_PROFILE",
    sourceId,
    document: sourceId,
    revision: "official-current-verified-2026-08-14",
    locator: sourceId === PROJECT
      ? "Утверждённая рабочая документация, однолинейная схема, спецификация или явно редактируемый PROJECT_INPUT."
      : "Точная применимость и пункт фиксируются в индивидуальном паспорте V2 и строковом normative trace.",
    checkedAt: "2026-08-14T00:00:00.000+06:00",
    sourceHash: `registry-bound:${sourceId}`,
  };
}
