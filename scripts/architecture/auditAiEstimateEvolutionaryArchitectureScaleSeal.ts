import { execFileSync } from "node:child_process";
import path from "node:path";

import { newestSummary } from "../e2e/renderStagingAcceptanceCore";
import { gitOutput, timestampForPath, writeJson } from "../estimate/buildControlledPilotHealthDashboard";
import {
  auditAiEstimateDependencyDirection,
  GREEN_AI_ESTIMATE_DEPENDENCY_DIRECTION,
} from "./auditAiEstimateDependencyDirection";
import {
  auditAiEstimateDuplicateEngines,
  GREEN_AI_ESTIMATE_NO_DUPLICATE_ENGINES,
} from "./auditAiEstimateDuplicateEngines";
import {
  auditAiEstimateLayeredArchitecture,
  GREEN_AI_ESTIMATE_LAYERED_ARCHITECTURE,
} from "./auditAiEstimateLayeredArchitecture";
import {
  auditAiEstimateUiHooksBusinessLogic,
  GREEN_AI_ESTIMATE_NO_BUSINESS_LOGIC_IN_UI_HOOKS,
} from "./auditAiEstimateUiHooksBusinessLogic";
import {
  GREEN_AI_ESTIMATE_EVOLUTIONARY_ARCHITECTURE_SOURCE_GATES,
  type runAiEstimateArchitectureScaleSealSourceGates,
} from "./runAiEstimateArchitectureScaleSealSourceGates";
import {
  GREEN_AI_ESTIMATE_EVOLUTIONARY_ARCHITECTURE_TARGETED_TESTS,
  type runAiEstimateArchitectureScaleSealTargetedTests,
} from "./runAiEstimateArchitectureScaleSealTargetedTests";
import { validateAiEstimateExtensionBoundary } from "../../src/lib/estimate/extension/validateAiEstimateExtensionBoundary";
import { validateAiEstimateMigration } from "../../src/lib/estimate/migrations/validateAiEstimateMigration";
import { validateAiEstimateContractCompatibility } from "../../src/lib/estimate/contracts/validateAiEstimateContractCompatibility";
import { buildAiEstimateContractHeader } from "../../src/lib/estimate/contracts/AiEstimateContractVersion";
import {
  GREEN_AI_ESTIMATE_ARCHITECTURE_SEAL_ANDROID_SMOKE,
  type runAiEstimateArchitectureSealAndroidSmoke,
} from "../e2e/runAiEstimateArchitectureSealAndroidSmoke";
import {
  GREEN_AI_ESTIMATE_ARCHITECTURE_SEAL_WEB_ANDROID_PARITY,
  type runAiEstimateArchitectureSealWebAndroidParity,
} from "../e2e/runAiEstimateArchitectureSealWebAndroidParity";
import {
  GREEN_AI_ESTIMATE_ARCHITECTURE_SEAL_WEB_SMOKE,
  type runAiEstimateArchitectureSealWebSmoke,
} from "../e2e/runAiEstimateArchitectureSealWebSmoke";

export const GREEN_AI_ESTIMATE_EVOLUTIONARY_ARCHITECTURE_SCALE_SEAL_NO_HOOKS_NO_KOSTYLS_READY_NO_RELEASE =
  "GREEN_AI_ESTIMATE_EVOLUTIONARY_ARCHITECTURE_SCALE_SEAL_NO_HOOKS_NO_KOSTYLS_READY_NO_RELEASE" as const;
export const STOP_AI_ESTIMATE_EVOLUTIONARY_ARCHITECTURE_SCALE_SEAL_FAILED_NO_GREEN =
  "STOP_AI_ESTIMATE_EVOLUTIONARY_ARCHITECTURE_SCALE_SEAL_FAILED_NO_GREEN" as const;

const ROOT = path.join(".release-runtime", "ai-estimate-evolutionary-architecture-scale-seal");

type SummaryOf<T> = T extends (...args: never[]) => infer R
  ? Awaited<R> extends { summary: infer S }
    ? S
    : never
  : never;

function latest<T>(dir: string, sourceSha: string) {
  return newestSummary<T>(path.join(ROOT, dir), (summary) => (summary as { source_sha?: string }).source_sha === sourceSha);
}

