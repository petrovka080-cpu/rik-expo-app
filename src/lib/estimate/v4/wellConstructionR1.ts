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
export const WELL_CONSTRUCTION_CATALOG_ID = "canonical-work:expanded:well_construction";
export const WELL_CONSTRUCTION_SOURCE_ID =
  "project_shallow_rc_water_intake_well_joint_seal_balance_v1";
export const WELL_CONSTRUCTION_NORM_ID =
  "norm:project:shallow_rc_water_intake_well_joint_seal_balance:v1";
export const WELL_CONSTRUCTION_SOURCE_METADATA = Object.freeze({
  source_title: "Утверждённый гидрогеологический проект мелкого водозаборного шахтного колодца, чертежи шахты и обделки, спецификации насосов и программа испытаний",
  source_authority: "Гидрогеолог, проектировщики строительной, механической и электрической частей, лаборатория, поставщики и утверждающий инженер проекта",
  source_document_version: "PROJECT_SHALLOW_RC_SHAFT_WATER_INTAKE_WELL_LINING_FILTER_PUMPS_QA_LOGISTICS_BALANCE_S27_24",
  definition_hash: "1095c2c53689b2f7bc085cd33650adcb30ff9b8769d75361cae2b93366b987ae",
  exact_locator: "1 шахтный колодец WIW-RC-DN2000-18M, глубина 18 м, внутренний диаметр 2000 мм, 20 колец RC-WELL-RING-KS20.9, 65 м BENTONITE-JOINT-SEAL-20X25, 2 насоса SUBMERSIBLE-15M3H-35M, 30 м HDPE-PE100-SDR17-OD63 и плита RC-WELL-COVER-PP20-2",
  use_restriction: "Глубина не определяет автоматически кольца, фильтр, санитарный замок, труд, механизмы или логистику. Крепление, дополнительное водопонижение и временный подъезд включаются только по проекту. Глубокая буровая скважина, наружная сеть, резервуар, водоподготовка, канализация и цены исключены.",
  source_kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
  artifact_sha256: "1095c2c53689b2f7bc085cd33650adcb30ff9b8769d75361cae2b93366b987ae",
});

