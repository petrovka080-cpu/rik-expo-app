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

export const SURFACE_DRAINAGE_CHANNEL_CATALOG_ID =
  "canonical-work:base:paving_roads_landscape_interior_asphalt_drain_large_area";
export const SURFACE_DRAINAGE_CHANNEL_SOURCE_ID =
  "project_surface_drainage_channel_package_v1";
export const SURFACE_DRAINAGE_CHANNEL_NORM_ID =
  "norm:project:surface_drainage_channel:package:v1";

export const SURFACE_DRAINAGE_CHANNEL_SOURCE_METADATA = Object.freeze({
  source_title: "Утверждённая схема линейного водоотвода, ведомость элементов, узлы установки и программа геодезического контроля",
  source_authority: "Проектная организация, производитель выбранной системы лотков и утверждающий инженер проекта",
  source_document_version: "PROJECT_SURFACE_DRAINAGE_CHANNEL_SYSTEM_SCHEDULE_AND_INSTALLATION_DETAILS_REVISION_EXPLICIT",
  definition_hash: "eh_project_surface_drainage_channel_package_r1",
  exact_locator: "Длина и класс нагрузки; точные лотки, решётки, крепёж, бетонная обойма, заглушки, герметик, контроль отметок и условные пескоуловители, сетка и восстановление покрытия",
  use_restriction: "Известная длина определяет только объём монтажной работы; количества элементов, крепежа, бетона, герметика, контрольных операций и условных ветвей берутся из выбранной системы и проекта без переноса исторических коэффициентов",
});

const CONDITIONAL_DETAILS = new Set([
  "silt_trap_designation",
  "silt_trap_quantity_piece",
  "reinforcement_mesh_designation",
  "reinforcement_mesh_area_m2",
  "pavement_reinstatement_designation",
  "pavement_reinstatement_area_m2",
]);

