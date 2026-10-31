import type { CanonicalEstimateResourceDefinition } from './canonicalEstimateCompileCore';

const NON_PAYABLE_COST_TREATMENTS = new Set([
  "INCLUDED_IN_RESOURCE_ROWS",
  "INFORMATIONAL_SCOPE",
  "CONTROL_OR_DOCUMENT",
]);

export function canonicalEstimateResourceIncludedByDefault(
  resource: Pick<CanonicalEstimateResourceDefinition, "resource_graph" | "source_metadata">,
): boolean {
  const raw = resource.resource_graph?.costTreatment
    ?? resource.source_metadata?.costTreatment;
  return !NON_PAYABLE_COST_TREATMENTS.has(String(raw ?? "").trim());
}
