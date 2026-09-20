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

export const CAT6_TWISTED_PAIR_CABLE_CATALOG_ID =
  "canonical-work:expanded:site_telecom_connection";
export const CAT6_TWISTED_PAIR_CABLE_SOURCE_ID = "project_cat6_cabling_package_v1";
export const CAT6_TWISTED_PAIR_CABLE_NORM_ID = "norm:project:cat6_cabling:package:v1";

export const CAT6_TWISTED_PAIR_CABLE_SOURCE_METADATA = Object.freeze({
  source_title: "Утверждённый кабельный журнал СКС, план трасс, схема маркировки, узлы проходок и крепления, ППР и программа испытаний Cat.6",
  source_authority: "Проектная организация СКС, изготовители компонентов и утверждающий инженер проекта",
  source_document_version: "PROJECT_CAT6_ROUTE_LABEL_FIRESTOP_SUPPORT_CERTIFICATION_REVISION_EXPLICIT",
  definition_hash: "eh_project_cat6_twisted_pair_cable_package_r1",
  exact_locator: "Длина и количество линий U/UTP Cat.6 4 пары LSZH; кабельный журнал и схема маркировки; ведомость Velcro; узлы огнестойких проходок; программа и трудоёмкость сертификационных измерений; keystone, patch-panel, информационные розетки и J-hook только по условным проектным ветвям",
  use_restriction: "Известная длина определяет работу и чистую длину кабеля без неуказанного запаса; известное количество линий определяет число проверок целостности. Маркировка, Velcro, firestop и смены тестера берутся только из проектных и QA-документов; сетевой коммутатор, серверный шкаф и полная СКС не включаются.",
});

const CONDITIONAL_DETAILS = new Set([
  "keystone_designation", "keystone_quantity_piece",
  "patch_panel_designation", "patch_panel_quantity_piece",
  "information_outlet_designation", "information_outlet_quantity_piece",
  "j_hook_designation", "j_hook_quantity_piece",
]);
const PARAMETER_SPECS = Object.freeze([
  ["length_m", "Длина трасс кабеля Cat.6", "decimal", "m", null],
  ["line_count", "Количество линий Cat.6", "integer", "pcs", null],
  ["cable_type", "Тип кабеля СКС", "enum", null, ["U_UTP_CAT6_4PAIR_LSZH"]],
  ["label_designation", "Маркировочная этикетка по схеме маркировки", "text", null, null],
  ["label_quantity_piece", "Количество маркировочных этикеток", "decimal", "pcs", null],
  ["velcro_designation", "Многоразовая Velcro-лента по ведомости", "text", null, null],
  ["velcro_length_m", "Длина Velcro-ленты", "decimal", "m", null],
  ["firestop_designation", "Огнестойкий герметик по узлу проходки", "text", null, null],
  ["firestop_volume_l", "Объём огнестойкого герметика", "decimal", "l", null],
  ["certifier_designation", "Кабельный сертификационный тестер по программе", "text", null, null],
  ["certifier_shift", "Количество смен кабельного тестера", "decimal", "shift", null],
  ["keystone_mode", "Модули keystone входят в этот объём", "enum", null,
    ["NOT_REQUIRED", "REQUIRED"]],
  ["keystone_designation", "Модуль keystone Cat.6 по спецификации", "text", null, null],
  ["keystone_quantity_piece", "Количество модулей keystone Cat.6", "decimal", "pcs", null],
  ["patch_panel_mode", "Патч-панель входит в этот объём", "enum", null,
    ["NOT_REQUIRED", "REQUIRED"]],
  ["patch_panel_designation", "Патч-панель Cat.6 по спецификации", "text", null, null],
  ["patch_panel_quantity_piece", "Количество патч-панелей Cat.6", "decimal", "pcs", null],
  ["information_outlet_mode", "Информационные розетки входят в этот объём", "enum", null,
    ["NOT_REQUIRED", "REQUIRED"]],
  ["information_outlet_designation", "Информационная розетка Cat.6", "text", null, null],
  ["information_outlet_quantity_piece", "Количество информационных розеток", "decimal", "pcs", null],
  ["j_hook_mode", "J-hook крепления требуются по трассе", "enum", null,
    ["NOT_REQUIRED", "REQUIRED"]],
  ["j_hook_designation", "Кабельный J-hook по проекту", "text", null, null],
  ["j_hook_quantity_piece", "Количество кабельных J-hook", "decimal", "pcs", null],
] as const);
const KNOWN_SCOPE = ["length_m", "line_count", "cable_type"];

