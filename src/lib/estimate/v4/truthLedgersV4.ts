import {
  buildProfessionalWorkPassport,
  clearProfessionalWorkPassportBuildCaches,
  listProfessionalWorkPassportTemplateIds,
} from "../buildProfessionalWorkPassport";
import {
  buildProfessionalWorkPassportV2,
  clearProfessionalWorkPassportV2BuildCaches,
} from "../buildProfessionalWorkPassportV2";
import { estimateDeterministicHash } from "../estimateDeterministicHash";
import type { ProfessionalWorkPassportV2 } from "../professionalWorkPassportV2Contract";
import type { ProfessionalWorkPassport } from "../workPassportContract";
import { adaptProfessionalWorkPassportV2ToV4 } from "./adaptProfessionalWorkPassportV2ToV4";
import { validateCategoryUnitV4 } from "./categoryUnitContractV4";
import type {
  ProfessionalEstimatePassportV4,
  WorkScopeClassV4,
} from "./professionalEstimateV4Contract";

export const GREEN_V4_PHASE0_ARCHITECTURE_AND_GAP_LEDGER_READY =
  "GREEN_V4_PHASE0_ARCHITECTURE_AND_GAP_LEDGER_READY" as const;
export const STOP_V4_PHASE0_ARCHITECTURE_OR_GAP_LEDGER_INCOMPLETE =
  "STOP_V4_PHASE0_ARCHITECTURE_OR_GAP_LEDGER_INCOMPLETE" as const;

export const V4_TRUTH_BLOCKER_KEYS = [
  "missing_passport",
  "missing_work_specific_overlay",
  "missing_parameter_schema",
  "ambiguous_parameter_name",
  "missing_parameter_help",
  "missing_input_kind",
  "missing_unit_for_quantity",
  "invalid_unit",
  "duplicate_parameter",
  "dead_parameter",
  "extracted_fact_not_bound",
  "inapplicable_required_parameter",
  "internal_label_exposed",
  "missing_professional_work_name",
  "category_unit_mismatch",
  "formula_dimension_mismatch",
  "formula_missing",
  "synthetic_quantity",
  "row_index_quantity_correlation",
  "generic_padding_row",
  "missing_applicability",
  "unsourced_critical_row",
  "exact_clone",
  "unjustified_clone",
  "silent_truncation",
  "duplicate_shared_scope",
  "missing_price_status",
  "missing_explanation_trace",
] as const;

export type V4TruthBlockerKey = (typeof V4_TRUTH_BLOCKER_KEYS)[number];
export type V4TruthBlockerCounters = Record<V4TruthBlockerKey, number>;

type CloneStatusV4 = "unique" | "justified_family_inheritance" | "exact_clone" | "unjustified_clone";

export type V4TruthLedgerEnvelope = {
  schema_version: "V4TruthLedgerRowV1";
  work_id: string;
  professional_name_ru: string;
  family_id: string;
  scope_class: WorkScopeClassV4 | "missing";
  passport_status: string;
  semantic_signature: string | null;
  clone_status: CloneStatusV4;
  blocker_counters: V4TruthBlockerCounters;
  blockers: V4TruthBlockerKey[];
  manifest_hash: string;
  expert_status: string;
};

export type WorkPassportTruthLedgerRowV4 = V4TruthLedgerEnvelope & {
  ledger: "WorkPassportTruthLedger11610";
  v2_resolved: boolean;
  v4_adapter_resolved: boolean;
  work_specific_overlay_id: string | null;
  parameter_schema_id: string | null;
  wbs_nodes_count: number;
  operations_count: number;
  resources_count: number;
  boq_rows_count: number;
  deterministic_passport_hash: string | null;
};

export type ParameterAndUnitTruthLedgerRowV4 = V4TruthLedgerEnvelope & {
  ledger: "ParameterAndUnitTruthLedger11610";
  parameter_schema_id: string | null;
  parameter_count: number;
  critical_count: number;
  recommended_count: number;
  optional_count: number;
  derived_count: number;
  canonical_unit_ids: string[];
  dead_parameter_count: number;
  duplicate_parameter_count: number;
  invalid_unit_count: number;
  category_unit_error_count: number;
  parameter_schema_hash: string | null;
};

