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
  type ProfessionalEstimateRiskBlockerClass,
  type ProfessionalEstimateRiskEvidenceValue,
  type ProfessionalEstimateRiskFindingLedgerEntry,
  type ProfessionalEstimateRiskFindingStatus,
  type ProfessionalEstimateRiskRootCauseCluster,
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
  "LICENSE_REQUIRED",
  "SUPPLIER_CONFIRMATION_REQUIRED",
]);

type RiskClassCounters = Record<ProfessionalEstimateRiskBlockerClass, number>;

type MutableRootCauseCluster = {
  root_cause: string;
  blocker_class: ProfessionalEstimateRiskBlockerClass;
  risk_type: ProfessionalEstimateRiskType;
  severity: ProfessionalEstimateRiskSeverity;
  status: ProfessionalEstimateRiskFindingStatus;
  findings_count: number;
  price_keys: Set<string>;
  master_resources: Set<string>;
  affected_resource_rows: number;
  affected_work_ids: Set<string>;
  sample_price_key_id: string | null;
  sample_resource_code: string | null;
  remediation_owner: string;
};

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

function blockerClassForPricingBlocker(
  blockerType: KgRegionalPricingBlockerType,
): ProfessionalEstimateRiskBlockerClass {
  if (blockerType === "PRICE_SOURCE_MISSING" || blockerType === "PRICE_EXPIRED") {
    return "INTERNAL_SOURCE_INGESTION";
  }
  if (
    blockerType === "REGION_PRICE_MISSING" ||
    blockerType === "RESOURCE_MATCH_AMBIGUOUS" ||
    blockerType === "UNIT_CONVERSION_MISSING" ||
    blockerType === "CURRENCY_RATE_MISSING" ||
    blockerType === "DELIVERY_CALCULATION_MISSING"
  ) {
    return "INTERNAL_MAPPING";
  }
  if (
    blockerType === "RESOURCE_SPEC_INCOMPLETE" ||
    blockerType === "PRICE_MODEL_INCOMPATIBLE" ||
    blockerType === "LABOR_PRICING_METHOD_CONFLICT" ||
    blockerType === "MACHINE_RATE_SCOPE_INCOMPLETE" ||
    blockerType === "SERVICE_SCOPE_INCOMPLETE" ||
    blockerType === "TAX_POLICY_MISSING" ||
    blockerType === "UPSTREAM_PASSPORT_BLOCKED"
  ) {
    return "INTERNAL_DATA";
  }
  if (blockerType === "LICENSE_REQUIRED") return "EXTERNAL_LICENSE";
  if (blockerType === "SUPPLIER_CONFIRMATION_REQUIRED") return "EXTERNAL_SUPPLIER_QUOTE";
  return "INTERNAL_DATA";
}

function isExternalBlockerClass(blockerClass: ProfessionalEstimateRiskBlockerClass): boolean {
  return blockerClass.startsWith("EXTERNAL_");
}

function severityForPricingBlocker(
  blockerType: KgRegionalPricingBlockerType,
): ProfessionalEstimateRiskSeverity {
  return blockerType === "UPSTREAM_PASSPORT_BLOCKED" ? "P0" : "P1";
}

function statusForPricingBlocker(
  blockerType: KgRegionalPricingBlockerType,
): ProfessionalEstimateRiskFindingStatus {
  const blockerClass = blockerClassForPricingBlocker(blockerType);
  if (isExternalBlockerClass(blockerClass)) return "EXTERNAL_BLOCKER";
  if (blockerType === "UPSTREAM_PASSPORT_BLOCKED") return "OPEN";
  return "OPEN";
}

