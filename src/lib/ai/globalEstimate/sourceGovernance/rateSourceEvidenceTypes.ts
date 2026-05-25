export type RateSourceEvidenceSourceType =
  | "catalog_item"
  | "internal_marketplace"
  | "manual_admin_rate"
  | "configured_reference"
  | "supplier_quote"
  | "stale_cache";

export type RateSourceEvidenceFreshness = "fresh" | "stale" | "expired" | "unknown";
export type RateSourceEvidenceConfidence = "high" | "medium" | "low";

export type RateSourceEvidence = {
  sourceId: string;
  sourceType: RateSourceEvidenceSourceType;
  label: string;
  checkedAt: string;
  freshness: RateSourceEvidenceFreshness;
  confidence: RateSourceEvidenceConfidence;
  url?: string;
};

export type SourceGovernanceAvailabilityStatus = "available" | "unavailable" | "unknown";
export type SourceGovernanceStockStatus = "in_stock" | "out_of_stock" | "unknown";

export type SourceGovernanceFailureCode =
  | "PRICE_WITHOUT_SOURCE"
  | "SOURCE_EVIDENCE_INCOMPLETE"
  | "HIGH_CONFIDENCE_STALE_SOURCE"
  | "AVAILABLE_WITHOUT_REAL_CATALOG_SOURCE"
  | "IN_STOCK_WITHOUT_REAL_CATALOG_SOURCE"
  | "SUPPLIER_WITHOUT_EVIDENCE"
  | "FAKE_AVAILABILITY"
  | "FAKE_STOCK"
  | "FAKE_SUPPLIER";

export type SourceGovernanceFailure = {
  code: SourceGovernanceFailureCode;
  path: string;
  message: string;
};

export type SourceGovernanceValidationResult = {
  ok: boolean;
  failures: SourceGovernanceFailure[];
  priceWithoutSourceFound: boolean;
  highConfidenceStaleSourceFound: boolean;
  fakeAvailabilityFound: boolean;
  fakeStockFound: boolean;
  fakeSupplierFound: boolean;
};

export const REAL_CATALOG_AVAILABILITY_SOURCE_TYPES = new Set<RateSourceEvidenceSourceType>([
  "catalog_item",
  "internal_marketplace",
  "supplier_quote",
]);

export const REAL_CATALOG_SOURCE_IDS = new Set(["catalog_items", "rik_items"]);

export function normalizeRateSourceEvidenceFreshness(value: string | null | undefined): RateSourceEvidenceFreshness {
  if (value === "fresh") return "fresh";
  if (value === "stale" || value === "aging") return "stale";
  if (value === "expired") return "expired";
  return "unknown";
}

export function hasSourceIdentity(value: {
  sourceId?: string | null;
  sourceLabel?: string | null;
  sourceType?: string | null;
}): boolean {
  return Boolean(value.sourceId?.trim() || value.sourceLabel?.trim() || value.sourceType?.trim());
}
