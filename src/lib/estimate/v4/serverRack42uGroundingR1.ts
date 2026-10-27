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

export const SERVER_RACK_42U_GROUNDING_CATALOG_ID =
  "canonical-work:expanded:data_center_mep";
export const SERVER_RACK_42U_GROUNDING_SOURCE_ID =
  "project_server_rack_42u_grounding_schedule_details_qa_v1";
export const SERVER_RACK_42U_GROUNDING_NORM_ID =
  "norm:project:server_rack_42u_grounding:schedule_details_qa:v1";

export const SERVER_RACK_42U_GROUNDING_SOURCE_METADATA = Object.freeze({
  source_title: "Утверждённая спецификация серверных шкафов, планы расстановки и заземления, узлы крепления, кабельный журнал и программа измерений",
  source_authority: "Проектная организация СС/ЭОМ, изготовитель шкафа, служба контроля качества и утверждающий инженер проекта",
  source_document_version: "PROJECT_SERVER_RACK_42U_D1200_PRODUCT_FIXING_BONDING_ACCESSORIES_QA_REVISION_EXPLICIT",
  definition_hash: "da1ec3b0f8bd2388378d25bc0cd451f55098cf5e9b73a018c951ddd640fd7289",
  exact_locator: "6 серверных шкафов высотой 42U и глубиной 1200 мм; ширина и исполнение шкафа, анкеры, комплект уравнивания потенциалов, PE-проводник, наконечники, cage nuts и организаторы — только по утверждённым спецификации, планам, узлам и кабельному журналу; цоколь, PDU и вертикальный организатор — только по явным проектным условиям",
  use_restriction: "Известные количество, высота и глубина определяют монтаж/заземление и индивидуальную проверку непрерывности. Ширина, модель и количества комплектующих не выводятся из исторических коэффициентов. UPS, батареи, охлаждение, пожаротушение, СКУД и полный серверный зал исключены.",
  source_kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
  artifact_sha256: "da1ec3b0f8bd2388378d25bc0cd451f55098cf5e9b73a018c951ddd640fd7289",
});

const CONDITIONAL_PREFIXES = [
  "rack_plinth",
  "rack_pdu",
  "vertical_cable_organizer",
] as const;
const CONDITIONAL_DETAILS = new Set(CONDITIONAL_PREFIXES.flatMap((prefix) => [
  `${prefix}_designation`,
  `${prefix}_quantity`,
]));
const KNOWN_SCOPE = [
  "rack_count",
  "rack_height_u",
  "rack_depth_mm",
  "rack_width_designation",
  "rack_designation",
];
const VISIBLE_PRELIMINARY_PROFILE = new Set([
  "rack_retained_spare_piece",
  "rack_supplier_pack_size_piece",
]);

