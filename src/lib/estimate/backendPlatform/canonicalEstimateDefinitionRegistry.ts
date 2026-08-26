export const CANONICAL_ESTIMATE_DEFINITION_REGISTRY_VERSION = "canonical-estimate-definition-registry-r1";

export type CanonicalEstimateRegistryDisposition =
  | "REAL_WORK"
  | "REDIRECT"
  | "QUARANTINE"
  | "LEGACY_READ_ONLY";

export type CanonicalEstimateRegistryEntry = {
  catalogId: string;
  disposition: CanonicalEstimateRegistryDisposition;
  selectable: boolean;
  currentSuccessorCatalogId: string | null;
  definitionVersionId: string | null;
  definitionReleaseId: string | null;
  searchReleaseId: string | null;
  domain: string | null;
  family: string | null;
  operation: string | null;
  variant: string | null;
  sourceIdentity: string | null;
  contentPassportIdentity: string | null;
  unresolvedDisposition: string | null;
};

export type CanonicalEstimateRegistryInput = {
  catalogId: unknown;
  manifestPresent: boolean;
  definitionPresent: boolean;
  searchDocumentPresent: boolean;
  definitionVersionId: unknown;
  definitionReleaseId: unknown;
  searchDefinitionVersionId: unknown;
  searchReleaseId: unknown;
  adjudicationClass: unknown;
  selectable: unknown;
  canonicalTargetCatalogId: unknown;
  replacementCatalogId: unknown;
  sourceMetadata?: unknown;
};

function text(value: unknown): string | null {
  if (value == null) return null;
  const normalized = String(value).trim();
  return normalized || null;
}

function metadataObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function metadataText(metadata: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = text(metadata[key]);
    if (value) return value;
  }
  return null;
}

export function buildCanonicalEstimateRegistryEntry(
  input: CanonicalEstimateRegistryInput,
): CanonicalEstimateRegistryEntry {
  const catalogId = text(input.catalogId);
  if (!catalogId) throw new Error("CANONICAL_REGISTRY_CATALOG_ID_REQUIRED");
  const definitionVersionId = text(input.definitionVersionId);
  const searchDefinitionVersionId = text(input.searchDefinitionVersionId);
  const adjudicationClass = text(input.adjudicationClass)?.toUpperCase() ?? null;
  const canonicalTargetCatalogId = text(input.canonicalTargetCatalogId);
  const replacementCatalogId = text(input.replacementCatalogId);
  const redirectTarget = canonicalTargetCatalogId ?? replacementCatalogId;
  const isRealWork = input.manifestPresent
    && input.definitionPresent
    && input.searchDocumentPresent
    && adjudicationClass === "EFFECTIVE_WORK"
    && input.selectable === true
    && redirectTarget == null
    && definitionVersionId != null
    && searchDefinitionVersionId === definitionVersionId;
  const isLegacy = adjudicationClass === "LEGACY_READ_ONLY";
  const isRedirect = !isLegacy && redirectTarget != null;
  const disposition: CanonicalEstimateRegistryDisposition = isRealWork
    ? "REAL_WORK"
    : isLegacy
      ? "LEGACY_READ_ONLY"
      : isRedirect
        ? "REDIRECT"
        : "QUARANTINE";
  const unresolvedDisposition = isRealWork
    ? null
    : !input.manifestPresent
      ? "MANIFEST_ENTRY_MISSING"
      : !input.definitionPresent
        ? "DEFINITION_VERSION_MISSING"
        : !input.searchDocumentPresent
          ? "SEARCH_DOCUMENT_MISSING"
          : isRedirect
            ? "UNRESOLVED_REDIRECT"
            : adjudicationClass !== "EFFECTIVE_WORK" || input.selectable !== true
              ? adjudicationClass ?? "SEARCH_DOCUMENT_NOT_SELECTABLE"
              : searchDefinitionVersionId !== definitionVersionId
                ? "SEARCH_DEFINITION_VERSION_MISMATCH"
                : "REGISTRY_ENTRY_QUARANTINED";
  const metadata = metadataObject(input.sourceMetadata);
  return {
    catalogId,
    disposition,
    selectable: isRealWork,
    currentSuccessorCatalogId: isRealWork ? catalogId : isRedirect ? redirectTarget : null,
    definitionVersionId,
    definitionReleaseId: text(input.definitionReleaseId),
    searchReleaseId: text(input.searchReleaseId),
    domain: metadataText(metadata, "domain", "workDomain"),
    family: metadataText(metadata, "family", "workFamily"),
    operation: metadataText(metadata, "operation", "workOperation"),
    variant: metadataText(metadata, "variant", "workVariant"),
    sourceIdentity: metadataText(metadata, "sourceManifestSha256", "source_manifest_sha256", "sourceIdentity"),
    contentPassportIdentity: metadataText(metadata, "contentPassportSha256", "content_passport_sha256", "contentPassportIdentity"),
    unresolvedDisposition,
  };
}

export class CanonicalEstimateDefinitionRegistry {
  readonly version = CANONICAL_ESTIMATE_DEFINITION_REGISTRY_VERSION;
  private readonly entriesByCatalogId: Map<string, CanonicalEstimateRegistryEntry>;

  constructor(entries: readonly CanonicalEstimateRegistryEntry[]) {
    this.entriesByCatalogId = new Map();
    for (const entry of entries) {
      if (this.entriesByCatalogId.has(entry.catalogId)) {
        throw new Error(`CANONICAL_REGISTRY_DUPLICATE_CATALOG_ID:${entry.catalogId}`);
      }
      if (entry.disposition === "REAL_WORK"
        && (!entry.selectable || entry.currentSuccessorCatalogId !== entry.catalogId)) {
        throw new Error(`CANONICAL_REGISTRY_REAL_WORK_SUCCESSOR_INVALID:${entry.catalogId}`);
      }
      if (entry.disposition === "REDIRECT" && !entry.currentSuccessorCatalogId) {
        throw new Error(`CANONICAL_REGISTRY_REDIRECT_TARGET_REQUIRED:${entry.catalogId}`);
      }
      this.entriesByCatalogId.set(entry.catalogId, Object.freeze({ ...entry }));
    }
  }

  get(catalogId: string): CanonicalEstimateRegistryEntry | null {
    return this.entriesByCatalogId.get(String(catalogId).trim()) ?? null;
  }

  requireSelectable(catalogId: string): CanonicalEstimateRegistryEntry {
    const entry = this.get(catalogId);
    if (!entry || !entry.selectable || entry.disposition !== "REAL_WORK") {
      throw new Error(`CANONICAL_REGISTRY_NONSELECTABLE:${String(catalogId).trim()}`);
    }
    return entry;
  }

  entries(): CanonicalEstimateRegistryEntry[] {
    return [...this.entriesByCatalogId.values()];
  }
}
