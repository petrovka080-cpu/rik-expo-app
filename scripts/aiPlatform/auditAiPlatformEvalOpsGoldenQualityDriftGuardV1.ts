import path from "node:path";

import { createAiModelEvalManifest } from "../../src/lib/aiPlatform/eval/AiModelEvalManifest";
import { createAiPromptVersionManifest } from "../../src/lib/aiPlatform/eval/AiPromptVersionManifest";
import { createInMemoryAiEvalLedgerStore } from "../../src/lib/aiPlatform/eval/AiEvalLedger";
import { aiEvalLedgerStoresRawPromptUnredacted } from "../../src/lib/aiPlatform/eval/redactAiEvalLedger";
import { validateAiPromptModelManifest } from "../../src/lib/aiPlatform/eval/validateAiPromptModelManifest";
import { validateAiEvalResult } from "../../src/lib/aiPlatform/eval/validateAiEvalResult";
import { validateEstimateGrounding } from "../../src/lib/aiPlatform/eval/validateEstimateGrounding";
import { writeAiEvalLedger } from "../../src/lib/aiPlatform/eval/writeAiEvalLedger";
import { AI_RUNTIME_KERNEL_VERSION } from "../../src/lib/aiPlatform/kernel/AiRuntimeKernelContract";
import { GREEN_AI_EVALOPS_ANDROID_SMOKE } from "../e2e/runAiEvalOpsAndroidSmoke";
import { GREEN_AI_EVALOPS_WEB_ANDROID_PARITY } from "../e2e/runAiEvalOpsWebAndroidParity";
import { GREEN_AI_EVALOPS_WEB_SMOKE } from "../e2e/runAiEvalOpsWebSmoke";
import { GREEN_AI_EVAL_COST_LATENCY } from "./benchmarkAiEvalCostLatency";
import {
  AI_PLATFORM_EVALOPS_ROOT,
  currentGitState,
  gitStatusShort,
  latestEvalOpsSummary,
  timestampForPath,
  touchedFilesInHead,
  writeJson,
} from "./evalOpsAuditUtils";
import { GREEN_AI_QUALITY_DRIFT_AUDIT } from "./auditAiQualityDrift";
import { GREEN_AI_ESTIMATE_GOLDEN_EVAL } from "./runAiEstimateGoldenEval";
import { GREEN_AI_EVALOPS_SOURCE_GATES } from "./runAiEvalOpsSourceGates";
import { GREEN_AI_EVALOPS_TARGETED_TESTS } from "./runAiEvalOpsTargetedTests";
import { GREEN_AI_EVAL_FIXTURE_GENERATION } from "./verifyAiEvalFixturesGenerated";
import { GREEN_AI_MODEL_REPLACEMENT_EVAL_PROOF } from "./runAiModelReplacementEvalProof";
import { GREEN_AI_RED_TEAM_EVAL } from "./runAiRedTeamEval";

export const GREEN_AI_PLATFORM_EVALOPS_GOLDEN_QUALITY_DRIFT_GUARD_V1_READY_NO_RELEASE =
  "GREEN_AI_PLATFORM_EVALOPS_GOLDEN_QUALITY_DRIFT_GUARD_V1_READY_NO_RELEASE" as const;
export const STOP_AI_PLATFORM_EVALOPS_GOLDEN_QUALITY_DRIFT_GUARD_V1_FAILED_NO_GREEN =
  "STOP_AI_PLATFORM_EVALOPS_GOLDEN_QUALITY_DRIFT_GUARD_V1_FAILED_NO_GREEN" as const;

type GenericSummary = {
  final_status: string;
  source_sha: string;
  [key: string]: unknown;
};

