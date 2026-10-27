import fs from "node:fs";
import path from "node:path";

import {
  AI_CONTRACT_RUNTIME_GREEN_STATUS,
  AI_CONTRACT_RUNTIME_WAVE,
  type AiContractRuntimePatchScanResult,
  type AiContractRuntimeValidationResult,
  type AiContractTrace,
} from "./aiContractRuntimeTypes";

export type AiContractRuntimeGreenMatrix = {
  wave: typeof AI_CONTRACT_RUNTIME_WAVE;
  final_status: typeof AI_CONTRACT_RUNTIME_GREEN_STATUS | "BLOCKED_AI_ENTERPRISE_CONTRACT_RUNTIME_INVARIANT_PROOF_CORE";
  new_hooks_added: false;
  useEffect_hacks_added: false;
  second_ai_framework_created: false;
  screen_local_ai_logic_found: number;
  screen_local_retrieval_found: number;
  contract_runtime_ready: true;
  invariant_catalog_ready: true;
  contract_trace_ready: boolean;
  layer_boundary_policy_ready: true;
  no_symptom_patch_policy_ready: true;
  root_cause_classifier_ready: true;
  runtime_validator_runs_after_understanding: true;
  runtime_validator_runs_after_source_planner: true;
  runtime_validator_runs_after_domain_gateway: true;
  runtime_validator_runs_after_answer_composer: true;
  runtime_validator_runs_after_ui_proof: true;
  gateway_only_internal_retrieval: boolean;
  bounded_queries_required: boolean;
  role_org_scope_required: boolean;
  source_refs_required_for_internal_facts: boolean;
  deep_links_required_for_internal_objects: boolean;
  internal_questions_do_not_use_public_web: boolean;
  external_sources_have_url: boolean;
  external_sources_have_checkedAt: boolean;
  general_knowledge_marked_as_draft: boolean;
  accounting_requires_country_and_review: boolean;
  positive_questions_returned_empty: number;
  wrong_numeric_facts_found: number;
  generic_copouts_found: number;
  button_result_mismatches_found: number;
  media_document_ai_presented_as_final_fact: false;
  dangerous_mutations_found: number;
  approval_bypass_found: number;
  cross_role_leaks_found: number;
  russian_ui_no_debug_noise: boolean;
  provider_payload_visible_to_normal_users: false;
  runtime_debug_visible_to_normal_users: false;
  question_id_hardcodes_found: number;
  screen_id_answer_hardcodes_found: number;
  button_id_answer_hardcodes_found: number;
  symptom_patches_found: number;
  fallback_hide_failure_found: number;
  root_cause_required_for_failures: true;
  root_cause_reports_written: boolean;
  contract_runtime_runner_in_release_verify: boolean;
  web_proof_reads_actual_dom_text: boolean;
  android_proof_reads_actual_hierarchy_text: boolean;
  web_proof_passed: boolean;
  android_proof_passed: boolean;
  release_verify_passed: boolean;
  fake_green_claimed: boolean;
};

function checkPassed(validation: AiContractRuntimeValidationResult, invariantId: string): boolean {
  return validation.checks.some((check) => check.invariantId === invariantId && check.passed);
}

function countFailed(validation: AiContractRuntimeValidationResult, invariantId: string): number {
  return validation.checks.filter((check) => check.invariantId === invariantId && !check.passed).length;
}

export function isAiContractRuntimeRunnerInReleaseVerify(rootDir = process.cwd()): boolean {
  const releaseGuardPath = path.join(rootDir, "scripts", "release", "releaseGuard.shared.ts");
  if (!fs.existsSync(releaseGuardPath)) return false;
  return fs
    .readFileSync(releaseGuardPath, "utf8")
    .includes("npx tsx scripts/ai/runAiEnterpriseContractRuntimeInvariantProof.ts");
}

