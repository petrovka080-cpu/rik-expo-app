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
export const WATER_METER_CHAMBERS_CATALOG_ID =
  "canonical-work:expanded:water_meter_chambers";
export const WATER_METER_CHAMBERS_SOURCE_ID =
  "project_water_meter_chambers_equipment_schedule_meter_balance_v1";
export const WATER_METER_CHAMBERS_NORM_ID =
  "norm:project:water_meter_chambers_equipment_schedule_meter_balance:v1";
export const WATER_METER_CHAMBERS_SOURCE_METADATA = Object.freeze({
  source_title: "Утверждённый проект камер водомерных узлов, гидравлический расчёт, чертежи камер и трубопроводов, ведомость счётчиков и арматуры",
  source_authority: "Проектировщик наружного водоснабжения, поставщики счётчиков и арматуры, метрологическая служба и утверждающий инженер проекта",
  source_document_version: "PROJECT_WATER_METER_CHAMBERS_CIVIL_PIPING_METERING_QA_LOGISTICS_METER_BALANCE_S27_24",
  definition_hash: "6e89cbdf2f2f9084c526469d8dce81be21e9cd040f2c923c2e05035e6d50f128",
  exact_locator: "4 камеры WMC-RC-DN150-4-EMF, железобетонные с байпасом, 1200 м3/сут, 4 счётчика EMF-DN150-PN16, 96 м прямых участков и 48 м байпаса STEEL-EPOXY-DN150-PN16",
  use_restriction: "Расход, длина и диаметр не определяют автоматически камеры, арматуру, фасонные части, строительные материалы, труд, механизмы или логистику. Крепление котлована, водопонижение и восстановление дороги включаются только по проекту. Наружная сеть, водозабор, скважина, насосная, водоподготовка, резервуар, башня, канализация и цены исключены.",
  source_kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
  artifact_sha256: "6e89cbdf2f2f9084c526469d8dce81be21e9cd040f2c923c2e05035e6d50f128",
});

