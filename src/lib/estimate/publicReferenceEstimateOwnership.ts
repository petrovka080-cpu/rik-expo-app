import { buildNormPackCitationsForRows } from "./normPackCitationContract";
import { getEstimateSourceRecord } from "./sourceRegistry";
import type { EstimateSourceRegistryRecord } from "./sourceRegistryContract";
import type { ProfessionalWorkPassport } from "./workPassportContract";

export type PublicReferenceEstimateOwnershipValidationStatus =
  | "PUBLIC_REFERENCE"
  | "CROSS_CHECKED_REFERENCE"
  | "MANUFACTURER_TECHNICAL_REFERENCE"
  | "OFFICIAL_NORMATIVE_SOURCE"
  | "EXPERT_VALIDATED_REFERENCE";

export type PublicReferenceEstimateOwnership = {
  work_id: string;
  reference_owner_id: string;
  reference_family_id: string;
  applicability_rule: string;
  covered_scope: string;
  excluded_scope: string;
  work_specific_override: string;
  validation_status: PublicReferenceEstimateOwnershipValidationStatus;
  source_registry_ids: string[];
  source_url: string;
  publisher: string;
  jurisdiction: string;
  document_title: string;
  published_at: string | null;
  accessed_at: string;
  license_state: string;
  document_hash: string;
  professional_family: string;
  scale: string;
};

export type PublicReferenceEstimateOwnershipAudit = {
  ownership: PublicReferenceEstimateOwnership | null;
  ready: boolean;
  blockers: string[];
};

export type PublicReferenceEstimateOwnershipRegistryAudit = {
  templates_audited: number;
  ownership_ready_count: number;
  ownership_missing_count: number;
  unique_reference_owner_count: number;
  unique_reference_family_count: number;
  base_10000_unique_reference_owner_count: number;
  expanded_unique_reference_owner_count: number;
  global_singleton_owner_violation_count: number;
  source_registry_missing_count: number;
  source_url_missing_count: number;
  blockers: string[];
};

const KG_PUBLIC_NORMS_INDEX_SOURCE_ID = "kg_minstroy_public_estimate_norms_page_2026_07";

const VALIDATION_STATUS_PRIORITY: PublicReferenceEstimateOwnershipValidationStatus[] = [
  "OFFICIAL_NORMATIVE_SOURCE",
  "MANUFACTURER_TECHNICAL_REFERENCE",
  "CROSS_CHECKED_REFERENCE",
  "PUBLIC_REFERENCE",
  "EXPERT_VALIDATED_REFERENCE",
];

function compactToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 120);
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

function citationStatus(sourceQuality: string): PublicReferenceEstimateOwnershipValidationStatus {
  if (sourceQuality === "official_online_verified") return "OFFICIAL_NORMATIVE_SOURCE";
  if (sourceQuality === "manufacturer_datasheet_reviewed") return "MANUFACTURER_TECHNICAL_REFERENCE";
  if (sourceQuality === "expert_engineering_reviewed" || sourceQuality === "preliminary_engineering_reference") {
    return "CROSS_CHECKED_REFERENCE";
  }
  if (sourceQuality === "internal_estimator_reviewed") return "EXPERT_VALIDATED_REFERENCE";
  return "PUBLIC_REFERENCE";
}

function strongestStatus(sourceQualities: readonly string[]): PublicReferenceEstimateOwnershipValidationStatus {
  const statuses = sourceQualities.map(citationStatus);
  return VALIDATION_STATUS_PRIORITY.find((status) => statuses.includes(status)) ?? "PUBLIC_REFERENCE";
}

function sourceUrl(record: EstimateSourceRegistryRecord): string | null {
  return record.official_url ?? record.citation.url ?? null;
}

function firstRecordWithUrl(records: readonly EstimateSourceRegistryRecord[]): EstimateSourceRegistryRecord | null {
  return records.find((record) => Boolean(sourceUrl(record))) ?? null;
}

function rowSourceRecords(passport: ProfessionalWorkPassport): EstimateSourceRegistryRecord[] {
  return buildNormPackCitationsForRows(passport.boqRecipe.allRows)
    .map((citation) => getEstimateSourceRecord(citation.registrySourceId))
    .filter((record): record is EstimateSourceRegistryRecord => Boolean(record));
}

function sourceRecordsForOwnership(passport: ProfessionalWorkPassport): EstimateSourceRegistryRecord[] {
  const records = rowSourceRecords(passport);
  const officialIndex = getEstimateSourceRecord(KG_PUBLIC_NORMS_INDEX_SOURCE_ID);
  return uniqueSorted([
    ...(officialIndex ? [officialIndex.source_id] : []),
    ...records.map((record) => record.source_id),
  ]).map((sourceId) => getEstimateSourceRecord(sourceId)).filter((record): record is EstimateSourceRegistryRecord => Boolean(record));
}

