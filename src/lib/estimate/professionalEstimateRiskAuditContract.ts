export const S_AI_ESTIMATE_11610_PROFESSIONAL_RISK_AUDIT_5000_REAL_ESTIMATES_ROOT_CAUSE_REMEDIATION_WEB_ANDROID_PDF_POINT_OF_NO_RELEASE =
  "S_AI_ESTIMATE_11610_PROFESSIONAL_RISK_AUDIT_5000_REAL_ESTIMATES_ROOT_CAUSE_REMEDIATION_WEB_ANDROID_PDF_POINT_OF_NO_RELEASE" as const;

export const GREEN_AI_ESTIMATE_11610_PROFESSIONAL_RISK_AUDIT_5000_WEB_ANDROID_PDF_REPLAY_PASSED_NO_RELEASE =
  "GREEN_AI_ESTIMATE_11610_PROFESSIONAL_RISK_AUDIT_5000_WEB_ANDROID_PDF_REPLAY_PASSED_NO_RELEASE" as const;

export const STOP_AI_ESTIMATE_11610_PROFESSIONAL_RISK_AUDIT_BLOCKERS_FOUND_NO_RELEASE =
  "STOP_AI_ESTIMATE_11610_PROFESSIONAL_RISK_AUDIT_BLOCKERS_FOUND_NO_RELEASE" as const;

export const RISK_AUDIT_11610_BASELINE_SHA =
  "a94841f819bcad4879cf37a69d6ba69520082e01" as const;

export type ProfessionalEstimateRiskAuditFinalStatus =
  | typeof GREEN_AI_ESTIMATE_11610_PROFESSIONAL_RISK_AUDIT_5000_WEB_ANDROID_PDF_REPLAY_PASSED_NO_RELEASE
  | typeof STOP_AI_ESTIMATE_11610_PROFESSIONAL_RISK_AUDIT_BLOCKERS_FOUND_NO_RELEASE;

export type ProfessionalEstimateRiskSeverity = "P0" | "P1" | "P2";

export type ProfessionalEstimateRiskType =
  | "UPSTREAM_UNRESOLVED_BLOCKER"
  | "WRONG_WORK_FAMILY"
  | "WRONG_SCALE"
  | "WRONG_CALCULATOR"
  | "INPUT_FACT_IGNORED"
  | "GENERIC_ROW"
  | "FORMULA_TRACE_MISSING"
  | "FORMULA_OUTPUT_WRONG"
  | "PRICE_SOURCE_MISSING"
  | "WEB_RUNTIME_RISK"
  | "ANDROID_RUNTIME_RISK"
  | "PDF_PARITY_RISK"
  | "EXTERNAL_BLOCKER";

export type ProfessionalEstimateRiskFindingStatus =
  | "OPEN"
  | "QUARANTINED"
  | "FIX_IN_PROGRESS"
  | "FIXED_PENDING_FULL_REPLAY"
  | "CLOSED"
  | "EXTERNAL_BLOCKER";

export type ProfessionalEstimateRiskBlockerClass =
  | "INTERNAL_CODE"
  | "INTERNAL_DATA"
  | "INTERNAL_MAPPING"
  | "INTERNAL_SOURCE_INGESTION"
  | "INTERNAL_TEST_INFRA"
  | "EXTERNAL_LICENSE"
  | "EXTERNAL_PRIVATE_ACCESS"
  | "EXTERNAL_SUPPLIER_QUOTE"
  | "EXTERNAL_EXPERT_SIGNATURE";

export type ProfessionalEstimateRiskEvidenceValue =
  | null
  | boolean
  | number
  | string
  | readonly string[];

export type ProfessionalEstimateRiskFindingLedgerEntry = {
  readonly finding_id: string;
  readonly case_id: string | null;
  readonly work_id: string | null;
  readonly professional_family: string;
  readonly severity: ProfessionalEstimateRiskSeverity;
  readonly risk_type: ProfessionalEstimateRiskType;
  readonly blocker_class: ProfessionalEstimateRiskBlockerClass;
  readonly observed: string;
  readonly expected: string;
  readonly source_evidence: Readonly<Record<string, ProfessionalEstimateRiskEvidenceValue>>;
  readonly root_cause: string;
  readonly affected_work_ids: readonly string[];
  readonly affected_passport_ids: readonly string[];
  readonly affected_formula_ids: readonly string[];
  readonly resolution: string;
  readonly regression_test: string;
  readonly commit_sha: string;
  readonly status: ProfessionalEstimateRiskFindingStatus;
};

