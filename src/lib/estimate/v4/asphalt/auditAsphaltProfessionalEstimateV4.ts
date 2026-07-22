import { getEngineeringUnitV4 } from "../engineeringUnitRegistryV4";
import { validateWorkSpecificParameterSchemaV4 } from "../validateProfessionalEstimateV4";
import type { AsphaltProfessionalEstimateCompilationV4 } from "./compileAsphaltProfessionalEstimateV4";

export const GREEN_V4_PHASE1_ASPHALT_PROFESSIONAL_VERTICAL_SLICE_SOFTWARE_SEALED_READY_FOR_ROAD_ENGINEER_REVIEW_NO_RELEASE =
  "GREEN_V4_PHASE1_ASPHALT_PROFESSIONAL_VERTICAL_SLICE_SOFTWARE_SEALED_READY_FOR_ROAD_ENGINEER_REVIEW_NO_RELEASE" as const;
export const STOP_V4_PHASE1_ASPHALT_PROFESSIONAL_VERTICAL_SLICE_INCOMPLETE =
  "STOP_V4_PHASE1_ASPHALT_PROFESSIONAL_VERTICAL_SLICE_INCOMPLETE" as const;

export type AsphaltAcceptanceCountersV4 = {
  missing_work_specific_overlay: number;
  generic_parameter_schema: number;
  ambiguous_parameter_names: number;
  missing_input_kind: number;
  missing_unit: number;
  invalid_unit: number;
  duplicate_parameters: number;
  dead_parameters: number;
  unbound_facts: number;
  internal_labels: number;
  category_unit_mismatch: number;
  formula_dimension_mismatch: number;
  synthetic_quantity: number;
  padding_row: number;
  missing_applicability: number;
  missing_explanation_trace: number;
  silent_truncation: number;
  duplicate_physical_resource: number;
  conflicting_quantities: number;
  double_priced_subtotals: number;
  unbound_formula_input: number;
  hidden_default_affecting_quantity: number;
  inapplicable_row: number;
  category_mismatch: number;
  generic_production_row: number;
  missing_formula_trace: number;
};

export type AsphaltProfessionalEstimateAuditV4 = {
  final_status:
    | typeof GREEN_V4_PHASE1_ASPHALT_PROFESSIONAL_VERTICAL_SLICE_SOFTWARE_SEALED_READY_FOR_ROAD_ENGINEER_REVIEW_NO_RELEASE
    | typeof STOP_V4_PHASE1_ASPHALT_PROFESSIONAL_VERTICAL_SLICE_INCOMPLETE;
  counters: AsphaltAcceptanceCountersV4;
  compile_blockers: string[];
  unresolved_requirements: string[];
  rows_count: number;
  formulas_count: number;
  procurement_rows_count: number;
  prices_missing_rows_count: number;
  total_amount: null;
  source_trace_complete: boolean;
  expert_review_required: true;
  other_works_migrated: 0;
  release_claimed: false;
};

const INTERNAL_LABEL = /(?:asphalt_concrete_pavement|PRELIMINARY_BOQ|scope driver|template[_ ]id|revision[_ ]id|work[_ ]id|Новое значение)/iu;
const AMBIGUOUS_PARAMETER = /^(?:значение|параметр|дополнительный параметр|геология и профиль)$/iu;
const PADDING_ROW = /(?:padding|placeholder|filler|резерв профессионального добора|материалы этапа|работы этапа|вспомогательные материалы)/iu;
const GENERIC_PRODUCTION_ROW = /^(?:материалы|работы|услуги|оборудование|дополнительные работы|прочее|итого|подытог)$/iu;

function physicalResourceKey(row: AsphaltProfessionalEstimateCompilationV4["compiled_rows"][number]): string {
  return [row.definition.category, row.definition.professional_name_ru.toLocaleLowerCase("ru-RU").replace(/\s+/g, " ").trim(), row.definition.unit_id].join("|");
}

