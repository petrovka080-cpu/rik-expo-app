export function hasProcurementRequestExecutorEvidence(evidenceRefs: readonly string[]): boolean {
  return evidenceRefs.some((ref) => ref.trim().length > 0);
}