function conditionalConstraints(parameterId: string): Json {
  const prefix = ["keystone", "patch_panel", "information_outlet", "j_hook"]
    .find((candidate) => parameterId.startsWith(`${candidate}_`));
  const branch = prefix ? `${prefix}_mode` : null;
  if (!branch || parameterId === branch) return {};
  return { requiredWhen: { kind: "equals", parameterId: branch, value: "REQUIRED" },
    forbiddenWhen: { kind: "equals", parameterId: branch, value: "NOT_REQUIRED" } };
}

export type Cat6TwistedPairCableParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number; unit_id: string | null; title_ru: string; truth_metadata: Json;
};
export const CAT6_TWISTED_PAIR_CABLE_PARAMETERS:
readonly Cat6TwistedPairCableParameter[] = Object.freeze(PARAMETER_SPECS.map(
  ([parameterId, titleRu, valueType, unitId, enumValues], ordinal) => ({
    parameter_id: parameterId, ordinal, value_type: valueType, unit_id: unitId,
    title_ru: titleRu, required: !CONDITIONAL_DETAILS.has(parameterId), default_value: null,
    constraints_json: {
      ...(enumValues ? { values: enumValues }
        : valueType === "decimal" || valueType === "integer"
          ? { min: valueType === "integer" ? 1 : 0.000_001 }
          : valueType === "text" ? { minLength: 1, maxLength: 1_000 } : {}),
      ...conditionalConstraints(parameterId),
    },
    truth_metadata: {
      contract: "rik-expo-app.cat6-twisted-pair-cable-r1",
      semantic_parameter_key: `cat6-twisted-pair-cable:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: KNOWN_SCOPE.includes(parameterId) ? "USER_INPUT" : "PROJECT_SPECIFIC_INPUT",
      input_origin_class: KNOWN_SCOPE.includes(parameterId)
        ? "KNOWN_WORK_SCOPE" : "APPROVED_CAT6_ROUTE_LABEL_FIRESTOP_SUPPORT_OR_QA_DOCUMENTATION",
      preliminary_compilation_allowed: true,
      source_confirmation_required: !KNOWN_SCOPE.includes(parameterId),
      guide: {
        guide_kind: KNOWN_SCOPE.includes(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
        guide_short_ru: parameterId === "length_m"
          ? "Укажите чистую длину трасс по кабельному журналу без автоматического запаса."
          : parameterId === "line_count"
            ? "Укажите подтверждённое количество отдельных линий для проверки целостности."
            : KNOWN_SCOPE.includes(parameterId)
              ? `${titleRu}: укажите по маркировке выбранного кабеля.`
              : `${titleRu}: укажите по журналу СКС, узлу, ППР или программе испытаний.`,
        source_role: KNOWN_SCOPE.includes(parameterId)
          ? "USER_SUPPLIED_OR_APPROVED_CAT6_SCOPE"
          : "APPROVED_PROJECT_CAT6_ROUTE_LABEL_FIRESTOP_SUPPORT_OR_QA_DOCUMENTATION",
        source_document: CAT6_TWISTED_PAIR_CABLE_SOURCE_ID,
        source_locator: CAT6_TWISTED_PAIR_CABLE_SOURCE_METADATA.exact_locator,
        guide_version: "cat6-twisted-pair-cable-r1",
        source_snapshot_hash: "6c6b3af75d9570108ab58094d0c965101567220b9b06f0d3214112b048540a43",
        applicability: "Только для прокладки U/UTP Cat.6, 4 пары, LSZH по указанным трассам; сетевой коммутатор, серверный шкаф и полная СКС исключены.",
        verified_at: "2026-09-19T00:00:00+06:00",
        guide_validation_policy: "DEFER_MISSING_PROJECT_VALUE_ROW_LOCALLY_REJECT_INVALID_SUPPLIED_VALUE",
      },
      hidden_default_forbidden: true, synthetic: false,
    },
  })),
);

function formula(formulaId: string, outputUnitId: string, expression: string) {
  const compiled = compileFormulaGraph(expression);
  return { formula_id: formulaId, output_unit_id: outputUnitId, expression_source: expression,
    ast: compiled.ast, input_parameter_ids: compiled.inputParameterIds,
    ast_sha256: "runtime-publisher-replaces-with-deterministic-sha256" };
}
export const CAT6_TWISTED_PAIR_CABLE_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  formula("cat6_cable_lay_length_v1", "m", "length_m"),
  formula("uutp_cat6_4pair_lszh_net_length_v1", "m", "length_m"),
  formula("cat6_identification_label_quantity_v1", "pcs", "label_quantity_piece"),
  formula("reusable_velcro_length_v1", "m", "velcro_length_m"),
  formula("cat6_firestop_volume_v1", "l", "firestop_volume_l"),
  formula("structured_cable_certifier_shift_v1", "shift", "certifier_shift"),
  formula("cat6_route_continuity_check_count_v1", "test", "line_count"),
  formula("cat6_keystone_quantity_v1", "pcs", "keystone_quantity_piece"),
  formula("cat6_patch_panel_quantity_v1", "pcs", "patch_panel_quantity_piece"),
  formula("cat6_information_outlet_quantity_v1", "pcs", "information_outlet_quantity_piece"),
  formula("cable_j_hook_quantity_v1", "pcs", "j_hook_quantity_piece"),
]);
const literalTrue = Object.freeze({ kind: "literal", value: true });
const equals = (parameterId: string, value: InputValue) => ({ kind: "equals", parameterId, value });

function resource(input: {
  rowId: string; ordinal: number; section: string; category: string; titleRu: string;
  unitId: string; formulaId: string; inclusionAst?: Json; procurementEligible: boolean;
  titleParameterIds?: string[]; sourceRole: string;
}): CanonicalEstimateResourceDefinition {
  const resourceGraph = { formulaId: input.formulaId, normalizedUom: input.unitId,
    semanticOwnerId: `cat6-twisted-pair-cable:${input.rowId}`, costOwner: "resource",
    ...(input.titleParameterIds ? { titleSpecificationParameterIds: input.titleParameterIds,
      titleSpecificationMode: "APPEND", titleSpecificationSeparator: " — " } : {}),
    scopeContextParameterIds: KNOWN_SCOPE };
  const sourceMetadata = { truth_contract_version: "R3", synthetic: false,
    sourceRole: input.sourceRole,
    normativeTrace: [{ sourceId: CAT6_TWISTED_PAIR_CABLE_SOURCE_ID,
      source_id: CAT6_TWISTED_PAIR_CABLE_SOURCE_ID, normId: CAT6_TWISTED_PAIR_CABLE_NORM_ID,
      norm_id: CAT6_TWISTED_PAIR_CABLE_NORM_ID,
      normVersion: CAT6_TWISTED_PAIR_CABLE_SOURCE_METADATA.source_document_version,
      source_title: CAT6_TWISTED_PAIR_CABLE_SOURCE_METADATA.source_title,
      exact_locator: CAT6_TWISTED_PAIR_CABLE_SOURCE_METADATA.exact_locator,
      source_definition_hash: CAT6_TWISTED_PAIR_CABLE_SOURCE_METADATA.definition_hash,
      sourceRole: input.sourceRole }],
    excludedUnownedAssumptions: ["automatic cable reserve", "automatic label or Velcro rate",
      "automatic firestop consumption or certifier productivity", "automatic passive termination",
      "network switch, server rack or full structured cabling system", "invented price"] };
  return { id: `resource-${input.rowId.replace(/:/gu, "-")}`, row_id: input.rowId,
    ordinal: input.ordinal, section: input.section, category: input.category,
    title_ru: input.titleRu, unit_id: input.unitId, formula_id: input.formulaId,
    inclusion_ast: input.inclusionAst ?? literalTrue, resource_graph: resourceGraph,
    procurement_eligible: input.procurementEligible, cost_owner_id: input.rowId,
    source_metadata: sourceMetadata,
    row_sha256: estimateDeterministicHash({ input, resourceGraph, sourceMetadata }) };
}

export const CAT6_TWISTED_PAIR_CABLE_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  resource({ rowId: "rc09:cat6_cable_lay", ordinal: 0, section: "Работы", category: "construction_work", titleRu: "Прокладка и маркировка кабеля витая пара U/UTP Cat.6 LSZH", unitId: "m", formulaId: "cat6_cable_lay_length_v1", procurementEligible: false, sourceRole: "USER_SUPPLIED_OR_APPROVED_CAT6_SCOPE" }),
  resource({ rowId: "rc09:uutp_cat6_4pair_lszh", ordinal: 1, section: "Материалы", category: "material", titleRu: "Кабель витая пара U/UTP Cat.6, 4 пары, LSZH — чистая длина", unitId: "m", formulaId: "uutp_cat6_4pair_lszh_net_length_v1", procurementEligible: true, sourceRole: "USER_SUPPLIED_OR_APPROVED_CAT6_SCOPE" }),
  resource({ rowId: "rc09:cat6_cable_identification_label", ordinal: 2, section: "Материалы", category: "material", titleRu: "Этикетка для маркировки линии СКС", unitId: "pcs", formulaId: "cat6_identification_label_quantity_v1", procurementEligible: true, titleParameterIds: ["label_designation"], sourceRole: "APPROVED_CABLE_SCHEDULE" }),
  resource({ rowId: "rc09:reusable_velcro_cable_tie", ordinal: 3, section: "Материалы", category: "material", titleRu: "Многоразовая Velcro-лента для формирования кабельного пучка", unitId: "m", formulaId: "reusable_velcro_length_v1", procurementEligible: true, titleParameterIds: ["velcro_designation"], sourceRole: "APPROVED_ROUTE_LAYOUT" }),
  resource({ rowId: "rc09:cat6_firestop_penetration", ordinal: 4, section: "Материалы", category: "material", titleRu: "Огнестойкий герметик проходки кабеля СКС", unitId: "l", formulaId: "cat6_firestop_volume_v1", procurementEligible: true, titleParameterIds: ["firestop_designation"], sourceRole: "APPROVED_FIRESTOP_DETAIL" }),
  resource({ rowId: "rc09:structured_cable_certifier", ordinal: 5, section: "Оборудование", category: "equipment", titleRu: "Кабельный сертификационный тестер категории 6", unitId: "shift", formulaId: "structured_cable_certifier_shift_v1", procurementEligible: true, titleParameterIds: ["certifier_designation"], sourceRole: "APPROVED_QA_PLAN" }),
  resource({ rowId: "rc09:cat6_route_continuity_check", ordinal: 6, section: "Контроль", category: "service", titleRu: "Проверка целостности и маркировки линии Cat.6", unitId: "test", formulaId: "cat6_route_continuity_check_count_v1", procurementEligible: true, sourceRole: "USER_SUPPLIED_OR_APPROVED_CAT6_SCOPE" }),
  resource({ rowId: "rc09:cat6_keystone", ordinal: 7, section: "Условные материалы", category: "material", titleRu: "Модуль keystone Cat.6", unitId: "pcs", formulaId: "cat6_keystone_quantity_v1", inclusionAst: equals("keystone_mode", "REQUIRED"), procurementEligible: true, titleParameterIds: ["keystone_designation"], sourceRole: "APPROVED_PASSIVE_COMPONENT_SCHEDULE" }),
  resource({ rowId: "rc09:cat6_patch_panel", ordinal: 8, section: "Условные материалы", category: "material", titleRu: "Патч-панель Cat.6", unitId: "pcs", formulaId: "cat6_patch_panel_quantity_v1", inclusionAst: equals("patch_panel_mode", "REQUIRED"), procurementEligible: true, titleParameterIds: ["patch_panel_designation"], sourceRole: "APPROVED_PASSIVE_COMPONENT_SCHEDULE" }),
  resource({ rowId: "rc09:cat6_information_outlet", ordinal: 9, section: "Условные материалы", category: "material", titleRu: "Информационная розетка Cat.6", unitId: "pcs", formulaId: "cat6_information_outlet_quantity_v1", inclusionAst: equals("information_outlet_mode", "REQUIRED"), procurementEligible: true, titleParameterIds: ["information_outlet_designation"], sourceRole: "APPROVED_PASSIVE_COMPONENT_SCHEDULE" }),
  resource({ rowId: "rc09:cable_j_hook", ordinal: 10, section: "Условные материалы", category: "material", titleRu: "Кабельный J-hook по проекту трассы", unitId: "pcs", formulaId: "cable_j_hook_quantity_v1", inclusionAst: equals("j_hook_mode", "REQUIRED"), procurementEligible: true, titleParameterIds: ["j_hook_designation"], sourceRole: "APPROVED_ROUTE_LAYOUT" }),
]);

export const CAT6_TWISTED_PAIR_CABLE_SHORT_INPUT = Object.freeze({
  length_m: 300, line_count: 12, cable_type: "U_UTP_CAT6_4PAIR_LSZH",
});
export const CAT6_TWISTED_PAIR_CABLE_ACCEPTANCE_INPUT = Object.freeze({
  ...CAT6_TWISTED_PAIR_CABLE_SHORT_INPUT,
  label_designation: "Этикетка по схеме маркировки СКС", label_quantity_piece: 24,
  velcro_designation: "Velcro-лента по ведомости кабельных пучков", velcro_length_m: 18,
  firestop_designation: "Огнестойкий герметик по узлам проходок", firestop_volume_l: 3.6,
  certifier_designation: "Сертификационный тестер Cat.6 по программе QA", certifier_shift: 3,
  keystone_mode: "NOT_REQUIRED", patch_panel_mode: "NOT_REQUIRED",
  information_outlet_mode: "NOT_REQUIRED", j_hook_mode: "NOT_REQUIRED",
});

export async function compileCat6TwistedPairCableR1(
  submittedParameters: Record<string, unknown>, options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? CAT6_TWISTED_PAIR_CABLE_CATALOG_ID;
  if (catalogId !== CAT6_TWISTED_PAIR_CABLE_CATALOG_ID) {
    throw new Error(`CAT6_TWISTED_PAIR_CABLE_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({ operation: "compile",
    compilerVersion: "canonical-estimate-compiler.cat6-twisted-pair-cable-r1", catalogId,
    primaryMeasureParameterId: "length_m",
    parameterDefinitions: [...CAT6_TWISTED_PAIR_CABLE_PARAMETERS],
    formulaDefinitions: [...CAT6_TWISTED_PAIR_CABLE_FORMULAS],
    resourceDefinitions: [...CAT6_TWISTED_PAIR_CABLE_RESOURCES], submittedParameters,
    confirmedParameters: {}, currencyCode: "KGS", priceItems: [], maximumResourceRows: 15,
    hashJson: async (value) => JSON.stringify(value) });
}