export function auditAsphaltProfessionalEstimateV4(
  compilation: AsphaltProfessionalEstimateCompilationV4,
): AsphaltProfessionalEstimateAuditV4 {
  const passport = compilation.passport;
  const schemaValidation = validateWorkSpecificParameterSchemaV4(passport.parameter_schema);
  const schemaParameterIds = new Set(passport.parameter_schema.parameters.map((item) => item.parameter_id));
  const factParameterIds = compilation.extracted_facts.map((item) => item.parameter_id).filter((item): item is string => Boolean(item));
  const visibleText = [
    passport.identity.professional_name_ru,
    ...passport.parameter_schema.parameters.map((item) => item.professional_name_ru),
    ...passport.boq_rows.flatMap((row) => [row.professional_name_ru, row.technical_specification_ru, row.explanation_trace_ru]),
  ];
  const incompleteLayers = passport.unresolved_requirements.filter((item) =>
    /(?:MISSING_ASPHALT_LAYERS|INCOMPLETE_ASPHALT_LAYER_|INCOMPLETE_CRUSHED_LAYER_)/.test(item),
  ).length;
  const physicalResourceCounts = new Map<string, number>();
  const physicalResourceQuantities = new Map<string, Set<number>>();
  for (const row of compilation.compiled_rows) {
    if (row.definition.category === "work" || row.definition.category === "labor") continue;
    const key = physicalResourceKey(row);
    physicalResourceCounts.set(key, (physicalResourceCounts.get(key) ?? 0) + 1);
    const quantities = physicalResourceQuantities.get(key) ?? new Set<number>();
    quantities.add(row.quantity);
    physicalResourceQuantities.set(key, quantities);
  }
  const counters: AsphaltAcceptanceCountersV4 = {
    missing_work_specific_overlay: passport.inheritance.work_specific_overlay_id ? 0 : 1,
    generic_parameter_schema: passport.parameter_schema.compatibility_source === "native_v4" ? 0 : 1,
    ambiguous_parameter_names: passport.parameter_schema.parameters.filter((item) => AMBIGUOUS_PARAMETER.test(item.professional_name_ru.trim())).length,
    missing_input_kind: passport.parameter_schema.parameters.filter((item) => !item.input_kind).length,
    missing_unit: passport.parameter_schema.parameters.filter((item) => item.dimension != null && item.input_kind !== "repeatable_group" && !item.canonical_unit_id).length,
    invalid_unit: passport.parameter_schema.parameters.filter((item) =>
      Boolean(item.canonical_unit_id && !getEngineeringUnitV4(item.canonical_unit_id)) ||
      item.display_unit_ids.some((unitId) => !getEngineeringUnitV4(unitId)),
    ).length,
    duplicate_parameters: schemaValidation.duplicate_semantic_parameter_ids.length,
    dead_parameters: schemaValidation.dead_parameter_ids.length,
    unbound_facts: factParameterIds.filter((id) => !schemaParameterIds.has(id)).length,
    internal_labels: visibleText.filter((value) => INTERNAL_LABEL.test(value)).length,
    category_unit_mismatch: compilation.category_unit_blockers.length,
    formula_dimension_mismatch: compilation.formula_dimension_blockers.length,
    synthetic_quantity: compilation.compiled_rows.filter((item) =>
      !item.definition.formula_id ||
      !item.definition.formula_inputs.length ||
      !Number.isFinite(item.quantity),
    ).length,
    padding_row: passport.boq_rows.filter((row) => PADDING_ROW.test(row.professional_name_ru)).length,
    missing_applicability: passport.boq_rows.filter((row) => !row.applicability.trim() || !row.inclusion_reason_ru.trim() || !row.exclusion_rule.trim()).length,
    missing_explanation_trace: passport.boq_rows.filter((row) => !row.explanation_trace_ru.trim() || !row.source_id).length,
    silent_truncation: incompleteLayers,
    duplicate_physical_resource: [...physicalResourceCounts.values()].filter((count) => count > 1).length,
    conflicting_quantities: [...physicalResourceQuantities.values()].filter((quantities) => quantities.size > 1).length,
    double_priced_subtotals: compilation.compiled_rows.filter((row) =>
      /(?:суммарно|подытог|итого)/iu.test(row.definition.professional_name_ru) && row.definition.price_status === "PRICE_MISSING",
    ).length,
    unbound_formula_input: compilation.compiled_rows.reduce((count, row) =>
      count + row.definition.formula_inputs.filter((key) => !(key in row.formula_input_values)).length,
    0),
    hidden_default_affecting_quantity: passport.parameter_schema.parameters.filter((parameter) =>
      parameter.default_value != null && parameter.formula_dependencies.length > 0,
    ).length,
    inapplicable_row: compilation.compiled_rows.filter((row) =>
      !row.definition.applicability.trim() || !row.definition.inclusion_reason_ru.trim() || row.quantity < 0,
    ).length,
    category_mismatch: compilation.category_unit_blockers.length,
    generic_production_row: compilation.compiled_rows.filter((row) =>
      GENERIC_PRODUCTION_ROW.test(row.definition.professional_name_ru.trim()) || PADDING_ROW.test(row.definition.professional_name_ru),
    ).length,
    missing_formula_trace: compilation.compiled_rows.filter((row) =>
      !row.definition.formula_id || !row.definition.explanation_trace_ru.trim() || !row.definition.source_id,
    ).length,
  };
  const counterTotal = Object.values(counters).reduce((sum, value) => sum + value, 0);
  const green = counterTotal === 0 &&
    compilation.compile_blockers.length === 0 &&
    passport.unresolved_requirements.length === 0 &&
    compilation.source_trace_complete &&
    compilation.price_coverage.total_amount === null;
  return {
    final_status: green
      ? GREEN_V4_PHASE1_ASPHALT_PROFESSIONAL_VERTICAL_SLICE_SOFTWARE_SEALED_READY_FOR_ROAD_ENGINEER_REVIEW_NO_RELEASE
      : STOP_V4_PHASE1_ASPHALT_PROFESSIONAL_VERTICAL_SLICE_INCOMPLETE,
    counters,
    compile_blockers: compilation.compile_blockers,
    unresolved_requirements: passport.unresolved_requirements,
    rows_count: passport.boq_rows.length,
    formulas_count: passport.formulas.length,
    procurement_rows_count: passport.procurement_lines.length,
    prices_missing_rows_count: compilation.price_coverage.missing_price_rows,
    total_amount: null,
    source_trace_complete: compilation.source_trace_complete,
    expert_review_required: true,
    other_works_migrated: 0,
    release_claimed: false,
  };
}

