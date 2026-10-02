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

export const INDUSTRIAL_STEEL_PIPE_BUTT_WELD_CATALOG_ID =
  "canonical-work:expanded:pipeline_welding";
export const INDUSTRIAL_STEEL_PIPE_BUTT_WELD_SOURCE_ID =
  "project_industrial_steel_pipe_butt_weld_wps_ndt_package_v1";
export const INDUSTRIAL_STEEL_PIPE_BUTT_WELD_NORM_ID =
  "norm:project:industrial_steel_pipe_butt_weld:wps_ndt:v1";

export const INDUSTRIAL_STEEL_PIPE_BUTT_WELD_SOURCE_METADATA = Object.freeze({
  source_title: "Утверждённые изометрии технологического трубопровода, WPS/ППР сварки, ведомость сварочных материалов и программа неразрушающего контроля",
  source_authority: "Проектная организация, инженер по сварке, служба контроля качества и утверждающий инженер проекта",
  source_document_version: "PROJECT_PIPE_D219X8_09G2S_WPS_MATERIAL_LABOR_EQUIPMENT_NDT_LOGISTICS_BALANCE_S27_24",
  definition_hash: "9747daa0fc1f9677a00d8f5d3b7d932766a422f211c6166a2e76ae8e2a6cda8d",
  exact_locator: "16 стыков стального технологического трубопровода Ø219×8 мм из стали 09Г2С; марка и масса проволоки, вид и объём защитного газа, обезжириватель, шлифовальные круги, машино-часы источника и центратора — только по утверждённым WPS/ППР и ведомости ресурсов; продувка корня, подогрев/термообработка и ремонт покрытия — только по явным проектным условиям",
  use_restriction: "Количество стыков и известная геометрия определяют работу, единицы контроля и записи журнала. Расход материалов, состав оборудования и условные операции нельзя выводить из исторических коэффициентов. Труба полной длины, фасонные детали, опоры и испытание всего трубопровода исключены.",
  source_kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
  artifact_sha256: "9747daa0fc1f9677a00d8f5d3b7d932766a422f211c6166a2e76ae8e2a6cda8d",
});

const CONDITIONAL_PREFIXES = [
  "root_purge_gas",
  "preheat_postweld_heat_treatment",
  "field_joint_coating_repair",
] as const;
const CONDITIONAL_DETAILS = new Set(CONDITIONAL_PREFIXES.flatMap((prefix) => [
  `${prefix}_designation`,
  `${prefix}_quantity`,
]));
const KNOWN_SCOPE = [
  "joint_count",
  "outside_diameter_mm",
  "wall_thickness_mm",
  "steel_grade",
  "welding_procedure_designation",
];
const VISIBLE_PRELIMINARY_PROFILE = new Set([
  "welding_wire_retained_reserve_kg", "welding_wire_supplier_pack_size_kg",
  "shielding_gas_retained_reserve_m3", "shielding_gas_supplier_pack_size_m3",
]);

