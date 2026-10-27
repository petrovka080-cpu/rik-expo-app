import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
  type CanonicalEstimateFormulaDefinition,
  type CanonicalEstimateParameterDefinition,
  type CanonicalEstimateResourceDefinition,
} from "../backendPlatform/canonicalEstimateCompileCore";
import { compileFormulaGraph } from "../backendPlatform/formulaGraph";
import { estimateDeterministicHash } from "../estimateDeterministicHash";

type InputValue = string | number | boolean;
type Json = Record<string, unknown>;
export const BOREHOLE_WATER_SUPPLY_CATALOG_ID =
  "canonical-work:expanded:borehole_water_supply";
export const BOREHOLE_WATER_SUPPLY_SOURCE_ID =
  "project_potable_production_borehole_casing_balance_v1";
export const BOREHOLE_WATER_SUPPLY_NORM_ID =
  "norm:project:potable_production_borehole_casing_balance:v1";
export const BOREHOLE_WATER_SUPPLY_SOURCE_METADATA = Object.freeze({
  source_title: "Утверждённый гидрогеологический проект питьевой эксплуатационной скважины, журнал бурения, конструкция скважины, спецификация насоса и программа испытаний",
  source_authority: "Гидрогеолог, проектировщики буровой, механической, строительной и электрической частей, лаборатория, поставщики и утверждающий инженер проекта",
  source_document_version: "PROJECT_POTABLE_PRODUCTION_BOREHOLE_DRILLING_CASING_SCREEN_PUMP_HEADWORKS_QA_LOGISTICS_BALANCE_S27_24",
  definition_hash: "f2971322bfa5dae8ba08863212ecc41711cbf02d2aca1ac9eb8f37936867c696",
  exact_locator: "1 скважина BH-PW-180-DN250, 180 м, ствол 311 мм, 180 м STEEL-CASING-DN250-EN10217, 36 м SS316L-VWIRE-DN200-0.75MM, насос SUBMERSIBLE-45M3H-120M, 160 м SS304-DN80-PN16 и SANITARY-WELLHEAD-DN250-DN80",
  use_restriction: "Глубина не определяет автоматически обсадку, фильтр, обсыпку, цементаж, труд, механизмы или логистику. Временный подъезд, вывоз бурового шлама и резервное питание включаются только по проекту. Наружная сеть, резервуар, водоподготовка, канализация и цены исключены.",
  source_kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
  artifact_sha256: "f2971322bfa5dae8ba08863212ecc41711cbf02d2aca1ac9eb8f37936867c696",
});

