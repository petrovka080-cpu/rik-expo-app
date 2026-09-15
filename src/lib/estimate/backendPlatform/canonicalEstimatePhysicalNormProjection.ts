import type {
  CanonicalEstimateRevisionRowView,
  CanonicalEstimateRevisionView,
} from "./contracts";
import {
  resolveProfessionalPhysicalNormParameterValuesV1,
  type ProfessionalPhysicalNormApplicabilityResolutionV1,
} from "../v4/domainFactory";
import type { ProfessionalParameterValueV4 } from "../v4/professionalProjectAssemblyV4";
import {
  compileFormulaGraph,
  evaluateFormulaGraph,
  type FormulaParameterValue,
} from "./formulaGraph";

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord | null {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function traceIdentity(normativeTrace: unknown, binding: JsonRecord): JsonRecord | null {
  if (!Array.isArray(normativeTrace)) return null;
  const expectedSourceId = text(binding.source_id);
  if (expectedSourceId) {
    const exact = normativeTrace.map(record).find((trace) => trace != null
      && text(trace.source_id ?? trace.sourceId ?? trace.document_code) === expectedSourceId);
    if (exact) return exact;
  }
  for (const raw of normativeTrace) {
    const trace = record(raw);
    if (trace) return trace;
  }
  return null;
}

function parameterValues(
  parameters: Readonly<Record<string, unknown>>,
  capturedAt: string,
  units: Readonly<Record<string, unknown>> = {},
): Readonly<Record<string, ProfessionalParameterValueV4>> {
  return Object.fromEntries(Object.entries(parameters).flatMap(([parameterId, value]) => {
    if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") return [];
    return [[parameterId, {
      value,
      unit_id: text(units[parameterId]) || (parameterId.endsWith("_m2") ? "m2" : null),
      source_type: parameterId === "product_profile_id" ? "APPLICABLE_NORM" : "USER_EXPLICIT",
      source_id: `canonical-backend-physical-input:${parameterId}`,
      captured_at: capturedAt,
      confidence: "high",
      applicability: "Value preserved by the immutable canonical backend revision.",
    } satisfies ProfessionalParameterValueV4]];
  }));
}

function bindingProjection(
  parameters: Readonly<Record<string, unknown>>,
  binding: JsonRecord,
): Readonly<Record<string, unknown>> | null {
  const projection = record(binding.parameter_projection_v1);
  if (!projection) return parameters;
  const projected: Record<string, unknown> = { ...parameters };
  const aliases = record(projection.aliases) ?? {};
  for (const [targetParameterId, sourceParameterIdValue] of Object.entries(aliases)) {
    const sourceParameterId = text(sourceParameterIdValue);
    if (!sourceParameterId) return null;
    projected[targetParameterId] = projected[sourceParameterId];
  }
  const formulaParameters = Object.fromEntries(Object.entries(projected).flatMap(([parameterId, value]) =>
    typeof value === "string" || typeof value === "number" || typeof value === "bigint" || typeof value === "boolean"
      ? [[parameterId, value as FormulaParameterValue]]
      : []));
  const formulas = record(projection.formulas) ?? {};
  try {
    for (const [targetParameterId, expressionValue] of Object.entries(formulas)) {
      const expression = text(expressionValue);
      if (!expression) return null;
      const evaluated = evaluateFormulaGraph(compileFormulaGraph(expression).ast, formulaParameters);
      const numeric = Number(evaluated);
      projected[targetParameterId] = Number.isFinite(numeric) ? numeric : evaluated;
      formulaParameters[targetParameterId] = projected[targetParameterId] as FormulaParameterValue;
    }
  } catch {
    return null;
  }
  return projected;
}

export function isCanonicalEstimatePhysicalNormBindingActiveV1(input: {
  parameters: Readonly<Record<string, unknown>>;
  resourceGraph: unknown;
}): boolean {
  const resourceGraph = record(input.resourceGraph);
  const binding = record(resourceGraph?.professionalPhysicalNormBindingV1);
  if (!binding) return false;
  const activation = record(binding.activation);
  if (!activation) return true;
  const parameterId = text(activation.parameter_id);
  return parameterId !== "" && input.parameters[parameterId] === activation.equals;
}

export function resolveCanonicalEstimatePhysicalNormApplicabilityV1(input: {
  parameters: Readonly<Record<string, unknown>>;
  capturedAt: string;
  resourceGraph: unknown;
  normativeTrace: unknown;
}): ProfessionalPhysicalNormApplicabilityResolutionV1 | null {
  const resourceGraph = record(input.resourceGraph);
  const binding = record(resourceGraph?.professionalPhysicalNormBindingV1);
  if (!binding) return null;
  const trace = traceIdentity(input.normativeTrace, binding);
  if (!trace) return null;
  if (!isCanonicalEstimatePhysicalNormBindingActiveV1(input)) return null;
  const scopeMode = text(binding.scope_mode);
  if (scopeMode !== "MINIMAL_EXPLICIT_SCOPE" && scopeMode !== "FULL_APPLICABLE_SCOPE") return null;
  const projectedParameters = bindingProjection(input.parameters, binding);
  if (!projectedParameters) return null;
  const projection = record(binding.parameter_projection_v1);
  const resolution = resolveProfessionalPhysicalNormParameterValuesV1({
    technology_class: text(binding.technology_class),
    operation_class: text(binding.operation_class),
    material_system: text(binding.material_system) || undefined,
    scope_mode: scopeMode,
    parameter_values: parameterValues(projectedParameters, input.capturedAt, record(projection?.units) ?? {}),
  });
  const traceSourceId = text(trace.source_id ?? trace.sourceId ?? trace.document_code);
  const traceNormId = text(trace.norm_id ?? trace.normId);
  const traceVersion = text(trace.source_document_version ?? trace.normVersion);
  const traceHash = text(trace.source_definition_hash);
  if (
    resolution.source_id !== traceSourceId ||
    resolution.norm_id !== traceNormId ||
    resolution.source_document_version !== traceVersion ||
    resolution.source_definition_hash !== traceHash
  ) {
    return null;
  }
  return resolution;
}

/**
 * Replays a definition-declared physical binding against the immutable values
 * of the backend revision. The adapter only projects the resolver result; it
 * does not evaluate a second quantity formula.
 */
export function projectCanonicalEstimatePhysicalNormApplicabilityV1(input: {
  revision: CanonicalEstimateRevisionView;
  row: CanonicalEstimateRevisionRowView;
}): ProfessionalPhysicalNormApplicabilityResolutionV1 | null {
  const resourceGraph = record(input.row.calculationTrace?.resourceGraph);
  return resolveCanonicalEstimatePhysicalNormApplicabilityV1({
    parameters: input.revision.parameters,
    capturedAt: input.revision.createdAt,
    resourceGraph,
    normativeTrace: input.row.normativeTrace,
  });
}
