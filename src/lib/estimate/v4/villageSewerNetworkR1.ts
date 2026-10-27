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
export const VILLAGE_SEWER_NETWORK_CATALOG_ID =
  "canonical-work:expanded:village_sewer_network";
export const VILLAGE_SEWER_NETWORK_SOURCE_ID =
  "project_village_gravity_sewer_segment_schedule_main_pipe_balance_v1";
export const VILLAGE_SEWER_NETWORK_NORM_ID =
  "norm:project:village_gravity_sewer_segment_schedule_main_pipe_balance:v1";
export const VILLAGE_SEWER_NETWORK_SOURCE_METADATA = Object.freeze({
  source_title: "Утверждённый проект самотечной канализации села, продольные профили, ведомость участков, колодцев и подключений",
  source_authority: "Проектировщик наружной канализации, поставщики труб и колодцев, геотехническая лаборатория и утверждающий инженер проекта",
  source_document_version: "PROJECT_VILLAGE_GRAVITY_SEWER_MATERIAL_LABOR_EQUIPMENT_QA_LOGISTICS_MAIN_PIPE_BALANCE_S27_24",
  definition_hash: "88e1993edce1b00af5a1fa7609248e105642ccb37295116ae2ab3d8a67b00379",
  exact_locator: "1 сеть VSN-HDPE-SN8-OD200-160-3200, самотечная, 450 м3/сут, 2400 м OD200 HDPE-CORRUGATED-SN8-OD200, 800 м OD160 HDPE-CORRUGATED-SN8-OD160, 64 колодца, 120 подключений",
  use_restriction: "Длина, расход и диаметр не определяют автоматически траншею, основание, колодцы, подключения, труд, механизмы или логистику. Скала, водопонижение, организация движения и восстановление дороги включаются только по проекту. Напорная канализация, КНС, очистные сооружения, септик, ливневая сеть и цены исключены.",
  source_kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
  artifact_sha256: "88e1993edce1b00af5a1fa7609248e105642ccb37295116ae2ab3d8a67b00379",
});

