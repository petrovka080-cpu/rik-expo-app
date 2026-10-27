import type {
  AiCorrectFixLayer,
  AiForbiddenSymptomFix,
  AiInvariantCheck,
  AiInvariantId,
  AiRootCauseCategory,
  AiRootCauseReport,
} from "./aiContractRuntimeTypes";

const DEFAULT_FORBIDDEN_FIXES: AiForbiddenSymptomFix[] = [
  "screen_local_if",
  "question_id_hardcode",
  "button_id_hardcode",
  "new_hook",
  "use_effect_patch",
  "new_framework",
  "fake_data",
  "fallback_hide_failure",
];

const CATEGORY_BY_INVARIANT: Partial<Record<AiInvariantId, AiRootCauseCategory>> = {
  NO_HOOKS: "architecture_violation",
  NO_USE_EFFECT_HACKS: "architecture_violation",
  NO_SECOND_AI_FRAMEWORK: "architecture_violation",
  NO_SCREEN_LOCAL_AI_LOGIC: "architecture_violation",
  NO_SCREEN_LOCAL_RETRIEVAL: "architecture_violation",
  APPROVED_LAYERS_ONLY: "architecture_violation",
  GATEWAY_ONLY_INTERNAL_RETRIEVAL: "domain_gateway",
  BOUNDED_QUERIES: "query_bounds",
  ROLE_ORG_SCOPE_REQUIRED: "permission_scope",
  NO_RAW_ROWS_TO_ANSWER: "domain_gateway",
  NO_PROVIDER_PAYLOAD_TO_UI: "ui_presenter",
  SOURCE_REFS_FOR_INTERNAL_FACTS: "answer_composer",
  DEEPLINKS_FOR_INTERNAL_OBJECTS: "deep_link_registry",
  NO_PUBLIC_WEB_FOR_INTERNAL_QUESTIONS: "source_planner",
  EXTERNAL_SOURCES_HAVE_URL_AND_CHECKED_AT: "external_knowledge_provider",
  EXTERNAL_SOURCE_NOT_APP_FACT: "semantic_guard",
  GENERAL_KNOWLEDGE_IS_DRAFT: "answer_composer",
  ACCOUNTING_REQUIRES_COUNTRY_AND_REVIEW: "answer_composer",
  POSITIVE_QUESTIONS_NOT_EMPTY: "domain_gateway",
  NUMERIC_FACTS_MATCH_EXPECTED: "domain_provider",
  NO_GENERIC_COP_OUT: "answer_composer",
  ANSWER_HAS_NEXT_STEP: "answer_composer",
  ANSWER_HAS_STATUS: "answer_composer",
  BUTTON_RESULT_MATCHES_BUTTON: "button_registry",
  MEDIA_DOCUMENT_AI_NOT_FINAL_FACT: "semantic_guard",
  NO_FACE_IDENTIFICATION: "media_analysis",
  NO_FINAL_DOCUMENT_LINK_BY_AI: "document_extraction",
  NO_WORK_CLOSE_BY_MEDIA_AI: "media_analysis",
  NO_STOCK_MUTATION_BY_MEDIA_AI: "media_analysis",
  NO_DANGEROUS_MUTATIONS: "semantic_guard",
  NO_APPROVAL_BYPASS: "semantic_guard",
  NO_AUTO_APPROVAL: "semantic_guard",
  NO_CROSS_ROLE_LEAKS: "permission_scope",
  RUSSIAN_UI_NO_DEBUG_NOISE: "ui_presenter",
  NO_HARDCODED_EVAL_ANSWERS: "architecture_violation",
  NO_FAKE_GREEN: "proof_runner",
};

const FIX_LAYER_BY_CATEGORY: Record<AiRootCauseCategory, AiCorrectFixLayer> = {
  normalizer: "question_normalizer",
  intent_classifier: "intent_classifier",
  entity_extractor: "entity_extractor",
  filter_parser: "filter_parser",
  period_parser: "filter_parser",
  quantity_parser: "filter_parser",
  source_planner: "source_planner",
  domain_gateway: "domain_gateway",
  domain_provider: "domain_provider",
  permission_scope: "permission_policy",
  query_bounds: "domain_gateway",
  cross_domain_link_resolver: "cross_domain_link_resolver",
  document_extraction: "document_intelligence",
  media_analysis: "media_intelligence",
  external_knowledge_provider: "external_knowledge",
  answer_composer: "answer_composer",
  semantic_guard: "semantic_guard",
  ui_presenter: "ui_presenter",
  deep_link_registry: "deep_link_registry",
  button_registry: "ui_presenter",
  proof_runner: "proof_runner",
  architecture_violation: "architecture_guardrail",
  unknown: "architecture_guardrail",
};

export function classifyAiRootCause(params: {
  traceId: string;
  check: AiInvariantCheck;
  evidence?: { labelRu: string; valueRu: string }[];
}): AiRootCauseReport {
  const category = CATEGORY_BY_INVARIANT[params.check.invariantId] ?? "unknown";
  const reason = params.check.failureReasonRu ?? "Invariant failed without a more specific reason.";

  return {
    traceId: params.traceId,
    failureInvariant: params.check.invariantId,
    category,
    rootCauseRu: reason,
    evidence: params.evidence ?? [
      {
        labelRu: "Инвариант",
        valueRu: params.check.invariantId,
      },
    ],
    correctFixLayer: FIX_LAYER_BY_CATEGORY[category],
    forbiddenFixes: DEFAULT_FORBIDDEN_FIXES,
  };
}
