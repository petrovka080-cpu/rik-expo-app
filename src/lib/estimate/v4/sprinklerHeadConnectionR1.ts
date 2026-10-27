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

export const SPRINKLER_HEAD_CONNECTION_CATALOG_ID = "canonical-work:expanded:sprinkler_system";
export const SPRINKLER_HEAD_CONNECTION_SOURCE_ID = "project_sprinkler_head_connection_package_v1";
export const SPRINKLER_HEAD_CONNECTION_NORM_ID = "norm:project:sprinkler_head_connection:package:v1";

export const SPRINKLER_HEAD_CONNECTION_SOURCE_METADATA = Object.freeze({
  source_title: "Утверждённая ведомость оросителей, узел присоединения, паспорт изготовителя, монтажная карта и программа контроля",
  source_authority: "Проектная организация, изготовитель сертифицированного оросителя и утверждающий инженер пожаротушения",
  source_document_version: "PROJECT_SPRINKLER_HEAD_SCHEDULE_CONNECTION_METHOD_QA_REVISION_EXPLICIT",
  definition_hash: "eh_project_sprinkler_head_connection_package_r1",
  exact_locator: "Количество, K-фактор, температура срабатывания и резьба оросителей; тип муфты, резьбовое уплотнение, декоративные розетки и защитные колпачки; специальный ключ изготовителя; запись визуального контроля; гибкая подводка только по условному проектному узлу",
  use_restriction: "Известное количество оросителей определяет только монтаж, сами оросители и поштучную запись визуального контроля. Муфты, длина уплотнения, розетки, колпачки и время специального ключа берутся из узла, паспорта и монтажной карты без переноса исторических коэффициентов; трубная сеть, насосы, узел управления и вся система пожаротушения не включаются.",
});

const CONDITIONAL_DETAILS = new Set([
  "flexible_hose_designation", "flexible_hose_quantity_piece",
]);

const PARAMETER_SPECS = Object.freeze([
  ["sprinkler_count", "Количество монтируемых оросителей", "integer", "pcs", null],
  ["k_factor", "K-фактор оросителя", "decimal", null, null],
  ["temperature_rating_c", "Температура срабатывания оросителя", "decimal", "celsius", null],
  ["thread_size_inch", "Размер присоединительной резьбы", "text", null, null],
  ["reducing_socket_designation", "Редукционная муфта по узлу присоединения", "text", null, null],
  ["reducing_socket_quantity_piece", "Количество редукционных муфт", "decimal", "pcs", null],
  ["thread_seal_designation", "Резьбовое уплотнение, допущенное для системы", "text", null, null],
  ["thread_seal_length_m", "Длина уплотнительной нити", "decimal", "m", null],
  ["escutcheon_designation", "Декоративная розетка по ведомости оросителей", "text", null, null],
  ["escutcheon_quantity_piece", "Количество декоративных розеток", "decimal", "pcs", null],
  ["protective_cap_designation", "Защитный монтажный колпачок по паспорту", "text", null, null],
  ["protective_cap_quantity_piece", "Количество защитных колпачков", "decimal", "pcs", null],
  ["manufacturer_wrench_designation", "Специальный ключ изготовителя", "text", null, null],
  ["manufacturer_wrench_machine_h", "Время применения специального ключа", "decimal", "machine_hour", null],
  ["flexible_hose_mode", "Гибкая подводка оросителя требуется по проекту", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["flexible_hose_designation", "Сертифицированная гибкая подводка по проекту", "text", null, null],
  ["flexible_hose_quantity_piece", "Количество гибких подводок", "decimal", "pcs", null],
] as const);

const KNOWN_SCOPE = ["sprinkler_count", "k_factor", "temperature_rating_c", "thread_size_inch"];

function conditionalConstraints(parameterId: string): Json {
  if (!parameterId.startsWith("flexible_hose_") || parameterId === "flexible_hose_mode") return {};
  return {
    requiredWhen: { kind: "equals", parameterId: "flexible_hose_mode", value: "REQUIRED" },
    forbiddenWhen: { kind: "equals", parameterId: "flexible_hose_mode", value: "NOT_REQUIRED" },
  };
}

export type SprinklerHeadConnectionParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number;
  unit_id: string | null;
  title_ru: string;
  truth_metadata: Json;
};