export function buildAsphaltRoadEngineerReviewPackageV4(
  compilation: AsphaltProfessionalEstimateCompilationV4,
) {
  return {
    schema_version: "AsphaltRoadEngineerReviewPackageV4" as const,
    work: compilation.passport.identity,
    revision_hash: compilation.passport.deterministic_hash,
    parameter_schema: compilation.passport.parameter_schema,
    formulas: compilation.passport.formulas,
    resources: compilation.passport.resources,
    normative_evidence: compilation.passport.normative_evidence,
    assumptions_ru: compilation.passport.assumptions_ru,
    unresolved_requirements: compilation.passport.unresolved_requirements,
    disputed_questions_ru: compilation.expert_questions_ru,
    example_boq: compilation.compiled_rows.map((item) => ({
      row_id: item.definition.row_id,
      section: item.definition.section,
      category: item.definition.category,
      professional_name_ru: item.definition.professional_name_ru,
      technical_specification_ru: item.definition.technical_specification_ru,
      quantity: item.quantity,
      unit_id: item.definition.unit_id,
      price_status_ru: "Цена не заполнена",
      explanation_trace_ru: item.definition.explanation_trace_ru,
    })),
    procurement_output: compilation.passport.procurement_lines,
    ai_professional_truth_claimed: false,
    road_engineer_sign_off_required: true,
  };
}
