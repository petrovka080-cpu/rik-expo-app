import type { AiAppEntityType, AiSourceRef } from "../../appContextGraph";

export const AI_ROLE_MIXED_150_REAL_ANSWERS_WAVE =
  "S_AI_ROLE_MIXED_150_QUESTION_BANK_REAL_ANSWERS_GATE_POINT_OF_NO_RETURN" as const;

export const AI_ROLE_MIXED_150_REAL_ANSWERS_PREFIX =
  "S_AI_ROLE_MIXED_150_QUESTION_BANK_REAL_ANSWERS_GATE" as const;

export const AI_ROLE_MIXED_150_REAL_ANSWERS_GREEN_STATUS =
  "GREEN_AI_ROLE_MIXED_150_QUESTION_BANK_REAL_ANSWERS_GATE_READY" as const;

export type AiEvalAnswerMode =
  | "positive_data_required"
  | "external_answer_required"
  | "empty_state_regression"
  | "permission_limited_required"
  | "security_refusal_required";

export type AiMixedEvalQuestionGroup =
  | "screen_app_data"
  | "external_knowledge"
  | "typo_messy_ru"
  | "security_negative";

export type AiMixedEvalRole =
  | "director"
  | "foreman"
  | "buyer"
  | "accountant"
  | "warehouse"
  | "contractor"
  | "documents"
  | "marketplace_user"
  | "office"
  | "client"
  | "admin";

export type AiExpectedNumericFact = {
  key: string;
  value: number;
  unit?: string;
  tolerance?: number;
  required: boolean;
};

export type AiExpectedAnswerBlueprint = {
  kind:
    | "director_decisions"
    | "foreman_closeout"
    | "buyer_request_124"
    | "accountant_missing_docs"
    | "warehouse_gkl_trace"
    | "document_invoice_45"
    | "contractor_scope"
    | "marketplace_gkl"
    | "internal_summary"
    | "external_estimate"
    | "external_technology"
    | "external_supplier"
    | "external_accounting"
    | "empty_state"
    | "permission_limited"
    | "security_refusal";
  shortRu: string;
  requiredSectionsRu: string[];
  requiredTermsRu: string[];
};

export type AiMixedEvalQuestion = {
  id: string;
  group: AiMixedEvalQuestionGroup;
  answerMode: AiEvalAnswerMode;
  role: AiMixedEvalRole;
  screenId: string;
  route: string;
  questionRu: string;
  expectedIntent: string;
  expectedEntity: string;
  expectedSourceBehavior: string;
  expectedAnswerBlueprint: AiExpectedAnswerBlueprint;
  expectedNumericFacts: AiExpectedNumericFact[];
  expectedTextFactsRu: string[];
  expectedOpenLinkTypes: string[];
  forbiddenAnswerSignalsRu: string[];
  safetyExpectation: {
    changedData: false;
    finalSubmit: false;
    dangerousMutation: false;
    approvalBypass: false;
  };
};

export type AiGoldenOpenLink = {
  labelRu: string;
  sourceRefId: string;
  entityType: AiAppEntityType;
  route: string;
};

export type AiGoldenEvalAnswer = {
  questionId: string;
  answerMode: AiEvalAnswerMode;
  answerTextRu: string;
  sourceRefs: AiSourceRef[];
  openLinks: AiGoldenOpenLink[];
  observedNumericFacts: AiExpectedNumericFact[];
  sourceBehavior: string;
  safetyStatus: {
    changedData: false;
    finalSubmit: false;
    dangerousMutation: false;
    approvalBypass: false;
  };
};

export type AiRealAnswerGuardResult = {
  questionId: string;
  passed: boolean;
  answerMode: AiEvalAnswerMode;
  realNumericFactsFound: boolean;
  numericAssertions: {
    key: string;
    expected: number;
    observed?: number;
    passed: boolean;
  }[];
  requiredEntityLinksFound: boolean;
  noEmptyCopout: boolean;
  failureReason?:
    | "positive_question_returned_empty"
    | "numeric_fact_missing"
    | "numeric_fact_wrong"
    | "required_link_missing"
    | "generic_copout"
    | "checked_empty_not_allowed"
    | "source_missing"
    | "wrong_entity"
    | "wrong_role"
    | "unsafe_mutation";
};

