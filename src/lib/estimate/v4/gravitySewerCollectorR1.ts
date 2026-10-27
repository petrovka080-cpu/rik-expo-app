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

export const GRAVITY_SEWER_COLLECTOR_CATALOG_ID =
  "canonical-work:expanded:gravity_sewer_collector";
export const GRAVITY_SEWER_COLLECTOR_SOURCE_ID =
  "project_gravity_sewer_collector_route_trench_manhole_qa_balance_v1";
export const GRAVITY_SEWER_COLLECTOR_NORM_ID =
  "norm:project:gravity_sewer_collector:route_trench_manhole_qa_balance:v1";

export const GRAVITY_SEWER_COLLECTOR_SOURCE_METADATA = Object.freeze({
  source_title: "Утверждённый план и продольный профиль самотечного коллектора, спецификация трубной системы и колодцев, ППР и программа контроля",
  source_authority: "Проектная организация водоснабжения и канализации, инженер-геолог, изготовитель трубной системы, строительная лаборатория и утверждающий инженер проекта",
  source_document_version: "PROJECT_GRAVITY_SEWER_COLLECTOR_ROUTE_TRENCH_MANHOLE_MATERIAL_LABOR_EQUIPMENT_QA_LOGISTICS_BALANCE_S27_24",
  definition_hash: "662b7d8ad752bacdd705778225896aa1a6719b50e425e932465e096430d3fcf0",
  exact_locator: "Один коллектор, 600 м выбранной трубы PVC-U SN8 OD 200 с уклоном 0,007; траншея, основание, обсыпка, колодцы, комплектующие, труд, механизмы, контроль и логистика — только по утверждённому проектному комплекту",
  use_restriction: "Длина трассы не определяет объёмы земляных работ, число колодцев, фасонных частей или труд. Водоотлив, крепление траншеи и восстановление дороги включаются только при прямом проектном основании. КНС, внутридомовая канализация и смежные сети исключены.",
  source_kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
  artifact_sha256: "662b7d8ad752bacdd705778225896aa1a6719b50e425e932465e096430d3fcf0",
});

const KNOWN_SCOPE = [
  "gsc_collector_count", "gsc_route_length_m", "gsc_pipe_material_grade",
  "gsc_ring_stiffness_class", "gsc_pipe_outside_diameter_mm",
  "gsc_slope_m_per_m", "gsc_pipe_designation",
];
const VISIBLE_PRELIMINARY_PROFILE = new Set([
  "gsc_pipe_retained_spare_m", "gsc_pipe_supplier_stick_length_m",
]);
const CONDITIONAL_DETAILS = new Set([
  "gsc_dewatering_designation", "gsc_dewatering_machine_h",
  "gsc_shoring_designation", "gsc_shoring_area_m2",
  "gsc_road_restoration_designation", "gsc_road_restoration_area_m2",
]);