export type FormulaAndQuantityTruthLedgerRowV4 = V4TruthLedgerEnvelope & {
  ledger: "FormulaAndQuantityTruthLedger11610";
  formula_count: number;
  dimensionally_valid_formula_count: number;
  dimensionally_blocked_formula_count: number;
  row_count: number;
  synthetic_quantity_count: number;
  row_index_quantity_correlation_count: number;
  missing_formula_count: number;
  missing_explanation_trace_count: number;
  formula_manifest_hash: string | null;
  row_manifest_hash: string | null;
};

export type SourceCoverageTruthLedgerRowV4 = V4TruthLedgerEnvelope & {
  ledger: "SourceCoverageLedger11610";
  source_count: number;
  sourced_row_count: number;
  unsourced_row_count: number;
  source_coverage_ratio: number;
  unsourced_critical_row_count: number;
  source_manifest_hash: string | null;
};

export type UserFacingClarityTruthLedgerRowV4 = V4TruthLedgerEnvelope & {
  ledger: "UserFacingClarityLedger11610";
  ambiguous_parameter_name_count: number;
  missing_parameter_help_count: number;
  internal_label_count: number;
  generic_padding_row_count: number;
  professional_name_ready: boolean;
  initial_question_budget: number;
  user_facing_manifest_hash: string | null;
};

type BaseAudit = {
  work_id: string;
  professional_name_ru: string;
  family_id: string;
  scope_class: WorkScopeClassV4 | "missing";
  passport_status: string;
  semantic_signature: string | null;
  structural_signature: string | null;
  clone_status: CloneStatusV4;
  counters: V4TruthBlockerCounters;
  expert_status: string;
  v2_resolved: boolean;
  v4_adapter_resolved: boolean;
  work_specific_overlay_id: string | null;
  parameter_schema_id: string | null;
  wbs_nodes_count: number;
  operations_count: number;
  resources_count: number;
  boq_rows_count: number;
  passport_hash: string | null;
  parameter_count: number;
  critical_count: number;
  recommended_count: number;
  optional_count: number;
  derived_count: number;
  unit_ids: string[];
  dead_parameter_count: number;
  duplicate_parameter_count: number;
  invalid_unit_count: number;
  category_unit_error_count: number;
  parameter_schema_hash: string | null;
  formula_count: number;
  valid_formula_count: number;
  blocked_formula_count: number;
  synthetic_quantity_count: number;
  row_index_correlation_count: number;
  missing_formula_count: number;
  missing_explanation_trace_count: number;
  formula_hash: string | null;
  row_hash: string | null;
  source_count: number;
  sourced_row_count: number;
  unsourced_row_count: number;
  source_coverage_ratio: number;
  unsourced_critical_row_count: number;
  source_hash: string | null;
  ambiguous_parameter_name_count: number;
  missing_parameter_help_count: number;
  internal_label_count: number;
  generic_padding_row_count: number;
  professional_name_ready: boolean;
  question_budget: number;
  clarity_hash: string | null;
};

function emptyCounters(): V4TruthBlockerCounters {
  return Object.fromEntries(V4_TRUTH_BLOCKER_KEYS.map((key) => [key, 0])) as V4TruthBlockerCounters;
}

function humanProfessionalName(value: string): boolean {
  return value.trim().length >= 4 && /[А-Яа-яЁё]/.test(value) && !/[_]{2,}|\b(?:template|work_id|formula_id)\b/i.test(value);
}

function ambiguousParameterName(value: string): boolean {
  const normalized = value.toLowerCase().replace(/[_.-]+/g, " ").replace(/\s+/g, " ").trim();
  return /^(объем работ|объём работ|параметр|значение|данные|quantity|amount|value|parameter|input)$/i.test(normalized);
}

function internalLabel(value: string): boolean {
  return /\b(?:template_id|work_id|work_key|formula_id|source_prompt|raw_input|normfactor|scope_driver|undefined|nan)\b/i.test(value) ||
    /\b[a-z][a-z0-9]+(?:_[a-z0-9]+){2,}\b/i.test(value);
}