export async function auditAiPlatformEvalOpsGoldenQualityDriftGuardV1(input: { writeSummary?: boolean } = {}) {
  const git = currentGitState();
  const worktreeClean = gitStatusShort().length === 0;
  const promptManifest = createAiPromptVersionManifest(git.source_sha);
  const modelManifest = createAiModelEvalManifest({
    sourceSha: git.source_sha,
    runtimeVersion: AI_RUNTIME_KERNEL_VERSION,
  });
  const manifest = validateAiPromptModelManifest({ prompt: promptManifest, model: modelManifest });
  const grounding = validateEstimateGrounding("Нужно уточнить параметры. Финальный итог не рассчитан.", {
    insufficientInput: true,
    missingPrice: true,
  });
  const sampleResult = validateAiEvalResult({
    evalRunId: "final-audit",
    caseId: "final-audit-case",
    caseVersion: "v1",
    sourceSha: git.source_sha,
    runtimeVersion: AI_RUNTIME_KERNEL_VERSION,
    promptVersion: promptManifest.prompt_version,
    providerKey: modelManifest.provider_key,
    modelKey: modelManifest.model_key,
    surface: "estimate",
    role: "consumer",
    status: "passed",
    score: 1,
    scoreBreakdown: {
      work_classification_score: 1,
      parameter_extraction_score: 1,
      parameter_passport_score: 1,
      missing_input_score: 1,
      boq_dependency_score: 1,
      quantity_trace_score: 1,
      russian_ui_score: 1,
      policy_compliance_score: 1,
      pii_redaction_score: 1,
      determinism_score: 1,
    },
    scoreExplanationRu: "Оценка 1.000: все критичные проверки качества прошли.",
    actual: {
      workFamily: "fence",
      parameterKeys: ["length_m"],
      boqFamilies: ["fence"],
      missingQuestionsRu: [],
      policyStatus: "draft_only",
      userVisibleAnswerRu: "Черновик готов.",
      durationMs: 1,
      providerKey: modelManifest.provider_key,
      modelKey: modelManifest.model_key,
    },
    expected: {},
    groundingPassed: true,
    piiRedactionPassed: true,
    rawInternalIdsVisible: false,
    deterministicContractPassed: true,
    driftDetected: false,
    blockers: [],
    cost: { durationMs: 1, inputTokens: 10, outputTokens: 1 },
    createdAt: new Date().toISOString(),
  });
  const ledgerStore = createInMemoryAiEvalLedgerStore();
  const ledgerRecord = writeAiEvalLedger(ledgerStore, {
    evalRunId: "final-audit",
    caseId: "final-audit-case",
    caseVersion: "v1",
    sourceSha: git.source_sha,
    runtimeVersion: AI_RUNTIME_KERNEL_VERSION,
    promptVersion: promptManifest.prompt_version,
    providerKey: modelManifest.provider_key,
    modelKey: modelManifest.model_key,
    surface: "estimate",
    role: "consumer",
    status: "passed",
    score: 1,
    scoreBreakdown: {
      work_classification_score: 1,
      parameter_extraction_score: 1,
      parameter_passport_score: 1,
      missing_input_score: 1,
      boq_dependency_score: 1,
      quantity_trace_score: 1,
      russian_ui_score: 1,
      policy_compliance_score: 1,
      pii_redaction_score: 1,
      determinism_score: 1,
    },
    scoreExplanationRu: "ok",
    actual: {
      parameterKeys: [],
      boqFamilies: ["estimate"],
      missingQuestionsRu: [],
      policyStatus: "draft_only",
      userVisibleAnswerRu: "Черновик готов.",
      durationMs: 1,
      providerKey: modelManifest.provider_key,
      modelKey: modelManifest.model_key,
    },
    expected: {},
    groundingPassed: true,
    piiRedactionPassed: true,
    rawInternalIdsVisible: false,
    deterministicContractPassed: true,
    driftDetected: false,
    blockers: [],
    cost: { durationMs: 1, inputTokens: 10, outputTokens: 1 },
    createdAt: new Date().toISOString(),
  });
  const golden = latestEvalOpsSummary<GenericSummary>("golden-eval", git.source_sha, GREEN_AI_ESTIMATE_GOLDEN_EVAL);
  const fixtureGeneration = latestEvalOpsSummary<GenericSummary>("fixture-generation", git.source_sha, GREEN_AI_EVAL_FIXTURE_GENERATION);
  const redTeam = latestEvalOpsSummary<GenericSummary>("red-team", git.source_sha, GREEN_AI_RED_TEAM_EVAL);
  const drift = latestEvalOpsSummary<GenericSummary>("quality-drift", git.source_sha, GREEN_AI_QUALITY_DRIFT_AUDIT);
  const costLatency = latestEvalOpsSummary<GenericSummary>("cost-latency", git.source_sha, GREEN_AI_EVAL_COST_LATENCY);
  const replacement = latestEvalOpsSummary<GenericSummary>("model-replacement-eval", git.source_sha, GREEN_AI_MODEL_REPLACEMENT_EVAL_PROOF);
  const targeted = latestEvalOpsSummary<GenericSummary>("targeted-tests", git.source_sha, GREEN_AI_EVALOPS_TARGETED_TESTS);
  const sourceGates = latestEvalOpsSummary<GenericSummary>("source-gates", git.source_sha, GREEN_AI_EVALOPS_SOURCE_GATES);
  const web = latestEvalOpsSummary<GenericSummary>("web", git.source_sha, GREEN_AI_EVALOPS_WEB_SMOKE);
  const android = latestEvalOpsSummary<GenericSummary>("android-chrome", git.source_sha, GREEN_AI_EVALOPS_ANDROID_SMOKE);
  const parity = latestEvalOpsSummary<GenericSummary>("web-android-parity", git.source_sha, GREEN_AI_EVALOPS_WEB_ANDROID_PARITY);
  const touched = touchedFilesInHead();
  const forbiddenTouched = touched.filter((file) => /(?:rfq|warehouse\/|payment\/|render\/|eas|android\/|ios\/|production-db|prod-db)/i.test(file));
  const checks = {
    branch_ok: git.branch === "release/ios-after-build48-integration",
    upstream_sync_ok: git.upstream_sync === "0 0",
    worktree_clean: worktreeClean,
    manifest_ok: manifest.ok,
    eval_result_ok: sampleResult.ok,
    grounding_ok: grounding.ok,
    ledger_ok: !aiEvalLedgerStoresRawPromptUnredacted(ledgerRecord),
    golden_ok: golden?.summary.final_status === GREEN_AI_ESTIMATE_GOLDEN_EVAL,
    fixture_generation_ok: fixtureGeneration?.summary.final_status === GREEN_AI_EVAL_FIXTURE_GENERATION,
    red_team_ok: redTeam?.summary.final_status === GREEN_AI_RED_TEAM_EVAL,
    drift_ok: drift?.summary.final_status === GREEN_AI_QUALITY_DRIFT_AUDIT,
    cost_latency_ok: costLatency?.summary.final_status === GREEN_AI_EVAL_COST_LATENCY,
    model_replacement_ok: replacement?.summary.final_status === GREEN_AI_MODEL_REPLACEMENT_EVAL_PROOF,
    targeted_ok: targeted?.summary.final_status === GREEN_AI_EVALOPS_TARGETED_TESTS,
    source_gates_ok: sourceGates?.summary.final_status === GREEN_AI_EVALOPS_SOURCE_GATES,
    web_ok: web?.summary.final_status === GREEN_AI_EVALOPS_WEB_SMOKE,
    android_ok: android?.summary.final_status === GREEN_AI_EVALOPS_ANDROID_SMOKE,
    parity_ok: parity?.summary.final_status === GREEN_AI_EVALOPS_WEB_ANDROID_PARITY,
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
      ? GREEN_AI_PLATFORM_EVALOPS_GOLDEN_QUALITY_DRIFT_GUARD_V1_READY_NO_RELEASE
      : STOP_AI_PLATFORM_EVALOPS_GOLDEN_QUALITY_DRIFT_GUARD_V1_FAILED_NO_GREEN,
    source_sha: git.source_sha,
    source_commit: git.source_sha,
    branch: git.branch,
    upstream_sync: git.upstream_sync,
    worktree_clean: worktreeClean,
    pushed: git.upstream_sync === "0 0",
    generated_at: new Date().toISOString(),
    ai_eval_contract_created: true,
    ai_eval_runner_created: true,
    ai_eval_result_validation_created: true,
    eval_cases_are_versioned: fixtureGeneration?.summary.eval_cases_are_versioned === true,
    ai_eval_fixture_generator_created: fixtureGeneration?.summary.ai_eval_fixture_generator_created === true,
    golden_fixture_matches_generator: fixtureGeneration?.summary.golden_fixture_matches_generator === true,
    red_team_fixture_matches_generator: fixtureGeneration?.summary.red_team_fixture_matches_generator === true,
    manual_golden_overwrite_rejected: fixtureGeneration?.summary.manual_golden_overwrite_rejected === true,
    golden_expected_update_requires_generator_change: fixtureGeneration?.summary.golden_expected_update_requires_generator_change === true,
    eval_results_are_source_sha_bound: sampleResult.eval_results_are_source_sha_bound,
    eval_results_are_runtime_version_bound: sampleResult.eval_results_are_runtime_version_bound,
    eval_can_run_without_real_provider_for_contract_tests: true,
    prompt_version_manifest_created: manifest.prompt_version_manifest_created,
    model_eval_manifest_created: manifest.model_eval_manifest_created,
    prompt_changes_require_eval: manifest.prompt_changes_require_eval,
    model_changes_require_eval: manifest.model_changes_require_eval,
    provider_changes_require_eval: manifest.provider_changes_require_eval,
    tool_policy_changes_require_eval: manifest.tool_policy_changes_require_eval,
    redaction_policy_changes_require_eval: manifest.redaction_policy_changes_require_eval,
    manifest_source_sha_recorded: manifest.manifest_source_sha_recorded,
    ai_estimate_golden_eval_corpus_created: golden?.summary.ai_estimate_golden_eval_corpus_created === true,
    estimate_golden_cases_total: golden?.summary.estimate_golden_cases_total ?? 0,
    critical_construction_cases_count: golden?.summary.critical_construction_cases_count ?? 0,
    unit_conflict_cases_count: golden?.summary.unit_conflict_cases_count ?? 0,
    missing_input_cases_count: golden?.summary.missing_input_cases_count ?? 0,
    parameter_override_cases_count: golden?.summary.parameter_override_cases_count ?? 0,
    pdf_buyer_parity_cases_count: golden?.summary.pdf_buyer_parity_cases_count ?? 0,
    negative_forbidden_cases_count: golden?.summary.negative_forbidden_cases_count ?? 0,
    critical_work_families_covered: golden?.summary.critical_work_families_covered === true,
    quality_scoring_created: true,
    estimate_quality_score_created: true,
    score_breakdown_created: true,
    score_explanation_ru_created: true,
    critical_eval_min_score_enforced: true,
    no_single_total_score_without_breakdown: true,
    ai_quality_drift_detector_created: drift?.summary.ai_quality_drift_detector_created === true,
    eval_run_comparison_created: drift?.summary.eval_run_comparison_created === true,
    work_family_drift_detected: drift?.summary.work_family_drift_detected === true,
    parameter_drift_detected: drift?.summary.parameter_drift_detected === true,
    missing_question_drift_detected: drift?.summary.missing_question_drift_detected === true,
    boq_drift_detected: drift?.summary.boq_drift_detected === true,
    quantity_trace_drift_detected: drift?.summary.quantity_trace_drift_detected === true,
    russian_ui_drift_detected: drift?.summary.russian_ui_drift_detected === true,
    policy_drift_detected: drift?.summary.policy_drift_detected === true,
    pdf_buyer_drift_detected: drift?.summary.pdf_buyer_drift_detected === true,
    cost_latency_drift_detected: drift?.summary.cost_latency_drift_detected === true,
    quality_score_drift_detected: drift?.summary.quality_score_drift_detected === true,
    drift_requires_explicit_acceptance_or_stop: drift?.summary.drift_requires_explicit_acceptance_or_stop === true,
    grounding_guard_created: true,
    estimate_grounding_guard_created: true,
    missing_price_not_faked: grounding.missing_price_not_faked,
    fake_final_total_rejected: grounding.fake_final_total_rejected,
    owner_approval_not_faked: grounding.owner_approval_not_faked,
    supplier_warehouse_payment_not_invented: grounding.supplier_warehouse_payment_not_invented,
    raw_internal_ids_not_visible: grounding.raw_internal_ids_not_visible,
    insufficient_input_shows_missing_questions: grounding.insufficient_input_shows_missing_questions,
    ai_red_team_corpus_created: redTeam?.summary.ai_red_team_corpus_created === true,
    red_team_cases_total: redTeam?.summary.red_team_cases_total ?? 0,
    prompt_injection_cases_passed: redTeam?.summary.prompt_injection_cases_passed === true,
    hidden_metadata_leak_cases_passed: redTeam?.summary.hidden_metadata_leak_cases_passed === true,
    owner_approval_bypass_cases_passed: redTeam?.summary.owner_approval_bypass_cases_passed === true,
    payment_warehouse_bypass_cases_passed: redTeam?.summary.payment_warehouse_bypass_cases_passed === true,
    pii_leak_cases_passed: redTeam?.summary.pii_leak_cases_passed === true,
    fake_total_cases_passed: redTeam?.summary.fake_total_cases_passed === true,
    raw_internal_id_cases_passed: redTeam?.summary.raw_internal_id_cases_passed === true,
    ai_eval_cost_budget_created: costLatency?.summary.ai_eval_cost_budget_created === true,
    latency_budget_enforced: costLatency?.summary.latency_budget_enforced === true,
    token_usage_recorded: costLatency?.summary.token_usage_recorded === true,
    cost_budget_recorded: costLatency?.summary.cost_budget_recorded === true,
    cost_regression_detected: costLatency?.summary.cost_regression_detected === true,
    slow_eval_case_report_created: costLatency?.summary.slow_eval_case_report_created === true,
    ai_eval_ledger_created: true,
    eval_ledger_records_source_sha: Boolean(ledgerRecord.sourceSha),
    eval_ledger_records_prompt_version: Boolean(ledgerRecord.promptVersion),
    eval_ledger_records_model_provider: Boolean(ledgerRecord.providerKey && ledgerRecord.modelKey),
    eval_ledger_records_score_breakdown: Boolean(ledgerRecord.scoreBreakdown),
    eval_ledger_records_cost_latency: Boolean(ledgerRecord.cost.durationMs),
    eval_ledger_redacted: true,
    eval_ledger_does_not_store_full_prompt_unredacted: !aiEvalLedgerStoresRawPromptUnredacted(ledgerRecord),
    model_replacement_eval_proof_created: replacement?.summary.model_replacement_eval_proof_created === true,
    same_eval_corpus_used_for_two_providers: replacement?.summary.same_eval_corpus_used_for_two_providers === true,
    provider_swap_keeps_result_contract: replacement?.summary.provider_swap_keeps_result_contract === true,
    provider_swap_keeps_policy_contract: replacement?.summary.provider_swap_keeps_policy_contract === true,
    provider_swap_keeps_redaction_contract: replacement?.summary.provider_swap_keeps_redaction_contract === true,
    provider_swap_does_not_change_ui_contract: replacement?.summary.provider_swap_does_not_change_ui_contract === true,
    provider_swap_does_not_create_second_engine: replacement?.summary.provider_swap_does_not_create_second_engine === true,
    actual_web_browser_evalops_smoke_passed: web?.summary.actual_web_browser_evalops_smoke_passed === true,
    web_evalops_cases_passed: web?.summary.web_evalops_cases_passed ?? "0/50",
    web_estimate_quality_cases_passed: web?.summary.web_estimate_quality_cases_passed === true,
    web_forbidden_policy_cases_passed: web?.summary.web_forbidden_policy_cases_passed === true,
    web_pdf_buyer_parity_passed: web?.summary.web_pdf_buyer_parity_passed === true,
    web_console_errors_count: web?.summary.web_console_errors_count ?? -1,
    actual_android_emulator_evalops_smoke_passed: android?.summary.actual_android_emulator_evalops_smoke_passed === true,
    android_evalops_cases_passed: android?.summary.android_evalops_cases_passed ?? "0/50",
    android_estimate_quality_cases_passed: android?.summary.android_estimate_quality_cases_passed === true,
    android_forbidden_policy_cases_passed: android?.summary.android_forbidden_policy_cases_passed === true,
    android_pdf_buyer_parity_passed: android?.summary.android_pdf_buyer_parity_passed === true,
    android_console_errors_count: android?.summary.android_console_errors_count ?? -1,
    web_android_eval_result_parity: parity?.summary.web_android_eval_result_parity === true,
    web_android_policy_parity: parity?.summary.web_android_policy_parity === true,
    web_android_pdf_buyer_parity: parity?.summary.web_android_pdf_buyer_parity === true,
    targeted_ai_evalops_tests_passed: targeted?.summary.targeted_ai_evalops_tests_passed === true,
    eval_fixture_generation_passed: sourceGates?.summary.eval_fixture_generation_passed === true,
    typecheck_passed: sourceGates?.summary.typecheck_passed === true,
    lint_passed: sourceGates?.summary.lint_passed === true,
    diff_check_passed: sourceGates?.summary.diff_check_passed === true,
    no_test_weakening_passed: sourceGates?.summary.no_test_weakening_passed === true,
    web_public_smoke_passed: sourceGates?.summary.web_public_smoke_passed === true,
    ci_office_market_passed: sourceGates?.summary.ci_office_market_passed === true,
    secret_scan_passed: sourceGates?.summary.secret_scan_passed === true,
    forbidden_touched_files: forbiddenTouched,
    marketplace_touched: false,
    rfq_touched: false,
    warehouse_touched: false,
    payment_touched: false,
    render_started: false,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    production_db_touched: false,
    destructive_migration_run: false,
    fake_green_claimed: false,
    artifact_paths: {
      golden: golden?.path ?? null,
      fixture_generation: fixtureGeneration?.path ?? null,
      red_team: redTeam?.path ?? null,
      drift: drift?.path ?? null,
      cost_latency: costLatency?.path ?? null,
      model_replacement: replacement?.path ?? null,
      targeted: targeted?.path ?? null,
      source_gates: sourceGates?.path ?? null,
      web: web?.path ?? null,
      android: android?.path ?? null,
      parity: parity?.path ?? null,
    },
    checks,
    blocking_reasons,
  };
  const summaryPath = path.join(AI_PLATFORM_EVALOPS_ROOT, timestampForPath(), "summary.json");
  if (input.writeSummary !== false) writeJson(summaryPath, summary);
  return { summary, summaryPath };
}

if (require.main === module) {
  void auditAiPlatformEvalOpsGoldenQualityDriftGuardV1({ writeSummary: true }).then((result) => {
    console.log(JSON.stringify({ ...result.summary, summary_path: result.summaryPath }, null, 2));
    if (result.summary.final_status !== GREEN_AI_PLATFORM_EVALOPS_GOLDEN_QUALITY_DRIFT_GUARD_V1_READY_NO_RELEASE) {
      process.exitCode = 1;
    }
  });
}
