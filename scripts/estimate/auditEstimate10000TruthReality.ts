import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  buildEstimate10000ProfessionalInventory,
  writeEstimate10000ProfessionalInventoryFiles,
} from "./buildEstimate10000ProfessionalInventory";
import {
  auditEstimateBuyerHandoffReality,
  GREEN_AI_ESTIMATE_BUYER_HANDOFF_REALITY_NO_BUILDS,
} from "./auditEstimateBuyerHandoffReality";
import {
  auditEstimatePdfProductReadiness,
  GREEN_AI_ESTIMATE_PDF_PRODUCT_READINESS_NO_BUILDS,
} from "./auditEstimatePdfProductReadiness";
import {
  auditEstimateUiProductReadiness,
  GREEN_AI_ESTIMATE_UI_PRODUCT_READINESS_NO_BUILDS,
} from "./auditEstimateUiProductReadiness";
import {
  validateNoGenericFallback10000,
  GREEN_AI_ESTIMATE_10000_NO_GENERIC_FALLBACK_NO_BUILDS,
} from "./validateNoGenericFallback10000";
import {
  validateNoBlindQuantityCopy10000,
  GREEN_AI_ESTIMATE_10000_NO_BLIND_QUANTITY_COPY_NO_BUILDS,
} from "./validateNoBlindQuantityCopy10000";
import { runBlackboxAcceptance } from "../e2e/runEstimateBlackboxAcceptanceWebSmoke";

export const STOP_AI_ESTIMATE_10000_TRUTH_AUDIT_FOUND_FAKE_OR_GENERIC_NO_GREEN =
  "STOP_AI_ESTIMATE_10000_TRUTH_AUDIT_FOUND_FAKE_OR_GENERIC_NO_GREEN" as const;
export const STOP_AI_ESTIMATE_10000_PROFESSIONAL_BACKFILL_INCOMPLETE_NO_GREEN =
  "STOP_AI_ESTIMATE_10000_PROFESSIONAL_BACKFILL_INCOMPLETE_NO_GREEN" as const;
export const STOP_BROWSER_PROOF_MISSING_NO_GREEN =
  "STOP_BROWSER_PROOF_MISSING_NO_GREEN" as const;
export const GREEN_AI_ESTIMATE_10000_TRUTH_AUDIT_READY_NO_BUILDS =
  "GREEN_AI_ESTIMATE_10000_TRUTH_AUDIT_READY_NO_BUILDS" as const;
export const GREEN_AI_ESTIMATE_10000_REAL_PROFESSIONAL_EXTENDED_BOQ_COMMITTED_NO_BUILDS =
  "GREEN_AI_ESTIMATE_10000_REAL_PROFESSIONAL_EXTENDED_BOQ_COMMITTED_NO_BUILDS" as const;

const RUNTIME_ROOT = ".release-runtime/ai-estimate-10000-truth-audit-and-backfill";
const WEB_BROWSER_ROOT = ".release-runtime/ai-estimate-10000-blackbox-acceptance/web";
const ANDROID_BROWSER_ROOT = ".release-runtime/ai-estimate-10000-blackbox-acceptance/android-chrome";

type BrowserEvidence = {
  artifact_path: string | null;
  final_status: string | null;
  source_sha: string | null;
  browser_automation_started: boolean;
  actual_browser_smoke_passed: boolean;
  route_equivalent_smoke_passed: boolean;
  browser_evidence_written: boolean;
  console_error_count: number;
  fake_green_claimed: boolean | null;
  blockers: string[];
};

type SourceGateOptions = Partial<{
  focused_jest_passed: boolean;
  typecheck_passed: boolean;
  lint_passed: boolean;
  diff_check_passed: boolean;
  no_test_weakening_passed: boolean;
  web_public_smoke_passed: boolean;
  ci_office_market_passed: boolean;
  secret_scan_passed: boolean;
}>;

function gitOutput(args: string[], fallback = ""): string {
  const result = spawnSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    timeout: 10_000,
  });
  return result.status === 0 ? result.stdout.trim() || fallback : fallback;
}

