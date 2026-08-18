const CANONICAL_ESTIMATE_REVISION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function canonicalEstimateRevisionIdFromRoute(
  value: string | null | undefined,
): string | null {
  const normalized = value?.trim() ?? "";
  return CANONICAL_ESTIMATE_REVISION_ID_PATTERN.test(normalized)
    ? normalized.toLowerCase()
    : null;
}
