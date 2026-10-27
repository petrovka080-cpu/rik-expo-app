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
export const VILLAGE_WATER_SUPPLY_CATALOG_ID =
  "canonical-work:expanded:village_water_supply";
export const VILLAGE_WATER_SUPPLY_SOURCE_ID =
  "project_village_pressure_water_network_schedule_main_pipe_balance_v1";
export const VILLAGE_WATER_SUPPLY_NORM_ID =
  "norm:project:village_pressure_water_network_schedule_main_pipe_balance:v1";
export const VILLAGE_WATER_SUPPLY_SOURCE_METADATA = Object.freeze({
  source_title: "Утверждённый проект водоснабжения села, гидравлический расчёт, профили и ведомости труб, арматуры, камер, гидрантов и подключений",
  source_authority: "Проектировщик наружного водоснабжения, поставщики труб и арматуры, испытательная лаборатория и утверждающий инженер проекта",
  source_document_version: "PROJECT_VILLAGE_PRESSURE_WATER_MATERIAL_LABOR_EQUIPMENT_QA_LOGISTICS_MAIN_PIPE_BALANCE_S27_24",
  definition_hash: "1823d7f1dec8aad1c6cd85e84585c8a7ca214a64b0e1e83d082f1a3cb425a8c2",
  exact_locator: "1 сеть VWS-HDPE-PE100-RC-OD160-110-4200, напорная, 650 м3/сут, 3000 м OD160 HDPE-PE100-SDR17, 1200 м OD110 HDPE-PE100-SDR17, 36 камер, 18 гидрантов, 150 подключений",
  use_restriction: "Длина, расход и диаметр не определяют автоматически траншею, основание, арматуру, камеры, гидранты, подключения, труд, механизмы или логистику. Скала, водопонижение, организация движения и восстановление дороги включаются только по проекту. Водозабор, скважина, насосная или очистная станция, резервуар, водонапорная башня, внутренний водопровод, канализация и цены исключены.",
  source_kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
  artifact_sha256: "1823d7f1dec8aad1c6cd85e84585c8a7ca214a64b0e1e83d082f1a3cb425a8c2",
});

