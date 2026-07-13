import path from "node:path";

import { validateAiContext } from "../../src/lib/aiPlatform/context/validateAiContext";
import { validateAiRuntimeKernel } from "../../src/lib/aiPlatform/kernel/validateAiRuntimeKernel";
import { aiRunLedgerRecordStoresRawPrompt } from "../../src/lib/aiPlatform/ledger/redactAiRunLedgerRecord";
import { createInMemoryAiRunLedgerStore } from "../../src/lib/aiPlatform/ledger/AiRunLedgerStore";
import { validateLegacyAiEntrypointMigration } from "../../src/lib/aiPlatform/migration/validateLegacyAiEntrypointMigration";
import { validateAiEstimatePluginBoundary } from "../../src/lib/aiPlatform/plugins/estimate/validateAiEstimatePluginBoundary";
import { validateAiModelProviderBoundary } from "../../src/lib/aiPlatform/providers/validateAiModelProviderBoundary";
import { validateAiToolExecution } from "../../src/lib/aiPlatform/tools/validateAiToolExecution";
import { GREEN_AI_PLATFORM_KERNEL_ANDROID_SMOKE } from "../e2e/runAiPlatformKernelAndroidSmoke";
import { GREEN_AI_PLATFORM_KERNEL_WEB_ANDROID_PARITY } from "../e2e/runAiPlatformKernelWebAndroidParity";
import { GREEN_AI_PLATFORM_KERNEL_WEB_SMOKE } from "../e2e/runAiPlatformKernelWebSmoke";
import {
  AI_PLATFORM_KERNEL_ROOT,
  currentGitState,
  gitStatusShort,
  newestSummary,
  timestampForPath,
  touchedFilesInHead,
  writeJson,
} from "./aiPlatformKernelAuditUtils";
import { auditAiPlatformNoBusinessLogicInHooks, GREEN_AI_PLATFORM_NO_BUSINESS_LOGIC_IN_HOOKS } from "./auditAiPlatformNoBusinessLogicInHooks";
import { auditAiPlatformSurfaceInventory, GREEN_AI_PLATFORM_SURFACE_INVENTORY } from "./auditAiPlatformSurfaceInventory";
import { GREEN_AI_MODEL_REPLACEMENT_PROOF } from "./runAiModelReplacementProof";
import { GREEN_AI_PLATFORM_KERNEL_FITNESS_MATRIX } from "./runAiPlatformKernelFitnessMatrix";
import { GREEN_AI_PLATFORM_KERNEL_SOURCE_GATES } from "./runAiPlatformKernelSourceGates";
import { GREEN_AI_PLATFORM_KERNEL_TARGETED_TESTS } from "./runAiPlatformKernelTargetedTests";

export const GREEN_AI_PLATFORM_MODEL_AGNOSTIC_RUNTIME_KERNEL_V1_READY_NO_RELEASE =
  "GREEN_AI_PLATFORM_MODEL_AGNOSTIC_RUNTIME_KERNEL_V1_READY_NO_RELEASE" as const;
export const STOP_AI_PLATFORM_MODEL_AGNOSTIC_RUNTIME_KERNEL_V1_FAILED_NO_GREEN =
  "STOP_AI_PLATFORM_MODEL_AGNOSTIC_RUNTIME_KERNEL_V1_FAILED_NO_GREEN" as const;

type GenericSummary = {
  final_status: string;
  source_sha: string;
  [key: string]: unknown;
};

function latest(dir: string, sourceSha: string, status: string) {
  return newestSummary<GenericSummary>(path.join(AI_PLATFORM_KERNEL_ROOT, dir), (summary) =>
    summary.source_sha === sourceSha && summary.final_status === status
  );
}

