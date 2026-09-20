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

export const GALVANIZED_STEEL_DUCT_CATALOG_ID =
  "canonical-work:base:ventilation_interior_duct_install_standard";
export const GALVANIZED_STEEL_DUCT_SOURCE_ID = "project_galvanized_steel_duct_package_v1";
export const GALVANIZED_STEEL_DUCT_NORM_ID = "norm:project:galvanized_steel_duct:package:v1";

export const GALVANIZED_STEEL_DUCT_SOURCE_METADATA = Object.freeze({
  source_title: "Утверждённая спецификация и раскладка воздуховодов, узлы соединений и подвесов, ППР и ведомость механизмов",
  source_authority: "Проектная организация, изготовитель воздуховодов и утверждающий инженер проекта",
  source_document_version: "PROJECT_GALVANIZED_STEEL_DUCT_SCHEDULE_LAYOUT_METHOD_REVISION_EXPLICIT",
  definition_hash: "eh_project_galvanized_steel_duct_package_r1",
  exact_locator: "Длина трассы, толщина стали и класс герметичности; ведомость прямых секций и фасонных частей; раскладка фланцев, уплотнения, герметика, подвесов и траверс; ППР и ведомость подъёмных механизмов; изоляция, огнезащита и гибкие вставки по условным ветвям проекта",
  use_restriction: "Известная длина трассы определяет только объём монтажной работы. Площади секций и фасонных частей, длины уплотнительной ленты и шпилек, объём герметика, количество траверс, смены подъёмника и условные элементы берутся прямо из утверждённого проекта и ППР без переноса исторических погонных коэффициентов.",
});

const CONDITIONAL_DETAILS = new Set([
  "thermal_insulation_designation", "thermal_insulation_area_m2",
  "fireproofing_designation", "fireproofing_area_m2",
  "flexible_connector_designation", "flexible_connector_quantity_piece",
]);