function rowSourceQualities(passport: ProfessionalWorkPassport): string[] {
  if (passport.sources.sourceQuality === "engineering_reference_formula") return ["preliminary_engineering_reference"];
  return uniqueSorted(rowSourceRecords(passport).map((record) => record.source_quality));
}

export function buildPublicReferenceEstimateOwnership(
  passport: ProfessionalWorkPassport,
): PublicReferenceEstimateOwnership | null {
  const records = sourceRecordsForOwnership(passport);
  const primary = firstRecordWithUrl(records) ?? records[0] ?? null;
  const primaryUrl = primary ? sourceUrl(primary) : null;
  if (!primary || !primaryUrl) return null;

  const validationStatus = strongestStatus(rowSourceQualities(passport));
  const referenceFamilyId = `reference_family:${compactToken(passport.familyId)}:v1`;
  const referenceOwnerId = [
    "reference_owner",
    compactToken(passport.templateKind),
    compactToken(passport.familyId),
    compactToken(validationStatus),
    "v1",
  ].join(":");
  const sourceRegistryIds = uniqueSorted(records.map((record) => record.source_id));

  return {
    work_id: passport.templateId,
    reference_owner_id: referenceOwnerId,
    reference_family_id: referenceFamilyId,
    applicability_rule: [
      `template_kind=${passport.templateKind}`,
      `work_family_id=${passport.familyId}`,
      `category=${passport.category}`,
      `norm_pack_id=${passport.sources.normPackId}`,
      "row_source_registry_ids_are_governed",
    ].join(" AND "),
    covered_scope: [
      passport.localizedNameRu,
      `${passport.boqRecipe.rowCount} BOQ rows`,
      `row_types=${passport.boqRecipe.requiredRowTypes.join(",")}`,
      `source_registry_ids=${sourceRegistryIds.join(",")}`,
    ].join("; "),
    excluded_scope: "Final contractual quantities, prices, supplier availability, regional ratebooks and expert signature remain outside this reference ownership.",
    work_specific_override: [
      `template_id=${passport.templateId}`,
      `work_key=${passport.workKey}`,
      `unit_policy=${passport.contentPack.unitPolicyId}`,
      `price_policy=${passport.contentPack.pricePolicyId}`,
    ].join("; "),
    validation_status: validationStatus,
    source_registry_ids: sourceRegistryIds,
    source_url: primaryUrl,
    publisher: primary.issuer,
    jurisdiction: primary.jurisdiction,
    document_title: primary.document_title,
    published_at: primary.effective_date || null,
    accessed_at: primary.accessed_at,
    license_state: primary.license_state,
    document_hash: primary.content_hash,
    professional_family: passport.familyId,
    scale: passport.estimateLevel,
  };
}

export function auditPublicReferenceEstimateOwnership(
  passport: ProfessionalWorkPassport,
): PublicReferenceEstimateOwnershipAudit {
  const ownership = buildPublicReferenceEstimateOwnership(passport);
  const blockers = [
    ownership ? "" : "reference_ownership_missing",
    ownership?.reference_owner_id ? "" : "reference_owner_id_missing",
    ownership?.reference_family_id ? "" : "reference_family_id_missing",
    ownership?.applicability_rule ? "" : "applicability_rule_missing",
    ownership?.covered_scope ? "" : "covered_scope_missing",
    ownership?.excluded_scope ? "" : "excluded_scope_missing",
    ownership?.work_specific_override ? "" : "work_specific_override_missing",
    ownership?.validation_status ? "" : "validation_status_missing",
    ownership && ownership.source_registry_ids.length > 0 ? "" : "source_registry_ids_missing",
    ownership?.source_url ? "" : "source_url_missing",
    ownership?.publisher ? "" : "publisher_missing",
    ownership?.jurisdiction ? "" : "jurisdiction_missing",
    ownership?.document_title ? "" : "document_title_missing",
    ownership?.accessed_at ? "" : "accessed_at_missing",
    ownership?.license_state ? "" : "license_state_missing",
    ownership?.document_hash ? "" : "document_hash_missing",
    ownership?.reference_owner_id === "reference_owner:all_10000:v1" ? "forbidden_global_reference_owner" : "",
  ].filter(Boolean);

  return {
    ownership,
    ready: blockers.length === 0,
    blockers,
  };
}
