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

export const OPTICAL_FIBER_SPLICING_CATALOG_ID =
  "canonical-work:expanded:fiber_optic_connection";
export const OPTICAL_FIBER_SPLICING_SOURCE_ID = "project_optical_fiber_splicing_package_v1";
export const OPTICAL_FIBER_SPLICING_NORM_ID =
  "norm:project:optical_fiber_splicing:package:v1";

export const OPTICAL_FIBER_SPLICING_SOURCE_METADATA = Object.freeze({
  source_title: "Утверждённая схема сварки ВОЛС, паспорт кабеля, ведомость муфт и кассет, ППР и программа измерений",
  source_authority: "Проектная организация ВОЛС, изготовители компонентов и утверждающий инженер проекта",
  source_document_version: "PROJECT_OPTICAL_FIBER_SPLICE_CLEANING_MARKING_OTDR_REVISION_EXPLICIT",
  definition_hash: "eh_project_optical_fiber_splicing_package_r1",
  exact_locator: "Количество сварных соединений и тип волокна; спецификация защитных гильз, безворсовых салфеток, изопропилового очистителя и маркировки; ППР со сменами сварочного аппарата; программа OTDR со сменами рефлектометра и индивидуальными протоколами; пигтейлы и кассеты только по условным проектным ветвям",
  use_restriction: "Известное количество волокон определяет только число сварок и индивидуальных записей измерения затухания. Типы и количества расходных материалов, маркировки и смен оборудования берутся только из утверждённой проектной и QA-документации. Трасса ВОК, оптический кросс и серверный шкаф не включаются.",
});

const CONDITIONAL_DETAILS = new Set([
  "pigtail_designation",
  "pigtail_quantity_piece",
  "splice_tray_designation",
  "splice_tray_quantity_piece",
]);

const PARAMETER_SPECS = Object.freeze([
  ["splice_count", "Количество сварных соединений оптических волокон", "integer", "pcs", null],
  ["fiber_standard", "Стандарт одномодового волокна", "enum", null, ["SM_G652D"]],
  ["sleeve_designation", "Защитная термоусаживаемая гильза по спецификации", "text", null, null],
  ["sleeve_quantity_piece", "Количество защитных термоусаживаемых гильз", "decimal", "pcs", null],
  ["wipe_designation", "Безворсовая салфетка по технологической карте", "text", null, null],
  ["wipe_quantity_piece", "Количество безворсовых салфеток", "decimal", "pcs", null],
  ["cleaner_designation", "Изопропиловый очиститель по технологической карте", "text", null, null],
  ["cleaner_volume_l", "Объём изопропилового очистителя", "decimal", "l", null],
  ["marker_designation", "Маркер сварного соединения по схеме идентификации", "text", null, null],
  ["marker_quantity_piece", "Количество маркеров сварных соединений", "decimal", "pcs", null],
  ["fusion_splicer_designation", "Сварочный аппарат по ППР", "text", null, null],
  ["fusion_splicer_shift", "Количество смен сварочного аппарата", "decimal", "shift", null],
  ["otdr_designation", "Оптический рефлектометр по программе измерений", "text", null, null],
  ["otdr_shift", "Количество смен оптического рефлектометра", "decimal", "shift", null],
  ["pigtail_mode", "Пигтейлы входят в этот объём", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["pigtail_designation", "Оптический пигтейл по спецификации", "text", null, null],
  ["pigtail_quantity_piece", "Количество оптических пигтейлов", "decimal", "pcs", null],
  ["splice_tray_mode", "Кассеты для сварных соединений входят в этот объём", "enum", null,
    ["NOT_REQUIRED", "REQUIRED"]],
  ["splice_tray_designation", "Кассета для сварных соединений по спецификации", "text", null, null],
  ["splice_tray_quantity_piece", "Количество кассет для сварных соединений", "decimal", "pcs", null],
] as const);

const KNOWN_SCOPE = ["splice_count", "fiber_standard"];

function conditionalConstraints(parameterId: string): Json {
  const prefix = ["pigtail", "splice_tray"]
    .find((candidate) => parameterId.startsWith(`${candidate}_`));
  const branch = prefix ? `${prefix}_mode` : null;
  if (!branch || parameterId === branch) return {};
  return {
    requiredWhen: { kind: "equals", parameterId: branch, value: "REQUIRED" },
    forbiddenWhen: { kind: "equals", parameterId: branch, value: "NOT_REQUIRED" },
  };
}

export type OpticalFiberSplicingParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number;
  unit_id: string | null;
  title_ru: string;
  truth_metadata: Json;
};