const KNOWN_SCOPE = [
  "wiw_well_count", "wiw_well_designation", "wiw_well_type", "wiw_purpose",
  "wiw_shaft_depth_m", "wiw_internal_diameter_mm",
  "wiw_lining_ring_installed_piece", "wiw_lining_ring_designation",
  "wiw_joint_seal_installed_m", "wiw_joint_seal_designation",
  "wiw_pump_installed_piece", "wiw_pump_designation",
  "wiw_discharge_pipe_installed_m", "wiw_discharge_pipe_designation",
  "wiw_cover_slab_installed_piece", "wiw_cover_slab_designation",
];
const VISIBLE_PRELIMINARY_PROFILE = new Set([
  "wiw_joint_seal_retained_spare_m", "wiw_joint_seal_supplier_roll_length_m",
]);
const CONDITIONAL_DETAILS = new Set([
  "wiw_excavation_shoring_designation", "wiw_excavation_shoring_area_m2",
  "wiw_groundwater_dewatering_designation", "wiw_groundwater_dewatering_machine_h",
  "wiw_temporary_access_designation", "wiw_temporary_access_area_m2",
]);
const PARAMETER_SPECS = Object.freeze([
  ["wiw_well_count", "Количество шахтных водозаборных колодцев", "integer", "piece", null],
  ["wiw_well_designation", "Марка шахтного колодца", "text", null, null],
  ["wiw_well_type", "Тип шахтного колодца", "enum", null, ["SHALLOW_RC_SHAFT_INFILTRATION_WELL"]],
  ["wiw_purpose", "Назначение колодца", "enum", null, ["POTABLE_WATER_INTAKE"]],
  ["wiw_shaft_depth_m", "Проектная глубина шахты", "decimal", "m", null],
  ["wiw_internal_diameter_mm", "Внутренний диаметр шахты", "decimal", "mm", null],
  ["wiw_lining_ring_installed_piece", "Количество колец обделки", "integer", "piece", null],
  ["wiw_lining_ring_designation", "Марка колец обделки", "text", null, null],
  ["wiw_joint_seal_installed_m", "Длина уплотнения стыков колец", "decimal", "m", null],
  ["wiw_joint_seal_designation", "Марка уплотнения стыков", "text", null, null],
  ["wiw_pump_installed_piece", "Количество погружных насосов", "integer", "piece", null],
  ["wiw_pump_designation", "Марка погружного насоса", "text", null, null],
  ["wiw_discharge_pipe_installed_m", "Длина напорной трубы в границе колодца", "decimal", "m", null],
  ["wiw_discharge_pipe_designation", "Марка напорной трубы", "text", null, null],
  ["wiw_cover_slab_installed_piece", "Количество плит покрытия", "integer", "piece", null],
  ["wiw_cover_slab_designation", "Марка плиты покрытия", "text", null, null],
  ["wiw_joint_seal_retained_spare_m", "Сохраняемый запас уплотнения стыков", "decimal", "m", null],
  ["wiw_joint_seal_supplier_roll_length_m", "Длина уплотнения в поставочном рулоне", "decimal", "m", null],
  ["wiw_base_filter_gravel_designation", "Марка гравия донного фильтра", "text", null, null],
  ["wiw_base_filter_gravel_volume_m3", "Объём гравия донного фильтра", "decimal", "m3", null],
  ["wiw_base_filter_geotextile_designation", "Марка геотекстиля донного фильтра", "text", null, null],
  ["wiw_base_filter_geotextile_area_m2", "Площадь геотекстиля донного фильтра", "decimal", "m2", null],
  ["wiw_bottom_concrete_volume_m3", "Объём бетона основания", "decimal", "m3", null],
  ["wiw_sanitary_clay_seal_designation", "Материал санитарного глиняного замка", "text", null, null],
  ["wiw_sanitary_clay_seal_volume_m3", "Объём санитарного глиняного замка", "decimal", "m3", null],
  ["wiw_external_backfill_designation", "Материал обратной засыпки", "text", null, null],
  ["wiw_external_backfill_volume_m3", "Объём обратной засыпки", "decimal", "m3", null],
  ["wiw_hatch_designation", "Марка санитарного люка", "text", null, null],
  ["wiw_hatch_quantity_piece", "Количество санитарных люков", "integer", "piece", null],
  ["wiw_ladder_designation", "Марка лестницы", "text", null, null],
  ["wiw_ladder_installed_m", "Длина лестницы", "decimal", "m", null],
  ["wiw_valve_schedule_designation", "Спецификация арматуры", "text", null, null],
  ["wiw_valve_quantity_piece", "Количество единиц арматуры", "integer", "piece", null],
  ["wiw_instrument_set_designation", "Комплект КИП и пробоотбора", "text", null, null],
  ["wiw_instrument_quantity_set", "Количество комплектов КИП", "integer", "set", null],
  ["wiw_control_panel_designation", "Шкаф управления и защиты насосов", "text", null, null],
  ["wiw_control_panel_quantity_set", "Количество шкафов управления", "integer", "set", null],
  ["wiw_power_cable_designation", "Марка силового кабеля", "text", null, null],
  ["wiw_power_cable_length_m", "Длина силового кабеля", "decimal", "m", null],
  ["wiw_earthing_designation", "Система заземления", "text", null, null],
  ["wiw_earthing_quantity_set", "Количество комплектов заземления", "integer", "set", null],
  ["wiw_consumable_designation", "Монтажные и пусковые расходники", "text", null, null],
  ["wiw_consumable_quantity_set", "Количество комплектов расходников", "integer", "set", null],
  ["wiw_cleaning_cycle_count", "Количество циклов очистки и промывки", "integer", "cycle", null],
  ["wiw_pumping_test_h", "Продолжительность опытной откачки", "decimal", "hour", null],
  ["wiw_water_analysis_test_count", "Количество лабораторных анализов воды", "integer", "test", null],
  ["wiw_disinfection_cycle_count", "Количество циклов дезинфекции", "integer", "cycle", null],
  ["wiw_electrical_test_count", "Количество электрических испытаний", "integer", "test", null],
  ["wiw_asbuilt_document_count", "Комплекты исполнительной документации", "integer", "document", null],
  ["wiw_survey_labor_h", "Труд на разбивку и исполнительную съёмку", "decimal", "man_hour", null],
  ["wiw_excavation_lining_labor_h", "Труд на шахту, основание и обделку", "decimal", "man_hour", null],
  ["wiw_mechanical_labor_h", "Труд на насосы, трубу и арматуру", "decimal", "man_hour", null],
  ["wiw_electrical_controls_labor_h", "Труд на кабель, управление и заземление", "decimal", "man_hour", null],
  ["wiw_qa_documentation_labor_h", "Труд на испытания, анализы и документацию", "decimal", "man_hour", null],
  ["wiw_excavator_crane_machine_h", "Работа экскаватора-крана", "decimal", "machine_hour", null],
  ["wiw_construction_pump_machine_h", "Работа строительного водоотлива", "decimal", "machine_hour", null],
  ["wiw_compactor_machine_h", "Работа уплотняющего механизма", "decimal", "machine_hour", null],
  ["wiw_material_delivery_trip_count", "Рейсы доставки", "integer", "trip", null],
  ["wiw_waste_removal_trip_count", "Рейсы вывоза грунта и отходов", "integer", "trip", null],
  ["wiw_excavation_shoring_mode", "Проектное крепление шахты требуется", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["wiw_excavation_shoring_designation", "Система крепления шахты", "text", null, null],
  ["wiw_excavation_shoring_area_m2", "Площадь крепления шахты", "decimal", "m2", null],
  ["wiw_groundwater_dewatering_mode", "Дополнительное водопонижение требуется", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["wiw_groundwater_dewatering_designation", "Система дополнительного водопонижения", "text", null, null],
  ["wiw_groundwater_dewatering_machine_h", "Работа дополнительного водопонижения", "decimal", "machine_hour", null],
  ["wiw_temporary_access_mode", "Временная площадка и подъезд требуются", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["wiw_temporary_access_designation", "Конструкция временной площадки", "text", null, null],
  ["wiw_temporary_access_area_m2", "Площадь временной площадки", "decimal", "m2", null],
] as const);

function conditionalConstraints(parameterId: string): Json {
  for (const branch of ["excavation_shoring", "groundwater_dewatering",
    "temporary_access"] as const) {
    if (parameterId.startsWith(`wiw_${branch}_`) && parameterId !== `wiw_${branch}_mode`) {
      return {
        requiredWhen: { kind: "equals", parameterId: `wiw_${branch}_mode`, value: "REQUIRED" },
        forbiddenWhen: { kind: "equals", parameterId: `wiw_${branch}_mode`, value: "NOT_REQUIRED" },
      };
    }
  }
  return {};
}

export type WellConstructionParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number; unit_id: string | null; title_ru: string; truth_metadata: Json;
};
export const WELL_CONSTRUCTION_PARAMETERS: readonly WellConstructionParameter[] =
  Object.freeze(PARAMETER_SPECS.map(
    ([parameterId, titleRu, valueType, unitId, enumValues], ordinal) => ({
      parameter_id: parameterId, ordinal, value_type: valueType, unit_id: unitId,
      title_ru: titleRu, required: !CONDITIONAL_DETAILS.has(parameterId), default_value: null,
      constraints_json: {
        ...(enumValues ? { values: enumValues }
          : valueType === "decimal" || valueType === "integer"
            ? { min: parameterId === "wiw_joint_seal_retained_spare_m" ? 0
              : valueType === "integer" ? 1 : 0.000_001 }
            : valueType === "text" ? { minLength: 1, maxLength: 1_000 } : {}),
        ...conditionalConstraints(parameterId),
      },
      truth_metadata: {
        contract: "rik-expo-app.well-construction-r1",
        semantic_parameter_key: `well-construction:${parameterId}`,
        visibility_role: "USER_INPUT",
        value_source_role: KNOWN_SCOPE.includes(parameterId) ? "USER_INPUT"
          : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
            ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE" : "PROJECT_SPECIFIC_INPUT",
        input_origin_class: KNOWN_SCOPE.includes(parameterId) ? "KNOWN_WORK_SCOPE"
          : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
            ? "VISIBLE_PRELIMINARY_PROCUREMENT_BALANCE"
            : "APPROVED_SHAFT_WELL_PROJECT_BOQ_OR_TEST_DOCUMENTATION",
        preliminary_compilation_allowed: true,
        source_confirmation_required: !KNOWN_SCOPE.includes(parameterId)
          && !VISIBLE_PRELIMINARY_PROFILE.has(parameterId),
        guide: {
          guide_kind: KNOWN_SCOPE.includes(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
          guide_short_ru: KNOWN_SCOPE.includes(parameterId)
            ? `${titleRu}: укажите по явному запросу и конструкции выбранного шахтного колодца.`
            : `${titleRu}: укажите по гидрогеологическому проекту, чертежам, спецификации, ППР или программе испытаний.`,
          source_role: KNOWN_SCOPE.includes(parameterId) ? "USER_SUPPLIED_OR_APPROVED_SHAFT_WELL_SCOPE"
            : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
              ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE"
              : "APPROVED_SHAFT_WATER_INTAKE_WELL_PROJECT_DOCUMENTATION",
          source_document: WELL_CONSTRUCTION_SOURCE_ID,
          source_locator: WELL_CONSTRUCTION_SOURCE_METADATA.exact_locator,
          guide_version: "well-construction-r1",
          source_snapshot_hash: WELL_CONSTRUCTION_SOURCE_METADATA.artifact_sha256,
          applicability: "Только выбранный мелкий шахтный водозаборный колодец; глубокая буровая скважина, наружные сети, накопители, водоподготовка и канализация исключены.",
          verified_at: "2026-10-02T00:00:00+06:00",
          guide_validation_policy: "DEFER_MISSING_PROJECT_VALUE_ROW_LOCALLY_REJECT_INVALID_SUPPLIED_VALUE",
        },
        hidden_default_forbidden: true,
        runtime_profile_value: VISIBLE_PRELIMINARY_PROFILE.has(parameterId),
        synthetic: false,
      },
    })),
  );

export const WELL_CONSTRUCTION_RUNTIME_INPUT = Object.freeze({
  wiw_joint_seal_retained_spare_m: 0,
  wiw_joint_seal_supplier_roll_length_m: 1,
});
export const WELL_CONSTRUCTION_RUNTIME_CLASSIFICATION = Object.freeze(Object.fromEntries(
  Object.keys(WELL_CONSTRUCTION_RUNTIME_INPUT).map((id) => [id, "ASSUMPTION"]),
) as Readonly<Record<string, "ASSUMPTION">>);
export const WELL_CONSTRUCTION_RUNTIME_SOURCE_IDS = Object.freeze(Object.fromEntries(
  Object.keys(WELL_CONSTRUCTION_RUNTIME_INPUT).map((id) => [id, [WELL_CONSTRUCTION_SOURCE_ID]]),
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
  { rowId: "rc09:wiw_acceptance", section: "Работы", category: "construction_work", titleRu: "Устройство, испытание и приёмка шахтного водозаборного колодца", unitId: "piece", formulaId: "wiw_acceptance_count_v1", expression: "wiw_well_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wiw_shaft_excavation", section: "Земляные работы", category: "construction_work", titleRu: "Разработка шахты колодца", unitId: "m", formulaId: "wiw_shaft_depth_v1", expression: "wiw_shaft_depth_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wiw_lining_rings", section: "Материалы", category: "material", titleRu: "Железобетонные кольца обделки", unitId: "piece", formulaId: "wiw_lining_ring_quantity_v1", expression: "wiw_lining_ring_installed_piece", procurementEligible: true, titleParameterIds: ["wiw_lining_ring_designation"] },
  { rowId: "rc09:wiw_joint_seal", section: "Материалы", category: "material", titleRu: "Уплотнение стыков колец", unitId: "m", formulaId: "wiw_joint_seal_order_length_v1", expression: "ceil((wiw_joint_seal_installed_m+wiw_joint_seal_retained_spare_m)/wiw_joint_seal_supplier_roll_length_m)*wiw_joint_seal_supplier_roll_length_m", procurementEligible: true, titleParameterIds: ["wiw_joint_seal_designation"] },
  { rowId: "rc09:wiw_base_filter_gravel", section: "Материалы", category: "material", titleRu: "Гравий донного фильтра", unitId: "m3", formulaId: "wiw_base_filter_gravel_volume_v1", expression: "wiw_base_filter_gravel_volume_m3", procurementEligible: true, titleParameterIds: ["wiw_base_filter_gravel_designation"] },
  { rowId: "rc09:wiw_base_filter_geotextile", section: "Материалы", category: "material", titleRu: "Геотекстиль донного фильтра", unitId: "m2", formulaId: "wiw_base_filter_geotextile_area_v1", expression: "wiw_base_filter_geotextile_area_m2", procurementEligible: true, titleParameterIds: ["wiw_base_filter_geotextile_designation"] },
  { rowId: "rc09:wiw_bottom_concrete", section: "Материалы", category: "material", titleRu: "Бетон основания шахты", unitId: "m3", formulaId: "wiw_bottom_concrete_volume_v1", expression: "wiw_bottom_concrete_volume_m3", procurementEligible: true },
  { rowId: "rc09:wiw_sanitary_clay_seal", section: "Материалы", category: "material", titleRu: "Санитарный глиняный замок", unitId: "m3", formulaId: "wiw_sanitary_clay_seal_volume_v1", expression: "wiw_sanitary_clay_seal_volume_m3", procurementEligible: true, titleParameterIds: ["wiw_sanitary_clay_seal_designation"] },
  { rowId: "rc09:wiw_external_backfill", section: "Материалы", category: "material", titleRu: "Обратная засыпка пазух", unitId: "m3", formulaId: "wiw_external_backfill_volume_v1", expression: "wiw_external_backfill_volume_m3", procurementEligible: true, titleParameterIds: ["wiw_external_backfill_designation"] },
  { rowId: "rc09:wiw_cover_slab", section: "Конструкции", category: "material", titleRu: "Плита покрытия колодца", unitId: "piece", formulaId: "wiw_cover_slab_quantity_v1", expression: "wiw_cover_slab_installed_piece", procurementEligible: true, titleParameterIds: ["wiw_cover_slab_designation"] },
  { rowId: "rc09:wiw_hatch", section: "Комплектующие", category: "material", titleRu: "Герметичный санитарный люк", unitId: "piece", formulaId: "wiw_hatch_quantity_v1", expression: "wiw_hatch_quantity_piece", procurementEligible: true, titleParameterIds: ["wiw_hatch_designation"] },
  { rowId: "rc09:wiw_ladder", section: "Комплектующие", category: "material", titleRu: "Стационарная лестница", unitId: "m", formulaId: "wiw_ladder_length_v1", expression: "wiw_ladder_installed_m", procurementEligible: true, titleParameterIds: ["wiw_ladder_designation"] },
  { rowId: "rc09:wiw_pumps", section: "Оборудование", category: "equipment", titleRu: "Погружные насосы", unitId: "piece", formulaId: "wiw_pump_quantity_v1", expression: "wiw_pump_installed_piece", procurementEligible: true, titleParameterIds: ["wiw_pump_designation"] },
  { rowId: "rc09:wiw_discharge_pipe", section: "Материалы", category: "material", titleRu: "Напорная труба в границе колодца", unitId: "m", formulaId: "wiw_discharge_pipe_length_v1", expression: "wiw_discharge_pipe_installed_m", procurementEligible: true, titleParameterIds: ["wiw_discharge_pipe_designation"] },
  { rowId: "rc09:wiw_valves", section: "Комплектующие", category: "material", titleRu: "Запорная и обратная арматура", unitId: "piece", formulaId: "wiw_valve_quantity_v1", expression: "wiw_valve_quantity_piece", procurementEligible: true, titleParameterIds: ["wiw_valve_schedule_designation"] },
  { rowId: "rc09:wiw_instruments", section: "Оборудование", category: "equipment", titleRu: "КИП и узел пробоотбора", unitId: "set", formulaId: "wiw_instrument_quantity_v1", expression: "wiw_instrument_quantity_set", procurementEligible: true, titleParameterIds: ["wiw_instrument_set_designation"] },
  { rowId: "rc09:wiw_control_panel", section: "Оборудование", category: "equipment", titleRu: "Шкаф управления и защиты насосов", unitId: "set", formulaId: "wiw_control_panel_quantity_v1", expression: "wiw_control_panel_quantity_set", procurementEligible: true, titleParameterIds: ["wiw_control_panel_designation"] },
  { rowId: "rc09:wiw_power_cable", section: "Электрика", category: "material", titleRu: "Силовой кабель насосов", unitId: "m", formulaId: "wiw_power_cable_length_v1", expression: "wiw_power_cable_length_m", procurementEligible: true, titleParameterIds: ["wiw_power_cable_designation"] },
  { rowId: "rc09:wiw_earthing", section: "Электрика", category: "material", titleRu: "Заземление колодца", unitId: "set", formulaId: "wiw_earthing_quantity_v1", expression: "wiw_earthing_quantity_set", procurementEligible: true, titleParameterIds: ["wiw_earthing_designation"] },
  { rowId: "rc09:wiw_consumables", section: "Расходники", category: "material", titleRu: "Монтажные и пусковые расходники", unitId: "set", formulaId: "wiw_consumable_quantity_v1", expression: "wiw_consumable_quantity_set", procurementEligible: true, titleParameterIds: ["wiw_consumable_designation"] },
  { rowId: "rc09:wiw_cleaning", section: "Пусконаладка", category: "service", titleRu: "Очистка и промывка колодца", unitId: "cycle", formulaId: "wiw_cleaning_cycle_v1", expression: "wiw_cleaning_cycle_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wiw_pumping_test", section: "Контроль", category: "service", titleRu: "Опытная откачка и определение дебита", unitId: "hour", formulaId: "wiw_pumping_test_v1", expression: "wiw_pumping_test_h", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wiw_water_analysis", section: "Контроль", category: "service", titleRu: "Лабораторный анализ воды", unitId: "test", formulaId: "wiw_water_analysis_v1", expression: "wiw_water_analysis_test_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wiw_disinfection", section: "Контроль", category: "service", titleRu: "Дезинфекция колодца", unitId: "cycle", formulaId: "wiw_disinfection_v1", expression: "wiw_disinfection_cycle_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wiw_electrical_tests", section: "Контроль", category: "service", titleRu: "Электрические испытания и проверка защит", unitId: "test", formulaId: "wiw_electrical_test_v1", expression: "wiw_electrical_test_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wiw_asbuilt_documents", section: "Документы", category: "service", titleRu: "Паспорт и исполнительная документация колодца", unitId: "document", formulaId: "wiw_asbuilt_document_v1", expression: "wiw_asbuilt_document_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wiw-seal-balance:installed-net", section: "Баланс уплотнения", category: "material", titleRu: "Проектная длина уплотнения стыков", unitId: "m", formulaId: "wiw_joint_seal_installed_net_v1", expression: "wiw_joint_seal_installed_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wiw-seal-balance:retained-spare", section: "Баланс уплотнения", category: "material", titleRu: "Сохраняемый запас уплотнения", unitId: "m", formulaId: "wiw_joint_seal_retained_spare_v1", expression: "wiw_joint_seal_retained_spare_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wiw-seal-balance:total-need", section: "Баланс уплотнения", category: "material", titleRu: "Общая потребность в уплотнении", unitId: "m", formulaId: "wiw_joint_seal_total_need_v1", expression: "wiw_joint_seal_installed_m+wiw_joint_seal_retained_spare_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wiw-seal-balance:roll-count", section: "Баланс уплотнения", category: "material", titleRu: "Количество поставочных рулонов", unitId: "piece", formulaId: "wiw_joint_seal_roll_count_v1", expression: "ceil((wiw_joint_seal_installed_m+wiw_joint_seal_retained_spare_m)/wiw_joint_seal_supplier_roll_length_m)", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wiw-seal-balance:remainder", section: "Баланс уплотнения", category: "material", titleRu: "Остаток после монтажа", unitId: "m", formulaId: "wiw_joint_seal_remainder_v1", expression: "ceil((wiw_joint_seal_installed_m+wiw_joint_seal_retained_spare_m)/wiw_joint_seal_supplier_roll_length_m)*wiw_joint_seal_supplier_roll_length_m-wiw_joint_seal_installed_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wiw-seal-balance:surplus-beyond-spare", section: "Баланс уплотнения", category: "material", titleRu: "Свободный остаток сверх запаса", unitId: "m", formulaId: "wiw_joint_seal_surplus_v1", expression: "max(0,ceil((wiw_joint_seal_installed_m+wiw_joint_seal_retained_spare_m)/wiw_joint_seal_supplier_roll_length_m)*wiw_joint_seal_supplier_roll_length_m-wiw_joint_seal_installed_m-wiw_joint_seal_retained_spare_m)", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:labor:wiw-survey", section: "Труд", category: "construction_work", titleRu: "Разбивка и исполнительная съёмка", unitId: "man_hour", formulaId: "wiw_survey_labor_v1", expression: "wiw_survey_labor_h" },
  { rowId: "rc09:labor:wiw-excavation-lining", section: "Труд", category: "construction_work", titleRu: "Шахта, основание, обделка и засыпка", unitId: "man_hour", formulaId: "wiw_excavation_lining_labor_v1", expression: "wiw_excavation_lining_labor_h" },
  { rowId: "rc09:labor:wiw-mechanical", section: "Труд", category: "construction_work", titleRu: "Насосы, труба, арматура и КИП", unitId: "man_hour", formulaId: "wiw_mechanical_labor_v1", expression: "wiw_mechanical_labor_h" },
  { rowId: "rc09:labor:wiw-electrical-controls", section: "Труд", category: "construction_work", titleRu: "Кабель, управление и заземление", unitId: "man_hour", formulaId: "wiw_electrical_controls_labor_v1", expression: "wiw_electrical_controls_labor_h" },
  { rowId: "rc09:labor:wiw-qa-documentation", section: "Труд", category: "construction_work", titleRu: "Испытания, анализы и документация", unitId: "man_hour", formulaId: "wiw_qa_documentation_labor_v1", expression: "wiw_qa_documentation_labor_h" },
  { rowId: "rc09:equipment:wiw-excavator-crane", section: "Механизмы", category: "equipment", titleRu: "Экскаватор-кран", unitId: "machine_hour", formulaId: "wiw_excavator_crane_machine_v1", expression: "wiw_excavator_crane_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:wiw-construction-pump", section: "Механизмы", category: "equipment", titleRu: "Строительный водоотлив", unitId: "machine_hour", formulaId: "wiw_construction_pump_machine_v1", expression: "wiw_construction_pump_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:wiw-compactor", section: "Механизмы", category: "equipment", titleRu: "Механизм уплотнения засыпки", unitId: "machine_hour", formulaId: "wiw_compactor_machine_v1", expression: "wiw_compactor_machine_h", procurementEligible: true },
  { rowId: "rc09:logistics:wiw-material-delivery", section: "Логистика", category: "service", titleRu: "Доставка колец, оборудования и материалов", unitId: "trip", formulaId: "wiw_material_delivery_trip_v1", expression: "wiw_material_delivery_trip_count", procurementEligible: true },
  { rowId: "rc09:logistics:wiw-waste-removal", section: "Логистика", category: "service", titleRu: "Вывоз грунта, тары и отходов", unitId: "trip", formulaId: "wiw_waste_removal_trip_v1", expression: "wiw_waste_removal_trip_count", procurementEligible: true },
  { rowId: "rc09:wiw_excavation_shoring", section: "Условные работы", category: "construction_work", titleRu: "Проектное крепление шахты", unitId: "m2", formulaId: "wiw_excavation_shoring_area_v1", expression: "wiw_excavation_shoring_area_m2", inclusionAst: equals("wiw_excavation_shoring_mode", "REQUIRED"), titleParameterIds: ["wiw_excavation_shoring_designation"] },
  { rowId: "rc09:wiw_groundwater_dewatering", section: "Условные механизмы", category: "equipment", titleRu: "Дополнительное проектное водопонижение", unitId: "machine_hour", formulaId: "wiw_groundwater_dewatering_machine_v1", expression: "wiw_groundwater_dewatering_machine_h", procurementEligible: true, inclusionAst: equals("wiw_groundwater_dewatering_mode", "REQUIRED"), titleParameterIds: ["wiw_groundwater_dewatering_designation"] },
  { rowId: "rc09:wiw_temporary_access", section: "Условные работы", category: "construction_work", titleRu: "Временная площадка и подъезд", unitId: "m2", formulaId: "wiw_temporary_access_area_v1", expression: "wiw_temporary_access_area_m2", inclusionAst: equals("wiw_temporary_access_mode", "REQUIRED"), titleParameterIds: ["wiw_temporary_access_designation"] },
]);

export const WELL_CONSTRUCTION_FORMULAS: readonly CanonicalEstimateFormulaDefinition[] =
  Object.freeze(ROW_SPECS.map((row) => {
    const compiled = compileFormulaGraph(row.expression);
    return {
      formula_id: row.formulaId, output_unit_id: row.unitId,
      expression_source: row.expression, ast: compiled.ast,
      input_parameter_ids: compiled.inputParameterIds,
      ast_sha256: "runtime-publisher-replaces-with-deterministic-sha256",
    };
  }));
export const WELL_CONSTRUCTION_RESOURCES: readonly CanonicalEstimateResourceDefinition[] =
  Object.freeze(ROW_SPECS.map((row, ordinal) => {
    const resourceGraph = {
      formulaId: row.formulaId, normalizedUom: row.unitId,
      semanticOwnerId: `well-construction:${row.rowId}`, costOwner: "resource",
      ...(row.titleParameterIds ? {
        titleSpecificationParameterIds: row.titleParameterIds,
        titleSpecificationMode: "APPEND", titleSpecificationSeparator: " — ",
      } : {}),
      scopeContextParameterIds: KNOWN_SCOPE,
      costTreatment: row.costTreatment ?? "OWN_COST",
    };
    const sourceRole = "APPROVED_SHALLOW_SHAFT_WATER_INTAKE_WELL_PROJECT_PACKAGE";
    const sourceMetadata = {
      truth_contract_version: "R3", synthetic: false, sourceRole,
      normativeTrace: [{
        sourceId: WELL_CONSTRUCTION_SOURCE_ID, source_id: WELL_CONSTRUCTION_SOURCE_ID,
        normId: WELL_CONSTRUCTION_NORM_ID, norm_id: WELL_CONSTRUCTION_NORM_ID,
        normVersion: WELL_CONSTRUCTION_SOURCE_METADATA.source_document_version,
        source_title: WELL_CONSTRUCTION_SOURCE_METADATA.source_title,
        exact_locator: WELL_CONSTRUCTION_SOURCE_METADATA.exact_locator,
        source_definition_hash: WELL_CONSTRUCTION_SOURCE_METADATA.definition_hash,
        sourceRole,
      }],
      excludedUnownedAssumptions: [
        "hard-coded 80 m drilled well", "depth-derived lining, filter or backfill",
        "depth-derived labor, mechanism or logistics quantity",
        "automatic excavation shoring, additional dewatering or temporary access",
        "automatic retained spare or supplier roll", "invented price",
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

export const WELL_CONSTRUCTION_SHORT_INPUT = Object.freeze({
  wiw_well_count: 1, wiw_well_designation: "WIW-RC-DN2000-18M",
  wiw_well_type: "SHALLOW_RC_SHAFT_INFILTRATION_WELL",
  wiw_purpose: "POTABLE_WATER_INTAKE", wiw_shaft_depth_m: 18,
  wiw_internal_diameter_mm: 2000, wiw_lining_ring_installed_piece: 20,
  wiw_lining_ring_designation: "RC-WELL-RING-KS20.9",
  wiw_joint_seal_installed_m: 65,
  wiw_joint_seal_designation: "BENTONITE-JOINT-SEAL-20X25",
  wiw_pump_installed_piece: 2, wiw_pump_designation: "SUBMERSIBLE-15M3H-35M",
  wiw_discharge_pipe_installed_m: 30,
  wiw_discharge_pipe_designation: "HDPE-PE100-SDR17-OD63",
  wiw_cover_slab_installed_piece: 1,
  wiw_cover_slab_designation: "RC-WELL-COVER-PP20-2",
  ...WELL_CONSTRUCTION_RUNTIME_INPUT,
});
export const WELL_CONSTRUCTION_ACCEPTANCE_INPUT = Object.freeze({
  ...WELL_CONSTRUCTION_SHORT_INPUT,
  wiw_base_filter_gravel_designation: "FILTER-GRAVEL-GRADED-10-40MM",
  wiw_base_filter_gravel_volume_m3: 12,
  wiw_base_filter_geotextile_designation: "GEOTEXTILE-300G-M2",
  wiw_base_filter_geotextile_area_m2: 55, wiw_bottom_concrete_volume_m3: 6,
  wiw_sanitary_clay_seal_designation: "COMPACTED-CLAY-SANITARY-SEAL",
  wiw_sanitary_clay_seal_volume_m3: 22,
  wiw_external_backfill_designation: "SELECTED-SOIL-COMPACTED",
  wiw_external_backfill_volume_m3: 145,
  wiw_hatch_designation: "SANITARY-HATCH-DN800-LOCKABLE", wiw_hatch_quantity_piece: 1,
  wiw_ladder_designation: "SS304-FIXED-LADDER-400MM", wiw_ladder_installed_m: 18,
  wiw_valve_schedule_designation: "SS316-DN50-PN16-VALVE-SCHEDULE",
  wiw_valve_quantity_piece: 6,
  wiw_instrument_set_designation: "FLOW-PRESSURE-LEVEL-SAMPLING-SET",
  wiw_instrument_quantity_set: 1,
  wiw_control_panel_designation: "DUTY-STANDBY-PUMP-CONTROL-2X15M3H",
  wiw_control_panel_quantity_set: 1,
  wiw_power_cable_designation: "SUBMERSIBLE-CABLE-4X10MM2", wiw_power_cable_length_m: 55,
  wiw_earthing_designation: "SHAFT-WELL-EARTHING-10OHM", wiw_earthing_quantity_set: 1,
  wiw_consumable_designation: "SHAFT-WELL-GASKET-BOLT-LUBE-DISINFECTION-KIT",
  wiw_consumable_quantity_set: 1, wiw_cleaning_cycle_count: 2,
  wiw_pumping_test_h: 48, wiw_water_analysis_test_count: 3,
  wiw_disinfection_cycle_count: 2, wiw_electrical_test_count: 1,
  wiw_asbuilt_document_count: 1, wiw_survey_labor_h: 80,
  wiw_excavation_lining_labor_h: 960, wiw_mechanical_labor_h: 280,
  wiw_electrical_controls_labor_h: 160, wiw_qa_documentation_labor_h: 200,
  wiw_excavator_crane_machine_h: 240, wiw_construction_pump_machine_h: 120,
  wiw_compactor_machine_h: 80, wiw_material_delivery_trip_count: 24,
  wiw_waste_removal_trip_count: 18, wiw_excavation_shoring_mode: "NOT_REQUIRED",
  wiw_groundwater_dewatering_mode: "NOT_REQUIRED", wiw_temporary_access_mode: "NOT_REQUIRED",
});

export async function compileWellConstructionR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? WELL_CONSTRUCTION_CATALOG_ID;
  if (catalogId !== WELL_CONSTRUCTION_CATALOG_ID) {
    throw new Error(`WELL_CONSTRUCTION_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile", compilerVersion: "canonical-estimate-compiler.well-construction-r1",
    catalogId, primaryMeasureParameterId: "wiw_well_count",
    parameterDefinitions: [...WELL_CONSTRUCTION_PARAMETERS],
    formulaDefinitions: [...WELL_CONSTRUCTION_FORMULAS],
    resourceDefinitions: [...WELL_CONSTRUCTION_RESOURCES], submittedParameters,
    confirmedParameters: { ...WELL_CONSTRUCTION_RUNTIME_INPUT }, currencyCode: "KGS",
    priceItems: [], maximumResourceRows: 45,
    hashJson: async (value) => JSON.stringify(value),
  });
}
