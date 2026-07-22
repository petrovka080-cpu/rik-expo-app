import { estimateDeterministicHash } from "../estimateDeterministicHash";
import type {
  ProfessionalEstimatePassportV4,
  WorkSpecificParameterSchemaV4,
  WorkSpecificParameterV4,
} from "./professionalEstimateV4Contract";

export type WorkSpecificParameterSchemaValidationV4 = {
  ok: boolean;
  dead_parameter_ids: string[];
  duplicate_semantic_parameter_ids: string[];
  owner_mismatch_parameter_ids: string[];
  unstable_parameter_ids: string[];
  blockers: string[];
};

export type ProfessionalEstimatePassportValidationV4 = {
  ok: boolean;
  blockers: string[];
  parameter_schema: WorkSpecificParameterSchemaValidationV4;
};

function normalizeSemanticText(value: string): string {
  return value.toLowerCase().replace(/[ё]/g, "е").replace(/[^a-zа-я0-9]+/gi, " ").replace(/\s+/g, " ").trim();
}

export function stableWorkSpecificParameterIdV4(workId: string, canonicalKey: string): string {
  return `${workId}:parameter:${canonicalKey}:v4`;
}

export function workSpecificParameterSemanticKeyV4(parameter: WorkSpecificParameterV4): string {
  return estimateDeterministicHash({
    name: normalizeSemanticText(parameter.professional_name_ru),
    input_kind: parameter.input_kind,
    dimension: parameter.dimension,
    canonical_unit_id: parameter.canonical_unit_id,
  });
}

export function parameterHasProfessionalBindingV4(parameter: WorkSpecificParameterV4): boolean {
  return parameter.formula_dependencies.length > 0 ||
    parameter.affected_row_ids.length > 0 ||
    parameter.specification_bindings.length > 0 ||
    parameter.price_binding_keys.length > 0 ||
    !/^(?:always|required_when_parameter_is_applicable|not_required)$/i.test(parameter.applicability_condition.trim());
}

export function validateWorkSpecificParameterSchemaV4(
  schema: WorkSpecificParameterSchemaV4,
): WorkSpecificParameterSchemaValidationV4 {
  const ownerMismatch = schema.parameters.filter((parameter) =>
    !schema.owner_work_id || parameter.owner_work_id !== schema.owner_work_id,
  ).map((parameter) => parameter.parameter_id);
  const unstable = schema.parameters.filter((parameter) =>
    parameter.parameter_id !== stableWorkSpecificParameterIdV4(schema.owner_work_id, parameter.canonical_key),
  ).map((parameter) => parameter.parameter_id);
  const dead = schema.parameters.filter((parameter) =>
    !parameter.internal_only && parameter.necessity !== "derived" && !parameterHasProfessionalBindingV4(parameter),
  ).map((parameter) => parameter.parameter_id);
  const semanticGroups = new Map<string, string[]>();
  for (const parameter of schema.parameters) {
    const key = workSpecificParameterSemanticKeyV4(parameter);
    semanticGroups.set(key, [...(semanticGroups.get(key) ?? []), parameter.parameter_id]);
  }
  const duplicates = [...semanticGroups.values()].filter((ids) => ids.length > 1).flat().sort();
  const blockers = [
    !schema.owner_work_id ? "MISSING_WORK_SPECIFIC_OWNER" : "",
    ...ownerMismatch.map((id) => `PARAMETER_OWNER_MISMATCH:${id}`),
    ...unstable.map((id) => `UNSTABLE_PARAMETER_ID:${id}`),
    ...dead.map((id) => `DEAD_PARAMETER:${id}`),
    ...duplicates.map((id) => `DUPLICATE_SEMANTIC_PARAMETER:${id}`),
  ].filter(Boolean);
  return {
    ok: blockers.length === 0,
    dead_parameter_ids: dead,
    duplicate_semantic_parameter_ids: duplicates,
    owner_mismatch_parameter_ids: ownerMismatch,
    unstable_parameter_ids: unstable,
    blockers,
  };
}

function hasInternalWorkSlug(value: string): boolean {
  return /\b[a-z][a-z0-9]+(?:_[a-z0-9]+){2,}\b/i.test(value) || /\b(?:template_id|work_id|work_key)\b/i.test(value);
}

function isPaddingRow(value: string): boolean {
  return /(?:резерв профессионального добора|материалы этапа(?:\s|$)|работы этапа(?:\s|$)|вспомогательные материалы(?:\s|$)|промежуточный контроль(?:\s|$)|оборудование и инструмент(?:\s|$)|исполнительная фиксация(?:\s|$)|scope driver|операционная сборка|padding|placeholder|filler)/i.test(value);
}

export function validateProfessionalEstimatePassportV4(
  passport: ProfessionalEstimatePassportV4,
): ProfessionalEstimatePassportValidationV4 {
  const schema = validateWorkSpecificParameterSchemaV4(passport.parameter_schema);
  const nativeOrFamilyInherited = passport.inheritance.source_contract !== "ProfessionalEstimatePassportV4" ||
    !passport.inheritance.family_passport_id ||
    Boolean(passport.inheritance.work_specific_overlay_id);
  const blockers = [
    ...schema.blockers,
    nativeOrFamilyInherited ? "" : "FAMILY_BASE_WITHOUT_WORK_SPECIFIC_OVERLAY",
    passport.parameter_schema.owner_work_id === passport.identity.stable_work_id ? "" : "PARAMETER_SCHEMA_WORK_OWNER_MISMATCH",
    hasInternalWorkSlug(passport.identity.professional_name_ru) ? "INTERNAL_WORK_SLUG_EXPOSED" : "",
    /\bPRELIMINARY_BOQ\b/i.test(passport.identity.professional_name_ru) ? "INTERNAL_ESTIMATE_LEVEL_EXPOSED" : "",
    ...passport.boq_rows.filter((row) => isPaddingRow(row.professional_name_ru)).map((row) => `PADDING_ROW:${row.row_id}`),
    ...passport.boq_rows.filter((row) => !row.formula_id || !passport.formulas.some((formula) => formula.formula_id === row.formula_id && formula.expression.trim())).map((row) => `FORMULA_FREE_QUANTITY:${row.row_id}`),
  ].filter(Boolean);
  return { ok: blockers.length === 0, blockers, parameter_schema: schema };
}
