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

export const CEMENT_SAND_SCREED_DEMOLITION_CATALOG_ID =
  "canonical-work:base:demolition_interior_screed_remove_standard";
export const CEMENT_SAND_SCREED_DEMOLITION_SOURCE_ID =
  "project_cement_sand_screed_demolition_package_v1";
export const CEMENT_SAND_SCREED_DEMOLITION_NORM_ID =
  "norm:project:cement_sand_screed_demolition:package:v1";

export const CEMENT_SAND_SCREED_DEMOLITION_SOURCE_METADATA = Object.freeze({
  source_title: "Утверждённое обследование существующей стяжки, ППР демонтажа, план пылезащиты и ведомость обращения с отходами",
  source_authority: "Проектная организация, подрядчик демонтажных работ и утверждающий инженер проекта",
  source_document_version: "PROJECT_EXISTING_SCREED_SURVEY_DEMOLITION_METHOD_DUST_AND_WASTE_PLAN_REVISION_EXPLICIT",
  definition_hash: "eh_project_cement_sand_screed_demolition_package_r1",
  exact_locator: "Площадь и толщина существующей цементно-песчаной стяжки; пылезащита, тара, резка, пылеудаление, отбойное оборудование, масса и маршрут отходов, условное пылеподавление водой",
  use_restriction: "Известные площадь и толщина определяют объём работы; количества защиты, тары, дисков, фильтров, машино-часов, массу отходов и воду берут из обследования, ППР, плана пылезащиты и ведомости обращения с отходами",
});

const CONDITIONAL_DETAILS = new Set([
  "dust_suppression_water_volume_l",
]);

const PARAMETER_SPECS = Object.freeze([
  ["area_m2", "Площадь демонтируемой цементно-песчаной стяжки", "decimal", "m2", null],
  ["existing_screed_thickness_mm", "Толщина существующей цементно-песчаной стяжки", "decimal", "mm", null],
  ["dust_protection_film_designation", "Защитная плёнка для пылезащитного ограждения", "text", null, null],
  ["dust_protection_film_area_m2", "Площадь защитной плёнки", "decimal", "m2", null],
  ["waste_bag_designation", "Усиленный мешок для строительных отходов", "text", null, null],
  ["waste_bag_quantity_piece", "Количество усиленных мешков", "decimal", "piece", null],
  ["diamond_cutting_disc_designation", "Алмазный диск для резки существующей стяжки", "text", null, null],
  ["diamond_cutting_disc_quantity_piece", "Количество алмазных дисков", "decimal", "piece", null],
  ["vacuum_filter_bag_designation", "Фильтр-мешок промышленного пылесоса", "text", null, null],
  ["vacuum_filter_bag_quantity_piece", "Количество фильтр-мешков", "decimal", "piece", null],
  ["electric_breaker_designation", "Электрический отбойный молоток по ППР", "text", null, null],
  ["electric_breaker_machine_h", "Машино-часы электрического отбойного молотка", "decimal", "machine_hour", null],
  ["industrial_vacuum_designation", "Промышленный пылесос по плану пылеудаления", "text", null, null],
  ["industrial_vacuum_machine_h", "Машино-часы промышленного пылесоса", "decimal", "machine_hour", null],
  ["waste_handling_route", "Маршрут погрузки и передачи отходов", "text", null, null],
  ["screed_waste_mass_t", "Масса отходов демонтированной стяжки", "decimal", "t", null],
  ["dust_suppression_mode", "Пылеподавление водой разрешено и требуется по ППР", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["dust_suppression_water_volume_l", "Объём воды для пылеподавления", "decimal", "l", null],
] as const);

function conditionalConstraints(parameterId: string): Json {
  if (parameterId === "dust_suppression_water_volume_l") {
    return {
      requiredWhen: { kind: "equals", parameterId: "dust_suppression_mode", value: "REQUIRED" },
      forbiddenWhen: { kind: "equals", parameterId: "dust_suppression_mode", value: "NOT_REQUIRED" },
    };
  }
  return {};
}

export type CementSandScreedDemolitionParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number;
  unit_id: string | null;
  title_ru: string;
  truth_metadata: Json;
};