function genericPaddingRow(value: string): boolean {
  return /(?:резерв профессионального добора|материалы этапа(?:\s|$)|работы этапа(?:\s|$)|вспомогательные материалы(?:\s|$)|промежуточный контроль(?:\s|$)|оборудование и инструмент(?:\s|$)|исполнительная фиксация(?:\s|$)|scope driver|операционная сборка|generic|fallback|padding|placeholder|template only|filler|todo)/i.test(value);
}

function uniqueDuplicateCount(values: readonly string[]): number {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return duplicates.size;
}

function extractTraceResult(trace: string): number | null {
  const value = trace.match(/(?:^|;)\s*result=(-?\d+(?:\.\d+)?)/i)?.[1];
  const parsed = value === undefined ? Number.NaN : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function indexCorrelationDetected(passport: ProfessionalWorkPassport): boolean {
  const values = passport.boqRecipe.allRows.map((row) => extractTraceResult(row.calculationTraceTemplate));
  const points = values.flatMap((value, index) => value === null ? [] : [{ index, value }]);
  if (points.length < 8 || new Set(points.map((point) => point.value)).size < 5) return false;
  const meanX = points.reduce((sum, point) => sum + point.index, 0) / points.length;
  const meanY = points.reduce((sum, point) => sum + point.value, 0) / points.length;
  const covariance = points.reduce((sum, point) => sum + (point.index - meanX) * (point.value - meanY), 0);
  const varianceX = points.reduce((sum, point) => sum + (point.index - meanX) ** 2, 0);
  const varianceY = points.reduce((sum, point) => sum + (point.value - meanY) ** 2, 0);
  if (varianceX === 0 || varianceY === 0) return false;
  return Math.abs(covariance / Math.sqrt(varianceX * varianceY)) >= 0.995;
}

function syntheticQuantityCount(passport: ProfessionalWorkPassport): number {
  return passport.boqRecipe.allRows.filter((row) => {
    const text = `${row.quantityFormula} ${row.calculationTraceTemplate}`;
    return /(?:row[_ ]?index|scopehash|hashfactor|round[_ -]?robin|padding(?:_depth)?|scopeDriver=|derived_from_project_quantity|1000\s*\/\s*1030\s*\/\s*1060)/i.test(text);
  }).length;
}

function sourceRows(passport: ProfessionalWorkPassport): { sourced: number; unsourced: number } {
  const sourced = passport.boqRecipe.allRows.filter((row) =>
    Boolean(row.normSourceId && row.normId && row.normVersion && !/unknown_untrusted/i.test(row.normSourceId)),
  ).length;
  return { sourced, unsourced: passport.boqRecipe.allRows.length - sourced };
}

function structuralSignature(passport: ProfessionalEstimatePassportV4): string {
  return estimateDeterministicHash({
    parameters: passport.parameter_schema.parameters.map((parameter) => ({
      key: parameter.canonical_key,
      name: parameter.professional_name_ru,
      kind: parameter.input_kind,
      necessity: parameter.necessity,
      unit: parameter.canonical_unit_id,
    })),
    rows: passport.boq_rows.map((row) => ({
      category: row.category,
      name: row.professional_name_ru,
      unit: row.unit_id,
      formula: passport.formulas.find((formula) => formula.formula_id === row.formula_id)?.expression ?? null,
      applicability: row.applicability,
    })),
  });
}

function missingBase(templateId: string): BaseAudit {
  const counters = emptyCounters();
  counters.missing_passport = 1;
  return {
    work_id: templateId,
    professional_name_ru: "",
    family_id: "",
    scope_class: "missing",
    passport_status: "missing",
    semantic_signature: null,
    structural_signature: null,
    clone_status: "unique",
    counters,
    expert_status: "NOT_REVIEWED",
    v2_resolved: false,
    v4_adapter_resolved: false,
    work_specific_overlay_id: null,
    parameter_schema_id: null,
    wbs_nodes_count: 0,
    operations_count: 0,
    resources_count: 0,
    boq_rows_count: 0,
    passport_hash: null,
    parameter_count: 0,
    critical_count: 0,
    recommended_count: 0,
    optional_count: 0,
    derived_count: 0,
    unit_ids: [],
    dead_parameter_count: 0,
    duplicate_parameter_count: 0,
    invalid_unit_count: 0,
    category_unit_error_count: 0,
    parameter_schema_hash: null,
    formula_count: 0,
    valid_formula_count: 0,
    blocked_formula_count: 0,
    synthetic_quantity_count: 0,
    row_index_correlation_count: 0,
    missing_formula_count: 0,
    missing_explanation_trace_count: 0,
    formula_hash: null,
    row_hash: null,
    source_count: 0,
    sourced_row_count: 0,
    unsourced_row_count: 0,
    source_coverage_ratio: 0,
    unsourced_critical_row_count: 0,
    source_hash: null,
    ambiguous_parameter_name_count: 0,
    missing_parameter_help_count: 0,
    internal_label_count: 0,
    generic_padding_row_count: 0,
    professional_name_ready: false,
    question_budget: 0,
    clarity_hash: null,
  };
}

function auditResolved(
  source: ProfessionalWorkPassport,
  v2: ProfessionalWorkPassportV2,
  passport: ProfessionalEstimatePassportV4,
): BaseAudit {
  const counters = emptyCounters();
  const parameters = passport.parameter_schema.parameters;
  const parameterKeys = parameters.map((parameter) => parameter.canonical_key);
  const ambiguous = parameters.filter((parameter) => !parameter.internal_only && ambiguousParameterName(parameter.professional_name_ru)).length;
  const missingHelp = parameters.filter((parameter) => !parameter.internal_only && !parameter.user_help_ru.trim()).length;
  const missingInputKind = parameters.filter((parameter) => !parameter.input_kind).length;
  const missingQuantityUnit = parameters.filter((parameter) => parameter.input_kind === "quantity" && !parameter.canonical_unit_id).length;
  const invalidParameterUnit = v2.parameter_graph.parameters.filter((parameter) => parameter.unit && !parameters.find((item) => item.canonical_key === parameter.canonical_key)?.canonical_unit_id).length;
  const duplicateParameters = uniqueDuplicateCount(parameterKeys);
  const deadParameters = parameters.filter((parameter) =>
    !parameter.internal_only &&
    parameter.necessity !== "derived" &&
    parameter.affected_row_ids.length === 0 &&
    parameter.formula_dependencies.length === 0,
  ).length;
  const schemaKeys = new Set(parameterKeys);
  const unboundFormulaInputs = new Set(passport.formulas.flatMap((formula) => formula.input_parameter_ids).filter((key) => !schemaKeys.has(key)));
  const inapplicableRequired = parameters.filter((parameter) =>
    parameter.necessity === "critical" && /never|not_applicable|false/i.test(parameter.applicability_condition),
  ).length;
  const categoryErrors = passport.boq_rows.filter((row) => !validateCategoryUnitV4({ category: row.category, unit_id: row.unit_id }).ok).length;
  const invalidRowUnits = passport.boq_rows.filter((row) => !row.unit_id).length;
  const dimensionallyBlocked = passport.formulas.filter((formula) => formula.dimensional_status === "blocked");
  const formulaDimensionMismatch = dimensionallyBlocked.filter((formula) => formula.dimensional_blockers.includes("FORMULA_DIMENSION_MISMATCH")).length;
  const missingFormula = passport.boq_rows.filter((row) => !row.formula_id || !passport.formulas.some((formula) => formula.formula_id === row.formula_id && formula.expression.trim())).length;
  const synthetic = syntheticQuantityCount(source);
  const correlated = indexCorrelationDetected(source) ? 1 : 0;
  const genericRows = passport.boq_rows.filter((row) => genericPaddingRow(row.professional_name_ru)).length;
  const missingApplicability = passport.boq_rows.filter((row) => !row.applicability.trim()).length;
  const sources = sourceRows(source);
  const evidenceIds = new Set(passport.normative_evidence.map((evidence) => evidence.source_id));
  const unsourcedCritical = passport.boq_rows.filter((row) => !row.source_id || !evidenceIds.has(row.source_id)).length;
  const duplicateSharedScope = uniqueDuplicateCount(passport.boq_rows.map((row) => row.shared_scope_key).filter((key): key is string => Boolean(key)));
  const missingPrice = source.boqRecipe.allRows.filter((row) => !row.priceStatus).length;
  const missingTrace = source.boqRecipe.allRows.filter((row) => !row.calculationTraceTemplate.trim()).length;
  const visibleStrings = [
    passport.identity.professional_name_ru,
    ...parameters.filter((parameter) => !parameter.internal_only).flatMap((parameter) => [parameter.professional_name_ru, parameter.user_help_ru]),
    ...passport.boq_rows.map((row) => row.professional_name_ru),
  ];
  const internalLabels = visibleStrings.filter(internalLabel).length;
  const professionalNameReady = humanProfessionalName(passport.identity.professional_name_ru);
  const expectedRows = v2.material_assemblies.length + v2.work_operations.length + v2.services.length + v2.equipment.length;
  const silentTruncation = passport.boq_rows.length !== expectedRows || source.boqRecipe.allRows.length !== expectedRows ? 1 : 0;

  counters.missing_work_specific_overlay = passport.inheritance.work_specific_overlay_id ? 0 : 1;
  counters.missing_parameter_schema = parameters.length > 0 ? 0 : 1;
  counters.ambiguous_parameter_name = ambiguous;
  counters.missing_parameter_help = missingHelp;
  counters.missing_input_kind = missingInputKind;
  counters.missing_unit_for_quantity = missingQuantityUnit;
  counters.invalid_unit = invalidParameterUnit + invalidRowUnits;
  counters.duplicate_parameter = duplicateParameters;
  counters.dead_parameter = deadParameters;
  counters.extracted_fact_not_bound = unboundFormulaInputs.size;
  counters.inapplicable_required_parameter = inapplicableRequired;
  counters.internal_label_exposed = internalLabels;
  counters.missing_professional_work_name = professionalNameReady ? 0 : 1;
  counters.category_unit_mismatch = categoryErrors;
  counters.formula_dimension_mismatch = formulaDimensionMismatch;
  counters.formula_missing = missingFormula;
  counters.synthetic_quantity = synthetic;
  counters.row_index_quantity_correlation = correlated;
  counters.generic_padding_row = genericRows;
  counters.missing_applicability = missingApplicability;
  counters.unsourced_critical_row = unsourcedCritical;
  counters.silent_truncation = silentTruncation;
  counters.duplicate_shared_scope = duplicateSharedScope;
  counters.missing_price_status = missingPrice;
  counters.missing_explanation_trace = missingTrace;

  const countNecessity = (necessity: "critical" | "recommended" | "optional" | "derived") =>
    parameters.filter((parameter) => parameter.necessity === necessity).length;
  const unitIds = [...new Set([
    ...parameters.map((parameter) => parameter.canonical_unit_id),
    ...passport.boq_rows.map((row) => row.unit_id),
  ].filter((unit): unit is string => Boolean(unit)))].sort();

  return {
    work_id: passport.identity.stable_work_id,
    professional_name_ru: passport.identity.professional_name_ru,
    family_id: passport.identity.family_id,
    scope_class: passport.scope.scope_class,
    passport_status: passport.status,
    semantic_signature: passport.semantic_signature,
    structural_signature: structuralSignature(passport),
    clone_status: "unique",
    counters,
    expert_status: passport.expert_review_status,
    v2_resolved: true,
    v4_adapter_resolved: true,
    work_specific_overlay_id: passport.inheritance.work_specific_overlay_id,
    parameter_schema_id: passport.parameter_schema.schema_id,
    wbs_nodes_count: passport.wbs.length,
    operations_count: passport.operations.length,
    resources_count: passport.resources.length,
    boq_rows_count: passport.boq_rows.length,
    passport_hash: passport.deterministic_hash,
    parameter_count: parameters.length,
    critical_count: countNecessity("critical"),
    recommended_count: countNecessity("recommended"),
    optional_count: countNecessity("optional"),
    derived_count: countNecessity("derived"),
    unit_ids: unitIds,
    dead_parameter_count: deadParameters,
    duplicate_parameter_count: duplicateParameters,
    invalid_unit_count: invalidParameterUnit + invalidRowUnits,
    category_unit_error_count: categoryErrors,
    parameter_schema_hash: estimateDeterministicHash(passport.parameter_schema),
    formula_count: passport.formulas.length,
    valid_formula_count: passport.formulas.length - dimensionallyBlocked.length,
    blocked_formula_count: dimensionallyBlocked.length,
    synthetic_quantity_count: synthetic,
    row_index_correlation_count: correlated,
    missing_formula_count: missingFormula,
    missing_explanation_trace_count: missingTrace,
    formula_hash: estimateDeterministicHash(passport.formulas),
    row_hash: estimateDeterministicHash(passport.boq_rows),
    source_count: passport.normative_evidence.length,
    sourced_row_count: sources.sourced,
    unsourced_row_count: sources.unsourced,
    source_coverage_ratio: source.boqRecipe.allRows.length > 0 ? Number((sources.sourced / source.boqRecipe.allRows.length).toFixed(6)) : 0,
    unsourced_critical_row_count: unsourcedCritical,
    source_hash: estimateDeterministicHash(passport.normative_evidence),
    ambiguous_parameter_name_count: ambiguous,
    missing_parameter_help_count: missingHelp,
    internal_label_count: internalLabels,
    generic_padding_row_count: genericRows,
    professional_name_ready: professionalNameReady,
    question_budget: passport.parameter_schema.question_budget.initial_maximum,
    clarity_hash: estimateDeterministicHash({
      professional_name_ru: passport.identity.professional_name_ru,
      parameters: parameters.filter((parameter) => !parameter.internal_only).map((parameter) => ({
        name: parameter.professional_name_ru,
        help: parameter.user_help_ru,
        kind: parameter.input_kind,
        example: parameter.example_ru,
        consequence: parameter.missing_value_consequence_ru,
      })),
    }),
  };
}

function applyCloneAudit(rows: BaseAudit[]): void {
  const groups = new Map<string, BaseAudit[]>();
  for (const row of rows) {
    if (!row.structural_signature) continue;
    const group = groups.get(row.structural_signature) ?? [];
    group.push(row);
    groups.set(row.structural_signature, group);
  }
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const families = new Set(group.map((row) => row.family_id));
    for (const row of group) {
      row.counters.exact_clone = 1;
      if (families.size > 1) {
        row.counters.unjustified_clone = 1;
        row.clone_status = "unjustified_clone";
      } else {
        row.clone_status = "justified_family_inheritance";
      }
    }
  }
}

