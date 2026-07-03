import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  buildCatalogQualityDashboard,
  GREEN_AI_ESTIMATE_CATALOG_QUALITY_DASHBOARD_READY_NO_BUILDS,
} from "./auditCatalogQualityDashboard";
import {
  validateProfessionalCatalogBatch,
  GREEN_AI_ESTIMATE_P0_PROFESSIONAL_CATALOG_BATCH_READY_NO_BUILDS,
} from "./validateProfessionalCatalogBatch";
import {
  buildCatalogBackfillBatches,
  GREEN_AI_ESTIMATE_CATALOG_BACKFILL_BATCHES_READY_NO_BUILDS,
} from "./buildCatalogBackfillBatches";
import {
  buildCatalogSourceRegistry,
  GREEN_AI_ESTIMATE_CATALOG_SOURCE_REGISTRY_READY_NO_BUILDS,
} from "./validateCatalogSourceRegistry";
import {
  buildWorkFamilyCoveragePlan,
} from "./buildWorkFamilyCoveragePlan";

export const GREEN_AI_ESTIMATE_P0_PROFESSIONAL_CATALOG_FACTORY_COMMITTED_NO_BUILDS =
  "GREEN_AI_ESTIMATE_P0_PROFESSIONAL_CATALOG_FACTORY_COMMITTED_NO_BUILDS" as const;
export const STOP_AI_ESTIMATE_P0_PROFESSIONAL_CATALOG_FACTORY_NOT_GREEN =
  "STOP_AI_ESTIMATE_P0_PROFESSIONAL_CATALOG_FACTORY_NOT_GREEN" as const;

const RUNTIME_ROOT = ".release-runtime/ai-estimate-p0-professional-catalog-factory";

type BrowserArtifactLink = {
  path: string | null;
  source_sha: string | null;
  status: string | null;
  final_status: string | null;
  browser_automation_started: boolean;
  actual_browser_smoke_passed: boolean;
  browser_evidence_written: boolean;
  route_equivalent_smoke_passed: boolean;
  fake_green_claimed: boolean | null;
  blockers: string[];
};

function gitOutput(args: string[], fallback = ""): string {
  try {
    return execFileSync("git", args, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 10_000,
    }).trim() || fallback;
  } catch {
    return fallback;
  }
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
  const visit = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const filePath = path.join(dir, name);
      const stat = statSync(filePath);
      if (stat.isDirectory()) visit(filePath);
      else if (name === "summary.json") summaries.push({ filePath, mtimeMs: stat.mtimeMs });
    }
  };
  visit(fullRoot);
  summaries.sort((left, right) => right.mtimeMs - left.mtimeMs);
  return summaries[0]?.filePath ?? null;
}

function readBrowserArtifact(kind: "web" | "android-chrome"): BrowserArtifactLink {
  const envPath = kind === "web"
    ? String(process.env.PROFESSIONAL_ESTIMATE_WEB_SMOKE_ARTIFACT ?? "").trim()
    : String(process.env.PROFESSIONAL_ESTIMATE_ANDROID_CHROME_SMOKE_ARTIFACT ?? "").trim();
  const filePath = envPath || latestSummaryFile(`.release-runtime/professional-ai-estimate-real-quantity-engine/${kind}`);
  if (!filePath) {
    return {
      path: null,
      source_sha: null,
      status: null,
      final_status: null,
      browser_automation_started: false,
      actual_browser_smoke_passed: false,
      browser_evidence_written: false,
      route_equivalent_smoke_passed: false,
      fake_green_claimed: null,
      blockers: [`${kind.toUpperCase()}_BROWSER_ARTIFACT_MISSING`],
    };
  }
  try {
    const parsed = JSON.parse(readFileSync(filePath, "utf8")) as Record<string, unknown>;
    const blockers = Array.isArray(parsed.blockers) ? parsed.blockers.map(String).filter(Boolean) : [];
    const actualPassed = kind === "web"
      ? parsed.actual_web_browser_smoke_passed === true
      : parsed.actual_android_chrome_browser_smoke_passed === true;
    return {
      path: path.relative(process.cwd(), filePath).replace(/\\/g, "/"),
      source_sha: String(parsed.source_sha ?? parsed.sourceSha ?? parsed.source_commit ?? ""),
      status: typeof parsed.status === "string" ? parsed.status : null,
      final_status: typeof parsed.final_status === "string" ? parsed.final_status : null,
      browser_automation_started: parsed.browser_automation_started === true,
      actual_browser_smoke_passed: actualPassed && blockers.length === 0,
      browser_evidence_written: parsed.browser_evidence_written === true || actualPassed,
      route_equivalent_smoke_passed: parsed.route_equivalent_smoke_passed === true,
      fake_green_claimed: typeof parsed.fake_green_claimed === "boolean"
        ? parsed.fake_green_claimed
        : typeof parsed.fakeGreenClaimed === "boolean"
          ? parsed.fakeGreenClaimed
          : null,
      blockers,
    };
  } catch (error) {
    return {
      path: path.relative(process.cwd(), filePath).replace(/\\/g, "/"),
      source_sha: null,
      status: null,
      final_status: null,
      browser_automation_started: false,
      actual_browser_smoke_passed: false,
      browser_evidence_written: false,
      route_equivalent_smoke_passed: false,
      fake_green_claimed: null,
      blockers: [`${kind.toUpperCase()}_BROWSER_ARTIFACT_UNREADABLE:${error instanceof Error ? error.message : String(error)}`],
    };
  }
}

