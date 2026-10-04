export type CanonicalEstimateOperationReference = {
  contractVersion: "canonical-operation-resource/v1";
  groupId: string;
  groupTitleRu: string;
  operationId: string;
  operationTitleRu: string;
  completionCriterionRu: string;
};

export function canonicalEstimateOperationReference(value: unknown): CanonicalEstimateOperationReference | null {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  const keys = ["groupId", "groupTitleRu", "operationId", "operationTitleRu", "completionCriterionRu"] as const;
  if (candidate.contractVersion !== "canonical-operation-resource/v1"
    || keys.some(key => typeof candidate[key] !== "string" || !String(candidate[key]).trim())) return null;
  return candidate as CanonicalEstimateOperationReference;
}
