import { auditKgRegionalPricingReadiness } from "./auditKgRegionalPricingReadiness";
import { listProfessionalWorkPassportV2TemplateIds } from "./buildProfessionalWorkPassportV2";
import { estimateDeterministicHash } from "./estimateDeterministicHash";
import { PROFESSIONAL_ESTIMATE_5000_CORPUS_MANIFEST_HASH } from "./professionalEstimate5000CorpusContract";
import {
  GREEN_AI_ESTIMATE_11610_PROFESSIONAL_RISK_AUDIT_5000_WEB_ANDROID_PDF_REPLAY_PASSED_NO_RELEASE,
  RISK_AUDIT_11610_BASELINE_SHA,
  S_AI_ESTIMATE_11610_PROFESSIONAL_RISK_AUDIT_5000_REAL_ESTIMATES_ROOT_CAUSE_REMEDIATION_WEB_ANDROID_PDF_POINT_OF_NO_RELEASE,
  STOP_AI_ESTIMATE_11610_PROFESSIONAL_RISK_AUDIT_BLOCKERS_FOUND_NO_RELEASE,
  type ProfessionalEstimateRiskAuditBaseline,
  type ProfessionalEstimateRiskAuditResult,
  type ProfessionalEstimateRiskAuditSummary,
  type ProfessionalEstimateRiskEvidenceValue,
  type ProfessionalEstimateRiskFindingLedgerEntry,
  type ProfessionalEstimateRiskFindingStatus,
  type ProfessionalEstimateRiskSeverity,
  type ProfessionalEstimateRiskType,
} from "./professionalEstimateRiskAuditContract";
import type {
  KgRegionalPricingAuditSummary,
  KgRegionalPricingBlockerType,
  PricingBlockerLedgerEntry,
} from "./kgRegionalPricingContract";

const RISK_AUDIT_REGRESSION_TEST =
  "tests/estimateNorms/professionalEstimateRiskAudit.contract.test.ts";

const EXTERNAL_PRICING_BLOCKERS = new Set<KgRegionalPricingBlockerType>([
  "PRICE_SOURCE_MISSING",
  "PRICE_EXPIRED",
  "REGION_PRICE_MISSING",
  "LICENSE_REQUIRED",
  "SUPPLIER_CONFIRMATION_REQUIRED",
]);

export type ProfessionalEstimateRiskAuditOptions = {
  baselineSha?: string;
  findingSampleLimit?: number;
  includeFindingLedger?: boolean;
  onFinding?: (entry: ProfessionalEstimateRiskFindingLedgerEntry) => void;
};

function hash(value: unknown): string {
  return estimateDeterministicHash(value);
}

function freezeStrings(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values.filter(Boolean))].sort());
}

function riskTypeForPricingBlocker(
  blockerType: KgRegionalPricingBlockerType,
): ProfessionalEstimateRiskType {
  return blockerType === "PRICE_SOURCE_MISSING"
    ? "PRICE_SOURCE_MISSING"
    : "UPSTREAM_UNRESOLVED_BLOCKER";
}

function severityForPricingBlocker(
  blockerType: KgRegionalPricingBlockerType,
): ProfessionalEstimateRiskSeverity {
  return blockerType === "UPSTREAM_PASSPORT_BLOCKED" ? "P0" : "P1";
}

function statusForPricingBlocker(
  blockerType: KgRegionalPricingBlockerType,
): ProfessionalEstimateRiskFindingStatus {
  if (EXTERNAL_PRICING_BLOCKERS.has(blockerType)) return "EXTERNAL_BLOCKER";
  if (blockerType === "UPSTREAM_PASSPORT_BLOCKED") return "OPEN";
  return "QUARANTINED";
}

function rootCauseForPricingBlocker(blockerType: KgRegionalPricingBlockerType): string {
  if (blockerType === "PRICE_SOURCE_MISSING") {
    return "KG_PRICE_SOURCE_REGISTRY_HAS_NO_VERIFIED_SUPPLIER_OR_OFFICIAL_RECORD_FOR_PRICE_KEY";
  }
  if (blockerType === "UPSTREAM_PASSPORT_BLOCKED") {
    return "PROFESSIONAL_WORK_PASSPORT_V2_NOT_SOFTWARE_SEALED";
  }
  if (blockerType === "UNIT_CONVERSION_MISSING") {
    return "KG_REGIONAL_UNIT_NORMALIZATION_GAP";
  }
  if (EXTERNAL_PRICING_BLOCKERS.has(blockerType)) {
    return `KG_REGIONAL_EXTERNAL_PRICE_EVIDENCE_REQUIRED:${blockerType}`;
  }
  return `KG_REGIONAL_PRICING_REMEDIATION_REQUIRED:${blockerType}`;
}

