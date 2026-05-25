import { validateCatalogAvailabilityPolicy } from "./catalogAvailabilityPolicy";
import type { EstimateRowSourceEvidence } from "../globalEstimateTypes";
import {
  hasSourceIdentity,
  normalizeRateSourceEvidenceFreshness,
  type RateSourceEvidence,
  type SourceGovernanceAvailabilityStatus,
  type SourceGovernanceFailure,
  type SourceGovernanceStockStatus,
  type SourceGovernanceValidationResult,
} from "./rateSourceEvidenceTypes";

function failure(code: SourceGovernanceFailure["code"], path: string, message: string): SourceGovernanceFailure {
  return { code, path, message };
}

function summarize(failures: SourceGovernanceFailure[]): SourceGovernanceValidationResult {
  return {
    ok: failures.length === 0,
    failures,
    priceWithoutSourceFound: failures.some((item) => item.code === "PRICE_WITHOUT_SOURCE"),
    highConfidenceStaleSourceFound: failures.some((item) => item.code === "HIGH_CONFIDENCE_STALE_SOURCE"),
    fakeAvailabilityFound: failures.some((item) => item.code === "FAKE_AVAILABILITY" || item.code === "AVAILABLE_WITHOUT_REAL_CATALOG_SOURCE"),
    fakeStockFound: failures.some((item) => item.code === "FAKE_STOCK" || item.code === "IN_STOCK_WITHOUT_REAL_CATALOG_SOURCE"),
    fakeSupplierFound: failures.some((item) => item.code === "FAKE_SUPPLIER" || item.code === "SUPPLIER_WITHOUT_EVIDENCE"),
  };
}

export function mapEstimateRowEvidenceToRateSourceEvidence(
  evidence: EstimateRowSourceEvidence,
): RateSourceEvidence {
  const sourceType: RateSourceEvidence["sourceType"] =
    evidence.sourceType === "supplier_catalog_api"
      ? "catalog_item"
      : evidence.sourceType === "external_marketplace"
        ? "internal_marketplace"
        : evidence.sourceType === "uploaded_price_list" || evidence.sourceType === "official_tax_source"
          ? "configured_reference"
          : evidence.sourceType;
  return {
    sourceId: evidence.sourceId,
    sourceType,
    label: evidence.label,
    checkedAt: evidence.checkedAt,
    freshness: normalizeRateSourceEvidenceFreshness(evidence.freshness),
    confidence: evidence.confidence,
    url: evidence.url,
  };
}

export function validateRateSourceEvidence(evidence: RateSourceEvidence | readonly RateSourceEvidence[]): SourceGovernanceValidationResult {
  const items = Array.isArray(evidence) ? evidence : [evidence];
  const failures: SourceGovernanceFailure[] = [];

  for (const [index, item] of items.entries()) {
    const path = `sourceEvidence.${index}`;
    if (!item.sourceId || !item.sourceType || !item.label || !item.checkedAt) {
      failures.push(failure(
        "SOURCE_EVIDENCE_INCOMPLETE",
        path,
        "Rate source evidence requires sourceId, sourceType, label, and checkedAt.",
      ));
    }
    if (item.confidence === "high" && normalizeRateSourceEvidenceFreshness(item.freshness) !== "fresh") {
      failures.push(failure(
        "HIGH_CONFIDENCE_STALE_SOURCE",
        `${path}.confidence`,
        "High confidence requires fresh source evidence.",
      ));
    }
  }

  return summarize(failures);
}

export function validatePricedRateSourceEvidence(input: {
  path?: string;
  unitPrice?: number | null;
  sourceId?: string | null;
  sourceLabel?: string | null;
  sourceType?: RateSourceEvidence["sourceType"] | null;
  confidence?: RateSourceEvidence["confidence"] | null;
  evidence?: readonly RateSourceEvidence[] | null;
  catalogItemId?: string | null;
  availabilityStatus?: SourceGovernanceAvailabilityStatus;
  stockStatus?: SourceGovernanceStockStatus;
  supplierName?: string | null;
}): SourceGovernanceValidationResult {
  const path = input.path ?? "row";
  const failures: SourceGovernanceFailure[] = [];
  const unitPrice = input.unitPrice ?? null;
  const evidence = [...(input.evidence ?? [])];

  if (unitPrice != null && unitPrice > 0 && !input.sourceId && evidence.length === 0) {
    failures.push(failure(
      "PRICE_WITHOUT_SOURCE",
      `${path}.sourceId`,
      "Unit price requires sourceId or source evidence.",
    ));
  }
  if (input.supplierName && !hasSourceIdentity(input) && evidence.length === 0) {
    failures.push(failure(
      "SUPPLIER_WITHOUT_EVIDENCE",
      `${path}.supplierName`,
      "Supplier label requires source evidence.",
    ));
  }

  if (evidence.length > 0) {
    failures.push(...validateRateSourceEvidence(evidence).failures.map((item) => ({
      ...item,
      path: `${path}.${item.path}`,
    })));
  }

  if (input.confidence === "high") {
    const staleEvidence = evidence.some((item) => normalizeRateSourceEvidenceFreshness(item.freshness) !== "fresh");
    if (staleEvidence) {
      failures.push(failure(
        "HIGH_CONFIDENCE_STALE_SOURCE",
        `${path}.confidence`,
        "High confidence cannot be used with stale, expired, or unknown evidence.",
      ));
    }
  }

  failures.push(...validateCatalogAvailabilityPolicy({
    path,
    catalogItemId: input.catalogItemId,
    sourceId: input.sourceId,
    sourceLabel: input.sourceLabel,
    sourceType: input.sourceType,
    evidence,
    availabilityStatus: input.availabilityStatus ?? "unknown",
    stockStatus: input.stockStatus ?? "unknown",
    supplierName: input.supplierName,
  }));

  return summarize(failures);
}