const PARAMETER_SPECS = Object.freeze([
  ["length_m", "Проектная длина водоотводного лотка", "decimal", "m", null],
  ["load_class", "Класс нагрузки водоотводной системы", "text", null, null],
  ["channel_designation", "Выбранный водоотводный лоток", "text", null, null],
  ["channel_quantity_m", "Поставочная длина водоотводных лотков", "decimal", "m", null],
  ["grating_designation", "Выбранная водоприёмная решётка", "text", null, null],
  ["grating_quantity_m", "Поставочная длина водоприёмных решёток", "decimal", "m", null],
  ["fastener_designation", "Крепёж решёток выбранной системы", "text", null, null],
  ["fastener_quantity_set", "Количество комплектов крепежа решёток", "decimal", "set", null],
  ["support_concrete_designation", "Бетон основания и обоймы лотка", "text", null, null],
  ["support_concrete_volume_m3", "Объём бетона основания и обоймы лотка", "decimal", "m3", null],
  ["end_cap_designation", "Торцевая заглушка выбранной системы", "text", null, null],
  ["end_cap_quantity_piece", "Количество торцевых заглушек", "decimal", "pcs", null],
  ["joint_sealant_designation", "Герметик соединений выбранной системы", "text", null, null],
  ["joint_sealant_volume_l", "Объём герметика соединений", "decimal", "l", null],
  ["level_slope_control_plan", "Программа контроля отметок и уклона", "text", null, null],
  ["level_slope_control_count_test", "Количество контрольных проверок отметок и уклона", "decimal", "test", null],
  ["silt_trap_mode", "Пескоуловители предусмотрены проектом", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["silt_trap_designation", "Пескоуловитель выбранной системы", "text", null, null],
  ["silt_trap_quantity_piece", "Количество пескоуловителей", "decimal", "pcs", null],
  ["reinforcement_mesh_mode", "Армирующая сетка бетонной обоймы предусмотрена проектом", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["reinforcement_mesh_designation", "Армирующая сетка бетонной обоймы", "text", null, null],
  ["reinforcement_mesh_area_m2", "Площадь армирующей сетки бетонной обоймы", "decimal", "m2", null],
  ["pavement_reinstatement_mode", "Локальное восстановление покрытия предусмотрено проектом", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["pavement_reinstatement_designation", "Конструкция локального восстановления покрытия", "text", null, null],
  ["pavement_reinstatement_area_m2", "Площадь локального восстановления покрытия", "decimal", "m2", null],
] as const);

function conditionalConstraints(parameterId: string): Json {
  const branch = parameterId.startsWith("silt_trap_")
    ? "silt_trap_mode"
    : parameterId.startsWith("reinforcement_mesh_")
      ? "reinforcement_mesh_mode"
      : parameterId.startsWith("pavement_reinstatement_")
        ? "pavement_reinstatement_mode"
        : null;
  if (!branch || parameterId === branch) return {};
  return {
    requiredWhen: { kind: "equals", parameterId: branch, value: "REQUIRED" },
    forbiddenWhen: { kind: "equals", parameterId: branch, value: "NOT_REQUIRED" },
  };
}

export type SurfaceDrainageChannelParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number;
  unit_id: string | null;
  title_ru: string;
  truth_metadata: Json;
};

export const SURFACE_DRAINAGE_CHANNEL_PARAMETERS:
readonly SurfaceDrainageChannelParameter[] = Object.freeze(PARAMETER_SPECS.map(
  ([parameterId, titleRu, valueType, unitId, enumValues], ordinal) => ({
    parameter_id: parameterId,
    ordinal,
    value_type: valueType,
    unit_id: unitId,
    title_ru: titleRu,
    required: !CONDITIONAL_DETAILS.has(parameterId),
    default_value: null,
    constraints_json: {
      ...(enumValues
        ? { values: enumValues }
        : valueType === "decimal"
          ? { min: 0.000_001 }
          : valueType === "text"
            ? { minLength: 1, maxLength: 1_000 }
            : {}),
      ...conditionalConstraints(parameterId),
    },
    truth_metadata: {
      contract: "rik-expo-app.surface-drainage-channel-r1",
      semantic_parameter_key: `surface-drainage-channel:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: ["length_m", "load_class"].includes(parameterId)
        ? "USER_INPUT"
        : "PROJECT_SPECIFIC_INPUT",
      input_origin_class: ["length_m", "load_class"].includes(parameterId)
        ? "KNOWN_WORK_SCOPE"
        : "APPROVED_DRAINAGE_PROJECT_SYSTEM_SCHEDULE_INSTALLATION_DETAIL_OR_CONTROL_PLAN",
      preliminary_compilation_allowed: true,
      source_confirmation_required: !["length_m", "load_class"].includes(parameterId),
      guide: {
        guide_kind: ["length_m", "load_class"].includes(parameterId)
          ? "MEASUREMENT_RULE"
          : "PROJECT_DEFINED",
        guide_short_ru: parameterId === "length_m"
          ? "Укажите чистую проектную длину именно линии лотков."
          : parameterId === "load_class"
            ? "Укажите подтверждённый проектом класс нагрузки, например D400."
            : `${titleRu}: укажите по ведомости выбранной системы, рабочему узлу, ППР или программе контроля.`,
        source_role: ["length_m", "load_class"].includes(parameterId)
          ? "USER_MEASURED_OR_APPROVED_DRAWING"
          : "APPROVED_PROJECT_PRODUCT_OR_METHOD_DOCUMENTATION",
        source_document: SURFACE_DRAINAGE_CHANNEL_SOURCE_ID,
        source_locator: SURFACE_DRAINAGE_CHANNEL_SOURCE_METADATA.exact_locator,
        guide_version: "surface-drainage-channel-r1",
        source_snapshot_hash: "68e954625849934f8e220fcf4d29646d52dd359ad8ab07c713be9f1c5fc9d04a",
        applicability: "Только для локального пакета монтажа поверхностного водоотводного лотка с решёткой; полная ливневая сеть и вся дорожная одежда не включаются.",
        verified_at: "2026-09-19T00:00:00+06:00",
        guide_validation_policy: "DEFER_MISSING_PROJECT_VALUE_ROW_LOCALLY_REJECT_INVALID_SUPPLIED_VALUE",
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

export const SURFACE_DRAINAGE_CHANNEL_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  formula("drainage_channel_install_length_v1", "m", "length_m"),
  formula("polymer_concrete_channel_quantity_v1", "m", "channel_quantity_m"),
  formula("ductile_iron_grating_quantity_v1", "m", "grating_quantity_m"),
  formula("channel_grating_fastener_quantity_v1", "set", "fastener_quantity_set"),
  formula("channel_concrete_encasement_volume_v1", "m3", "support_concrete_volume_m3"),
  formula("channel_end_cap_quantity_v1", "pcs", "end_cap_quantity_piece"),
  formula("channel_joint_sealant_volume_v1", "l", "joint_sealant_volume_l"),
  formula("channel_level_slope_control_count_v1", "test", "level_slope_control_count_test"),
  formula("channel_silt_trap_quantity_v1", "pcs", "silt_trap_quantity_piece"),
  formula("channel_reinforcement_mesh_area_v1", "m2", "reinforcement_mesh_area_m2"),
  formula("pavement_reinstatement_area_v1", "m2", "pavement_reinstatement_area_m2"),
]);

const literalTrue = Object.freeze({ kind: "literal", value: true });
const equals = (parameterId: string, value: InputValue) => ({ kind: "equals", parameterId, value });

function resource(input: {
  rowId: string;
  ordinal: number;
  section: string;
  category: string;
  titleRu: string;
  unitId: string;
  formulaId: string;
  inclusionAst?: Json;
  procurementEligible: boolean;
  titleParameterIds?: string[];
  sourceRole: string;
}): CanonicalEstimateResourceDefinition {
  const resourceGraph = {
    formulaId: input.formulaId,
    normalizedUom: input.unitId,
    semanticOwnerId: `surface-drainage-channel:${input.rowId}`,
    costOwner: "resource",
    ...(input.titleParameterIds ? {
      titleSpecificationParameterIds: input.titleParameterIds,
      titleSpecificationMode: "APPEND",
      titleSpecificationSeparator: " — ",
    } : {}),
    scopeContextParameterIds: ["length_m", "load_class"],
  };
  const sourceMetadata = {
    truth_contract_version: "R3",
    synthetic: false,
    sourceRole: input.sourceRole,
    normativeTrace: [{
      sourceId: SURFACE_DRAINAGE_CHANNEL_SOURCE_ID,
      source_id: SURFACE_DRAINAGE_CHANNEL_SOURCE_ID,
      normId: SURFACE_DRAINAGE_CHANNEL_NORM_ID,
      norm_id: SURFACE_DRAINAGE_CHANNEL_NORM_ID,
      normVersion: SURFACE_DRAINAGE_CHANNEL_SOURCE_METADATA.source_document_version,
      source_title: SURFACE_DRAINAGE_CHANNEL_SOURCE_METADATA.source_title,
      exact_locator: SURFACE_DRAINAGE_CHANNEL_SOURCE_METADATA.exact_locator,
      source_definition_hash: SURFACE_DRAINAGE_CHANNEL_SOURCE_METADATA.definition_hash,
      sourceRole: input.sourceRole,
    }],
    excludedUnownedAssumptions: [
      "automatic module length, cutting loss or waste",
      "automatic grating or fastener count",
      "automatic concrete cross-section or reinforcement",
      "automatic end-cap, connection or joint-sealant rate",
      "automatic survey-control interval",
      "storm-sewer network or full road pavement package",
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

export const SURFACE_DRAINAGE_CHANNEL_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  resource({ rowId: "rc09:drainage_channel_install", ordinal: 0, section: "Работы", category: "construction_work", titleRu: "Монтаж водоотводного лотка с решёткой", unitId: "m", formulaId: "drainage_channel_install_length_v1", procurementEligible: false, sourceRole: "USER_MEASURED_OR_APPROVED_DRAINAGE_PROJECT" }),
  resource({ rowId: "rc09:polymer_concrete_channel_dn200_d400", ordinal: 1, section: "Материалы", category: "material", titleRu: "Лоток водоотводный выбранной системы", unitId: "m", formulaId: "polymer_concrete_channel_quantity_v1", procurementEligible: true, titleParameterIds: ["channel_designation", "load_class"], sourceRole: "APPROVED_DRAINAGE_SYSTEM_SCHEDULE" }),
  resource({ rowId: "rc09:ductile_iron_grating_d400", ordinal: 2, section: "Материалы", category: "material", titleRu: "Решётка водоприёмная выбранной системы", unitId: "m", formulaId: "ductile_iron_grating_quantity_v1", procurementEligible: true, titleParameterIds: ["grating_designation", "load_class"], sourceRole: "APPROVED_DRAINAGE_SYSTEM_SCHEDULE" }),
  resource({ rowId: "rc09:channel_grating_fastener", ordinal: 3, section: "Материалы", category: "material", titleRu: "Комплект крепления решётки водоотводного лотка", unitId: "set", formulaId: "channel_grating_fastener_quantity_v1", procurementEligible: true, titleParameterIds: ["fastener_designation"], sourceRole: "SELECTED_DRAINAGE_SYSTEM_BILL_OF_MATERIALS" }),
  resource({ rowId: "rc09:channel_concrete_encasement_b25", ordinal: 4, section: "Материалы", category: "material", titleRu: "Бетон основания и обоймы водоотводного лотка", unitId: "m3", formulaId: "channel_concrete_encasement_volume_v1", procurementEligible: true, titleParameterIds: ["support_concrete_designation"], sourceRole: "APPROVED_CHANNEL_INSTALLATION_DETAIL" }),
  resource({ rowId: "rc09:channel_end_cap_dn200", ordinal: 5, section: "Материалы", category: "material", titleRu: "Торцевая заглушка водоотводного лотка", unitId: "pcs", formulaId: "channel_end_cap_quantity_v1", procurementEligible: true, titleParameterIds: ["end_cap_designation"], sourceRole: "SELECTED_DRAINAGE_SYSTEM_BILL_OF_MATERIALS" }),
  resource({ rowId: "rc09:channel_joint_sealant", ordinal: 6, section: "Материалы", category: "material", titleRu: "Герметик соединений водоотводных лотков", unitId: "l", formulaId: "channel_joint_sealant_volume_v1", procurementEligible: true, titleParameterIds: ["joint_sealant_designation"], sourceRole: "APPROVED_CHANNEL_JOINT_SCHEDULE" }),
  resource({ rowId: "rc09:channel_level_slope_control", ordinal: 7, section: "Контроль", category: "service", titleRu: "Геодезический контроль отметок и уклона лотка", unitId: "test", formulaId: "channel_level_slope_control_count_v1", procurementEligible: true, titleParameterIds: ["level_slope_control_plan"], sourceRole: "APPROVED_DRAINAGE_SURVEY_CONTROL_PLAN" }),
  resource({ rowId: "rc09:channel_silt_trap", ordinal: 8, section: "Условные материалы", category: "material", titleRu: "Пескоуловитель линейного водоотвода", unitId: "pcs", formulaId: "channel_silt_trap_quantity_v1", inclusionAst: equals("silt_trap_mode", "REQUIRED"), procurementEligible: true, titleParameterIds: ["silt_trap_designation"], sourceRole: "APPROVED_DRAINAGE_SYSTEM_SCHEDULE" }),
  resource({ rowId: "rc09:channel_reinforcement_mesh", ordinal: 9, section: "Условные материалы", category: "material", titleRu: "Армирующая сетка бетонной обоймы лотка", unitId: "m2", formulaId: "channel_reinforcement_mesh_area_v1", inclusionAst: equals("reinforcement_mesh_mode", "REQUIRED"), procurementEligible: true, titleParameterIds: ["reinforcement_mesh_designation"], sourceRole: "APPROVED_CHANNEL_INSTALLATION_DETAIL" }),
  resource({ rowId: "rc09:pavement_reinstatement", ordinal: 10, section: "Условные работы", category: "construction_work", titleRu: "Локальное восстановление покрытия вдоль лотка", unitId: "m2", formulaId: "pavement_reinstatement_area_v1", inclusionAst: equals("pavement_reinstatement_mode", "REQUIRED"), procurementEligible: false, titleParameterIds: ["pavement_reinstatement_designation"], sourceRole: "APPROVED_LOCAL_REINSTATEMENT_DETAIL" }),
]);

export const SURFACE_DRAINAGE_CHANNEL_SHORT_INPUT = Object.freeze({
  length_m: 80,
  load_class: "D400",
});

export const SURFACE_DRAINAGE_CHANNEL_ACCEPTANCE_INPUT = Object.freeze({
  length_m: 80,
  load_class: "D400",
  channel_designation: "Лоток полимербетонный DN200 по ведомости выбранной системы",
  channel_quantity_m: 81.6,
  grating_designation: "Решётка водоприёмная чугунная по ведомости выбранной системы",
  grating_quantity_m: 81.6,
  fastener_designation: "Штатный болтовой комплект крепления решётки",
  fastener_quantity_set: 160,
  support_concrete_designation: "Бетон тяжёлый B25 по рабочему узлу основания и обоймы",
  support_concrete_volume_m3: 9.6,
  end_cap_designation: "Торцевая заглушка DN200 выбранной системы",
  end_cap_quantity_piece: 2,
  joint_sealant_designation: "Полиуретановый герметик по паспорту выбранной системы",
  joint_sealant_volume_l: 1.44,
  level_slope_control_plan: "Программа геодезического контроля трассы лотка",
  level_slope_control_count_test: 2,
  silt_trap_mode: "NOT_REQUIRED",
  reinforcement_mesh_mode: "NOT_REQUIRED",
  pavement_reinstatement_mode: "NOT_REQUIRED",
});

export async function compileSurfaceDrainageChannelR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? SURFACE_DRAINAGE_CHANNEL_CATALOG_ID;
  if (catalogId !== SURFACE_DRAINAGE_CHANNEL_CATALOG_ID) {
    throw new Error(`SURFACE_DRAINAGE_CHANNEL_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.surface-drainage-channel-r1",
    catalogId,
    primaryMeasureParameterId: "length_m",
    parameterDefinitions: [...SURFACE_DRAINAGE_CHANNEL_PARAMETERS],
    formulaDefinitions: [...SURFACE_DRAINAGE_CHANNEL_FORMULAS],
    resourceDefinitions: [...SURFACE_DRAINAGE_CHANNEL_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 16,
    hashJson: async (value) => JSON.stringify(value),
  });
}

export const SURFACE_DRAINAGE_CHANNEL_SOURCE_SUMMARY = Object.freeze({
  sourceId: SURFACE_DRAINAGE_CHANNEL_SOURCE_ID,
  normId: SURFACE_DRAINAGE_CHANNEL_NORM_ID,
  formula: "known channel length gives installation work only; exact channel, grating, fastener, concrete support, connection, end-cap, sealant, survey-control and conditional quantities come from the approved project and selected system documents",
});