function evidence(input: {
  blocker: PricingBlockerLedgerEntry;
  riskType: ProfessionalEstimateRiskType;
  baselineSha: string;
}): Readonly<Record<string, ProfessionalEstimateRiskEvidenceValue>> {
  return Object.freeze({
    upstream_blocker_id: input.blocker.blocker_id,
    upstream_blocker_type: input.blocker.blocker_type,
    upstream_owner: input.blocker.owner,
    upstream_required_action: input.blocker.required_action,
    price_key_id: input.blocker.price_key_id,
    resource_code: input.blocker.resource_code,
    baseline_sha: input.baselineSha,
    risk_type: input.riskType,
    ...input.blocker.source_evidence,
  });
}

export function buildProfessionalEstimateRiskFindingFromPricingBlocker(
  blocker: PricingBlockerLedgerEntry,
  baselineSha: string = RISK_AUDIT_11610_BASELINE_SHA,
): ProfessionalEstimateRiskFindingLedgerEntry {
  const riskType = riskTypeForPricingBlocker(blocker.blocker_type);
  const affectedWorkIds = freezeStrings(blocker.work_ids);
  const affectedPassportIds = freezeStrings(affectedWorkIds.map((workId) => `professional_work_passport_v2:${workId}`));
  const sourceEvidence = evidence({ blocker, riskType, baselineSha });
  const findingId = `professional_risk_${hash({
    baseline_sha: baselineSha,
    upstream_blocker_id: blocker.blocker_id,
    risk_type: riskType,
    source_evidence: sourceEvidence,
  }).replace(/^eh_/, "").slice(0, 24)}`;

  return Object.freeze({
    finding_id: findingId,
    case_id: `UPSTREAM_PRICING:${blocker.blocker_id}`,
    work_id: affectedWorkIds[0] ?? null,
    professional_family: "kg_regional_pricing",
    severity: severityForPricingBlocker(blocker.blocker_type),
    risk_type: riskType,
    observed: `Upstream KG regional pricing blocker ${blocker.blocker_type}: ${blocker.reason_ru}`,
    expected:
      "Every priceable resource is backed by verified KG regional price evidence or is visibly blocked without fake totals.",
    source_evidence: sourceEvidence,
    root_cause: rootCauseForPricingBlocker(blocker.blocker_type),
    affected_work_ids: affectedWorkIds,
    affected_passport_ids: affectedPassportIds,
    affected_formula_ids: Object.freeze([]),
    resolution: EXTERNAL_PRICING_BLOCKERS.has(blocker.blocker_type)
      ? "Register verified supplier, official, contract, or accepted market price evidence before replay."
      : "Resolve upstream software blocker and rerun the full 11610 audit before closing.",
    regression_test: RISK_AUDIT_REGRESSION_TEST,
    commit_sha: baselineSha,
    status: statusForPricingBlocker(blocker.blocker_type),
  });
}

function buildBaseline(input: {
  baselineSha: string;
  templateIds: readonly string[];
  pricingSummary: KgRegionalPricingAuditSummary;
}): ProfessionalEstimateRiskAuditBaseline {
  const pricing = input.pricingSummary;
  return Object.freeze({
    baseline_sha: input.baselineSha,
    catalog_registry_hash: hash({
      baseline_sha: input.baselineSha,
      template_ids: input.templateIds,
      catalog_total: pricing.catalog_total,
    }),
    passport_registry_hash: hash({
      baseline_sha: input.baselineSha,
      catalog_total: pricing.catalog_total,
      priceable_work_passports: pricing.priceable_work_passports,
      upstream_blocked_passports: pricing.upstream_blocked_passports,
    }),
    assembly_registry_hash: hash({
      baseline_sha: input.baselineSha,
      priceable_resource_rows: pricing.priceable_resource_rows,
      material_price_keys_count: pricing.material_price_keys_count,
      labor_rate_keys_count: pricing.labor_rate_keys_count,
      service_price_keys_count: pricing.service_price_keys_count,
      equipment_rate_keys_count: pricing.equipment_rate_keys_count,
      machine_rate_keys_count: pricing.machine_rate_keys_count,
    }),
    formula_registry_hash: hash({
      baseline_sha: input.baselineSha,
      unique_price_keys: pricing.unique_price_keys,
      price_key_coverage_percent: pricing.price_key_coverage_percent,
      resource_price_keys_resolved_percent: pricing.resource_price_keys_resolved_percent,
      unit_conversion_missing_count: pricing.unit_conversion_missing_count,
    }),
    source_registry_hash: hash({
      baseline_sha: input.baselineSha,
      price_source_registry_version: pricing.price_source_registry_version,
      price_source_records_count: pricing.price_source_records_count,
      price_source_metadata_count: pricing.price_source_metadata_count,
      runtime_network_required: pricing.runtime_network_required,
    }),
    price_registry_hash: hash({
      baseline_sha: input.baselineSha,
      unique_price_keys: pricing.unique_price_keys,
      price_source_missing_count: pricing.price_source_missing_count,
      mandatory_blockers_count: pricing.mandatory_blockers_count,
    }),
    audit_manifest_hash: hash({
      baseline_sha: input.baselineSha,
      target_status:
        S_AI_ESTIMATE_11610_PROFESSIONAL_RISK_AUDIT_5000_REAL_ESTIMATES_ROOT_CAUSE_REMEDIATION_WEB_ANDROID_PDF_POINT_OF_NO_RELEASE,
      pricing_final_status: pricing.final_status,
      catalog_total: pricing.catalog_total,
      mandatory_blockers_count: pricing.mandatory_blockers_count,
    }),
    real_estimate_corpus_5000_manifest_hash: PROFESSIONAL_ESTIMATE_5000_CORPUS_MANIFEST_HASH,
  });
}