const KNOWN_SCOPE = [
  "vws_network_count", "vws_network_designation", "vws_network_type",
  "vws_design_flow_m3_day", "vws_main_pipe_installed_m", "vws_main_pipe_designation",
  "vws_branch_pipe_installed_m", "vws_branch_pipe_designation",
  "vws_valve_chamber_piece", "vws_fire_hydrant_piece",
  "vws_house_service_connection_piece",
];
const VISIBLE_PRELIMINARY_PROFILE = new Set([
  "vws_main_pipe_retained_spare_m", "vws_main_pipe_supplier_bundle_length_m",
]);
const CONDITIONAL_DETAILS = new Set([
  "vws_rock_excavation_designation", "vws_rock_excavation_volume_m3",
  "vws_groundwater_dewatering_designation", "vws_groundwater_dewatering_machine_h",
  "vws_traffic_management_designation", "vws_traffic_management_quantity_set",
  "vws_road_reinstatement_designation", "vws_road_reinstatement_area_m2",
]);
const PARAMETER_SPECS = Object.freeze([
  ["vws_network_count", "Количество сетей наружного водоснабжения", "integer", "piece", null],
  ["vws_network_designation", "Марка сети водоснабжения", "text", null, null],
  ["vws_network_type", "Тип сети", "enum", null, ["PRESSURE_VILLAGE_WATER_SUPPLY"]],
  ["vws_design_flow_m3_day", "Расчётный расход сети", "decimal", "m3_per_day", null],
  ["vws_main_pipe_installed_m", "Устанавливаемая длина главной трубы", "decimal", "m", null],
  ["vws_main_pipe_designation", "Марка главной трубы", "text", null, null],
  ["vws_branch_pipe_installed_m", "Устанавливаемая длина ответвлений", "decimal", "m", null],
  ["vws_branch_pipe_designation", "Марка труб ответвлений", "text", null, null],
  ["vws_valve_chamber_piece", "Количество камер запорной арматуры", "integer", "piece", null],
  ["vws_fire_hydrant_piece", "Количество пожарных гидрантов", "integer", "piece", null],
  ["vws_house_service_connection_piece", "Количество домовых вводов", "integer", "piece", null],
  ["vws_main_pipe_retained_spare_m", "Сохраняемый запас главной трубы", "decimal", "m", null],
  ["vws_main_pipe_supplier_bundle_length_m", "Длина главной трубы в пакете поставщика", "decimal", "m", null],
  ["vws_trench_excavation_volume_m3", "Проектный объём разработки траншей", "decimal", "m3", null],
  ["vws_bedding_sand_volume_m3", "Проектный объём песчаного основания и обсыпки", "decimal", "m3", null],
  ["vws_main_pipe_fitting_designation", "Марка фасонных частей главной сети", "text", null, null],
  ["vws_main_pipe_fitting_quantity_set", "Комплекты фасонных частей главной сети", "integer", "set", null],
  ["vws_branch_fitting_designation", "Марка фасонных частей ответвлений", "text", null, null],
  ["vws_branch_fitting_quantity_set", "Комплекты фасонных частей ответвлений", "integer", "set", null],
  ["vws_isolation_valve_designation", "Марка запорной арматуры", "text", null, null],
  ["vws_isolation_valve_quantity_piece", "Количество единиц запорной арматуры", "integer", "piece", null],
  ["vws_chamber_cover_designation", "Марка крышек камер", "text", null, null],
  ["vws_chamber_cover_quantity_piece", "Количество крышек камер", "integer", "piece", null],
  ["vws_backfill_volume_m3", "Проектный объём обратной засыпки", "decimal", "m3", null],
  ["vws_warning_tape_length_m", "Длина сигнальной ленты", "decimal", "m", null],
  ["vws_route_marker_quantity_piece", "Количество маршрутных указателей", "integer", "piece", null],
  ["vws_connection_consumable_designation", "Марка расходников домовых вводов", "text", null, null],
  ["vws_connection_consumable_quantity_set", "Комплекты расходников домовых вводов", "integer", "set", null],
  ["vws_road_crossing_sleeve_designation", "Марка футляров пересечений дорог", "text", null, null],
  ["vws_road_crossing_sleeve_length_m", "Длина футляров пересечений дорог", "decimal", "m", null],
  ["vws_thrust_block_concrete_volume_m3", "Объём бетона упорных блоков", "decimal", "m3", null],
  ["vws_hydraulic_test_length_m", "Длина сети для гидравлических испытаний", "decimal", "m", null],
  ["vws_flushing_disinfection_length_m", "Длина сети для промывки и дезинфекции", "decimal", "m", null],
  ["vws_water_quality_sample_count", "Количество проб качества воды", "integer", "test", null],
  ["vws_compaction_test_count", "Количество испытаний уплотнения", "integer", "test", null],
  ["vws_asbuilt_document_count", "Комплекты исполнительной документации", "integer", "document", null],
  ["vws_survey_labor_h", "Труд на разбивку и исполнительную съёмку", "decimal", "man_hour", null],
  ["vws_earthworks_labor_h", "Труд на траншеи, основание и засыпку", "decimal", "man_hour", null],
  ["vws_pipe_installation_labor_h", "Труд на монтаж и сварку труб", "decimal", "man_hour", null],
  ["vws_valve_hydrant_connection_labor_h", "Труд на камеры, арматуру, гидранты и вводы", "decimal", "man_hour", null],
  ["vws_qa_documentation_labor_h", "Труд на испытания, дезинфекцию и документацию", "decimal", "man_hour", null],
  ["vws_excavator_machine_h", "Работа экскаватора", "decimal", "machine_hour", null],
  ["vws_loader_machine_h", "Работа погрузчика", "decimal", "machine_hour", null],
  ["vws_crane_machine_h", "Работа крана", "decimal", "machine_hour", null],
  ["vws_butt_fusion_machine_h", "Работа аппарата стыковой сварки ПНД", "decimal", "machine_hour", null],
  ["vws_compactor_machine_h", "Работа грунтового уплотнителя", "decimal", "machine_hour", null],
  ["vws_material_delivery_trip_count", "Рейсы доставки труб, арматуры и материалов", "integer", "trip", null],
  ["vws_waste_removal_trip_count", "Рейсы вывоза грунта, тары и отходов", "integer", "trip", null],
  ["vws_rock_excavation_mode", "Разработка скального грунта требуется", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["vws_rock_excavation_designation", "Способ разработки скального грунта", "text", null, null],
  ["vws_rock_excavation_volume_m3", "Объём разработки скального грунта", "decimal", "m3", null],
  ["vws_groundwater_dewatering_mode", "Водопонижение траншей требуется", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["vws_groundwater_dewatering_designation", "Оборудование водопонижения", "text", null, null],
  ["vws_groundwater_dewatering_machine_h", "Работа оборудования водопонижения", "decimal", "machine_hour", null],
  ["vws_traffic_management_mode", "Организация движения требуется", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["vws_traffic_management_designation", "Схема организации движения", "text", null, null],
  ["vws_traffic_management_quantity_set", "Комплекты организации движения", "integer", "set", null],
  ["vws_road_reinstatement_mode", "Восстановление дорожного покрытия требуется", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["vws_road_reinstatement_designation", "Конструкция восстановления дороги", "text", null, null],
  ["vws_road_reinstatement_area_m2", "Площадь восстановления дороги", "decimal", "m2", null],
] as const);

function conditionalConstraints(parameterId: string): Json {
  for (const branch of ["rock_excavation", "groundwater_dewatering",
    "traffic_management", "road_reinstatement"] as const) {
    if (parameterId.startsWith(`vws_${branch}_`) && parameterId !== `vws_${branch}_mode`) return {
      requiredWhen: { kind: "equals", parameterId: `vws_${branch}_mode`, value: "REQUIRED" },
      forbiddenWhen: { kind: "equals", parameterId: `vws_${branch}_mode`, value: "NOT_REQUIRED" },
    };
  }
  return {};
}

export type VillageWaterSupplyParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number; unit_id: string | null; title_ru: string; truth_metadata: Json;
};
export const VILLAGE_WATER_SUPPLY_PARAMETERS: readonly VillageWaterSupplyParameter[] =
  Object.freeze(PARAMETER_SPECS.map(
    ([parameterId, titleRu, valueType, unitId, enumValues], ordinal) => ({
      parameter_id: parameterId, ordinal, value_type: valueType, unit_id: unitId,
      title_ru: titleRu, required: !CONDITIONAL_DETAILS.has(parameterId), default_value: null,
      constraints_json: {
        ...(enumValues ? { values: enumValues }
          : valueType === "decimal" || valueType === "integer"
            ? { min: parameterId === "vws_main_pipe_retained_spare_m" ? 0
              : valueType === "integer" ? 1 : 0.000_001 }
            : valueType === "text" ? { minLength: 1, maxLength: 1_000 } : {}),
        ...conditionalConstraints(parameterId),
      },
      truth_metadata: {
        contract: "rik-expo-app.village-water-supply-r1",
        semantic_parameter_key: `village-water-supply:${parameterId}`,
        visibility_role: "USER_INPUT",
        value_source_role: KNOWN_SCOPE.includes(parameterId) ? "USER_INPUT"
          : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
            ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE" : "PROJECT_SPECIFIC_INPUT",
        input_origin_class: KNOWN_SCOPE.includes(parameterId) ? "KNOWN_WORK_SCOPE"
          : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
            ? "VISIBLE_PRELIMINARY_PROCUREMENT_BALANCE"
            : "APPROVED_VILLAGE_WATER_PROJECT_BOQ_OR_QA_DOCUMENTATION",
        preliminary_compilation_allowed: true,
        source_confirmation_required: !KNOWN_SCOPE.includes(parameterId)
          && !VISIBLE_PRELIMINARY_PROFILE.has(parameterId),
        guide: {
          guide_kind: KNOWN_SCOPE.includes(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
          guide_short_ru: KNOWN_SCOPE.includes(parameterId)
            ? `${titleRu}: укажите по явному запросу, проекту и ведомости участков сети.`
            : `${titleRu}: укажите по проекту, профилям, ведомости объёмов, ППР или программе испытаний.`,
          source_role: KNOWN_SCOPE.includes(parameterId) ? "USER_SUPPLIED_OR_APPROVED_NETWORK_SCOPE"
            : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
              ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE" : "APPROVED_NETWORK_PROJECT_DOCUMENTATION",
          source_document: VILLAGE_WATER_SUPPLY_SOURCE_ID,
          source_locator: VILLAGE_WATER_SUPPLY_SOURCE_METADATA.exact_locator,
          guide_version: "village-water-supply-r1",
          source_snapshot_hash: VILLAGE_WATER_SUPPLY_SOURCE_METADATA.artifact_sha256,
          applicability: "Только выбранная напорная сельская водопроводная сеть с явными участками, камерами, гидрантами и домовыми вводами; водозабор, насосные и очистные сооружения, резервуары, башни, внутренний водопровод и канализация исключены.",
          verified_at: "2026-10-02T00:00:00+06:00",
          guide_validation_policy: "DEFER_MISSING_PROJECT_VALUE_ROW_LOCALLY_REJECT_INVALID_SUPPLIED_VALUE",
        },
        hidden_default_forbidden: true,
        runtime_profile_value: VISIBLE_PRELIMINARY_PROFILE.has(parameterId), synthetic: false,
      },
    }),
  ));

export const VILLAGE_WATER_SUPPLY_RUNTIME_INPUT = Object.freeze({
  vws_main_pipe_retained_spare_m: 0,
  vws_main_pipe_supplier_bundle_length_m: 1,
});
export const VILLAGE_WATER_SUPPLY_RUNTIME_CLASSIFICATION = Object.freeze(Object.fromEntries(
  Object.keys(VILLAGE_WATER_SUPPLY_RUNTIME_INPUT).map((id) => [id, "ASSUMPTION"]),
) as Readonly<Record<string, "ASSUMPTION">>);
export const VILLAGE_WATER_SUPPLY_RUNTIME_SOURCE_IDS = Object.freeze(Object.fromEntries(
  Object.keys(VILLAGE_WATER_SUPPLY_RUNTIME_INPUT)
    .map((id) => [id, [VILLAGE_WATER_SUPPLY_SOURCE_ID]]),
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
  { rowId: "rc09:vws_acceptance", section: "Работы", category: "construction_work", titleRu: "Строительство, испытание и приёмка сельской водопроводной сети", unitId: "piece", formulaId: "vws_acceptance_count_v1", expression: "vws_network_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:vws_main_pipe", section: "Материалы", category: "material", titleRu: "Главная напорная водопроводная труба", unitId: "m", formulaId: "vws_main_pipe_order_quantity_v1", expression: "ceil((vws_main_pipe_installed_m+vws_main_pipe_retained_spare_m)/vws_main_pipe_supplier_bundle_length_m)*vws_main_pipe_supplier_bundle_length_m", procurementEligible: true, titleParameterIds: ["vws_main_pipe_designation"] },
  { rowId: "rc09:vws_branch_pipe", section: "Материалы", category: "material", titleRu: "Трубы ответвлений водопроводной сети", unitId: "m", formulaId: "vws_branch_pipe_installed_v1", expression: "vws_branch_pipe_installed_m", procurementEligible: true, titleParameterIds: ["vws_branch_pipe_designation"] },
  { rowId: "rc09:vws_valve_chambers", section: "Комплектующие", category: "material", titleRu: "Камеры запорной арматуры", unitId: "piece", formulaId: "vws_valve_chamber_quantity_v1", expression: "vws_valve_chamber_piece", procurementEligible: true },
  { rowId: "rc09:vws_fire_hydrants", section: "Комплектующие", category: "material", titleRu: "Пожарные гидранты наружной сети", unitId: "piece", formulaId: "vws_fire_hydrant_quantity_v1", expression: "vws_fire_hydrant_piece", procurementEligible: true },
  { rowId: "rc09:vws_house_connections", section: "Комплектующие", category: "material", titleRu: "Домовые вводы водоснабжения", unitId: "piece", formulaId: "vws_house_connection_quantity_v1", expression: "vws_house_service_connection_piece", procurementEligible: true },
  { rowId: "rc09:vws_trench_excavation", section: "Земляные работы", category: "construction_work", titleRu: "Разработка траншей водопроводной сети", unitId: "m3", formulaId: "vws_trench_excavation_volume_v1", expression: "vws_trench_excavation_volume_m3" },
  { rowId: "rc09:vws_bedding_sand", section: "Материалы", category: "material", titleRu: "Песчаное основание и обсыпка труб", unitId: "m3", formulaId: "vws_bedding_sand_volume_v1", expression: "vws_bedding_sand_volume_m3", procurementEligible: true },
  { rowId: "rc09:vws_main_pipe_fittings", section: "Комплектующие", category: "material", titleRu: "Фасонные части главной сети", unitId: "set", formulaId: "vws_main_pipe_fitting_quantity_v1", expression: "vws_main_pipe_fitting_quantity_set", procurementEligible: true, titleParameterIds: ["vws_main_pipe_fitting_designation"] },
  { rowId: "rc09:vws_branch_fittings", section: "Комплектующие", category: "material", titleRu: "Фасонные части ответвлений", unitId: "set", formulaId: "vws_branch_fitting_quantity_v1", expression: "vws_branch_fitting_quantity_set", procurementEligible: true, titleParameterIds: ["vws_branch_fitting_designation"] },
  { rowId: "rc09:vws_isolation_valves", section: "Комплектующие", category: "material", titleRu: "Запорная арматура сети", unitId: "piece", formulaId: "vws_isolation_valve_quantity_v1", expression: "vws_isolation_valve_quantity_piece", procurementEligible: true, titleParameterIds: ["vws_isolation_valve_designation"] },
  { rowId: "rc09:vws_chamber_covers", section: "Комплектующие", category: "material", titleRu: "Крышки камер запорной арматуры", unitId: "piece", formulaId: "vws_chamber_cover_quantity_v1", expression: "vws_chamber_cover_quantity_piece", procurementEligible: true, titleParameterIds: ["vws_chamber_cover_designation"] },
  { rowId: "rc09:vws_backfill", section: "Материалы", category: "material", titleRu: "Проектная обратная засыпка траншей", unitId: "m3", formulaId: "vws_backfill_volume_v1", expression: "vws_backfill_volume_m3", procurementEligible: true },
  { rowId: "rc09:vws_warning_tape", section: "Расходники", category: "material", titleRu: "Сигнальная лента водопроводной трассы", unitId: "m", formulaId: "vws_warning_tape_length_v1", expression: "vws_warning_tape_length_m", procurementEligible: true },
  { rowId: "rc09:vws_route_markers", section: "Комплектующие", category: "material", titleRu: "Маршрутные указатели сети", unitId: "piece", formulaId: "vws_route_marker_quantity_v1", expression: "vws_route_marker_quantity_piece", procurementEligible: true },
  { rowId: "rc09:vws_connection_consumables", section: "Расходники", category: "material", titleRu: "Расходники домовых вводов", unitId: "set", formulaId: "vws_connection_consumable_quantity_v1", expression: "vws_connection_consumable_quantity_set", procurementEligible: true, titleParameterIds: ["vws_connection_consumable_designation"] },
  { rowId: "rc09:vws_road_crossing_sleeves", section: "Комплектующие", category: "material", titleRu: "Футляры пересечений дорог", unitId: "m", formulaId: "vws_road_crossing_sleeve_length_v1", expression: "vws_road_crossing_sleeve_length_m", procurementEligible: true, titleParameterIds: ["vws_road_crossing_sleeve_designation"] },
  { rowId: "rc09:vws_thrust_blocks", section: "Материалы", category: "material", titleRu: "Бетон упорных блоков арматуры и поворотов", unitId: "m3", formulaId: "vws_thrust_block_concrete_volume_v1", expression: "vws_thrust_block_concrete_volume_m3", procurementEligible: true },
  { rowId: "rc09:vws_hydraulic_tests", section: "Контроль", category: "service", titleRu: "Гидравлические испытания водопровода", unitId: "m", formulaId: "vws_hydraulic_test_length_v1", expression: "vws_hydraulic_test_length_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:vws_flushing_disinfection", section: "Контроль", category: "service", titleRu: "Промывка и дезинфекция сети", unitId: "m", formulaId: "vws_flushing_disinfection_length_v1", expression: "vws_flushing_disinfection_length_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:vws_water_quality_samples", section: "Контроль", category: "service", titleRu: "Лабораторные пробы качества воды", unitId: "test", formulaId: "vws_water_quality_sample_count_v1", expression: "vws_water_quality_sample_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:vws_compaction_tests", section: "Контроль", category: "service", titleRu: "Испытания уплотнения засыпки", unitId: "test", formulaId: "vws_compaction_test_count_v1", expression: "vws_compaction_test_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:vws_asbuilt_documents", section: "Документы", category: "service", titleRu: "Исполнительная документация сети", unitId: "document", formulaId: "vws_asbuilt_document_count_v1", expression: "vws_asbuilt_document_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:vws_rock_excavation", section: "Условные работы", category: "construction_work", titleRu: "Разработка скального грунта", unitId: "m3", formulaId: "vws_rock_excavation_volume_v1", expression: "vws_rock_excavation_volume_m3", inclusionAst: equals("vws_rock_excavation_mode", "REQUIRED"), titleParameterIds: ["vws_rock_excavation_designation"] },
  { rowId: "rc09:vws_groundwater_dewatering", section: "Условные механизмы", category: "equipment", titleRu: "Водопонижение траншей", unitId: "machine_hour", formulaId: "vws_groundwater_dewatering_machine_v1", expression: "vws_groundwater_dewatering_machine_h", procurementEligible: true, inclusionAst: equals("vws_groundwater_dewatering_mode", "REQUIRED"), titleParameterIds: ["vws_groundwater_dewatering_designation"] },
  { rowId: "rc09:vws_traffic_management", section: "Условные услуги", category: "service", titleRu: "Организация движения на период работ", unitId: "set", formulaId: "vws_traffic_management_quantity_v1", expression: "vws_traffic_management_quantity_set", procurementEligible: true, inclusionAst: equals("vws_traffic_management_mode", "REQUIRED"), titleParameterIds: ["vws_traffic_management_designation"] },
  { rowId: "rc09:vws_road_reinstatement", section: "Условные работы", category: "construction_work", titleRu: "Восстановление дорожного покрытия", unitId: "m2", formulaId: "vws_road_reinstatement_area_v1", expression: "vws_road_reinstatement_area_m2", inclusionAst: equals("vws_road_reinstatement_mode", "REQUIRED"), titleParameterIds: ["vws_road_reinstatement_designation"] },
  { rowId: "rc09:vws-main-pipe-balance:installed-net", section: "Баланс главной трубы", category: "material", titleRu: "Установленная главная труба", unitId: "m", formulaId: "vws_main_pipe_installed_net_v1", expression: "vws_main_pipe_installed_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:vws-main-pipe-balance:retained-spare", section: "Баланс главной трубы", category: "material", titleRu: "Сохраняемый запас главной трубы", unitId: "m", formulaId: "vws_main_pipe_retained_spare_v1", expression: "vws_main_pipe_retained_spare_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:vws-main-pipe-balance:total-need", section: "Баланс главной трубы", category: "material", titleRu: "Общая потребность в главной трубе", unitId: "m", formulaId: "vws_main_pipe_total_need_v1", expression: "vws_main_pipe_installed_m+vws_main_pipe_retained_spare_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:vws-main-pipe-balance:package-count", section: "Баланс главной трубы", category: "material", titleRu: "Количество пакетов главной трубы", unitId: "package", formulaId: "vws_main_pipe_package_count_v1", expression: "ceil((vws_main_pipe_installed_m+vws_main_pipe_retained_spare_m)/vws_main_pipe_supplier_bundle_length_m)", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:vws-main-pipe-balance:remainder", section: "Баланс главной трубы", category: "material", titleRu: "Остаток главной трубы после монтажа", unitId: "m", formulaId: "vws_main_pipe_remainder_v1", expression: "ceil((vws_main_pipe_installed_m+vws_main_pipe_retained_spare_m)/vws_main_pipe_supplier_bundle_length_m)*vws_main_pipe_supplier_bundle_length_m-vws_main_pipe_installed_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:vws-main-pipe-balance:surplus-beyond-spare", section: "Баланс главной трубы", category: "material", titleRu: "Свободный остаток главной трубы сверх запаса", unitId: "m", formulaId: "vws_main_pipe_surplus_v1", expression: "max(0,ceil((vws_main_pipe_installed_m+vws_main_pipe_retained_spare_m)/vws_main_pipe_supplier_bundle_length_m)*vws_main_pipe_supplier_bundle_length_m-vws_main_pipe_installed_m-vws_main_pipe_retained_spare_m)", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:labor:vws-survey", section: "Труд", category: "construction_work", titleRu: "Геодезическая разбивка и исполнительная съёмка", unitId: "man_hour", formulaId: "vws_survey_labor_v1", expression: "vws_survey_labor_h" },
  { rowId: "rc09:labor:vws-earthworks", section: "Труд", category: "construction_work", titleRu: "Траншеи, основание и засыпка", unitId: "man_hour", formulaId: "vws_earthworks_labor_v1", expression: "vws_earthworks_labor_h" },
  { rowId: "rc09:labor:vws-pipe-installation", section: "Труд", category: "construction_work", titleRu: "Монтаж и сварка труб и фасонных частей", unitId: "man_hour", formulaId: "vws_pipe_installation_labor_v1", expression: "vws_pipe_installation_labor_h" },
  { rowId: "rc09:labor:vws-valve-hydrant-connections", section: "Труд", category: "construction_work", titleRu: "Монтаж камер, арматуры, гидрантов и домовых вводов", unitId: "man_hour", formulaId: "vws_valve_hydrant_connection_labor_v1", expression: "vws_valve_hydrant_connection_labor_h" },
  { rowId: "rc09:labor:vws-qa-documentation", section: "Труд", category: "construction_work", titleRu: "Испытания, дезинфекция, контроль и документация", unitId: "man_hour", formulaId: "vws_qa_documentation_labor_v1", expression: "vws_qa_documentation_labor_h" },
  { rowId: "rc09:equipment:vws-excavator", section: "Механизмы", category: "equipment", titleRu: "Экскаватор", unitId: "machine_hour", formulaId: "vws_excavator_machine_v1", expression: "vws_excavator_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:vws-loader", section: "Механизмы", category: "equipment", titleRu: "Погрузчик", unitId: "machine_hour", formulaId: "vws_loader_machine_v1", expression: "vws_loader_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:vws-crane", section: "Механизмы", category: "equipment", titleRu: "Кран", unitId: "machine_hour", formulaId: "vws_crane_machine_v1", expression: "vws_crane_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:vws-butt-fusion", section: "Механизмы", category: "equipment", titleRu: "Аппарат стыковой сварки ПНД", unitId: "machine_hour", formulaId: "vws_butt_fusion_machine_v1", expression: "vws_butt_fusion_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:vws-compactor", section: "Механизмы", category: "equipment", titleRu: "Грунтовый уплотнитель", unitId: "machine_hour", formulaId: "vws_compactor_machine_v1", expression: "vws_compactor_machine_h", procurementEligible: true },
  { rowId: "rc09:logistics:vws-material-delivery", section: "Логистика", category: "service", titleRu: "Доставка труб, арматуры и материалов", unitId: "trip", formulaId: "vws_material_delivery_trip_v1", expression: "vws_material_delivery_trip_count", procurementEligible: true },
  { rowId: "rc09:logistics:vws-waste-removal", section: "Логистика", category: "service", titleRu: "Вывоз грунта, тары и отходов", unitId: "trip", formulaId: "vws_waste_removal_trip_v1", expression: "vws_waste_removal_trip_count", procurementEligible: true },
]);

export const VILLAGE_WATER_SUPPLY_FORMULAS: readonly CanonicalEstimateFormulaDefinition[] =
  Object.freeze(ROW_SPECS.map((row) => {
    const compiled = compileFormulaGraph(row.expression);
    return { formula_id: row.formulaId, output_unit_id: row.unitId,
      expression_source: row.expression, ast: compiled.ast,
      input_parameter_ids: compiled.inputParameterIds,
      ast_sha256: "runtime-publisher-replaces-with-deterministic-sha256" };
  }));
export const VILLAGE_WATER_SUPPLY_RESOURCES: readonly CanonicalEstimateResourceDefinition[] =
  Object.freeze(ROW_SPECS.map((row, ordinal) => {
    const resourceGraph = { formulaId: row.formulaId, normalizedUom: row.unitId,
      semanticOwnerId: `village-water-supply:${row.rowId}`, costOwner: "resource",
      ...(row.titleParameterIds ? { titleSpecificationParameterIds: row.titleParameterIds,
        titleSpecificationMode: "APPEND", titleSpecificationSeparator: " — " } : {}),
      scopeContextParameterIds: KNOWN_SCOPE, costTreatment: row.costTreatment ?? "OWN_COST" };
    const sourceRole = "APPROVED_VILLAGE_WATER_SUPPLY_PROJECT_PACKAGE";
    const sourceMetadata = { truth_contract_version: "R3", synthetic: false, sourceRole,
      normativeTrace: [{ sourceId: VILLAGE_WATER_SUPPLY_SOURCE_ID,
        source_id: VILLAGE_WATER_SUPPLY_SOURCE_ID,
        normId: VILLAGE_WATER_SUPPLY_NORM_ID, norm_id: VILLAGE_WATER_SUPPLY_NORM_ID,
        normVersion: VILLAGE_WATER_SUPPLY_SOURCE_METADATA.source_document_version,
        source_title: VILLAGE_WATER_SUPPLY_SOURCE_METADATA.source_title,
        exact_locator: VILLAGE_WATER_SUPPLY_SOURCE_METADATA.exact_locator,
        source_definition_hash: VILLAGE_WATER_SUPPLY_SOURCE_METADATA.definition_hash,
        sourceRole }],
      excludedUnownedAssumptions: [
        "intake, borehole, pumping or treatment station, reservoir, tower, internal plumbing or sewer",
        "length-flow-or-diameter-derived trench, valve, chamber, hydrant, labor, mechanism or logistics quantity",
        "automatic rock excavation, groundwater dewatering, traffic management or road reinstatement",
        "automatic retained spare or supplier bundle", "invented price",
      ] };
    return { id: `resource-${row.rowId.replace(/:/gu, "-")}`, row_id: row.rowId,
      ordinal, section: row.section, category: row.category, title_ru: row.titleRu,
      unit_id: row.unitId, formula_id: row.formulaId, inclusion_ast: row.inclusionAst ?? literalTrue,
      resource_graph: resourceGraph, procurement_eligible: row.procurementEligible ?? false,
      cost_owner_id: row.rowId, source_metadata: sourceMetadata,
      row_sha256: estimateDeterministicHash({ row, ordinal, resourceGraph, sourceMetadata }) };
  }));

export const VILLAGE_WATER_SUPPLY_SHORT_INPUT = Object.freeze({
  vws_network_count: 1, vws_network_designation: "VWS-HDPE-PE100-RC-OD160-110-4200",
  vws_network_type: "PRESSURE_VILLAGE_WATER_SUPPLY", vws_design_flow_m3_day: 650,
  vws_main_pipe_installed_m: 3000, vws_main_pipe_designation: "HDPE-PE100-SDR17-OD160",
  vws_branch_pipe_installed_m: 1200, vws_branch_pipe_designation: "HDPE-PE100-SDR17-OD110",
  vws_valve_chamber_piece: 36, vws_fire_hydrant_piece: 18,
  vws_house_service_connection_piece: 150,
  ...VILLAGE_WATER_SUPPLY_RUNTIME_INPUT,
});
export const VILLAGE_WATER_SUPPLY_ACCEPTANCE_INPUT = Object.freeze({
  ...VILLAGE_WATER_SUPPLY_SHORT_INPUT,
  vws_trench_excavation_volume_m3: 8600, vws_bedding_sand_volume_m3: 1280,
  vws_main_pipe_fitting_designation: "PE100-OD160-FITTING-KIT",
  vws_main_pipe_fitting_quantity_set: 84,
  vws_branch_fitting_designation: "PE100-OD110-BRANCH-KIT",
  vws_branch_fitting_quantity_set: 150,
  vws_isolation_valve_designation: "GATE-VALVE-DN150-PN16",
  vws_isolation_valve_quantity_piece: 42,
  vws_chamber_cover_designation: "D400-DN600", vws_chamber_cover_quantity_piece: 36,
  vws_backfill_volume_m3: 6800, vws_warning_tape_length_m: 4200,
  vws_route_marker_quantity_piece: 140,
  vws_connection_consumable_designation: "SERVICE-SADDLE-VALVE-SEAL-KIT",
  vws_connection_consumable_quantity_set: 150,
  vws_road_crossing_sleeve_designation: "STEEL-SLEEVE-DN350",
  vws_road_crossing_sleeve_length_m: 220, vws_thrust_block_concrete_volume_m3: 72,
  vws_hydraulic_test_length_m: 4200, vws_flushing_disinfection_length_m: 4200,
  vws_water_quality_sample_count: 28, vws_compaction_test_count: 210,
  vws_asbuilt_document_count: 1,
  vws_survey_labor_h: 720, vws_earthworks_labor_h: 5200,
  vws_pipe_installation_labor_h: 4400, vws_valve_hydrant_connection_labor_h: 3200,
  vws_qa_documentation_labor_h: 1100,
  vws_excavator_machine_h: 960, vws_loader_machine_h: 480,
  vws_crane_machine_h: 240, vws_butt_fusion_machine_h: 360,
  vws_compactor_machine_h: 620,
  vws_material_delivery_trip_count: 210, vws_waste_removal_trip_count: 110,
  vws_rock_excavation_mode: "NOT_REQUIRED",
  vws_groundwater_dewatering_mode: "NOT_REQUIRED",
  vws_traffic_management_mode: "NOT_REQUIRED",
  vws_road_reinstatement_mode: "NOT_REQUIRED",
});

export async function compileVillageWaterSupplyR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? VILLAGE_WATER_SUPPLY_CATALOG_ID;
  if (catalogId !== VILLAGE_WATER_SUPPLY_CATALOG_ID) {
    throw new Error(`VILLAGE_WATER_SUPPLY_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({ operation: "compile",
    compilerVersion: "canonical-estimate-compiler.village-water-supply-r1", catalogId,
    primaryMeasureParameterId: "vws_network_count",
    parameterDefinitions: [...VILLAGE_WATER_SUPPLY_PARAMETERS],
    formulaDefinitions: [...VILLAGE_WATER_SUPPLY_FORMULAS],
    resourceDefinitions: [...VILLAGE_WATER_SUPPLY_RESOURCES], submittedParameters,
    confirmedParameters: { ...VILLAGE_WATER_SUPPLY_RUNTIME_INPUT }, currencyCode: "KGS",
    priceItems: [], maximumResourceRows: 45, hashJson: async (value) => JSON.stringify(value) });
}