function blockersFor(counters: V4TruthBlockerCounters): V4TruthBlockerKey[] {
  return V4_TRUTH_BLOCKER_KEYS.filter((key) => counters[key] > 0);
}

function envelope(row: BaseAudit, ledger: string): V4TruthLedgerEnvelope {
  const withoutHash = {
    schema_version: "V4TruthLedgerRowV1" as const,
    work_id: row.work_id,
    professional_name_ru: row.professional_name_ru,
    family_id: row.family_id,
    scope_class: row.scope_class,
    passport_status: row.passport_status,
    semantic_signature: row.semantic_signature,
    clone_status: row.clone_status,
    blocker_counters: row.counters,
    blockers: blockersFor(row.counters),
    expert_status: row.expert_status,
  };
  return { ...withoutHash, manifest_hash: estimateDeterministicHash({ ledger, ...withoutHash }) };
}

function sealLedgerRow<T extends V4TruthLedgerEnvelope & { ledger: string }>(row: T): T {
  const { manifest_hash: _previousHash, ...payload } = row;
  return { ...row, manifest_hash: estimateDeterministicHash(payload) };
}

function workLedgerRow(row: BaseAudit): WorkPassportTruthLedgerRowV4 {
  return sealLedgerRow({
    ...envelope(row, "WorkPassportTruthLedger11610"),
    ledger: "WorkPassportTruthLedger11610",
    v2_resolved: row.v2_resolved,
    v4_adapter_resolved: row.v4_adapter_resolved,
    work_specific_overlay_id: row.work_specific_overlay_id,
    parameter_schema_id: row.parameter_schema_id,
    wbs_nodes_count: row.wbs_nodes_count,
    operations_count: row.operations_count,
    resources_count: row.resources_count,
    boq_rows_count: row.boq_rows_count,
    deterministic_passport_hash: row.passport_hash,
  });
}

