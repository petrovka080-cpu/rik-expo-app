import fs from "node:fs";
import path from "node:path";

import { evaluateFinal50k92GreenReleaseGuard } from "../release/releaseGuard.shared";

const PROJECT_ROOT = process.cwd();
const ARTIFACT_DIR = path.join(PROJECT_ROOT, "artifacts");
const WAVE = "S_FINAL_50K_92_SCORE_REAUDIT_CLOSEOUT";
const GREEN_STATUS = "GREEN_FINAL_50K_92_SCORE_REAUDIT_READY";
const BLOCKED_STATUS =
  "BLOCKED_EXTERNAL_ONLY_SUPABASE_RLS_PROOF_DATABASE_URL_REQUIRED_AND_WHOLE_APP_50K_DATABASE_URL_REQUIRED";
const BLOCKED_PREFIX = "BLOCKED_EXTERNAL_ONLY_";

type JsonRecord = Record<string, unknown>;

function artifactPath(name: string): string {
  return path.join(ARTIFACT_DIR, name);
}

function readJson(name: string): JsonRecord {
  const filePath = artifactPath(name);
  if (!fs.existsSync(filePath)) return {};
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
  return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? parsed as JsonRecord : {};
}

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(artifactPath(name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeText(name: string, value: string): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(artifactPath(name), value, "utf8");
}

function bool(value: unknown): boolean {
  return value === true;
}

function status(value: JsonRecord): string {
  return typeof value.final_status === "string" ? value.final_status : "MISSING";
}

function green(value: JsonRecord, expected: string): boolean {
  return status(value) === expected;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function externalBlockers(evidence: ReturnType<typeof buildEvidenceMap>): string[] {
  const blockers: string[] = [];
  if (!evidence.fixture_sufficient) {
    blockers.push("50K_FIXTURE_DATA_REQUIRED");
  }
  if (!evidence.rls_dynamic_proof_passed) {
    blockers.push(evidence.rls_external_blocker ?? "SUPABASE_RLS_PROOF_DATABASE_URL_REQUIRED");
  }
  if (!evidence.whole_app_50k_proof_passed) {
    blockers.push(evidence.whole_app_50k_external_blocker ?? "WHOLE_APP_50K_DATABASE_URL_REQUIRED");
  }
  return [...new Set(blockers)];
}

function buildEvidenceMap() {
  const rls = readJson("S_RLS_DYNAMIC_CROSS_TENANT_matrix.json");
  const fixture = readJson("S_50K_SYNTHETIC_FIXTURE_matrix.json");
  const wholeApp50k = readJson("S_WHOLE_APP_50K_matrix.json");
  const queryBoundary = readJson("S_QUERY_BOUNDARY_matrix.json");
  const media100k = readJson("S_MEDIA_STORAGE_100K_matrix.json");
  const aiLive = readJson("S_AI_ROLE_LIVE_TRANSCRIPT_matrix.json");
  const aiGateway = readJson("S_AI_DOMAIN_GATEWAY_matrix.json");
  const serviceBoundary = readJson("S_BACKEND_SERVICE_BOUNDARY_matrix.json");
  const workflows = readJson("S_CORE_WORKFLOWS_matrix.json");
  const observability = readJson("S_OBSERVABILITY_matrix.json");
  const securityPrivacy = readJson("S_SECURITY_PRIVACY_matrix.json");
  const releasePipeline = readJson("S_RELEASE_PIPELINE_matrix.json");

  const rlsDynamicProofPassed =
    green(rls, "GREEN_RLS_DYNAMIC_CROSS_TENANT_READY")
    && bool(rls.cross_tenant_read_blocked)
    && bool(rls.cross_tenant_write_blocked)
    && bool(rls.cross_tenant_delete_blocked)
    && bool(rls.dynamic_runtime_executed);
  const proofRunId = typeof fixture.proof_run_id === "string"
    ? fixture.proof_run_id
    : typeof wholeApp50k.proof_run_id === "string" ? wholeApp50k.proof_run_id : null;
  const fixtureSufficient = bool(wholeApp50k.fixture_sufficient)
    && Number(wholeApp50k.b2c_requests ?? 0) >= 50000
    && Number(wholeApp50k.b2c_request_items ?? 0) >= 250000
    && Number(wholeApp50k.media_rows ?? 0) >= 100000
    && Number(wholeApp50k.pdfs ?? 0) >= 50000
    && Number(wholeApp50k.marketplace_listings ?? 0) >= 50000
    && Number(wholeApp50k.events ?? 0) >= 1000000;
  const wholeApp50kProofPassed =
    green(wholeApp50k, "GREEN_WHOLE_APP_50K_EXPLAIN_P95_READY")
    && fixtureSufficient
    && proofRunId !== null
    && bool(wholeApp50k.live_fixture_verified)
    && bool(wholeApp50k.history_p95_lte_300ms)
    && bool(wholeApp50k.detail_p95_lte_300ms)
    && bool(wholeApp50k.marketplace_search_p95_lte_500ms)
    && bool(wholeApp50k.ai_context_p95_lte_1000ms)
    && bool(wholeApp50k.pdf_signed_url_p95_lte_300ms)
    && bool(wholeApp50k.submit_publish_transaction_p95_lte_1000ms);

  return {
    wave: WAVE,
    generated_at: new Date().toISOString(),
    proof_run_id: proofRunId,
    proof_run_id_present: proofRunId !== null,
    fixture_sufficient: fixtureSufficient,
    fixture_status: status(fixture),
    rls_dynamic_proof_passed: rlsDynamicProofPassed,
    rls_static_preflight_passed:
      bool(rls.rls_enabled_all_private_tables)
      && bool(rls.policy_coverage_complete)
      && bool(rls.storage_policy_coverage_complete),
    rls_status: status(rls),
    rls_external_blocker: typeof rls.external_blocker === "string" ? rls.external_blocker : null,
    whole_app_50k_proof_passed: wholeApp50kProofPassed,
    whole_app_50k_static_preflight_passed:
      bool(wholeApp50k.all_core_list_queries_bounded)
      && bool(wholeApp50k.cursor_pagination_all_core_lists)
      && wholeApp50k.large_table_select_star_found === false
      && wholeApp50k.nplusone_core_detail_found === false
      && bool(wholeApp50k.index_or_rpc_evidence_complete)
      && bool(wholeApp50k.query_source_evidence_complete),
    whole_app_50k_status: status(wholeApp50k),
    detail_p95_lte_300ms: bool(wholeApp50k.detail_p95_lte_300ms),
    pdf_signed_url_p95_lte_300ms: bool(wholeApp50k.pdf_signed_url_p95_lte_300ms),
    submit_publish_transaction_p95_lte_1000ms: bool(wholeApp50k.submit_publish_transaction_p95_lte_1000ms),
    whole_app_50k_external_blocker: typeof wholeApp50k.external_blocker === "string" ? wholeApp50k.external_blocker : null,
    query_boundary_resolved:
      green(queryBoundary, "GREEN_QUERY_BOUNDARY_LIMIT_CURSOR_INDEX_CLEANUP_READY")
      && Number(queryBoundary.query_candidates_unresolved ?? -1) === 0
      && queryBoundary.large_table_select_star_found === false,
    media_storage_100k_passed: green(media100k, "GREEN_MEDIA_STORAGE_100K_ORPHAN_RETRY_BACKPRESSURE_READY"),
    ai_live_transcripts_passed:
      green(aiLive, "GREEN_AI_ROLE_LIVE_TRANSCRIPT_VALUE_READY")
      && Number(aiLive.roles_tested ?? 0) >= 8
      && Number(aiLive.questions_per_role_min ?? 0) >= 10
      && aiLive.generic_answers_found === 0
      && aiLive.unsafe_mutations_found === 0,
    ai_context_gateway_budget_passed:
      green(aiGateway, "GREEN_AI_DOMAIN_DATA_GATEWAY_CONTEXT_BUDGET_READY")
      && bool(aiGateway.context_budget_enforced)
      && aiGateway.raw_db_dump_found === false
      && aiGateway.consumer_office_context_found === false,
    backend_service_boundaries_passed:
      green(serviceBoundary, "GREEN_BACKEND_SERVICE_BOUNDARY_DISCIPLINE_READY")
      && serviceBoundary.direct_status_write_from_screens_found === false
      && bool(serviceBoundary.core_actions_use_service_layer),
    transactions_idempotency_passed:
      green(workflows, "GREEN_CORE_WORKFLOWS_TRANSACTION_IDEMPOTENCY_AUDIT_READY")
      && bool(workflows.idempotency_key_used)
      && bool(workflows.transaction_rollback_verified)
      && workflows.fake_success_found === false,
    observability_rate_limits_passed:
      green(observability, "GREEN_OBSERVABILITY_OPS_RATE_LIMIT_READY")
      && bool(observability.core_metrics_emitted)
      && bool(observability.ai_rate_limit_enabled)
      && bool(observability.media_rate_limit_enabled)
      && bool(observability.publish_rate_limit_enabled),
    security_privacy_passed:
      green(securityPrivacy, "GREEN_SECURITY_PRIVACY_HARDENING_READY")
      && securityPrivacy.pii_in_artifacts_found === false
      && securityPrivacy.secrets_in_frontend_found === false
      && securityPrivacy.service_role_frontend_found === false,
    release_pipeline_passed:
      green(releasePipeline, "GREEN_RELEASE_PIPELINE_NO_TIMEOUT_MOBILE_RUNTIME_READY")
      && bool(releasePipeline.release_verify_step_timing_enabled)
      && releasePipeline.full_jest_timeout === false
      && releasePipeline.release_verify_timeout === false
      && bool(releasePipeline.post_push_verify_passed)
      && bool(releasePipeline.full_jest_passed)
      && bool(releasePipeline.release_verify_passed),
    source_artifacts: {
      rls: "artifacts/S_RLS_DYNAMIC_CROSS_TENANT_matrix.json",
      fixture: "artifacts/S_50K_SYNTHETIC_FIXTURE_matrix.json",
      whole_app_50k: "artifacts/S_WHOLE_APP_50K_matrix.json",
      query_boundary: "artifacts/S_QUERY_BOUNDARY_matrix.json",
      media_100k: "artifacts/S_MEDIA_STORAGE_100K_matrix.json",
      ai_live: "artifacts/S_AI_ROLE_LIVE_TRANSCRIPT_matrix.json",
      ai_gateway: "artifacts/S_AI_DOMAIN_GATEWAY_matrix.json",
      backend_service_boundary: "artifacts/S_BACKEND_SERVICE_BOUNDARY_matrix.json",
      workflows: "artifacts/S_CORE_WORKFLOWS_matrix.json",
      observability: "artifacts/S_OBSERVABILITY_matrix.json",
      security_privacy: "artifacts/S_SECURITY_PRIVACY_matrix.json",
      release_pipeline: "artifacts/S_RELEASE_PIPELINE_matrix.json",
    },
  };
}

function buildCategories(evidence: ReturnType<typeof buildEvidenceMap>) {
  return {
    architecture_boundaries: {
      score: evidence.backend_service_boundaries_passed && evidence.transactions_idempotency_passed ? 9.2 : 8.0,
      evidence: ["service boundaries", "transactions", "idempotency", "audit trail"],
    },
    backend_rls_data: {
      score: evidence.rls_dynamic_proof_passed ? 9.2 : evidence.rls_static_preflight_passed ? 8.0 : 7.0,
      evidence: evidence.rls_dynamic_proof_passed ? ["dynamic cross-tenant proof passed"] : ["static RLS preflight passed", "dynamic runtime proof missing"],
    },
    query_scale_performance: {
      score: evidence.whole_app_50k_proof_passed ? 9.2 : evidence.whole_app_50k_static_preflight_passed ? 8.4 : 7.2,
      evidence: evidence.whole_app_50k_proof_passed ? ["live 50k EXPLAIN/p95 passed"] : ["static query/index preflight passed", "live 50k DB proof missing"],
    },
    ai_role_helpfulness: {
      score: evidence.ai_live_transcripts_passed && evidence.ai_context_gateway_budget_passed ? 9.2 : 7.5,
      evidence: ["role transcripts", "domain data gateway", "context budget"],
    },
    ux_mobile_web: {
      score: evidence.release_pipeline_passed ? 9.2 : 8.0,
      evidence: ["release pipeline", "mobile runtime exactness", "no timeout escape"],
    },
    marketplace_b2c_value: {
      score: evidence.media_storage_100k_passed && evidence.query_boundary_resolved && evidence.whole_app_50k_proof_passed ? 9.2 : 8.0,
      evidence: ["marketplace/B2C backend validation", "media/PDF 100k", "query boundaries"],
    },
    security_privacy: {
      score: evidence.security_privacy_passed && evidence.rls_dynamic_proof_passed ? 9.2 : evidence.security_privacy_passed ? 8.0 : 7.0,
      evidence: ["security/privacy hardening", "RLS runtime isolation"],
    },
    release_mobile: {
      score: evidence.release_pipeline_passed ? 9.2 : 8.0,
      evidence: ["step timing", "full Jest", "release:verify", "post-push verify", "mobile runtime status"],
    },
    observability_ops: {
      score: evidence.observability_rate_limits_passed ? 9.2 : 7.2,
      evidence: ["structured logs", "metrics", "rate limits", "alerts"],
    },
    maintainability_code_quality: {
      score: evidence.query_boundary_resolved && evidence.backend_service_boundaries_passed && evidence.whole_app_50k_proof_passed ? 9.2 : 7.8,
      evidence: ["query boundaries", "service boundaries", "contract coverage"],
    },
  };
}

function buildCaps(evidence: ReturnType<typeof buildEvidenceMap>, fullJestPassed: boolean, releaseVerifyPassed: boolean) {
  const caps: Array<{ name: string; active: boolean; max_score: number; reason: string }> = [
    {
      name: "rls_dynamic_incomplete",
      active: !evidence.rls_dynamic_proof_passed,
      max_score: 8.0,
      reason: "If RLS dynamic cross-tenant proof is incomplete, max overall score is 8.0.",
    },
    {
      name: "whole_app_50k_fixture_insufficient",
      active: !evidence.fixture_sufficient,
      max_score: 8.4,
      reason: "If the synthetic 50k fixture is insufficient, max overall score is 8.4 and this is not a p95 failure.",
    },
    {
      name: "whole_app_50k_missing",
      active: !evidence.whole_app_50k_proof_passed,
      max_score: 8.4,
      reason: "If whole-app 50k live EXPLAIN/p95 is missing, max overall score is 8.4.",
    },
    {
      name: "ai_live_transcripts_missing",
      active: !evidence.ai_live_transcripts_passed,
      max_score: 8.8,
      reason: "If AI live transcripts are missing, AI score is capped at 7.5 and overall score is capped by evidence.",
    },
    {
      name: "media_100k_missing",
      active: !evidence.media_storage_100k_passed,
      max_score: 8.0,
      reason: "If media 100k proof is missing, storage/security score is capped at 8.0.",
    },
    {
      name: "release_verify_missing",
      active: !releaseVerifyPassed,
      max_score: 8.2,
      reason: "If release:verify is missing, max overall score is 8.2.",
    },
    {
      name: "full_jest_missing",
      active: !fullJestPassed,
      max_score: 8.0,
      reason: "If full Jest is missing, max overall score is 8.0.",
    },
  ];
  const activeCaps = caps.filter((cap) => cap.active);
  return {
    score_caps_applied: true,
    active_caps: activeCaps,
    effective_max_score: activeCaps.length > 0 ? Math.min(...activeCaps.map((cap) => cap.max_score)) : 9.5,
    all_caps: caps,
  };
}

function buildRiskRegister(evidence: ReturnType<typeof buildEvidenceMap>) {
  const blockers = externalBlockers(evidence);
  const risks = blockers.map((blocker, index) => ({
    id: `RISK-${String(index + 1).padStart(3, "0")}`,
    severity: "P1",
    area: blocker.includes("RLS") ? "backend_rls_data" : "query_scale_performance",
    title: blocker.includes("RLS")
      ? "Dynamic cross-tenant RLS runtime proof requires live Supabase database target"
      : "Whole-app 50k EXPLAIN/p95 proof requires live database target",
    external_blocker: blocker,
    blocks_9_2: true,
    blocks_production_50k_claim: true,
  }));
  return {
    p0_remaining: 0,
    p1_remaining: risks.length,
    p2_remaining: 0,
    risks,
  };
}

function buildProof(params: {
  scorecard: JsonRecord;
  matrix: JsonRecord;
  riskRegister: ReturnType<typeof buildRiskRegister>;
}): string {
  const risks = params.riskRegister.risks;
  return [
    `# ${WAVE}`,
    "",
    `Status: ${params.matrix.final_status}`,
    "",
    `Previous score: ${params.matrix.previous_score}`,
    `Target after P1: ${params.matrix.target_score_after_p1}`,
    `Target after 50k: ${params.matrix.target_score_after_50k}`,
    `New score: ${params.scorecard.new_score_out_of_10}`,
    "",
    "Result:",
    `- new_score_out_of_10_gte_9_2: ${params.matrix.new_score_out_of_10_gte_9_2}`,
    `- p0_remaining: ${params.matrix.p0_remaining}`,
    `- p1_remaining: ${params.matrix.p1_remaining}`,
    "",
    "Blocking evidence:",
    ...(risks.length === 0 ? ["- none"] : risks.map((risk) => `- ${risk.id}: ${risk.external_blocker}`)),
    "",
    "Fake green claimed: false",
    "",
  ].join("\n");
}

export function buildFinal50k92ScoreReaudit() {
  const evidenceMap = buildEvidenceMap();
  const categories = buildCategories(evidenceMap);
  const releasePipelinePassed = evidenceMap.release_pipeline_passed;
  const fullJestPassed = releasePipelinePassed;
  const releaseVerifyPassed = releasePipelinePassed;
  const scoreCaps = buildCaps(evidenceMap, fullJestPassed, releaseVerifyPassed);
  const riskRegister = buildRiskRegister(evidenceMap);
  const weightedScore = Object.values(categories).reduce((sum, category) => sum + category.score, 0) / Object.keys(categories).length;
  const newScore = round1(Math.min(weightedScore, scoreCaps.effective_max_score));
  const blockers = externalBlockers(evidenceMap);
  const preliminaryFinalStatus = blockers.length === 0 && newScore >= 9.2
    ? GREEN_STATUS
    : blockers.length > 0
      ? `${BLOCKED_PREFIX}${blockers.join("_AND_")}`
      : "BLOCKED_INTERNAL_SCORE_BELOW_9_2";
  const finalGreenGuard = evaluateFinal50k92GreenReleaseGuard({
    finalStatus: preliminaryFinalStatus,
    fixtureSufficient: evidenceMap.fixture_sufficient,
    proofRunId: evidenceMap.proof_run_id,
    wholeApp50kLiveProofPassed: evidenceMap.whole_app_50k_proof_passed,
    rlsGreen: evidenceMap.rls_dynamic_proof_passed,
    fullJestPassed,
    releaseVerifyPassed,
  });
  const finalStatus = preliminaryFinalStatus === GREEN_STATUS && !finalGreenGuard.passed
    ? `${BLOCKED_PREFIX}${finalGreenGuard.blockers.join("_AND_").replace(/^BLOCKED_EXTERNAL_ONLY_/, "")}`
    : preliminaryFinalStatus;
  const scorecard = {
    wave: WAVE,
    previous_score: 8.4,
    target_score_after_p1: 8.8,
    target_score_after_50k: 9.2,
    new_score_out_of_10: newScore,
    new_score_out_of_10_gte_9_2: newScore >= 9.2,
    score_confidence: blockers.length === 0 ? "high" : "medium",
    categories,
    active_score_caps: scoreCaps.active_caps,
  };
  const matrix = {
    final_status: finalStatus,
    previous_score: 8.4,
    target_score_after_p1: 8.8,
    target_score_after_50k: 9.2,
    p0_remaining: riskRegister.p0_remaining,
    p1_remaining: riskRegister.p1_remaining,
    new_score_out_of_10: newScore,
    rls_dynamic_proof_passed: evidenceMap.rls_dynamic_proof_passed,
    fixture_sufficient: evidenceMap.fixture_sufficient,
    proof_run_id_present: evidenceMap.proof_run_id_present,
    whole_app_50k_proof_passed: evidenceMap.whole_app_50k_proof_passed,
    detail_p95_lte_300ms: evidenceMap.detail_p95_lte_300ms,
    pdf_signed_url_p95_lte_300ms: evidenceMap.pdf_signed_url_p95_lte_300ms,
    submit_publish_transaction_p95_lte_1000ms: evidenceMap.submit_publish_transaction_p95_lte_1000ms,
    query_boundary_resolved: evidenceMap.query_boundary_resolved,
    media_storage_100k_passed: evidenceMap.media_storage_100k_passed,
    ai_live_transcripts_passed: evidenceMap.ai_live_transcripts_passed,
    observability_rate_limits_passed: evidenceMap.observability_rate_limits_passed,
    security_privacy_passed: evidenceMap.security_privacy_passed,
    release_pipeline_passed: evidenceMap.release_pipeline_passed,
    full_jest_passed: fullJestPassed,
    release_verify_passed: releaseVerifyPassed,
    score_caps_applied: scoreCaps.score_caps_applied,
    new_score_out_of_10_gte_9_2: newScore >= 9.2,
    release_guard_requires_fixture_sufficient_for_final_9_2: true,
    final_50k_green_guard_passed: finalGreenGuard.passed,
    final_50k_green_guard_blockers: finalGreenGuard.blockers,
    fake_green_claimed: false,
    external_blockers: blockers,
  };
  return {
    scorecard,
    riskRegister,
    evidenceMap,
    scoreCaps,
    matrix,
    proofMd: buildProof({ scorecard, matrix, riskRegister }),
  };
}

export function writeFinal50k92ScoreReauditArtifacts() {
  const report = buildFinal50k92ScoreReaudit();
  writeJson("S_FINAL_50K_92_SCORE_scorecard.json", report.scorecard);
  writeJson("S_FINAL_50K_92_SCORE_risk_register.json", report.riskRegister);
  writeJson("S_FINAL_50K_92_SCORE_evidence_map.json", report.evidenceMap);
  writeJson("S_FINAL_50K_92_SCORE_score_caps.json", report.scoreCaps);
  writeJson("S_FINAL_50K_92_SCORE_matrix.json", report.matrix);
  writeText("S_FINAL_50K_92_SCORE_proof.md", report.proofMd);
  return report;
}

export {
  BLOCKED_STATUS as FINAL_50K_92_BLOCKED_STATUS,
  BLOCKED_PREFIX as FINAL_50K_92_BLOCKED_PREFIX,
  GREEN_STATUS as FINAL_50K_92_GREEN_STATUS,
  WAVE as FINAL_50K_92_WAVE,
};