function rootCauseForPricingBlocker(blockerType: KgRegionalPricingBlockerType): string {
  if (blockerType === "PRICE_SOURCE_MISSING") {
    return "KG_PRICE_SOURCE_REGISTRY_ENTRY_MISSING_FOR_EXACT_PRICE_KEY";
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

function emptyRiskClassCounters(): RiskClassCounters {
  return {
    INTERNAL_CODE: 0,
    INTERNAL_DATA: 0,
    INTERNAL_MAPPING: 0,
    INTERNAL_SOURCE_INGESTION: 0,
    INTERNAL_TEST_INFRA: 0,
    EXTERNAL_LICENSE: 0,
    EXTERNAL_PRIVATE_ACCESS: 0,
    EXTERNAL_SUPPLIER_QUOTE: 0,
    EXTERNAL_EXPERT_SIGNATURE: 0,
  };
}

function masterResourceCode(resourceCode: string): string {
  return resourceCode.replace(/_[0-9a-f]{12,}$/i, "");
}

function affectedResourceRows(blocker: PricingBlockerLedgerEntry): number {
  const value = blocker.source_evidence.affected_resource_rows;
  return typeof value === "number" && Number.isFinite(value) ? value : blocker.work_ids.length;
}

function remediationOwner(blockerClass: ProfessionalEstimateRiskBlockerClass): string {
  if (blockerClass === "INTERNAL_SOURCE_INGESTION") return "pricing_source_ingestion";
  if (blockerClass === "INTERNAL_MAPPING") return "pricing_mapping";
  if (blockerClass === "INTERNAL_DATA") return "passport_or_price_registry_data";
  if (blockerClass === "INTERNAL_CODE") return "estimate_engine";
  if (blockerClass === "INTERNAL_TEST_INFRA") return "test_infrastructure";
  if (blockerClass === "EXTERNAL_LICENSE") return "licensed_source_owner";
  if (blockerClass === "EXTERNAL_SUPPLIER_QUOTE") return "supplier_or_procurement_owner";
  if (blockerClass === "EXTERNAL_PRIVATE_ACCESS") return "private_data_owner";
  return "expert_reviewer";
}

function clusterKey(input: {
  rootCause: string;
  blockerClass: ProfessionalEstimateRiskBlockerClass;
  riskType: ProfessionalEstimateRiskType;
  masterResource: string;
}): string {
  return [
    input.rootCause,
    input.blockerClass,
    input.riskType,
    input.masterResource,
  ].join("|");
}

function rememberCluster(
  clusters: Map<string, MutableRootCauseCluster>,
  blocker: PricingBlockerLedgerEntry,
): void {
  const riskType = riskTypeForPricingBlocker(blocker.blocker_type);
  const blockerClass = blockerClassForPricingBlocker(blocker.blocker_type);
  const rootCause = rootCauseForPricingBlocker(blocker.blocker_type);
  const masterResource = masterResourceCode(blocker.resource_code);
  const key = clusterKey({ rootCause, blockerClass, riskType, masterResource });
  const current = clusters.get(key) ?? {
    root_cause: rootCause,
    blocker_class: blockerClass,
    risk_type: riskType,
    severity: severityForPricingBlocker(blocker.blocker_type),
    status: statusForPricingBlocker(blocker.blocker_type),
    findings_count: 0,
    price_keys: new Set<string>(),
    master_resources: new Set<string>(),
    affected_resource_rows: 0,
    affected_work_ids: new Set<string>(),
    sample_price_key_id: blocker.price_key_id,
    sample_resource_code: blocker.resource_code,
    remediation_owner: remediationOwner(blockerClass),
  };
  current.findings_count += 1;
  if (blocker.price_key_id) current.price_keys.add(blocker.price_key_id);
  current.master_resources.add(masterResource);
  current.affected_resource_rows += affectedResourceRows(blocker);
  for (const workId of blocker.work_ids) current.affected_work_ids.add(workId);
  clusters.set(key, current);
}

function finalizeClusters(
  clusters: Map<string, MutableRootCauseCluster>,
): readonly ProfessionalEstimateRiskRootCauseCluster[] {
  return Object.freeze([...clusters.values()]
    .map((cluster) => Object.freeze({
      cluster_id: `risk_root_cause_${hash({
        root_cause: cluster.root_cause,
        blocker_class: cluster.blocker_class,
        risk_type: cluster.risk_type,
        master_resources: [...cluster.master_resources].sort(),
      }).replace(/^eh_/, "").slice(0, 20)}`,
      root_cause: cluster.root_cause,
      blocker_class: cluster.blocker_class,
      risk_type: cluster.risk_type,
      severity: cluster.severity,
      status: cluster.status,
      findings_count: cluster.findings_count,
      unique_price_keys_count: cluster.price_keys.size,
      unique_master_resources_count: cluster.master_resources.size,
      affected_resource_rows: cluster.affected_resource_rows,
      affected_work_ids_count: cluster.affected_work_ids.size,
      sample_price_key_id: cluster.sample_price_key_id,
      sample_resource_code: cluster.sample_resource_code,
      remediation_owner: cluster.remediation_owner,
    }))
    .sort((left, right) =>
      right.findings_count - left.findings_count ||
      left.root_cause.localeCompare(right.root_cause) ||
      left.cluster_id.localeCompare(right.cluster_id)
    ));
}

function summarizeRootCauseScope(
  clusters: Map<string, MutableRootCauseCluster>,
): { affectedWorkIdsCount: number; uniqueMasterResourcesCount: number } {
  const affectedWorkIds = new Set<string>();
  const masterResources = new Set<string>();
  for (const cluster of clusters.values()) {
    for (const workId of cluster.affected_work_ids) affectedWorkIds.add(workId);
    for (const resource of cluster.master_resources) masterResources.add(resource);
  }
  return {
    affectedWorkIdsCount: affectedWorkIds.size,
    uniqueMasterResourcesCount: masterResources.size,
  };
}

function evidence(input: {
  blocker: PricingBlockerLedgerEntry;
  riskType: ProfessionalEstimateRiskType;
  blockerClass: ProfessionalEstimateRiskBlockerClass;
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
    blocker_class: input.blockerClass,
    ...input.blocker.source_evidence,
  });
}

export function buildProfessionalEstimateRiskFindingFromPricingBlocker(
  blocker: PricingBlockerLedgerEntry,
  baselineSha: string = RISK_AUDIT_11610_BASELINE_SHA,
): ProfessionalEstimateRiskFindingLedgerEntry {
  const riskType = riskTypeForPricingBlocker(blocker.blocker_type);
  const blockerClass = blockerClassForPricingBlocker(blocker.blocker_type);
  const affectedWorkIds = freezeStrings(blocker.work_ids);
  const affectedPassportIds = freezeStrings(affectedWorkIds.map((workId) => `professional_work_passport_v2:${workId}`));
  const sourceEvidence = evidence({ blocker, riskType, blockerClass, baselineSha });
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
    blocker_class: blockerClass,
    observed: `Upstream KG regional pricing blocker ${blocker.blocker_type}: ${blocker.reason_ru}`,
    expected:
      "Every priceable resource is backed by verified KG regional price evidence or is visibly blocked without fake totals.",
    source_evidence: sourceEvidence,
    root_cause: rootCauseForPricingBlocker(blocker.blocker_type),
    affected_work_ids: affectedWorkIds,
    affected_passport_ids: affectedPassportIds,
    affected_formula_ids: Object.freeze([]),
    resolution: isExternalBlockerClass(blockerClass)
      ? "Attach licensed/private/supplier/expert evidence before closing the blocker."
      : "Fix internal registry, mapping, ingestion, or passport data and rerun the full 11610 audit before closing.",
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
  classCounters: RiskClassCounters;
  rootCauseClusters: readonly ProfessionalEstimateRiskRootCauseCluster[];
  affectedWorkIdsCount: number;
  uniqueMasterResourcesCount: number;
}): ProfessionalEstimateRiskAuditSummary {
  const pricing = input.pricingSummary;
  const p0Open = pricing.upstream_blocked_passports;
  const p1Open = pricing.mandatory_blockers_count - p0Open;
  const openFindings = p0Open + p1Open;
  const internalOpenFindings =
    input.classCounters.INTERNAL_CODE +
    input.classCounters.INTERNAL_DATA +
    input.classCounters.INTERNAL_MAPPING +
    input.classCounters.INTERNAL_SOURCE_INGESTION +
    input.classCounters.INTERNAL_TEST_INFRA;
  const externalOpenFindings =
    input.classCounters.EXTERNAL_LICENSE +
    input.classCounters.EXTERNAL_PRIVATE_ACCESS +
    input.classCounters.EXTERNAL_SUPPLIER_QUOTE +
    input.classCounters.EXTERNAL_EXPERT_SIGNATURE;
  const uniqueRootCauses = new Set(input.rootCauseClusters.map((cluster) => cluster.root_cause));
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
    total_findings_count: openFindings,
    open_findings_count: openFindings,
    closed_findings_count: 0,
    external_blocker_count: externalOpenFindings,
    internal_open_findings_count: internalOpenFindings,
    external_open_findings_count: externalOpenFindings,
    internal_code_blockers_count: input.classCounters.INTERNAL_CODE,
    internal_data_blockers_count: input.classCounters.INTERNAL_DATA,
    internal_mapping_blockers_count: input.classCounters.INTERNAL_MAPPING,
    internal_source_ingestion_blockers_count: input.classCounters.INTERNAL_SOURCE_INGESTION,
    internal_test_infra_blockers_count: input.classCounters.INTERNAL_TEST_INFRA,
    external_license_blockers_count: input.classCounters.EXTERNAL_LICENSE,
    external_private_access_blockers_count: input.classCounters.EXTERNAL_PRIVATE_ACCESS,
    external_supplier_quote_blockers_count: input.classCounters.EXTERNAL_SUPPLIER_QUOTE,
    external_expert_signature_blockers_count: input.classCounters.EXTERNAL_EXPERT_SIGNATURE,
    root_cause_clusters_count: input.rootCauseClusters.length,
    unique_root_causes_count: uniqueRootCauses.size,
    unique_resources_count: input.uniqueMasterResourcesCount,
    unique_master_resources_count: input.uniqueMasterResourcesCount,
    affected_work_ids_count: input.affectedWorkIdsCount,
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
  const classCounters = emptyRiskClassCounters();
  const rootCauseClusterMap = new Map<string, MutableRootCauseCluster>();
  const rememberFinding = (entry: ProfessionalEstimateRiskFindingLedgerEntry): void => {
    options.onFinding?.(entry);
    if (options.includeFindingLedger || findings.length < findingSampleLimit) {
      findings.push(entry);
    }
  };
  const shouldMaterializeFullFindings = Boolean(options.onFinding) || Boolean(options.includeFindingLedger);
  const rememberBlocker = (blocker: PricingBlockerLedgerEntry): void => {
    const blockerClass = blockerClassForPricingBlocker(blocker.blocker_type);
    classCounters[blockerClass] += 1;
    rememberCluster(rootCauseClusterMap, blocker);
    if (shouldMaterializeFullFindings || findings.length < findingSampleLimit) {
      rememberFinding(buildProfessionalEstimateRiskFindingFromPricingBlocker(blocker, baselineSha));
    }
  };
  const pricingResult = auditKgRegionalPricingReadiness({
    blockerSampleLimit: findingSampleLimit,
    sampleLimit: 12,
    onBlocker: rememberBlocker,
  });

  const templateIds = listProfessionalWorkPassportV2TemplateIds();
  const baseline = buildBaseline({
    baselineSha,
    templateIds,
    pricingSummary: pricingResult.summary,
  });
  const rootCauseClusters = finalizeClusters(rootCauseClusterMap);
  const rootCauseScope = summarizeRootCauseScope(rootCauseClusterMap);
  return Object.freeze({
    summary: buildSummary({
      baseline,
      pricingSummary: pricingResult.summary,
      classCounters,
      rootCauseClusters,
      affectedWorkIdsCount: rootCauseScope.affectedWorkIdsCount,
      uniqueMasterResourcesCount: rootCauseScope.uniqueMasterResourcesCount,
    }),
    findings: Object.freeze([...findings]),
    root_cause_clusters: rootCauseClusters,
  });
}