const KNOWN_SCOPE = [
  "bh_borehole_count", "bh_borehole_designation", "bh_purpose",
  "bh_drilled_depth_m", "bh_final_bore_diameter_mm",
  "bh_casing_installed_m", "bh_casing_designation",
  "bh_screen_installed_m", "bh_screen_designation",
  "bh_pump_installed_piece", "bh_pump_designation",
  "bh_rising_main_installed_m", "bh_rising_main_designation",
  "bh_wellhead_installed_set", "bh_wellhead_designation",
];
const VISIBLE_PRELIMINARY_PROFILE = new Set([
  "bh_casing_retained_spare_m", "bh_casing_supplier_joint_length_m",
]);
const CONDITIONAL_DETAILS = new Set([
  "bh_temporary_access_designation", "bh_temporary_access_area_m2",
  "bh_drilling_fluid_disposal_designation", "bh_drilling_fluid_disposal_trip_count",
  "bh_standby_power_designation", "bh_standby_power_machine_h",
]);
const PARAMETER_SPECS = Object.freeze([
  ["bh_borehole_count", "Количество эксплуатационных скважин", "integer", "piece", null],
  ["bh_borehole_designation", "Марка скважины", "text", null, null],
  ["bh_purpose", "Назначение скважины", "enum", null, ["POTABLE_WATER_PRODUCTION"]],
  ["bh_drilled_depth_m", "Проектная глубина бурения", "decimal", "m", null],
  ["bh_final_bore_diameter_mm", "Конечный диаметр ствола", "decimal", "mm", null],
  ["bh_casing_installed_m", "Проектная длина обсадной колонны", "decimal", "m", null],
  ["bh_casing_designation", "Марка обсадной трубы", "text", null, null],
  ["bh_screen_installed_m", "Проектная длина фильтровой колонны", "decimal", "m", null],
  ["bh_screen_designation", "Марка фильтровой колонны", "text", null, null],
  ["bh_pump_installed_piece", "Количество погружных насосов", "integer", "piece", null],
  ["bh_pump_designation", "Марка погружного насоса", "text", null, null],
  ["bh_rising_main_installed_m", "Проектная длина водоподъёмной колонны", "decimal", "m", null],
  ["bh_rising_main_designation", "Марка водоподъёмной колонны", "text", null, null],
  ["bh_wellhead_installed_set", "Количество санитарных оголовков", "integer", "set", null],
  ["bh_wellhead_designation", "Марка санитарного оголовка", "text", null, null],
  ["bh_casing_retained_spare_m", "Сохраняемый запас обсадной трубы", "decimal", "m", null],
  ["bh_casing_supplier_joint_length_m", "Длина трубы в поставочном звене", "decimal", "m", null],
  ["bh_gravel_pack_designation", "Марка фильтровой обсыпки", "text", null, null],
  ["bh_gravel_pack_volume_m3", "Объём фильтровой обсыпки", "decimal", "m3", null],
  ["bh_annular_grout_designation", "Марка затрубного цементно-бентонитового раствора", "text", null, null],
  ["bh_annular_grout_volume_m3", "Объём затрубного цементажа", "decimal", "m3", null],
  ["bh_centralizer_designation", "Марка центраторов обсадной колонны", "text", null, null],
  ["bh_centralizer_quantity_piece", "Количество центраторов", "integer", "piece", null],
  ["bh_power_cable_designation", "Марка погружного силового кабеля", "text", null, null],
  ["bh_power_cable_length_m", "Длина погружного силового кабеля", "decimal", "m", null],
  ["bh_sanitary_seal_designation", "Материал санитарного замка", "text", null, null],
  ["bh_sanitary_seal_volume_m3", "Объём санитарного замка", "decimal", "m3", null],
  ["bh_concrete_apron_volume_m3", "Объём бетона санитарной отмостки", "decimal", "m3", null],
  ["bh_headworks_chamber_designation", "Марка камеры оголовка", "text", null, null],
  ["bh_headworks_chamber_quantity_set", "Количество камер оголовка", "integer", "set", null],
  ["bh_valve_schedule_designation", "Спецификация арматуры оголовка", "text", null, null],
  ["bh_valve_quantity_piece", "Количество единиц арматуры", "integer", "piece", null],
  ["bh_instrument_set_designation", "Комплект расходомера, манометра и пробоотбора", "text", null, null],
  ["bh_instrument_quantity_set", "Количество комплектов КИП", "integer", "set", null],
  ["bh_control_system_designation", "Система ПЧ, управления и защиты", "text", null, null],
  ["bh_control_system_quantity_set", "Количество комплектов управления", "integer", "set", null],
  ["bh_earthing_designation", "Система заземления", "text", null, null],
  ["bh_earthing_quantity_set", "Количество комплектов заземления", "integer", "set", null],
  ["bh_commissioning_consumable_designation", "Монтажные и пусковые расходники", "text", null, null],
  ["bh_commissioning_consumable_quantity_set", "Количество комплектов расходников", "integer", "set", null],
  ["bh_geophysical_logging_designation", "Комплекс геофизических исследований", "text", null, null],
  ["bh_geophysical_logging_length_m", "Интервал геофизических исследований", "decimal", "m", null],
  ["bh_development_machine_h", "Развитие и эрлифтная прокачка", "decimal", "machine_hour", null],
  ["bh_test_pumping_h", "Продолжительность опытной откачки", "decimal", "hour", null],
  ["bh_water_analysis_test_count", "Количество лабораторных анализов воды", "integer", "test", null],
  ["bh_disinfection_cycle_count", "Количество циклов дезинфекции", "integer", "cycle", null],
  ["bh_electrical_test_count", "Количество электрических испытаний", "integer", "test", null],
  ["bh_asbuilt_document_count", "Комплекты паспорта и исполнительной документации", "integer", "document", null],
  ["bh_survey_labor_h", "Труд на разбивку и исполнительную съёмку", "decimal", "man_hour", null],
  ["bh_drilling_labor_h", "Труд буровой бригады", "decimal", "man_hour", null],
  ["bh_mechanical_labor_h", "Труд на насос, колонну и оголовок", "decimal", "man_hour", null],
  ["bh_electrical_controls_labor_h", "Труд на кабель, управление и заземление", "decimal", "man_hour", null],
  ["bh_qa_documentation_labor_h", "Труд на испытания, анализы и документацию", "decimal", "man_hour", null],
  ["bh_drilling_rig_machine_h", "Работа буровой установки", "decimal", "machine_hour", null],
  ["bh_crane_machine_h", "Работа крана", "decimal", "machine_hour", null],
  ["bh_air_compressor_machine_h", "Работа компрессора", "decimal", "machine_hour", null],
  ["bh_material_delivery_trip_count", "Рейсы доставки", "integer", "trip", null],
  ["bh_waste_removal_trip_count", "Рейсы вывоза отходов", "integer", "trip", null],
  ["bh_temporary_access_mode", "Временная площадка и подъезд требуются", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["bh_temporary_access_designation", "Конструкция временной площадки", "text", null, null],
  ["bh_temporary_access_area_m2", "Площадь временной площадки", "decimal", "m2", null],
  ["bh_drilling_fluid_disposal_mode", "Вывоз бурового шлама требуется", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["bh_drilling_fluid_disposal_designation", "Способ вывоза бурового шлама", "text", null, null],
  ["bh_drilling_fluid_disposal_trip_count", "Рейсы вывоза бурового шлама", "integer", "trip", null],
  ["bh_standby_power_mode", "Резервное питание требуется", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["bh_standby_power_designation", "Марка резервного генератора", "text", null, null],
  ["bh_standby_power_machine_h", "Работа резервного генератора", "decimal", "machine_hour", null],
] as const);

function conditionalConstraints(parameterId: string): Json {
  for (const branch of ["temporary_access", "drilling_fluid_disposal",
    "standby_power"] as const) {
    if (parameterId.startsWith(`bh_${branch}_`) && parameterId !== `bh_${branch}_mode`) {
      return {
        requiredWhen: { kind: "equals", parameterId: `bh_${branch}_mode`, value: "REQUIRED" },
        forbiddenWhen: { kind: "equals", parameterId: `bh_${branch}_mode`, value: "NOT_REQUIRED" },
      };
    }
  }
  return {};
}

export type BoreholeWaterSupplyParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number; unit_id: string | null; title_ru: string; truth_metadata: Json;
};
export const BOREHOLE_WATER_SUPPLY_PARAMETERS: readonly BoreholeWaterSupplyParameter[] =
  Object.freeze(PARAMETER_SPECS.map(
    ([parameterId, titleRu, valueType, unitId, enumValues], ordinal) => ({
      parameter_id: parameterId, ordinal, value_type: valueType, unit_id: unitId,
      title_ru: titleRu, required: !CONDITIONAL_DETAILS.has(parameterId), default_value: null,
      constraints_json: {
        ...(enumValues ? { values: enumValues }
          : valueType === "decimal" || valueType === "integer"
            ? { min: parameterId === "bh_casing_retained_spare_m" ? 0
              : valueType === "integer" ? 1 : 0.000_001 }
            : valueType === "text" ? { minLength: 1, maxLength: 1_000 } : {}),
        ...conditionalConstraints(parameterId),
      },
      truth_metadata: {
        contract: "rik-expo-app.borehole-water-supply-r1",
        semantic_parameter_key: `borehole-water-supply:${parameterId}`,
        visibility_role: "USER_INPUT",
        value_source_role: KNOWN_SCOPE.includes(parameterId) ? "USER_INPUT"
          : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
            ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE" : "PROJECT_SPECIFIC_INPUT",
        input_origin_class: KNOWN_SCOPE.includes(parameterId) ? "KNOWN_WORK_SCOPE"
          : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
            ? "VISIBLE_PRELIMINARY_PROCUREMENT_BALANCE"
            : "APPROVED_BOREHOLE_PROJECT_BOQ_OR_TEST_DOCUMENTATION",
        preliminary_compilation_allowed: true,
        source_confirmation_required: !KNOWN_SCOPE.includes(parameterId)
          && !VISIBLE_PRELIMINARY_PROFILE.has(parameterId),
        guide: {
          guide_kind: KNOWN_SCOPE.includes(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
          guide_short_ru: KNOWN_SCOPE.includes(parameterId)
            ? `${titleRu}: укажите по явному запросу и конструкции выбранной скважины.`
            : `${titleRu}: укажите по гидрогеологическому проекту, журналу бурения, спецификации, ППР или программе испытаний.`,
          source_role: KNOWN_SCOPE.includes(parameterId) ? "USER_SUPPLIED_OR_APPROVED_BOREHOLE_SCOPE"
            : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
              ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE"
              : "APPROVED_PRODUCTION_BOREHOLE_PROJECT_DOCUMENTATION",
          source_document: BOREHOLE_WATER_SUPPLY_SOURCE_ID,
          source_locator: BOREHOLE_WATER_SUPPLY_SOURCE_METADATA.exact_locator,
          guide_version: "borehole-water-supply-r1",
          source_snapshot_hash: BOREHOLE_WATER_SUPPLY_SOURCE_METADATA.artifact_sha256,
          applicability: "Только выбранная эксплуатационная питьевая скважина; наружные сети, накопители, водоподготовка и канализация исключены.",
          verified_at: "2026-10-02T00:00:00+06:00",
          guide_validation_policy: "DEFER_MISSING_PROJECT_VALUE_ROW_LOCALLY_REJECT_INVALID_SUPPLIED_VALUE",
        },
        hidden_default_forbidden: true,
        runtime_profile_value: VISIBLE_PRELIMINARY_PROFILE.has(parameterId),
        synthetic: false,
      },
    })),
  );

export const BOREHOLE_WATER_SUPPLY_RUNTIME_INPUT = Object.freeze({
  bh_casing_retained_spare_m: 0,
  bh_casing_supplier_joint_length_m: 1,
});
export const BOREHOLE_WATER_SUPPLY_RUNTIME_CLASSIFICATION = Object.freeze(Object.fromEntries(
  Object.keys(BOREHOLE_WATER_SUPPLY_RUNTIME_INPUT).map((id) => [id, "ASSUMPTION"]),
) as Readonly<Record<string, "ASSUMPTION">>);
export const BOREHOLE_WATER_SUPPLY_RUNTIME_SOURCE_IDS = Object.freeze(Object.fromEntries(
  Object.keys(BOREHOLE_WATER_SUPPLY_RUNTIME_INPUT)
    .map((id) => [id, [BOREHOLE_WATER_SUPPLY_SOURCE_ID]]),
) as Readonly<Record<string, readonly string[]>>);

const literalTrue = Object.freeze({ kind: "literal", value: true });
const equals = (parameterId: string, value: InputValue) => ({ kind: "equals", parameterId, value });
type RowSpec = Readonly<{
  rowId: string; section: string; category: string; titleRu: string; unitId: string;
  formulaId: string; expression: string; procurementEligible?: boolean;
  titleParameterIds?: string[]; inclusionAst?: Json;
  costTreatment?: "OWN_COST" | "INFORMATIONAL_SCOPE" | "INCLUDED_IN_RESOURCE_ROWS";
}>;
const ROW_SPECS: readonly RowSpec[] = Object.freeze([
  { rowId: "rc09:bh_acceptance", section: "Работы", category: "construction_work", titleRu: "Устройство, испытание и приёмка эксплуатационной скважины", unitId: "piece", formulaId: "bh_acceptance_count_v1", expression: "bh_borehole_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:bh_drilling", section: "Бурение", category: "construction_work", titleRu: "Бурение ствола скважины", unitId: "m", formulaId: "bh_drilling_depth_v1", expression: "bh_drilled_depth_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:bh_casing", section: "Материалы", category: "material", titleRu: "Обсадная колонна", unitId: "m", formulaId: "bh_casing_order_length_v1", expression: "ceil((bh_casing_installed_m+bh_casing_retained_spare_m)/bh_casing_supplier_joint_length_m)*bh_casing_supplier_joint_length_m", procurementEligible: true, titleParameterIds: ["bh_casing_designation"] },
  { rowId: "rc09:bh_screen", section: "Материалы", category: "material", titleRu: "Фильтровая колонна", unitId: "m", formulaId: "bh_screen_length_v1", expression: "bh_screen_installed_m", procurementEligible: true, titleParameterIds: ["bh_screen_designation"] },
  { rowId: "rc09:bh_gravel_pack", section: "Материалы", category: "material", titleRu: "Промытая фильтровая обсыпка", unitId: "m3", formulaId: "bh_gravel_pack_volume_v1", expression: "bh_gravel_pack_volume_m3", procurementEligible: true, titleParameterIds: ["bh_gravel_pack_designation"] },
  { rowId: "rc09:bh_annular_grout", section: "Материалы", category: "material", titleRu: "Затрубный цементно-бентонитовый раствор", unitId: "m3", formulaId: "bh_annular_grout_volume_v1", expression: "bh_annular_grout_volume_m3", procurementEligible: true, titleParameterIds: ["bh_annular_grout_designation"] },
  { rowId: "rc09:bh_centralizers", section: "Комплектующие", category: "material", titleRu: "Центраторы обсадной колонны", unitId: "piece", formulaId: "bh_centralizer_quantity_v1", expression: "bh_centralizer_quantity_piece", procurementEligible: true, titleParameterIds: ["bh_centralizer_designation"] },
  { rowId: "rc09:bh_submersible_pump", section: "Оборудование", category: "equipment", titleRu: "Погружной скважинный насос", unitId: "piece", formulaId: "bh_pump_quantity_v1", expression: "bh_pump_installed_piece", procurementEligible: true, titleParameterIds: ["bh_pump_designation"] },
  { rowId: "rc09:bh_rising_main", section: "Материалы", category: "material", titleRu: "Водоподъёмная колонна", unitId: "m", formulaId: "bh_rising_main_length_v1", expression: "bh_rising_main_installed_m", procurementEligible: true, titleParameterIds: ["bh_rising_main_designation"] },
  { rowId: "rc09:bh_power_cable", section: "Материалы", category: "material", titleRu: "Погружной силовой кабель", unitId: "m", formulaId: "bh_power_cable_length_v1", expression: "bh_power_cable_length_m", procurementEligible: true, titleParameterIds: ["bh_power_cable_designation"] },
  { rowId: "rc09:bh_wellhead", section: "Оборудование", category: "equipment", titleRu: "Герметичный санитарный оголовок", unitId: "set", formulaId: "bh_wellhead_quantity_v1", expression: "bh_wellhead_installed_set", procurementEligible: true, titleParameterIds: ["bh_wellhead_designation"] },
  { rowId: "rc09:bh_sanitary_seal", section: "Материалы", category: "material", titleRu: "Санитарный бентонитовый замок", unitId: "m3", formulaId: "bh_sanitary_seal_volume_v1", expression: "bh_sanitary_seal_volume_m3", procurementEligible: true, titleParameterIds: ["bh_sanitary_seal_designation"] },
  { rowId: "rc09:bh_concrete_apron", section: "Материалы", category: "material", titleRu: "Бетон санитарной отмостки", unitId: "m3", formulaId: "bh_concrete_apron_volume_v1", expression: "bh_concrete_apron_volume_m3", procurementEligible: true },
  { rowId: "rc09:bh_headworks_chamber", section: "Сооружения", category: "material", titleRu: "Камера оголовка скважины", unitId: "set", formulaId: "bh_headworks_chamber_quantity_v1", expression: "bh_headworks_chamber_quantity_set", procurementEligible: true, titleParameterIds: ["bh_headworks_chamber_designation"] },
  { rowId: "rc09:bh_valves", section: "Комплектующие", category: "material", titleRu: "Арматура оголовка и напорной линии", unitId: "piece", formulaId: "bh_valve_quantity_v1", expression: "bh_valve_quantity_piece", procurementEligible: true, titleParameterIds: ["bh_valve_schedule_designation"] },
  { rowId: "rc09:bh_instruments", section: "Оборудование", category: "equipment", titleRu: "Расходомер, манометр и узел пробоотбора", unitId: "set", formulaId: "bh_instrument_quantity_v1", expression: "bh_instrument_quantity_set", procurementEligible: true, titleParameterIds: ["bh_instrument_set_designation"] },
  { rowId: "rc09:bh_controls", section: "Оборудование", category: "equipment", titleRu: "ПЧ, управление, защита и датчики уровня", unitId: "set", formulaId: "bh_control_system_quantity_v1", expression: "bh_control_system_quantity_set", procurementEligible: true, titleParameterIds: ["bh_control_system_designation"] },
  { rowId: "rc09:bh_earthing", section: "Электрика", category: "material", titleRu: "Заземление скважины", unitId: "set", formulaId: "bh_earthing_quantity_v1", expression: "bh_earthing_quantity_set", procurementEligible: true, titleParameterIds: ["bh_earthing_designation"] },
  { rowId: "rc09:bh_commissioning_consumables", section: "Расходники", category: "material", titleRu: "Монтажные и пусковые расходники", unitId: "set", formulaId: "bh_commissioning_consumable_quantity_v1", expression: "bh_commissioning_consumable_quantity_set", procurementEligible: true, titleParameterIds: ["bh_commissioning_consumable_designation"] },
  { rowId: "rc09:bh_geophysical_logging", section: "Исследования", category: "service", titleRu: "Геофизические исследования ствола", unitId: "m", formulaId: "bh_geophysical_logging_length_v1", expression: "bh_geophysical_logging_length_m", procurementEligible: true, titleParameterIds: ["bh_geophysical_logging_designation"] },
  { rowId: "rc09:bh_development", section: "Пусконаладка", category: "service", titleRu: "Развитие и эрлифтная прокачка скважины", unitId: "machine_hour", formulaId: "bh_development_machine_v1", expression: "bh_development_machine_h", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:bh_test_pumping", section: "Контроль", category: "service", titleRu: "Опытная откачка и определение дебита", unitId: "hour", formulaId: "bh_test_pumping_v1", expression: "bh_test_pumping_h", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:bh_water_analysis", section: "Контроль", category: "service", titleRu: "Лабораторный анализ воды", unitId: "test", formulaId: "bh_water_analysis_v1", expression: "bh_water_analysis_test_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:bh_disinfection", section: "Контроль", category: "service", titleRu: "Дезинфекция скважины", unitId: "cycle", formulaId: "bh_disinfection_v1", expression: "bh_disinfection_cycle_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:bh_electrical_tests", section: "Контроль", category: "service", titleRu: "Электрические испытания и проверка защит", unitId: "test", formulaId: "bh_electrical_test_v1", expression: "bh_electrical_test_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:bh_asbuilt_documents", section: "Документы", category: "service", titleRu: "Паспорт скважины и исполнительная документация", unitId: "document", formulaId: "bh_asbuilt_document_v1", expression: "bh_asbuilt_document_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:bh-casing-balance:installed-net", section: "Баланс обсадки", category: "material", titleRu: "Проектная длина обсадной колонны", unitId: "m", formulaId: "bh_casing_installed_net_v1", expression: "bh_casing_installed_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:bh-casing-balance:retained-spare", section: "Баланс обсадки", category: "material", titleRu: "Сохраняемый запас обсадной трубы", unitId: "m", formulaId: "bh_casing_retained_spare_v1", expression: "bh_casing_retained_spare_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:bh-casing-balance:total-need", section: "Баланс обсадки", category: "material", titleRu: "Общая потребность в обсадной трубе", unitId: "m", formulaId: "bh_casing_total_need_v1", expression: "bh_casing_installed_m+bh_casing_retained_spare_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:bh-casing-balance:joint-count", section: "Баланс обсадки", category: "material", titleRu: "Количество поставочных звеньев обсадной трубы", unitId: "piece", formulaId: "bh_casing_joint_count_v1", expression: "ceil((bh_casing_installed_m+bh_casing_retained_spare_m)/bh_casing_supplier_joint_length_m)", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:bh-casing-balance:remainder", section: "Баланс обсадки", category: "material", titleRu: "Остаток обсадной трубы после монтажа", unitId: "m", formulaId: "bh_casing_remainder_v1", expression: "ceil((bh_casing_installed_m+bh_casing_retained_spare_m)/bh_casing_supplier_joint_length_m)*bh_casing_supplier_joint_length_m-bh_casing_installed_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:bh-casing-balance:surplus-beyond-spare", section: "Баланс обсадки", category: "material", titleRu: "Свободный остаток обсадной трубы сверх запаса", unitId: "m", formulaId: "bh_casing_surplus_v1", expression: "max(0,ceil((bh_casing_installed_m+bh_casing_retained_spare_m)/bh_casing_supplier_joint_length_m)*bh_casing_supplier_joint_length_m-bh_casing_installed_m-bh_casing_retained_spare_m)", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:labor:bh-survey", section: "Труд", category: "construction_work", titleRu: "Разбивка и исполнительная съёмка", unitId: "man_hour", formulaId: "bh_survey_labor_v1", expression: "bh_survey_labor_h" },
  { rowId: "rc09:labor:bh-drilling", section: "Труд", category: "construction_work", titleRu: "Буровая бригада", unitId: "man_hour", formulaId: "bh_drilling_labor_v1", expression: "bh_drilling_labor_h" },
  { rowId: "rc09:labor:bh-mechanical", section: "Труд", category: "construction_work", titleRu: "Насос, колонна и оголовок", unitId: "man_hour", formulaId: "bh_mechanical_labor_v1", expression: "bh_mechanical_labor_h" },
  { rowId: "rc09:labor:bh-electrical-controls", section: "Труд", category: "construction_work", titleRu: "Кабель, управление и заземление", unitId: "man_hour", formulaId: "bh_electrical_controls_labor_v1", expression: "bh_electrical_controls_labor_h" },
  { rowId: "rc09:labor:bh-qa-documentation", section: "Труд", category: "construction_work", titleRu: "Испытания, анализы и документация", unitId: "man_hour", formulaId: "bh_qa_documentation_labor_v1", expression: "bh_qa_documentation_labor_h" },
  { rowId: "rc09:equipment:bh-drilling-rig", section: "Механизмы", category: "equipment", titleRu: "Буровая установка", unitId: "machine_hour", formulaId: "bh_drilling_rig_machine_v1", expression: "bh_drilling_rig_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:bh-crane", section: "Механизмы", category: "equipment", titleRu: "Кран", unitId: "machine_hour", formulaId: "bh_crane_machine_v1", expression: "bh_crane_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:bh-air-compressor", section: "Механизмы", category: "equipment", titleRu: "Компрессор для развития скважины", unitId: "machine_hour", formulaId: "bh_air_compressor_machine_v1", expression: "bh_air_compressor_machine_h", procurementEligible: true },
  { rowId: "rc09:logistics:bh-material-delivery", section: "Логистика", category: "service", titleRu: "Доставка труб, оборудования и материалов", unitId: "trip", formulaId: "bh_material_delivery_trip_v1", expression: "bh_material_delivery_trip_count", procurementEligible: true },
  { rowId: "rc09:logistics:bh-waste-removal", section: "Логистика", category: "service", titleRu: "Вывоз тары и отходов", unitId: "trip", formulaId: "bh_waste_removal_trip_v1", expression: "bh_waste_removal_trip_count", procurementEligible: true },
  { rowId: "rc09:bh_temporary_access", section: "Условные работы", category: "construction_work", titleRu: "Временная площадка и подъезд буровой", unitId: "m2", formulaId: "bh_temporary_access_area_v1", expression: "bh_temporary_access_area_m2", inclusionAst: equals("bh_temporary_access_mode", "REQUIRED"), titleParameterIds: ["bh_temporary_access_designation"] },
  { rowId: "rc09:bh_drilling_fluid_disposal", section: "Условная логистика", category: "service", titleRu: "Вывоз бурового шлама", unitId: "trip", formulaId: "bh_drilling_fluid_disposal_trip_v1", expression: "bh_drilling_fluid_disposal_trip_count", procurementEligible: true, inclusionAst: equals("bh_drilling_fluid_disposal_mode", "REQUIRED"), titleParameterIds: ["bh_drilling_fluid_disposal_designation"] },
  { rowId: "rc09:bh_standby_power", section: "Условные механизмы", category: "equipment", titleRu: "Резервное электропитание", unitId: "machine_hour", formulaId: "bh_standby_power_machine_v1", expression: "bh_standby_power_machine_h", procurementEligible: true, inclusionAst: equals("bh_standby_power_mode", "REQUIRED"), titleParameterIds: ["bh_standby_power_designation"] },
]);

export const BOREHOLE_WATER_SUPPLY_FORMULAS: readonly CanonicalEstimateFormulaDefinition[] =
  Object.freeze(ROW_SPECS.map((row) => {
    const compiled = compileFormulaGraph(row.expression);
    return {
      formula_id: row.formulaId, output_unit_id: row.unitId,
      expression_source: row.expression, ast: compiled.ast,
      input_parameter_ids: compiled.inputParameterIds,
      ast_sha256: "runtime-publisher-replaces-with-deterministic-sha256",
    };
  }));
export const BOREHOLE_WATER_SUPPLY_RESOURCES: readonly CanonicalEstimateResourceDefinition[] =
  Object.freeze(ROW_SPECS.map((row, ordinal) => {
    const resourceGraph = {
      formulaId: row.formulaId, normalizedUom: row.unitId,
      semanticOwnerId: `borehole-water-supply:${row.rowId}`, costOwner: "resource",
      ...(row.titleParameterIds ? {
        titleSpecificationParameterIds: row.titleParameterIds,
        titleSpecificationMode: "APPEND", titleSpecificationSeparator: " — ",
      } : {}),
      scopeContextParameterIds: KNOWN_SCOPE,
      costTreatment: row.costTreatment ?? "OWN_COST",
    };
    const sourceRole = "APPROVED_PRODUCTION_BOREHOLE_PROJECT_PACKAGE";
    const sourceMetadata = {
      truth_contract_version: "R3", synthetic: false, sourceRole,
      normativeTrace: [{
        sourceId: BOREHOLE_WATER_SUPPLY_SOURCE_ID,
        source_id: BOREHOLE_WATER_SUPPLY_SOURCE_ID,
        normId: BOREHOLE_WATER_SUPPLY_NORM_ID,
        norm_id: BOREHOLE_WATER_SUPPLY_NORM_ID,
        normVersion: BOREHOLE_WATER_SUPPLY_SOURCE_METADATA.source_document_version,
        source_title: BOREHOLE_WATER_SUPPLY_SOURCE_METADATA.source_title,
        exact_locator: BOREHOLE_WATER_SUPPLY_SOURCE_METADATA.exact_locator,
        source_definition_hash: BOREHOLE_WATER_SUPPLY_SOURCE_METADATA.definition_hash,
        sourceRole,
      }],
      excludedUnownedAssumptions: [
        "hard-coded 80 m borehole construction",
        "depth-derived casing, screen, gravel, grout, labor, mechanism or logistics quantity",
        "automatic temporary access, drilling-fluid disposal or standby power",
        "automatic retained spare or supplier joint", "invented price",
      ],
    };
    return {
      id: `resource-${row.rowId.replace(/:/gu, "-")}`, row_id: row.rowId,
      ordinal, section: row.section, category: row.category, title_ru: row.titleRu,
      unit_id: row.unitId, formula_id: row.formulaId,
      inclusion_ast: row.inclusionAst ?? literalTrue, resource_graph: resourceGraph,
      procurement_eligible: row.procurementEligible ?? false,
      cost_owner_id: row.rowId, source_metadata: sourceMetadata,
      row_sha256: estimateDeterministicHash({ row, ordinal, resourceGraph, sourceMetadata }),
    };
  }));

export const BOREHOLE_WATER_SUPPLY_SHORT_INPUT = Object.freeze({
  bh_borehole_count: 1, bh_borehole_designation: "BH-PW-180-DN250",
  bh_purpose: "POTABLE_WATER_PRODUCTION", bh_drilled_depth_m: 180,
  bh_final_bore_diameter_mm: 311, bh_casing_installed_m: 180,
  bh_casing_designation: "STEEL-CASING-DN250-EN10217",
  bh_screen_installed_m: 36, bh_screen_designation: "SS316L-VWIRE-DN200-0.75MM",
  bh_pump_installed_piece: 1, bh_pump_designation: "SUBMERSIBLE-45M3H-120M",
  bh_rising_main_installed_m: 160, bh_rising_main_designation: "SS304-DN80-PN16",
  bh_wellhead_installed_set: 1,
  bh_wellhead_designation: "SANITARY-WELLHEAD-DN250-DN80",
  ...BOREHOLE_WATER_SUPPLY_RUNTIME_INPUT,
});
export const BOREHOLE_WATER_SUPPLY_ACCEPTANCE_INPUT = Object.freeze({
  ...BOREHOLE_WATER_SUPPLY_SHORT_INPUT,
  bh_gravel_pack_designation: "FILTER-GRAVEL-2-5MM-WASHED", bh_gravel_pack_volume_m3: 28,
  bh_annular_grout_designation: "CEMENT-BENTONITE-GROUT", bh_annular_grout_volume_m3: 42,
  bh_centralizer_designation: "CASING-CENTRALIZER-DN250", bh_centralizer_quantity_piece: 60,
  bh_power_cable_designation: "SUBMERSIBLE-CABLE-4X25MM2", bh_power_cable_length_m: 180,
  bh_sanitary_seal_designation: "BENTONITE-SANITARY-SEAL", bh_sanitary_seal_volume_m3: 8,
  bh_concrete_apron_volume_m3: 18,
  bh_headworks_chamber_designation: "RC-WELLHEAD-CHAMBER-3X3",
  bh_headworks_chamber_quantity_set: 1,
  bh_valve_schedule_designation: "SS316-DN80-PN16-VALVE-SCHEDULE", bh_valve_quantity_piece: 5,
  bh_instrument_set_designation: "FLOW-PRESSURE-SAMPLING-INSTRUMENT-SET",
  bh_instrument_quantity_set: 1,
  bh_control_system_designation: "VFD-PLC-LEVEL-CONTROL-45M3H",
  bh_control_system_quantity_set: 1,
  bh_earthing_designation: "BOREHOLE-EARTHING-10OHM", bh_earthing_quantity_set: 1,
  bh_commissioning_consumable_designation: "BOREHOLE-GASKET-BOLT-LUBE-DISINFECTION-KIT",
  bh_commissioning_consumable_quantity_set: 1,
  bh_geophysical_logging_designation: "BOREHOLE-GEOPHYSICAL-LOG-SUITE",
  bh_geophysical_logging_length_m: 180, bh_development_machine_h: 48,
  bh_test_pumping_h: 72, bh_water_analysis_test_count: 3,
  bh_disinfection_cycle_count: 2, bh_electrical_test_count: 1,
  bh_asbuilt_document_count: 1, bh_survey_labor_h: 120, bh_drilling_labor_h: 1600,
  bh_mechanical_labor_h: 480, bh_electrical_controls_labor_h: 240,
  bh_qa_documentation_labor_h: 320, bh_drilling_rig_machine_h: 720,
  bh_crane_machine_h: 96, bh_air_compressor_machine_h: 160,
  bh_material_delivery_trip_count: 32, bh_waste_removal_trip_count: 24,
  bh_temporary_access_mode: "NOT_REQUIRED",
  bh_drilling_fluid_disposal_mode: "NOT_REQUIRED", bh_standby_power_mode: "NOT_REQUIRED",
});

export async function compileBoreholeWaterSupplyR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? BOREHOLE_WATER_SUPPLY_CATALOG_ID;
  if (catalogId !== BOREHOLE_WATER_SUPPLY_CATALOG_ID) {
    throw new Error(`BOREHOLE_WATER_SUPPLY_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile", compilerVersion: "canonical-estimate-compiler.borehole-water-supply-r1",
    catalogId, primaryMeasureParameterId: "bh_borehole_count",
    parameterDefinitions: [...BOREHOLE_WATER_SUPPLY_PARAMETERS],
    formulaDefinitions: [...BOREHOLE_WATER_SUPPLY_FORMULAS],
    resourceDefinitions: [...BOREHOLE_WATER_SUPPLY_RESOURCES], submittedParameters,
    confirmedParameters: { ...BOREHOLE_WATER_SUPPLY_RUNTIME_INPUT }, currencyCode: "KGS",
    priceItems: [], maximumResourceRows: 45,
    hashJson: async (value) => JSON.stringify(value),
  });
}