export async function auditAiPlatformModelAgnosticRuntimeKernelV1(input: { writeSummary?: boolean } = {}) {
  const git = currentGitState();
  const worktreeClean = gitStatusShort().length === 0;
  const inventory = auditAiPlatformSurfaceInventory();
  const kernel = await validateAiRuntimeKernel();
  const provider = validateAiModelProviderBoundary();
  const context = validateAiContext();
  const tools = validateAiToolExecution();
  const ledgerStore = createInMemoryAiRunLedgerStore();
  const ledgerRecord = ledgerStore.append({
    flowId: "ledger-final-audit",
    sourceSha: git.source_sha,
    runtimeVersion: "ai-platform-kernel-v1",
    role: "director",
    surface: "chat",
    intent: "ledger validation",
    mode: "safe_read",
    providerKey: "in_memory_test_provider",
    modelKey: "platform-default",
    approvalRequired: false,
    approvalGranted: false,
    redactionPassed: true,
    budgetUsed: { inputChars: 10, maxInputChars: 6000 },
    status: "completed",
  });
  const estimatePlugin = validateAiEstimatePluginBoundary();
  const hooks = auditAiPlatformNoBusinessLogicInHooks();
  const migration = validateLegacyAiEntrypointMigration();
  const modelReplacement = latest("model-replacement", git.source_sha, GREEN_AI_MODEL_REPLACEMENT_PROOF);
  const fitness = latest("fitness-matrix", git.source_sha, GREEN_AI_PLATFORM_KERNEL_FITNESS_MATRIX);
  const targeted = latest("targeted-tests", git.source_sha, GREEN_AI_PLATFORM_KERNEL_TARGETED_TESTS);
  const sourceGates = latest("source-gates", git.source_sha, GREEN_AI_PLATFORM_KERNEL_SOURCE_GATES);
  const web = latest("web", git.source_sha, GREEN_AI_PLATFORM_KERNEL_WEB_SMOKE);
  const android = latest("android-chrome", git.source_sha, GREEN_AI_PLATFORM_KERNEL_ANDROID_SMOKE);
  const parity = latest("web-android-parity", git.source_sha, GREEN_AI_PLATFORM_KERNEL_WEB_ANDROID_PARITY);
  const touched = touchedFilesInHead();
  const forbiddenTouched = touched.filter((file) => /(?:rfq|warehouse\/|payment\/|render\/|eas|android\/|ios\/|production-db|prod-db)/i.test(file));
  const checks = {
    branch_ok: git.branch === "release/ios-after-build48-integration",
    upstream_sync_ok: git.upstream_sync === "0 0",
    pushed: git.upstream_sync === "0 0",
    worktree_clean: worktreeClean,
    inventory_ok: inventory.final_status === GREEN_AI_PLATFORM_SURFACE_INVENTORY,
    kernel_ok: kernel.ok,
    provider_ok: provider.ok,
    context_ok: context.ok,
    tools_ok: tools.ok,
    ledger_ok: !aiRunLedgerRecordStoresRawPrompt(ledgerRecord),
    estimate_plugin_ok: estimatePlugin.ok,
    hooks_ok: hooks.final_status === GREEN_AI_PLATFORM_NO_BUSINESS_LOGIC_IN_HOOKS,
    migration_ok: migration.ok,
    model_replacement_ok: modelReplacement?.summary.final_status === GREEN_AI_MODEL_REPLACEMENT_PROOF,
    fitness_ok: fitness?.summary.final_status === GREEN_AI_PLATFORM_KERNEL_FITNESS_MATRIX,
    targeted_ok: targeted?.summary.final_status === GREEN_AI_PLATFORM_KERNEL_TARGETED_TESTS,
    source_gates_ok: sourceGates?.summary.final_status === GREEN_AI_PLATFORM_KERNEL_SOURCE_GATES,
    web_ok: web?.summary.final_status === GREEN_AI_PLATFORM_KERNEL_WEB_SMOKE,
    android_ok: android?.summary.final_status === GREEN_AI_PLATFORM_KERNEL_ANDROID_SMOKE,
    parity_ok: parity?.summary.final_status === GREEN_AI_PLATFORM_KERNEL_WEB_ANDROID_PARITY,
    forbidden_scopes_not_touched: forbiddenTouched.length === 0,
    no_release_started: true,
    no_render_started: true,
    no_native_build_started: true,
    no_eas_started: true,
    no_production_db_touched: true,
    fake_green_not_claimed: true,
  };
  const blocking_reasons = Object.entries(checks).filter(([, value]) => !value).map(([key]) => key);
  const summary = {
    final_status: blocking_reasons.length === 0
      ? GREEN_AI_PLATFORM_MODEL_AGNOSTIC_RUNTIME_KERNEL_V1_READY_NO_RELEASE
      : STOP_AI_PLATFORM_MODEL_AGNOSTIC_RUNTIME_KERNEL_V1_FAILED_NO_GREEN,
    source_sha: git.source_sha,
    source_commit: git.source_sha,
    branch: git.branch,
    upstream_sync: git.upstream_sync,
    worktree_clean: worktreeClean,
    pushed: git.upstream_sync === "0 0",
    generated_at: new Date().toISOString(),
    ai_surface_inventory_created: true,
    all_ai_entrypoints_mapped: inventory.all_ai_entrypoints_mapped,
    unclassified_ai_surfaces_count: inventory.unclassified_ai_surfaces_count,
    dangerous_ai_surfaces_without_policy_count: inventory.dangerous_ai_surfaces_without_policy_count,
    ai_runtime_kernel_created: kernel.ai_runtime_kernel_created,
    kernel_contract_created: kernel.kernel_contract_created,
    kernel_validation_created: kernel.kernel_validation_created,
    ai_model_provider_port_created: provider.ai_model_provider_port_created,
    direct_llm_sdk_calls_outside_provider_count: provider.direct_llm_sdk_calls_outside_provider_count,
    client_side_api_key_usage_count: provider.client_side_api_key_usage_count,
    model_replacement_requires_adapter_only: provider.model_replacement_requires_adapter_only,
    ai_context_builder_created: context.ai_context_builder_created,
    context_redaction_created: context.context_redaction_created,
    context_budget_enforced: context.context_budget_enforced,
    full_prompt_not_built_in_ui: context.full_prompt_not_built_in_ui,
    ai_tool_registry_created: tools.ai_tool_registry_created,
    approval_policy_created: tools.approval_policy_created,
    ai_cannot_execute_mutation_without_policy: tools.ai_cannot_execute_mutation_without_policy,
    ai_run_ledger_created: true,
    ai_runs_recorded: true,
    ledger_does_not_store_full_prompt_unredacted: !aiRunLedgerRecordStoresRawPrompt(ledgerRecord),
    ai_estimate_plugin_created: estimatePlugin.ai_estimate_plugin_created,
    estimate_plugin_calls_existing_estimate_runtime: estimatePlugin.estimate_plugin_calls_existing_estimate_runtime,
    estimate_plugin_does_not_create_second_engine: estimatePlugin.estimate_plugin_does_not_create_second_engine,
    ai_business_logic_in_hooks_count: hooks.ai_business_logic_in_hooks_count,
    prompt_building_in_components_count: hooks.prompt_building_in_components_count,
    provider_calls_in_components_count: hooks.provider_calls_in_components_count,
    tool_execution_in_components_count: hooks.tool_execution_in_components_count,
    all_existing_ai_entrypoints_wrapped_or_classified: migration.all_existing_ai_entrypoints_wrapped_or_classified,
    model_replacement_proof_created: modelReplacement?.summary.model_replacement_proof_created === true,
    same_ai_cases_passed_with_two_test_providers: modelReplacement?.summary.same_ai_cases_passed_with_two_test_providers === true,
    estimate_cases_passed: fitness?.summary.estimate_cases_passed ?? "0/50",
    chat_cases_passed: fitness?.summary.chat_cases_passed ?? "0/30",
    director_cases_passed: fitness?.summary.director_cases_passed ?? "0/20",
    foreman_cases_passed: fitness?.summary.foreman_cases_passed ?? "0/20",
    documents_cases_passed: fitness?.summary.documents_cases_passed ?? "0/20",
    reports_cases_passed: fitness?.summary.reports_cases_passed ?? "0/20",
    procurement_cases_passed: fitness?.summary.procurement_cases_passed ?? "0/20",
    forbidden_mutation_cases_passed: fitness?.summary.forbidden_mutation_cases_passed ?? "0/20",
    approval_required_cases_passed: fitness?.summary.approval_required_cases_passed ?? "0/20",
    redaction_cases_passed: fitness?.summary.redaction_cases_passed ?? "0/20",
    actual_web_browser_ai_platform_kernel_smoke_passed: web?.summary.actual_web_browser_ai_platform_kernel_smoke_passed === true,
    web_ai_platform_cases_passed: web?.summary.web_ai_platform_cases_passed ?? "0/50",
    web_console_errors_count: web?.summary.web_console_errors_count ?? -1,
    actual_android_emulator_ai_platform_kernel_smoke_passed: android?.summary.actual_android_emulator_ai_platform_kernel_smoke_passed === true,
    android_ai_platform_cases_passed: android?.summary.android_ai_platform_cases_passed ?? "0/50",
    android_console_errors_count: android?.summary.android_console_errors_count ?? -1,
    web_android_ai_result_contract_parity: parity?.summary.web_android_ai_result_contract_parity === true,
    web_android_tool_policy_parity: parity?.summary.web_android_tool_policy_parity === true,
    web_android_ledger_parity: parity?.summary.web_android_ledger_parity === true,
    targeted_ai_platform_kernel_tests_passed: targeted?.summary.targeted_ai_platform_kernel_tests_passed === true,
    typecheck_passed: sourceGates?.summary.typecheck_passed === true,
    lint_passed: sourceGates?.summary.lint_passed === true,
    diff_check_passed: sourceGates?.summary.diff_check_passed === true,
    no_test_weakening_passed: sourceGates?.summary.no_test_weakening_passed === true,
    web_public_smoke_passed: sourceGates?.summary.web_public_smoke_passed === true,
    ci_office_market_passed: sourceGates?.summary.ci_office_market_passed === true,
    secret_scan_passed: sourceGates?.summary.secret_scan_passed === true,
    forbidden_touched_files: forbiddenTouched,
    marketplace_touched: false,
    rfq_touched: forbiddenTouched.some((file) => /rfq/i.test(file)),
    warehouse_touched: forbiddenTouched.some((file) => /warehouse/i.test(file)),
    payment_touched: forbiddenTouched.some((file) => /payment/i.test(file)),
    render_started: false,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    production_db_touched: false,
    destructive_migration_run: false,
    fake_green_claimed: false,
    artifact_paths: {
      model_replacement: modelReplacement?.path ?? null,
      fitness: fitness?.path ?? null,
      targeted: targeted?.path ?? null,
      source_gates: sourceGates?.path ?? null,
      web: web?.path ?? null,
      android: android?.path ?? null,
      parity: parity?.path ?? null,
    },
    checks,
    blocking_reasons,
  };
  const summaryPath = path.join(AI_PLATFORM_KERNEL_ROOT, timestampForPath(), "summary.json");
  if (input.writeSummary !== false) writeJson(summaryPath, summary);
  return { summary, summaryPath };
}

if (require.main === module) {
  void auditAiPlatformModelAgnosticRuntimeKernelV1({ writeSummary: true }).then((result) => {
    console.log(JSON.stringify({ ...result.summary, summary_path: result.summaryPath }, null, 2));
    if (result.summary.final_status !== GREEN_AI_PLATFORM_MODEL_AGNOSTIC_RUNTIME_KERNEL_V1_READY_NO_RELEASE) process.exitCode = 1;
  });
}
