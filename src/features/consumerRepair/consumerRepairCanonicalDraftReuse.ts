type CanonicalDraftReuseInput = {
  existingReleaseId: string;
  currentReleaseId: string;
  existingCatalogId: string;
  requestedCatalogId: string | null | undefined;
  existingSourceRequestText: string | null | undefined;
  requestedSourceRequestText: string;
};

function normalizeRequestText(value: string | null | undefined): string {
  return value?.trim().replace(/\s+/gu, " ") ?? "";
}

export function canReuseConsumerRepairCanonicalDraft(
  input: CanonicalDraftReuseInput,
): boolean {
  const requestedCatalogId = input.requestedCatalogId?.trim() ?? "";
  if (!requestedCatalogId) return false;
  return input.existingReleaseId === input.currentReleaseId
    && input.existingCatalogId === requestedCatalogId
    && normalizeRequestText(input.existingSourceRequestText)
      === normalizeRequestText(input.requestedSourceRequestText);
}