function buildSummary(input: {
  baseline: ProfessionalEstimateRiskAuditBaseline;
  pricingSummary: KgRegionalPricingAuditSummary;
}): ProfessionalEstimateRiskAuditSummary {
  const pricing = input.pricingSummary;
  const p0Open = pricing.upstream_blocked_passports;
  const p1Open = pricing.mandatory_blockers_count - p0Open;
  const openFindings = p0Open + p1Open;
  const realEstimateCorpus5000Passed = false;
  const webReplayPassed = false;
  const androidReplayPassed = false;
  const pdfReplayPassed = false;
  const replayPassed =
    realEstimateCorpus5000Passed && webReplayPassed && androidReplayPassed && pdfReplayPassed;
  const finalStatus = openFindings === 0 && replayPassed
    ? GREEN_AI_ESTIMATE_11610_PROFESSIONAL_RISK_AUDIT_5000_WEB_ANDROID_PDF_REPLAY_PASSED_NO_RELEASE
    : STOP_AI_ESTIMATE_11610_PROFESSIONAL_RISK_AUDIT_BLOCKERS_FOUND_NO_RELEASE;

  return Object.freeze({
    ...input.baseline,
    target_status:
      S_AI_ESTIMATE_11610_PROFESSIONAL_RISK_AUDIT_5000_REAL_ESTIMATES_ROOT_CAUSE_REMEDIATION_WEB_ANDROID_PDF_POINT_OF_NO_RELEASE,
    final_status: finalStatus,
    catalog_total: pricing.catalog_total,
    catalog_audited: pricing.priceable_work_passports + pricing.upstream_blocked_passports,
    priceable_resource_rows: pricing.priceable_resource_rows,
    unique_price_keys: pricing.unique_price_keys,
    p0_open_count: p0Open,
    p1_open_count: p1Open,
    p2_open_count: 0,
    p0_closed_count: 0,
    p1_closed_count: 0,
    p2_closed_count: 0,
    open_findings_count: openFindings,
    closed_findings_count: 0,
    external_blocker_count: pricing.price_source_missing_count + pricing.expired_price_count +
      pricing.regional_fallback_count + pricing.license_blocked_count,
    upstream_unresolved_blockers_count: pricing.mandatory_blockers_count,
    price_source_missing_count: pricing.price_source_missing_count,
    pricing_upstream_final_status: pricing.final_status,
    pricing_summary_hash: hash(pricing),
    full_11610_audit_passed: openFindings === 0,
    real_estimate_corpus_5000_passed: realEstimateCorpus5000Passed,
    web_replay_passed: webReplayPassed,
    android_replay_passed: androidReplayPassed,
    pdf_replay_passed: pdfReplayPassed,
    full_catalog_green_claimed: false,
    release_started: false,
    deploy_started: false,
    eas_started: false,
    native_build_started: false,
    production_db_touched: false,
    main_changed: false,
    pr44_changed: false,
  });
}

export function auditProfessionalEstimateRiskReadiness(
  options: ProfessionalEstimateRiskAuditOptions = {},
): ProfessionalEstimateRiskAuditResult {
  const baselineSha = options.baselineSha ?? RISK_AUDIT_11610_BASELINE_SHA;
  const findingSampleLimit = options.findingSampleLimit ?? 24;
  const findings: ProfessionalEstimateRiskFindingLedgerEntry[] = [];
  const rememberFinding = (entry: ProfessionalEstimateRiskFindingLedgerEntry): void => {
    options.onFinding?.(entry);
    if (options.includeFindingLedger || findings.length < findingSampleLimit) {
      findings.push(entry);
    }
  };
  const shouldStreamFindings = Boolean(options.onFinding) || Boolean(options.includeFindingLedger);
  const pricingResult = auditKgRegionalPricingReadiness({
    blockerSampleLimit: findingSampleLimit,
    sampleLimit: 12,
    onBlocker: shouldStreamFindings
      ? (blocker) => rememberFinding(buildProfessionalEstimateRiskFindingFromPricingBlocker(blocker, baselineSha))
      : undefined,
  });

  if (!shouldStreamFindings) {
    for (const blocker of pricingResult.blockers) {
      rememberFinding(buildProfessionalEstimateRiskFindingFromPricingBlocker(blocker, baselineSha));
    }
  }

  const templateIds = listProfessionalWorkPassportV2TemplateIds();
  const baseline = buildBaseline({
    baselineSha,
    templateIds,
    pricingSummary: pricingResult.summary,
  });
  return Object.freeze({
    summary: buildSummary({
      baseline,
      pricingSummary: pricingResult.summary,
    }),
    findings: Object.freeze([...findings]),
  });
}