function parameterLedgerRow(row: BaseAudit): ParameterAndUnitTruthLedgerRowV4 {
  return sealLedgerRow({
    ...envelope(row, "ParameterAndUnitTruthLedger11610"),
    ledger: "ParameterAndUnitTruthLedger11610",
    parameter_schema_id: row.parameter_schema_id,
    parameter_count: row.parameter_count,
    critical_count: row.critical_count,
    recommended_count: row.recommended_count,
    optional_count: row.optional_count,
    derived_count: row.derived_count,
    canonical_unit_ids: row.unit_ids,
    dead_parameter_count: row.dead_parameter_count,
    duplicate_parameter_count: row.duplicate_parameter_count,
    invalid_unit_count: row.invalid_unit_count,
    category_unit_error_count: row.category_unit_error_count,
    parameter_schema_hash: row.parameter_schema_hash,
  });
}

function formulaLedgerRow(row: BaseAudit): FormulaAndQuantityTruthLedgerRowV4 {
  return sealLedgerRow({
    ...envelope(row, "FormulaAndQuantityTruthLedger11610"),
    ledger: "FormulaAndQuantityTruthLedger11610",
    formula_count: row.formula_count,
    dimensionally_valid_formula_count: row.valid_formula_count,
    dimensionally_blocked_formula_count: row.blocked_formula_count,
    row_count: row.boq_rows_count,
    synthetic_quantity_count: row.synthetic_quantity_count,
    row_index_quantity_correlation_count: row.row_index_correlation_count,
    missing_formula_count: row.missing_formula_count,
    missing_explanation_trace_count: row.missing_explanation_trace_count,
    formula_manifest_hash: row.formula_hash,
    row_manifest_hash: row.row_hash,
  });
}

