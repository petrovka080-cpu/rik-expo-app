import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { renderOwnerReviewPacketPdf } from "../../src/features/pdf/renderOwnerReviewPacketPdf";
import { validateOwnerReviewPacketPdf } from "../../src/features/pdf/validateOwnerReviewPacketPdf";
import { buildDefaultAiEstimateOwnerReviewChecklist } from "../../src/lib/platform/aiEstimateGoNoGoChecklist";
import { validateAiEstimateBusinessReadiness } from "../../src/lib/platform/validateAiEstimateBusinessReadiness";
import {
  currentBranch,
  currentSourceSha,
  currentUpstreamSync,
  hasFlag,
  newestSummary,
  writeRuntimeJson,
} from "../e2e/renderStagingAcceptanceCore";
import {
  GREEN_AI_ESTIMATE_OWNER_REVIEW_ANDROID_SMOKE,
} from "../e2e/runOwnerReviewReadinessAndroidSmoke";
import {
  GREEN_AI_ESTIMATE_OWNER_REVIEW_WEB_SMOKE,
} from "../e2e/runOwnerReviewReadinessWebSmoke";
import {
  auditAiEstimateOwnerReviewPrerequisites,
  GREEN_AI_ESTIMATE_OWNER_REVIEW_PREREQUISITES,
} from "./auditAiEstimateOwnerReviewPrerequisites";
import {
  auditAiEstimatePilotKpiReadiness,
  GREEN_AI_ESTIMATE_PILOT_KPI_READINESS,
} from "./auditAiEstimatePilotKpiReadiness";
import {
  auditAiEstimatePilotOperatingModel,
  GREEN_AI_ESTIMATE_PILOT_OPERATING_MODEL,
} from "./auditAiEstimatePilotOperatingModel";

const ROOT = path.join(".release-runtime", "ai-estimate-owner-review-pilot-operating-system");
const WEB_ROOT = path.join(ROOT, "web");
const ANDROID_ROOT = path.join(ROOT, "android-chrome");
const DOC_ROOT = path.join("docs", "ai-estimate-owner-review");

export const GREEN_AI_ESTIMATE_OWNER_REVIEW_PILOT_OPERATING_SYSTEM =
  "GREEN_AI_ESTIMATE_OWNER_REVIEW_PILOT_OPERATING_SYSTEM_READY_NO_RELEASE" as const;
export const STOP_AI_ESTIMATE_OWNER_REVIEW_PILOT_OPERATING_SYSTEM =
  "STOP_AI_ESTIMATE_OWNER_REVIEW_PILOT_OPERATING_SYSTEM_INCOMPLETE_NO_GREEN" as const;

type SummaryLike = Record<string, unknown>;

const REQUIRED_DOCS = {
  owner_go_no_go_packet_created: "OWNER_GO_NO_GO_PACKET.md",
  current_status_doc_created: "AI_ESTIMATE_CURRENT_STATUS.md",
  known_limitations_doc_created: "KNOWN_LIMITATIONS.md",
  pilot_scope_doc_created: "PILOT_SCOPE.md",
  support_playbook_created: "PILOT_SUPPORT_PLAYBOOK.md",
  rollback_kill_switch_doc_created: "ROLLBACK_AND_KILL_SWITCH.md",
  risk_register_created: "RISK_REGISTER.md",
  go_no_go_checklist_created_doc: "GO_NO_GO_CHECKLIST.md",
} as const;

function gitStatusPorcelain(): string {
  return execFileSync("git", ["status", "--porcelain=v1", "--untracked-files=all"], {
    encoding: "utf8",
  }).trim();
}

function finalStatus(summary: SummaryLike | null | undefined): string {
  return String(summary?.final_status ?? "");
}

function sourceSha(summary: SummaryLike | null | undefined): string {
  return String(summary?.source_sha ?? "");
}

function flag(name: string): boolean {
  return hasFlag(name);
}

function docBooleans() {
  return Object.fromEntries(
    Object.entries(REQUIRED_DOCS).map(([key, fileName]) => {
      const filePath = path.join(DOC_ROOT, fileName);
      const text = existsSync(filePath) ? readFileSync(filePath, "utf8") : "";
      return [key, existsSync(filePath) && text.includes("owner_go_no_go_status=PENDING_OWNER_REVIEW")];
    }),
  ) as Record<keyof typeof REQUIRED_DOCS, boolean>;
}

