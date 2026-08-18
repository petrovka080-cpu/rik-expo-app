import type { CanonicalEstimateCatalogItem } from "./contracts";
import { hasHumanReadableAiEstimateParameterPassport } from "../aiEstimateRuParameterDictionary";

type ParameterSchema = CanonicalEstimateCatalogItem["parameterSchema"][number];

const DERIVED_OR_INTERNAL_PARAMETER_ID = /(?:^quantity_|^unit_price_|(?:^|_)(?:compacted_volume|volume_m3|coverage_area|work_quantity|factor|coefficient|calculated|derived|consumption_total|mass_t|material_m3|labor_man_hours|machine_hours|trip_count|service_count|test_count|test_frequency|test_interval|inspection_interval|control_interval|protocol_count|documentation_count|productivity)(?:_|$))/iu;
const DERIVED_OR_INTERNAL_TITLE = /^\s*(?:Количество|Объём|Объем):/iu;
const DERIVED_OR_INTERNAL_UNIT = new Set([
  "document",
  "machine_hour",
  "man_hour",
  "person_shift",
  "service",
  "t_km",
  "test",
  "trip",
]);

/**
 * Product editor admission is intentionally fail-closed. A parameter can be
 * editable only when the immutable definition declares user ownership and a
 * concrete calculation consumer. Formula impact alone never proves ownership.
 */
export function isCanonicalEstimateUserEditableParameter(schema: ParameterSchema): boolean {
  if (schema.visibilityRole !== "USER_INPUT") return false;
  if (!hasHumanReadableAiEstimateParameterPassport(schema.parameterId, schema.titleRu)) return false;
  if (DERIVED_OR_INTERNAL_PARAMETER_ID.test(schema.parameterId)) return false;
  if (DERIVED_OR_INTERNAL_TITLE.test(schema.titleRu)) return false;
  if (schema.guide?.guideKind === "DERIVED_VALUE_RULE") return false;
  if (schema.unitId && DERIVED_OR_INTERNAL_UNIT.has(schema.unitId.toLocaleLowerCase("en-US"))) return false;
  return Boolean(
    (schema.formulaConsumers?.length ?? 0) > 0
    || (schema.resourceBranchConsumers?.length ?? 0) > 0
  );
}

export function canonicalEstimateParameterChoiceLabelRu(
  parameterId: string,
  value: unknown,
  fallback?: string,
): string {
  const normalized = String(value);
  if (parameterId === "estimate_scope_mode") {
    if (normalized === "MINIMAL_EXPLICIT_SCOPE") return "Базовый состав";
    if (normalized === "FULL_APPLICABLE_SCOPE") return "Полный применимый состав";
  }
  return fallback?.trim() || normalized;
}
