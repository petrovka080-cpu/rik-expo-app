import type { AiAssistantKnowledgeTopic } from "../assistantUx/aiAssistantModuleKnowledge";
import type { AiScreenNativeAssistantPack } from "./aiScreenNativeAssistantTypes";
import { sanitizeAiScreenNativeUserCopy } from "./aiScreenNativeUserCopy";

export type AiScreenNativeQuestionAnswer = {
  topic: AiAssistantKnowledgeTopic;
  answer: string;
  providerCallAllowed: false;
};

function normalize(value: string): string {
  return String(value || "").trim().toLowerCase().replace(/[ё]/g, "е").replace(/\s+/g, " ");
}

function includesAny(value: string, tokens: readonly string[]): boolean {
  return tokens.some((token) => value.includes(token));
}

function topicForDomain(domain: string): AiAssistantKnowledgeTopic {
  if (domain === "finance") return "finance";
  if (domain === "procurement" || domain === "market") return "procurement_workflow";
  if (domain === "warehouse") return "warehouse";
  if (domain === "control" || domain === "approval") return "director";
  return "ai_boundaries";
}

export function answerAiScreenNativeQuestion(params: {
  pack: AiScreenNativeAssistantPack | null | undefined;
  question: string;
}): AiScreenNativeQuestionAnswer | null {
  const pack = params.pack;
  if (!pack) return null;
  const question = normalize(params.question);
  if (!question) return null;
  const asksScreenWork = includesAny(question, [
    "что",
    "критич",
    "перв",
    "смотреть",
    "отчет",
    "отчёт",
    "summary",
    "риск",
    "документ",
    "вариант",
    "approval",
    "соглас",
    "выдавать",
    "закуп",
    "оплат",
  ]);
  if (!asksScreenWork) return null;

  const critical = pack.criticalItems[0];
  const ready = pack.readyOptions[0];
  const risk = pack.risks[0];
  const missing = pack.missingData[0];
  const amount = pack.today?.amountLabel ? ` на ${pack.today.amountLabel}` : "";
  const today = pack.today
    ? `Сейчас в срезе: ${pack.today.count ?? pack.readyOptions.length}${amount}, критические: ${pack.today.criticalCount ?? pack.criticalItems.length}, ждут согласования: ${pack.today.pendingApprovalCount ?? pack.nextActions.filter((action) => action.requiresApproval).length}.`
    : pack.summary;
  const firstLine = critical
    ? `Главное: ${critical.title}: ${critical.reason}.`
    : ready
      ? `Первым смотри: ${ready.title}. ${ready.description}.`
      : "Готовых evidence-backed вариантов пока нет; сначала собери недостающие данные.";
  const riskLine = risk ? `Риск: ${risk.title}: ${risk.reason}.` : null;
  const missingLine = missing ? `Не хватает: ${missing.label}.` : null;
  const actionLine = pack.nextActions.length
    ? `Готовые действия: ${pack.nextActions.slice(0, 3).map((action) => action.label).join(", ")}.`
    : null;

  return {
    topic: topicForDomain(pack.domain),
    providerCallAllowed: false,
    answer: sanitizeAiScreenNativeUserCopy([
      today,
      firstLine,
      riskLine,
      missingLine,
      actionLine,
      "Опасные действия напрямую не выполняю: заказ, оплата, складское движение, подпись документа и approval остаются через безопасный маршрут.",
    ].filter(Boolean).join(" ")),
  };
}
