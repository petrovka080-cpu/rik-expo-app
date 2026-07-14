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
  readonly open_findings_count: number;
  readonly closed_findings_count: number;
  readonly external_blocker_count: number;
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
};