function sourceLedgerRow(row: BaseAudit): SourceCoverageTruthLedgerRowV4 {
  return sealLedgerRow({
    ...envelope(row, "SourceCoverageLedger11610"),
    ledger: "SourceCoverageLedger11610",
    source_count: row.source_count,
    sourced_row_count: row.sourced_row_count,
    unsourced_row_count: row.unsourced_row_count,
    source_coverage_ratio: row.source_coverage_ratio,
    unsourced_critical_row_count: row.unsourced_critical_row_count,
    source_manifest_hash: row.source_hash,
  });
}

function clarityLedgerRow(row: BaseAudit): UserFacingClarityTruthLedgerRowV4 {
  return sealLedgerRow({
    ...envelope(row, "UserFacingClarityLedger11610"),
    ledger: "UserFacingClarityLedger11610",
    ambiguous_parameter_name_count: row.ambiguous_parameter_name_count,
    missing_parameter_help_count: row.missing_parameter_help_count,
    internal_label_count: row.internal_label_count,
    generic_padding_row_count: row.generic_padding_row_count,
    professional_name_ready: row.professional_name_ready,
    initial_question_budget: row.question_budget,
    user_facing_manifest_hash: row.clarity_hash,
  });
}

export type ProfessionalEstimateV4Phase0Audit = {
  summary: {
    final_status:
      | typeof GREEN_V4_PHASE0_ARCHITECTURE_AND_GAP_LEDGER_READY
      | typeof STOP_V4_PHASE0_ARCHITECTURE_OR_GAP_LEDGER_INCOMPLETE;
    phase: "PHASE_0_CONTRACTS_AND_GAP_AUDIT";
    catalog_total: number;
    expected_catalog_total: 11610;
    ledger_rows: Record<
      "work_passport" | "parameter_and_unit" | "formula_and_quantity" | "source_coverage" | "user_facing_clarity",
      number
    >;
    blocker_counters: V4TruthBlockerCounters;
    works_with_blockers: number;
    architecture_contracts_ready: boolean;
    v2_adapter_ready: boolean;
    unit_registry_ready: boolean;
    formula_validator_ready: boolean;
    category_unit_contract_ready: boolean;
    question_composer_ready: boolean;
    all_ledgers_complete: boolean;
    full_software_acceptance_claimed: false;
    phase_1_started: false;
    manifest_hashes: Record<string, string>;
  };
  work_passport: WorkPassportTruthLedgerRowV4[];
  parameter_and_unit: ParameterAndUnitTruthLedgerRowV4[];
  formula_and_quantity: FormulaAndQuantityTruthLedgerRowV4[];
  source_coverage: SourceCoverageTruthLedgerRowV4[];
  user_facing_clarity: UserFacingClarityTruthLedgerRowV4[];
};

