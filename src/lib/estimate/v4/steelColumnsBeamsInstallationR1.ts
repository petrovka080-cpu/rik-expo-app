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

export const STEEL_COLUMNS_BEAMS_INSTALLATION_CATALOG_ID =
  "canonical-work:expanded:steel_frame_building";
export const STEEL_COLUMNS_BEAMS_INSTALLATION_SOURCE_ID =
  "project_steel_columns_beams_erection_package_v1";
export const STEEL_COLUMNS_BEAMS_INSTALLATION_NORM_ID =
  "norm:project:steel_columns_beams:erection_package:v1";

export const STEEL_COLUMNS_BEAMS_INSTALLATION_SOURCE_METADATA = Object.freeze({
  source_title: "Утверждённый комплект КМ/КМД, ведомость элементов и ППР монтажа стального каркаса",
  source_authority: "Проектная организация, изготовитель металлоконструкций и утверждающий инженер проекта",
  source_document_version: "PROJECT_DRAWING_SCHEDULE_AND_METHOD_STATEMENT_REVISION_EXPLICIT",
  definition_hash: "eh_project_steel_columns_beams_erection_package_r1",
  exact_locator: "Колонны и балки по маркам, монтажные соединения, сварка, восстановление покрытия, подъём, геодезия и НК",
  use_restriction: "Известная масса определяет только объём монтажа и массу изготовленных элементов; остальные количества берутся из КМ/КМД, ведомостей, ППР и планов контроля",
});

const CONDITIONAL_DETAILS = new Set([
  "column_base_grout_designation",
  "column_base_grout_mass_kg",
  "structural_fireproofing_designation",
  "structural_fireproofing_area_m2",
]);

