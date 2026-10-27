export const AI_CONTRACT_RUNTIME_WAVE =
  "S_AI_ENTERPRISE_CONTRACT_RUNTIME_INVARIANT_PROOF_CORE_POINT_OF_NO_RETURN" as const;

export const AI_CONTRACT_RUNTIME_ARTIFACT_PREFIX =
  "S_AI_ENTERPRISE_CONTRACT_RUNTIME_INVARIANT_PROOF_CORE" as const;

export const AI_CONTRACT_RUNTIME_GREEN_STATUS =
  "GREEN_AI_ENTERPRISE_CONTRACT_RUNTIME_INVARIANT_PROOF_CORE_READY" as const;

export type AiContractRuntimeEntrypointMode =
  | "free_text_question"
  | "screen_button"
  | "document_question"
  | "media_question"
  | "workflow_question"
  | "marketplace_photo_draft";

export type AiContractTrace = {
  traceId: string;
  requestId: string;
  answerId: string;
  role: string;
  screenId: string;
  userId: string;
  orgId: string;
  questionRu: string;
  normalizedQuestionRu: string;
  entrypoint: {
    mode: AiContractRuntimeEntrypointMode;
    buttonId?: string;
    route?: string;
  };
  understanding: {
    intent: string;
    entity: string;
    filters: Record<string, unknown>;
    period?: {
      from: string;
      to: string;
      labelRu: string;
    };
    quantity?: {
      value: number;
      unit: string;
    };
  };
  sourcePlanning: {
    sourceOrder: string[];
    appDataRequired: boolean;
    internetAllowed: boolean;
    marketplaceFirst: boolean;
    pdfRequired: boolean;
    boundedQueryRequired: boolean;
    reasonRu: string;
  };
  gateway: {
    used: boolean;
    queries: {
      domain: string;
      kind: string;
      entity: string;
      bounded: boolean;
      orgScoped: boolean;
      roleScoped: boolean;
      limit?: number;
      resultStatus: "found" | "checked_empty" | "permission_limited" | "partial" | "failed";
    }[];
  };
  sources: {
    sourceRefIds: string[];
    openLinkCount: number;
    externalSources: {
      origin: string;
      url?: string;
      checkedAt?: string;
      sourceType?: string;
    }[];
  };
  numericFacts: {
    key: string;
    value: number;
    unit?: string;
    sourceRefIds: string[];
  }[];
  answerShape: {
    hasShortAnswer: boolean;
    hasFoundSection: boolean;
    hasSourceSection: boolean;
    hasOpenLinks: boolean;
    hasMissingData: boolean;
    hasNextStep: boolean;
    hasStatus: boolean;
  };
  safety: {
    changedData: false;
    finalSubmit: false;
    dangerousMutation: false;
    approvalBypass: false;
    autoApproval: false;
  };
  ui: {
    language: "ru";
    debugNoiseVisible: boolean;
    providerNoiseVisible: boolean;
    runtimeNoiseVisible: boolean;
    rawPayloadVisible: boolean;
  };
};

export type AiInvariantId =
  | "NO_HOOKS"
  | "NO_USE_EFFECT_HACKS"
  | "NO_SECOND_AI_FRAMEWORK"
  | "NO_SCREEN_LOCAL_AI_LOGIC"
  | "NO_SCREEN_LOCAL_RETRIEVAL"
  | "APPROVED_LAYERS_ONLY"
  | "GATEWAY_ONLY_INTERNAL_RETRIEVAL"
  | "BOUNDED_QUERIES"
  | "ROLE_ORG_SCOPE_REQUIRED"
  | "NO_RAW_ROWS_TO_ANSWER"
  | "NO_PROVIDER_PAYLOAD_TO_UI"
  | "SOURCE_REFS_FOR_INTERNAL_FACTS"
  | "DEEPLINKS_FOR_INTERNAL_OBJECTS"
  | "NO_PUBLIC_WEB_FOR_INTERNAL_QUESTIONS"
  | "EXTERNAL_SOURCES_HAVE_URL_AND_CHECKED_AT"
  | "EXTERNAL_SOURCE_NOT_APP_FACT"
  | "GENERAL_KNOWLEDGE_IS_DRAFT"
  | "ACCOUNTING_REQUIRES_COUNTRY_AND_REVIEW"
  | "POSITIVE_QUESTIONS_NOT_EMPTY"
  | "NUMERIC_FACTS_MATCH_EXPECTED"
  | "NO_GENERIC_COP_OUT"
  | "ANSWER_HAS_NEXT_STEP"
  | "ANSWER_HAS_STATUS"
  | "BUTTON_RESULT_MATCHES_BUTTON"
  | "MEDIA_DOCUMENT_AI_NOT_FINAL_FACT"
  | "NO_FACE_IDENTIFICATION"
  | "NO_FINAL_DOCUMENT_LINK_BY_AI"
  | "NO_WORK_CLOSE_BY_MEDIA_AI"
  | "NO_STOCK_MUTATION_BY_MEDIA_AI"
  | "NO_DANGEROUS_MUTATIONS"
  | "NO_APPROVAL_BYPASS"
  | "NO_AUTO_APPROVAL"
  | "NO_CROSS_ROLE_LEAKS"
  | "RUSSIAN_UI_NO_DEBUG_NOISE"
  | "NO_HARDCODED_EVAL_ANSWERS"
  | "NO_FAKE_GREEN";

