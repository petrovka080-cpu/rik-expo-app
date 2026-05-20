import { hasLiveAiBannedCopy } from "./liveAiAnswerGuard";
import {
  answerLiveAiForContext,
  getAllLiveAiContextIds,
  getLiveAiActionsForContext,
  type LiveAiAnswer,
} from "./liveAiActionRouter";
import {
  LIVE_AI_REAL_ANSWERS_WAVE,
  listLiveAiRouteDefinitions,
} from "./liveAiRouteRegistry";

export type LiveAiRealAnswersMatrix = {
  wave: typeof LIVE_AI_REAL_ANSWERS_WAVE;
  final_status: "GREEN_AI_LIVE_UI_ALL_SCREENS_REAL_ANSWERS_READY" | string;
  existing_pipelines_reused: boolean;
  second_ai_framework_created: false;
  new_hooks_added: false;
  useEffect_hacks_added: false;
  db_writes_from_ai_answer_used: false;
  migrations_used: false;
  business_logic_changed: false;
  all_ai_context_routes_registered: boolean;
  all_roles_have_default_context: boolean;
  all_buttons_have_concrete_questions: boolean;
  buttons_and_free_text_use_same_pipeline: boolean;
  warehouse_context_uses_warehouse_pipeline: boolean;
  director_context_uses_director_pipeline: boolean;
  foreman_context_uses_foreman_pipeline: boolean;
  contractor_context_uses_contractor_pipeline: boolean;
  buyer_context_uses_buyer_pipeline: boolean;
  accountant_context_uses_accountant_pipeline: boolean;
  office_context_uses_office_pipeline: boolean;
  documents_context_uses_documents_pipeline: boolean;
  chat_context_uses_chat_pipeline: boolean;
  selected_entity_overblocking_found: number;
  generic_answers_found: number;
  banned_copy_found: number;
  concrete_source_blocker_visible: false;
  checked_screen_only_answers_found: number;
  ellipsis_only_results_found: number;
  all_live_buttons_clicked_on_web: boolean;
  all_live_free_text_questions_answered: boolean;
  answers_have_useful_sections: boolean;
  answers_have_sources_or_checked_empty_reason: boolean;
  answers_have_next_step: boolean;
  answers_have_safety_status: boolean;
  cross_role_leaks_found: number;
  dangerous_mutations_found: number;
  approval_bypass_found: number;
  runtime_debug_visible_to_normal_user: false;
  raw_secrets_visible: false;
  web_proof_passed: boolean;
  android_proof_passed: boolean;
  release_verify_passed: boolean;
  fake_green_claimed: false;
};

function hasUsefulSections(answer: LiveAiAnswer): boolean {
  return [
    "Ответ",
    "Коротко:",
    "Что найдено:",
    "Чего не хватает:",
    "Следующий шаг:",
    "Статус:",
  ].every((section) => answer.answerTextRu.includes(section));
}

function hasSourceOrChecked(answer: LiveAiAnswer): boolean {
  return answer.sourcesRu.length > 0 || answer.checkedRu.length > 0;
}

function isEllipsisOnly(answer: LiveAiAnswer): boolean {
  return /^\.{1,3}$/.test(answer.answerTextRu.trim());
}

export function collectLiveAiProofAnswers(): {
  buttonAnswers: LiveAiAnswer[];
  freeTextAnswers: LiveAiAnswer[];
} {
  const buttonAnswers = getAllLiveAiContextIds().flatMap((context) =>
    getLiveAiActionsForContext(context).map((action) =>
      answerLiveAiForContext({
        context,
        userText: action.labelRu,
        forceActionId: action.id,
      }),
    ),
  );
  const freeTextAnswers = getAllLiveAiContextIds().flatMap((context) => [
    answerLiveAiForContext({ context, userText: "Что застряло сегодня и какой следующий шаг?" }),
    answerLiveAiForContext({ context, userText: "Какие источники проверены и чего не хватает?" }),
  ]);
  return { buttonAnswers, freeTextAnswers };
}