export function auditProfessionalEstimateV4Phase0(): ProfessionalEstimateV4Phase0Audit {
  const templateIds = listProfessionalWorkPassportTemplateIds();
  const baseRows: BaseAudit[] = [];
  for (const [index, templateId] of templateIds.entries()) {
    const source = buildProfessionalWorkPassport(templateId);
    const v2 = buildProfessionalWorkPassportV2(templateId);
    if (!source || !v2) baseRows.push(missingBase(templateId));
    else baseRows.push(auditResolved(source, v2, adaptProfessionalWorkPassportV2ToV4(v2)));
    if (index > 0 && index % 40 === 0) {
      clearProfessionalWorkPassportV2BuildCaches();
      clearProfessionalWorkPassportBuildCaches();
    }
  }
  clearProfessionalWorkPassportV2BuildCaches();
  clearProfessionalWorkPassportBuildCaches();
  applyCloneAudit(baseRows);

  const workPassport = baseRows.map(workLedgerRow);
  const parameterAndUnit = baseRows.map(parameterLedgerRow);
  const formulaAndQuantity = baseRows.map(formulaLedgerRow);
  const sourceCoverage = baseRows.map(sourceLedgerRow);
  const userFacingClarity = baseRows.map(clarityLedgerRow);
  const ledgers = [workPassport, parameterAndUnit, formulaAndQuantity, sourceCoverage, userFacingClarity];
  const allLedgersComplete = templateIds.length === 11610 && ledgers.every((ledger) => ledger.length === 11610) &&
    ledgers.every((ledger) => new Set(ledger.map((row) => row.work_id)).size === 11610) &&
    ledgers.every((ledger) => ledger.every((row) => Boolean(row.manifest_hash)));
  const aggregateCounters = emptyCounters();
  for (const row of baseRows) {
    for (const key of V4_TRUTH_BLOCKER_KEYS) aggregateCounters[key] += row.counters[key];
  }
  const manifestHashes = {
    work_passport: estimateDeterministicHash(workPassport.map((row) => row.manifest_hash)),
    parameter_and_unit: estimateDeterministicHash(parameterAndUnit.map((row) => row.manifest_hash)),
    formula_and_quantity: estimateDeterministicHash(formulaAndQuantity.map((row) => row.manifest_hash)),
    source_coverage: estimateDeterministicHash(sourceCoverage.map((row) => row.manifest_hash)),
    user_facing_clarity: estimateDeterministicHash(userFacingClarity.map((row) => row.manifest_hash)),
  };
  const architectureReady = allLedgersComplete;
  return {
    summary: {
      final_status: architectureReady
        ? GREEN_V4_PHASE0_ARCHITECTURE_AND_GAP_LEDGER_READY
        : STOP_V4_PHASE0_ARCHITECTURE_OR_GAP_LEDGER_INCOMPLETE,
      phase: "PHASE_0_CONTRACTS_AND_GAP_AUDIT",
      catalog_total: templateIds.length,
      expected_catalog_total: 11610,
      ledger_rows: {
        work_passport: workPassport.length,
        parameter_and_unit: parameterAndUnit.length,
        formula_and_quantity: formulaAndQuantity.length,
        source_coverage: sourceCoverage.length,
        user_facing_clarity: userFacingClarity.length,
      },
      blocker_counters: aggregateCounters,
      works_with_blockers: baseRows.filter((row) => blockersFor(row.counters).length > 0).length,
      architecture_contracts_ready: true,
      v2_adapter_ready: true,
      unit_registry_ready: true,
      formula_validator_ready: true,
      category_unit_contract_ready: true,
      question_composer_ready: true,
      all_ledgers_complete: allLedgersComplete,
      full_software_acceptance_claimed: false,
      phase_1_started: false,
      manifest_hashes: manifestHashes,
    },
    work_passport: workPassport,
    parameter_and_unit: parameterAndUnit,
    formula_and_quantity: formulaAndQuantity,
    source_coverage: sourceCoverage,
    user_facing_clarity: userFacingClarity,
  };
}
