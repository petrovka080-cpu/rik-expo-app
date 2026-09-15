import type {
  CanonicalEstimateRevisionRowView,
  CanonicalEstimateRevisionView,
} from "./contracts";
import {
  resolveProfessionalPhysicalNormParameterValuesV1,
  type ProfessionalPhysicalNormApplicabilityResolutionV1,
} from "../v4/domainFactory";
import type { ProfessionalParameterValueV4 } from "../v4/professionalProjectAssemblyV4";

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord | null {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function traceIdentity(normativeTrace: unknown): JsonRecord | null {
  if (!Array.isArray(normativeTrace)) return null;
  for (const raw of normativeTrace) {
    const trace = record(raw);
    if (trace) return trace;
  }
  return null;
}

function parameterValues(
  parameters: Readonly<Record<string, unknown>>,
  capturedAt: string,
): Readonly<Record<string, ProfessionalParameterValueV4>> {
  return Object.fromEntries(Object.entries(parameters).flatMap(([parameterId, value]) => {
    if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") return [];
    return [[parameterId, {
      value,
      unit_id: parameterId.endsWith("_m2") ? "m2" : null,
      source_type: parameterId === "product_profile_id" ? "APPLICABLE_NORM" : "USER_EXPLICIT",
      source_id: `canonical-backend-physical-input:${parameterId}`,
      captured_at: capturedAt,
      confidence: "high",
      applicability: "Value preserved by the immutable canonical backend revision.",
    } satisfies ProfessionalParameterValueV4]];
  }));
}

export function resolveCanonicalEstimatePhysicalNormApplicabilityV1(input: {
  parameters: Readonly<Record<string, unknown>>;
  capturedAt: string;
  resourceGraph: unknown;
  normativeTrace: unknown;
}): ProfessionalPhysicalNormApplicabilityResolutionV1 | null {
  const resourceGraph = record(input.resourceGraph);
  const binding = record(resourceGraph?.professionalPhysicalNormBindingV1);
  const trace = traceIdentity(input.normativeTrace);
  if (!binding || !trace) return null;
  const scopeMode = text(binding.scope_mode);
  if (scopeMode !== "MINIMAL_EXPLICIT_SCOPE" && scopeMode !== "FULL_APPLICABLE_SCOPE") return null;
  const resolution = resolveProfessionalPhysicalNormParameterValuesV1({
    technology_class: text(binding.technology_class),
    operation_class: text(binding.operation_class),
    material_system: text(binding.material_system) || undefined,
    scope_mode: scopeMode,
    parameter_values: parameterValues(input.parameters, input.capturedAt),
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