const PARAMETER_SPECS = Object.freeze([
  ["length_m", "Длина монтируемой трассы воздуховода", "decimal", "m", null],
  ["steel_thickness_mm", "Толщина оцинкованной стали", "decimal", "mm", null],
  ["airtightness_class", "Класс герметичности воздуховода", "text", null, null],
  ["duct_section_designation", "Прямые секции прямоугольного воздуховода по спецификации", "text", null, null],
  ["duct_section_area_m2", "Площадь прямых секций воздуховода", "decimal", "m2", null],
  ["shaped_fittings_designation", "Фасонные части воздуховода по спецификации", "text", null, null],
  ["shaped_fittings_area_m2", "Площадь фасонных частей воздуховода", "decimal", "m2", null],
  ["sealing_tape_designation", "Уплотнительная лента фланцев по узлу соединения", "text", null, null],
  ["sealing_tape_length_m", "Длина уплотнительной ленты фланцев", "decimal", "m", null],
  ["sealant_designation", "Полимерный герметик класса B по спецификации", "text", null, null],
  ["sealant_volume_l", "Объём полимерного герметика", "decimal", "l", null],
  ["threaded_rod_designation", "Резьбовая шпилька подвесов по узлу", "text", null, null],
  ["threaded_rod_length_m", "Длина резьбовой шпильки подвесов", "decimal", "m", null],
  ["support_traverse_designation", "Траверса подвеса по узлу", "text", null, null],
  ["support_traverse_quantity_piece", "Количество траверс подвесов", "decimal", "pcs", null],
  ["scissor_lift_designation", "Ножничный подъёмник по ППР", "text", null, null],
  ["scissor_lift_shift", "Работа ножничного подъёмника", "decimal", "shift", null],
  ["thermal_insulation_mode", "Теплоизоляция воздуховода требуется по проекту", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["thermal_insulation_designation", "Теплоизоляция воздуховода по спецификации", "text", null, null],
  ["thermal_insulation_area_m2", "Площадь теплоизоляции воздуховода", "decimal", "m2", null],
  ["fireproofing_mode", "Огнезащита воздуховода требуется по проекту", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["fireproofing_designation", "Огнезащитное покрытие воздуховода по проекту", "text", null, null],
  ["fireproofing_area_m2", "Площадь огнезащиты воздуховода", "decimal", "m2", null],
  ["flexible_connector_mode", "Гибкая вставка у оборудования требуется по проекту", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["flexible_connector_designation", "Гибкая вставка у оборудования по спецификации", "text", null, null],
  ["flexible_connector_quantity_piece", "Количество гибких вставок", "decimal", "pcs", null],
] as const);

const KNOWN_SCOPE = ["length_m", "steel_thickness_mm", "airtightness_class"];

function conditionalConstraints(parameterId: string): Json {
  const branch = parameterId.startsWith("thermal_insulation_")
    ? "thermal_insulation_mode"
    : parameterId.startsWith("fireproofing_")
      ? "fireproofing_mode"
      : parameterId.startsWith("flexible_connector_")
        ? "flexible_connector_mode"
        : null;
  if (!branch || parameterId === branch) return {};
  return {
    requiredWhen: { kind: "equals", parameterId: branch, value: "REQUIRED" },
    forbiddenWhen: { kind: "equals", parameterId: branch, value: "NOT_REQUIRED" },
  };
}

export type GalvanizedSteelDuctParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number;
  unit_id: string | null;
  title_ru: string;
  truth_metadata: Json;
};

export const GALVANIZED_STEEL_DUCT_PARAMETERS:
readonly GalvanizedSteelDuctParameter[] = Object.freeze(PARAMETER_SPECS.map(
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
      contract: "rik-expo-app.galvanized-steel-duct-r1",
      semantic_parameter_key: `galvanized-steel-duct:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: KNOWN_SCOPE.includes(parameterId)
        ? "USER_INPUT"
        : "PROJECT_SPECIFIC_INPUT",
      input_origin_class: KNOWN_SCOPE.includes(parameterId)
        ? "KNOWN_WORK_SCOPE"
        : "APPROVED_DUCT_SCHEDULE_LAYOUT_METHOD_DOCUMENTATION",
      preliminary_compilation_allowed: true,
      source_confirmation_required: !KNOWN_SCOPE.includes(parameterId),
      guide: {
        guide_kind: KNOWN_SCOPE.includes(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
        guide_short_ru: parameterId === "length_m"
          ? "Укажите подтверждённую длину монтируемой трассы по плану и аксонометрии."
          : KNOWN_SCOPE.includes(parameterId)
            ? `${titleRu}: укажите по заданию и принятому классу воздуховода.`
            : `${titleRu}: укажите по ведомости воздуховодов, раскладке узлов, ППР или ведомости механизмов.`,
        source_role: KNOWN_SCOPE.includes(parameterId)
          ? "USER_SUPPLIED_OR_APPROVED_DUCT_SCOPE"
          : "APPROVED_PROJECT_DUCT_SCHEDULE_LAYOUT_OR_METHOD_DOCUMENTATION",
        source_document: GALVANIZED_STEEL_DUCT_SOURCE_ID,
        source_locator: GALVANIZED_STEEL_DUCT_SOURCE_METADATA.exact_locator,
        guide_version: "galvanized-steel-duct-r1",
        source_snapshot_hash: "4fec1d1b89cf5ee2ae00dfcadbb0d6d876fc1dea69b0151688e777851744ba7c",
        applicability: "Только для монтажа указанной трассы воздуховода из оцинкованной стали 0,7 мм класса герметичности B; вентиляционные установки, вентиляторы, воздухораспределители и полная система вентиляции не включаются.",
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

export const GALVANIZED_STEEL_DUCT_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  formula("galvanized_duct_install_length_v1", "m", "length_m"),
  formula("rectangular_galvanized_duct_area_v1", "m2", "duct_section_area_m2"),
  formula("duct_shaped_fittings_area_v1", "m2", "shaped_fittings_area_m2"),
  formula("duct_flange_sealing_tape_length_v1", "m", "sealing_tape_length_m"),
  formula("duct_polymer_sealant_volume_v1", "l", "sealant_volume_l"),
  formula("duct_hanger_threaded_rod_length_v1", "m", "threaded_rod_length_m"),
  formula("duct_support_traverse_quantity_v1", "pcs", "support_traverse_quantity_piece"),
  formula("duct_scissor_lift_shift_v1", "shift", "scissor_lift_shift"),
  formula("duct_thermal_insulation_area_v1", "m2", "thermal_insulation_area_m2"),
  formula("duct_fireproofing_area_v1", "m2", "fireproofing_area_m2"),
  formula("equipment_flexible_connector_quantity_v1", "pcs", "flexible_connector_quantity_piece"),
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
    semanticOwnerId: `galvanized-steel-duct:${input.rowId}`,
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
      sourceId: GALVANIZED_STEEL_DUCT_SOURCE_ID,
      source_id: GALVANIZED_STEEL_DUCT_SOURCE_ID,
      normId: GALVANIZED_STEEL_DUCT_NORM_ID,
      norm_id: GALVANIZED_STEEL_DUCT_NORM_ID,
      normVersion: GALVANIZED_STEEL_DUCT_SOURCE_METADATA.source_document_version,
      source_title: GALVANIZED_STEEL_DUCT_SOURCE_METADATA.source_title,
      exact_locator: GALVANIZED_STEEL_DUCT_SOURCE_METADATA.exact_locator,
      source_definition_hash: GALVANIZED_STEEL_DUCT_SOURCE_METADATA.definition_hash,
      sourceRole: input.sourceRole,
    }],
    excludedUnownedAssumptions: [
      "historical duct area per route metre",
      "historical fittings, tape, sealant, hanger or traverse rate",
      "historical scissor-lift productivity",
      "automatic insulation, fireproofing or flexible connector",
      "air-handling unit, fan, air terminal or full ventilation system",
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

export const GALVANIZED_STEEL_DUCT_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  resource({ rowId: "rc09:galvanized_duct_install", ordinal: 0, section: "Работы", category: "construction_work", titleRu: "Сборка и монтаж воздуховода из оцинкованной стали 0,7 мм класса герметичности B", unitId: "m", formulaId: "galvanized_duct_install_length_v1", procurementEligible: false, sourceRole: "USER_SUPPLIED_OR_APPROVED_DUCT_SCOPE" }),
  resource({ rowId: "rc09:rectangular_galvanized_duct_0_7mm", ordinal: 1, section: "Материалы", category: "material", titleRu: "Воздуховод прямоугольный из оцинкованной стали 0,7 мм", unitId: "m2", formulaId: "rectangular_galvanized_duct_area_v1", procurementEligible: true, titleParameterIds: ["duct_section_designation"], sourceRole: "APPROVED_DUCT_SCHEDULE" }),
  resource({ rowId: "rc09:duct_shaped_fittings_0_7mm", ordinal: 2, section: "Материалы", category: "material", titleRu: "Отводы, переходы и тройники из оцинкованной стали 0,7 мм", unitId: "m2", formulaId: "duct_shaped_fittings_area_v1", procurementEligible: true, titleParameterIds: ["shaped_fittings_designation"], sourceRole: "APPROVED_DUCT_SCHEDULE" }),
  resource({ rowId: "rc09:duct_flange_sealing_tape", ordinal: 3, section: "Материалы", category: "material", titleRu: "Лента уплотнительная для фланцев воздуховода", unitId: "m", formulaId: "duct_flange_sealing_tape_length_v1", procurementEligible: true, titleParameterIds: ["sealing_tape_designation"], sourceRole: "APPROVED_CONNECTION_DETAIL" }),
  resource({ rowId: "rc09:duct_polymer_sealant_class_b", ordinal: 4, section: "Материалы", category: "material", titleRu: "Герметик полимерный для воздуховодов класса герметичности B", unitId: "l", formulaId: "duct_polymer_sealant_volume_v1", procurementEligible: true, titleParameterIds: ["sealant_designation"], sourceRole: "APPROVED_CONNECTION_DETAIL" }),
  resource({ rowId: "rc09:duct_hanger_threaded_rod_m8", ordinal: 5, section: "Материалы", category: "material", titleRu: "Шпилька резьбовая М8 для подвески воздуховода", unitId: "m", formulaId: "duct_hanger_threaded_rod_length_v1", procurementEligible: true, titleParameterIds: ["threaded_rod_designation"], sourceRole: "APPROVED_SUPPORT_LAYOUT" }),
  resource({ rowId: "rc09:duct_support_traverse", ordinal: 6, section: "Материалы", category: "material", titleRu: "Траверса оцинкованная для подвески воздуховода", unitId: "pcs", formulaId: "duct_support_traverse_quantity_v1", procurementEligible: true, titleParameterIds: ["support_traverse_designation"], sourceRole: "APPROVED_SUPPORT_LAYOUT" }),
  resource({ rowId: "rc09:duct_scissor_lift", ordinal: 7, section: "Механизмы", category: "equipment", titleRu: "Работа ножничного подъёмника при монтаже воздуховода", unitId: "shift", formulaId: "duct_scissor_lift_shift_v1", procurementEligible: true, titleParameterIds: ["scissor_lift_designation"], sourceRole: "APPROVED_METHOD_STATEMENT" }),
  resource({ rowId: "rc09:duct_thermal_insulation", ordinal: 8, section: "Условные материалы", category: "material", titleRu: "Теплоизоляция воздуховода", unitId: "m2", formulaId: "duct_thermal_insulation_area_v1", inclusionAst: equals("thermal_insulation_mode", "REQUIRED"), procurementEligible: true, titleParameterIds: ["thermal_insulation_designation"], sourceRole: "APPROVED_DUCT_SCHEDULE" }),
  resource({ rowId: "rc09:duct_fireproofing", ordinal: 9, section: "Условные материалы", category: "material", titleRu: "Огнезащитное покрытие воздуховода", unitId: "m2", formulaId: "duct_fireproofing_area_v1", inclusionAst: equals("fireproofing_mode", "REQUIRED"), procurementEligible: true, titleParameterIds: ["fireproofing_designation"], sourceRole: "APPROVED_FIRE_SAFETY_PROJECT" }),
  resource({ rowId: "rc09:equipment_flexible_connector", ordinal: 10, section: "Условные материалы", category: "material", titleRu: "Гибкая вставка между воздуховодом и оборудованием", unitId: "pcs", formulaId: "equipment_flexible_connector_quantity_v1", inclusionAst: equals("flexible_connector_mode", "REQUIRED"), procurementEligible: true, titleParameterIds: ["flexible_connector_designation"], sourceRole: "APPROVED_EQUIPMENT_CONNECTION_DETAIL" }),
]);

export const GALVANIZED_STEEL_DUCT_SHORT_INPUT = Object.freeze({
  length_m: 120,
  steel_thickness_mm: 0.7,
  airtightness_class: "B",
});

export const GALVANIZED_STEEL_DUCT_ACCEPTANCE_INPUT = Object.freeze({
  ...GALVANIZED_STEEL_DUCT_SHORT_INPUT,
  duct_section_designation: "Прямые прямоугольные секции 0,7 мм по ведомости воздуховодов",
  duct_section_area_m2: 264,
  shaped_fittings_designation: "Отводы, переходы и тройники 0,7 мм по ведомости",
  shaped_fittings_area_m2: 66,
  sealing_tape_designation: "Уплотнительная лента по узлу фланцевого соединения",
  sealing_tape_length_m: 192,
  sealant_designation: "Полимерный герметик класса B по спецификации",
  sealant_volume_l: 4.2,
  threaded_rod_designation: "Резьбовая шпилька М8 по раскладке подвесов",
  threaded_rod_length_m: 96,
  support_traverse_designation: "Оцинкованная траверса по раскладке подвесов",
  support_traverse_quantity_piece: 60,
  scissor_lift_designation: "Ножничный подъёмник по ППР",
  scissor_lift_shift: 1.8,
  thermal_insulation_mode: "NOT_REQUIRED",
  fireproofing_mode: "NOT_REQUIRED",
  flexible_connector_mode: "NOT_REQUIRED",
});

export async function compileGalvanizedSteelDuctR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? GALVANIZED_STEEL_DUCT_CATALOG_ID;
  if (catalogId !== GALVANIZED_STEEL_DUCT_CATALOG_ID) {
    throw new Error(`GALVANIZED_STEEL_DUCT_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.galvanized-steel-duct-r1",
    catalogId,
    primaryMeasureParameterId: "length_m",
    parameterDefinitions: [...GALVANIZED_STEEL_DUCT_PARAMETERS],
    formulaDefinitions: [...GALVANIZED_STEEL_DUCT_FORMULAS],
    resourceDefinitions: [...GALVANIZED_STEEL_DUCT_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 15,
    hashJson: async (value) => JSON.stringify(value),
  });
}

export const GALVANIZED_STEEL_DUCT_SOURCE_SUMMARY = Object.freeze({
  sourceId: GALVANIZED_STEEL_DUCT_SOURCE_ID,
  normId: GALVANIZED_STEEL_DUCT_NORM_ID,
  formula: "known route length, steel thickness and airtightness class give installation work only; exact sections, fittings, connection, support, equipment and conditional quantities come from the approved project package",
});
