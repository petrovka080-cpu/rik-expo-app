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
  source_document_version: "PROJECT_PIPE_D219X8_09G2S_WPS_CONSUMABLES_EQUIPMENT_NDT_REVISION_EXPLICIT",
  definition_hash: "eh_project_industrial_steel_pipe_butt_weld_wps_ndt_r1",
  exact_locator: "16 стыков стального технологического трубопровода Ø219×8 мм из стали 09Г2С; марка и масса проволоки, вид и объём защитного газа, обезжириватель, шлифовальные круги, машино-часы источника и центратора — только по утверждённым WPS/ППР и ведомости ресурсов; продувка корня, подогрев/термообработка и ремонт покрытия — только по явным проектным условиям",
  use_restriction: "Количество стыков и известная геометрия определяют работу, единицы контроля и записи журнала. Расход материалов, состав оборудования и условные операции нельзя выводить из исторических коэффициентов. Труба полной длины, фасонные детали, опоры и испытание всего трубопровода исключены.",
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
];

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
          ? { min: valueType === "integer" ? 1 : 0.000_001 }
          : valueType === "text" ? { minLength: 1, maxLength: 1_000 } : {}),
      ...conditionalConstraints(parameterId),
    },
    truth_metadata: {
      contract: "rik-expo-app.industrial-steel-pipe-butt-weld-r1",
      semantic_parameter_key: `industrial-steel-pipe-butt-weld:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: KNOWN_SCOPE.includes(parameterId)
        ? "USER_INPUT" : "PROJECT_SPECIFIC_INPUT",
      input_origin_class: KNOWN_SCOPE.includes(parameterId)
        ? "KNOWN_WORK_SCOPE"
        : "APPROVED_WPS_METHOD_RESOURCE_OR_QA_DOCUMENTATION",
      preliminary_compilation_allowed: true,
      source_confirmation_required: !KNOWN_SCOPE.includes(parameterId),
      guide: {
        guide_kind: KNOWN_SCOPE.includes(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
        guide_short_ru: KNOWN_SCOPE.includes(parameterId)
          ? `${titleRu}: укажите по ведомости сварных стыков и проектной изометрии.`
          : `${titleRu}: укажите по утверждённым WPS/ППР, ведомости ресурсов или программе НК.`,
        source_role: KNOWN_SCOPE.includes(parameterId)
          ? "USER_SUPPLIED_OR_APPROVED_WELD_SCOPE"
          : "APPROVED_WPS_METHOD_RESOURCE_OR_QA_DOCUMENTATION",
        source_document: INDUSTRIAL_STEEL_PIPE_BUTT_WELD_SOURCE_ID,
        source_locator: INDUSTRIAL_STEEL_PIPE_BUTT_WELD_SOURCE_METADATA.exact_locator,
        guide_version: "industrial-steel-pipe-butt-weld-r1",
        source_snapshot_hash: "973e995ed10f07447c20e22c664263eda448d820e7a9171dd34e71644eb6d79c",
        applicability: "Только для сварки известных стыков стального технологического трубопровода; полный трубопровод и общие испытания исключены.",
        verified_at: "2026-09-19T00:00:00+06:00",
        guide_validation_policy:
          "DEFER_MISSING_PROJECT_VALUE_ROW_LOCALLY_REJECT_INVALID_SUPPLIED_VALUE",
      },
      hidden_default_forbidden: true,
      synthetic: false,
    },
  })),
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
  formula("welding_wire_mass_v1", "kg", "welding_wire_mass_kg"),
  formula("welding_shielding_gas_volume_v1", "m3", "shielding_gas_volume_m3"),
  formula("pipe_weld_degreaser_volume_v1", "l", "degreaser_volume_l"),
  formula("pipe_weld_grinding_disc_quantity_v1", "pcs", "grinding_disc_quantity"),
  formula("inverter_welding_power_source_hours_v1", "machine_hour", "welding_source_machine_hours"),
  formula("pipe_internal_external_clamp_hours_v1", "machine_hour", "pipe_clamp_machine_hours"),
  formula("pipe_weld_ndt_control_count_v1", "test", "joint_count"),
  formula("pipe_weld_log_record_count_v1", "document", "joint_count"),
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
    sourceRole: "USER_SUPPLIED_OR_APPROVED_WELD_SCOPE", procurementEligible: false }),
  resource({ rowId: "rc09:welding_wire_sv08g2s_d1_2", ordinal: 1,
    section: "Материалы", category: "material", titleRu: "Проволока сварочная по утверждённому WPS",
    unitId: "kg", formulaId: "welding_wire_mass_v1", titleParameterIds: ["welding_wire_designation"],
    sourceRole: "APPROVED_WPS_AND_RESOURCE_SCHEDULE", procurementEligible: true }),
  resource({ rowId: "rc09:welding_shielding_gas_mixture", ordinal: 2,
    section: "Материалы", category: "material", titleRu: "Газ защитный сварочный по утверждённому WPS",
    unitId: "m3", formulaId: "welding_shielding_gas_volume_v1", titleParameterIds: ["shielding_gas_designation"],
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
    sourceRole: "USER_SUPPLIED_JOINT_COUNT_AND_APPROVED_NDT_PROGRAM", procurementEligible: true }),
  resource({ rowId: "rc09:pipe_weld_log_record", ordinal: 8,
    section: "Документы", category: "service", titleRu: "Запись сварного стыка в журнале сварки",
    unitId: "document", formulaId: "pipe_weld_log_record_count_v1",
    sourceRole: "USER_SUPPLIED_OR_APPROVED_WELD_SCOPE", procurementEligible: true }),
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
]);

export const INDUSTRIAL_STEEL_PIPE_BUTT_WELD_SHORT_INPUT = Object.freeze({
  joint_count: 16,
  outside_diameter_mm: 219,
  wall_thickness_mm: 8,
  steel_grade: "09Г2С",
});

export const INDUSTRIAL_STEEL_PIPE_BUTT_WELD_ACCEPTANCE_INPUT = Object.freeze({
  ...INDUSTRIAL_STEEL_PIPE_BUTT_WELD_SHORT_INPUT,
  welding_wire_designation: "Проволока Св-08Г2С Ø1,2 мм по утверждённому WPS", welding_wire_mass_kg: 14.2,
  shielding_gas_designation: "Смесь Ar/CO₂ по утверждённому WPS", shielding_gas_volume_m3: 7.1,
  degreaser_designation: "Обезжириватель кромок по ведомости ресурсов", degreaser_volume_l: 1,
  grinding_disc_designation: "Круг лепестковый по ведомости ресурсов", grinding_disc_quantity: 8,
  welding_source_designation: "Источник сварочный инверторный по ППР", welding_source_machine_hours: 26.5,
  pipe_clamp_designation: "Центратор трубный Ø219 мм по ППР", pipe_clamp_machine_hours: 13.2,
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
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 20,
    hashJson: async (value) => JSON.stringify(value),
  });
}