const PARAMETER_SPECS = Object.freeze([
  ["joint_count", "Количество сварных стыков", "integer", "pcs", null],
  ["outside_diameter_mm", "Наружный диаметр трубы", "decimal", "mm", null],
  ["wall_thickness_mm", "Толщина стенки трубы", "decimal", "mm", null],
  ["steel_grade", "Марка стали трубы", "text", null, null],
  ["welding_wire_designation", "Сварочная проволока по WPS", "text", null, null],
  ["welding_wire_mass_kg", "Масса сварочной проволоки", "decimal", "kg", null],
  ["shielding_gas_designation", "Защитный сварочный газ по WPS", "text", null, null],
  ["shielding_gas_volume_m3", "Объём защитного сварочного газа", "decimal", "m3", null],
  ["degreaser_designation", "Обезжириватель для подготовки кромок", "text", null, null],
  ["degreaser_volume_l", "Объём обезжиривателя", "decimal", "l", null],
  ["grinding_disc_designation", "Шлифовальный круг для обработки стыка", "text", null, null],
  ["grinding_disc_quantity", "Количество шлифовальных кругов", "decimal", "pcs", null],
  ["welding_source_designation", "Сварочный источник по WPS/ППР", "text", null, null],
  ["welding_source_machine_hours", "Машино-часы сварочного источника", "decimal", "machine_hour", null],
  ["pipe_clamp_designation", "Трубный центратор по ППР", "text", null, null],
  ["pipe_clamp_machine_hours", "Машино-часы трубного центратора", "decimal", "machine_hour", null],
  ["root_purge_gas_mode", "Защитная продувка корня входит в объём", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["root_purge_gas_designation", "Газ защитной продувки корня по WPS", "text", null, null],
  ["root_purge_gas_quantity", "Объём газа защитной продувки корня", "decimal", "m3", null],
  ["preheat_postweld_heat_treatment_mode", "Подогрев или послесварочная термообработка входит в объём", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["preheat_postweld_heat_treatment_designation", "Режим и оборудование термообработки по WPS/ППР", "text", null, null],
  ["preheat_postweld_heat_treatment_quantity", "Машино-часы подогрева или термообработки", "decimal", "machine_hour", null],
  ["field_joint_coating_repair_mode", "Ремонт покрытия полевого стыка входит в объём", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["field_joint_coating_repair_designation", "Система ремонта покрытия полевого стыка", "text", null, null],
  ["field_joint_coating_repair_quantity", "Площадь ремонта покрытия полевых стыков", "decimal", "m2", null],
  ["welding_procedure_designation", "Обозначение утверждённой технологии сварки WPS", "text", null, null],
  ["welding_wire_retained_reserve_kg", "Сохраняемый резерв сварочной проволоки", "decimal", "kg", null],
  ["welding_wire_supplier_pack_size_kg", "Масса проволоки в поставочной упаковке", "decimal", "kg", null],
  ["shielding_gas_retained_reserve_m3", "Сохраняемый резерв защитного газа", "decimal", "m3", null],
  ["shielding_gas_supplier_pack_size_m3", "Объём защитного газа в поставочной упаковке", "decimal", "m3", null],
  ["ndt_report_designation", "Акт неразрушающего контроля сварных стыков", "text", null, null],
  ["ndt_report_quantity_document", "Количество актов неразрушающего контроля", "decimal", "document", null],
  ["weld_fitup_labor_h", "Труд трубопроводчиков и сварщиков по сборке и сварке", "decimal", "man_hour", null],
  ["ndt_inspection_labor_h", "Труд специалистов неразрушающего контроля", "decimal", "man_hour", null],
  ["edge_grinder_machine_h", "Работа шлифовальной машины подготовки кромок", "decimal", "machine_hour", null],
  ["ndt_instrument_machine_h", "Работа прибора неразрушающего контроля", "decimal", "machine_hour", null],
  ["weld_delivery_trip_count", "Рейсы доставки сварочных материалов и оборудования", "integer", "trip", null],
  ["weld_waste_removal_trip_count", "Рейсы вывоза упаковки и отходов сварки", "integer", "trip", null],
] as const);

function conditionalConstraints(parameterId: string): Json {
  const prefix = CONDITIONAL_PREFIXES.find((candidate) =>
    parameterId.startsWith(`${candidate}_`));
  const branch = prefix ? `${prefix}_mode` : null;
  if (!branch || parameterId === branch) return {};
  return {
    requiredWhen: { kind: "equals", parameterId: branch, value: "REQUIRED" },
    forbiddenWhen: { kind: "equals", parameterId: branch, value: "NOT_REQUIRED" },
  };
}

export type IndustrialSteelPipeButtWeldParameter =
CanonicalEstimateParameterDefinition & {
  ordinal: number;
  unit_id: string | null;
  title_ru: string;
  truth_metadata: Json;
};

export const INDUSTRIAL_STEEL_PIPE_BUTT_WELD_PARAMETERS:
readonly IndustrialSteelPipeButtWeldParameter[] = Object.freeze(PARAMETER_SPECS.map(
  ([parameterId, titleRu, valueType, unitId, enumValues], ordinal) => ({
    parameter_id: parameterId,
    ordinal,
    value_type: valueType,
    unit_id: unitId,
    title_ru: titleRu,
    required: !CONDITIONAL_DETAILS.has(parameterId),
    default_value: null,
    constraints_json: {
      ...(enumValues ? { values: enumValues }
        : valueType === "decimal" || valueType === "integer"
          ? { min: parameterId.includes("_retained_reserve_")
            ? 0
            : valueType === "integer" ? 1 : 0.000_001 }
          : valueType === "text" ? { minLength: 1, maxLength: 1_000 } : {}),
      ...conditionalConstraints(parameterId),
    },
    truth_metadata: {
      contract: "rik-expo-app.industrial-steel-pipe-butt-weld-r1",
      semantic_parameter_key: `industrial-steel-pipe-butt-weld:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: KNOWN_SCOPE.includes(parameterId)
        ? "USER_INPUT"
        : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
          ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE"
          : "PROJECT_SPECIFIC_INPUT",
      input_origin_class: KNOWN_SCOPE.includes(parameterId)
        ? "KNOWN_WORK_SCOPE"
        : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
          ? "VISIBLE_PRELIMINARY_PROCUREMENT_BALANCE"
          : "APPROVED_WPS_METHOD_RESOURCE_OR_QA_DOCUMENTATION",
      preliminary_compilation_allowed: true,
      source_confirmation_required: !KNOWN_SCOPE.includes(parameterId)
        && !VISIBLE_PRELIMINARY_PROFILE.has(parameterId),
      guide: {
        guide_kind: KNOWN_SCOPE.includes(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
        guide_short_ru: KNOWN_SCOPE.includes(parameterId)
          ? `${titleRu}: укажите по ведомости сварных стыков и проектной изометрии.`
          : `${titleRu}: укажите по утверждённым WPS/ППР, ведомости ресурсов или программе НК.`,
        source_role: KNOWN_SCOPE.includes(parameterId)
          ? "USER_SUPPLIED_OR_APPROVED_WELD_SCOPE"
          : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
            ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE"
            : "APPROVED_WPS_METHOD_RESOURCE_OR_QA_DOCUMENTATION",
        source_document: INDUSTRIAL_STEEL_PIPE_BUTT_WELD_SOURCE_ID,
        source_locator: INDUSTRIAL_STEEL_PIPE_BUTT_WELD_SOURCE_METADATA.exact_locator,
        guide_version: "industrial-steel-pipe-butt-weld-r1",
        source_snapshot_hash: INDUSTRIAL_STEEL_PIPE_BUTT_WELD_SOURCE_METADATA.artifact_sha256,
        applicability: "Только для сварки известных стыков стального технологического трубопровода; полный трубопровод и общие испытания исключены.",
        verified_at: "2026-09-19T00:00:00+06:00",
        guide_validation_policy:
          "DEFER_MISSING_PROJECT_VALUE_ROW_LOCALLY_REJECT_INVALID_SUPPLIED_VALUE",
      },
      hidden_default_forbidden: true,
      runtime_profile_value: VISIBLE_PRELIMINARY_PROFILE.has(parameterId),
      synthetic: false,
    },
  })),
);

export const INDUSTRIAL_STEEL_PIPE_BUTT_WELD_RUNTIME_INPUT = Object.freeze({
  welding_wire_retained_reserve_kg: 0,
  welding_wire_supplier_pack_size_kg: 1,
  shielding_gas_retained_reserve_m3: 0,
  shielding_gas_supplier_pack_size_m3: 1,
});
export const INDUSTRIAL_STEEL_PIPE_BUTT_WELD_RUNTIME_CLASSIFICATION = Object.freeze(
  Object.fromEntries(Object.keys(INDUSTRIAL_STEEL_PIPE_BUTT_WELD_RUNTIME_INPUT).map(
    (parameterId) => [parameterId, "ASSUMPTION"],
  )) as Readonly<Record<string, "ASSUMPTION">>,
);
export const INDUSTRIAL_STEEL_PIPE_BUTT_WELD_RUNTIME_SOURCE_IDS = Object.freeze(
  Object.fromEntries(Object.keys(INDUSTRIAL_STEEL_PIPE_BUTT_WELD_RUNTIME_INPUT).map(
    (parameterId) => [parameterId, [INDUSTRIAL_STEEL_PIPE_BUTT_WELD_SOURCE_ID]],
  )) as Readonly<Record<string, readonly string[]>>,
);

function formula(formulaId: string, outputUnitId: string, expression: string) {
  const compiled = compileFormulaGraph(expression);
  return {
    formula_id: formulaId,
    output_unit_id: outputUnitId,
    expression_source: expression,
    ast: compiled.ast,
    input_parameter_ids: compiled.inputParameterIds,
    ast_sha256: "runtime-publisher-replaces-with-deterministic-sha256",
  };
}

export const INDUSTRIAL_STEEL_PIPE_BUTT_WELD_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  formula("steel_process_pipe_butt_weld_count_v1", "pcs", "joint_count"),
  formula("welding_wire_order_v2", "kg",
    "ceil((welding_wire_mass_kg+welding_wire_retained_reserve_kg)/welding_wire_supplier_pack_size_kg)*welding_wire_supplier_pack_size_kg"),
  formula("welding_shielding_gas_order_v2", "m3",
    "ceil((shielding_gas_volume_m3+shielding_gas_retained_reserve_m3)/shielding_gas_supplier_pack_size_m3)*shielding_gas_supplier_pack_size_m3"),
  formula("pipe_weld_degreaser_volume_v1", "l", "degreaser_volume_l"),
  formula("pipe_weld_grinding_disc_quantity_v1", "pcs", "grinding_disc_quantity"),
  formula("inverter_welding_power_source_hours_v1", "machine_hour", "welding_source_machine_hours"),
  formula("pipe_internal_external_clamp_hours_v1", "machine_hour", "pipe_clamp_machine_hours"),
  formula("pipe_weld_ndt_control_count_v1", "test", "joint_count"),
  formula("pipe_weld_log_record_count_v1", "document", "joint_count"),
  formula("welding_wire_installed_net_v2", "kg", "welding_wire_mass_kg"),
  formula("welding_wire_retained_reserve_v2", "kg", "welding_wire_retained_reserve_kg"),
  formula("welding_wire_total_need_v2", "kg", "welding_wire_mass_kg+welding_wire_retained_reserve_kg"),
  formula("welding_wire_package_count_v2", "package",
    "ceil((welding_wire_mass_kg+welding_wire_retained_reserve_kg)/welding_wire_supplier_pack_size_kg)"),
  formula("welding_wire_remainder_v2", "kg",
    "ceil((welding_wire_mass_kg+welding_wire_retained_reserve_kg)/welding_wire_supplier_pack_size_kg)*welding_wire_supplier_pack_size_kg-welding_wire_mass_kg"),
  formula("welding_wire_surplus_v2", "kg",
    "max(0,ceil((welding_wire_mass_kg+welding_wire_retained_reserve_kg)/welding_wire_supplier_pack_size_kg)*welding_wire_supplier_pack_size_kg-welding_wire_mass_kg-welding_wire_retained_reserve_kg)"),
  formula("shielding_gas_installed_net_v2", "m3", "shielding_gas_volume_m3"),
  formula("shielding_gas_retained_reserve_v2", "m3", "shielding_gas_retained_reserve_m3"),
  formula("shielding_gas_total_need_v2", "m3", "shielding_gas_volume_m3+shielding_gas_retained_reserve_m3"),
  formula("shielding_gas_package_count_v2", "package",
    "ceil((shielding_gas_volume_m3+shielding_gas_retained_reserve_m3)/shielding_gas_supplier_pack_size_m3)"),
  formula("shielding_gas_remainder_v2", "m3",
    "ceil((shielding_gas_volume_m3+shielding_gas_retained_reserve_m3)/shielding_gas_supplier_pack_size_m3)*shielding_gas_supplier_pack_size_m3-shielding_gas_volume_m3"),
  formula("shielding_gas_surplus_v2", "m3",
    "max(0,ceil((shielding_gas_volume_m3+shielding_gas_retained_reserve_m3)/shielding_gas_supplier_pack_size_m3)*shielding_gas_supplier_pack_size_m3-shielding_gas_volume_m3-shielding_gas_retained_reserve_m3)"),
  formula("ndt_report_quantity_v2", "document", "ndt_report_quantity_document"),
  formula("weld_fitup_labor_v2", "man_hour", "weld_fitup_labor_h"),
  formula("ndt_inspection_labor_v2", "man_hour", "ndt_inspection_labor_h"),
  formula("edge_grinder_v2", "machine_hour", "edge_grinder_machine_h"),
  formula("ndt_instrument_v2", "machine_hour", "ndt_instrument_machine_h"),
  formula("weld_delivery_v2", "trip", "weld_delivery_trip_count"),
  formula("weld_waste_removal_v2", "trip", "weld_waste_removal_trip_count"),
  formula("root_purge_gas_volume_v1", "m3", "root_purge_gas_quantity"),
  formula("preheat_postweld_heat_treatment_hours_v1", "machine_hour", "preheat_postweld_heat_treatment_quantity"),
  formula("field_joint_coating_repair_area_v1", "m2", "field_joint_coating_repair_quantity"),
]);

const literalTrue = Object.freeze({ kind: "literal", value: true });
const equals = (parameterId: string, value: InputValue) => ({
  kind: "equals",
  parameterId,
  value,
});

function resource(input: {
  rowId: string;
  ordinal: number;
  section: string;
  category: string;
  titleRu: string;
  unitId: string;
  formulaId: string;
  sourceRole: string;
  procurementEligible: boolean;
  inclusionAst?: Json;
  titleParameterIds?: string[];
  costTreatment?: "OWN_COST" | "INFORMATIONAL_SCOPE" | "INCLUDED_IN_RESOURCE_ROWS";
}): CanonicalEstimateResourceDefinition {
  const resourceGraph = {
    formulaId: input.formulaId,
    normalizedUom: input.unitId,
    semanticOwnerId: `industrial-steel-pipe-butt-weld:${input.rowId}`,
    costOwner: "resource",
    ...(input.titleParameterIds ? {
      titleSpecificationParameterIds: input.titleParameterIds,
      titleSpecificationMode: "APPEND",
      titleSpecificationSeparator: " — ",
    } : {}),
    scopeContextParameterIds: KNOWN_SCOPE,
    costTreatment: input.costTreatment ?? "OWN_COST",
  };
  const sourceMetadata = {
    truth_contract_version: "R3",
    synthetic: false,
    sourceRole: input.sourceRole,
    normativeTrace: [{
      sourceId: INDUSTRIAL_STEEL_PIPE_BUTT_WELD_SOURCE_ID,
      source_id: INDUSTRIAL_STEEL_PIPE_BUTT_WELD_SOURCE_ID,
      normId: INDUSTRIAL_STEEL_PIPE_BUTT_WELD_NORM_ID,
      norm_id: INDUSTRIAL_STEEL_PIPE_BUTT_WELD_NORM_ID,
      normVersion: INDUSTRIAL_STEEL_PIPE_BUTT_WELD_SOURCE_METADATA.source_document_version,
      source_title: INDUSTRIAL_STEEL_PIPE_BUTT_WELD_SOURCE_METADATA.source_title,
      exact_locator: INDUSTRIAL_STEEL_PIPE_BUTT_WELD_SOURCE_METADATA.exact_locator,
      source_definition_hash: INDUSTRIAL_STEEL_PIPE_BUTT_WELD_SOURCE_METADATA.definition_hash,
      sourceRole: input.sourceRole,
    }],
    excludedUnownedAssumptions: [
      "historical welding-wire, gas, degreaser, grinding-disc or machine-hour rates",
      "automatic retained reserve or supplier package",
      "automatic welding, NDT, inspection-equipment or logistics quantity",
      "automatic root-purge, heat-treatment or field-joint-coating quantities",
      "full process-pipe length, fittings or supports",
      "whole-pipeline pressure test",
      "invented price",
    ],
  };
  return {
    id: `resource-${input.rowId.replace(/:/gu, "-")}`,
    row_id: input.rowId,
    ordinal: input.ordinal,
    section: input.section,
    category: input.category,
    title_ru: input.titleRu,
    unit_id: input.unitId,
    formula_id: input.formulaId,
    inclusion_ast: input.inclusionAst ?? literalTrue,
    resource_graph: resourceGraph,
    procurement_eligible: input.procurementEligible,
    cost_owner_id: input.rowId,
    source_metadata: sourceMetadata,
    row_sha256: estimateDeterministicHash({ input, resourceGraph, sourceMetadata }),
  };
}

export const INDUSTRIAL_STEEL_PIPE_BUTT_WELD_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  resource({ rowId: "rc09:steel_process_pipe_butt_weld", ordinal: 0,
    section: "Работы", category: "construction_work", titleRu: "Сборка и сварка стыка стального технологического трубопровода",
    unitId: "pcs", formulaId: "steel_process_pipe_butt_weld_count_v1",
    titleParameterIds: ["welding_procedure_designation"],
    sourceRole: "USER_SUPPLIED_OR_APPROVED_WELD_SCOPE", procurementEligible: false,
    costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:welding_wire_sv08g2s_d1_2", ordinal: 1,
    section: "Материалы", category: "material", titleRu: "Проволока сварочная по утверждённому WPS",
    unitId: "kg", formulaId: "welding_wire_order_v2", titleParameterIds: ["welding_wire_designation"],
    sourceRole: "APPROVED_WPS_AND_RESOURCE_SCHEDULE", procurementEligible: true }),
  resource({ rowId: "rc09:welding_shielding_gas_mixture", ordinal: 2,
    section: "Материалы", category: "material", titleRu: "Газ защитный сварочный по утверждённому WPS",
    unitId: "m3", formulaId: "welding_shielding_gas_order_v2", titleParameterIds: ["shielding_gas_designation"],
    sourceRole: "APPROVED_WPS_AND_RESOURCE_SCHEDULE", procurementEligible: true }),
  resource({ rowId: "rc09:pipe_weld_degreaser", ordinal: 3,
    section: "Материалы", category: "material", titleRu: "Обезжириватель для подготовки кромок трубопровода",
    unitId: "l", formulaId: "pipe_weld_degreaser_volume_v1", titleParameterIds: ["degreaser_designation"],
    sourceRole: "APPROVED_WPS_AND_RESOURCE_SCHEDULE", procurementEligible: true }),
  resource({ rowId: "rc09:pipe_weld_grinding_disc", ordinal: 4,
    section: "Материалы", category: "material", titleRu: "Круг шлифовальный для обработки сварного стыка",
    unitId: "pcs", formulaId: "pipe_weld_grinding_disc_quantity_v1", titleParameterIds: ["grinding_disc_designation"],
    sourceRole: "APPROVED_WPS_AND_RESOURCE_SCHEDULE", procurementEligible: true }),
  resource({ rowId: "rc09:inverter_welding_power_source", ordinal: 5,
    section: "Механизмы", category: "equipment", titleRu: "Источник сварочный по WPS/ППР",
    unitId: "machine_hour", formulaId: "inverter_welding_power_source_hours_v1", titleParameterIds: ["welding_source_designation"],
    sourceRole: "APPROVED_WPS_AND_METHOD_STATEMENT", procurementEligible: true }),
  resource({ rowId: "rc09:pipe_internal_external_clamp", ordinal: 6,
    section: "Механизмы", category: "equipment", titleRu: "Центратор трубный для сборки сварного стыка",
    unitId: "machine_hour", formulaId: "pipe_internal_external_clamp_hours_v1", titleParameterIds: ["pipe_clamp_designation"],
    sourceRole: "APPROVED_METHOD_STATEMENT", procurementEligible: true }),
  resource({ rowId: "rc09:pipe_weld_ndt_control", ordinal: 7,
    section: "Контроль", category: "service", titleRu: "Неразрушающий контроль сварного стыка по утверждаемой программе контроля",
    unitId: "test", formulaId: "pipe_weld_ndt_control_count_v1",
    sourceRole: "USER_SUPPLIED_JOINT_COUNT_AND_APPROVED_NDT_PROGRAM", procurementEligible: false,
    costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:pipe_weld_log_record", ordinal: 8,
    section: "Документы", category: "service", titleRu: "Запись сварного стыка в журнале сварки",
    unitId: "document", formulaId: "pipe_weld_log_record_count_v1",
    sourceRole: "USER_SUPPLIED_OR_APPROVED_WELD_SCOPE", procurementEligible: false,
    costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:root_purge_gas", ordinal: 9,
    section: "Условные материалы", category: "material", titleRu: "Газ защитной продувки корня сварного шва",
    unitId: "m3", formulaId: "root_purge_gas_volume_v1", inclusionAst: equals("root_purge_gas_mode", "REQUIRED"),
    titleParameterIds: ["root_purge_gas_designation"], sourceRole: "APPROVED_WPS", procurementEligible: true }),
  resource({ rowId: "rc09:preheat_postweld_heat_treatment", ordinal: 10,
    section: "Условные работы", category: "service", titleRu: "Подогрев или послесварочная термообработка стыка",
    unitId: "machine_hour", formulaId: "preheat_postweld_heat_treatment_hours_v1", inclusionAst: equals("preheat_postweld_heat_treatment_mode", "REQUIRED"),
    titleParameterIds: ["preheat_postweld_heat_treatment_designation"], sourceRole: "APPROVED_WPS_AND_METHOD_STATEMENT", procurementEligible: true }),
  resource({ rowId: "rc09:field_joint_coating_repair", ordinal: 11,
    section: "Условные работы", category: "construction_work", titleRu: "Ремонт защитного покрытия полевого сварного стыка",
    unitId: "m2", formulaId: "field_joint_coating_repair_area_v1", inclusionAst: equals("field_joint_coating_repair_mode", "REQUIRED"),
    titleParameterIds: ["field_joint_coating_repair_designation"], sourceRole: "APPROVED_COATING_SYSTEM_AND_METHOD_STATEMENT", procurementEligible: true }),
  resource({ rowId: "rc09:welding-wire-balance:installed-net", ordinal: 12,
    section: "Баланс сварочной проволоки", category: "material", titleRu: "Чистый расход сварочной проволоки",
    unitId: "kg", formulaId: "welding_wire_installed_net_v2", procurementEligible: false,
    sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:welding-wire-balance:retained-reserve", ordinal: 13,
    section: "Баланс сварочной проволоки", category: "material", titleRu: "Сохраняемый резерв сварочной проволоки",
    unitId: "kg", formulaId: "welding_wire_retained_reserve_v2", procurementEligible: false,
    sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:welding-wire-balance:total-need", ordinal: 14,
    section: "Баланс сварочной проволоки", category: "material", titleRu: "Общая потребность в сварочной проволоке",
    unitId: "kg", formulaId: "welding_wire_total_need_v2", procurementEligible: false,
    sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:welding-wire-balance:package-count", ordinal: 15,
    section: "Баланс сварочной проволоки", category: "material", titleRu: "Количество упаковок сварочной проволоки",
    unitId: "package", formulaId: "welding_wire_package_count_v2", procurementEligible: false,
    sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:welding-wire-balance:remainder", ordinal: 16,
    section: "Баланс сварочной проволоки", category: "material", titleRu: "Остаток сварочной проволоки после выполнения швов",
    unitId: "kg", formulaId: "welding_wire_remainder_v2", procurementEligible: false,
    sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:welding-wire-balance:surplus-beyond-reserve", ordinal: 17,
    section: "Баланс сварочной проволоки", category: "material", titleRu: "Свободный остаток проволоки сверх резерва",
    unitId: "kg", formulaId: "welding_wire_surplus_v2", procurementEligible: false,
    sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:shielding-gas-balance:installed-net", ordinal: 18,
    section: "Баланс защитного газа", category: "material", titleRu: "Чистый расход защитного газа",
    unitId: "m3", formulaId: "shielding_gas_installed_net_v2", procurementEligible: false,
    sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:shielding-gas-balance:retained-reserve", ordinal: 19,
    section: "Баланс защитного газа", category: "material", titleRu: "Сохраняемый резерв защитного газа",
    unitId: "m3", formulaId: "shielding_gas_retained_reserve_v2", procurementEligible: false,
    sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:shielding-gas-balance:total-need", ordinal: 20,
    section: "Баланс защитного газа", category: "material", titleRu: "Общая потребность в защитном газе",
    unitId: "m3", formulaId: "shielding_gas_total_need_v2", procurementEligible: false,
    sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:shielding-gas-balance:package-count", ordinal: 21,
    section: "Баланс защитного газа", category: "material", titleRu: "Количество поставочных упаковок защитного газа",
    unitId: "package", formulaId: "shielding_gas_package_count_v2", procurementEligible: false,
    sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:shielding-gas-balance:remainder", ordinal: 22,
    section: "Баланс защитного газа", category: "material", titleRu: "Остаток защитного газа после выполнения швов",
    unitId: "m3", formulaId: "shielding_gas_remainder_v2", procurementEligible: false,
    sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:shielding-gas-balance:surplus-beyond-reserve", ordinal: 23,
    section: "Баланс защитного газа", category: "material", titleRu: "Свободный остаток защитного газа сверх резерва",
    unitId: "m3", formulaId: "shielding_gas_surplus_v2", procurementEligible: false,
    sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:pipe_weld_ndt_report", ordinal: 24,
    section: "Контроль", category: "service", titleRu: "Акт неразрушающего контроля сварных стыков",
    unitId: "document", formulaId: "ndt_report_quantity_v2", procurementEligible: false,
    titleParameterIds: ["ndt_report_designation"], sourceRole: "APPROVED_NDT_PROGRAM",
    costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:labor:weld-fitup", ordinal: 25,
    section: "Труд", category: "construction_work", titleRu: "Труд трубопроводчиков и сварщиков: сборка и сварка стыков",
    unitId: "man_hour", formulaId: "weld_fitup_labor_v2", procurementEligible: false,
    sourceRole: "APPROVED_WPS_AND_METHOD_STATEMENT" }),
  resource({ rowId: "rc09:labor:weld-ndt", ordinal: 26,
    section: "Труд", category: "construction_work", titleRu: "Труд специалистов неразрушающего контроля",
    unitId: "man_hour", formulaId: "ndt_inspection_labor_v2", procurementEligible: false,
    sourceRole: "APPROVED_NDT_PROGRAM" }),
  resource({ rowId: "rc09:equipment:weld-edge-grinder", ordinal: 27,
    section: "Механизмы и инструмент", category: "equipment", titleRu: "Шлифовальная машина для подготовки и зачистки кромок",
    unitId: "machine_hour", formulaId: "edge_grinder_v2", procurementEligible: true,
    sourceRole: "APPROVED_WPS_AND_METHOD_STATEMENT" }),
  resource({ rowId: "rc09:equipment:weld-ndt-instrument", ordinal: 28,
    section: "Механизмы и инструмент", category: "equipment", titleRu: "Прибор неразрушающего контроля сварных стыков",
    unitId: "machine_hour", formulaId: "ndt_instrument_v2", procurementEligible: true,
    sourceRole: "APPROVED_NDT_PROGRAM" }),
  resource({ rowId: "rc09:logistics:weld-delivery", ordinal: 29,
    section: "Логистика", category: "service", titleRu: "Доставка сварочных материалов, оборудования и приборов",
    unitId: "trip", formulaId: "weld_delivery_v2", procurementEligible: true,
    sourceRole: "APPROVED_LOGISTICS_PLAN" }),
  resource({ rowId: "rc09:logistics:weld-waste-removal", ordinal: 30,
    section: "Логистика", category: "service", titleRu: "Сбор и вывоз упаковки и отходов сварки",
    unitId: "trip", formulaId: "weld_waste_removal_v2", procurementEligible: true,
    sourceRole: "APPROVED_WASTE_PLAN" }),
]);

export const INDUSTRIAL_STEEL_PIPE_BUTT_WELD_SHORT_INPUT = Object.freeze({
  joint_count: 16,
  outside_diameter_mm: 219,
  wall_thickness_mm: 8,
  welding_procedure_designation: "WPS-219-GMAW",
  steel_grade: "09Г2С",
});

export const INDUSTRIAL_STEEL_PIPE_BUTT_WELD_ACCEPTANCE_INPUT = Object.freeze({
  ...INDUSTRIAL_STEEL_PIPE_BUTT_WELD_SHORT_INPUT,
  ...INDUSTRIAL_STEEL_PIPE_BUTT_WELD_RUNTIME_INPUT,
  welding_wire_designation: "Проволока Св-08Г2С Ø1,2 мм по утверждённому WPS", welding_wire_mass_kg: 14.2,
  shielding_gas_designation: "Смесь Ar/CO₂ по утверждённому WPS", shielding_gas_volume_m3: 7.1,
  degreaser_designation: "Обезжириватель кромок по ведомости ресурсов", degreaser_volume_l: 1,
  grinding_disc_designation: "Круг лепестковый по ведомости ресурсов", grinding_disc_quantity: 8,
  welding_source_designation: "Источник сварочный инверторный по ППР", welding_source_machine_hours: 26.5,
  pipe_clamp_designation: "Центратор трубный Ø219 мм по ППР", pipe_clamp_machine_hours: 13.2,
  ndt_report_designation: "Акт НК сварных стыков по программе контроля",
  ndt_report_quantity_document: 1,
  weld_fitup_labor_h: 96,
  ndt_inspection_labor_h: 24,
  edge_grinder_machine_h: 16,
  ndt_instrument_machine_h: 12,
  weld_delivery_trip_count: 1,
  weld_waste_removal_trip_count: 1,
  root_purge_gas_mode: "NOT_REQUIRED",
  preheat_postweld_heat_treatment_mode: "NOT_REQUIRED",
  field_joint_coating_repair_mode: "NOT_REQUIRED",
});

export async function compileIndustrialSteelPipeButtWeldR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? INDUSTRIAL_STEEL_PIPE_BUTT_WELD_CATALOG_ID;
  if (catalogId !== INDUSTRIAL_STEEL_PIPE_BUTT_WELD_CATALOG_ID) {
    throw new Error(`INDUSTRIAL_STEEL_PIPE_BUTT_WELD_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.industrial-steel-pipe-butt-weld-r1",
    catalogId,
    primaryMeasureParameterId: "joint_count",
    parameterDefinitions: [...INDUSTRIAL_STEEL_PIPE_BUTT_WELD_PARAMETERS],
    formulaDefinitions: [...INDUSTRIAL_STEEL_PIPE_BUTT_WELD_FORMULAS],
    resourceDefinitions: [...INDUSTRIAL_STEEL_PIPE_BUTT_WELD_RESOURCES],
    submittedParameters,
    confirmedParameters: { ...INDUSTRIAL_STEEL_PIPE_BUTT_WELD_RUNTIME_INPUT },
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 40,
    hashJson: async (value) => JSON.stringify(value),
  });
}