export function runP0ProfessionalCatalogFactoryAudit(options: { writeSummary?: boolean } = {}) {
  const sourceSha = gitOutput(["rev-parse", "HEAD"], "unknown");
  const branch = gitOutput(["branch", "--show-current"], "unknown");
  const upstreamSync = gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"], "unknown");
  const worktreeClean = gitOutput(["status", "--porcelain=v1", "--untracked-files=all"], "") === "";
  const coverage = buildWorkFamilyCoveragePlan({ writeFiles: false });
  const backfill = buildCatalogBackfillBatches({ writeFiles: false });
  const sourceRegistry = buildCatalogSourceRegistry({ writeFiles: false });
  const dashboard = buildCatalogQualityDashboard({ writeFiles: false });
  const p0 = validateProfessionalCatalogBatch();
  const web = readBrowserArtifact("web");
  const androidChrome = readBrowserArtifact("android-chrome");
  const sourceGates = {
    focused_jest_passed: envFlag("P0_CATALOG_FACTORY_FOCUSED_JEST_PASSED"),
    typecheck_passed: envFlag("P0_CATALOG_FACTORY_TYPECHECK_PASSED"),
    lint_passed: envFlag("P0_CATALOG_FACTORY_LINT_PASSED"),
    ci_office_market_passed: envFlag("P0_CATALOG_FACTORY_CI_OFFICE_MARKET_PASSED"),
    git_diff_check_passed: envFlag("P0_CATALOG_FACTORY_GIT_DIFF_CHECK_PASSED"),
    test_weakening_guard_passed: envFlag("P0_CATALOG_FACTORY_TEST_WEAKENING_GUARD_PASSED"),
    web_public_smoke_passed: envFlag("P0_CATALOG_FACTORY_WEB_PUBLIC_SMOKE_PASSED"),
    secret_scan_passed: envFlag("P0_CATALOG_FACTORY_SECRET_SCAN_PASSED"),
  };
  const browserAutomationStarted = web.browser_automation_started && androidChrome.browser_automation_started;
  const blockers = [
    coverage.manifest_total_templates === 10000 ? "" : `coverage_manifest_total:${coverage.manifest_total_templates}`,
    coverage.ready_professional_count >= p0.p0_batch_ready_professional_template_count
      ? ""
      : "coverage_ready_count_below_p0_batch",
    backfill.final_status === GREEN_AI_ESTIMATE_CATALOG_BACKFILL_BATCHES_READY_NO_BUILDS ? "" : "catalog_backfill_batches_not_green",
    sourceRegistry.final_status === GREEN_AI_ESTIMATE_CATALOG_SOURCE_REGISTRY_READY_NO_BUILDS ? "" : "catalog_source_registry_not_green",
    dashboard.final_status === GREEN_AI_ESTIMATE_CATALOG_QUALITY_DASHBOARD_READY_NO_BUILDS ? "" : "catalog_quality_dashboard_not_green",
    p0.final_status === GREEN_AI_ESTIMATE_P0_PROFESSIONAL_CATALOG_BATCH_READY_NO_BUILDS ? "" : "p0_professional_batch_not_green",
    worktreeClean ? "" : "worktree_not_clean",
    upstreamSync === "0\t0" || upstreamSync === "0 0" ? "" : `upstream_not_synced:${upstreamSync}`,
    ...Object.entries(sourceGates).filter(([, passed]) => !passed).map(([name]) => `${name}:false`),
    web.actual_browser_smoke_passed ? "" : "actual_web_browser_smoke_not_green",
    androidChrome.actual_browser_smoke_passed ? "" : "actual_android_chrome_browser_smoke_not_green",
    web.source_sha === sourceSha ? "" : "web_browser_artifact_source_sha_mismatch",
    androidChrome.source_sha === sourceSha ? "" : "android_chrome_artifact_source_sha_mismatch",
    web.fake_green_claimed === false ? "" : "web_browser_artifact_fake_green_not_false",
    androidChrome.fake_green_claimed === false ? "" : "android_chrome_artifact_fake_green_not_false",
    web.route_equivalent_smoke_passed ? "web_route_equivalent_reported" : "",
    androidChrome.route_equivalent_smoke_passed ? "android_route_equivalent_reported" : "",
    ...web.blockers.map((reason) => `web:${reason}`),
    ...androidChrome.blockers.map((reason) => `android:${reason}`),
  ].filter(Boolean);
  const summary = {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_P0_PROFESSIONAL_CATALOG_FACTORY_COMMITTED_NO_BUILDS
      : STOP_AI_ESTIMATE_P0_PROFESSIONAL_CATALOG_FACTORY_NOT_GREEN,
    source_commit: sourceSha,
    source_sha: sourceSha,
    branch,
    upstream_sync: upstreamSync,
    pushed: upstreamSync === "0\t0" || upstreamSync === "0 0",
    worktree_clean: worktreeClean,
    committed: worktreeClean,
    generated_at: new Date().toISOString(),
    runtime_root: RUNTIME_ROOT,
    coverage_plan_ready: coverage.manifest_total_templates === 10000 &&
      coverage.ready_professional_count >= p0.p0_batch_ready_professional_template_count,
    catalog_backfill_batches_ready: backfill.final_status === GREEN_AI_ESTIMATE_CATALOG_BACKFILL_BATCHES_READY_NO_BUILDS,
    catalog_source_registry_ready: sourceRegistry.final_status === GREEN_AI_ESTIMATE_CATALOG_SOURCE_REGISTRY_READY_NO_BUILDS,
    catalog_quality_dashboard_ready: dashboard.final_status === GREEN_AI_ESTIMATE_CATALOG_QUALITY_DASHBOARD_READY_NO_BUILDS,
    p0_professional_batch_ready: p0.final_status === GREEN_AI_ESTIMATE_P0_PROFESSIONAL_CATALOG_BATCH_READY_NO_BUILDS,
    manifest_total_templates: coverage.manifest_total_templates,
    current_10000_ready_professional_count: coverage.ready_professional_count,
    current_10000_not_ready_count: coverage.not_ready_count,
    p0_required_case_count: p0.p0_required_case_count,
    p0_ready_professional_count: p0.p0_ready_professional_count,
    p0_batch_template_count: p0.p0_batch_template_count,
    p0_generic_fallback_count: p0.p0_generic_fallback_count,
    p0_synthetic_family_default_count: p0.p0_synthetic_family_default_count,
    p0_invalid_fake_source_count: p0.p0_invalid_fake_source_count,
    p0_blind_quantity_copy_count: p0.p0_blind_quantity_copy_count,
    p0_missing_formula_trace_count: p0.p0_missing_formula_trace_count,
    source_registry_row_source_count: sourceRegistry.row_source_count,
    source_registry_p0_source_count: sourceRegistry.p0_source_count,
    source_gates: sourceGates,
    focused_jest_passed: sourceGates.focused_jest_passed,
    typecheck_passed: sourceGates.typecheck_passed,
    lint_passed: sourceGates.lint_passed,
    ci_office_market_passed: sourceGates.ci_office_market_passed,
    git_diff_check_passed: sourceGates.git_diff_check_passed,
    test_weakening_guard_passed: sourceGates.test_weakening_guard_passed,
    web_public_smoke_passed: sourceGates.web_public_smoke_passed,
    secret_scan_passed: sourceGates.secret_scan_passed,
    browser_automation_started: browserAutomationStarted,
    actual_web_browser_smoke_passed: web.actual_browser_smoke_passed,
    actual_android_chrome_browser_smoke_passed: androidChrome.actual_browser_smoke_passed,
    browser_evidence_written: web.browser_evidence_written && androidChrome.browser_evidence_written,
    web_browser_artifact_path: web.path,
    android_chrome_browser_artifact_path: androidChrome.path,
    full_10000_real_norm_green_claimed: false,
    current_manifest_full_10000_ready: coverage.ready_professional_count === 10000 && coverage.not_ready_count === 0,
    fake_green_claimed: false,
    marketplace_touched: false,
    rfq_touched: false,
    warehouse_touched: false,
    payment_touched: false,
    production_db_touched: false,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    blockers,
  };

  if (options.writeSummary !== false) {
    const dir = path.join(process.cwd(), RUNTIME_ROOT, timestampForPath());
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "summary.json"), `${JSON.stringify({
      ...summary,
      runtime_summary_path: path.join(dir, "summary.json"),
    }, null, 2)}\n`, "utf8");
    writeFileSync(path.join(dir, "catalog-quality-dashboard.json"), `${JSON.stringify(dashboard, null, 2)}\n`, "utf8");
  }
  return summary;
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/auditP0ProfessionalCatalogFactory.ts")) {
  const summary = runP0ProfessionalCatalogFactoryAudit();
  console.log(JSON.stringify(summary, null, 2));
  process.exitCode = summary.final_status === GREEN_AI_ESTIMATE_P0_PROFESSIONAL_CATALOG_FACTORY_COMMITTED_NO_BUILDS ? 0 : 1;
}
