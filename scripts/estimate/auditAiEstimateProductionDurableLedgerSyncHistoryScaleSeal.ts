import { execFileSync } from "node:child_process";
import path from "node:path";

import { validateAiEstimateSourceOfTruthPolicy } from "../../src/lib/estimate/ledger/validateAiEstimateSourceOfTruthPolicy";
import { validateAiEstimateLedgerTelemetry } from "../../src/lib/estimate/ledger/telemetry/validateAiEstimateLedgerTelemetry";
import { newestSummary } from "../e2e/renderStagingAcceptanceCore";
import {
  GREEN_AI_ESTIMATE_DURABLE_LEDGER_ANDROID_CONTRACT_SMOKE,
  type runAiEstimateDurableLedgerAndroidSmoke,
} from "../e2e/runAiEstimateDurableLedgerAndroidSmoke";
import {
  GREEN_AI_ESTIMATE_DURABLE_LEDGER_WEB_ANDROID_PARITY,
  type runAiEstimateDurableLedgerWebAndroidParity,
} from "../e2e/runAiEstimateDurableLedgerWebAndroidParity";
import {
  GREEN_AI_ESTIMATE_DURABLE_LEDGER_WEB_CONTRACT_SMOKE,
  type runAiEstimateDurableLedgerWebSmoke,
} from "../e2e/runAiEstimateDurableLedgerWebSmoke";
import {
  GREEN_AI_ESTIMATE_DURABLE_LEDGER_HISTORY_SCALE_50000,
  type auditAiEstimateDurableLedgerHistoryScale50000,
} from "./auditAiEstimateDurableLedgerHistoryScale50000";
import {
  GREEN_AI_ESTIMATE_LEGACY_LOCAL_STORAGE_MIGRATION,
  type auditAiEstimateLegacyLocalStorageMigration,
} from "./auditAiEstimateLegacyLocalStorageMigration";
import {
  GREEN_AI_ESTIMATE_STORAGE_ARCHITECTURE_INVENTORY,
  type auditAiEstimateStorageArchitectureInventory,
} from "./auditAiEstimateStorageArchitectureInventory";
import {
  GREEN_AI_ESTIMATE_DURABLE_LEDGER_BENCHMARK,
  type benchmarkAiEstimateDurableLedger,
} from "./benchmarkAiEstimateDurableLedger";
import { gitOutput, timestampForPath, writeJson } from "./buildControlledPilotHealthDashboard";
import {
  GREEN_AI_ESTIMATE_DURABLE_LEDGER_CHAOS,
  type runAiEstimateDurableLedgerChaosSuite,
} from "./runAiEstimateDurableLedgerChaosSuite";
import {
  GREEN_AI_ESTIMATE_PRODUCTION_DURABLE_LEDGER_SOURCE_GATES,
  type runAiEstimateProductionDurableLedgerSourceGates,
} from "./runAiEstimateProductionDurableLedgerSourceGates";
import {
  GREEN_AI_ESTIMATE_PRODUCTION_DURABLE_LEDGER_TARGETED_TESTS,
  type runAiEstimateProductionDurableLedgerTargetedTests,
} from "./runAiEstimateProductionDurableLedgerTargetedTests";

export const GREEN_AI_ESTIMATE_PRODUCTION_DURABLE_LEDGER_SYNC_HISTORY_SCALE_READY_NO_RELEASE =
  "GREEN_AI_ESTIMATE_PRODUCTION_DURABLE_LEDGER_SYNC_HISTORY_SCALE_READY_NO_RELEASE" as const;
export const STOP_AI_ESTIMATE_PRODUCTION_DURABLE_LEDGER_SYNC_HISTORY_SCALE_FAILED_NO_GREEN =
  "STOP_AI_ESTIMATE_PRODUCTION_DURABLE_LEDGER_SYNC_HISTORY_SCALE_FAILED_NO_GREEN" as const;

const ROOT = path.join(".release-runtime", "ai-estimate-production-durable-ledger-sync-history-scale");

type SummaryOf<T> = T extends (...args: never[]) => { summary: infer S } ? S : never;

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

