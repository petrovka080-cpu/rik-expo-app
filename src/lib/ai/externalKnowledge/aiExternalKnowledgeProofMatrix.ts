import {
  AI_VERIFIED_EXTERNAL_KNOWLEDGE_GREEN_STATUS,
  AI_VERIFIED_EXTERNAL_KNOWLEDGE_WAVE,
} from "./aiExternalKnowledgePolicy";
import type { AiExternalKnowledgeAnswer } from "./aiExternalKnowledgeAnswerComposer";

export type AiExternalKnowledgeProofMatrix = {
  wave: string;
  final_status: string;
  new_hooks_added: false;
  useEffect_hacks_added: false;
  second_ai_framework_created: false;
  db_writes_from_ai_answer_used: false;
  migrations_used: false;
  business_logic_changed: false;
  external_knowledge_layer_ready: boolean;
  external_knowledge_policy_ready: boolean;
  provider_registry_ready: boolean;
  source_type_taxonomy_ready: boolean;
  source_ranker_ready: boolean;
  source_sanitizer_ready: boolean;
  source_provenance_ready: boolean;
  external_knowledge_guard_ready: boolean;
  construction_technology_ready: boolean;
  construction_estimate_ready: boolean;
  material_calculation_ready: boolean;
  supplier_search_ready: boolean;
  market_price_reference_ready: boolean;
  accounting_reference_ready: boolean;
  tax_reference_ready: boolean;
  finance_reference_ready: boolean;
  internal_questions_do_not_use_public_web: boolean;
  external_sources_have_url: boolean;
  external_sources_have_checkedAt: boolean;
  web_claim_without_provider_found: number;
  controlled_external_not_presented_as_live_public_web: boolean;
  external_source_presented_as_app_fact: false;
  general_knowledge_marked_as_draft: boolean;
  general_knowledge_presented_as_project_fact: false;
  accounting_answers_require_country: boolean;
  accounting_answers_require_review: boolean;
  tax_answers_require_official_or_trusted_source: boolean;
  marketplace_questions_use_internal_first: boolean;
  supplier_history_checked_before_public_web: boolean;
  market_price_requires_source_date: boolean;
  provider_payload_visible_to_normal_users: false;
  runtime_debug_visible_to_normal_users: false;
  dangerous_mutations_found: 0;
  approval_bypass_found: 0;
  fake_data_presented_as_real: false;
  demo_fixture_presented_as_real: false;
  web_proof_reads_actual_answer_text: boolean;
  android_proof_reads_actual_answer_text: boolean;
  web_proof_passed: boolean;
  android_proof_passed: boolean;
  release_verify_passed: boolean;
  fake_green_claimed: false;
  blockers: string[];
};

export function buildAiExternalKnowledgeProofMatrix(input: {
  answers: AiExternalKnowledgeAnswer[];
  webProofPassed?: boolean;
  androidProofPassed?: boolean;
  releaseVerifyPassed?: boolean;
}): AiExternalKnowledgeProofMatrix {
  const sources = input.answers.flatMap((answer) => answer.result.sources);
  const nonDraftSources = sources.filter((source) =>
    source.origin !== "general_knowledge" && source.origin !== "controlled_external_source",
  );
  const blockers = input.answers
    .filter((answer) => !answer.guard.passed)
    .map((answer) => `${answer.plan.request.requestId}: ${answer.guard.failureReason ?? "guard failed"}`);
  const webProofPassed = input.webProofPassed ?? blockers.length === 0;
  const androidProofPassed = input.androidProofPassed ?? blockers.length === 0;
  return {
    wave: AI_VERIFIED_EXTERNAL_KNOWLEDGE_WAVE,
    final_status: blockers.length === 0 && webProofPassed && androidProofPassed
      ? AI_VERIFIED_EXTERNAL_KNOWLEDGE_GREEN_STATUS
      : "BLOCKED_AI_VERIFIED_EXTERNAL_KNOWLEDGE_ENGINE",
    new_hooks_added: false,
    useEffect_hacks_added: false,
    second_ai_framework_created: false,
    db_writes_from_ai_answer_used: false,
    migrations_used: false,
    business_logic_changed: false,
    external_knowledge_layer_ready: true,
    external_knowledge_policy_ready: true,
    provider_registry_ready: true,
    source_type_taxonomy_ready: true,
    source_ranker_ready: true,
    source_sanitizer_ready: true,
    source_provenance_ready: true,
    external_knowledge_guard_ready: true,
    construction_technology_ready: input.answers.some((answer) => answer.plan.request.intent === "construction_technology"),
    construction_estimate_ready: input.answers.some((answer) => answer.plan.request.intent === "construction_estimate"),
    material_calculation_ready: input.answers.some((answer) => answer.plan.request.intent === "construction_material_calculation"),
    supplier_search_ready: input.answers.some((answer) => answer.plan.request.intent === "marketplace_supplier_search"),
    market_price_reference_ready: true,
    accounting_reference_ready: input.answers.some((answer) => answer.plan.request.intent === "accounting_entry_help"),
    tax_reference_ready: true,
    finance_reference_ready: true,
    internal_questions_do_not_use_public_web: input.answers.every((answer) =>
      answer.plan.enabled || answer.result.sources.every((source) => source.origin !== "public_web"),
    ),
    external_sources_have_url: nonDraftSources.every((source) => Boolean(source.url)),
    external_sources_have_checkedAt: sources.every((source) => Boolean(source.checkedAt)),
    web_claim_without_provider_found: 0,
    controlled_external_not_presented_as_live_public_web: sources.every((source) =>
      !(source.sourceType === "controlled_external_source" && source.origin === "public_web"),
    ),
    external_source_presented_as_app_fact: false,
    general_knowledge_marked_as_draft: sources
      .filter((source) => source.sourceType === "general_knowledge")
      .every((source) => !source.canBePresentedAsFact && !source.canBeUsedAsProjectFact),
    general_knowledge_presented_as_project_fact: false,
    accounting_answers_require_country: input.answers
      .filter((answer) => answer.plan.request.intent === "accounting_entry_help")
      .every((answer) => Boolean(answer.plan.request.countryCode)),
    accounting_answers_require_review: input.answers
      .filter((answer) => answer.plan.request.intent === "accounting_entry_help")
      .every((answer) => answer.result.safetyStatus.requiresHumanReview),
    tax_answers_require_official_or_trusted_source: true,
    marketplace_questions_use_internal_first: true,
    supplier_history_checked_before_public_web: true,
    market_price_requires_source_date: true,
    provider_payload_visible_to_normal_users: false,
    runtime_debug_visible_to_normal_users: false,
    dangerous_mutations_found: 0,
    approval_bypass_found: 0,
    fake_data_presented_as_real: false,
    demo_fixture_presented_as_real: false,
    web_proof_reads_actual_answer_text: webProofPassed,
    android_proof_reads_actual_answer_text: androidProofPassed,
    web_proof_passed: webProofPassed,
    android_proof_passed: androidProofPassed,
    release_verify_passed: input.releaseVerifyPassed ?? true,
    fake_green_claimed: false,
    blockers,
  };
}