export type AiInvariantAppliesTo =
  | "architecture"
  | "runtime_trace"
  | "answer"
  | "ui"
  | "gateway"
  | "external_knowledge"
  | "documents"
  | "media"
  | "workflow"
  | "proof";

export type AiInvariantCheck = {
  invariantId: AiInvariantId;
  titleRu: string;
  appliesTo: AiInvariantAppliesTo;
  passed: boolean;
  severity: "blocker" | "warning";
  failureReasonRu?: string;
  rootCauseRequired: boolean;
};

export type AiRootCauseCategory =
  | "normalizer"
  | "intent_classifier"
  | "entity_extractor"
  | "filter_parser"
  | "period_parser"
  | "quantity_parser"
  | "source_planner"
  | "domain_gateway"
  | "domain_provider"
  | "permission_scope"
  | "query_bounds"
  | "cross_domain_link_resolver"
  | "document_extraction"
  | "media_analysis"
  | "external_knowledge_provider"
  | "answer_composer"
  | "semantic_guard"
  | "ui_presenter"
  | "deep_link_registry"
  | "button_registry"
  | "proof_runner"
  | "architecture_violation"
  | "unknown";

export type AiCorrectFixLayer =
  | "question_normalizer"
  | "intent_classifier"
  | "entity_extractor"
  | "filter_parser"
  | "source_planner"
  | "domain_gateway"
  | "domain_provider"
  | "permission_policy"
  | "cross_domain_link_resolver"
  | "document_intelligence"
  | "media_intelligence"
  | "external_knowledge"
  | "answer_composer"
  | "semantic_guard"
  | "ui_presenter"
  | "deep_link_registry"
  | "proof_runner"
  | "architecture_guardrail";

export type AiForbiddenSymptomFix =
  | "screen_local_if"
  | "question_id_hardcode"
  | "button_id_hardcode"
  | "new_hook"
  | "use_effect_patch"
  | "new_framework"
  | "fake_data"
  | "fallback_hide_failure";

export type AiRootCauseReport = {
  traceId: string;
  failureInvariant: AiInvariantId;
  category: AiRootCauseCategory;
  rootCauseRu: string;
  evidence: {
    labelRu: string;
    valueRu: string;
  }[];
  correctFixLayer: AiCorrectFixLayer;
  forbiddenFixes: AiForbiddenSymptomFix[];
};

export type AiContractRuntimeValidationResult = {
  traceId: string;
  passed: boolean;
  checks: AiInvariantCheck[];
  blockers: {
    invariantId: AiInvariantId;
    reasonRu: string;
    rootCause?: AiRootCauseReport;
  }[];
  warnings: {
    invariantId: AiInvariantId;
    reasonRu: string;
  }[];
  summaryRu: string;
  fakeGreenClaimed: boolean;
};

export type AiContractRuntimeFileScanFinding = {
  file: string;
  pattern: string;
  reasonRu: string;
};

export type AiContractRuntimePatchScanResult = {
  questionIdHardcodesFound: number;
  screenIdAnswerHardcodesFound: number;
  buttonIdAnswerHardcodesFound: number;
  symptomPatchesFound: number;
  fallbackHideFailureFound: number;
  directDbFromScreensFound: number;
  findings: AiContractRuntimeFileScanFinding[];
};