export const SPRINKLER_HEAD_CONNECTION_PARAMETERS:
readonly SprinklerHeadConnectionParameter[] = Object.freeze(PARAMETER_SPECS.map(
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
        : valueType === "decimal" || valueType === "integer"
          ? { min: valueType === "integer" ? 1 : 0.000_001 }
          : valueType === "text"
            ? { minLength: 1, maxLength: 1_000 }
            : {}),
      ...conditionalConstraints(parameterId),
    },
    truth_metadata: {
      contract: "rik-expo-app.sprinkler-head-connection-r1",
      semantic_parameter_key: `sprinkler-head-connection:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: KNOWN_SCOPE.includes(parameterId) ? "USER_INPUT" : "PROJECT_SPECIFIC_INPUT",
      input_origin_class: KNOWN_SCOPE.includes(parameterId)
        ? "KNOWN_WORK_SCOPE"
        : "APPROVED_SPRINKLER_SCHEDULE_CONNECTION_METHOD_OR_QA_DOCUMENTATION",
      preliminary_compilation_allowed: true,
      source_confirmation_required: !KNOWN_SCOPE.includes(parameterId),
      guide: {
        guide_kind: KNOWN_SCOPE.includes(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
        guide_short_ru: parameterId === "sprinkler_count"
          ? "Укажите подтверждённое количество устанавливаемых оросителей по ведомости."
          : KNOWN_SCOPE.includes(parameterId)
            ? `${titleRu}: укажите по маркировке выбранного сертифицированного оросителя.`
            : `${titleRu}: укажите по ведомости, узлу присоединения, паспорту или монтажной карте.`,
        source_role: KNOWN_SCOPE.includes(parameterId)
          ? "USER_SUPPLIED_OR_APPROVED_SPRINKLER_SCOPE"
          : "APPROVED_PROJECT_SPRINKLER_SCHEDULE_CONNECTION_METHOD_OR_QA_DOCUMENTATION",
        source_document: SPRINKLER_HEAD_CONNECTION_SOURCE_ID,
        source_locator: SPRINKLER_HEAD_CONNECTION_SOURCE_METADATA.exact_locator,
        guide_version: "sprinkler-head-connection-r1",
        source_snapshot_hash: "5b797258f70dc4526c85f6ff5ce724b8b2d13f9633f4e0d89b20a290fe4ad4d1",
        applicability: "Только для монтажа и присоединения указанных оросителей K80, 68 °C, резьба 1/2 дюйма; трубная сеть, пожарный насос, узел управления и полная система пожаротушения исключены.",
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

export const SPRINKLER_HEAD_CONNECTION_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  formula("sprinkler_head_install_count_v1", "pcs", "sprinkler_count"),
  formula("sprinkler_head_k80_68c_quantity_v1", "pcs", "sprinkler_count"),
  formula("sprinkler_reducing_socket_quantity_v1", "pcs", "reducing_socket_quantity_piece"),
  formula("approved_thread_seal_length_v1", "m", "thread_seal_length_m"),
  formula("sprinkler_escutcheon_quantity_v1", "pcs", "escutcheon_quantity_piece"),
  formula("sprinkler_protective_cap_quantity_v1", "pcs", "protective_cap_quantity_piece"),
  formula("manufacturer_sprinkler_wrench_time_v1", "machine_hour", "manufacturer_wrench_machine_h"),
  formula("sprinkler_head_visual_record_count_v1", "test", "sprinkler_count"),
  formula("listed_flexible_sprinkler_hose_quantity_v1", "pcs", "flexible_hose_quantity_piece"),
]);

const literalTrue = Object.freeze({ kind: "literal", value: true });
const equals = (parameterId: string, value: InputValue) => ({ kind: "equals", parameterId, value });

function resource(input: {
  rowId: string; ordinal: number; section: string; category: string; titleRu: string;
  unitId: string; formulaId: string; inclusionAst?: Json; procurementEligible: boolean;
  titleParameterIds?: string[]; sourceRole: string;
}): CanonicalEstimateResourceDefinition {
  const resourceGraph = {
    formulaId: input.formulaId,
    normalizedUom: input.unitId,
    semanticOwnerId: `sprinkler-head-connection:${input.rowId}`,
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
      sourceId: SPRINKLER_HEAD_CONNECTION_SOURCE_ID,
      source_id: SPRINKLER_HEAD_CONNECTION_SOURCE_ID,
      normId: SPRINKLER_HEAD_CONNECTION_NORM_ID,
      norm_id: SPRINKLER_HEAD_CONNECTION_NORM_ID,
      normVersion: SPRINKLER_HEAD_CONNECTION_SOURCE_METADATA.source_document_version,
      source_title: SPRINKLER_HEAD_CONNECTION_SOURCE_METADATA.source_title,
      exact_locator: SPRINKLER_HEAD_CONNECTION_SOURCE_METADATA.exact_locator,
      source_definition_hash: SPRINKLER_HEAD_CONNECTION_SOURCE_METADATA.definition_hash,
      sourceRole: input.sourceRole,
    }],
    excludedUnownedAssumptions: [
      "automatic reducing socket, escutcheon or cap per sprinkler",
      "historical thread-seal consumption or wrench productivity",
      "automatic flexible sprinkler hose",
      "sprinkler pipe network, fire pump, alarm valve station or full suppression system",
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

export const SPRINKLER_HEAD_CONNECTION_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  resource({ rowId: "rc09:sprinkler_head_install", ordinal: 0, section: "Работы", category: "construction_work", titleRu: "Монтаж и присоединение спринклерного оросителя K80, 68 °C, резьба 1/2 дюйма", unitId: "pcs", formulaId: "sprinkler_head_install_count_v1", procurementEligible: false, sourceRole: "USER_SUPPLIED_OR_APPROVED_SPRINKLER_SCOPE" }),
  resource({ rowId: "rc09:sprinkler_head_k80_68c", ordinal: 1, section: "Материалы", category: "material", titleRu: "Ороситель спринклерный сертифицированный K80, 68 °C, резьба 1/2 дюйма", unitId: "pcs", formulaId: "sprinkler_head_k80_68c_quantity_v1", procurementEligible: true, sourceRole: "USER_SUPPLIED_OR_APPROVED_SPRINKLER_SCOPE" }),
  resource({ rowId: "rc09:sprinkler_reducing_socket_half_inch", ordinal: 2, section: "Материалы", category: "material", titleRu: "Муфта редукционная для присоединения оросителя 1/2 дюйма", unitId: "pcs", formulaId: "sprinkler_reducing_socket_quantity_v1", procurementEligible: true, titleParameterIds: ["reducing_socket_designation"], sourceRole: "APPROVED_CONNECTION_DETAIL" }),
  resource({ rowId: "rc09:approved_thread_seal_sprinkler", ordinal: 3, section: "Материалы", category: "material", titleRu: "Уплотнительная нить, допущенная для резьбового соединения системы пожаротушения", unitId: "m", formulaId: "approved_thread_seal_length_v1", procurementEligible: true, titleParameterIds: ["thread_seal_designation"], sourceRole: "APPROVED_MANUFACTURER_INSTALLATION_INSTRUCTION" }),
  resource({ rowId: "rc09:sprinkler_decorative_escutcheon", ordinal: 4, section: "Материалы", category: "material", titleRu: "Розетка декоративная для спринклерного оросителя", unitId: "pcs", formulaId: "sprinkler_escutcheon_quantity_v1", procurementEligible: true, titleParameterIds: ["escutcheon_designation"], sourceRole: "APPROVED_SPRINKLER_SCHEDULE" }),
  resource({ rowId: "rc09:sprinkler_protective_cap", ordinal: 5, section: "Материалы", category: "material", titleRu: "Колпачок защитный монтажный для оросителя", unitId: "pcs", formulaId: "sprinkler_protective_cap_quantity_v1", procurementEligible: true, titleParameterIds: ["protective_cap_designation"], sourceRole: "APPROVED_MANUFACTURER_INSTALLATION_INSTRUCTION" }),
  resource({ rowId: "rc09:manufacturer_sprinkler_wrench", ordinal: 6, section: "Инструмент", category: "equipment", titleRu: "Специальный ключ изготовителя для монтажа оросителя", unitId: "machine_hour", formulaId: "manufacturer_sprinkler_wrench_time_v1", procurementEligible: true, titleParameterIds: ["manufacturer_wrench_designation"], sourceRole: "APPROVED_METHOD_STATEMENT" }),
  resource({ rowId: "rc09:sprinkler_head_visual_record", ordinal: 7, section: "Контроль", category: "service", titleRu: "Контроль ориентации и маркировки спринклерного оросителя", unitId: "test", formulaId: "sprinkler_head_visual_record_count_v1", procurementEligible: true, sourceRole: "USER_SUPPLIED_OR_APPROVED_SPRINKLER_SCOPE" }),
  resource({ rowId: "rc09:listed_flexible_sprinkler_hose", ordinal: 8, section: "Условные материалы", category: "material", titleRu: "Сертифицированная гибкая подводка спринклерного оросителя", unitId: "pcs", formulaId: "listed_flexible_sprinkler_hose_quantity_v1", inclusionAst: equals("flexible_hose_mode", "REQUIRED"), procurementEligible: true, titleParameterIds: ["flexible_hose_designation"], sourceRole: "APPROVED_CONNECTION_DETAIL" }),
]);

export const SPRINKLER_HEAD_CONNECTION_SHORT_INPUT = Object.freeze({
  sprinkler_count: 40,
  k_factor: 80,
  temperature_rating_c: 68,
  thread_size_inch: "1/2",
});

export const SPRINKLER_HEAD_CONNECTION_ACCEPTANCE_INPUT = Object.freeze({
  ...SPRINKLER_HEAD_CONNECTION_SHORT_INPUT,
  reducing_socket_designation: "Редукционная муфта 1/2 дюйма по узлу присоединения",
  reducing_socket_quantity_piece: 40,
  thread_seal_designation: "Уплотнительная нить, допущенная изготовителем оросителя",
  thread_seal_length_m: 32,
  escutcheon_designation: "Декоративная розетка по ведомости оросителей",
  escutcheon_quantity_piece: 40,
  protective_cap_designation: "Защитный монтажный колпачок по паспорту",
  protective_cap_quantity_piece: 40,
  manufacturer_wrench_designation: "Специальный ключ изготовителя выбранного оросителя",
  manufacturer_wrench_machine_h: 3.2,
  flexible_hose_mode: "NOT_REQUIRED",
});

export async function compileSprinklerHeadConnectionR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? SPRINKLER_HEAD_CONNECTION_CATALOG_ID;
  if (catalogId !== SPRINKLER_HEAD_CONNECTION_CATALOG_ID) {
    throw new Error(`SPRINKLER_HEAD_CONNECTION_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.sprinkler-head-connection-r1",
    catalogId,
    primaryMeasureParameterId: "sprinkler_count",
    parameterDefinitions: [...SPRINKLER_HEAD_CONNECTION_PARAMETERS],
    formulaDefinitions: [...SPRINKLER_HEAD_CONNECTION_FORMULAS],
    resourceDefinitions: [...SPRINKLER_HEAD_CONNECTION_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 12,
    hashJson: async (value) => JSON.stringify(value),
  });
}