export type AiGoldenBusinessDataset = {
  datasetId: "golden-business-dataset-v1";
  purpose:
    "deterministic_evaluation_only_not_production_user_data";
  company: {
    id: string;
    nameRu: string;
    countryCode: string;
    currency: string;
  };
  objects: { id: string; nameRu: string; floors: readonly number[]; zones: readonly string[] }[];
  works: {
    id: string;
    number: number;
    titleRu: string;
    objectId: string;
    floor: number;
    status: string;
    blockers: readonly string[];
  }[];
  procurement: {
    may2026Total: number;
    statuses: Record<"approved" | "pending" | "revision" | "closed", number>;
    byObject: Record<string, number>;
    byFloor: Record<string, number>;
    mainRequest: {
      id: string;
      number: number;
      authorRole: string;
      objectId: string;
      objectRu: string;
      floor: number;
      workId: string;
      workRu: string;
      materialId: string;
      materialRu: string;
      requiredSheets: number;
      statusRu: string;
      approvedByRu: string;
    };
  };
  warehouse: {
    positionsTotal: number;
    deficitsTotal: number;
    firstFloorIssues: number;
    gkl: {
      materialId: string;
      nameRu: string;
      requiredSheets: number;
      issuedSheets: number;
      remainingSheets: number;
      shortageSheets: number;
      issueId: string;
      stockId: string;
      receiverRu: string;
    };
    profile: {
      issuedMeters: number;
      remainingMeters: number;
    };
    screws: {
      shortagePacks: number;
    };
    tape: {
      shortageRolls: number;
    };
  };
  finance: {
    paymentsMissingDocsCount: number;
    paymentsMissingDocsSumKgs: number;
    payments: readonly {
      id: string;
      number: number;
      amountKgs: number;
      companyRu: string;
      missingDocs: readonly string[];
      linkedRequestId?: string;
      linkedWorkId?: string;
      linkedPdfId?: string;
      partialPaidKgs?: number;
      statusRu: string;
    }[];
  };
  documents: {
    pdfInvoice45: {
      id: string;
      invoiceId: string;
      invoiceNumber: number;
      amountKgs: number;
      companyRu: string;
      goodsRu: readonly string[];
      linkedPaymentId: string;
      linkedRequestId: string;
      missingLinkRu: "act";
      page: number;
      highlightText: string;
    };
  };
  marketplace: {
    gklProductId: string;
    materialRu: string;
    internalMarketplaceOptions: number;
    supplierHistoryOptions: number;
    externalOptionsWhenConnected: number;
    totalOptionsWhenConnected: number;
  };
  contractor: {
    openWorks: number;
    needsPhoto: number;
    needsAct: number;
    openRemarks: number;
  };
  sourceRefs: AiSourceRef[];
};

export type AiRoleMixed150EvaluationSummary = {
  questions: AiMixedEvalQuestion[];
  answers: AiGoldenEvalAnswer[];
  guardResults: AiRealAnswerGuardResult[];
  matrix: AiRoleMixed150GreenMatrix;
};

export type AiRoleMixed150GreenMatrix = {
  wave: typeof AI_ROLE_MIXED_150_REAL_ANSWERS_WAVE;
  final_status:
    | typeof AI_ROLE_MIXED_150_REAL_ANSWERS_GREEN_STATUS
    | "BLOCKED_AI_ROLE_MIXED_150_QUESTION_BANK_REAL_ANSWERS_GATE";
  new_hooks_added: false;
  useEffect_hacks_added: false;
  second_ai_framework_created: false;
  db_writes_from_ai_answer_used: false;
  migrations_used: false;
  business_logic_changed: false;
  golden_business_dataset_ready: boolean;
  golden_dataset_presented_as_production_data: false;
  golden_dataset_integrity_passed: boolean;
  questions_total: number;
  positive_questions_total_min: number;
  positive_internal_questions_min: number;
  positive_external_questions_min: number;
  typo_positive_questions_min: number;
  empty_state_questions_max: number;
  security_permission_questions_min: number;
  answer_blueprints_required: boolean;
  expected_numeric_facts_required: boolean;
  real_answer_guard_enabled: boolean;
  positive_questions_returned_empty: number;
  positive_questions_missing_numeric_facts: number;
  wrong_numeric_facts_found: number;
  generic_copouts_found: number;
  clarification_only_answers_found: number;
  director_real_answers_ready: boolean;
  foreman_real_answers_ready: boolean;
  buyer_real_answers_ready: boolean;
  accountant_real_answers_ready: boolean;
  warehouse_real_answers_ready: boolean;
  contractor_real_answers_ready: boolean;
  documents_real_answers_ready: boolean;
  marketplace_real_answers_ready: boolean;
  internal_questions_do_not_use_public_web: boolean;
  external_questions_have_url_when_web_used: boolean;
  external_questions_have_checkedAt_when_web_used: boolean;
  source_refs_required: boolean;
  open_links_required_for_internal_objects: boolean;
  missing_source_refs_found: number;
  missing_open_links_found: number;
  dangerous_mutations_found: number;
  approval_bypass_found: number;
  hardcoded_eval_answers_found: number;
  web_proof_reads_actual_dom_text: boolean;
  android_proof_reads_actual_hierarchy_text: boolean;
  release_verify_passed: boolean;
  fake_green_claimed: false;
  blockers: string[];
};
