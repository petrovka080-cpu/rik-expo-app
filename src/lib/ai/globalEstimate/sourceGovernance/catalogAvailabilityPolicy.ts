import {
  REAL_CATALOG_AVAILABILITY_SOURCE_TYPES,
  REAL_CATALOG_SOURCE_IDS,
  type RateSourceEvidence,
  type SourceGovernanceAvailabilityStatus,
  type SourceGovernanceFailure,
  type SourceGovernanceStockStatus,
} from "./rateSourceEvidenceTypes";

const FAKE_TEXT_PATTERN = /\b(fake|mock|stub|demo|placeholder|test supplier|sample supplier|supplier found)\b/i;

function failure(code: SourceGovernanceFailure["code"], path: string, message: string): SourceGovernanceFailure {
  return { code, path, message };
}

export function sourceTextLooksFake(value: string | null | undefined): boolean {
  return Boolean(value && FAKE_TEXT_PATTERN.test(value));
}

export function hasRealCatalogAvailabilitySource(input: {
  catalogItemId?: string | null;
  sourceId?: string | null;
  sourceType?: RateSourceEvidence["sourceType"] | null;
  evidence?: RateSourceEvidence[] | null;
}): boolean {
  if (input.sourceId && REAL_CATALOG_SOURCE_IDS.has(input.sourceId)) return true;
  if (input.sourceType && REAL_CATALOG_AVAILABILITY_SOURCE_TYPES.has(input.sourceType)) return true;
  if (input.catalogItemId && input.sourceId) return true;
  return (input.evidence ?? []).some((item) =>
    REAL_CATALOG_AVAILABILITY_SOURCE_TYPES.has(item.sourceType) && Boolean(item.sourceId)
  );
}

export function validateCatalogAvailabilityPolicy(input: {
  path?: string;
  catalogItemId?: string | null;
  sourceId?: string | null;
  sourceLabel?: string | null;
  sourceType?: RateSourceEvidence["sourceType"] | null;
  evidence?: RateSourceEvidence[] | null;
  availabilityStatus: SourceGovernanceAvailabilityStatus;
  stockStatus: SourceGovernanceStockStatus;
  supplierName?: string | null;
}): SourceGovernanceFailure[] {
  const path = input.path ?? "catalog";
  const failures: SourceGovernanceFailure[] = [];
  const hasRealSource = hasRealCatalogAvailabilitySource(input);

  if (input.availabilityStatus === "available" && !hasRealSource) {
    failures.push(failure(
      "AVAILABLE_WITHOUT_REAL_CATALOG_SOURCE",
      `${path}.availabilityStatus`,
      "Available status requires a real catalog, marketplace, or supplier quote source.",
    ));
  }
  if (input.stockStatus === "in_stock" && !hasRealSource) {
    failures.push(failure(
      "IN_STOCK_WITHOUT_REAL_CATALOG_SOURCE",
      `${path}.stockStatus`,
      "In-stock status requires a real catalog, marketplace, or supplier quote source.",
    ));
  }
  if (sourceTextLooksFake(input.sourceLabel)) {
    failures.push(failure("FAKE_SUPPLIER", `${path}.sourceLabel`, "Source label looks fake or placeholder."));
  }
  if (sourceTextLooksFake(input.supplierName)) {
    failures.push(failure("FAKE_SUPPLIER", `${path}.supplierName`, "Supplier name looks fake or placeholder."));
  }
  if (sourceTextLooksFake(input.availabilityStatus)) {
    failures.push(failure("FAKE_AVAILABILITY", `${path}.availabilityStatus`, "Availability status looks fake."));
  }
  if (sourceTextLooksFake(input.stockStatus)) {
    failures.push(failure("FAKE_STOCK", `${path}.stockStatus`, "Stock status looks fake."));
  }

  return failures;
}
