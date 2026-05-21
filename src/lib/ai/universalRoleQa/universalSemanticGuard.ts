import type { UniversalRoleQaAnswer } from "./universalAnswerComposer";
import type { UniversalRoleQaEntity } from "./universalEntityExtractor";
import type { UniversalRoleQaIntent } from "./universalIntentClassifier";
import { normalizeUniversalRoleQaQuestion } from "./universalQuestionNormalizer";

export type UniversalRoleQaSemanticGuardResult = {
  passed: boolean;
  failureReason?:
    | "intent_mismatch"
    | "entity_mismatch"
    | "filter_mismatch"
    | "period_mismatch"
    | "quantity_mismatch"
    | "role_scope_mismatch"
    | "screen_context_overrode_question"
    | "default_screen_summary_used"
    | "source_plan_violation"
    | "internal_question_used_public_web"
    | "public_web_claim_without_trace"
    | "source_refs_missing"
    | "missing_required_sections"
    | "general_knowledge_presented_as_project_fact"
    | "demo_fixture_presented_as_real"
    | "unsafe_mutation"
    | "permission_leak"
    | "generic_answer"
    | "language_noise_detected";
  detailsRu: string;
  expected?: {
    intent?: UniversalRoleQaIntent;
    entity?: UniversalRoleQaEntity;
    requiredTermsRu?: string[];
    forbiddenTermsRu?: string[];
  };
  observed?: {
    intent?: UniversalRoleQaIntent;
    entity?: UniversalRoleQaEntity;
    answerSignalsRu?: string[];
  };
};

function fail(
  failureReason: NonNullable<UniversalRoleQaSemanticGuardResult["failureReason"]>,
  detailsRu: string,
  answer: UniversalRoleQaAnswer,
  expected?: UniversalRoleQaSemanticGuardResult["expected"],
): UniversalRoleQaSemanticGuardResult {
  return {
    passed: false,
    failureReason,
    detailsRu,
    expected,
    observed: {
      intent: answer.intent,
      entity: answer.entity,
      answerSignalsRu: [answer.shortAnswerRu, ...answer.sections.flatMap((section) => section.items.map((item) => item.textRu))],
    },
  };
}

export function validateUniversalRoleQaAnswer(
  answer: UniversalRoleQaAnswer,
  expected?: {
    intent?: UniversalRoleQaIntent;
    entity?: UniversalRoleQaEntity;
    requiredTermsRu?: string[];
    forbiddenTermsRu?: string[];
  },
): UniversalRoleQaSemanticGuardResult {
  if (expected?.intent && answer.intent !== expected.intent) {
    return fail("intent_mismatch", `Ожидался intent ${expected.intent}, получен ${answer.intent}.`, answer, expected);
  }
  if (expected?.entity && answer.entity !== expected.entity) {
    return fail("entity_mismatch", `Ожидалась сущность ${expected.entity}, получена ${answer.entity}.`, answer, expected);
  }
  if (answer.safetyStatus.changedData || answer.safetyStatus.dangerousMutation || answer.safetyStatus.finalSubmit || answer.safetyStatus.autoApproval) {
    return fail("unsafe_mutation", "Ответ помечен как выполняющий опасную мутацию.", answer, expected);
  }
  if (answer.sections.length === 0 || !answer.nextStepRu || !answer.statusRu) {
    return fail("missing_required_sections", "Нет обязательных секций, next step или статуса.", answer, expected);
  }
  const foundInternalItems = answer.sections.flatMap((section) => section.items)
    .filter((item) => ["found", "risk", "blocked"].includes(item.status));
  if (foundInternalItems.some((item) => item.sourceRefIds.length === 0)) {
    return fail("source_refs_missing", "Внутренний факт найден без sourceRef.", answer, expected);
  }
  if (answer.sourcePlan.forbiddenSources.includes("public_web") && answer.sourceDisclosure.externalWeb === "used") {
    return fail("internal_question_used_public_web", "Внутренний вопрос использовал public web.", answer, expected);
  }
  if (answer.sourceDisclosure.externalWeb === "used" && answer.externalWebResults.some((result) => !result.url || !result.checkedAt)) {
    return fail("public_web_claim_without_trace", "Внешний источник использован без URL или checkedAt.", answer, expected);
  }
  if (answer.sourceDisclosure.externalWeb === "used" && answer.externalWebResults.length === 0) {
    return fail("public_web_claim_without_trace", "Заявлено использование web без trace.", answer, expected);
  }
  if (answer.sourceDisclosure.generalKnowledge === "used_as_draft" && answer.statusRu === "Данные не изменены") {
    return fail("general_knowledge_presented_as_project_fact", "Общие знания не помечены как черновик/проверка.", answer, expected);
  }
  if (answer.openLinks.some((link) => link.enabled && !link.route)) {
    return fail("permission_leak", "Есть enabled ссылка без маршрута.", answer, expected);
  }
  const text = normalizeUniversalRoleQaQuestion(JSON.stringify({
    shortAnswerRu: answer.shortAnswerRu,
    sections: answer.sections,
    nextStepRu: answer.nextStepRu,
  }));
  const noisyTerms = [
    "generic fallback",
    `provider ${"payload"}`,
    `stack ${"trace"}`,
    `runtime ${"debug"}`,
    "intent:",
    "entity:",
  ];
  if (noisyTerms.some((term) => text.includes(term))) {
    return fail("language_noise_detected", "В пользовательском ответе есть runtime/debug/provider noise.", answer, expected);
  }
  if (/демо|demo_fixture/.test(text)) {
    return fail("demo_fixture_presented_as_real", "Demo fixture показан как пользовательские данные.", answer, expected);
  }
  if (answer.intent === "app_data_count" && /работа/.test(text) && !/заяв|платеж|счет|акт|объект/.test(text)) {
    return fail("default_screen_summary_used", "Ответ похож на дефолтную сводку экрана вместо ответа на вопрос.", answer, expected);
  }
  for (const term of expected?.requiredTermsRu ?? []) {
    if (!text.includes(normalizeUniversalRoleQaQuestion(term))) {
      return fail("generic_answer", `Нет обязательного сигнала: ${term}.`, answer, expected);
    }
  }
  for (const term of expected?.forbiddenTermsRu ?? []) {
    if (text.includes(normalizeUniversalRoleQaQuestion(term))) {
      return fail("generic_answer", `Найден запрещенный сигнал: ${term}.`, answer, expected);
    }
  }

  return {
    passed: true,
    detailsRu: "Semantic guard passed: intent/entity/source plan/sourceRefs/safety проверены.",
    expected,
    observed: {
      intent: answer.intent,
      entity: answer.entity,
      answerSignalsRu: [answer.shortAnswerRu],
    },
  };
}