export const OPTICAL_FIBER_SPLICING_PARAMETERS:
readonly OpticalFiberSplicingParameter[] = Object.freeze(PARAMETER_SPECS.map(
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
      contract: "rik-expo-app.optical-fiber-splicing-r1",
      semantic_parameter_key: `optical-fiber-splicing:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: KNOWN_SCOPE.includes(parameterId)
        ? "USER_INPUT" : "PROJECT_SPECIFIC_INPUT",
      input_origin_class: KNOWN_SCOPE.includes(parameterId)
        ? "KNOWN_WORK_SCOPE"
        : "APPROVED_FIBER_SPLICE_MATERIAL_METHOD_OR_QA_DOCUMENTATION",
      preliminary_compilation_allowed: true,
      source_confirmation_required: !KNOWN_SCOPE.includes(parameterId),
      guide: {
        guide_kind: KNOWN_SCOPE.includes(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
        guide_short_ru: parameterId === "splice_count"
          ? "Укажите подтверждённое количество отдельных сварных соединений волокон."
          : parameterId === "fiber_standard"
            ? "Укажите стандарт волокна по паспорту оптического кабеля."
            : `${titleRu}: укажите по спецификации, ППР или программе измерений.`,
        source_role: KNOWN_SCOPE.includes(parameterId)
          ? "USER_SUPPLIED_OR_APPROVED_FIBER_SPLICE_SCOPE"
          : "APPROVED_PROJECT_FIBER_SPLICE_MATERIAL_METHOD_OR_QA_DOCUMENTATION",
        source_document: OPTICAL_FIBER_SPLICING_SOURCE_ID,
        source_locator: OPTICAL_FIBER_SPLICING_SOURCE_METADATA.exact_locator,
        guide_version: "optical-fiber-splicing-r1",
        source_snapshot_hash: "d2e679f4d415f9f08340a2f1a0b2f87ac6518e37463e6d3ddd884b2adeeba53f",
        applicability: "Только для сварки одномодовых волокон SM G.652D с индивидуальным измерением затухания; трасса ВОК, оптический кросс и серверный шкаф исключены.",
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

export const OPTICAL_FIBER_SPLICING_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  formula("optical_fiber_fusion_splice_count_v1", "pcs", "splice_count"),
  formula("fiber_splice_sleeve_quantity_v1", "pcs", "sleeve_quantity_piece"),
  formula("fiber_lint_free_wipe_quantity_v1", "pcs", "wipe_quantity_piece"),
  formula("fiber_isopropyl_cleaner_volume_v1", "l", "cleaner_volume_l"),
  formula("fiber_splice_marker_quantity_v1", "pcs", "marker_quantity_piece"),
  formula("fiber_fusion_splicer_shift_v1", "shift", "fusion_splicer_shift"),
  formula("fiber_otdr_shift_v1", "shift", "otdr_shift"),
  formula("fiber_otdr_measurement_record_count_v1", "test", "splice_count"),
  formula("fiber_pigtail_quantity_v1", "pcs", "pigtail_quantity_piece"),
  formula("fiber_splice_tray_quantity_v1", "pcs", "splice_tray_quantity_piece"),
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
  inclusionAst?: Json;
  procurementEligible: boolean;
  titleParameterIds?: string[];
  sourceRole: string;
}): CanonicalEstimateResourceDefinition {
  const resourceGraph = {
    formulaId: input.formulaId,
    normalizedUom: input.unitId,
    semanticOwnerId: `optical-fiber-splicing:${input.rowId}`,
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
      sourceId: OPTICAL_FIBER_SPLICING_SOURCE_ID,
      source_id: OPTICAL_FIBER_SPLICING_SOURCE_ID,
      normId: OPTICAL_FIBER_SPLICING_NORM_ID,
      norm_id: OPTICAL_FIBER_SPLICING_NORM_ID,
      normVersion: OPTICAL_FIBER_SPLICING_SOURCE_METADATA.source_document_version,
      source_title: OPTICAL_FIBER_SPLICING_SOURCE_METADATA.source_title,
      exact_locator: OPTICAL_FIBER_SPLICING_SOURCE_METADATA.exact_locator,
      source_definition_hash: OPTICAL_FIBER_SPLICING_SOURCE_METADATA.definition_hash,
      sourceRole: input.sourceRole,
    }],
    excludedUnownedAssumptions: [
      "historical per-splice consumable rates",
      "automatic equipment productivity",
      "automatic pigtail or splice-tray quantities",
      "fiber optic cable route, optical distribution frame or server cabinet",
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

export const OPTICAL_FIBER_SPLICING_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  resource({ rowId: "rc09:optical_fiber_fusion_splice", ordinal: 0,
    section: "Работы", category: "construction_work",
    titleRu: "Сварка оптического волокна SM G.652D", unitId: "pcs",
    formulaId: "optical_fiber_fusion_splice_count_v1", procurementEligible: false,
    titleParameterIds: ["fiber_standard"],
    sourceRole: "USER_SUPPLIED_OR_APPROVED_FIBER_SPLICE_SCOPE" }),
  resource({ rowId: "rc09:fiber_splice_heat_shrink_sleeve", ordinal: 1,
    section: "Материалы", category: "material",
    titleRu: "Термоусаживаемая защитная гильза сварного соединения", unitId: "pcs",
    formulaId: "fiber_splice_sleeve_quantity_v1", procurementEligible: true,
    titleParameterIds: ["sleeve_designation"], sourceRole: "APPROVED_SPLICE_SCHEDULE" }),
  resource({ rowId: "rc09:fiber_lint_free_wipe", ordinal: 2,
    section: "Материалы", category: "material", titleRu: "Безворсовая салфетка для оптического волокна",
    unitId: "pcs", formulaId: "fiber_lint_free_wipe_quantity_v1", procurementEligible: true,
    titleParameterIds: ["wipe_designation"], sourceRole: "APPROVED_METHOD_STATEMENT" }),
  resource({ rowId: "rc09:fiber_isopropyl_cleaner", ordinal: 3,
    section: "Материалы", category: "material", titleRu: "Изопропиловый очиститель оптического волокна",
    unitId: "l", formulaId: "fiber_isopropyl_cleaner_volume_v1", procurementEligible: true,
    titleParameterIds: ["cleaner_designation"], sourceRole: "APPROVED_METHOD_STATEMENT" }),
  resource({ rowId: "rc09:fiber_splice_identification_marker", ordinal: 4,
    section: "Материалы", category: "material", titleRu: "Маркер сварного соединения оптического волокна",
    unitId: "pcs", formulaId: "fiber_splice_marker_quantity_v1", procurementEligible: true,
    titleParameterIds: ["marker_designation"], sourceRole: "APPROVED_SPLICE_IDENTIFICATION_SCHEME" }),
  resource({ rowId: "rc09:fiber_fusion_splicer", ordinal: 5,
    section: "Оборудование", category: "equipment", titleRu: "Сварочный аппарат для оптических волокон",
    unitId: "shift", formulaId: "fiber_fusion_splicer_shift_v1", procurementEligible: true,
    titleParameterIds: ["fusion_splicer_designation"], sourceRole: "APPROVED_METHOD_STATEMENT" }),
  resource({ rowId: "rc09:optical_time_domain_reflectometer", ordinal: 6,
    section: "Оборудование", category: "equipment", titleRu: "Оптический рефлектометр OTDR",
    unitId: "shift", formulaId: "fiber_otdr_shift_v1", procurementEligible: true,
    titleParameterIds: ["otdr_designation"], sourceRole: "APPROVED_QA_PLAN" }),
  resource({ rowId: "rc09:fiber_otdr_measurement_protocol", ordinal: 7,
    section: "Контроль", category: "service",
    titleRu: "Измерение затухания OTDR с индивидуальной записью протокола", unitId: "test",
    formulaId: "fiber_otdr_measurement_record_count_v1", procurementEligible: true,
    sourceRole: "USER_SUPPLIED_OR_APPROVED_FIBER_SPLICE_SCOPE" }),
  resource({ rowId: "rc09:fiber_pigtail", ordinal: 8,
    section: "Условные материалы", category: "material", titleRu: "Оптический пигтейл",
    unitId: "pcs", formulaId: "fiber_pigtail_quantity_v1",
    inclusionAst: equals("pigtail_mode", "REQUIRED"), procurementEligible: true,
    titleParameterIds: ["pigtail_designation"], sourceRole: "APPROVED_OPTICAL_TERMINATION_SCHEDULE" }),
  resource({ rowId: "rc09:fiber_splice_tray", ordinal: 9,
    section: "Условные материалы", category: "material", titleRu: "Кассета для сварных соединений волокон",
    unitId: "pcs", formulaId: "fiber_splice_tray_quantity_v1",
    inclusionAst: equals("splice_tray_mode", "REQUIRED"), procurementEligible: true,
    titleParameterIds: ["splice_tray_designation"], sourceRole: "APPROVED_CLOSURE_OR_ODF_SCHEDULE" }),
]);

export const OPTICAL_FIBER_SPLICING_SHORT_INPUT = Object.freeze({
  splice_count: 48,
  fiber_standard: "SM_G652D",
});

export const OPTICAL_FIBER_SPLICING_ACCEPTANCE_INPUT = Object.freeze({
  ...OPTICAL_FIBER_SPLICING_SHORT_INPUT,
  sleeve_designation: "Гильза КДЗС 60 мм по спецификации", sleeve_quantity_piece: 48,
  wipe_designation: "Безворсовая салфетка по технологической карте", wipe_quantity_piece: 96,
  cleaner_designation: "Изопропиловый очиститель по технологической карте", cleaner_volume_l: 0.2,
  marker_designation: "Маркер волокна по схеме идентификации", marker_quantity_piece: 48,
  fusion_splicer_designation: "Сварочный аппарат с юстировкой по сердцевине по ППР",
  fusion_splicer_shift: 1.5,
  otdr_designation: "OTDR для SM G.652D по программе измерений", otdr_shift: 1,
  pigtail_mode: "NOT_REQUIRED",
  splice_tray_mode: "NOT_REQUIRED",
});

export async function compileOpticalFiberSplicingR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? OPTICAL_FIBER_SPLICING_CATALOG_ID;
  if (catalogId !== OPTICAL_FIBER_SPLICING_CATALOG_ID) {
    throw new Error(`OPTICAL_FIBER_SPLICING_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.optical-fiber-splicing-r1",
    catalogId,
    primaryMeasureParameterId: "splice_count",
    parameterDefinitions: [...OPTICAL_FIBER_SPLICING_PARAMETERS],
    formulaDefinitions: [...OPTICAL_FIBER_SPLICING_FORMULAS],
    resourceDefinitions: [...OPTICAL_FIBER_SPLICING_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 15,
    hashJson: async (value) => JSON.stringify(value),
  });
}
