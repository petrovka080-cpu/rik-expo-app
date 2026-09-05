import { createHash } from "node:crypto";

import { canonicalEstimateStableJson } from "../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism";

export const R4_A6_GROUP50_SCENARIO_KINDS = [
  "nominal_p0",
  "lower_boundary",
  "upper_boundary",
  "decimal_quantity",
  "large_scale",
  "inclusion_branch_on",
  "inclusion_branch_off",
  "optional_p1_combination",
  "edit_recalculate",
  "double_edit",
  "restart_edit",
  "invalid_p0",
  "missing_p0",
  "null_price",
  "mixed_available_unavailable_price",
  "professional_pdf_projection",
  "procurement_projection",
  "history_projection",
  "photo_contract",
  "marketplace_eligibility",
  "alias_resolution",
  "long_russian_name",
  "unit_conversion",
  "boundary_rounding",
  "duplicate_double_count_detection",
  ...Array.from({ length: 25 }, (_, index) => `deterministic_scale_variant_${String(index + 1).padStart(2, "0")}`),
] as const;

export type R4A6Group50Parameter = {
  parameter_id: string;
  value_type: string;
  required: boolean;
  default_value: unknown;
  constraints_json: Record<string, unknown> | null;
  truth_metadata?: Record<string, unknown> | null;
  approved_template_baseline_id?: string | null;
};

export type R4A6Group50Case = {
  caseId: string;
  caseOrdinal: number;
  scenarioKind: string;
  catalogId: string;
  definitionVersionId: string;
  baselineSha256: string;
  inputFingerprint: string;
  parameterPatch: Record<string, unknown>;
  missingParameterId: string | null;
  expectedOutcome: "GREEN" | "PARAMETER_VALIDATION_FAILED";
};

