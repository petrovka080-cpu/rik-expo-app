export type EstimateSourceQuality =
  | "official_online_verified"
  | "manufacturer_datasheet_reviewed"
  | "internal_estimator_reviewed"
  | "expert_engineering_reviewed"
  | "preliminary_engineering_reference"
  | "missing_price_policy"
  | "unknown_untrusted";

export type EstimateSourceVerificationStatus =
  | "OFFICIAL_ACTIVE"
  | "OFFICIAL_REQUIRES_APPLICABILITY_REVIEW"
  | "MANUFACTURER_TECHNICAL_DATA"
  | "LICENSED_COMMERCIAL_SOURCE"
  | "SUPERSEDED"
  | "SOURCE_NOT_VERIFIED";

export type EstimateSourceTrustLevel = "trusted" | "preliminary" | "policy_only" | "untrusted";

export type EstimateSourceLicenseState =
  | "PUBLIC_OFFICIAL_METADATA"
  | "PUBLIC_TECHNICAL_DATA"
  | "INTERNAL_REVIEWED_WORKBOOK"
  | "PUBLIC_POLICY"
  | "LICENSE_REQUIRED"
  | "UNKNOWN";

export type EstimateSourceCitation = {
  label: string;
  url?: string;
  document_ref?: string;
  retrieved_at?: string;
};

export type EstimateSourceRegistryRecord = {
  source_id: string;
  title: string;
  source_type: string;
  issuer: string;
  document_title: string;
  document_number: string;
  edition: string;
  effective_date: string;
  jurisdiction: string;
  applicability: string;
  official_url: string | null;
  accessed_at: string;
  content_hash: string;
  page_or_table: string | null;
  license_state: EstimateSourceLicenseState;
  supersedes: string[];
  superseded_by: string | null;
  source_quality: EstimateSourceQuality;
  verification_status: EstimateSourceVerificationStatus;
  trust_level: EstimateSourceTrustLevel;
  trusted_for_production_norms: boolean;
  preliminary_disclosure_required: boolean;
  citation: EstimateSourceCitation;
  allowed_domains: string[];
  online_verification_required: boolean;
  raw_copyrighted_norm_book_committed: false;
};

export type EstimateSourceIdMappingRule = {
  rule_id: string;
  norm_source_id_pattern: string;
  source_id: string;
};

export type EstimateSourceRegistryFile = {
  schema: "ai-estimate-source-registry-v1";
  generated_at: string;
  sources: EstimateSourceRegistryRecord[];
  source_id_mapping_rules: EstimateSourceIdMappingRule[];
};

export type EstimateSourceResolution = {
  normSourceId: string;
  normSourceTitle: string | null;
  registrySourceId: string;
  record: EstimateSourceRegistryRecord;
  matchedBy: "exact" | "mapping_rule" | "fallback";
  mappingRuleId: string | null;
};

export type EstimateSourcePolicyFailure = {
  code: string;
  path: string;
  message: string;
};