export type ProfessionalEstimateRiskRootCauseCluster = {
  readonly cluster_id: string;
  readonly root_cause: string;
  readonly blocker_class: ProfessionalEstimateRiskBlockerClass;
  readonly risk_type: ProfessionalEstimateRiskType;
  readonly severity: ProfessionalEstimateRiskSeverity;
  readonly status: ProfessionalEstimateRiskFindingStatus;
  readonly findings_count: number;
  readonly unique_price_keys_count: number;
  readonly unique_master_resources_count: number;
  readonly affected_resource_rows: number;
  readonly affected_work_ids_count: number;
  readonly sample_price_key_id: string | null;
  readonly sample_resource_code: string | null;
  readonly remediation_owner: string;
};

export type ProfessionalEstimateRiskAuditBaseline = {
  readonly baseline_sha: string;
  readonly catalog_registry_hash: string;
  readonly passport_registry_hash: string;
  readonly assembly_registry_hash: string;
  readonly formula_registry_hash: string;
  readonly source_registry_hash: string;
  readonly price_registry_hash: string;
  readonly audit_manifest_hash: string;
  readonly real_estimate_corpus_5000_manifest_hash: string | null;
};

export type ProfessionalEstimateRiskAuditSummary = ProfessionalEstimateRiskAuditBaseline & {
  readonly target_status: typeof S_AI_ESTIMATE_11610_PROFESSIONAL_RISK_AUDIT_5000_REAL_ESTIMATES_ROOT_CAUSE_REMEDIATION_WEB_ANDROID_PDF_POINT_OF_NO_RELEASE;
  readonly final_status: ProfessionalEstimateRiskAuditFinalStatus;
  readonly catalog_total: number;
  readonly catalog_audited: number;
  readonly priceable_resource_rows: number;
  readonly unique_price_keys: number;
  readonly p0_open_count: number;
  readonly p1_open_count: number;
  readonly p2_open_count: number;
  readonly p0_closed_count: number;
  readonly p1_closed_count: number;
  readonly p2_closed_count: number;
  readonly total_findings_count: number;
  readonly open_findings_count: number;
  readonly closed_findings_count: number;
  readonly external_blocker_count: number;
  readonly internal_open_findings_count: number;
  readonly external_open_findings_count: number;
  readonly internal_code_blockers_count: number;
  readonly internal_data_blockers_count: number;
  readonly internal_mapping_blockers_count: number;
  readonly internal_source_ingestion_blockers_count: number;
  readonly internal_test_infra_blockers_count: number;
  readonly external_license_blockers_count: number;
  readonly external_private_access_blockers_count: number;
  readonly external_supplier_quote_blockers_count: number;
  readonly external_expert_signature_blockers_count: number;
  readonly root_cause_clusters_count: number;
  readonly unique_root_causes_count: number;
  readonly unique_resources_count: number;
  readonly unique_master_resources_count: number;
  readonly affected_work_ids_count: number;
  readonly upstream_unresolved_blockers_count: number;
  readonly price_source_missing_count: number;
  readonly pricing_upstream_final_status: string;
  readonly pricing_summary_hash: string;
  readonly full_11610_audit_passed: boolean;
  readonly real_estimate_corpus_5000_passed: boolean;
  readonly web_replay_passed: boolean;
  readonly android_replay_passed: boolean;
  readonly pdf_replay_passed: boolean;
  readonly full_catalog_green_claimed: false;
  readonly release_started: false;
  readonly deploy_started: false;
  readonly eas_started: false;
  readonly native_build_started: false;
  readonly production_db_touched: false;
  readonly main_changed: false;
  readonly pr44_changed: false;
};

export type ProfessionalEstimateRiskAuditResult = {
  readonly summary: ProfessionalEstimateRiskAuditSummary;
  readonly findings: readonly ProfessionalEstimateRiskFindingLedgerEntry[];
  readonly root_cause_clusters: readonly ProfessionalEstimateRiskRootCauseCluster[];
};