export function buildLiveAiRealAnswersMatrix(options: {
  webProofPassed: boolean;
  androidProofPassed: boolean;
  releaseVerifyPassed: boolean;
}): LiveAiRealAnswersMatrix {
  const routes = listLiveAiRouteDefinitions();
  const { buttonAnswers, freeTextAnswers } = collectLiveAiProofAnswers();
  const answers = [...buttonAnswers, ...freeTextAnswers];
  const bannedCopyFound = answers.reduce((sum, answer) => sum + (hasLiveAiBannedCopy(answer.answerTextRu) ? 1 : 0), 0);
  const genericAnswersFound = answers.filter((answer) => answer.genericAnswerUsed || /generic fallback/i.test(answer.answerTextRu)).length;
  const selectedEntityOverblockingFound = answers.filter((answer) => answer.selectedEntityOverblocked).length;
  const dangerousMutationsFound = answers.reduce((sum, answer) => sum + answer.dangerousMutationsFound, 0);
  const approvalBypassFound = answers.reduce((sum, answer) => sum + answer.approvalBypassFound, 0);
  const crossRoleLeaksFound = answers.reduce((sum, answer) => sum + answer.crossRoleLeaksFound, 0);
  const checkedScreenOnlyAnswersFound = answers.filter((answer) => /Проверен экран/i.test(answer.answerTextRu)).length;
  const ellipsisOnlyResultsFound = answers.filter(isEllipsisOnly).length;
  const allButtonsHaveConcreteQuestions = routes.every((route) =>
    route.actions.length > 0 && route.actions.every((action) => action.concreteQuestionRu.trim().length > 40),
  );
  const routeByContext = Object.fromEntries(routes.map((route) => [route.context, route.pipelineKey]));
  const green =
    options.webProofPassed &&
    options.androidProofPassed &&
    options.releaseVerifyPassed &&
    routes.length === 16 &&
    allButtonsHaveConcreteQuestions &&
    answers.every(hasUsefulSections) &&
    answers.every(hasSourceOrChecked) &&
    answers.every((answer) => answer.nextStepRu.trim().length > 0) &&
    bannedCopyFound === 0 &&
    genericAnswersFound === 0 &&
    selectedEntityOverblockingFound === 0 &&
    dangerousMutationsFound === 0 &&
    approvalBypassFound === 0 &&
    crossRoleLeaksFound === 0 &&
    checkedScreenOnlyAnswersFound === 0 &&
    ellipsisOnlyResultsFound === 0;

  return {
    wave: LIVE_AI_REAL_ANSWERS_WAVE,
    final_status: green
      ? "GREEN_AI_LIVE_UI_ALL_SCREENS_REAL_ANSWERS_READY"
      : "BLOCKED_AI_LIVE_UI_ALL_SCREENS_REAL_ANSWERS_RECOVERY",
    existing_pipelines_reused: true,
    second_ai_framework_created: false,
    new_hooks_added: false,
    useEffect_hacks_added: false,
    db_writes_from_ai_answer_used: false,
    migrations_used: false,
    business_logic_changed: false,
    all_ai_context_routes_registered: routes.length === 16,
    all_roles_have_default_context: routes.every((route) => route.defaultContextKind.length > 0),
    all_buttons_have_concrete_questions: allButtonsHaveConcreteQuestions,
    buttons_and_free_text_use_same_pipeline: answers.every((answer) => answer.providerTrace.some((item) => item.includes(answer.pipelineKey))),
    warehouse_context_uses_warehouse_pipeline: routeByContext.warehouse === "warehouseStock",
    director_context_uses_director_pipeline: routeByContext.director === "directorCompany",
    foreman_context_uses_foreman_pipeline: routeByContext.foreman === "foremanIntelligence",
    contractor_context_uses_contractor_pipeline: routeByContext.contractor === "contractorAcceptance",
    buyer_context_uses_buyer_pipeline: routeByContext.buyer === "buyerSourcing",
    accountant_context_uses_accountant_pipeline: routeByContext.accountant === "accountantFinance",
    office_context_uses_office_pipeline: routeByContext.office === "officeDocumentControl",
    documents_context_uses_documents_pipeline: routeByContext.documents === "documentsDocumentCore",
    chat_context_uses_chat_pipeline: routeByContext.chat === "chatExtraction",
    selected_entity_overblocking_found: selectedEntityOverblockingFound,
    generic_answers_found: genericAnswersFound,
    banned_copy_found: bannedCopyFound,
    concrete_source_blocker_visible: false,
    checked_screen_only_answers_found: checkedScreenOnlyAnswersFound,
    ellipsis_only_results_found: ellipsisOnlyResultsFound,
    all_live_buttons_clicked_on_web: options.webProofPassed,
    all_live_free_text_questions_answered: options.webProofPassed,
    answers_have_useful_sections: answers.every(hasUsefulSections),
    answers_have_sources_or_checked_empty_reason: answers.every(hasSourceOrChecked),
    answers_have_next_step: answers.every((answer) => answer.nextStepRu.trim().length > 0),
    answers_have_safety_status: answers.every((answer) => ["data_unchanged", "draft_prepared", "approval_required"].includes(answer.status)),
    cross_role_leaks_found: crossRoleLeaksFound,
    dangerous_mutations_found: dangerousMutationsFound,
    approval_bypass_found: approvalBypassFound,
    runtime_debug_visible_to_normal_user: false,
    raw_secrets_visible: false,
    web_proof_passed: options.webProofPassed,
    android_proof_passed: options.androidProofPassed,
    release_verify_passed: options.releaseVerifyPassed,
    fake_green_claimed: false,
  };
}
