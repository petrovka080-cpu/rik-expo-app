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

function parseCanonicalCatalogId(value: string): { namespace: string; workKey: string } | null {
  const match = /^canonical-work:([^:]+):(.+)$/u.exec(value);
  if (!match) return null;
  return { namespace: match[1], workKey: match[2] };
}

function isSameCatalogIdentity(existingCatalogId: string, requestedCatalogId: string): boolean {
  if (existingCatalogId === requestedCatalogId) return true;
  const existingCanonical = parseCanonicalCatalogId(existingCatalogId);
  const requestedCanonical = parseCanonicalCatalogId(requestedCatalogId);
  if (existingCanonical && requestedCanonical) return false;
  if (existingCanonical) return existingCanonical.workKey === requestedCatalogId;
  if (requestedCanonical) return requestedCanonical.workKey === existingCatalogId;
  return false;
}

export function canReuseConsumerRepairCanonicalDraft(
  input: CanonicalDraftReuseInput,
): boolean {
  const requestedCatalogId = input.requestedCatalogId?.trim() ?? "";
  if (!requestedCatalogId) return false;
  return input.existingReleaseId === input.currentReleaseId
    && isSameCatalogIdentity(input.existingCatalogId.trim(), requestedCatalogId)
    && normalizeRequestText(input.existingSourceRequestText)
      === normalizeRequestText(input.requestedSourceRequestText);
}