const PARAMETER_SPECS = Object.freeze([
  ["rack_count", "Количество серверных шкафов", "integer", "pcs", null],
  ["rack_height_u", "Монтажная высота шкафа, U", "integer", null, null],
  ["rack_depth_mm", "Глубина шкафа", "decimal", "mm", null],
  ["rack_width_designation", "Ширина шкафа по спецификации", "text", null, null],
  ["rack_designation", "Серверный шкаф по спецификации", "text", null, null],
  ["anchor_set_designation", "Комплект анкеров по основанию и паспорту шкафа", "text", null, null],
  ["anchor_set_quantity", "Количество комплектов анкеров", "decimal", "set", null],
  ["bonding_kit_designation", "Комплект заземления дверей и панелей шкафа", "text", null, null],
  ["bonding_kit_quantity", "Количество комплектов заземления шкафа", "decimal", "set", null],
  ["pe_conductor_designation", "Защитный медный проводник по проекту", "text", null, null],
  ["pe_conductor_length_m", "Длина защитного медного проводника", "decimal", "m", null],
  ["copper_lug_designation", "Медный наконечник по сечению PE-проводника", "text", null, null],
  ["copper_lug_quantity", "Количество медных наконечников", "decimal", "pcs", null],
  ["cage_nut_bolt_designation", "Комплект клеточной гайки и винта для шкафа", "text", null, null],
  ["cage_nut_bolt_quantity", "Количество комплектов клеточной гайки и винта", "decimal", "set", null],
  ["horizontal_cable_organizer_designation", "Горизонтальный кабельный организатор", "text", null, null],
  ["horizontal_cable_organizer_quantity", "Количество горизонтальных кабельных организаторов", "decimal", "pcs", null],
  ["rack_plinth_mode", "Цоколь шкафа входит в объём", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["rack_plinth_designation", "Цоколь шкафа по спецификации", "text", null, null],
  ["rack_plinth_quantity", "Количество цоколей", "decimal", "pcs", null],
  ["rack_pdu_mode", "Блок распределения питания PDU входит в объём", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["rack_pdu_designation", "PDU по электрической спецификации", "text", null, null],
  ["rack_pdu_quantity", "Количество PDU", "decimal", "pcs", null],
  ["vertical_cable_organizer_mode", "Вертикальный кабельный организатор входит в объём", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["vertical_cable_organizer_designation", "Вертикальный кабельный организатор по спецификации", "text", null, null],
  ["vertical_cable_organizer_quantity", "Количество вертикальных кабельных организаторов", "decimal", "pcs", null],
  ["rack_retained_spare_piece", "Сохраняемый резерв серверных шкафов", "decimal", "pcs", null],
  ["rack_supplier_pack_size_piece", "Количество шкафов в поставочной упаковке", "decimal", "pcs", null],
  ["ground_continuity_report_designation", "Акт измерения непрерывности защитных соединений", "text", null, null],
  ["ground_continuity_report_quantity_document", "Количество актов измерения непрерывности", "decimal", "document", null],
  ["rack_installation_labor_h", "Труд монтажников и электромонтажников по установке и заземлению", "decimal", "man_hour", null],
  ["rack_testing_labor_h", "Труд электролаборатории по проверке защитных соединений", "decimal", "man_hour", null],
  ["rack_handling_machine_h", "Работа механизма перемещения и позиционирования шкафов", "decimal", "machine_hour", null],
  ["rack_torque_tool_machine_h", "Работа тарированного инструмента затяжки крепежа", "decimal", "machine_hour", null],
  ["ground_continuity_tester_machine_h", "Работа измерителя непрерывности защитных соединений", "decimal", "machine_hour", null],
  ["rack_delivery_trip_count", "Рейсы доставки шкафов и комплектующих", "integer", "trip", null],
  ["rack_packaging_removal_trip_count", "Рейсы вывоза упаковки шкафов", "integer", "trip", null],
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

export type ServerRack42uGroundingParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number;
  unit_id: string | null;
  title_ru: string;
  truth_metadata: Json;
};

export const SERVER_RACK_42U_GROUNDING_PARAMETERS:
readonly ServerRack42uGroundingParameter[] = Object.freeze(PARAMETER_SPECS.map(
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
          ? { min: parameterId === "rack_retained_spare_piece"
            ? 0
            : valueType === "integer" ? 1 : 0.000_001 }
          : valueType === "text" ? { minLength: 1, maxLength: 1_000 } : {}),
      ...conditionalConstraints(parameterId),
    },
    truth_metadata: {
      contract: "rik-expo-app.server-rack-42u-grounding-r1",
      semantic_parameter_key: `server-rack-42u-grounding:${parameterId}`,
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
        : "APPROVED_RACK_SCHEDULE_FIXING_BONDING_ACCESSORY_OR_QA_DOCUMENTATION",
      preliminary_compilation_allowed: true,
      source_confirmation_required: !KNOWN_SCOPE.includes(parameterId)
        && !VISIBLE_PRELIMINARY_PROFILE.has(parameterId),
      guide: {
        guide_kind: KNOWN_SCOPE.includes(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
        guide_short_ru: KNOWN_SCOPE.includes(parameterId)
          ? `${titleRu}: укажите по известному объёму и габаритам шкафов.`
          : `${titleRu}: укажите по утверждённой спецификации, плану, узлу или кабельному журналу.`,
        source_role: KNOWN_SCOPE.includes(parameterId)
          ? "USER_SUPPLIED_OR_APPROVED_RACK_SCOPE"
          : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
            ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE"
          : "APPROVED_RACK_SCHEDULE_FIXING_BONDING_ACCESSORY_OR_QA_DOCUMENTATION",
        source_document: SERVER_RACK_42U_GROUNDING_SOURCE_ID,
        source_locator: SERVER_RACK_42U_GROUNDING_SOURCE_METADATA.exact_locator,
        guide_version: "server-rack-42u-grounding-r1",
        source_snapshot_hash: SERVER_RACK_42U_GROUNDING_SOURCE_METADATA.artifact_sha256,
        applicability: "Только для монтажа, анкеровки и заземления известных серверных шкафов; полный серверный зал исключён.",
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

export const SERVER_RACK_42U_GROUNDING_RUNTIME_INPUT = Object.freeze({
  rack_retained_spare_piece: 0,
  rack_supplier_pack_size_piece: 1,
});
export const SERVER_RACK_42U_GROUNDING_RUNTIME_CLASSIFICATION = Object.freeze(
  Object.fromEntries(Object.keys(SERVER_RACK_42U_GROUNDING_RUNTIME_INPUT).map(
    (parameterId) => [parameterId, "ASSUMPTION"],
  )) as Readonly<Record<string, "ASSUMPTION">>,
);
export const SERVER_RACK_42U_GROUNDING_RUNTIME_SOURCE_IDS = Object.freeze(
  Object.fromEntries(Object.keys(SERVER_RACK_42U_GROUNDING_RUNTIME_INPUT).map(
    (parameterId) => [parameterId, [SERVER_RACK_42U_GROUNDING_SOURCE_ID]],
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

export const SERVER_RACK_42U_GROUNDING_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  formula("server_rack_42u_install_ground_count_v1", "pcs", "rack_count"),
  formula("server_rack_42u_product_order_v2", "pcs",
    "ceil((rack_count+rack_retained_spare_piece)/rack_supplier_pack_size_piece)*rack_supplier_pack_size_piece"),
  formula("server_rack_anchor_set_quantity_v1", "set", "anchor_set_quantity"),
  formula("server_rack_bonding_kit_quantity_v1", "set", "bonding_kit_quantity"),
  formula("copper_pe_conductor_length_v1", "m", "pe_conductor_length_m"),
  formula("copper_lug_quantity_v1", "pcs", "copper_lug_quantity"),
  formula("rack_cage_nut_bolt_quantity_v1", "set", "cage_nut_bolt_quantity"),
  formula("rack_horizontal_cable_organizer_quantity_v1", "pcs", "horizontal_cable_organizer_quantity"),
  formula("rack_ground_continuity_test_count_v1", "test", "rack_count"),
  formula("rack_plinth_quantity_v1", "pcs", "rack_plinth_quantity"),
  formula("rack_pdu_quantity_v1", "pcs", "rack_pdu_quantity"),
  formula("vertical_cable_organizer_quantity_v1", "pcs", "vertical_cable_organizer_quantity"),
  formula("server_rack_installed_net_v2", "pcs", "rack_count"),
  formula("server_rack_retained_spare_v2", "pcs", "rack_retained_spare_piece"),
  formula("server_rack_total_need_v2", "pcs", "rack_count+rack_retained_spare_piece"),
  formula("server_rack_package_count_v2", "package",
    "ceil((rack_count+rack_retained_spare_piece)/rack_supplier_pack_size_piece)"),
  formula("server_rack_remainder_v2", "pcs",
    "ceil((rack_count+rack_retained_spare_piece)/rack_supplier_pack_size_piece)*rack_supplier_pack_size_piece-rack_count"),
  formula("server_rack_surplus_v2", "pcs",
    "max(0,ceil((rack_count+rack_retained_spare_piece)/rack_supplier_pack_size_piece)*rack_supplier_pack_size_piece-rack_count-rack_retained_spare_piece)"),
  formula("ground_continuity_report_quantity_v2", "document", "ground_continuity_report_quantity_document"),
  formula("rack_installation_labor_v2", "man_hour", "rack_installation_labor_h"),
  formula("rack_testing_labor_v2", "man_hour", "rack_testing_labor_h"),
  formula("rack_handling_machine_v2", "machine_hour", "rack_handling_machine_h"),
  formula("rack_torque_tool_machine_v2", "machine_hour", "rack_torque_tool_machine_h"),
  formula("ground_continuity_tester_machine_v2", "machine_hour", "ground_continuity_tester_machine_h"),
  formula("rack_delivery_v2", "trip", "rack_delivery_trip_count"),
  formula("rack_packaging_removal_v2", "trip", "rack_packaging_removal_trip_count"),
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
    semanticOwnerId: `server-rack-42u-grounding:${input.rowId}`,
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
      sourceId: SERVER_RACK_42U_GROUNDING_SOURCE_ID,
      source_id: SERVER_RACK_42U_GROUNDING_SOURCE_ID,
      normId: SERVER_RACK_42U_GROUNDING_NORM_ID,
      norm_id: SERVER_RACK_42U_GROUNDING_NORM_ID,
      normVersion: SERVER_RACK_42U_GROUNDING_SOURCE_METADATA.source_document_version,
      source_title: SERVER_RACK_42U_GROUNDING_SOURCE_METADATA.source_title,
      exact_locator: SERVER_RACK_42U_GROUNDING_SOURCE_METADATA.exact_locator,
      source_definition_hash: SERVER_RACK_42U_GROUNDING_SOURCE_METADATA.definition_hash,
      sourceRole: input.sourceRole,
    }],
    excludedUnownedAssumptions: [
      "historical one-set-per-rack, four-metre, four-lug, twenty-four-cage-nut or two-organizer rates",
      "automatic plinth, PDU or vertical-organizer quantities",
      "automatic retained spare, supplier package, labor, equipment, testing or logistics quantity",
      "UPS, battery system, server-room cooling, fire suppression or access control",
      "full server room",
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

export const SERVER_RACK_42U_GROUNDING_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  resource({ rowId: "rc09:server_rack_42u_install_ground", ordinal: 0,
    section: "Работы", category: "construction_work", titleRu: "Монтаж, анкеровка и заземление серверного шкафа 42U",
    unitId: "pcs", formulaId: "server_rack_42u_install_ground_count_v1",
    sourceRole: "USER_SUPPLIED_OR_APPROVED_RACK_SCOPE", procurementEligible: false,
    costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:server_rack_42u_600x1200", ordinal: 1,
    section: "Оборудование", category: "equipment", titleRu: "Шкаф серверный 42U глубиной 1200 мм по спецификации",
    unitId: "pcs", formulaId: "server_rack_42u_product_order_v2",
    titleParameterIds: ["rack_width_designation", "rack_designation"],
    sourceRole: "APPROVED_RACK_SCHEDULE", procurementEligible: true }),
  resource({ rowId: "rc09:server_rack_anchor_set", ordinal: 2,
    section: "Материалы", category: "material", titleRu: "Комплект анкеров для крепления серверного шкафа к основанию",
    unitId: "set", formulaId: "server_rack_anchor_set_quantity_v1", titleParameterIds: ["anchor_set_designation"],
    sourceRole: "APPROVED_RACK_FIXING_DETAIL", procurementEligible: true }),
  resource({ rowId: "rc09:server_rack_bonding_kit", ordinal: 3,
    section: "Материалы", category: "material", titleRu: "Комплект заземления дверей и съёмных панелей шкафа",
    unitId: "set", formulaId: "server_rack_bonding_kit_quantity_v1", titleParameterIds: ["bonding_kit_designation"],
    sourceRole: "APPROVED_RACK_BONDING_DETAIL", procurementEligible: true }),
  resource({ rowId: "rc09:copper_pe_conductor_16mm2", ordinal: 4,
    section: "Материалы", category: "material", titleRu: "Проводник защитный медный гибкий по проектному сечению",
    unitId: "m", formulaId: "copper_pe_conductor_length_v1", titleParameterIds: ["pe_conductor_designation"],
    sourceRole: "APPROVED_RACK_GROUNDING_PLAN", procurementEligible: true }),
  resource({ rowId: "rc09:copper_lug_16mm2", ordinal: 5,
    section: "Материалы", category: "material", titleRu: "Наконечник кабельный медный лужёный по сечению PE-проводника",
    unitId: "pcs", formulaId: "copper_lug_quantity_v1", titleParameterIds: ["copper_lug_designation"],
    sourceRole: "APPROVED_RACK_GROUNDING_PLAN", procurementEligible: true }),
  resource({ rowId: "rc09:rack_cage_nut_bolt_m6", ordinal: 6,
    section: "Материалы", category: "material", titleRu: "Комплект клеточной гайки и винта для шкафа 19 дюймов",
    unitId: "set", formulaId: "rack_cage_nut_bolt_quantity_v1", titleParameterIds: ["cage_nut_bolt_designation"],
    sourceRole: "APPROVED_RACK_EQUIPMENT_LAYOUT", procurementEligible: true }),
  resource({ rowId: "rc09:rack_cable_organizer", ordinal: 7,
    section: "Оборудование", category: "equipment", titleRu: "Органайзер кабельный горизонтальный для шкафа 19 дюймов",
    unitId: "pcs", formulaId: "rack_horizontal_cable_organizer_quantity_v1", titleParameterIds: ["horizontal_cable_organizer_designation"],
    sourceRole: "APPROVED_RACK_EQUIPMENT_LAYOUT", procurementEligible: true }),
  resource({ rowId: "rc09:rack_ground_continuity_test", ordinal: 8,
    section: "Контроль", category: "service", titleRu: "Измерение непрерывности защитного соединения серверного шкафа",
    unitId: "test", formulaId: "rack_ground_continuity_test_count_v1",
    sourceRole: "USER_SUPPLIED_RACK_COUNT_AND_APPROVED_QA_PROGRAM", procurementEligible: false,
    costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:rack_plinth", ordinal: 9,
    section: "Условное оборудование", category: "equipment", titleRu: "Цоколь серверного шкафа",
    unitId: "pcs", formulaId: "rack_plinth_quantity_v1", inclusionAst: equals("rack_plinth_mode", "REQUIRED"),
    titleParameterIds: ["rack_plinth_designation"], sourceRole: "APPROVED_RACK_SCHEDULE", procurementEligible: true }),
  resource({ rowId: "rc09:rack_pdu", ordinal: 10,
    section: "Условное оборудование", category: "equipment", titleRu: "Блок распределения питания PDU серверного шкафа",
    unitId: "pcs", formulaId: "rack_pdu_quantity_v1", inclusionAst: equals("rack_pdu_mode", "REQUIRED"),
    titleParameterIds: ["rack_pdu_designation"], sourceRole: "APPROVED_ELECTRICAL_RACK_SCHEDULE", procurementEligible: true }),
  resource({ rowId: "rc09:vertical_cable_organizer", ordinal: 11,
    section: "Условное оборудование", category: "equipment", titleRu: "Органайзер кабельный вертикальный серверного шкафа",
    unitId: "pcs", formulaId: "vertical_cable_organizer_quantity_v1", inclusionAst: equals("vertical_cable_organizer_mode", "REQUIRED"),
    titleParameterIds: ["vertical_cable_organizer_designation"], sourceRole: "APPROVED_RACK_EQUIPMENT_LAYOUT", procurementEligible: true }),
  resource({ rowId: "rc09:server-rack-balance:installed-net", ordinal: 12,
    section: "Баланс серверных шкафов", category: "equipment", titleRu: "Количество устанавливаемых серверных шкафов",
    unitId: "pcs", formulaId: "server_rack_installed_net_v2", procurementEligible: false,
    sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:server-rack-balance:retained-spare", ordinal: 13,
    section: "Баланс серверных шкафов", category: "equipment", titleRu: "Сохраняемый резерв серверных шкафов",
    unitId: "pcs", formulaId: "server_rack_retained_spare_v2", procurementEligible: false,
    sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:server-rack-balance:total-need", ordinal: 14,
    section: "Баланс серверных шкафов", category: "equipment", titleRu: "Общая потребность в серверных шкафах",
    unitId: "pcs", formulaId: "server_rack_total_need_v2", procurementEligible: false,
    sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:server-rack-balance:package-count", ordinal: 15,
    section: "Баланс серверных шкафов", category: "equipment", titleRu: "Количество поставочных упаковок серверных шкафов",
    unitId: "package", formulaId: "server_rack_package_count_v2", procurementEligible: false,
    sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:server-rack-balance:remainder", ordinal: 16,
    section: "Баланс серверных шкафов", category: "equipment", titleRu: "Остаток серверных шкафов после монтажа",
    unitId: "pcs", formulaId: "server_rack_remainder_v2", procurementEligible: false,
    sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:server-rack-balance:surplus-beyond-spare", ordinal: 17,
    section: "Баланс серверных шкафов", category: "equipment", titleRu: "Свободный остаток шкафов сверх сохраняемого резерва",
    unitId: "pcs", formulaId: "server_rack_surplus_v2", procurementEligible: false,
    sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:rack_ground_continuity_report", ordinal: 18,
    section: "Контроль", category: "service", titleRu: "Акт измерения непрерывности защитных соединений шкафов",
    unitId: "document", formulaId: "ground_continuity_report_quantity_v2", procurementEligible: false,
    titleParameterIds: ["ground_continuity_report_designation"], sourceRole: "APPROVED_QA_PROGRAM",
    costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:labor:rack-installation-grounding", ordinal: 19,
    section: "Труд", category: "construction_work", titleRu: "Труд монтажников и электромонтажников: установка, крепление и заземление шкафов",
    unitId: "man_hour", formulaId: "rack_installation_labor_v2", procurementEligible: false,
    sourceRole: "APPROVED_INSTALLATION_METHOD" }),
  resource({ rowId: "rc09:labor:rack-grounding-test", ordinal: 20,
    section: "Труд", category: "construction_work", titleRu: "Труд электролаборатории: проверка защитных соединений",
    unitId: "man_hour", formulaId: "rack_testing_labor_v2", procurementEligible: false,
    sourceRole: "APPROVED_QA_PROGRAM" }),
  resource({ rowId: "rc09:equipment:rack-handling", ordinal: 21,
    section: "Механизмы и инструмент", category: "equipment", titleRu: "Механизм перемещения и позиционирования серверных шкафов",
    unitId: "machine_hour", formulaId: "rack_handling_machine_v2", procurementEligible: true,
    sourceRole: "APPROVED_INSTALLATION_METHOD" }),
  resource({ rowId: "rc09:equipment:rack-torque-tool", ordinal: 22,
    section: "Механизмы и инструмент", category: "equipment", titleRu: "Тарированный инструмент затяжки анкеров и заземляющих соединений",
    unitId: "machine_hour", formulaId: "rack_torque_tool_machine_v2", procurementEligible: true,
    sourceRole: "APPROVED_INSTALLATION_METHOD" }),
  resource({ rowId: "rc09:equipment:ground-continuity-tester", ordinal: 23,
    section: "Механизмы и инструмент", category: "equipment", titleRu: "Измеритель непрерывности защитных соединений",
    unitId: "machine_hour", formulaId: "ground_continuity_tester_machine_v2", procurementEligible: true,
    sourceRole: "APPROVED_QA_PROGRAM" }),
  resource({ rowId: "rc09:logistics:rack-delivery", ordinal: 24,
    section: "Логистика", category: "service", titleRu: "Доставка серверных шкафов, комплектующих и инструмента",
    unitId: "trip", formulaId: "rack_delivery_v2", procurementEligible: true,
    sourceRole: "APPROVED_LOGISTICS_PLAN" }),
  resource({ rowId: "rc09:logistics:rack-packaging-removal", ordinal: 25,
    section: "Логистика", category: "service", titleRu: "Сбор и вывоз упаковки серверных шкафов",
    unitId: "trip", formulaId: "rack_packaging_removal_v2", procurementEligible: true,
    sourceRole: "APPROVED_WASTE_PLAN" }),
]);

export const SERVER_RACK_42U_GROUNDING_SHORT_INPUT = Object.freeze({
  rack_count: 6,
  rack_height_u: 42,
  rack_depth_mm: 1200,
  rack_width_designation: "600 мм",
  rack_designation: "RACK-42U-600X1200",
  ...SERVER_RACK_42U_GROUNDING_RUNTIME_INPUT,
});

export const SERVER_RACK_42U_GROUNDING_ACCEPTANCE_INPUT = Object.freeze({
  ...SERVER_RACK_42U_GROUNDING_SHORT_INPUT,
  anchor_set_designation: "Комплект анкеров по узлу крепления и паспорту шкафа", anchor_set_quantity: 6,
  bonding_kit_designation: "Комплект перемычек дверей и съёмных панелей", bonding_kit_quantity: 6,
  pe_conductor_designation: "Проводник медный гибкий 16 мм² по плану заземления", pe_conductor_length_m: 27,
  copper_lug_designation: "Наконечник медный лужёный 16 мм² по кабельному журналу", copper_lug_quantity: 30,
  cage_nut_bolt_designation: "Комплект клеточной гайки и винта М6 по раскладке оборудования", cage_nut_bolt_quantity: 132,
  horizontal_cable_organizer_designation: "Органайзер горизонтальный 19 дюймов 1U по спецификации", horizontal_cable_organizer_quantity: 18,
  ground_continuity_report_designation: "Акт измерения непрерывности защитных соединений шкафов",
  ground_continuity_report_quantity_document: 1,
  rack_installation_labor_h: 72,
  rack_testing_labor_h: 12,
  rack_handling_machine_h: 10,
  rack_torque_tool_machine_h: 8,
  ground_continuity_tester_machine_h: 6,
  rack_delivery_trip_count: 1,
  rack_packaging_removal_trip_count: 1,
  rack_plinth_mode: "NOT_REQUIRED",
  rack_pdu_mode: "NOT_REQUIRED",
  vertical_cable_organizer_mode: "NOT_REQUIRED",
});

export async function compileServerRack42uGroundingR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? SERVER_RACK_42U_GROUNDING_CATALOG_ID;
  if (catalogId !== SERVER_RACK_42U_GROUNDING_CATALOG_ID) {
    throw new Error(`SERVER_RACK_42U_GROUNDING_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.server-rack-42u-grounding-r1",
    catalogId,
    primaryMeasureParameterId: "rack_count",
    parameterDefinitions: [...SERVER_RACK_42U_GROUNDING_PARAMETERS],
    formulaDefinitions: [...SERVER_RACK_42U_GROUNDING_FORMULAS],
    resourceDefinitions: [...SERVER_RACK_42U_GROUNDING_RESOURCES],
    submittedParameters,
    confirmedParameters: { ...SERVER_RACK_42U_GROUNDING_RUNTIME_INPUT },
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 40,
    hashJson: async (value) => JSON.stringify(value),
  });
}