const KNOWN_SCOPE = [
  "wmc_chamber_count", "wmc_chamber_designation", "wmc_chamber_type",
  "wmc_design_flow_m3_day", "wmc_meter_installed_piece", "wmc_meter_designation",
  "wmc_straight_pipe_installed_m", "wmc_straight_pipe_designation",
  "wmc_bypass_pipe_installed_m", "wmc_bypass_pipe_designation",
];
const VISIBLE_PRELIMINARY_PROFILE = new Set([
  "wmc_meter_retained_spare_piece", "wmc_meter_supplier_package_quantity_piece",
]);
const CONDITIONAL_DETAILS = new Set([
  "wmc_excavation_shoring_designation", "wmc_excavation_shoring_area_m2",
  "wmc_groundwater_dewatering_designation", "wmc_groundwater_dewatering_machine_h",
  "wmc_road_reinstatement_designation", "wmc_road_reinstatement_area_m2",
]);
const PARAMETER_SPECS = Object.freeze([
  ["wmc_chamber_count", "Количество камер водомерных узлов", "integer", "piece", null],
  ["wmc_chamber_designation", "Марка камер водомерных узлов", "text", null, null],
  ["wmc_chamber_type", "Тип камеры", "enum", null, ["RC_WATER_METER_CHAMBER_WITH_BYPASS"]],
  ["wmc_design_flow_m3_day", "Расчётный расход водомерных узлов", "decimal", "m3_per_day", null],
  ["wmc_meter_installed_piece", "Количество устанавливаемых счётчиков", "integer", "piece", null],
  ["wmc_meter_designation", "Марка счётчиков воды", "text", null, null],
  ["wmc_straight_pipe_installed_m", "Длина прямых измерительных участков", "decimal", "m", null],
  ["wmc_straight_pipe_designation", "Марка труб прямых участков", "text", null, null],
  ["wmc_bypass_pipe_installed_m", "Длина байпасных трубопроводов", "decimal", "m", null],
  ["wmc_bypass_pipe_designation", "Марка труб байпаса", "text", null, null],
  ["wmc_meter_retained_spare_piece", "Сохраняемый запас счётчиков", "integer", "piece", null],
  ["wmc_meter_supplier_package_quantity_piece", "Количество счётчиков в упаковке поставщика", "integer", "piece", null],
  ["wmc_isolation_valve_designation", "Марка запорной арматуры", "text", null, null],
  ["wmc_isolation_valve_quantity_piece", "Количество единиц запорной арматуры", "integer", "piece", null],
  ["wmc_check_valve_designation", "Марка обратных клапанов", "text", null, null],
  ["wmc_check_valve_quantity_piece", "Количество обратных клапанов", "integer", "piece", null],
  ["wmc_strainer_designation", "Марка сетчатых фильтров", "text", null, null],
  ["wmc_strainer_quantity_piece", "Количество сетчатых фильтров", "integer", "piece", null],
  ["wmc_dismantling_joint_designation", "Марка демонтажных вставок", "text", null, null],
  ["wmc_dismantling_joint_quantity_piece", "Количество демонтажных вставок", "integer", "piece", null],
  ["wmc_fitting_designation", "Марка фасонных частей", "text", null, null],
  ["wmc_fitting_quantity_set", "Количество комплектов фасонных частей", "integer", "set", null],
  ["wmc_cover_designation", "Марка крышек камер", "text", null, null],
  ["wmc_cover_quantity_piece", "Количество крышек камер", "integer", "piece", null],
  ["wmc_ladder_designation", "Марка лестниц камер", "text", null, null],
  ["wmc_ladder_quantity_piece", "Количество лестниц камер", "integer", "piece", null],
  ["wmc_pipe_support_designation", "Марка опор трубопроводов", "text", null, null],
  ["wmc_pipe_support_quantity_piece", "Количество опор трубопроводов", "integer", "piece", null],
  ["wmc_penetration_seal_designation", "Марка герметизаторов вводов", "text", null, null],
  ["wmc_penetration_seal_quantity_piece", "Количество герметизаторов вводов", "integer", "piece", null],
  ["wmc_base_concrete_volume_m3", "Объём бетона основания и стен камер", "decimal", "m3", null],
  ["wmc_blinding_concrete_volume_m3", "Объём подготовительного бетона", "decimal", "m3", null],
  ["wmc_rebar_mass_kg", "Масса арматуры камер", "decimal", "kg", null],
  ["wmc_formwork_area_m2", "Площадь опалубки камер", "decimal", "m2", null],
  ["wmc_waterproofing_area_m2", "Площадь гидроизоляции камер", "decimal", "m2", null],
  ["wmc_backfill_volume_m3", "Объём обратной засыпки камер", "decimal", "m3", null],
  ["wmc_commissioning_consumable_designation", "Марка монтажных и пусковых расходников", "text", null, null],
  ["wmc_commissioning_consumable_quantity_set", "Комплекты монтажных и пусковых расходников", "integer", "set", null],
  ["wmc_signal_cable_designation", "Марка сигнального кабеля счётчиков", "text", null, null],
  ["wmc_signal_cable_length_m", "Длина сигнального кабеля счётчиков", "decimal", "m", null],
  ["wmc_hydraulic_test_length_m", "Длина трубопроводов гидравлических испытаний", "decimal", "m", null],
  ["wmc_meter_calibration_test_count", "Количество метрологических поверок", "integer", "test", null],
  ["wmc_electrical_test_count", "Количество электрических испытаний", "integer", "test", null],
  ["wmc_asbuilt_document_count", "Комплекты исполнительной документации", "integer", "document", null],
  ["wmc_survey_labor_h", "Труд на разбивку и исполнительную съёмку", "decimal", "man_hour", null],
  ["wmc_civil_labor_h", "Труд на устройство камер", "decimal", "man_hour", null],
  ["wmc_piping_labor_h", "Труд на монтаж труб, арматуры и фасонных частей", "decimal", "man_hour", null],
  ["wmc_meter_electrical_labor_h", "Труд на монтаж счётчиков и электрические подключения", "decimal", "man_hour", null],
  ["wmc_qa_documentation_labor_h", "Труд на испытания, поверку и документацию", "decimal", "man_hour", null],
  ["wmc_excavator_machine_h", "Работа экскаватора", "decimal", "machine_hour", null],
  ["wmc_crane_machine_h", "Работа крана", "decimal", "machine_hour", null],
  ["wmc_compactor_machine_h", "Работа грунтового уплотнителя", "decimal", "machine_hour", null],
  ["wmc_material_delivery_trip_count", "Рейсы доставки камер, труб и оборудования", "integer", "trip", null],
  ["wmc_waste_removal_trip_count", "Рейсы вывоза грунта, тары и отходов", "integer", "trip", null],
  ["wmc_excavation_shoring_mode", "Крепление котлована требуется", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["wmc_excavation_shoring_designation", "Конструкция крепления котлована", "text", null, null],
  ["wmc_excavation_shoring_area_m2", "Площадь крепления котлована", "decimal", "m2", null],
  ["wmc_groundwater_dewatering_mode", "Водопонижение требуется", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["wmc_groundwater_dewatering_designation", "Оборудование водопонижения", "text", null, null],
  ["wmc_groundwater_dewatering_machine_h", "Работа оборудования водопонижения", "decimal", "machine_hour", null],
  ["wmc_road_reinstatement_mode", "Восстановление дороги требуется", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["wmc_road_reinstatement_designation", "Конструкция восстановления дороги", "text", null, null],
  ["wmc_road_reinstatement_area_m2", "Площадь восстановления дороги", "decimal", "m2", null],
] as const);

function conditionalConstraints(parameterId: string): Json {
  for (const branch of ["excavation_shoring", "groundwater_dewatering",
    "road_reinstatement"] as const) {
    if (parameterId.startsWith(`wmc_${branch}_`) && parameterId !== `wmc_${branch}_mode`) return {
      requiredWhen: { kind: "equals", parameterId: `wmc_${branch}_mode`, value: "REQUIRED" },
      forbiddenWhen: { kind: "equals", parameterId: `wmc_${branch}_mode`, value: "NOT_REQUIRED" },
    };
  }
  return {};
}

export type WaterMeterChambersParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number; unit_id: string | null; title_ru: string; truth_metadata: Json;
};
export const WATER_METER_CHAMBERS_PARAMETERS: readonly WaterMeterChambersParameter[] =
  Object.freeze(PARAMETER_SPECS.map(
    ([parameterId, titleRu, valueType, unitId, enumValues], ordinal) => ({
      parameter_id: parameterId, ordinal, value_type: valueType, unit_id: unitId,
      title_ru: titleRu, required: !CONDITIONAL_DETAILS.has(parameterId), default_value: null,
      constraints_json: {
        ...(enumValues ? { values: enumValues }
          : valueType === "decimal" || valueType === "integer"
            ? { min: parameterId === "wmc_meter_retained_spare_piece" ? 0
              : valueType === "integer" ? 1 : 0.000_001 }
            : valueType === "text" ? { minLength: 1, maxLength: 1_000 } : {}),
        ...conditionalConstraints(parameterId),
      },
      truth_metadata: {
        contract: "rik-expo-app.water-meter-chambers-r1",
        semantic_parameter_key: `water-meter-chambers:${parameterId}`,
        visibility_role: "USER_INPUT",
        value_source_role: KNOWN_SCOPE.includes(parameterId) ? "USER_INPUT"
          : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
            ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE" : "PROJECT_SPECIFIC_INPUT",
        input_origin_class: KNOWN_SCOPE.includes(parameterId) ? "KNOWN_WORK_SCOPE"
          : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
            ? "VISIBLE_PRELIMINARY_PROCUREMENT_BALANCE"
            : "APPROVED_WATER_METER_CHAMBER_PROJECT_BOQ_OR_QA_DOCUMENTATION",
        preliminary_compilation_allowed: true,
        source_confirmation_required: !KNOWN_SCOPE.includes(parameterId)
          && !VISIBLE_PRELIMINARY_PROFILE.has(parameterId),
        guide: {
          guide_kind: KNOWN_SCOPE.includes(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
          guide_short_ru: KNOWN_SCOPE.includes(parameterId)
            ? `${titleRu}: укажите по явному запросу и утверждённой спецификации узлов.`
            : `${titleRu}: укажите по проекту, ведомости объёмов, спецификации, ППР или программе испытаний.`,
          source_role: KNOWN_SCOPE.includes(parameterId) ? "USER_SUPPLIED_OR_APPROVED_METER_SCOPE"
            : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
              ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE" : "APPROVED_METER_CHAMBER_PROJECT_DOCUMENTATION",
          source_document: WATER_METER_CHAMBERS_SOURCE_ID,
          source_locator: WATER_METER_CHAMBERS_SOURCE_METADATA.exact_locator,
          guide_version: "water-meter-chambers-r1",
          source_snapshot_hash: WATER_METER_CHAMBERS_SOURCE_METADATA.artifact_sha256,
          applicability: "Только выбранные камеры водомерных узлов; наружные сети, источники, станции, резервуары, башни и канализация исключены.",
          verified_at: "2026-10-02T00:00:00+06:00",
          guide_validation_policy: "DEFER_MISSING_PROJECT_VALUE_ROW_LOCALLY_REJECT_INVALID_SUPPLIED_VALUE",
        },
        hidden_default_forbidden: true,
        runtime_profile_value: VISIBLE_PRELIMINARY_PROFILE.has(parameterId), synthetic: false,
      },
    }),
  ));

export const WATER_METER_CHAMBERS_RUNTIME_INPUT = Object.freeze({
  wmc_meter_retained_spare_piece: 0,
  wmc_meter_supplier_package_quantity_piece: 1,
});
export const WATER_METER_CHAMBERS_RUNTIME_CLASSIFICATION = Object.freeze(Object.fromEntries(
  Object.keys(WATER_METER_CHAMBERS_RUNTIME_INPUT).map((id) => [id, "ASSUMPTION"]),
) as Readonly<Record<string, "ASSUMPTION">>);
export const WATER_METER_CHAMBERS_RUNTIME_SOURCE_IDS = Object.freeze(Object.fromEntries(
  Object.keys(WATER_METER_CHAMBERS_RUNTIME_INPUT)
    .map((id) => [id, [WATER_METER_CHAMBERS_SOURCE_ID]]),
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
  { rowId: "rc09:wmc_acceptance", section: "Работы", category: "construction_work", titleRu: "Устройство, испытание и приёмка камер водомерных узлов", unitId: "piece", formulaId: "wmc_acceptance_count_v1", expression: "wmc_chamber_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wmc_chambers", section: "Комплектующие", category: "material", titleRu: "Железобетонные камеры водомерных узлов", unitId: "piece", formulaId: "wmc_chamber_quantity_v1", expression: "wmc_chamber_count", procurementEligible: true, titleParameterIds: ["wmc_chamber_designation"] },
  { rowId: "rc09:wmc_water_meters", section: "Оборудование", category: "equipment", titleRu: "Счётчики воды", unitId: "piece", formulaId: "wmc_meter_order_quantity_v1", expression: "ceil((wmc_meter_installed_piece+wmc_meter_retained_spare_piece)/wmc_meter_supplier_package_quantity_piece)*wmc_meter_supplier_package_quantity_piece", procurementEligible: true, titleParameterIds: ["wmc_meter_designation"] },
  { rowId: "rc09:wmc_straight_pipe", section: "Материалы", category: "material", titleRu: "Прямые измерительные участки", unitId: "m", formulaId: "wmc_straight_pipe_length_v1", expression: "wmc_straight_pipe_installed_m", procurementEligible: true, titleParameterIds: ["wmc_straight_pipe_designation"] },
  { rowId: "rc09:wmc_bypass_pipe", section: "Материалы", category: "material", titleRu: "Байпасные трубопроводы", unitId: "m", formulaId: "wmc_bypass_pipe_length_v1", expression: "wmc_bypass_pipe_installed_m", procurementEligible: true, titleParameterIds: ["wmc_bypass_pipe_designation"] },
  { rowId: "rc09:wmc_isolation_valves", section: "Комплектующие", category: "material", titleRu: "Запорная арматура", unitId: "piece", formulaId: "wmc_isolation_valve_quantity_v1", expression: "wmc_isolation_valve_quantity_piece", procurementEligible: true, titleParameterIds: ["wmc_isolation_valve_designation"] },
  { rowId: "rc09:wmc_check_valves", section: "Комплектующие", category: "material", titleRu: "Обратные клапаны", unitId: "piece", formulaId: "wmc_check_valve_quantity_v1", expression: "wmc_check_valve_quantity_piece", procurementEligible: true, titleParameterIds: ["wmc_check_valve_designation"] },
  { rowId: "rc09:wmc_strainers", section: "Комплектующие", category: "material", titleRu: "Сетчатые фильтры", unitId: "piece", formulaId: "wmc_strainer_quantity_v1", expression: "wmc_strainer_quantity_piece", procurementEligible: true, titleParameterIds: ["wmc_strainer_designation"] },
  { rowId: "rc09:wmc_dismantling_joints", section: "Комплектующие", category: "material", titleRu: "Демонтажные вставки", unitId: "piece", formulaId: "wmc_dismantling_joint_quantity_v1", expression: "wmc_dismantling_joint_quantity_piece", procurementEligible: true, titleParameterIds: ["wmc_dismantling_joint_designation"] },
  { rowId: "rc09:wmc_fittings", section: "Комплектующие", category: "material", titleRu: "Фасонные части водомерных узлов", unitId: "set", formulaId: "wmc_fitting_quantity_v1", expression: "wmc_fitting_quantity_set", procurementEligible: true, titleParameterIds: ["wmc_fitting_designation"] },
  { rowId: "rc09:wmc_covers", section: "Комплектующие", category: "material", titleRu: "Крышки камер", unitId: "piece", formulaId: "wmc_cover_quantity_v1", expression: "wmc_cover_quantity_piece", procurementEligible: true, titleParameterIds: ["wmc_cover_designation"] },
  { rowId: "rc09:wmc_ladders", section: "Комплектующие", category: "material", titleRu: "Лестницы камер", unitId: "piece", formulaId: "wmc_ladder_quantity_v1", expression: "wmc_ladder_quantity_piece", procurementEligible: true, titleParameterIds: ["wmc_ladder_designation"] },
  { rowId: "rc09:wmc_pipe_supports", section: "Комплектующие", category: "material", titleRu: "Опоры трубопроводов", unitId: "piece", formulaId: "wmc_pipe_support_quantity_v1", expression: "wmc_pipe_support_quantity_piece", procurementEligible: true, titleParameterIds: ["wmc_pipe_support_designation"] },
  { rowId: "rc09:wmc_penetration_seals", section: "Расходники", category: "material", titleRu: "Герметизаторы вводов", unitId: "piece", formulaId: "wmc_penetration_seal_quantity_v1", expression: "wmc_penetration_seal_quantity_piece", procurementEligible: true, titleParameterIds: ["wmc_penetration_seal_designation"] },
  { rowId: "rc09:wmc_base_concrete", section: "Материалы", category: "material", titleRu: "Бетон основания и стен камер", unitId: "m3", formulaId: "wmc_base_concrete_volume_v1", expression: "wmc_base_concrete_volume_m3", procurementEligible: true },
  { rowId: "rc09:wmc_blinding_concrete", section: "Материалы", category: "material", titleRu: "Подготовительный бетон", unitId: "m3", formulaId: "wmc_blinding_concrete_volume_v1", expression: "wmc_blinding_concrete_volume_m3", procurementEligible: true },
  { rowId: "rc09:wmc_rebar", section: "Материалы", category: "material", titleRu: "Арматура камер", unitId: "kg", formulaId: "wmc_rebar_mass_v1", expression: "wmc_rebar_mass_kg", procurementEligible: true },
  { rowId: "rc09:wmc_formwork", section: "Работы", category: "construction_work", titleRu: "Опалубка камер", unitId: "m2", formulaId: "wmc_formwork_area_v1", expression: "wmc_formwork_area_m2" },
  { rowId: "rc09:wmc_waterproofing", section: "Материалы", category: "material", titleRu: "Гидроизоляция камер", unitId: "m2", formulaId: "wmc_waterproofing_area_v1", expression: "wmc_waterproofing_area_m2", procurementEligible: true },
  { rowId: "rc09:wmc_backfill", section: "Материалы", category: "material", titleRu: "Обратная засыпка камер", unitId: "m3", formulaId: "wmc_backfill_volume_v1", expression: "wmc_backfill_volume_m3", procurementEligible: true },
  { rowId: "rc09:wmc_commissioning_consumables", section: "Расходники", category: "material", titleRu: "Монтажные и пусковые расходники", unitId: "set", formulaId: "wmc_commissioning_consumable_quantity_v1", expression: "wmc_commissioning_consumable_quantity_set", procurementEligible: true, titleParameterIds: ["wmc_commissioning_consumable_designation"] },
  { rowId: "rc09:wmc_signal_cable", section: "Материалы", category: "material", titleRu: "Сигнальный кабель счётчиков", unitId: "m", formulaId: "wmc_signal_cable_length_v1", expression: "wmc_signal_cable_length_m", procurementEligible: true, titleParameterIds: ["wmc_signal_cable_designation"] },
  { rowId: "rc09:wmc_hydraulic_tests", section: "Контроль", category: "service", titleRu: "Гидравлические испытания трубопроводов", unitId: "m", formulaId: "wmc_hydraulic_test_length_v1", expression: "wmc_hydraulic_test_length_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wmc_meter_calibration", section: "Контроль", category: "service", titleRu: "Метрологическая поверка счётчиков", unitId: "test", formulaId: "wmc_meter_calibration_test_v1", expression: "wmc_meter_calibration_test_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wmc_electrical_tests", section: "Контроль", category: "service", titleRu: "Электрические испытания счётчиков", unitId: "test", formulaId: "wmc_electrical_test_v1", expression: "wmc_electrical_test_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wmc_asbuilt_documents", section: "Документы", category: "service", titleRu: "Исполнительная документация водомерных узлов", unitId: "document", formulaId: "wmc_asbuilt_document_v1", expression: "wmc_asbuilt_document_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wmc_excavation_shoring", section: "Условные работы", category: "construction_work", titleRu: "Крепление котлованов", unitId: "m2", formulaId: "wmc_excavation_shoring_area_v1", expression: "wmc_excavation_shoring_area_m2", inclusionAst: equals("wmc_excavation_shoring_mode", "REQUIRED"), titleParameterIds: ["wmc_excavation_shoring_designation"] },
  { rowId: "rc09:wmc_groundwater_dewatering", section: "Условные механизмы", category: "equipment", titleRu: "Водопонижение котлованов", unitId: "machine_hour", formulaId: "wmc_groundwater_dewatering_machine_v1", expression: "wmc_groundwater_dewatering_machine_h", procurementEligible: true, inclusionAst: equals("wmc_groundwater_dewatering_mode", "REQUIRED"), titleParameterIds: ["wmc_groundwater_dewatering_designation"] },
  { rowId: "rc09:wmc_road_reinstatement", section: "Условные работы", category: "construction_work", titleRu: "Восстановление дорожного покрытия", unitId: "m2", formulaId: "wmc_road_reinstatement_area_v1", expression: "wmc_road_reinstatement_area_m2", inclusionAst: equals("wmc_road_reinstatement_mode", "REQUIRED"), titleParameterIds: ["wmc_road_reinstatement_designation"] },
  { rowId: "rc09:wmc-meter-balance:installed-net", section: "Баланс счётчиков", category: "equipment", titleRu: "Установленные счётчики", unitId: "piece", formulaId: "wmc_meter_installed_net_v1", expression: "wmc_meter_installed_piece", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wmc-meter-balance:retained-spare", section: "Баланс счётчиков", category: "equipment", titleRu: "Сохраняемый запас счётчиков", unitId: "piece", formulaId: "wmc_meter_retained_spare_v1", expression: "wmc_meter_retained_spare_piece", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wmc-meter-balance:total-need", section: "Баланс счётчиков", category: "equipment", titleRu: "Общая потребность в счётчиках", unitId: "piece", formulaId: "wmc_meter_total_need_v1", expression: "wmc_meter_installed_piece+wmc_meter_retained_spare_piece", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wmc-meter-balance:package-count", section: "Баланс счётчиков", category: "equipment", titleRu: "Количество упаковок счётчиков", unitId: "package", formulaId: "wmc_meter_package_count_v1", expression: "ceil((wmc_meter_installed_piece+wmc_meter_retained_spare_piece)/wmc_meter_supplier_package_quantity_piece)", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wmc-meter-balance:remainder", section: "Баланс счётчиков", category: "equipment", titleRu: "Остаток счётчиков после монтажа", unitId: "piece", formulaId: "wmc_meter_remainder_v1", expression: "ceil((wmc_meter_installed_piece+wmc_meter_retained_spare_piece)/wmc_meter_supplier_package_quantity_piece)*wmc_meter_supplier_package_quantity_piece-wmc_meter_installed_piece", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wmc-meter-balance:surplus-beyond-spare", section: "Баланс счётчиков", category: "equipment", titleRu: "Свободный остаток счётчиков сверх запаса", unitId: "piece", formulaId: "wmc_meter_surplus_v1", expression: "max(0,ceil((wmc_meter_installed_piece+wmc_meter_retained_spare_piece)/wmc_meter_supplier_package_quantity_piece)*wmc_meter_supplier_package_quantity_piece-wmc_meter_installed_piece-wmc_meter_retained_spare_piece)", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:labor:wmc-survey", section: "Труд", category: "construction_work", titleRu: "Разбивка и исполнительная съёмка", unitId: "man_hour", formulaId: "wmc_survey_labor_v1", expression: "wmc_survey_labor_h" },
  { rowId: "rc09:labor:wmc-civil", section: "Труд", category: "construction_work", titleRu: "Устройство камер", unitId: "man_hour", formulaId: "wmc_civil_labor_v1", expression: "wmc_civil_labor_h" },
  { rowId: "rc09:labor:wmc-piping", section: "Труд", category: "construction_work", titleRu: "Монтаж трубопроводов и арматуры", unitId: "man_hour", formulaId: "wmc_piping_labor_v1", expression: "wmc_piping_labor_h" },
  { rowId: "rc09:labor:wmc-meter-electrical", section: "Труд", category: "construction_work", titleRu: "Монтаж счётчиков и электрических подключений", unitId: "man_hour", formulaId: "wmc_meter_electrical_labor_v1", expression: "wmc_meter_electrical_labor_h" },
  { rowId: "rc09:labor:wmc-qa-documentation", section: "Труд", category: "construction_work", titleRu: "Испытания, поверка и документация", unitId: "man_hour", formulaId: "wmc_qa_documentation_labor_v1", expression: "wmc_qa_documentation_labor_h" },
  { rowId: "rc09:equipment:wmc-excavator", section: "Механизмы", category: "equipment", titleRu: "Экскаватор", unitId: "machine_hour", formulaId: "wmc_excavator_machine_v1", expression: "wmc_excavator_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:wmc-crane", section: "Механизмы", category: "equipment", titleRu: "Кран", unitId: "machine_hour", formulaId: "wmc_crane_machine_v1", expression: "wmc_crane_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:wmc-compactor", section: "Механизмы", category: "equipment", titleRu: "Грунтовый уплотнитель", unitId: "machine_hour", formulaId: "wmc_compactor_machine_v1", expression: "wmc_compactor_machine_h", procurementEligible: true },
  { rowId: "rc09:logistics:wmc-material-delivery", section: "Логистика", category: "service", titleRu: "Доставка камер, труб и оборудования", unitId: "trip", formulaId: "wmc_material_delivery_trip_v1", expression: "wmc_material_delivery_trip_count", procurementEligible: true },
  { rowId: "rc09:logistics:wmc-waste-removal", section: "Логистика", category: "service", titleRu: "Вывоз грунта, тары и отходов", unitId: "trip", formulaId: "wmc_waste_removal_trip_v1", expression: "wmc_waste_removal_trip_count", procurementEligible: true },
]);

export const WATER_METER_CHAMBERS_FORMULAS: readonly CanonicalEstimateFormulaDefinition[] =
  Object.freeze(ROW_SPECS.map((row) => {
    const compiled = compileFormulaGraph(row.expression);
    return { formula_id: row.formulaId, output_unit_id: row.unitId,
      expression_source: row.expression, ast: compiled.ast,
      input_parameter_ids: compiled.inputParameterIds,
      ast_sha256: "runtime-publisher-replaces-with-deterministic-sha256" };
  }));
export const WATER_METER_CHAMBERS_RESOURCES: readonly CanonicalEstimateResourceDefinition[] =
  Object.freeze(ROW_SPECS.map((row, ordinal) => {
    const resourceGraph = { formulaId: row.formulaId, normalizedUom: row.unitId,
      semanticOwnerId: `water-meter-chambers:${row.rowId}`, costOwner: "resource",
      ...(row.titleParameterIds ? { titleSpecificationParameterIds: row.titleParameterIds,
        titleSpecificationMode: "APPEND", titleSpecificationSeparator: " — " } : {}),
      scopeContextParameterIds: KNOWN_SCOPE, costTreatment: row.costTreatment ?? "OWN_COST" };
    const sourceRole = "APPROVED_WATER_METER_CHAMBERS_PROJECT_PACKAGE";
    const sourceMetadata = { truth_contract_version: "R3", synthetic: false, sourceRole,
      normativeTrace: [{ sourceId: WATER_METER_CHAMBERS_SOURCE_ID,
        source_id: WATER_METER_CHAMBERS_SOURCE_ID, normId: WATER_METER_CHAMBERS_NORM_ID,
        norm_id: WATER_METER_CHAMBERS_NORM_ID,
        normVersion: WATER_METER_CHAMBERS_SOURCE_METADATA.source_document_version,
        source_title: WATER_METER_CHAMBERS_SOURCE_METADATA.source_title,
        exact_locator: WATER_METER_CHAMBERS_SOURCE_METADATA.exact_locator,
        source_definition_hash: WATER_METER_CHAMBERS_SOURCE_METADATA.definition_hash, sourceRole }],
      excludedUnownedAssumptions: [
        "external network, intake, borehole, pumping, treatment, reservoir, tower or sewer",
        "flow-length-or-diameter-derived valve, civil, labor, mechanism or logistics quantity",
        "automatic shoring, dewatering or road reinstatement",
        "automatic retained spare or supplier package", "invented price",
      ] };
    return { id: `resource-${row.rowId.replace(/:/gu, "-")}`, row_id: row.rowId,
      ordinal, section: row.section, category: row.category, title_ru: row.titleRu,
      unit_id: row.unitId, formula_id: row.formulaId, inclusion_ast: row.inclusionAst ?? literalTrue,
      resource_graph: resourceGraph, procurement_eligible: row.procurementEligible ?? false,
      cost_owner_id: row.rowId, source_metadata: sourceMetadata,
      row_sha256: estimateDeterministicHash({ row, ordinal, resourceGraph, sourceMetadata }) };
  }));

export const WATER_METER_CHAMBERS_SHORT_INPUT = Object.freeze({
  wmc_chamber_count: 4, wmc_chamber_designation: "WMC-RC-DN150-4-EMF",
  wmc_chamber_type: "RC_WATER_METER_CHAMBER_WITH_BYPASS", wmc_design_flow_m3_day: 1200,
  wmc_meter_installed_piece: 4, wmc_meter_designation: "EMF-DN150-PN16",
  wmc_straight_pipe_installed_m: 96,
  wmc_straight_pipe_designation: "STEEL-EPOXY-DN150-PN16",
  wmc_bypass_pipe_installed_m: 48,
  wmc_bypass_pipe_designation: "STEEL-EPOXY-DN150-PN16",
  ...WATER_METER_CHAMBERS_RUNTIME_INPUT,
});
export const WATER_METER_CHAMBERS_ACCEPTANCE_INPUT = Object.freeze({
  ...WATER_METER_CHAMBERS_SHORT_INPUT,
  wmc_isolation_valve_designation: "GATE-VALVE-DN150-PN16",
  wmc_isolation_valve_quantity_piece: 12,
  wmc_check_valve_designation: "CHECK-VALVE-DN150-PN16", wmc_check_valve_quantity_piece: 4,
  wmc_strainer_designation: "Y-STRAINER-DN150-PN16", wmc_strainer_quantity_piece: 4,
  wmc_dismantling_joint_designation: "DISMANTLING-JOINT-DN150-PN16",
  wmc_dismantling_joint_quantity_piece: 8,
  wmc_fitting_designation: "DN150-METER-BYPASS-FITTING-KIT", wmc_fitting_quantity_set: 4,
  wmc_cover_designation: "D400-DN600", wmc_cover_quantity_piece: 4,
  wmc_ladder_designation: "SS304-CHAMBER-LADDER", wmc_ladder_quantity_piece: 4,
  wmc_pipe_support_designation: "GALV-DN150-PIPE-SUPPORT", wmc_pipe_support_quantity_piece: 48,
  wmc_penetration_seal_designation: "LINK-SEAL-DN150", wmc_penetration_seal_quantity_piece: 32,
  wmc_base_concrete_volume_m3: 72, wmc_blinding_concrete_volume_m3: 20,
  wmc_rebar_mass_kg: 8800, wmc_formwork_area_m2: 420,
  wmc_waterproofing_area_m2: 560, wmc_backfill_volume_m3: 360,
  wmc_commissioning_consumable_designation: "METER-GASKET-BOLT-SEAL-KIT",
  wmc_commissioning_consumable_quantity_set: 4,
  wmc_signal_cable_designation: "LIYCY-4X1.5", wmc_signal_cable_length_m: 320,
  wmc_hydraulic_test_length_m: 144, wmc_meter_calibration_test_count: 4,
  wmc_electrical_test_count: 4, wmc_asbuilt_document_count: 1,
  wmc_survey_labor_h: 160, wmc_civil_labor_h: 1200, wmc_piping_labor_h: 1100,
  wmc_meter_electrical_labor_h: 520, wmc_qa_documentation_labor_h: 260,
  wmc_excavator_machine_h: 180, wmc_crane_machine_h: 120, wmc_compactor_machine_h: 90,
  wmc_material_delivery_trip_count: 36, wmc_waste_removal_trip_count: 18,
  wmc_excavation_shoring_mode: "NOT_REQUIRED",
  wmc_groundwater_dewatering_mode: "NOT_REQUIRED", wmc_road_reinstatement_mode: "NOT_REQUIRED",
});

export async function compileWaterMeterChambersR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? WATER_METER_CHAMBERS_CATALOG_ID;
  if (catalogId !== WATER_METER_CHAMBERS_CATALOG_ID) {
    throw new Error(`WATER_METER_CHAMBERS_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({ operation: "compile",
    compilerVersion: "canonical-estimate-compiler.water-meter-chambers-r1", catalogId,
    primaryMeasureParameterId: "wmc_chamber_count",
    parameterDefinitions: [...WATER_METER_CHAMBERS_PARAMETERS],
    formulaDefinitions: [...WATER_METER_CHAMBERS_FORMULAS],
    resourceDefinitions: [...WATER_METER_CHAMBERS_RESOURCES], submittedParameters,
    confirmedParameters: { ...WATER_METER_CHAMBERS_RUNTIME_INPUT }, currencyCode: "KGS",
    priceItems: [], maximumResourceRows: 45, hashJson: async (value) => JSON.stringify(value) });
}
