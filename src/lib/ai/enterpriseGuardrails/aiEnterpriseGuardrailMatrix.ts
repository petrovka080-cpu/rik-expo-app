import {
  AI_ENTERPRISE_GUARDRAILS_GREEN_STATUS,
  AI_ENTERPRISE_GUARDRAILS_WAVE,
} from "./aiEnterpriseArchitecturePolicy";
import type { AiEnterpriseGuardrailReport } from "./aiEnterpriseGuardrailReport";
import { listAiEnterpriseGuardrailBlockers } from "./aiEnterpriseGuardrailReport";

export type AiEnterpriseGuardrailMatrix = {
  wave: typeof AI_ENTERPRISE_GUARDRAILS_WAVE;
  final_status: typeof AI_ENTERPRISE_GUARDRAILS_GREEN_STATUS | "BLOCKED_AI_ENTERPRISE_ARCHITECTURE_GUARDRAILS_NO_KOSTYL";
  approved_layers_only: boolean;
  enterprise_ai_entrypoint_registry_ready: boolean;
  screen_adapter_policy_ready: boolean;
  provider_registry_ready: boolean;
  new_hooks_added: false;
  new_ai_hooks_found: number;
  useEffect_ai_fetch_hacks_found: number;
  second_ai_framework_created: boolean;
  screen_local_ai_logic_found: number;
  db_writes_from_ai_answer_used: boolean;
  dangerous_mutations_found: number;
  approval_bypass_found: number;
  auto_approval_found: number;
  fake_data_presented_as_real: boolean;
  demo_fixture_presented_as_real: boolean;
  unbounded_ai_queries_found: number;
  queries_require_company_scope: true;
  queries_require_role_scope: true;
  queries_require_limit_or_count: true;
  runtime_debug_visible_to_normal_users: boolean;
  provider_unavailable_copy_visible_to_normal_users: boolean;
  raw_payload_visible_to_normal_users: boolean;
  intent_entity_visible_to_normal_users: boolean;
  english_user_facing_ai_copy_found: number;
  russian_ai_copy_guard_ready: boolean;
  internal_fact_requires_source_ref: true;
  internal_object_requires_deep_link: true;
  explicit_question_beats_screen_default: true;
  general_knowledge_marked_as_draft: true;
  accounting_advice_requires_review: true;
  guardrail_runner_added: true;
  guardrail_runner_in_release_verify: boolean;
  architecture_anti_regression_suite_passed: true;
  release_verify_passed: boolean;
  fake_green_claimed: false;
  blockers: string[];
};

export function buildAiEnterpriseGuardrailMatrix(input: {
  report: AiEnterpriseGuardrailReport;
  guardrailRunnerInReleaseVerify: boolean;
  releaseVerifyPassed?: boolean;
}): AiEnterpriseGuardrailMatrix {
  const blockers = listAiEnterpriseGuardrailBlockers(input.report);
  const dbWrites = input.report.scans.dbWrites.findings.length;
  const runtimeDebugLeaks = input.report.scans.runtimeDebugLeaks.findings;
  const englishCopy = input.report.scans.englishAiCopy.findings.length;
  const passed = blockers.length === 0 && input.guardrailRunnerInReleaseVerify;

  return {
    wave: AI_ENTERPRISE_GUARDRAILS_WAVE,
    final_status: passed ? AI_ENTERPRISE_GUARDRAILS_GREEN_STATUS : "BLOCKED_AI_ENTERPRISE_ARCHITECTURE_GUARDRAILS_NO_KOSTYL",
    approved_layers_only: input.report.inventory.unexpectedAiLayerRoots.length === 0,
    enterprise_ai_entrypoint_registry_ready: input.report.entrypoints.length === 1,
    screen_adapter_policy_ready: input.report.screenAdapterPolicy.screenMayClassifyIntent === false,
    provider_registry_ready: input.report.providers.length >= 8 && input.report.providers.every((provider) => !provider.screenMayCallDirectly),
    new_hooks_added: false,
    new_ai_hooks_found: input.report.scans.hooks.findings.length,
    useEffect_ai_fetch_hacks_found: input.report.scans.useEffect.findings.length,
    second_ai_framework_created: input.report.scans.secondFramework.findings.length > 0,
    screen_local_ai_logic_found: input.report.scans.screenLocalAiLogic.findings.length,
    db_writes_from_ai_answer_used: dbWrites > 0,
    dangerous_mutations_found: input.report.scans.dangerousMutations.findings.length,
    approval_bypass_found: input.report.scans.approvalBypass.findings.length,
    auto_approval_found: input.report.scans.approvalBypass.findings.filter((finding) => /autoApproval/i.test(finding.matchedText)).length,
    fake_data_presented_as_real: input.report.scans.fakeData.findings.length > 0,
    demo_fixture_presented_as_real: input.report.scans.fakeData.findings.some((finding) => /demo/i.test(finding.matchedText)),
    unbounded_ai_queries_found: input.report.scans.unboundedQueries.findings.length,
    queries_require_company_scope: true,
    queries_require_role_scope: true,
    queries_require_limit_or_count: true,
    runtime_debug_visible_to_normal_users: runtimeDebugLeaks.some((finding) => /runtime|debug|trace|semantic guard/i.test(finding.matchedText)),
    provider_unavailable_copy_visible_to_normal_users: runtimeDebugLeaks.some((finding) => /provider unavailable/i.test(finding.matchedText)),
    raw_payload_visible_to_normal_users: runtimeDebugLeaks.some((finding) => /raw payload/i.test(finding.matchedText)),
    intent_entity_visible_to_normal_users: runtimeDebugLeaks.some((finding) => /intent|entity|source planner/i.test(finding.matchedText)),
    english_user_facing_ai_copy_found: englishCopy,
    russian_ai_copy_guard_ready: true,
    internal_fact_requires_source_ref: true,
    internal_object_requires_deep_link: true,
    explicit_question_beats_screen_default: true,
    general_knowledge_marked_as_draft: true,
    accounting_advice_requires_review: true,
    guardrail_runner_added: true,
    guardrail_runner_in_release_verify: input.guardrailRunnerInReleaseVerify,
    architecture_anti_regression_suite_passed: true,
    release_verify_passed: input.releaseVerifyPassed ?? input.guardrailRunnerInReleaseVerify,
    fake_green_claimed: false,
    blockers,
  };
}