const KNOWN_SCOPE = [
  "vsn_network_count", "vsn_network_designation", "vsn_network_type",
  "vsn_design_flow_m3_day", "vsn_main_pipe_installed_m", "vsn_main_pipe_designation",
  "vsn_lateral_pipe_installed_m", "vsn_lateral_pipe_designation",
  "vsn_inspection_manhole_piece", "vsn_house_connection_piece",
];
const VISIBLE_PRELIMINARY_PROFILE = new Set([
  "vsn_main_pipe_retained_spare_m", "vsn_main_pipe_supplier_bundle_length_m",
]);
const CONDITIONAL_DETAILS = new Set([
  "vsn_rock_excavation_designation", "vsn_rock_excavation_volume_m3",
  "vsn_groundwater_dewatering_designation", "vsn_groundwater_dewatering_machine_h",
  "vsn_traffic_management_designation", "vsn_traffic_management_quantity_set",
  "vsn_road_reinstatement_designation", "vsn_road_reinstatement_area_m2",
]);
const PARAMETER_SPECS = Object.freeze([
  ["vsn_network_count", "Количество сетей наружной канализации", "integer", "piece", null],
  ["vsn_network_designation", "Марка сети", "text", null, null],
  ["vsn_network_type", "Тип сети", "enum", null, ["GRAVITY_VILLAGE_SEWER"]],
  ["vsn_design_flow_m3_day", "Расчётный расход сети", "decimal", "m3_per_day", null],
  ["vsn_main_pipe_installed_m", "Устанавливаемая длина главной трубы", "decimal", "m", null],
  ["vsn_main_pipe_designation", "Марка главной трубы", "text", null, null],
  ["vsn_lateral_pipe_installed_m", "Устанавливаемая длина труб подключений", "decimal", "m", null],
  ["vsn_lateral_pipe_designation", "Марка труб подключений", "text", null, null],
  ["vsn_inspection_manhole_piece", "Количество смотровых колодцев", "integer", "piece", null],
  ["vsn_house_connection_piece", "Количество домовых подключений", "integer", "piece", null],
  ["vsn_main_pipe_retained_spare_m", "Сохраняемый запас главной трубы", "decimal", "m", null],
  ["vsn_main_pipe_supplier_bundle_length_m", "Длина главной трубы в пакете поставщика", "decimal", "m", null],
  ["vsn_trench_excavation_volume_m3", "Проектный объём разработки траншей", "decimal", "m3", null],
  ["vsn_bedding_sand_volume_m3", "Проектный объём песчаного основания", "decimal", "m3", null],
  ["vsn_main_pipe_fitting_designation", "Марка фасонных частей главной сети", "text", null, null],
  ["vsn_main_pipe_fitting_quantity_set", "Количество комплектов фасонных частей главной сети", "integer", "set", null],
  ["vsn_lateral_fitting_designation", "Марка фасонных частей подключений", "text", null, null],
  ["vsn_lateral_fitting_quantity_set", "Количество комплектов фасонных частей подключений", "integer", "set", null],
  ["vsn_manhole_cover_designation", "Марка крышек колодцев", "text", null, null],
  ["vsn_manhole_cover_quantity_piece", "Количество крышек колодцев", "integer", "piece", null],
  ["vsn_manhole_benching_mortar_volume_m3", "Объём раствора лотков и сопряжений колодцев", "decimal", "m3", null],
  ["vsn_selected_backfill_volume_m3", "Объём отобранной обратной засыпки", "decimal", "m3", null],
  ["vsn_native_backfill_volume_m3", "Объём обратной засыпки местным грунтом", "decimal", "m3", null],
  ["vsn_warning_tape_length_m", "Длина сигнальной ленты", "decimal", "m", null],
  ["vsn_route_marker_quantity_piece", "Количество маршрутных указателей", "integer", "piece", null],
  ["vsn_connection_consumable_designation", "Марка расходников подключений", "text", null, null],
  ["vsn_connection_consumable_quantity_set", "Количество комплектов расходников подключений", "integer", "set", null],
  ["vsn_road_crossing_sleeve_designation", "Марка футляров пересечений дорог", "text", null, null],
  ["vsn_road_crossing_sleeve_length_m", "Длина футляров пересечений дорог", "decimal", "m", null],
  ["vsn_leak_test_length_m", "Длина сети для испытаний на герметичность", "decimal", "m", null],
  ["vsn_cctv_inspection_length_m", "Длина сети для телеинспекции", "decimal", "m", null],
  ["vsn_compaction_test_count", "Количество испытаний уплотнения", "integer", "test", null],
  ["vsn_asbuilt_document_count", "Комплекты исполнительной документации", "integer", "document", null],
  ["vsn_survey_labor_h", "Труд на геодезическую разбивку и исполнительную съёмку", "decimal", "man_hour", null],
  ["vsn_earthworks_labor_h", "Труд на траншеи, основание и засыпку", "decimal", "man_hour", null],
  ["vsn_pipe_installation_labor_h", "Труд на монтаж труб и фасонных частей", "decimal", "man_hour", null],
  ["vsn_manhole_connection_labor_h", "Труд на колодцы и домовые подключения", "decimal", "man_hour", null],
  ["vsn_qa_documentation_labor_h", "Труд на испытания, контроль и документацию", "decimal", "man_hour", null],
  ["vsn_excavator_machine_h", "Работа экскаватора", "decimal", "machine_hour", null],
  ["vsn_loader_machine_h", "Работа погрузчика", "decimal", "machine_hour", null],
  ["vsn_crane_machine_h", "Работа крана", "decimal", "machine_hour", null],
  ["vsn_compactor_machine_h", "Работа грунтового уплотнителя", "decimal", "machine_hour", null],
  ["vsn_cctv_equipment_machine_h", "Работа оборудования телеинспекции", "decimal", "machine_hour", null],
  ["vsn_material_delivery_trip_count", "Рейсы доставки труб, колодцев и материалов", "integer", "trip", null],
  ["vsn_waste_removal_trip_count", "Рейсы вывоза грунта, тары и отходов", "integer", "trip", null],
  ["vsn_rock_excavation_mode", "Разработка скального грунта требуется", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["vsn_rock_excavation_designation", "Способ разработки скального грунта", "text", null, null],
  ["vsn_rock_excavation_volume_m3", "Объём разработки скального грунта", "decimal", "m3", null],
  ["vsn_groundwater_dewatering_mode", "Водопонижение траншей требуется", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["vsn_groundwater_dewatering_designation", "Оборудование водопонижения", "text", null, null],
  ["vsn_groundwater_dewatering_machine_h", "Работа оборудования водопонижения", "decimal", "machine_hour", null],
  ["vsn_traffic_management_mode", "Организация движения требуется", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["vsn_traffic_management_designation", "Схема организации движения", "text", null, null],
  ["vsn_traffic_management_quantity_set", "Количество комплектов организации движения", "integer", "set", null],
  ["vsn_road_reinstatement_mode", "Восстановление дорожного покрытия требуется", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["vsn_road_reinstatement_designation", "Конструкция восстановления дороги", "text", null, null],
  ["vsn_road_reinstatement_area_m2", "Площадь восстановления дороги", "decimal", "m2", null],
] as const);

function conditionalConstraints(parameterId: string): Json {
  for (const branch of ["rock_excavation", "groundwater_dewatering",
    "traffic_management", "road_reinstatement"] as const) {
    if (parameterId.startsWith(`vsn_${branch}_`) && parameterId !== `vsn_${branch}_mode`) return {
      requiredWhen: { kind: "equals", parameterId: `vsn_${branch}_mode`, value: "REQUIRED" },
      forbiddenWhen: { kind: "equals", parameterId: `vsn_${branch}_mode`, value: "NOT_REQUIRED" },
    };
  }
  return {};
}

export type VillageSewerNetworkParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number; unit_id: string | null; title_ru: string; truth_metadata: Json;
};
export const VILLAGE_SEWER_NETWORK_PARAMETERS: readonly VillageSewerNetworkParameter[] =
  Object.freeze(PARAMETER_SPECS.map(
    ([parameterId, titleRu, valueType, unitId, enumValues], ordinal) => ({
      parameter_id: parameterId, ordinal, value_type: valueType, unit_id: unitId,
      title_ru: titleRu, required: !CONDITIONAL_DETAILS.has(parameterId), default_value: null,
      constraints_json: {
        ...(enumValues ? { values: enumValues }
          : valueType === "decimal" || valueType === "integer"
            ? { min: parameterId === "vsn_main_pipe_retained_spare_m" ? 0
              : valueType === "integer" ? 1 : 0.000_001 }
            : valueType === "text" ? { minLength: 1, maxLength: 1_000 } : {}),
        ...conditionalConstraints(parameterId),
      },
      truth_metadata: {
        contract: "rik-expo-app.village-sewer-network-r1",
        semantic_parameter_key: `village-sewer-network:${parameterId}`,
        visibility_role: "USER_INPUT",
        value_source_role: KNOWN_SCOPE.includes(parameterId) ? "USER_INPUT"
          : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
            ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE" : "PROJECT_SPECIFIC_INPUT",
        input_origin_class: KNOWN_SCOPE.includes(parameterId) ? "KNOWN_WORK_SCOPE"
          : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
            ? "VISIBLE_PRELIMINARY_PROCUREMENT_BALANCE"
            : "APPROVED_VILLAGE_SEWER_PROJECT_BOQ_OR_QA_DOCUMENTATION",
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
          source_document: VILLAGE_SEWER_NETWORK_SOURCE_ID,
          source_locator: VILLAGE_SEWER_NETWORK_SOURCE_METADATA.exact_locator,
          guide_version: "village-sewer-network-r1",
          source_snapshot_hash: VILLAGE_SEWER_NETWORK_SOURCE_METADATA.artifact_sha256,
          applicability: "Только выбранная самотечная сеть с явными участками, колодцами и подключениями; напорная сеть, КНС, очистные сооружения и ливневая сеть исключены.",
          verified_at: "2026-10-02T00:00:00+06:00",
          guide_validation_policy: "DEFER_MISSING_PROJECT_VALUE_ROW_LOCALLY_REJECT_INVALID_SUPPLIED_VALUE",
        },
        hidden_default_forbidden: true,
        runtime_profile_value: VISIBLE_PRELIMINARY_PROFILE.has(parameterId), synthetic: false,
      },
    }),
  ));

export const VILLAGE_SEWER_NETWORK_RUNTIME_INPUT = Object.freeze({
  vsn_main_pipe_retained_spare_m: 0,
  vsn_main_pipe_supplier_bundle_length_m: 1,
});
export const VILLAGE_SEWER_NETWORK_RUNTIME_CLASSIFICATION = Object.freeze(Object.fromEntries(
  Object.keys(VILLAGE_SEWER_NETWORK_RUNTIME_INPUT).map((id) => [id, "ASSUMPTION"]),
) as Readonly<Record<string, "ASSUMPTION">>);
export const VILLAGE_SEWER_NETWORK_RUNTIME_SOURCE_IDS = Object.freeze(Object.fromEntries(
  Object.keys(VILLAGE_SEWER_NETWORK_RUNTIME_INPUT)
    .map((id) => [id, [VILLAGE_SEWER_NETWORK_SOURCE_ID]]),
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
  { rowId: "rc09:vsn_acceptance", section: "Работы", category: "construction_work", titleRu: "Строительство, испытание и приёмка сельской канализационной сети", unitId: "piece", formulaId: "vsn_acceptance_count_v1", expression: "vsn_network_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:vsn_main_pipe", section: "Материалы", category: "material", titleRu: "Главная самотечная канализационная труба", unitId: "m", formulaId: "vsn_main_pipe_order_quantity_v1", expression: "ceil((vsn_main_pipe_installed_m+vsn_main_pipe_retained_spare_m)/vsn_main_pipe_supplier_bundle_length_m)*vsn_main_pipe_supplier_bundle_length_m", procurementEligible: true, titleParameterIds: ["vsn_main_pipe_designation"] },
  { rowId: "rc09:vsn_lateral_pipe", section: "Материалы", category: "material", titleRu: "Трубы домовых подключений", unitId: "m", formulaId: "vsn_lateral_pipe_installed_v1", expression: "vsn_lateral_pipe_installed_m", procurementEligible: true, titleParameterIds: ["vsn_lateral_pipe_designation"] },
  { rowId: "rc09:vsn_inspection_manholes", section: "Комплектующие", category: "material", titleRu: "Смотровые канализационные колодцы", unitId: "piece", formulaId: "vsn_inspection_manhole_quantity_v1", expression: "vsn_inspection_manhole_piece", procurementEligible: true },
  { rowId: "rc09:vsn_house_connections", section: "Комплектующие", category: "material", titleRu: "Домовые подключения к сети", unitId: "piece", formulaId: "vsn_house_connection_quantity_v1", expression: "vsn_house_connection_piece", procurementEligible: true },
  { rowId: "rc09:vsn_trench_excavation", section: "Земляные работы", category: "construction_work", titleRu: "Разработка траншей сети", unitId: "m3", formulaId: "vsn_trench_excavation_volume_v1", expression: "vsn_trench_excavation_volume_m3" },
  { rowId: "rc09:vsn_bedding_sand", section: "Материалы", category: "material", titleRu: "Песчаное основание трубопроводов", unitId: "m3", formulaId: "vsn_bedding_sand_volume_v1", expression: "vsn_bedding_sand_volume_m3", procurementEligible: true },
  { rowId: "rc09:vsn_main_pipe_fittings", section: "Комплектующие", category: "material", titleRu: "Фасонные части главной сети", unitId: "set", formulaId: "vsn_main_pipe_fitting_quantity_v1", expression: "vsn_main_pipe_fitting_quantity_set", procurementEligible: true, titleParameterIds: ["vsn_main_pipe_fitting_designation"] },
  { rowId: "rc09:vsn_lateral_fittings", section: "Комплектующие", category: "material", titleRu: "Фасонные части домовых подключений", unitId: "set", formulaId: "vsn_lateral_fitting_quantity_v1", expression: "vsn_lateral_fitting_quantity_set", procurementEligible: true, titleParameterIds: ["vsn_lateral_fitting_designation"] },
  { rowId: "rc09:vsn_manhole_covers", section: "Комплектующие", category: "material", titleRu: "Крышки канализационных колодцев", unitId: "piece", formulaId: "vsn_manhole_cover_quantity_v1", expression: "vsn_manhole_cover_quantity_piece", procurementEligible: true, titleParameterIds: ["vsn_manhole_cover_designation"] },
  { rowId: "rc09:vsn_manhole_benching_mortar", section: "Материалы", category: "material", titleRu: "Раствор лотков и сопряжений колодцев", unitId: "m3", formulaId: "vsn_manhole_benching_mortar_volume_v1", expression: "vsn_manhole_benching_mortar_volume_m3", procurementEligible: true },
  { rowId: "rc09:vsn_selected_backfill", section: "Материалы", category: "material", titleRu: "Отобранная обратная засыпка", unitId: "m3", formulaId: "vsn_selected_backfill_volume_v1", expression: "vsn_selected_backfill_volume_m3", procurementEligible: true },
  { rowId: "rc09:vsn_native_backfill", section: "Материалы", category: "material", titleRu: "Обратная засыпка местным грунтом", unitId: "m3", formulaId: "vsn_native_backfill_volume_v1", expression: "vsn_native_backfill_volume_m3", procurementEligible: true },
  { rowId: "rc09:vsn_warning_tape", section: "Расходники", category: "material", titleRu: "Сигнальная лента канализационной трассы", unitId: "m", formulaId: "vsn_warning_tape_length_v1", expression: "vsn_warning_tape_length_m", procurementEligible: true },
  { rowId: "rc09:vsn_route_markers", section: "Комплектующие", category: "material", titleRu: "Маршрутные указатели сети", unitId: "piece", formulaId: "vsn_route_marker_quantity_v1", expression: "vsn_route_marker_quantity_piece", procurementEligible: true },
  { rowId: "rc09:vsn_connection_consumables", section: "Расходники", category: "material", titleRu: "Расходники домовых подключений", unitId: "set", formulaId: "vsn_connection_consumable_quantity_v1", expression: "vsn_connection_consumable_quantity_set", procurementEligible: true, titleParameterIds: ["vsn_connection_consumable_designation"] },
  { rowId: "rc09:vsn_road_crossing_sleeves", section: "Комплектующие", category: "material", titleRu: "Футляры пересечений дорог", unitId: "m", formulaId: "vsn_road_crossing_sleeve_length_v1", expression: "vsn_road_crossing_sleeve_length_m", procurementEligible: true, titleParameterIds: ["vsn_road_crossing_sleeve_designation"] },
  { rowId: "rc09:vsn_leak_tests", section: "Контроль", category: "service", titleRu: "Испытания сети на герметичность", unitId: "m", formulaId: "vsn_leak_test_length_v1", expression: "vsn_leak_test_length_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:vsn_cctv_inspections", section: "Контроль", category: "service", titleRu: "Телеинспекция трубопроводов", unitId: "m", formulaId: "vsn_cctv_inspection_length_v1", expression: "vsn_cctv_inspection_length_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:vsn_compaction_tests", section: "Контроль", category: "service", titleRu: "Испытания уплотнения засыпки", unitId: "test", formulaId: "vsn_compaction_test_count_v1", expression: "vsn_compaction_test_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:vsn_asbuilt_documents", section: "Документы", category: "service", titleRu: "Исполнительная документация сети", unitId: "document", formulaId: "vsn_asbuilt_document_count_v1", expression: "vsn_asbuilt_document_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:vsn_rock_excavation", section: "Условные работы", category: "construction_work", titleRu: "Разработка скального грунта", unitId: "m3", formulaId: "vsn_rock_excavation_volume_v1", expression: "vsn_rock_excavation_volume_m3", inclusionAst: equals("vsn_rock_excavation_mode", "REQUIRED"), titleParameterIds: ["vsn_rock_excavation_designation"] },
  { rowId: "rc09:vsn_groundwater_dewatering", section: "Условные механизмы", category: "equipment", titleRu: "Водопонижение траншей", unitId: "machine_hour", formulaId: "vsn_groundwater_dewatering_machine_v1", expression: "vsn_groundwater_dewatering_machine_h", procurementEligible: true, inclusionAst: equals("vsn_groundwater_dewatering_mode", "REQUIRED"), titleParameterIds: ["vsn_groundwater_dewatering_designation"] },
  { rowId: "rc09:vsn_traffic_management", section: "Условные услуги", category: "service", titleRu: "Организация движения на период работ", unitId: "set", formulaId: "vsn_traffic_management_quantity_v1", expression: "vsn_traffic_management_quantity_set", procurementEligible: true, inclusionAst: equals("vsn_traffic_management_mode", "REQUIRED"), titleParameterIds: ["vsn_traffic_management_designation"] },
  { rowId: "rc09:vsn_road_reinstatement", section: "Условные работы", category: "construction_work", titleRu: "Восстановление дорожного покрытия", unitId: "m2", formulaId: "vsn_road_reinstatement_area_v1", expression: "vsn_road_reinstatement_area_m2", inclusionAst: equals("vsn_road_reinstatement_mode", "REQUIRED"), titleParameterIds: ["vsn_road_reinstatement_designation"] },
  { rowId: "rc09:vsn-main-pipe-balance:installed-net", section: "Баланс главной трубы", category: "material", titleRu: "Установленная главная труба", unitId: "m", formulaId: "vsn_main_pipe_installed_net_v1", expression: "vsn_main_pipe_installed_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:vsn-main-pipe-balance:retained-spare", section: "Баланс главной трубы", category: "material", titleRu: "Сохраняемый запас главной трубы", unitId: "m", formulaId: "vsn_main_pipe_retained_spare_v1", expression: "vsn_main_pipe_retained_spare_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:vsn-main-pipe-balance:total-need", section: "Баланс главной трубы", category: "material", titleRu: "Общая потребность в главной трубе", unitId: "m", formulaId: "vsn_main_pipe_total_need_v1", expression: "vsn_main_pipe_installed_m+vsn_main_pipe_retained_spare_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:vsn-main-pipe-balance:package-count", section: "Баланс главной трубы", category: "material", titleRu: "Количество пакетов главной трубы", unitId: "package", formulaId: "vsn_main_pipe_package_count_v1", expression: "ceil((vsn_main_pipe_installed_m+vsn_main_pipe_retained_spare_m)/vsn_main_pipe_supplier_bundle_length_m)", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:vsn-main-pipe-balance:remainder", section: "Баланс главной трубы", category: "material", titleRu: "Остаток главной трубы после монтажа", unitId: "m", formulaId: "vsn_main_pipe_remainder_v1", expression: "ceil((vsn_main_pipe_installed_m+vsn_main_pipe_retained_spare_m)/vsn_main_pipe_supplier_bundle_length_m)*vsn_main_pipe_supplier_bundle_length_m-vsn_main_pipe_installed_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:vsn-main-pipe-balance:surplus-beyond-spare", section: "Баланс главной трубы", category: "material", titleRu: "Свободный остаток главной трубы сверх запаса", unitId: "m", formulaId: "vsn_main_pipe_surplus_v1", expression: "max(0,ceil((vsn_main_pipe_installed_m+vsn_main_pipe_retained_spare_m)/vsn_main_pipe_supplier_bundle_length_m)*vsn_main_pipe_supplier_bundle_length_m-vsn_main_pipe_installed_m-vsn_main_pipe_retained_spare_m)", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:labor:vsn-survey", section: "Труд", category: "construction_work", titleRu: "Геодезическая разбивка и исполнительная съёмка", unitId: "man_hour", formulaId: "vsn_survey_labor_v1", expression: "vsn_survey_labor_h" },
  { rowId: "rc09:labor:vsn-earthworks", section: "Труд", category: "construction_work", titleRu: "Траншеи, основание и засыпка", unitId: "man_hour", formulaId: "vsn_earthworks_labor_v1", expression: "vsn_earthworks_labor_h" },
  { rowId: "rc09:labor:vsn-pipe-installation", section: "Труд", category: "construction_work", titleRu: "Монтаж труб и фасонных частей", unitId: "man_hour", formulaId: "vsn_pipe_installation_labor_v1", expression: "vsn_pipe_installation_labor_h" },
  { rowId: "rc09:labor:vsn-manhole-connections", section: "Труд", category: "construction_work", titleRu: "Монтаж колодцев и домовых подключений", unitId: "man_hour", formulaId: "vsn_manhole_connection_labor_v1", expression: "vsn_manhole_connection_labor_h" },
  { rowId: "rc09:labor:vsn-qa-documentation", section: "Труд", category: "construction_work", titleRu: "Испытания, контроль и документация", unitId: "man_hour", formulaId: "vsn_qa_documentation_labor_v1", expression: "vsn_qa_documentation_labor_h" },
  { rowId: "rc09:equipment:vsn-excavator", section: "Механизмы", category: "equipment", titleRu: "Экскаватор", unitId: "machine_hour", formulaId: "vsn_excavator_machine_v1", expression: "vsn_excavator_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:vsn-loader", section: "Механизмы", category: "equipment", titleRu: "Погрузчик", unitId: "machine_hour", formulaId: "vsn_loader_machine_v1", expression: "vsn_loader_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:vsn-crane", section: "Механизмы", category: "equipment", titleRu: "Кран", unitId: "machine_hour", formulaId: "vsn_crane_machine_v1", expression: "vsn_crane_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:vsn-compactor", section: "Механизмы", category: "equipment", titleRu: "Грунтовый уплотнитель", unitId: "machine_hour", formulaId: "vsn_compactor_machine_v1", expression: "vsn_compactor_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:vsn-cctv", section: "Механизмы", category: "equipment", titleRu: "Оборудование телеинспекции", unitId: "machine_hour", formulaId: "vsn_cctv_equipment_machine_v1", expression: "vsn_cctv_equipment_machine_h", procurementEligible: true },
  { rowId: "rc09:logistics:vsn-material-delivery", section: "Логистика", category: "service", titleRu: "Доставка труб, колодцев и материалов", unitId: "trip", formulaId: "vsn_material_delivery_trip_v1", expression: "vsn_material_delivery_trip_count", procurementEligible: true },
  { rowId: "rc09:logistics:vsn-waste-removal", section: "Логистика", category: "service", titleRu: "Вывоз грунта, тары и отходов", unitId: "trip", formulaId: "vsn_waste_removal_trip_v1", expression: "vsn_waste_removal_trip_count", procurementEligible: true },
]);

export const VILLAGE_SEWER_NETWORK_FORMULAS: readonly CanonicalEstimateFormulaDefinition[] =
  Object.freeze(ROW_SPECS.map((row) => {
    const compiled = compileFormulaGraph(row.expression);
    return { formula_id: row.formulaId, output_unit_id: row.unitId,
      expression_source: row.expression, ast: compiled.ast,
      input_parameter_ids: compiled.inputParameterIds,
      ast_sha256: "runtime-publisher-replaces-with-deterministic-sha256" };
  }));
export const VILLAGE_SEWER_NETWORK_RESOURCES: readonly CanonicalEstimateResourceDefinition[] =
  Object.freeze(ROW_SPECS.map((row, ordinal) => {
    const resourceGraph = { formulaId: row.formulaId, normalizedUom: row.unitId,
      semanticOwnerId: `village-sewer-network:${row.rowId}`, costOwner: "resource",
      ...(row.titleParameterIds ? { titleSpecificationParameterIds: row.titleParameterIds,
        titleSpecificationMode: "APPEND", titleSpecificationSeparator: " — " } : {}),
      scopeContextParameterIds: KNOWN_SCOPE, costTreatment: row.costTreatment ?? "OWN_COST" };
    const sourceRole = "APPROVED_VILLAGE_SEWER_NETWORK_PROJECT_PACKAGE";
    const sourceMetadata = { truth_contract_version: "R3", synthetic: false, sourceRole,
      normativeTrace: [{ sourceId: VILLAGE_SEWER_NETWORK_SOURCE_ID,
        source_id: VILLAGE_SEWER_NETWORK_SOURCE_ID,
        normId: VILLAGE_SEWER_NETWORK_NORM_ID, norm_id: VILLAGE_SEWER_NETWORK_NORM_ID,
        normVersion: VILLAGE_SEWER_NETWORK_SOURCE_METADATA.source_document_version,
        source_title: VILLAGE_SEWER_NETWORK_SOURCE_METADATA.source_title,
        exact_locator: VILLAGE_SEWER_NETWORK_SOURCE_METADATA.exact_locator,
        source_definition_hash: VILLAGE_SEWER_NETWORK_SOURCE_METADATA.definition_hash,
        sourceRole }],
      excludedUnownedAssumptions: [
        "pressure sewer, pumping station, treatment plant, septic facility or stormwater network",
        "length-flow-or-diameter-derived trench, manhole, labor, mechanism or logistics quantity",
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

export const VILLAGE_SEWER_NETWORK_SHORT_INPUT = Object.freeze({
  vsn_network_count: 1, vsn_network_designation: "VSN-HDPE-SN8-OD200-160-3200",
  vsn_network_type: "GRAVITY_VILLAGE_SEWER", vsn_design_flow_m3_day: 450,
  vsn_main_pipe_installed_m: 2400,
  vsn_main_pipe_designation: "HDPE-CORRUGATED-SN8-OD200",
  vsn_lateral_pipe_installed_m: 800,
  vsn_lateral_pipe_designation: "HDPE-CORRUGATED-SN8-OD160",
  vsn_inspection_manhole_piece: 64, vsn_house_connection_piece: 120,
  ...VILLAGE_SEWER_NETWORK_RUNTIME_INPUT,
});
export const VILLAGE_SEWER_NETWORK_ACCEPTANCE_INPUT = Object.freeze({
  ...VILLAGE_SEWER_NETWORK_SHORT_INPUT,
  vsn_trench_excavation_volume_m3: 7200, vsn_bedding_sand_volume_m3: 980,
  vsn_main_pipe_fitting_designation: "OD200-SN8-FITTING-KIT",
  vsn_main_pipe_fitting_quantity_set: 96,
  vsn_lateral_fitting_designation: "OD160-HOUSE-CONNECTION-KIT",
  vsn_lateral_fitting_quantity_set: 120,
  vsn_manhole_cover_designation: "D400-DN600", vsn_manhole_cover_quantity_piece: 64,
  vsn_manhole_benching_mortar_volume_m3: 48,
  vsn_selected_backfill_volume_m3: 1400, vsn_native_backfill_volume_m3: 4300,
  vsn_warning_tape_length_m: 3200, vsn_route_marker_quantity_piece: 160,
  vsn_connection_consumable_designation: "SEAL-COUPLER-ANCHOR-KIT",
  vsn_connection_consumable_quantity_set: 120,
  vsn_road_crossing_sleeve_designation: "STEEL-SLEEVE-DN400",
  vsn_road_crossing_sleeve_length_m: 180,
  vsn_leak_test_length_m: 3200, vsn_cctv_inspection_length_m: 3200,
  vsn_compaction_test_count: 180, vsn_asbuilt_document_count: 1,
  vsn_survey_labor_h: 600, vsn_earthworks_labor_h: 4200,
  vsn_pipe_installation_labor_h: 3600, vsn_manhole_connection_labor_h: 2400,
  vsn_qa_documentation_labor_h: 900,
  vsn_excavator_machine_h: 820, vsn_loader_machine_h: 420,
  vsn_crane_machine_h: 220, vsn_compactor_machine_h: 540,
  vsn_cctv_equipment_machine_h: 160,
  vsn_material_delivery_trip_count: 180, vsn_waste_removal_trip_count: 90,
  vsn_rock_excavation_mode: "NOT_REQUIRED",
  vsn_groundwater_dewatering_mode: "NOT_REQUIRED",
  vsn_traffic_management_mode: "NOT_REQUIRED",
  vsn_road_reinstatement_mode: "NOT_REQUIRED",
});

export async function compileVillageSewerNetworkR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? VILLAGE_SEWER_NETWORK_CATALOG_ID;
  if (catalogId !== VILLAGE_SEWER_NETWORK_CATALOG_ID) {
    throw new Error(`VILLAGE_SEWER_NETWORK_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({ operation: "compile",
    compilerVersion: "canonical-estimate-compiler.village-sewer-network-r1", catalogId,
    primaryMeasureParameterId: "vsn_network_count",
    parameterDefinitions: [...VILLAGE_SEWER_NETWORK_PARAMETERS],
    formulaDefinitions: [...VILLAGE_SEWER_NETWORK_FORMULAS],
    resourceDefinitions: [...VILLAGE_SEWER_NETWORK_RESOURCES], submittedParameters,
    confirmedParameters: { ...VILLAGE_SEWER_NETWORK_RUNTIME_INPUT }, currencyCode: "KGS",
    priceItems: [], maximumResourceRows: 45, hashJson: async (value) => JSON.stringify(value) });
}