const PARAMETER_SPECS = Object.freeze([
  ["gsc_collector_count", "Количество самотечных канализационных коллекторов", "integer", "system", null],
  ["gsc_route_length_m", "Проектная длина трассы коллектора", "decimal", "m", null],
  ["gsc_pipe_material_grade", "Материал трубы коллектора", "text", null, null],
  ["gsc_ring_stiffness_class", "Класс кольцевой жёсткости трубы", "text", null, null],
  ["gsc_pipe_outside_diameter_mm", "Наружный диаметр трубы", "decimal", "mm", null],
  ["gsc_slope_m_per_m", "Проектный уклон коллектора", "decimal", "m_per_m", null],
  ["gsc_pipe_designation", "Марка выбранной трубы коллектора", "text", null, null],
  ["gsc_pipe_retained_spare_m", "Сохраняемый резерв трубы", "decimal", "m", null],
  ["gsc_pipe_supplier_stick_length_m", "Поставочная длина одной трубы", "decimal", "m", null],
  ["gsc_trench_excavation_volume_m3", "Проектный объём разработки траншеи", "decimal", "m3", null],
  ["gsc_bedding_designation", "Материал основания трубы", "text", null, null],
  ["gsc_bedding_volume_m3", "Проектный объём основания трубы", "decimal", "m3", null],
  ["gsc_surround_designation", "Материал защитной обсыпки трубы", "text", null, null],
  ["gsc_surround_volume_m3", "Проектный объём защитной обсыпки", "decimal", "m3", null],
  ["gsc_backfill_designation", "Материал обратной засыпки траншеи", "text", null, null],
  ["gsc_backfill_volume_m3", "Проектный объём обратной засыпки", "decimal", "m3", null],
  ["gsc_excess_soil_volume_m3", "Проектный объём вывоза лишнего грунта", "decimal", "m3", null],
  ["gsc_manhole_designation", "Тип канализационного колодца", "text", null, null],
  ["gsc_manhole_quantity_piece", "Количество колодцев по плану и профилю", "decimal", "pcs", null],
  ["gsc_cover_designation", "Тип люка канализационного колодца", "text", null, null],
  ["gsc_cover_quantity_piece", "Количество люков", "decimal", "pcs", null],
  ["gsc_fitting_designation", "Фасонные части выбранной трубной системы", "text", null, null],
  ["gsc_fitting_quantity_piece", "Количество фасонных частей", "decimal", "pcs", null],
  ["gsc_seal_designation", "Уплотнительное кольцо выбранной трубной системы", "text", null, null],
  ["gsc_seal_quantity_piece", "Количество уплотнительных колец", "decimal", "pcs", null],
  ["gsc_lubricant_designation", "Монтажная смазка раструбных соединений", "text", null, null],
  ["gsc_lubricant_mass_kg", "Масса монтажной смазки", "decimal", "kg", null],
  ["gsc_warning_tape_designation", "Сигнальная лента коллектора", "text", null, null],
  ["gsc_warning_tape_length_m", "Длина сигнальной ленты", "decimal", "m", null],
  ["gsc_leak_test_designation", "Испытание коллектора на герметичность", "text", null, null],
  ["gsc_leak_test_count", "Количество испытаний на герметичность", "decimal", "test", null],
  ["gsc_cctv_inspection_length_m", "Длина телевизионной инспекции коллектора", "decimal", "m", null],
  ["gsc_asbuilt_document_count", "Количество комплектов исполнительной документации", "decimal", "document", null],
  ["gsc_survey_labor_h", "Труд геодезического сопровождения", "decimal", "man_hour", null],
  ["gsc_earthworks_labor_h", "Труд по земляным работам", "decimal", "man_hour", null],
  ["gsc_pipe_manhole_install_labor_h", "Труд по монтажу труб и колодцев", "decimal", "man_hour", null],
  ["gsc_qa_documentation_labor_h", "Труд по контролю и исполнительной документации", "decimal", "man_hour", null],
  ["gsc_excavator_machine_h", "Работа экскаватора", "decimal", "machine_hour", null],
  ["gsc_compactor_machine_h", "Работа уплотняющего механизма", "decimal", "machine_hour", null],
  ["gsc_pipe_laser_machine_h", "Работа лазерного прибора контроля уклона", "decimal", "machine_hour", null],
  ["gsc_delivery_trip_count", "Рейсы доставки материалов коллектора", "integer", "trip", null],
  ["gsc_removal_trip_count", "Рейсы вывоза грунта и отходов", "integer", "trip", null],
  ["gsc_dewatering_mode", "Водоотлив требуется по проекту", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["gsc_dewatering_designation", "Оборудование водоотлива", "text", null, null],
  ["gsc_dewatering_machine_h", "Работа оборудования водоотлива", "decimal", "machine_hour", null],
  ["gsc_shoring_mode", "Крепление стенок траншеи требуется по проекту", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["gsc_shoring_designation", "Система крепления стенок траншеи", "text", null, null],
  ["gsc_shoring_area_m2", "Площадь крепления стенок траншеи", "decimal", "m2", null],
  ["gsc_road_restoration_mode", "Восстановление дорожного покрытия требуется по проекту", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["gsc_road_restoration_designation", "Конструкция восстановления дорожного покрытия", "text", null, null],
  ["gsc_road_restoration_area_m2", "Площадь восстановления дорожного покрытия", "decimal", "m2", null],
] as const);

function conditionalConstraints(parameterId: string): Json {
  const branch = parameterId.startsWith("gsc_dewatering_")
    && parameterId !== "gsc_dewatering_mode" ? "gsc_dewatering_mode"
    : parameterId.startsWith("gsc_shoring_") && parameterId !== "gsc_shoring_mode"
      ? "gsc_shoring_mode"
      : parameterId.startsWith("gsc_road_restoration_")
        && parameterId !== "gsc_road_restoration_mode" ? "gsc_road_restoration_mode" : null;
  if (!branch) return {};
  return {
    requiredWhen: { kind: "equals", parameterId: branch, value: "REQUIRED" },
    forbiddenWhen: { kind: "equals", parameterId: branch, value: "NOT_REQUIRED" },
  };
}

export type GravitySewerCollectorParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number; unit_id: string | null; title_ru: string; truth_metadata: Json;
};

export const GRAVITY_SEWER_COLLECTOR_PARAMETERS:
readonly GravitySewerCollectorParameter[] = Object.freeze(PARAMETER_SPECS.map(
  ([parameterId, titleRu, valueType, unitId, enumValues], ordinal) => ({
    parameter_id: parameterId, ordinal, value_type: valueType, unit_id: unitId,
    title_ru: titleRu, required: !CONDITIONAL_DETAILS.has(parameterId), default_value: null,
    constraints_json: {
      ...(enumValues ? { values: enumValues }
        : valueType === "decimal" || valueType === "integer"
          ? { min: parameterId === "gsc_pipe_retained_spare_m"
            ? 0 : valueType === "integer" ? 1 : 0.000_001 }
          : valueType === "text" ? { minLength: 1, maxLength: 1_000 } : {}),
      ...conditionalConstraints(parameterId),
    },
    truth_metadata: {
      contract: "rik-expo-app.gravity-sewer-collector-r1",
      semantic_parameter_key: `gravity-sewer-collector:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: KNOWN_SCOPE.includes(parameterId) ? "USER_INPUT"
        : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
          ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE" : "PROJECT_SPECIFIC_INPUT",
      input_origin_class: KNOWN_SCOPE.includes(parameterId) ? "KNOWN_WORK_SCOPE"
        : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
          ? "VISIBLE_PRELIMINARY_PROCUREMENT_BALANCE"
          : "APPROVED_ROUTE_TRENCH_MANHOLE_METHOD_OR_QA_DOCUMENTATION",
      preliminary_compilation_allowed: true,
      source_confirmation_required: !KNOWN_SCOPE.includes(parameterId)
        && !VISIBLE_PRELIMINARY_PROFILE.has(parameterId),
      guide: {
        guide_kind: KNOWN_SCOPE.includes(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
        guide_short_ru: KNOWN_SCOPE.includes(parameterId)
          ? `${titleRu}: укажите по явному запросу, плану и продольному профилю коллектора.`
          : `${titleRu}: укажите по проекту, спецификации, ведомости объёмов, ППР или программе контроля.`,
        source_role: KNOWN_SCOPE.includes(parameterId)
          ? "USER_SUPPLIED_OR_APPROVED_COLLECTOR_SCOPE"
          : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
            ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE"
            : "APPROVED_ROUTE_TRENCH_MANHOLE_METHOD_OR_QA_DOCUMENTATION",
        source_document: GRAVITY_SEWER_COLLECTOR_SOURCE_ID,
        source_locator: GRAVITY_SEWER_COLLECTOR_SOURCE_METADATA.exact_locator,
        guide_version: "gravity-sewer-collector-r1",
        source_snapshot_hash: GRAVITY_SEWER_COLLECTOR_SOURCE_METADATA.artifact_sha256,
        applicability: "Только для явно определённого самотечного коллектора; КНС, внутридомовая канализация и смежные сети исключены.",
        verified_at: "2026-10-01T00:00:00+06:00",
        guide_validation_policy: "DEFER_MISSING_PROJECT_VALUE_ROW_LOCALLY_REJECT_INVALID_SUPPLIED_VALUE",
      },
      hidden_default_forbidden: true,
      runtime_profile_value: VISIBLE_PRELIMINARY_PROFILE.has(parameterId),
      synthetic: false,
    },
  })),
);

export const GRAVITY_SEWER_COLLECTOR_RUNTIME_INPUT = Object.freeze({
  gsc_pipe_retained_spare_m: 0,
  gsc_pipe_supplier_stick_length_m: 1,
});
export const GRAVITY_SEWER_COLLECTOR_RUNTIME_CLASSIFICATION = Object.freeze(
  Object.fromEntries(Object.keys(GRAVITY_SEWER_COLLECTOR_RUNTIME_INPUT).map(
    (parameterId) => [parameterId, "ASSUMPTION"],
  )) as Readonly<Record<string, "ASSUMPTION">>,
);
export const GRAVITY_SEWER_COLLECTOR_RUNTIME_SOURCE_IDS = Object.freeze(
  Object.fromEntries(Object.keys(GRAVITY_SEWER_COLLECTOR_RUNTIME_INPUT).map(
    (parameterId) => [parameterId, [GRAVITY_SEWER_COLLECTOR_SOURCE_ID]],
  )) as Readonly<Record<string, readonly string[]>>,
);

function formula(formulaId: string, outputUnitId: string, expression: string) {
  const compiled = compileFormulaGraph(expression);
  return { formula_id: formulaId, output_unit_id: outputUnitId, expression_source: expression,
    ast: compiled.ast, input_parameter_ids: compiled.inputParameterIds,
    ast_sha256: "runtime-publisher-replaces-with-deterministic-sha256" };
}

export const GRAVITY_SEWER_COLLECTOR_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  formula("gsc_collector_install_count_v1", "system", "gsc_collector_count"),
  formula("gsc_pipe_order_length_v1", "m", "ceil((gsc_route_length_m+gsc_pipe_retained_spare_m)/gsc_pipe_supplier_stick_length_m)*gsc_pipe_supplier_stick_length_m"),
  formula("gsc_trench_excavation_v1", "m3", "gsc_trench_excavation_volume_m3"),
  formula("gsc_bedding_volume_v1", "m3", "gsc_bedding_volume_m3"),
  formula("gsc_surround_volume_v1", "m3", "gsc_surround_volume_m3"),
  formula("gsc_backfill_volume_v1", "m3", "gsc_backfill_volume_m3"),
  formula("gsc_excess_soil_volume_v1", "m3", "gsc_excess_soil_volume_m3"),
  formula("gsc_manhole_quantity_v1", "pcs", "gsc_manhole_quantity_piece"),
  formula("gsc_cover_quantity_v1", "pcs", "gsc_cover_quantity_piece"),
  formula("gsc_fitting_quantity_v1", "pcs", "gsc_fitting_quantity_piece"),
  formula("gsc_seal_quantity_v1", "pcs", "gsc_seal_quantity_piece"),
  formula("gsc_lubricant_mass_v1", "kg", "gsc_lubricant_mass_kg"),
  formula("gsc_warning_tape_length_v1", "m", "gsc_warning_tape_length_m"),
  formula("gsc_leak_test_count_v1", "test", "gsc_leak_test_count"),
  formula("gsc_cctv_inspection_length_v1", "m", "gsc_cctv_inspection_length_m"),
  formula("gsc_asbuilt_document_count_v1", "document", "gsc_asbuilt_document_count"),
  formula("gsc_dewatering_machine_v1", "machine_hour", "gsc_dewatering_machine_h"),
  formula("gsc_shoring_area_v1", "m2", "gsc_shoring_area_m2"),
  formula("gsc_road_restoration_area_v1", "m2", "gsc_road_restoration_area_m2"),
  formula("gsc_pipe_installed_net_v1", "m", "gsc_route_length_m"),
  formula("gsc_pipe_retained_spare_v1", "m", "gsc_pipe_retained_spare_m"),
  formula("gsc_pipe_total_need_v1", "m", "gsc_route_length_m+gsc_pipe_retained_spare_m"),
  formula("gsc_pipe_stick_count_v1", "pcs", "ceil((gsc_route_length_m+gsc_pipe_retained_spare_m)/gsc_pipe_supplier_stick_length_m)"),
  formula("gsc_pipe_remainder_v1", "m", "ceil((gsc_route_length_m+gsc_pipe_retained_spare_m)/gsc_pipe_supplier_stick_length_m)*gsc_pipe_supplier_stick_length_m-gsc_route_length_m"),
  formula("gsc_pipe_surplus_v1", "m", "max(0,ceil((gsc_route_length_m+gsc_pipe_retained_spare_m)/gsc_pipe_supplier_stick_length_m)*gsc_pipe_supplier_stick_length_m-gsc_route_length_m-gsc_pipe_retained_spare_m)"),
  formula("gsc_survey_labor_v1", "man_hour", "gsc_survey_labor_h"),
  formula("gsc_earthworks_labor_v1", "man_hour", "gsc_earthworks_labor_h"),
  formula("gsc_pipe_manhole_install_labor_v1", "man_hour", "gsc_pipe_manhole_install_labor_h"),
  formula("gsc_qa_documentation_labor_v1", "man_hour", "gsc_qa_documentation_labor_h"),
  formula("gsc_excavator_machine_v1", "machine_hour", "gsc_excavator_machine_h"),
  formula("gsc_compactor_machine_v1", "machine_hour", "gsc_compactor_machine_h"),
  formula("gsc_pipe_laser_machine_v1", "machine_hour", "gsc_pipe_laser_machine_h"),
  formula("gsc_delivery_trip_v1", "trip", "gsc_delivery_trip_count"),
  formula("gsc_removal_trip_v1", "trip", "gsc_removal_trip_count"),
]);

const literalTrue = Object.freeze({ kind: "literal", value: true });
const equals = (parameterId: string, value: InputValue) => ({ kind: "equals", parameterId, value });

function resource(input: { rowId: string; ordinal: number; section: string; category: string;
  titleRu: string; unitId: string; formulaId: string; sourceRole: string;
  procurementEligible: boolean; inclusionAst?: Json; titleParameterIds?: string[];
  costTreatment?: "OWN_COST" | "INFORMATIONAL_SCOPE" | "INCLUDED_IN_RESOURCE_ROWS";
}): CanonicalEstimateResourceDefinition {
  const resourceGraph = { formulaId: input.formulaId, normalizedUom: input.unitId,
    semanticOwnerId: `gravity-sewer-collector:${input.rowId}`, costOwner: "resource",
    ...(input.titleParameterIds ? { titleSpecificationParameterIds: input.titleParameterIds,
      titleSpecificationMode: "APPEND", titleSpecificationSeparator: " — " } : {}),
    scopeContextParameterIds: KNOWN_SCOPE, costTreatment: input.costTreatment ?? "OWN_COST" };
  const sourceMetadata = { truth_contract_version: "R3", synthetic: false,
    sourceRole: input.sourceRole, normativeTrace: [{
      sourceId: GRAVITY_SEWER_COLLECTOR_SOURCE_ID,
      source_id: GRAVITY_SEWER_COLLECTOR_SOURCE_ID,
      normId: GRAVITY_SEWER_COLLECTOR_NORM_ID,
      norm_id: GRAVITY_SEWER_COLLECTOR_NORM_ID,
      normVersion: GRAVITY_SEWER_COLLECTOR_SOURCE_METADATA.source_document_version,
      source_title: GRAVITY_SEWER_COLLECTOR_SOURCE_METADATA.source_title,
      exact_locator: GRAVITY_SEWER_COLLECTOR_SOURCE_METADATA.exact_locator,
      source_definition_hash: GRAVITY_SEWER_COLLECTOR_SOURCE_METADATA.definition_hash,
      sourceRole: input.sourceRole,
    }], excludedUnownedAssumptions: [
      "generic length-derived trench, bedding, backfill, labor or mechanism coefficient",
      "automatic manhole spacing or connection-node count",
      "automatic fitting, dewatering, shoring or road-restoration selection",
      "automatic retained spare or supplier stick length",
      "pumping station, building drainage or adjacent utility network", "invented price",
    ] };
  return { id: `resource-${input.rowId.replace(/:/gu, "-")}`, row_id: input.rowId,
    ordinal: input.ordinal, section: input.section, category: input.category,
    title_ru: input.titleRu, unit_id: input.unitId, formula_id: input.formulaId,
    inclusion_ast: input.inclusionAst ?? literalTrue, resource_graph: resourceGraph,
    procurement_eligible: input.procurementEligible, cost_owner_id: input.rowId,
    source_metadata: sourceMetadata,
    row_sha256: estimateDeterministicHash({ input, resourceGraph, sourceMetadata }) };
}

export const GRAVITY_SEWER_COLLECTOR_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  resource({ rowId: "rc09:gsc_collector_install_acceptance", ordinal: 0, section: "Работы", category: "construction_work", titleRu: "Строительство и приёмка самотечного канализационного коллектора", unitId: "system", formulaId: "gsc_collector_install_count_v1", sourceRole: "USER_SUPPLIED_OR_APPROVED_COLLECTOR_SCOPE", procurementEligible: false, costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:gsc_pipe", ordinal: 1, section: "Материалы", category: "material", titleRu: "Труба самотечного канализационного коллектора", unitId: "m", formulaId: "gsc_pipe_order_length_v1", titleParameterIds: ["gsc_pipe_designation", "gsc_pipe_material_grade", "gsc_ring_stiffness_class"], sourceRole: "USER_SELECTED_AND_APPROVED_PIPE_SYSTEM", procurementEligible: true }),
  resource({ rowId: "rc09:gsc_trench_excavation", ordinal: 2, section: "Земляные работы", category: "construction_work", titleRu: "Разработка траншеи коллектора", unitId: "m3", formulaId: "gsc_trench_excavation_v1", sourceRole: "APPROVED_TRENCH_VOLUME_SCHEDULE", procurementEligible: false }),
  resource({ rowId: "rc09:gsc_bedding", ordinal: 3, section: "Материалы", category: "material", titleRu: "Основание под трубу коллектора", unitId: "m3", formulaId: "gsc_bedding_volume_v1", titleParameterIds: ["gsc_bedding_designation"], sourceRole: "APPROVED_TRENCH_AND_BEDDING_DETAIL", procurementEligible: true }),
  resource({ rowId: "rc09:gsc_surround", ordinal: 4, section: "Материалы", category: "material", titleRu: "Защитная обсыпка трубы коллектора", unitId: "m3", formulaId: "gsc_surround_volume_v1", titleParameterIds: ["gsc_surround_designation"], sourceRole: "APPROVED_TRENCH_AND_BEDDING_DETAIL", procurementEligible: true }),
  resource({ rowId: "rc09:gsc_backfill", ordinal: 5, section: "Материалы", category: "material", titleRu: "Обратная засыпка траншеи коллектора", unitId: "m3", formulaId: "gsc_backfill_volume_v1", titleParameterIds: ["gsc_backfill_designation"], sourceRole: "APPROVED_EARTHWORK_BALANCE", procurementEligible: true }),
  resource({ rowId: "rc09:gsc_excess_soil_removal", ordinal: 6, section: "Земляные работы", category: "service", titleRu: "Вывоз лишнего грунта", unitId: "m3", formulaId: "gsc_excess_soil_volume_v1", sourceRole: "APPROVED_EARTHWORK_BALANCE", procurementEligible: true }),
  resource({ rowId: "rc09:gsc_manhole", ordinal: 7, section: "Сооружения", category: "material", titleRu: "Канализационный колодец коллектора", unitId: "pcs", formulaId: "gsc_manhole_quantity_v1", titleParameterIds: ["gsc_manhole_designation"], sourceRole: "APPROVED_MANHOLE_SCHEDULE", procurementEligible: true }),
  resource({ rowId: "rc09:gsc_manhole_cover", ordinal: 8, section: "Комплектующие", category: "material", titleRu: "Люк канализационного колодца", unitId: "pcs", formulaId: "gsc_cover_quantity_v1", titleParameterIds: ["gsc_cover_designation"], sourceRole: "APPROVED_MANHOLE_SCHEDULE", procurementEligible: true }),
  resource({ rowId: "rc09:gsc_fitting", ordinal: 9, section: "Комплектующие", category: "material", titleRu: "Фасонная часть трубной системы коллектора", unitId: "pcs", formulaId: "gsc_fitting_quantity_v1", titleParameterIds: ["gsc_fitting_designation"], sourceRole: "APPROVED_PIPE_SYSTEM_SCHEDULE", procurementEligible: true }),
  resource({ rowId: "rc09:gsc_socket_seal", ordinal: 10, section: "Комплектующие", category: "material", titleRu: "Уплотнительное кольцо трубной системы коллектора", unitId: "pcs", formulaId: "gsc_seal_quantity_v1", titleParameterIds: ["gsc_seal_designation"], sourceRole: "APPROVED_PIPE_SYSTEM_SCHEDULE", procurementEligible: true }),
  resource({ rowId: "rc09:gsc_assembly_lubricant", ordinal: 11, section: "Расходники", category: "material", titleRu: "Монтажная смазка раструбных соединений", unitId: "kg", formulaId: "gsc_lubricant_mass_v1", titleParameterIds: ["gsc_lubricant_designation"], sourceRole: "APPROVED_PIPE_INSTALLATION_METHOD", procurementEligible: true }),
  resource({ rowId: "rc09:gsc_warning_tape", ordinal: 12, section: "Материалы", category: "material", titleRu: "Сигнальная лента коллектора", unitId: "m", formulaId: "gsc_warning_tape_length_v1", titleParameterIds: ["gsc_warning_tape_designation"], sourceRole: "APPROVED_ROUTE_DETAIL", procurementEligible: true }),
  resource({ rowId: "rc09:gsc_leak_test", ordinal: 13, section: "Контроль", category: "service", titleRu: "Испытание коллектора на герметичность", unitId: "test", formulaId: "gsc_leak_test_count_v1", titleParameterIds: ["gsc_leak_test_designation"], sourceRole: "APPROVED_TEST_PROGRAM", procurementEligible: false, costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:gsc_cctv_inspection", ordinal: 14, section: "Контроль", category: "service", titleRu: "Телевизионная инспекция коллектора", unitId: "m", formulaId: "gsc_cctv_inspection_length_v1", sourceRole: "APPROVED_TEST_PROGRAM", procurementEligible: false, costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:gsc_asbuilt_documents", ordinal: 15, section: "Документы", category: "service", titleRu: "Комплект исполнительной документации коллектора", unitId: "document", formulaId: "gsc_asbuilt_document_count_v1", sourceRole: "APPROVED_ACCEPTANCE_DOCUMENT_SCHEDULE", procurementEligible: false, costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:gsc_dewatering", ordinal: 16, section: "Условные механизмы", category: "equipment", titleRu: "Водоотлив при строительстве коллектора", unitId: "machine_hour", formulaId: "gsc_dewatering_machine_v1", inclusionAst: equals("gsc_dewatering_mode", "REQUIRED"), titleParameterIds: ["gsc_dewatering_designation"], sourceRole: "APPROVED_DEWATERING_PLAN", procurementEligible: true }),
  resource({ rowId: "rc09:gsc_shoring", ordinal: 17, section: "Условные конструкции", category: "equipment", titleRu: "Крепление стенок траншеи коллектора", unitId: "m2", formulaId: "gsc_shoring_area_v1", inclusionAst: equals("gsc_shoring_mode", "REQUIRED"), titleParameterIds: ["gsc_shoring_designation"], sourceRole: "APPROVED_TRENCH_SHORING_PLAN", procurementEligible: true }),
  resource({ rowId: "rc09:gsc_road_restoration", ordinal: 18, section: "Условные работы", category: "construction_work", titleRu: "Восстановление дорожного покрытия над коллектором", unitId: "m2", formulaId: "gsc_road_restoration_area_v1", inclusionAst: equals("gsc_road_restoration_mode", "REQUIRED"), titleParameterIds: ["gsc_road_restoration_designation"], sourceRole: "APPROVED_ROAD_RESTORATION_SCHEDULE", procurementEligible: false }),
  resource({ rowId: "rc09:gsc-pipe-balance:installed-net", ordinal: 19, section: "Баланс трубы", category: "material", titleRu: "Чистая длина укладываемой трубы", unitId: "m", formulaId: "gsc_pipe_installed_net_v1", sourceRole: "VISIBLE_PROCUREMENT_BALANCE", procurementEligible: false, costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:gsc-pipe-balance:retained-spare", ordinal: 20, section: "Баланс трубы", category: "material", titleRu: "Сохраняемый резерв трубы", unitId: "m", formulaId: "gsc_pipe_retained_spare_v1", sourceRole: "VISIBLE_PROCUREMENT_BALANCE", procurementEligible: false, costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:gsc-pipe-balance:total-need", ordinal: 21, section: "Баланс трубы", category: "material", titleRu: "Общая потребность в трубе", unitId: "m", formulaId: "gsc_pipe_total_need_v1", sourceRole: "VISIBLE_PROCUREMENT_BALANCE", procurementEligible: false, costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:gsc-pipe-balance:stick-count", ordinal: 22, section: "Баланс трубы", category: "material", titleRu: "Количество поставочных труб", unitId: "pcs", formulaId: "gsc_pipe_stick_count_v1", sourceRole: "VISIBLE_PROCUREMENT_BALANCE", procurementEligible: false, costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:gsc-pipe-balance:remainder", ordinal: 23, section: "Баланс трубы", category: "material", titleRu: "Остаток трубы после укладки", unitId: "m", formulaId: "gsc_pipe_remainder_v1", sourceRole: "VISIBLE_PROCUREMENT_BALANCE", procurementEligible: false, costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:gsc-pipe-balance:surplus-beyond-spare", ordinal: 24, section: "Баланс трубы", category: "material", titleRu: "Свободный остаток трубы сверх резерва", unitId: "m", formulaId: "gsc_pipe_surplus_v1", sourceRole: "VISIBLE_PROCUREMENT_BALANCE", procurementEligible: false, costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:labor:gsc-survey", ordinal: 25, section: "Труд", category: "construction_work", titleRu: "Труд по геодезическому сопровождению коллектора", unitId: "man_hour", formulaId: "gsc_survey_labor_v1", sourceRole: "APPROVED_CONSTRUCTION_METHOD", procurementEligible: false }),
  resource({ rowId: "rc09:labor:gsc-earthworks", ordinal: 26, section: "Труд", category: "construction_work", titleRu: "Труд по земляным работам коллектора", unitId: "man_hour", formulaId: "gsc_earthworks_labor_v1", sourceRole: "APPROVED_CONSTRUCTION_METHOD", procurementEligible: false }),
  resource({ rowId: "rc09:labor:gsc-pipe-manhole-install", ordinal: 27, section: "Труд", category: "construction_work", titleRu: "Труд по монтажу труб и колодцев", unitId: "man_hour", formulaId: "gsc_pipe_manhole_install_labor_v1", sourceRole: "APPROVED_CONSTRUCTION_METHOD", procurementEligible: false }),
  resource({ rowId: "rc09:labor:gsc-qa-documentation", ordinal: 28, section: "Труд", category: "construction_work", titleRu: "Труд по контролю и исполнительной документации", unitId: "man_hour", formulaId: "gsc_qa_documentation_labor_v1", sourceRole: "APPROVED_TEST_AND_ACCEPTANCE_PROGRAM", procurementEligible: false }),
  resource({ rowId: "rc09:equipment:gsc-excavator", ordinal: 29, section: "Механизмы", category: "equipment", titleRu: "Экскаватор для разработки траншеи", unitId: "machine_hour", formulaId: "gsc_excavator_machine_v1", sourceRole: "APPROVED_CONSTRUCTION_METHOD", procurementEligible: true }),
  resource({ rowId: "rc09:equipment:gsc-compactor", ordinal: 30, section: "Механизмы", category: "equipment", titleRu: "Механизм послойного уплотнения", unitId: "machine_hour", formulaId: "gsc_compactor_machine_v1", sourceRole: "APPROVED_CONSTRUCTION_METHOD", procurementEligible: true }),
  resource({ rowId: "rc09:equipment:gsc-pipe-laser", ordinal: 31, section: "Механизмы", category: "equipment", titleRu: "Лазерный прибор контроля уклона", unitId: "machine_hour", formulaId: "gsc_pipe_laser_machine_v1", sourceRole: "APPROVED_CONSTRUCTION_AND_QA_METHOD", procurementEligible: true }),
  resource({ rowId: "rc09:logistics:gsc-delivery", ordinal: 32, section: "Логистика", category: "service", titleRu: "Доставка труб, колодцев и материалов коллектора", unitId: "trip", formulaId: "gsc_delivery_trip_v1", sourceRole: "APPROVED_LOGISTICS_PLAN", procurementEligible: true }),
  resource({ rowId: "rc09:logistics:gsc-removal", ordinal: 33, section: "Логистика", category: "service", titleRu: "Вывоз грунта, упаковки и строительных отходов", unitId: "trip", formulaId: "gsc_removal_trip_v1", sourceRole: "APPROVED_LOGISTICS_AND_WASTE_PLAN", procurementEligible: true }),
]);

export const GRAVITY_SEWER_COLLECTOR_SHORT_INPUT = Object.freeze({
  gsc_collector_count: 1,
  gsc_route_length_m: 600,
  gsc_pipe_material_grade: "PVC-U",
  gsc_ring_stiffness_class: "SN8",
  gsc_pipe_outside_diameter_mm: 200,
  gsc_slope_m_per_m: 0.007,
  gsc_pipe_designation: "PVC-U-SN8-OD200",
  ...GRAVITY_SEWER_COLLECTOR_RUNTIME_INPUT,
});

export const GRAVITY_SEWER_COLLECTOR_ACCEPTANCE_INPUT = Object.freeze({
  ...GRAVITY_SEWER_COLLECTOR_SHORT_INPUT,
  gsc_trench_excavation_volume_m3: 1260,
  gsc_bedding_designation: "Песок мытый по проекту",
  gsc_bedding_volume_m3: 108,
  gsc_surround_designation: "Песок для защитной обсыпки по проекту",
  gsc_surround_volume_m3: 252,
  gsc_backfill_designation: "Грунт обратной засыпки по балансу",
  gsc_backfill_volume_m3: 780,
  gsc_excess_soil_volume_m3: 372,
  gsc_manhole_designation: "Колодец сборный железобетонный КС-15 по профилю",
  gsc_manhole_quantity_piece: 13,
  gsc_cover_designation: "Люк тяжёлый D400 по проекту",
  gsc_cover_quantity_piece: 13,
  gsc_fitting_designation: "Фасонные части PVC-U SN8 OD 200 по ведомости",
  gsc_fitting_quantity_piece: 18,
  gsc_seal_designation: "Кольцо уплотнительное PVC-U OD 200",
  gsc_seal_quantity_piece: 105,
  gsc_lubricant_designation: "Смазка монтажная для PVC-U",
  gsc_lubricant_mass_kg: 12,
  gsc_warning_tape_designation: "Лента сигнальная Канализация",
  gsc_warning_tape_length_m: 630,
  gsc_leak_test_designation: "Испытание участков коллектора на герметичность",
  gsc_leak_test_count: 12,
  gsc_cctv_inspection_length_m: 600,
  gsc_asbuilt_document_count: 1,
  gsc_survey_labor_h: 96,
  gsc_earthworks_labor_h: 420,
  gsc_pipe_manhole_install_labor_h: 560,
  gsc_qa_documentation_labor_h: 120,
  gsc_excavator_machine_h: 140,
  gsc_compactor_machine_h: 110,
  gsc_pipe_laser_machine_h: 80,
  gsc_delivery_trip_count: 18,
  gsc_removal_trip_count: 31,
  gsc_dewatering_mode: "NOT_REQUIRED",
  gsc_shoring_mode: "NOT_REQUIRED",
  gsc_road_restoration_mode: "NOT_REQUIRED",
});

export async function compileGravitySewerCollectorR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? GRAVITY_SEWER_COLLECTOR_CATALOG_ID;
  if (catalogId !== GRAVITY_SEWER_COLLECTOR_CATALOG_ID) {
    throw new Error(`GRAVITY_SEWER_COLLECTOR_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile", compilerVersion: "canonical-estimate-compiler.gravity-sewer-collector-r1",
    catalogId, primaryMeasureParameterId: "gsc_collector_count",
    parameterDefinitions: [...GRAVITY_SEWER_COLLECTOR_PARAMETERS],
    formulaDefinitions: [...GRAVITY_SEWER_COLLECTOR_FORMULAS],
    resourceDefinitions: [...GRAVITY_SEWER_COLLECTOR_RESOURCES], submittedParameters,
    confirmedParameters: { ...GRAVITY_SEWER_COLLECTOR_RUNTIME_INPUT }, currencyCode: "KGS",
    priceItems: [], maximumResourceRows: 40, hashJson: async (value) => JSON.stringify(value),
  });
}