const PARAMETER_SPECS = Object.freeze([
  ["element_count_piece", "Количество стальных колонн и балок", "decimal", "piece", null],
  ["total_installed_mass_t", "Общая масса монтируемых колонн и балок", "decimal", "t", null],
  ["fabricated_element_schedule_designation", "Марки колонн и балок из стали С345 по ведомости", "text", null, null],
  ["structural_bolt_designation", "Болтокомплект М24 класса 10.9 по ведомости соединений", "text", null, null],
  ["structural_bolt_quantity_piece", "Количество болтокомплектов М24 класса 10.9", "decimal", "piece", null],
  ["welding_wire_designation", "Сварочная проволока Св-08Г2С по технологии сварки", "text", null, null],
  ["welding_wire_mass_kg", "Масса сварочной проволоки Св-08Г2С", "decimal", "kg", null],
  ["repair_primer_designation", "Цинкнаполненный эпоксидный грунт для ремонта покрытия", "text", null, null],
  ["repair_primer_mass_kg", "Масса грунта для ремонта покрытия", "decimal", "kg", null],
  ["mobile_crane_designation", "Мобильный кран по ППР монтажа", "text", null, null],
  ["mobile_crane_shift", "Количество смен мобильного крана", "decimal", "shift", null],
  ["survey_control_program_designation", "Программа геодезической выверки каркаса", "text", null, null],
  ["survey_control_count_test", "Количество этапов геодезической выверки", "decimal", "test", null],
  ["weld_ndt_program_designation", "Программа неразрушающего контроля монтажных швов", "text", null, null],
  ["weld_ndt_count_test", "Количество испытаний НК монтажных швов", "decimal", "test", null],
  ["column_base_grout_mode", "Подливка под базы колонн в границе пакета", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["column_base_grout_designation", "Безусадочный состав для подливки баз колонн", "text", null, null],
  ["column_base_grout_mass_kg", "Масса безусадочного состава", "decimal", "kg", null],
  ["structural_fireproofing_mode", "Огнезащита стального каркаса в границе пакета", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["structural_fireproofing_designation", "Система огнезащиты стального каркаса", "text", null, null],
  ["structural_fireproofing_area_m2", "Площадь огнезащиты стального каркаса", "decimal", "m2", null],
] as const);

function conditionalConstraints(parameterId: string): Json {
  if (parameterId.startsWith("column_base_grout_") && parameterId !== "column_base_grout_mode") {
    return {
      requiredWhen: { kind: "equals", parameterId: "column_base_grout_mode", value: "REQUIRED" },
      forbiddenWhen: { kind: "equals", parameterId: "column_base_grout_mode", value: "NOT_REQUIRED" },
    };
  }
  if (parameterId.startsWith("structural_fireproofing_")
    && parameterId !== "structural_fireproofing_mode") {
    return {
      requiredWhen: { kind: "equals", parameterId: "structural_fireproofing_mode", value: "REQUIRED" },
      forbiddenWhen: { kind: "equals", parameterId: "structural_fireproofing_mode", value: "NOT_REQUIRED" },
    };
  }
  return {};
}

export type SteelColumnsBeamsInstallationParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number;
  unit_id: string | null;
  title_ru: string;
  truth_metadata: Json;
};

export const STEEL_COLUMNS_BEAMS_INSTALLATION_PARAMETERS:
readonly SteelColumnsBeamsInstallationParameter[] = Object.freeze(PARAMETER_SPECS.map(
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
      contract: "rik-expo-app.steel-columns-beams-installation-r1",
      semantic_parameter_key: `steel-columns-beams-installation:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: ["element_count_piece", "total_installed_mass_t"].includes(parameterId)
        ? "USER_INPUT"
        : "PROJECT_SPECIFIC_INPUT",
      input_origin_class: ["element_count_piece", "total_installed_mass_t"].includes(parameterId)
        ? "KNOWN_WORK_SCOPE"
        : "APPROVED_DRAWING_SCHEDULE_METHOD_STATEMENT_OR_CONTROL_PLAN",
      preliminary_compilation_allowed: true,
      source_confirmation_required: !["element_count_piece", "total_installed_mass_t"].includes(parameterId),
      guide: {
        guide_kind: ["element_count_piece", "total_installed_mass_t"].includes(parameterId)
          ? "MEASUREMENT_RULE"
          : "PROJECT_DEFINED",
        guide_short_ru: ["element_count_piece", "total_installed_mass_t"].includes(parameterId)
          ? `${titleRu}: укажите по ведомости элементов или подтверждённому объёму работ.`
          : `${titleRu}: укажите из КМ/КМД, ведомости соединений, ППР или плана контроля.`,
        source_role: ["element_count_piece", "total_installed_mass_t"].includes(parameterId)
          ? "USER_MEASURED_OR_APPROVED_SCHEDULE"
          : "APPROVED_PROJECT_OR_METHOD_DOCUMENTATION",
        source_document: STEEL_COLUMNS_BEAMS_INSTALLATION_SOURCE_ID,
        source_locator: STEEL_COLUMNS_BEAMS_INSTALLATION_SOURCE_METADATA.exact_locator,
        guide_version: "steel-columns-beams-installation-r1",
        source_snapshot_hash: "683743a9505220f481265610f7642306402f74b0364666692bf5d164f2245e77",
        applicability: "Только для монтажа и выверки стальных колонн и балок по утверждённому проектному пакету.",
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

export const STEEL_COLUMNS_BEAMS_INSTALLATION_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  formula("steel_columns_beams_install_mass_v1", "t", "total_installed_mass_t"),
  formula("fabricated_steel_columns_beams_mass_v1", "t", "total_installed_mass_t"),
  formula("structural_bolt_quantity_v1", "piece", "structural_bolt_quantity_piece"),
  formula("welding_wire_mass_v1", "kg", "welding_wire_mass_kg"),
  formula("repair_primer_mass_v1", "kg", "repair_primer_mass_kg"),
  formula("steel_frame_mobile_crane_shift_v1", "shift", "mobile_crane_shift"),
  formula("steel_frame_survey_control_count_v1", "test", "survey_control_count_test"),
  formula("steel_weld_ndt_count_v1", "test", "weld_ndt_count_test"),
  formula("column_base_grout_mass_v1", "kg", "column_base_grout_mass_kg"),
  formula("structural_fireproofing_area_v1", "m2", "structural_fireproofing_area_m2"),
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
    semanticOwnerId: `steel-columns-beams-installation:${input.rowId}`,
    costOwner: "resource",
    ...(input.titleParameterIds ? {
      titleSpecificationParameterIds: input.titleParameterIds,
      titleSpecificationMode: "APPEND",
      titleSpecificationSeparator: " ",
    } : {}),
    scopeContextParameterIds: ["element_count_piece", "total_installed_mass_t"],
  };
  const sourceMetadata = {
    truth_contract_version: "R3",
    synthetic: false,
    sourceRole: input.sourceRole,
    normativeTrace: [{
      sourceId: STEEL_COLUMNS_BEAMS_INSTALLATION_SOURCE_ID,
      source_id: STEEL_COLUMNS_BEAMS_INSTALLATION_SOURCE_ID,
      normId: STEEL_COLUMNS_BEAMS_INSTALLATION_NORM_ID,
      norm_id: STEEL_COLUMNS_BEAMS_INSTALLATION_NORM_ID,
      normVersion: STEEL_COLUMNS_BEAMS_INSTALLATION_SOURCE_METADATA.source_document_version,
      source_title: STEEL_COLUMNS_BEAMS_INSTALLATION_SOURCE_METADATA.source_title,
      exact_locator: STEEL_COLUMNS_BEAMS_INSTALLATION_SOURCE_METADATA.exact_locator,
      source_definition_hash: STEEL_COLUMNS_BEAMS_INSTALLATION_SOURCE_METADATA.definition_hash,
      sourceRole: input.sourceRole,
    }],
    excludedUnownedAssumptions: [
      "automatic tonnes per element",
      "automatic bolts per element",
      "automatic welding-wire or repair-primer consumption",
      "automatic crane productivity",
      "automatic survey or NDT sampling rate",
      "foundation concrete or roofing scope",
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

export const STEEL_COLUMNS_BEAMS_INSTALLATION_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  resource({ rowId: "rc09:steel_columns_beams_install", ordinal: 0, section: "Работы", category: "construction_work", titleRu: "Монтаж и выверка стальных колонн и балок", unitId: "t", formulaId: "steel_columns_beams_install_mass_v1", procurementEligible: false, sourceRole: "USER_MEASURED_OR_APPROVED_SCHEDULE" }),
  resource({ rowId: "rc09:fabricated_steel_columns_beams_c345", ordinal: 1, section: "Материалы", category: "material", titleRu: "Колонны и балки стальные изготовленные, сталь С345", unitId: "t", formulaId: "fabricated_steel_columns_beams_mass_v1", procurementEligible: true, titleParameterIds: ["fabricated_element_schedule_designation"], sourceRole: "APPROVED_KM_KMD_ELEMENT_SCHEDULE" }),
  resource({ rowId: "rc09:structural_bolt_m24_class_10_9", ordinal: 2, section: "Материалы", category: "material", titleRu: "Болтокомплект высокопрочный М24 класса 10.9", unitId: "piece", formulaId: "structural_bolt_quantity_v1", procurementEligible: true, titleParameterIds: ["structural_bolt_designation"], sourceRole: "APPROVED_CONNECTION_SCHEDULE" }),
  resource({ rowId: "rc09:welding_wire_sv08g2s", ordinal: 3, section: "Материалы", category: "material", titleRu: "Проволока сварочная Св-08Г2С", unitId: "kg", formulaId: "welding_wire_mass_v1", procurementEligible: true, titleParameterIds: ["welding_wire_designation"], sourceRole: "APPROVED_WELDING_PROCEDURE" }),
  resource({ rowId: "rc09:repair_primer_epoxy_zinc", ordinal: 4, section: "Материалы", category: "material", titleRu: "Грунт эпоксидный цинкнаполненный для ремонта покрытия", unitId: "kg", formulaId: "repair_primer_mass_v1", procurementEligible: true, titleParameterIds: ["repair_primer_designation"], sourceRole: "APPROVED_COATING_REPAIR_PROCEDURE" }),
  resource({ rowId: "rc09:steel_frame_mobile_crane", ordinal: 5, section: "Оборудование", category: "equipment", titleRu: "Кран мобильный для монтажа стального каркаса", unitId: "shift", formulaId: "steel_frame_mobile_crane_shift_v1", procurementEligible: true, titleParameterIds: ["mobile_crane_designation"], sourceRole: "APPROVED_METHOD_STATEMENT" }),
  resource({ rowId: "rc09:steel_frame_survey_control", ordinal: 6, section: "Контроль и услуги", category: "service", titleRu: "Геодезическая выверка стальных колонн и балок", unitId: "test", formulaId: "steel_frame_survey_control_count_v1", procurementEligible: false, titleParameterIds: ["survey_control_program_designation"], sourceRole: "APPROVED_SURVEY_CONTROL_PLAN" }),
  resource({ rowId: "rc09:steel_weld_ndt", ordinal: 7, section: "Контроль и услуги", category: "service", titleRu: "Неразрушающий контроль монтажных сварных соединений", unitId: "test", formulaId: "steel_weld_ndt_count_v1", procurementEligible: false, titleParameterIds: ["weld_ndt_program_designation"], sourceRole: "APPROVED_WELD_INSPECTION_PLAN" }),
  resource({ rowId: "rc09:non_shrink_column_base_grout", ordinal: 8, section: "Условные материалы", category: "material", titleRu: "Состав безусадочный для подливки под базы колонн", unitId: "kg", formulaId: "column_base_grout_mass_v1", inclusionAst: equals("column_base_grout_mode", "REQUIRED"), procurementEligible: true, titleParameterIds: ["column_base_grout_designation"], sourceRole: "APPROVED_COLUMN_BASE_DETAIL" }),
  resource({ rowId: "rc09:structural_fireproofing", ordinal: 9, section: "Условные работы и материалы", category: "construction_work", titleRu: "Огнезащита стальных колонн и балок", unitId: "m2", formulaId: "structural_fireproofing_area_v1", inclusionAst: equals("structural_fireproofing_mode", "REQUIRED"), procurementEligible: true, titleParameterIds: ["structural_fireproofing_designation"], sourceRole: "APPROVED_FIREPROOFING_SCHEDULE" }),
]);

export const STEEL_COLUMNS_BEAMS_INSTALLATION_SHORT_INPUT = Object.freeze({
  element_count_piece: 30,
  total_installed_mass_t: 30,
});

export const STEEL_COLUMNS_BEAMS_INSTALLATION_ACCEPTANCE_INPUT = Object.freeze({
  element_count_piece: 30,
  total_installed_mass_t: 30,
  fabricated_element_schedule_designation: "Колонны и балки С345 по утверждённой ведомости марок КМД",
  structural_bolt_designation: "Болтокомплект М24 класса 10.9 по ведомости монтажных соединений",
  structural_bolt_quantity_piece: 1260,
  welding_wire_designation: "Проволока Св-08Г2С по утверждённой технологии сварки",
  welding_wire_mass_kg: 72,
  repair_primer_designation: "Эпоксидный цинкнаполненный грунт по карте ремонта покрытия",
  repair_primer_mass_kg: 10.5,
  mobile_crane_designation: "Кран мобильный по утверждённому ППР монтажа",
  mobile_crane_shift: 2.4,
  survey_control_program_designation: "Программа геодезической выверки монтажных ярусов",
  survey_control_count_test: 3,
  weld_ndt_program_designation: "План НК монтажных сварных соединений",
  weld_ndt_count_test: 4,
  column_base_grout_mode: "NOT_REQUIRED",
  structural_fireproofing_mode: "NOT_REQUIRED",
});

export async function compileSteelColumnsBeamsInstallationR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? STEEL_COLUMNS_BEAMS_INSTALLATION_CATALOG_ID;
  if (catalogId !== STEEL_COLUMNS_BEAMS_INSTALLATION_CATALOG_ID) {
    throw new Error(`STEEL_COLUMNS_BEAMS_INSTALLATION_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.steel-columns-beams-installation-r1",
    catalogId,
    primaryMeasureParameterId: "total_installed_mass_t",
    parameterDefinitions: [...STEEL_COLUMNS_BEAMS_INSTALLATION_PARAMETERS],
    formulaDefinitions: [...STEEL_COLUMNS_BEAMS_INSTALLATION_FORMULAS],
    resourceDefinitions: [...STEEL_COLUMNS_BEAMS_INSTALLATION_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 12,
    hashJson: async (value) => JSON.stringify(value),
  });
}

export const STEEL_COLUMNS_BEAMS_INSTALLATION_SOURCE_SUMMARY = Object.freeze({
  sourceId: STEEL_COLUMNS_BEAMS_INSTALLATION_SOURCE_ID,
  normId: STEEL_COLUMNS_BEAMS_INSTALLATION_NORM_ID,
  formula: "known installed mass gives erection work and fabricated-steel mass; exact connections, consumables, equipment and controls come from approved project documents",
  automaticTonnesPerElementRejected: true,
  automaticBoltAndConsumableRatesRejected: true,
  automaticCraneAndControlRatesRejected: true,
  foundationAndRoofingScopeRejected: true,
});