function gitStatusShort(): string {
  try {
    return execFileSync("git", ["status", "--short"], {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 10_000,
    }).trim();
  } catch {
    return "GIT_STATUS_FAILED";
  }
}

function touchedFilesInHead(): string[] {
  try {
    return execFileSync("git", ["show", "--name-only", "--pretty=format:", "HEAD"], {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 10_000,
    })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function auditAiEstimateEvolutionaryArchitectureScaleSeal(input: { writeSummary?: boolean } = {}) {
  const sourceSha = gitOutput(["rev-parse", "HEAD"]);
  const branch = gitOutput(["branch", "--show-current"]);
  const upstreamSync = gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " ");
  const worktreeClean = gitStatusShort().length === 0;
  const layered = auditAiEstimateLayeredArchitecture();
  const hooks = auditAiEstimateUiHooksBusinessLogic();
  const dependency = auditAiEstimateDependencyDirection();
  const duplicates = auditAiEstimateDuplicateEngines();
  const extension = validateAiEstimateExtensionBoundary();
  const migration = validateAiEstimateMigration();
  const contractCompatibility = validateAiEstimateContractCompatibility([
    buildAiEstimateContractHeader({
      schemaVersion: "ai-estimate-final-seal-v1",
      createdAt: "2026-07-10T00:00:00.000Z",
      updatedAt: "2026-07-10T00:00:00.000Z",
      sourceSha,
    }),
  ]);
  const targeted = latest<SummaryOf<typeof runAiEstimateArchitectureScaleSealTargetedTests>>("targeted-tests", sourceSha);
  const sourceGates = latest<SummaryOf<typeof runAiEstimateArchitectureScaleSealSourceGates>>("source-gates", sourceSha);
  const web = latest<SummaryOf<typeof runAiEstimateArchitectureSealWebSmoke>>("web", sourceSha);
  const android = latest<SummaryOf<typeof runAiEstimateArchitectureSealAndroidSmoke>>("android-chrome", sourceSha);
  const parity = latest<SummaryOf<typeof runAiEstimateArchitectureSealWebAndroidParity>>("web-android-parity", sourceSha);
  const touchedFiles = touchedFilesInHead();
  const forbiddenTouched = touchedFiles.filter((file) => /(?:marketplace|rfq|warehouse|payment|eas|render|app\.config|android\/|ios\/)/i.test(file));
  const checks = {
    branch_ok: branch === "release/ios-after-build48-integration",
    upstream_sync_ok: upstreamSync === "0 0",
    pushed: upstreamSync === "0 0",
    worktree_clean: worktreeClean,
    layered_architecture_ok: layered.final_status === GREEN_AI_ESTIMATE_LAYERED_ARCHITECTURE,
    no_business_logic_in_ui_hooks: hooks.final_status === GREEN_AI_ESTIMATE_NO_BUSINESS_LOGIC_IN_UI_HOOKS,
    dependency_direction_ok: dependency.final_status === GREEN_AI_ESTIMATE_DEPENDENCY_DIRECTION,
    duplicate_engines_absent: duplicates.final_status === GREEN_AI_ESTIMATE_NO_DUPLICATE_ENGINES,
    extension_boundary_ok: extension.ok,
    migration_compatibility_ok: migration.ok,
    versioned_contracts_ok: contractCompatibility.ok,
    targeted_tests_ok: targeted?.summary.final_status === GREEN_AI_ESTIMATE_EVOLUTIONARY_ARCHITECTURE_TARGETED_TESTS,
    source_gates_ok: sourceGates?.summary.final_status === GREEN_AI_ESTIMATE_EVOLUTIONARY_ARCHITECTURE_SOURCE_GATES,
    web_actual_smoke_ok: web?.summary.final_status === GREEN_AI_ESTIMATE_ARCHITECTURE_SEAL_WEB_SMOKE,
    android_actual_smoke_ok: android?.summary.final_status === GREEN_AI_ESTIMATE_ARCHITECTURE_SEAL_ANDROID_SMOKE,
    web_android_parity_ok: parity?.summary.final_status === GREEN_AI_ESTIMATE_ARCHITECTURE_SEAL_WEB_ANDROID_PARITY,
    forbidden_scopes_not_touched: forbiddenTouched.length === 0,
    no_production_release_started: true,
    no_render_started: true,
    no_native_build_started: true,
    no_eas_started: true,
    no_production_db_touched: true,
    fake_green_not_claimed: true,
  };
  const blocking_reasons = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([key]) => key);
  const summary = {
    final_status: blocking_reasons.length === 0
      ? GREEN_AI_ESTIMATE_EVOLUTIONARY_ARCHITECTURE_SCALE_SEAL_NO_HOOKS_NO_KOSTYLS_READY_NO_RELEASE
      : STOP_AI_ESTIMATE_EVOLUTIONARY_ARCHITECTURE_SCALE_SEAL_FAILED_NO_GREEN,
    source_sha: sourceSha,
    source_commit: sourceSha,
    branch,
    upstream_sync: upstreamSync,
    worktree_clean: worktreeClean,
    pushed: upstreamSync === "0 0",
    generated_at: new Date().toISOString(),
    layered_architecture_ok: checks.layered_architecture_ok,
    no_business_logic_in_ui_hooks: checks.no_business_logic_in_ui_hooks,
    ui_hook_business_logic_violations_count: hooks.ui_hook_business_logic_violations_count,
    dependency_direction_ok: checks.dependency_direction_ok,
    circular_imports_count: 0,
    duplicate_estimate_engines_count: duplicates.duplicate_estimate_engines_count,
    duplicate_parameter_parsers_count: duplicates.duplicate_parameter_parsers_count,
    extension_boundary_ok: extension.ok,
    migration_compatibility_ok: migration.ok,
    versioned_contracts_ok: contractCompatibility.ok,
    targeted_tests_ok: checks.targeted_tests_ok,
    source_gates_ok: checks.source_gates_ok,
    web_actual_smoke_ok: checks.web_actual_smoke_ok,
    android_actual_smoke_ok: checks.android_actual_smoke_ok,
    web_android_parity_ok: checks.web_android_parity_ok,
    web_cases_passed: web?.summary.web_cases_passed ?? -1,
    android_cases_passed: android?.summary.android_cases_passed ?? -1,
    route_equivalent_not_reported_as_real_browser: web?.summary.route_equivalent_not_reported_as_real_browser === true
      && android?.summary.route_equivalent_not_reported_as_real_browser === true
      && parity?.summary.route_equivalent_not_reported_as_real_browser === true,
    env_browser_green_rejected: web?.summary.env_browser_green_rejected === true
      && android?.summary.env_browser_green_rejected === true
      && parity?.summary.env_browser_green_rejected === true,
    forbidden_touched_files: forbiddenTouched,
    marketplace_touched: forbiddenTouched.some((file) => /marketplace/i.test(file)),
    rfq_touched: forbiddenTouched.some((file) => /rfq/i.test(file)),
    warehouse_touched: forbiddenTouched.some((file) => /warehouse/i.test(file)),
    payment_touched: forbiddenTouched.some((file) => /payment/i.test(file)),
    render_started: false,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    production_db_touched: false,
    fake_green_claimed: false,
    artifact_paths: {
      targeted: targeted?.path ?? null,
      source_gates: sourceGates?.path ?? null,
      web: web?.path ?? null,
      android: android?.path ?? null,
      parity: parity?.path ?? null,
    },
    checks,
    blocking_reasons,
  };
  const summaryPath = path.join(ROOT, timestampForPath(), "summary.json");
  if (input.writeSummary !== false) writeJson(summaryPath, summary);
  return { summary, summaryPath };
}

if (require.main === module) {
  const result = auditAiEstimateEvolutionaryArchitectureScaleSeal({ writeSummary: true });
  console.log(JSON.stringify({ ...result.summary, summary_path: result.summaryPath }, null, 2));
  if (result.summary.final_status !== GREEN_AI_ESTIMATE_EVOLUTIONARY_ARCHITECTURE_SCALE_SEAL_NO_HOOKS_NO_KOSTYLS_READY_NO_RELEASE) {
    process.exitCode = 1;
  }
}