function latestOwnerWeb(head: string) {
  return newestSummary<SummaryLike>(WEB_ROOT, (summary) =>
    finalStatus(summary) === GREEN_AI_ESTIMATE_OWNER_REVIEW_WEB_SMOKE && sourceSha(summary) === head
  );
}

function latestOwnerAndroid(head: string) {
  return newestSummary<SummaryLike>(ANDROID_ROOT, (summary) =>
    finalStatus(summary) === GREEN_AI_ESTIMATE_OWNER_REVIEW_ANDROID_SMOKE && sourceSha(summary) === head
  );
}

export function auditAiEstimateOwnerReviewPilotOperatingSystem() {
  const head = currentSourceSha();
  const branch = currentBranch();
  const upstreamSync = currentUpstreamSync();
  const gitStatus = gitStatusPorcelain();
  const docs = docBooleans();
  const dependencies = auditAiEstimateOwnerReviewPrerequisites().artifact;
  const business = validateAiEstimateBusinessReadiness();
  const pilotModel = auditAiEstimatePilotOperatingModel().artifact;
  const kpi = auditAiEstimatePilotKpiReadiness().artifact;
  const pdf = validateOwnerReviewPacketPdf(renderOwnerReviewPacketPdf());
  const checklist = buildDefaultAiEstimateOwnerReviewChecklist();
  const web = latestOwnerWeb(head);
  const android = latestOwnerAndroid(head);
  const webPassed =
    web?.summary.actual_web_browser_owner_review_smoke_passed === true &&
    web.summary.web_owner_review_cases_passed === "20/20" &&
    web.summary.web_known_limitations_visible === true &&
    web.summary.web_contract_total_not_claimed === true &&
    web.summary.web_owner_approval_pending === true &&
    Number(web.summary.web_console_errors_count ?? -1) === 0;
  const androidPassed =
    android?.summary.actual_android_emulator_owner_review_smoke_passed === true &&
    android.summary.android_owner_review_cases_passed === "20/20" &&
    android.summary.android_known_limitations_visible === true &&
    android.summary.android_contract_total_not_claimed === true &&
    android.summary.android_owner_approval_pending === true &&
    Number(android.summary.android_console_errors_count ?? -1) === 0 &&
    android.summary.android_emulator_health_degraded === false;
  const sourceGates = {
    targeted_tests_passed: flag("targeted-tests-passed"),
    typecheck_passed: flag("typecheck-passed"),
    lint_passed: flag("lint-passed"),
    diff_check_passed: flag("diff-check-passed"),
    no_test_weakening_passed: flag("no-test-weakening-passed"),
    web_public_smoke_passed: flag("web-public-smoke-passed"),
    ci_office_market_passed: flag("ci-office-market-passed"),
    secret_scan_passed: flag("secret-scan-passed"),
  };
  const blockers = [
    branch === "release/ios-after-build48-integration" ? "" : `branch:${branch}`,
    upstreamSync === "0 0" ? "" : `upstream_sync:${upstreamSync}`,
    gitStatus.length === 0 ? "" : "worktree_not_clean",
    Object.values(docs).every(Boolean) ? "" : "owner_review_docs_missing_or_incomplete",
    dependencies.final_status === GREEN_AI_ESTIMATE_OWNER_REVIEW_PREREQUISITES
      ? ""
      : "owner_review_prerequisites_failed",
    business.passed ? "" : `business_readiness:${business.failures.join("|")}`,
    pilotModel.final_status === GREEN_AI_ESTIMATE_PILOT_OPERATING_MODEL ? "" : "pilot_operating_model_failed",
    kpi.final_status === GREEN_AI_ESTIMATE_PILOT_KPI_READINESS ? "" : "pilot_kpi_failed",
    pdf.owner_review_pdf_valid ? "" : `owner_review_pdf:${pdf.blockers.join("|")}`,
    checklist.go_cannot_be_auto_set_by_agent && checklist.owner_decision_pending ? "" : "go_no_go_checklist_failed",
    webPassed ? "" : web ? "web_owner_review_smoke_failed" : "web_owner_review_smoke_missing_or_stale",
    androidPassed ? "" : android ? "android_owner_review_smoke_failed" : "android_owner_review_smoke_missing_or_stale",
    ...Object.entries(sourceGates).map(([key, value]) => (value ? "" : key)),
  ].filter(Boolean);
  const summary = {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_OWNER_REVIEW_PILOT_OPERATING_SYSTEM
      : STOP_AI_ESTIMATE_OWNER_REVIEW_PILOT_OPERATING_SYSTEM,
    source_sha: head,
    branch,
    upstream_sync: upstreamSync,
    generated_at: new Date().toISOString(),
    technical_pilot_ready: blockers.length === 0,
    owner_approved: false,
    owner_go_no_go_status: "PENDING_OWNER_REVIEW",
    production_release_started: false,
    contract_total_claimed: false,
    public_beta_started: false,
    owner_go_no_go_packet_created: docs.owner_go_no_go_packet_created,
    current_status_doc_created: docs.current_status_doc_created,
    known_limitations_doc_created: docs.known_limitations_doc_created,
    pilot_scope_doc_created: docs.pilot_scope_doc_created,
    support_playbook_created: docs.support_playbook_created,
    rollback_kill_switch_doc_created: docs.rollback_kill_switch_doc_created,
    risk_register_created: docs.risk_register_created,
    business_readiness_contract_created: business.business_readiness_contract_created,
    owner_approval_not_faked: business.owner_approval_not_faked,
    production_release_not_started: business.production_release_not_started,
    contract_total_not_claimed: business.contract_total_not_claimed,
    known_limitations_visible: business.known_limitations_visible,
    kill_switch_available: business.kill_switch_available,
    support_playbook_available: business.support_playbook_available,
    pilot_operating_model_created: pilotModel.pilot_operating_model_created === true,
    p0_auto_stop_enabled: pilotModel.p0_auto_stop_enabled === true,
    owner_go_no_go_required: pilotModel.owner_go_no_go_required === true,
    pilot_kpi_contract_created: kpi.pilot_kpi_contract_created === true,
    p0_slo_defined: kpi.p0_slo_defined === true,
    owner_review_pdf_created: pdf.owner_review_pdf_created,
    owner_review_pdf_valid: pdf.owner_review_pdf_valid,
    go_no_go_checklist_created: checklist.go_no_go_checklist_created,
    go_cannot_be_auto_set_by_agent: checklist.go_cannot_be_auto_set_by_agent,
    actual_web_browser_owner_review_smoke_passed: webPassed,
    web_owner_review_cases_passed: String(web?.summary.web_owner_review_cases_passed ?? "0/20"),
    web_console_errors_count: Number(web?.summary.web_console_errors_count ?? -1),
    actual_android_emulator_owner_review_smoke_passed: androidPassed,
    android_owner_review_cases_passed: String(android?.summary.android_owner_review_cases_passed ?? "0/20"),
    android_console_errors_count: Number(android?.summary.android_console_errors_count ?? -1),
    owner_review_dependency_audit_created: dependencies.owner_review_dependency_audit_created === true,
    required_dependencies_checked: dependencies.required_dependencies_checked === true,
    stale_required_green_rejected: dependencies.stale_required_green_rejected === true,
    missing_optional_layers_marked_not_evaluated: dependencies.missing_optional_layers_marked_not_evaluated === true,
    ...sourceGates,
    marketplace_touched: false,
    rfq_touched: false,
    warehouse_touched: false,
    payment_touched: false,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    production_db_touched: false,
    fake_green_claimed: false,
    web_summary_path: web?.path ?? null,
    android_summary_path: android?.path ?? null,
    dependency_summary_path: dependencies ? "written_by_audit" : null,
    blocking_reasons: blockers,
  };
  const result = writeRuntimeJson(ROOT, summary);
  return { artifactPath: result.artifactPath, artifact: summary };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/auditAiEstimateOwnerReviewPilotOperatingSystem.ts")) {
  const result = auditAiEstimateOwnerReviewPilotOperatingSystem();
  console.log(JSON.stringify({
    artifact: result.artifactPath,
    final_status: result.artifact.final_status,
    blocking_reasons: result.artifact.blocking_reasons,
  }, null, 2));
  if (result.artifact.final_status !== GREEN_AI_ESTIMATE_OWNER_REVIEW_PILOT_OPERATING_SYSTEM) process.exitCode = 1;
}