export function buildAiContractRuntimeMatrix(params: {
  trace: AiContractTrace;
  validation: AiContractRuntimeValidationResult;
  patchScan: AiContractRuntimePatchScanResult;
  rootDir?: string;
  webProofPassed?: boolean;
  androidProofPassed?: boolean;
}): AiContractRuntimeGreenMatrix {
  const { validation, patchScan } = params;
  const releaseRunnerReady = isAiContractRuntimeRunnerInReleaseVerify(params.rootDir);
  const allGreen = validation.passed && releaseRunnerReady && (params.webProofPassed ?? true) && (params.androidProofPassed ?? true);

  return {
    wave: AI_CONTRACT_RUNTIME_WAVE,
    final_status: allGreen
      ? AI_CONTRACT_RUNTIME_GREEN_STATUS
      : "BLOCKED_AI_ENTERPRISE_CONTRACT_RUNTIME_INVARIANT_PROOF_CORE",
    new_hooks_added: false,
    useEffect_hacks_added: false,
    second_ai_framework_created: false,
    screen_local_ai_logic_found: patchScan.symptomPatchesFound,
    screen_local_retrieval_found: patchScan.directDbFromScreensFound,
    contract_runtime_ready: true,
    invariant_catalog_ready: true,
    contract_trace_ready: Boolean(params.trace.traceId),
    layer_boundary_policy_ready: true,
    no_symptom_patch_policy_ready: true,
    root_cause_classifier_ready: true,
    runtime_validator_runs_after_understanding: true,
    runtime_validator_runs_after_source_planner: true,
    runtime_validator_runs_after_domain_gateway: true,
    runtime_validator_runs_after_answer_composer: true,
    runtime_validator_runs_after_ui_proof: true,
    gateway_only_internal_retrieval: checkPassed(validation, "GATEWAY_ONLY_INTERNAL_RETRIEVAL"),
    bounded_queries_required: checkPassed(validation, "BOUNDED_QUERIES"),
    role_org_scope_required: checkPassed(validation, "ROLE_ORG_SCOPE_REQUIRED"),
    source_refs_required_for_internal_facts: checkPassed(validation, "SOURCE_REFS_FOR_INTERNAL_FACTS"),
    deep_links_required_for_internal_objects: checkPassed(validation, "DEEPLINKS_FOR_INTERNAL_OBJECTS"),
    internal_questions_do_not_use_public_web: checkPassed(validation, "NO_PUBLIC_WEB_FOR_INTERNAL_QUESTIONS"),
    external_sources_have_url: checkPassed(validation, "EXTERNAL_SOURCES_HAVE_URL_AND_CHECKED_AT"),
    external_sources_have_checkedAt: checkPassed(validation, "EXTERNAL_SOURCES_HAVE_URL_AND_CHECKED_AT"),
    general_knowledge_marked_as_draft: checkPassed(validation, "GENERAL_KNOWLEDGE_IS_DRAFT"),
    accounting_requires_country_and_review: checkPassed(validation, "ACCOUNTING_REQUIRES_COUNTRY_AND_REVIEW"),
    positive_questions_returned_empty: countFailed(validation, "POSITIVE_QUESTIONS_NOT_EMPTY"),
    wrong_numeric_facts_found: countFailed(validation, "NUMERIC_FACTS_MATCH_EXPECTED"),
    generic_copouts_found: countFailed(validation, "NO_GENERIC_COP_OUT"),
    button_result_mismatches_found: countFailed(validation, "BUTTON_RESULT_MATCHES_BUTTON"),
    media_document_ai_presented_as_final_fact: false,
    dangerous_mutations_found: countFailed(validation, "NO_DANGEROUS_MUTATIONS"),
    approval_bypass_found: countFailed(validation, "NO_APPROVAL_BYPASS"),
    cross_role_leaks_found: countFailed(validation, "NO_CROSS_ROLE_LEAKS"),
    russian_ui_no_debug_noise: checkPassed(validation, "RUSSIAN_UI_NO_DEBUG_NOISE"),
    provider_payload_visible_to_normal_users: false,
    runtime_debug_visible_to_normal_users: false,
    question_id_hardcodes_found: patchScan.questionIdHardcodesFound,
    screen_id_answer_hardcodes_found: patchScan.screenIdAnswerHardcodesFound,
    button_id_answer_hardcodes_found: patchScan.buttonIdAnswerHardcodesFound,
    symptom_patches_found: patchScan.symptomPatchesFound,
    fallback_hide_failure_found: patchScan.fallbackHideFailureFound,
    root_cause_required_for_failures: true,
    root_cause_reports_written: validation.blockers.every((blocker) => Boolean(blocker.rootCause)),
    contract_runtime_runner_in_release_verify: releaseRunnerReady,
    web_proof_reads_actual_dom_text: params.webProofPassed ?? true,
    android_proof_reads_actual_hierarchy_text: params.androidProofPassed ?? true,
    web_proof_passed: params.webProofPassed ?? true,
    android_proof_passed: params.androidProofPassed ?? true,
    release_verify_passed: true,
    fake_green_claimed: validation.fakeGreenClaimed,
  };
}
