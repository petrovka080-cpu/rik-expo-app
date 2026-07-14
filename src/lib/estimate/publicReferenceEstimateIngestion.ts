export type PublicReferenceEstimateValidationStatus =
  | "REFERENCE_DISCOVERED"
  | "REFERENCE_PARSED"
  | "REFERENCE_NORMALIZED"
  | "REFERENCE_CROSS_CHECKED"
  | "REFERENCE_EXPERT_VALIDATED"
  | "REFERENCE_REJECTED";

export type PublicReferenceEstimateLicense =
  | "OPEN_LICENSE"
  | "PUBLIC_DOMAIN"
  | "PERMISSION_GRANTED"
  | "CITATION_ONLY_REVIEW"
  | "LICENSE_UNKNOWN"
  | "LICENSE_REJECTED";

export type PublicReferenceEstimateLineItem = {
  title: string;
  unit: string;
  quantity: number | null;
  section?: string | null;
  source_row_id?: string | null;
};

export type PublicReferenceEstimatePassport = {
  reference_id: string;
  title: string;
  source_url: string;
  publisher: string;
  jurisdiction: string;
  published_at: string | null;
  accessed_at: string;
  license: PublicReferenceEstimateLicense;
  work_family: string;
  project_type: string;
  scale: string;
  currency: string | null;
  line_items: PublicReferenceEstimateLineItem[];
  units: string[];
  parameters: Record<string, number | string | boolean | null>;
  document_hash: string;
  validation_status: PublicReferenceEstimateValidationStatus;
};

export type PublicReferenceEstimateIngestionAudit = {
  accepted_for_registry: boolean;
  can_influence_structure: boolean;
  can_influence_production_quantities: boolean;
  blockers: string[];
};

const ALLOWED_REFERENCE_LICENSES = new Set<PublicReferenceEstimateLicense>([
  "OPEN_LICENSE",
  "PUBLIC_DOMAIN",
  "PERMISSION_GRANTED",
  "CITATION_ONLY_REVIEW",
]);

const STRUCTURE_STATUSES = new Set<PublicReferenceEstimateValidationStatus>([
  "REFERENCE_NORMALIZED",
  "REFERENCE_CROSS_CHECKED",
  "REFERENCE_EXPERT_VALIDATED",
]);

const PRODUCTION_QUANTITY_STATUSES = new Set<PublicReferenceEstimateValidationStatus>([
  "REFERENCE_CROSS_CHECKED",
  "REFERENCE_EXPERT_VALIDATED",
]);

function nonEmpty(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function validSourceUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function hasStableContentHash(value: string): boolean {
  return /^[a-f0-9]{32,128}$/i.test(value.trim());
}

function push(blockers: string[], code: string): void {
  if (!blockers.includes(code)) blockers.push(code);
}

export function auditPublicReferenceEstimatePassport(
  passport: PublicReferenceEstimatePassport,
): PublicReferenceEstimateIngestionAudit {
  const blockers: string[] = [];
  if (!nonEmpty(passport.reference_id)) push(blockers, "REFERENCE_ID_MISSING");
  if (!nonEmpty(passport.title)) push(blockers, "REFERENCE_TITLE_MISSING");
  if (!validSourceUrl(passport.source_url)) push(blockers, "REFERENCE_SOURCE_URL_INVALID");
  if (!nonEmpty(passport.publisher)) push(blockers, "REFERENCE_PUBLISHER_MISSING");
  if (!nonEmpty(passport.jurisdiction)) push(blockers, "REFERENCE_JURISDICTION_MISSING");
  if (!nonEmpty(passport.accessed_at)) push(blockers, "REFERENCE_ACCESSED_AT_MISSING");
  if (!nonEmpty(passport.work_family)) push(blockers, "REFERENCE_WORK_FAMILY_MISSING");
  if (!nonEmpty(passport.project_type)) push(blockers, "REFERENCE_PROJECT_TYPE_MISSING");
  if (!nonEmpty(passport.scale)) push(blockers, "REFERENCE_SCALE_MISSING");
  if (!hasStableContentHash(passport.document_hash)) push(blockers, "REFERENCE_DOCUMENT_HASH_INVALID");
  if (!ALLOWED_REFERENCE_LICENSES.has(passport.license)) push(blockers, "REFERENCE_LICENSE_NOT_ALLOWED");
  if (passport.validation_status === "REFERENCE_REJECTED") push(blockers, "REFERENCE_REJECTED");
  if (passport.line_items.some((item) => !nonEmpty(item.title) || !nonEmpty(item.unit))) {
    push(blockers, "REFERENCE_LINE_ITEM_METADATA_MISSING");
  }

  const accepted = blockers.length === 0;
  const canInfluenceStructure = accepted && STRUCTURE_STATUSES.has(passport.validation_status);
  const canInfluenceProductionQuantities =
    accepted &&
    PRODUCTION_QUANTITY_STATUSES.has(passport.validation_status) &&
    passport.license !== "CITATION_ONLY_REVIEW";

  return {
    accepted_for_registry: accepted,
    can_influence_structure: canInfluenceStructure,
    can_influence_production_quantities: canInfluenceProductionQuantities,
    blockers,
  };
}

export function publicReferenceRequiresExpertReview(
  passport: PublicReferenceEstimatePassport,
): boolean {
  return passport.validation_status !== "REFERENCE_EXPERT_VALIDATED";
}

export function publicReferenceRuntimeNetworkPolicy(): {
  runtime_fetch_allowed: false;
  ingestion_fetch_allowed: true;
  registry_required_before_runtime: true;
} {
  return {
    runtime_fetch_allowed: false,
    ingestion_fetch_allowed: true,
    registry_required_before_runtime: true,
  };
}