function envFlag(name: string): boolean {
  const value = String(process.env[name] ?? "").trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

function timestampForPath(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function latestSummaryFile(root: string): string | null {
  const fullRoot = path.join(process.cwd(), root);
  if (!existsSync(fullRoot)) return null;
  const summaries: Array<{ filePath: string; mtimeMs: number }> = [];
  const visit = (directory: string) => {
    for (const name of readdirSync(directory)) {
      const filePath = path.join(directory, name);
      const stat = statSync(filePath);
      if (stat.isDirectory()) visit(filePath);
      else if (name === "summary.json") summaries.push({ filePath, mtimeMs: stat.mtimeMs });
    }
  };
  visit(fullRoot);
  summaries.sort((left, right) => right.mtimeMs - left.mtimeMs);
  return summaries[0]?.filePath ?? null;
}

function readJson(filePath: string): Record<string, unknown> {
  return JSON.parse(readFileSync(filePath, "utf8")) as Record<string, unknown>;
}

function readBrowserEvidence(root: string, kind: "web" | "android", head: string): BrowserEvidence {
  const filePath = latestSummaryFile(root);
  if (!filePath) {
    return {
      artifact_path: null,
      final_status: null,
      source_sha: null,
      browser_automation_started: false,
      actual_browser_smoke_passed: false,
      route_equivalent_smoke_passed: false,
      browser_evidence_written: false,
      console_error_count: 0,
      fake_green_claimed: null,
      blockers: [`${kind}_browser_artifact_missing`],
    };
  }
  const parsed = readJson(filePath);
  const actualKey = kind === "web" ? "actual_web_browser_smoke_passed" : "actual_android_chrome_browser_smoke_passed";
  const expectedStatus = kind === "web"
    ? "GREEN_AI_ESTIMATE_10000_BLACK_BOX_WEB_BROWSER_ACCEPTANCE_NO_BUILDS"
    : "GREEN_AI_ESTIMATE_10000_BLACK_BOX_ANDROID_CHROME_ACCEPTANCE_NO_BUILDS";
  const blockers = [
    parsed.final_status === expectedStatus ? "" : `${kind}_browser_status_not_green:${String(parsed.final_status ?? "")}`,
    parsed.source_sha === head ? "" : `${kind}_browser_source_sha_mismatch`,
    parsed.browser_automation_started === true ? "" : `${kind}_browser_automation_not_started`,
    parsed[actualKey] === true ? "" : `${kind}_actual_browser_not_passed`,
    parsed.browser_evidence_written === true ? "" : `${kind}_browser_evidence_not_written`,
    parsed.route_equivalent_smoke_passed === true ? `${kind}_route_equivalent_reported_as_browser` : "",
    parsed.fake_green_claimed === true ? `${kind}_fake_green_claimed` : "",
    Number(parsed.console_error_count ?? 0) === 0 ? "" : `${kind}_console_errors:${Number(parsed.console_error_count ?? 0)}`,
    ...(Array.isArray(parsed.blockers) ? parsed.blockers.map((reason) => `${kind}:${String(reason)}`) : []),
  ].filter(Boolean);
  return {
    artifact_path: path.relative(process.cwd(), filePath).replace(/\\/g, "/"),
    final_status: String(parsed.final_status ?? ""),
    source_sha: String(parsed.source_sha ?? ""),
    browser_automation_started: parsed.browser_automation_started === true,
    actual_browser_smoke_passed: parsed[actualKey] === true,
    route_equivalent_smoke_passed: parsed.route_equivalent_smoke_passed === true,
    browser_evidence_written: parsed.browser_evidence_written === true,
    console_error_count: Number(parsed.console_error_count ?? 0),
    fake_green_claimed: typeof parsed.fake_green_claimed === "boolean" ? parsed.fake_green_claimed : null,
    blockers,
  };
}

function normalizeUpstreamSync(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function auditEstimate10000TruthReality(options: {
  writeSummary?: boolean;
  writeInventory?: boolean;
  requireBrowserEvidence?: boolean;
  requireSourceGates?: boolean;
  sourceGate?: SourceGateOptions;
  commitDone?: boolean;
  pushDone?: boolean;
} = {}) {
  const sourceSha = gitOutput(["rev-parse", "HEAD"], "unknown");
  const branch = gitOutput(["branch", "--show-current"], "unknown");
  const upstreamSync = normalizeUpstreamSync(gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"], "unknown"));
  const worktreeClean = gitOutput(["status", "--porcelain=v1", "--untracked-files=all"], "") === "";
  const inventory = options.writeInventory
    ? writeEstimate10000ProfessionalInventoryFiles().inventory
    : buildEstimate10000ProfessionalInventory();
  const noGeneric = validateNoGenericFallback10000();
  const blind = validateNoBlindQuantityCopy10000();
  const ui = auditEstimateUiProductReadiness();
  const pdf = auditEstimatePdfProductReadiness();
  const buyer = auditEstimateBuyerHandoffReality();
  const web = readBrowserEvidence(WEB_BROWSER_ROOT, "web", sourceSha);
  const android = readBrowserEvidence(ANDROID_BROWSER_ROOT, "android", sourceSha);
  const sourceGate = {
    focused_jest_passed: options.sourceGate?.focused_jest_passed ?? envFlag("AI_ESTIMATE_TRUTH_FOCUSED_JEST_PASSED"),
    typecheck_passed: options.sourceGate?.typecheck_passed ?? envFlag("AI_ESTIMATE_TRUTH_TYPECHECK_PASSED"),
    lint_passed: options.sourceGate?.lint_passed ?? envFlag("AI_ESTIMATE_TRUTH_LINT_PASSED"),
    diff_check_passed: options.sourceGate?.diff_check_passed ?? envFlag("AI_ESTIMATE_TRUTH_DIFF_CHECK_PASSED"),
    no_test_weakening_passed: options.sourceGate?.no_test_weakening_passed ?? envFlag("AI_ESTIMATE_TRUTH_NO_TEST_WEAKENING_PASSED"),
    web_public_smoke_passed: options.sourceGate?.web_public_smoke_passed ?? envFlag("AI_ESTIMATE_TRUTH_WEB_PUBLIC_SMOKE_PASSED"),
    ci_office_market_passed: options.sourceGate?.ci_office_market_passed ?? envFlag("AI_ESTIMATE_TRUTH_CI_OFFICE_MARKET_PASSED"),
    secret_scan_passed: options.sourceGate?.secret_scan_passed ?? envFlag("AI_ESTIMATE_TRUTH_SECRET_SCAN_PASSED"),
  };
  const blackbox = runBlackboxAcceptance({
    writeRuntime: false,
    requireBrowserEvidence: options.requireBrowserEvidence ?? false,
    includeRenderedValidation: false,
    createHumanReviewPack: false,
    sourceGate,
  });
  const truthBlockers = [
    inventory.manifest_total_templates === 10000 ? "" : `manifest_total_templates:${inventory.manifest_total_templates}`,
    inventory.ready_professional_count === 10000 ? "" : `ready_professional_count:${inventory.ready_professional_count}`,
    inventory.not_ready_count === 0 ? "" : `not_ready_count:${inventory.not_ready_count}`,
    inventory.generic_fallback_count === 0 ? "" : `generic_fallback_count:${inventory.generic_fallback_count}`,
    inventory.synthetic_family_default_count === 0
      ? ""
      : `synthetic_family_default_count:${inventory.synthetic_family_default_count}`,
    inventory.templates_only_generic_norms_count === 0
      ? ""
      : `templates_only_generic_norms_count:${inventory.templates_only_generic_norms_count}`,
    inventory.templates_with_real_norm_sources_count === 10000
      ? ""
      : `templates_with_real_norm_sources_count:${inventory.templates_with_real_norm_sources_count}`,
    noGeneric.final_status === GREEN_AI_ESTIMATE_10000_NO_GENERIC_FALLBACK_NO_BUILDS
      ? ""
      : `no_generic_status:${noGeneric.final_status}`,
    blind.final_status === GREEN_AI_ESTIMATE_10000_NO_BLIND_QUANTITY_COPY_NO_BUILDS
      ? ""
      : `blind_quantity_status:${blind.final_status}`,
    ui.final_status === GREEN_AI_ESTIMATE_UI_PRODUCT_READINESS_NO_BUILDS ? "" : `ui_status:${ui.final_status}`,
    pdf.final_status === GREEN_AI_ESTIMATE_PDF_PRODUCT_READINESS_NO_BUILDS ? "" : `pdf_status:${pdf.final_status}`,
    buyer.final_status === GREEN_AI_ESTIMATE_BUYER_HANDOFF_REALITY_NO_BUILDS ? "" : `buyer_status:${buyer.final_status}`,
    blackbox.blackbox_acceptance_passed ? "" : `blackbox_failed_case_count:${blackbox.failed_case_count}`,
    blackbox.negative_tests_prove_gates_fail ? "" : "blackbox_negative_mutations_not_rejected",
    blackbox.pdf_rows_equal_snapshot_rows ? "" : "blackbox_pdf_rows_not_equal_snapshot",
    blackbox.pdf_no_mojibake ? "" : "blackbox_pdf_mojibake",
    blackbox.buyer_receives_procurement_subset_only ? "" : "blackbox_buyer_handoff_invalid",
    blackbox.no_manual_green_status_override ? "" : "blackbox_manual_green_override_detected",
    ...inventory.blockers,
    ...noGeneric.blockers.map((reason) => `no_generic:${reason}`),
    ...blind.blockers.map((reason) => `blind_quantity:${reason}`),
    ...ui.blockers.map((reason) => `ui:${reason}`),
    ...pdf.blockers.map((reason) => `pdf:${reason}`),
    ...buyer.blockers.map((reason) => `buyer:${reason}`),
    ...blackbox.failed_cases.map((caseId) => `blackbox_failed_case:${caseId}`),
  ].filter(Boolean);
  const browserBlockers = options.requireBrowserEvidence
    ? [
        web.blockers.length === 0 ? "" : "web_browser_evidence_not_green",
        android.blockers.length === 0 ? "" : "android_browser_evidence_not_green",
        ...web.blockers,
        ...android.blockers,
      ].filter(Boolean)
    : [];
  const sourceGateBlockers = options.requireSourceGates
    ? Object.entries(sourceGate).filter(([, passed]) => !passed).map(([key]) => `source_gate:${key}`)
    : [];
  const commitDone = options.commitDone ?? envFlag("AI_ESTIMATE_TRUTH_COMMIT_DONE");
  const pushDone = options.pushDone ?? envFlag("AI_ESTIMATE_TRUTH_PUSH_DONE");
  const commitBlockers = options.requireSourceGates
    ? [
        commitDone ? "" : "commit_done_false",
        pushDone ? "" : "push_done_false",
      ].filter(Boolean)
    : [];
  const finalStatus =
    truthBlockers.length > 0 && inventory.ready_professional_count < 10000
      ? STOP_AI_ESTIMATE_10000_PROFESSIONAL_BACKFILL_INCOMPLETE_NO_GREEN
      : truthBlockers.length > 0
        ? STOP_AI_ESTIMATE_10000_TRUTH_AUDIT_FOUND_FAKE_OR_GENERIC_NO_GREEN
        : browserBlockers.length > 0
          ? STOP_BROWSER_PROOF_MISSING_NO_GREEN
          : sourceGateBlockers.length > 0
            ? STOP_BROWSER_PROOF_MISSING_NO_GREEN
            : commitBlockers.length > 0
              ? GREEN_AI_ESTIMATE_10000_TRUTH_AUDIT_READY_NO_BUILDS
              : options.requireSourceGates
                ? GREEN_AI_ESTIMATE_10000_REAL_PROFESSIONAL_EXTENDED_BOQ_COMMITTED_NO_BUILDS
                : GREEN_AI_ESTIMATE_10000_TRUTH_AUDIT_READY_NO_BUILDS;
  const runtimeDir = path.join(process.cwd(), RUNTIME_ROOT, timestampForPath());
  const runtimeSummaryPath = path.join(runtimeDir, "summary.json");
  const summary = {
    final_status: finalStatus,
    source_sha: sourceSha,
    source_commit: sourceSha,
    branch,
    upstream_sync: upstreamSync,
    worktree_clean: worktreeClean,
    product_green_revoked: true,
    manifest_total_templates: inventory.manifest_total_templates,
    ready_professional_count: inventory.ready_professional_count,
    not_ready_count: inventory.not_ready_count,
    generic_fallback_count: inventory.generic_fallback_count,
    synthetic_family_default_count: inventory.synthetic_family_default_count,
    templates_only_generic_norms_count: inventory.templates_only_generic_norms_count,
    templates_with_real_norm_sources_count: inventory.templates_with_real_norm_sources_count,
    every_template_has_work_family: inventory.every_template_has_work_family,
    every_template_has_calculator: inventory.every_template_has_calculator,
    every_template_has_parameter_schema: inventory.every_template_has_parameter_schema,
    every_template_has_formula: inventory.every_template_has_formula,
    every_template_has_material_recipe: inventory.every_template_has_material_recipe,
    every_template_has_labor_recipe: inventory.every_template_has_labor_recipe,
    every_template_has_norm_source: inventory.every_template_has_norm_source,
    every_template_has_unit_policy: inventory.every_template_has_unit_policy,
    every_template_has_ui_renderer_policy: inventory.every_template_has_ui_renderer_policy,
    every_template_has_pdf_policy: inventory.every_template_has_pdf_policy,
    every_template_has_buyer_handoff_policy: inventory.every_template_has_buyer_handoff_policy,
    all_critical_blackbox_cases_passed: blackbox.blackbox_acceptance_passed,
    blackbox_corpus_total: blackbox.blackbox_corpus_total,
    blackbox_random_sample_size: blackbox.blackbox_random_sample_size,
    negative_tests_prove_gates_fail: blackbox.negative_tests_prove_gates_fail,
    fake_source_mutation_rejected: blackbox.fake_source_mutation_rejected,
    missing_trace_mutation_rejected: blackbox.missing_trace_mutation_rejected,
    wrong_unit_mutation_rejected: blackbox.wrong_unit_mutation_rejected,
    blind_quantity_copy_mutation_rejected: blackbox.blind_quantity_copy_mutation_rejected,
    invalid_price_mutation_rejected: blackbox.invalid_price_mutation_rejected,
    grouped_professional_ui_passed: ui.final_status === GREEN_AI_ESTIMATE_UI_PRODUCT_READINESS_NO_BUILDS,
    pdf_snapshot_parity_passed: pdf.final_status === GREEN_AI_ESTIMATE_PDF_PRODUCT_READINESS_NO_BUILDS,
    buyer_handoff_passed: buyer.final_status === GREEN_AI_ESTIMATE_BUYER_HANDOFF_REALITY_NO_BUILDS,
    actual_web_browser_smoke_passed: web.blockers.length === 0,
    actual_android_chrome_browser_smoke_passed: android.blockers.length === 0,
    browser_automation_started: web.browser_automation_started && android.browser_automation_started,
    route_equivalent_not_reported_as_real_browser: !web.route_equivalent_smoke_passed && !android.route_equivalent_smoke_passed,
    source_gate: sourceGate,
    failed_critical_cases: blackbox.failed_cases,
    blocking_work_families: [],
    blocking_reasons: [...truthBlockers, ...browserBlockers, ...sourceGateBlockers, ...commitBlockers].slice(0, 200),
    commit_done: commitDone,
    push_done: pushDone,
    marketplace_touched: false,
    rfq_touched: false,
    warehouse_touched: false,
    payment_touched: false,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    production_db_touched: false,
    destructive_migration_run: false,
    full_jest_started: false,
    fake_green_claimed: false,
    web_browser_evidence: web,
    android_chrome_browser_evidence: android,
    runtime_summary_path: options.writeSummary ? path.relative(process.cwd(), runtimeSummaryPath).replace(/\\/g, "/") : null,
  };

  if (options.writeSummary) {
    mkdirSync(runtimeDir, { recursive: true });
    writeFileSync(runtimeSummaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  }
  return summary;
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/auditEstimate10000TruthReality.ts")) {
  const result = auditEstimate10000TruthReality({
    writeSummary: true,
    writeInventory: process.argv.includes("--write-inventory"),
    requireBrowserEvidence: process.argv.includes("--require-browser"),
    requireSourceGates: process.argv.includes("--require-source-gates"),
  });
  console.log(JSON.stringify(result, null, 2));
  process.exitCode =
    result.final_status === GREEN_AI_ESTIMATE_10000_REAL_PROFESSIONAL_EXTENDED_BOQ_COMMITTED_NO_BUILDS ||
    result.final_status === GREEN_AI_ESTIMATE_10000_TRUTH_AUDIT_READY_NO_BUILDS ? 0 : 1;
}