export const CEMENT_SAND_SCREED_DEMOLITION_PARAMETERS:
readonly CementSandScreedDemolitionParameter[] = Object.freeze(PARAMETER_SPECS.map(
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
      contract: "rik-expo-app.cement-sand-screed-demolition-r1",
      semantic_parameter_key: `cement-sand-screed-demolition:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: ["area_m2", "existing_screed_thickness_mm"].includes(parameterId)
        ? "USER_INPUT"
        : "PROJECT_SPECIFIC_INPUT",
      input_origin_class: ["area_m2", "existing_screed_thickness_mm"].includes(parameterId)
        ? "KNOWN_WORK_SCOPE"
        : "APPROVED_EXISTING_CONDITION_SURVEY_DEMOLITION_METHOD_DUST_PROTECTION_OR_WASTE_PLAN",
      preliminary_compilation_allowed: true,
      source_confirmation_required: !["area_m2", "existing_screed_thickness_mm"].includes(parameterId),
      guide: {
        guide_kind: ["area_m2", "existing_screed_thickness_mm"].includes(parameterId)
          ? "MEASUREMENT_RULE"
          : "PROJECT_DEFINED",
        guide_short_ru: parameterId === "area_m2"
          ? `${titleRu}: укажите чистую площадь демонтируемой стяжки по обмеру или проекту.`
          : parameterId === "existing_screed_thickness_mm"
            ? `${titleRu}: укажите по вскрытию, обследованию или исполнительной документации.`
            : `${titleRu}: укажите по обследованию, ППР, плану пылезащиты, ведомости оборудования или документам обращения с отходами.`,
        source_role: ["area_m2", "existing_screed_thickness_mm"].includes(parameterId)
          ? "USER_MEASURED_OR_APPROVED_DRAWING"
          : "APPROVED_PROJECT_PRODUCT_OR_METHOD_DOCUMENTATION",
        source_document: CEMENT_SAND_SCREED_DEMOLITION_SOURCE_ID,
        source_locator: CEMENT_SAND_SCREED_DEMOLITION_SOURCE_METADATA.exact_locator,
        guide_version: "cement-sand-screed-demolition-r1",
        source_snapshot_hash: "ea0968e14f00128dbcaa946aa550ad15789c4ce6a3430ef710e069b7c8aa4da8",
        applicability: "Только для демонтажа существующей цементно-песчаной стяжки с явно известными площадью и толщиной; новые слои пола не включаются.",
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

export const CEMENT_SAND_SCREED_DEMOLITION_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  formula("screed_demolition_area_v1", "m2", "area_m2"),
  formula("demolition_dust_protection_film_area_v1", "m2", "dust_protection_film_area_m2"),
  formula("reinforced_demolition_waste_bag_quantity_v1", "piece", "waste_bag_quantity_piece"),
  formula("diamond_cutting_disc_screed_quantity_v1", "piece", "diamond_cutting_disc_quantity_piece"),
  formula("industrial_vacuum_filter_bag_quantity_v1", "piece", "vacuum_filter_bag_quantity_piece"),
  formula("electric_breaker_operation_time_v1", "machine_hour", "electric_breaker_machine_h"),
  formula("industrial_vacuum_operation_time_v1", "machine_hour", "industrial_vacuum_machine_h"),
  formula("screed_waste_mass_handling_quantity_v1", "t", "screed_waste_mass_t"),
  formula("screed_demolition_dust_suppression_water_volume_v1", "l", "dust_suppression_water_volume_l"),
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
    semanticOwnerId: `cement-sand-screed-demolition:${input.rowId}`,
    costOwner: "resource",
    ...(input.titleParameterIds ? {
      titleSpecificationParameterIds: input.titleParameterIds,
      titleSpecificationMode: "APPEND",
      titleSpecificationSeparator: " ",
    } : {}),
    scopeContextParameterIds: ["area_m2", "existing_screed_thickness_mm"],
  };
  const sourceMetadata = {
    truth_contract_version: "R3",
    synthetic: false,
    sourceRole: input.sourceRole,
    normativeTrace: [{
      sourceId: CEMENT_SAND_SCREED_DEMOLITION_SOURCE_ID,
      source_id: CEMENT_SAND_SCREED_DEMOLITION_SOURCE_ID,
      normId: CEMENT_SAND_SCREED_DEMOLITION_NORM_ID,
      norm_id: CEMENT_SAND_SCREED_DEMOLITION_NORM_ID,
      normVersion: CEMENT_SAND_SCREED_DEMOLITION_SOURCE_METADATA.source_document_version,
      source_title: CEMENT_SAND_SCREED_DEMOLITION_SOURCE_METADATA.source_title,
      exact_locator: CEMENT_SAND_SCREED_DEMOLITION_SOURCE_METADATA.exact_locator,
      source_definition_hash: CEMENT_SAND_SCREED_DEMOLITION_SOURCE_METADATA.definition_hash,
      sourceRole: input.sourceRole,
    }],
    excludedUnownedAssumptions: [
      "automatic protection-film, waste-bag, cutting-disc or vacuum-filter consumption",
      "automatic breaker or industrial-vacuum productivity",
      "automatic screed density, waste mass or disposal route",
      "automatic dust-suppression water consumption",
      "new screed mix or floor-finish material",
      "unconfirmed transport or disposal service outside the approved waste route",
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

export const CEMENT_SAND_SCREED_DEMOLITION_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  resource({ rowId: "rc09:screed_demolition", ordinal: 0, section: "Работы", category: "construction_work", titleRu: "Резка и демонтаж существующей цементно-песчаной стяжки", unitId: "m2", formulaId: "screed_demolition_area_v1", procurementEligible: false, sourceRole: "USER_MEASURED_OR_APPROVED_EXISTING_CONDITION_SURVEY" }),
  resource({ rowId: "rc09:demolition_dust_protection_film", ordinal: 1, section: "Материалы", category: "material", titleRu: "Плёнка полиэтиленовая защитная для пылезащитного ограждения", unitId: "m2", formulaId: "demolition_dust_protection_film_area_v1", procurementEligible: true, titleParameterIds: ["dust_protection_film_designation"], sourceRole: "APPROVED_DUST_PROTECTION_PLAN" }),
  resource({ rowId: "rc09:reinforced_demolition_waste_bag", ordinal: 2, section: "Материалы", category: "material", titleRu: "Мешок усиленный для строительных отходов", unitId: "piece", formulaId: "reinforced_demolition_waste_bag_quantity_v1", procurementEligible: true, titleParameterIds: ["waste_bag_designation"], sourceRole: "APPROVED_WASTE_HANDLING_PLAN" }),
  resource({ rowId: "rc09:diamond_cutting_disc_screed", ordinal: 3, section: "Материалы", category: "material", titleRu: "Диск алмазный сегментный для резки цементной стяжки", unitId: "piece", formulaId: "diamond_cutting_disc_screed_quantity_v1", procurementEligible: true, titleParameterIds: ["diamond_cutting_disc_designation"], sourceRole: "APPROVED_DEMOLITION_METHOD_AND_TOOL_SCHEDULE" }),
  resource({ rowId: "rc09:industrial_vacuum_filter_bag", ordinal: 4, section: "Материалы", category: "material", titleRu: "Фильтр-мешок для промышленного пылесоса", unitId: "piece", formulaId: "industrial_vacuum_filter_bag_quantity_v1", procurementEligible: true, titleParameterIds: ["vacuum_filter_bag_designation"], sourceRole: "APPROVED_DUST_EXTRACTION_EQUIPMENT_SCHEDULE" }),
  resource({ rowId: "rc09:electric_breaker_operation", ordinal: 5, section: "Оборудование", category: "equipment", titleRu: "Работа электрического отбойного молотка", unitId: "machine_hour", formulaId: "electric_breaker_operation_time_v1", procurementEligible: true, titleParameterIds: ["electric_breaker_designation"], sourceRole: "APPROVED_DEMOLITION_METHOD_AND_EQUIPMENT_SCHEDULE" }),
  resource({ rowId: "rc09:industrial_vacuum_operation", ordinal: 6, section: "Оборудование", category: "equipment", titleRu: "Работа промышленного пылесоса", unitId: "machine_hour", formulaId: "industrial_vacuum_operation_time_v1", procurementEligible: true, titleParameterIds: ["industrial_vacuum_designation"], sourceRole: "APPROVED_DUST_EXTRACTION_METHOD_AND_EQUIPMENT_SCHEDULE" }),
  resource({ rowId: "rc09:screed_waste_mass_handling", ordinal: 7, section: "Услуги", category: "service", titleRu: "Погрузка и передача отходов демонтированной стяжки", unitId: "t", formulaId: "screed_waste_mass_handling_quantity_v1", procurementEligible: true, titleParameterIds: ["waste_handling_route"], sourceRole: "APPROVED_EXISTING_CONDITION_SURVEY_AND_WASTE_HANDLING_PLAN" }),
  resource({ rowId: "rc09:screed_demolition_dust_suppression_water", ordinal: 8, section: "Условные материалы", category: "material", titleRu: "Вода для пылеподавления при демонтаже стяжки", unitId: "l", formulaId: "screed_demolition_dust_suppression_water_volume_v1", inclusionAst: equals("dust_suppression_mode", "REQUIRED"), procurementEligible: true, sourceRole: "APPROVED_DEMOLITION_METHOD_DUST_SUPPRESSION_BRANCH" }),
]);

export const CEMENT_SAND_SCREED_DEMOLITION_SHORT_INPUT = Object.freeze({
  area_m2: 150,
  existing_screed_thickness_mm: 50,
});

export const CEMENT_SAND_SCREED_DEMOLITION_ACCEPTANCE_INPUT = Object.freeze({
  area_m2: 150,
  existing_screed_thickness_mm: 50,
  dust_protection_film_designation: "Пылезащитная плёнка по утверждённому плану ограждения",
  dust_protection_film_area_m2: 52.5,
  waste_bag_designation: "Усиленный мешок по плану обращения с отходами",
  waste_bag_quantity_piece: 120,
  diamond_cutting_disc_designation: "Алмазный сегментный диск по ведомости инструмента",
  diamond_cutting_disc_quantity_piece: 3,
  vacuum_filter_bag_designation: "Фильтр-мешок совместимого промышленного пылесоса",
  vacuum_filter_bag_quantity_piece: 3,
  electric_breaker_designation: "Электрический отбойный молоток по ППР демонтажа",
  electric_breaker_machine_h: 13.5,
  industrial_vacuum_designation: "Промышленный пылесос по плану пылеудаления",
  industrial_vacuum_machine_h: 12,
  waste_handling_route: "Погрузка и передача отходов по утверждённой ведомости",
  screed_waste_mass_t: 15,
  dust_suppression_mode: "NOT_REQUIRED",
});

export async function compileCementSandScreedDemolitionR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? CEMENT_SAND_SCREED_DEMOLITION_CATALOG_ID;
  if (catalogId !== CEMENT_SAND_SCREED_DEMOLITION_CATALOG_ID) {
    throw new Error(`CEMENT_SAND_SCREED_DEMOLITION_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.cement-sand-screed-demolition-r1",
    catalogId,
    primaryMeasureParameterId: "area_m2",
    parameterDefinitions: [...CEMENT_SAND_SCREED_DEMOLITION_PARAMETERS],
    formulaDefinitions: [...CEMENT_SAND_SCREED_DEMOLITION_FORMULAS],
    resourceDefinitions: [...CEMENT_SAND_SCREED_DEMOLITION_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 12,
    hashJson: async (value) => JSON.stringify(value),
  });
}

export const CEMENT_SAND_SCREED_DEMOLITION_SOURCE_SUMMARY = Object.freeze({
  sourceId: CEMENT_SAND_SCREED_DEMOLITION_SOURCE_ID,
  normId: CEMENT_SAND_SCREED_DEMOLITION_NORM_ID,
  formula: "known existing-screed area and thickness give demolition work only; exact dust protection, bags, cutting and vacuum consumables, breaker and vacuum time, waste mass and conditional suppression water come from approved survey, demolition method, dust and waste plans",
});