function sha256(value: unknown): string {
  return createHash("sha256").update(canonicalEstimateStableJson(value), "utf8").digest("hex");
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function finite(value: unknown): number | null {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function explicitScenarioValue(parameter: R4A6Group50Parameter): unknown {
  const constraints = record(parameter.constraints_json);
  if (parameter.value_type === "decimal" || parameter.value_type === "integer") {
    const minimum = finite(constraints.min);
    const maximum = finite(constraints.max);
    let value = minimum == null ? 1 : Math.max(minimum, 1);
    if (maximum != null) value = Math.min(maximum, value);
    return parameter.value_type === "integer" ? Math.ceil(value) : value;
  }
  if (parameter.value_type === "boolean") return false;
  if (parameter.value_type === "enum") {
    const values = Array.isArray(constraints.values) ? constraints.values : [];
    if (values.length === 0) throw new Error(`GROUP50_ENUM_SEED_MISSING:${parameter.parameter_id}`);
    return values[0];
  }
  if (parameter.value_type === "text") return "Явно задано сценарием Group50";
  throw new Error(`GROUP50_INPUT_SEED_UNSUPPORTED:${parameter.parameter_id}:${parameter.value_type}`);
}

function comparisonPeers(parameters: readonly R4A6Group50Parameter[]): Set<string> {
  const peers = new Set<string>();
  for (const parameter of parameters) {
    const constraints = record(parameter.constraints_json);
    for (const key of [
      "greaterThanOrEqualParameter",
      "greaterThanParameter",
      "lessThanOrEqualParameter",
      "lessThanParameter",
    ]) {
      if (constraints[key] != null) peers.add(String(constraints[key]));
    }
  }
  return peers;
}

function numericVariantOwner(
  parameters: readonly R4A6Group50Parameter[],
  baseline: Record<string, unknown>,
): R4A6Group50Parameter {
  const peers = comparisonPeers(parameters);
  const candidates = parameters.filter((parameter) => {
    if (!['decimal', 'integer'].includes(parameter.value_type)) return false;
    if (finite(baseline[parameter.parameter_id]) == null) return false;
    const constraints = record(parameter.constraints_json);
    if (Object.keys(constraints).some((key) => /Parameter$/u.test(key))) return false;
    if (peers.has(parameter.parameter_id)) return false;
    const minimum = finite(constraints.min);
    const maximum = finite(constraints.max);
    if (minimum != null && maximum != null && maximum <= minimum) return false;
    if (parameter.value_type === "integer" && minimum != null && maximum != null && maximum - minimum < 60) {
      return false;
    }
    return true;
  });
  const preferred = candidates.find((parameter) => parameter.required && parameter.value_type === "decimal")
    ?? candidates.find((parameter) => parameter.value_type === "decimal")
    ?? candidates.find((parameter) => parameter.required)
    ?? candidates[0];
  if (!preferred) throw new Error("GROUP50_UNIQUE_NUMERIC_VARIANT_OWNER_MISSING");
  return preferred;
}

function numericVariant(
  parameter: R4A6Group50Parameter,
  baselineValue: unknown,
  caseOrdinal: number,
): number {
  const constraints = record(parameter.constraints_json);
  const minimum = finite(constraints.min);
  const maximum = finite(constraints.max);
  const baseline = finite(baselineValue) ?? Math.max(minimum ?? 1, 1);
  let value: number;
  if (caseOrdinal === 1) {
    value = minimum == null ? Math.max(0.001, baseline * 0.5) : minimum === 0 ? 0.001 : minimum;
  } else if (caseOrdinal === 2) {
    value = maximum == null ? Math.max(baseline * 2, baseline + 1) : maximum;
  } else if (caseOrdinal === 4) {
    value = maximum == null
      ? Math.max(1_000, baseline * 1_000)
      : minimum == null
        ? maximum * 0.95
        : minimum + (maximum - minimum) * 0.95;
  } else if (minimum != null && maximum != null) {
    value = minimum + (maximum - minimum) * ((caseOrdinal + 1) / 52);
  } else {
    const floor = minimum == null ? 0.001 : minimum === 0 ? 0.001 : minimum;
    value = Math.max(floor, baseline * (0.75 + caseOrdinal / 20) + (caseOrdinal + 1) / 10_000);
    if (maximum != null) value = Math.min(maximum, value);
  }
  if (parameter.value_type === "integer") {
    value = Math.round(value);
    if (minimum != null) value = Math.max(Math.ceil(minimum), value);
    if (maximum != null) value = Math.min(Math.floor(maximum), value);
  } else {
    value = Number(value.toFixed(8));
  }
  return value;
}

function optionalBranchPatch(
  parameters: readonly R4A6Group50Parameter[],
  baseline: Record<string, unknown>,
  scenarioKind: string,
): Record<string, unknown> {
  if (scenarioKind === "inclusion_branch_on" || scenarioKind === "inclusion_branch_off") {
    const boolean = parameters.find((parameter) =>
      parameter.value_type === "boolean"
      && Object.keys(record(parameter.constraints_json)).length === 0);
    if (!boolean) return {};
    const enabled = scenarioKind === "inclusion_branch_on";
    const patch: Record<string, unknown> = { [boolean.parameter_id]: enabled };
    if (enabled) {
      for (const parameter of parameters) {
        const requiredWhen = record(record(parameter.constraints_json).requiredWhen);
        if (requiredWhen.parameterId === boolean.parameter_id && requiredWhen.equals === true
          && (baseline[parameter.parameter_id] == null || baseline[parameter.parameter_id] === "")) {
          patch[parameter.parameter_id] = explicitScenarioValue(parameter);
        }
      }
    }
    return patch;
  }
  if (scenarioKind === "optional_p1_combination") {
    const enumeration = parameters.find((parameter) => {
      const values = record(parameter.constraints_json).values;
      return !parameter.required && parameter.value_type === "enum"
        && Array.isArray(values) && values.length > 0;
    });
    if (enumeration) {
      const values = record(enumeration.constraints_json).values as unknown[];
      const alternate = values.find((value) => value !== baseline[enumeration.parameter_id]) ?? values[0];
      return { [enumeration.parameter_id]: alternate };
    }
  }
  return {};
}

export function buildR4A6Group50Case(input: {
  groupId: string;
  caseOrdinal: number;
  catalogId: string;
  definitionVersionId: string;
  parameters: readonly R4A6Group50Parameter[];
  baseline: Record<string, unknown>;
}): R4A6Group50Case {
  const scenarioKind = R4_A6_GROUP50_SCENARIO_KINDS[input.caseOrdinal];
  if (!scenarioKind) throw new Error("GROUP50_SCENARIO_ORDINAL_INVALID");
  const numericOwner = numericVariantOwner(input.parameters, input.baseline);
  const missingOwner = input.parameters.find((parameter) => parameter.required) ?? numericOwner;
  const parameterPatch: Record<string, unknown> = {
    [numericOwner.parameter_id]: numericVariant(
      numericOwner,
      input.baseline[numericOwner.parameter_id],
      input.caseOrdinal,
    ),
    ...optionalBranchPatch(input.parameters, input.baseline, scenarioKind),
  };
  let missingParameterId: string | null = null;
  let expectedOutcome: R4A6Group50Case["expectedOutcome"] = "GREEN";
  if (scenarioKind === "invalid_p0") {
    parameterPatch[numericOwner.parameter_id] = `invalid-r4-a6-${input.caseOrdinal}`;
    expectedOutcome = "PARAMETER_VALIDATION_FAILED";
  } else if (scenarioKind === "missing_p0") {
    missingParameterId = missingOwner.parameter_id;
    delete parameterPatch[missingParameterId];
    expectedOutcome = "PARAMETER_VALIDATION_FAILED";
  }
  const effectiveParameters = { ...input.baseline, ...parameterPatch };
  if (missingParameterId) delete effectiveParameters[missingParameterId];
  return {
    caseId: `${input.groupId}:case-${String(input.caseOrdinal + 1).padStart(2, "0")}`,
    caseOrdinal: input.caseOrdinal,
    scenarioKind,
    catalogId: input.catalogId,
    definitionVersionId: input.definitionVersionId,
    baselineSha256: sha256(input.baseline),
    inputFingerprint: sha256({ catalogId: input.catalogId, parameters: effectiveParameters }),
    parameterPatch,
    missingParameterId,
    expectedOutcome,
  };
}

export function assertR4A6Group50CaseSet(cases: readonly R4A6Group50Case[]): void {
  if (cases.length !== 50) throw new Error("STOP_GROUP50_DENOMINATOR");
  if (new Set(cases.map((item) => item.caseId)).size !== 50) {
    throw new Error("STOP_GROUP50_DUPLICATE_CASE_ID");
  }
  if (new Set(cases.map((item) => item.inputFingerprint)).size !== 50) {
    throw new Error("STOP_GROUP50_DUPLICATE_INPUT_FINGERPRINT");
  }
  if (new Set(cases.map((item) => item.scenarioKind)).size !== 50) {
    throw new Error("STOP_GROUP50_SCENARIO_COVERAGE");
  }
}
