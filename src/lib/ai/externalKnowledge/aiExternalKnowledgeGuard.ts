import type {
  AiExternalKnowledgeRequest,
  AiExternalKnowledgeResult,
} from "./aiExternalKnowledgeRequest";
import type { AiExternalKnowledgeSourceRef } from "./aiExternalKnowledgeSourceTypes";

export type AiExternalKnowledgeGuardResult = {
  passed: boolean;
  failureReason?:
    | "internal_question_used_external_source"
    | "external_source_presented_as_app_fact"
    | "web_claim_without_url"
    | "web_claim_without_checked_at"
    | "controlled_source_presented_as_live_web"
    | "general_knowledge_presented_as_project_fact"
    | "accounting_answer_without_country"
    | "accounting_answer_without_review_warning"
    | "tax_answer_without_official_source"
    | "market_price_without_source"
    | "supplier_result_without_source"
    | "unsafe_mutation"
    | "provider_payload_leak";
  detailsRu: string;
};

function fail(
  failureReason: NonNullable<AiExternalKnowledgeGuardResult["failureReason"]>,
  detailsRu: string,
): AiExternalKnowledgeGuardResult {
  return { passed: false, failureReason, detailsRu };
}

function hasOfficialOrTrustedTaxSource(sources: AiExternalKnowledgeSourceRef[]): boolean {
  return sources.some((source) =>
    source.sourceType === "official_tax_source" ||
    source.sourceType === "official_accounting_source" ||
    source.sourceType === "trusted_accounting_reference",
  );
}

export function guardAiExternalKnowledge(input: {
  request: AiExternalKnowledgeRequest;
  result: AiExternalKnowledgeResult;
  internalQuestion?: boolean;
  answerTextRu?: string;
}): AiExternalKnowledgeGuardResult {
  if (input.internalQuestion && input.result.sources.length > 0) {
    return fail("internal_question_used_external_source", "Внутренний вопрос получил внешний источник.");
  }
  if (input.result.sources.some((source) => source.canBeUsedAsProjectFact)) {
    return fail("external_source_presented_as_app_fact", "Внешний источник представлен как факт приложения.");
  }
  if (input.result.sources.some((source) => source.origin === "public_web" && !source.url)) {
    return fail("web_claim_without_url", "Public web источник без URL.");
  }
  if (input.result.sources.some((source) => source.origin === "public_web" && !source.checkedAt)) {
    return fail("web_claim_without_checked_at", "Public web источник без checkedAt.");
  }
  if (input.result.sources.some((source) => source.origin === "public_web" && source.sourceType === "controlled_external_source")) {
    return fail("controlled_source_presented_as_live_web", "Controlled source показан как live public_web.");
  }
  if (input.result.sources.some((source) => source.sourceType === "general_knowledge" && source.canBePresentedAsFact)) {
    return fail("general_knowledge_presented_as_project_fact", "Общие знания представлены как проектный факт.");
  }
  if (["accounting_entry_help", "tax_reference", "finance_reference"].includes(input.request.intent) && !input.request.countryCode) {
    return fail("accounting_answer_without_country", "Для бухгалтерского/налогового ответа не указана страна учета.");
  }
  if (["accounting_entry_help", "tax_reference", "finance_reference"].includes(input.request.intent) && !input.result.safetyStatus.requiresHumanReview) {
    return fail("accounting_answer_without_review_warning", "Бухгалтерский/налоговый ответ не требует human review.");
  }
  if (input.request.intent === "tax_reference" && !hasOfficialOrTrustedTaxSource(input.result.sources)) {
    return fail("tax_answer_without_official_source", "Налоговый ответ без официального или trusted источника.");
  }
  if (input.request.intent === "market_price_reference" && input.result.sources.length === 0) {
    return fail("market_price_without_source", "Рыночная цена дана без источника.");
  }
  if (input.request.intent === "marketplace_supplier_search" && input.result.sources.length === 0) {
    return fail("supplier_result_without_source", "Поставщики даны без источника.");
  }
  if (input.result.safetyStatus.changedData || input.result.safetyStatus.finalSubmit) {
    return fail("unsafe_mutation", "External knowledge path изменил данные или сделал final submit.");
  }
  if (input.answerTextRu && /provider payload|raw payload|debug|runtime|trace/i.test(input.answerTextRu)) {
    return fail("provider_payload_leak", "Пользовательский ответ содержит provider/debug payload.");
  }
  return { passed: true, detailsRu: "External knowledge guard passed." };
}