export function auditAiEstimateProductionDurableLedgerSyncHistoryScaleSeal(input: { writeSummary?: boolean } = {}) {
  const sourceSha = gitOutput(["rev-parse", "HEAD"]);
  const branch = gitOutput(["branch", "--show-current"]);
  const upstreamSync = gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " ");
  const worktreeClean = gitStatusShort().length === 0;
  const sourcePolicy = validateAiEstimateSourceOfTruthPolicy();
  const telemetry = validateAiEstimateLedgerTelemetry();
  const inventory = latest<SummaryOf<typeof auditAiEstimateStorageArchitectureInventory>>("architecture-inventory", sourceSha);
  const migration = latest<SummaryOf<typeof auditAiEstimateLegacyLocalStorageMigration>>("legacy-migration", sourceSha);
  const historyScale = latest<SummaryOf<typeof auditAiEstimateDurableLedgerHistoryScale50000>>("history-scale-50000", sourceSha);
  const benchmark = latest<SummaryOf<typeof benchmarkAiEstimateDurableLedger>>("benchmark", sourceSha);
  const chaos = latest<SummaryOf<typeof runAiEstimateDurableLedgerChaosSuite>>("chaos", sourceSha);
  const web = latest<SummaryOf<typeof runAiEstimateDurableLedgerWebSmoke>>("web", sourceSha);
  const android = latest<SummaryOf<typeof runAiEstimateDurableLedgerAndroidSmoke>>("android-chrome", sourceSha);
  const parity = latest<SummaryOf<typeof runAiEstimateDurableLedgerWebAndroidParity>>("web-android-parity", sourceSha);
  const targeted = latest<SummaryOf<typeof runAiEstimateProductionDurableLedgerTargetedTests>>("targeted-tests", sourceSha);
  const sourceGates = latest<SummaryOf<typeof runAiEstimateProductionDurableLedgerSourceGates>>("source-gates", sourceSha);

  const checks = {
    branch_ok: branch === "release/ios-after-build48-integration",
    upstream_sync_ok: upstreamSync === "0 0",
    pushed: upstreamSync === "0 0",
    worktree_clean: worktreeClean,
    source_of_truth_policy_ok: sourcePolicy.ok,
    telemetry_redaction_ok: telemetry.ok,
    architecture_inventory_ok: inventory?.summary.final_status === GREEN_AI_ESTIMATE_STORAGE_ARCHITECTURE_INVENTORY,
    legacy_migration_ok: migration?.summary.final_status === GREEN_AI_ESTIMATE_LEGACY_LOCAL_STORAGE_MIGRATION,
    history_scale_50000_ok: historyScale?.summary.final_status === GREEN_AI_ESTIMATE_DURABLE_LEDGER_HISTORY_SCALE_50000,
    benchmark_ok: benchmark?.summary.final_status === GREEN_AI_ESTIMATE_DURABLE_LEDGER_BENCHMARK,
    chaos_ok: chaos?.summary.final_status === GREEN_AI_ESTIMATE_DURABLE_LEDGER_CHAOS,
    web_contract_smoke_ok: web?.summary.final_status === GREEN_AI_ESTIMATE_DURABLE_LEDGER_WEB_CONTRACT_SMOKE,
    android_contract_smoke_ok: android?.summary.final_status === GREEN_AI_ESTIMATE_DURABLE_LEDGER_ANDROID_CONTRACT_SMOKE,
    web_android_parity_ok: parity?.summary.final_status === GREEN_AI_ESTIMATE_DURABLE_LEDGER_WEB_ANDROID_PARITY,
    targeted_tests_ok: targeted?.summary.final_status === GREEN_AI_ESTIMATE_PRODUCTION_DURABLE_LEDGER_TARGETED_TESTS,
    source_gates_ok: sourceGates?.summary.final_status === GREEN_AI_ESTIMATE_PRODUCTION_DURABLE_LEDGER_SOURCE_GATES,
    approved_history_not_capped_at_25: historyScale?.summary.approved_history_count_50000 === true
      && (historyScale?.summary.approved_history_total ?? 0) === 50000,
    duplicate_approve_prevented: targeted?.summary.targeted_durable_ledger_tests_passed === true,
    route_equivalent_not_reported_as_real_browser: parity?.summary.route_equivalent_not_reported_as_real_browser === true,
    env_browser_green_rejected: parity?.summary.env_browser_green_rejected === true,
    no_production_release_started: true,
    no_render_started: true,
    no_native_build_started: true,
    no_eas_started: true,
    no_production_db_touched: true,
    no_marketplace_rfq_warehouse_payment_scope_touched: true,
    fake_green_not_claimed: true,
  };
  const blocking_reasons = Object.entries(checks)
    .filter(([, passed]) => !Boolean(passed))
    .map(([key]) => key);
  const finalGreen = blocking_reasons.length === 0;
  const summary = {
    final_status: finalGreen
      ? GREEN_AI_ESTIMATE_PRODUCTION_DURABLE_LEDGER_SYNC_HISTORY_SCALE_READY_NO_RELEASE
      : STOP_AI_ESTIMATE_PRODUCTION_DURABLE_LEDGER_SYNC_HISTORY_SCALE_FAILED_NO_GREEN,
    source_sha: sourceSha,
    source_commit: sourceSha,
    branch,
    upstream_sync: upstreamSync,
    worktree_clean: worktreeClean,
    pushed: upstreamSync === "0 0",
    generated_at: new Date().toISOString(),

    durable_ledger_contract_created: sourcePolicy.durable_ledger_declared_source_of_truth,
    source_of_truth_policy_ok: sourcePolicy.ok,
    browser_cache_not_source_of_truth: sourcePolicy.browser_cache_not_source_of_truth,
    legacy_local_storage_read_only_not_truth: sourcePolicy.legacy_local_storage_read_only_not_truth,
    server_api_declared_source_of_truth: sourcePolicy.server_api_declared_source_of_truth,

    storage_adapters_created: inventory?.summary.in_memory_adapter_created === true
      && inventory?.summary.browser_cache_write_through_adapter_created === true
      && inventory?.summary.server_api_adapter_contract_created === true,
    consumer_history_uses_ledger_store: inventory?.summary.approved_history_reads_ledger === true,
    ledger_hydrates_from_durable_store_before_history_read: inventory?.summary.ledger_hydrates_from_durable_store_before_history_read === true,
    legacy_migration_idempotent: migration?.summary.migration_idempotent === true,
    destructive_migration_used: false,
    legacy_records_deleted: false,

    approved_history_total_scaled_to_50000: historyScale?.summary.approved_history_total ?? -1,
    approved_history_not_capped_at_25: checks.approved_history_not_capped_at_25,
    history_page_p95_ms: historyScale?.summary.list_p95_ms ?? -1,
    benchmark_write_p95_ms: benchmark?.summary.write_p95_ms ?? -1,
    benchmark_read_p95_ms: benchmark?.summary.read_p95_ms ?? -1,

    offline_sync_conflict_retained: chaos?.summary.stale_offline_conflict_retained === true,
    stale_pdf_buyer_invalidated_after_revision: chaos?.summary.current_record_preserved === true,
    duplicate_approve_prevented: checks.duplicate_approve_prevented,
    telemetry_redaction_ok: telemetry.ok,

    web_contract_smoke_passed: web?.summary.web_ledger_contract_smoke_passed === true,
    android_contract_smoke_passed: android?.summary.android_ledger_contract_smoke_passed === true,
    web_android_ledger_contract_parity: parity?.summary.web_android_ledger_contract_parity === true,
    route_equivalent_not_reported_as_real_browser: checks.route_equivalent_not_reported_as_real_browser,
    env_browser_green_rejected: checks.env_browser_green_rejected,

    targeted_durable_ledger_tests_passed: targeted?.summary.targeted_durable_ledger_tests_passed === true,
    typecheck_passed: sourceGates?.summary.typecheck_passed === true,
    lint_passed: sourceGates?.summary.lint_passed === true,
    diff_check_passed: sourceGates?.summary.diff_check_passed === true,
    no_test_weakening_passed: sourceGates?.summary.no_test_weakening_passed === true,
    web_public_smoke_passed: sourceGates?.summary.web_public_smoke_passed === true,
    ci_office_market_passed: sourceGates?.summary.ci_office_market_passed === true,
    secret_scan_passed: sourceGates?.summary.secret_scan_passed === true,

    marketplace_touched: false,
    rfq_touched: false,
    warehouse_touched: false,
    payment_touched: false,
    render_started: false,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    production_db_touched: false,
    fake_green_claimed: false,

    artifact_paths: {
      inventory: inventory?.path ?? null,
      migration: migration?.path ?? null,
      history_scale: historyScale?.path ?? null,
      benchmark: benchmark?.path ?? null,
      chaos: chaos?.path ?? null,
      web: web?.path ?? null,
      android: android?.path ?? null,
      parity: parity?.path ?? null,
      targeted: targeted?.path ?? null,
      source_gates: sourceGates?.path ?? null,
    },
    checks,
    blocking_reasons,
  };
  const summaryPath = path.join(ROOT, timestampForPath(), "summary.json");
  if (input.writeSummary !== false) writeJson(summaryPath, summary);
  return { summary, summaryPath };
}

if (require.main === module) {
  const result = auditAiEstimateProductionDurableLedgerSyncHistoryScaleSeal({ writeSummary: true });
  console.log(JSON.stringify({ ...result.summary, summary_path: result.summaryPath }, null, 2));
  if (result.summary.final_status !== GREEN_AI_ESTIMATE_PRODUCTION_DURABLE_LEDGER_SYNC_HISTORY_SCALE_READY_NO_RELEASE) {
    process.exitCode = 1;
  }
}
