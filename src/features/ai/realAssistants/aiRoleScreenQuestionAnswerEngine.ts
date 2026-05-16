import type { AiAssistantKnowledgeTopic } from "../assistantUx/aiAssistantModuleKnowledge";
import type { AiRoleScreenAssistantPack } from "./aiRoleScreenAssistantTypes";
import { sanitizeAiRoleScreenAssistantCopy } from "./aiRoleScreenAssistantUserCopy";

export type AiRoleScreenQuestionAnswer = {
  topic: AiAssistantKnowledgeTopic;
  answer: string;
  providerCallAllowed: false;
};

function normalize(value: string): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[ё]/g, "е")
    .replace(/\s+/g, " ");
}

function includesAny(value: string, tokens: readonly string[]): boolean {
  return tokens.some((token) => value.includes(token));
}

function topicForDomain(domain: string): AiAssistantKnowledgeTopic {
  switch (domain) {
    case "finance":
      return "finance";
    case "procurement":
      return "procurement_workflow";
    case "warehouse":
      return "warehouse";
    case "control":
      return "director";
    default:
      return "ai_boundaries";
  }
}

function mainRiskLine(pack: AiRoleScreenAssistantPack): string {
  const risk = pack.risks[0];
  if (risk) return `${risk.title}: ${risk.reason}`;
  const readyRisk = pack.readyItems.find((item) => item.riskLevel === "high" || item.riskLevel === "critical");
  if (readyRisk) return `${readyRisk.title}: ${readyRisk.description}`;
  return "критических рисков в текущем hydrated-срезе нет";
}

export function answerAiRoleScreenQuestion(params: {
  pack: AiRoleScreenAssistantPack | null | undefined;
  question: string;
}): AiRoleScreenQuestionAnswer | null {
  const pack = params.pack;
  if (!pack) return null;
  const question = normalize(params.question);
  if (!question) return null;

  const asksImportant = includesAny(question, ["что сегодня", "самое важ", "критич", "первым", "смотреть"]);
  const asksReport = includesAny(question, ["отчет", "отчёт", "summary", "сводк"]);
  const asksPrepared = includesAny(question, ["вариант", "готов", "действ", "риск", "документ", "оплат", "закуп"]);
  if (!asksImportant && !asksReport && !asksPrepared) return null;

  const topic = topicForDomain(pack.domain);
  const readyItems = pack.readyItems.slice(0, 3);
  const first = readyItems[0];
  const second = readyItems[1];
  const amount = pack.today?.amountLabel ? ` на ${pack.today.amountLabel}` : "";
  const countLine = pack.today
    ? `В текущем срезе: ${pack.today.count}${amount}, критические: ${pack.today.criticalCount ?? pack.risks.length}, требуют внимания: ${pack.today.overdueCount ?? pack.missingData.length}.`
    : pack.summary;

  if (pack.domain === "finance") {
    return {
      topic,
      providerCallAllowed: false,
      answer: sanitizeAiRoleScreenAssistantCopy([
        countLine,
        `Главное: ${mainRiskLine(pack)}.`,
        first ? `Начать лучше с ${first.primaryActionLabel?.toLowerCase() ?? "проверки"}: ${first.title}.` : "Начать лучше с загрузки read-only списка оплат.",
        "Оплату напрямую не создаю и не провожу: rationale и рискованные платежи идут через согласование.",
      ].join(" ")),
    };
  }

  if (pack.domain === "procurement") {
    return {
      topic,
      providerCallAllowed: false,
      answer: sanitizeAiRoleScreenAssistantCopy([
        first ? `Сначала проверь ${first.title}: ${first.description}` : pack.summary,
        second ? `Затем сравни ${second.title}: ${second.description}` : null,
        "Выбор поставщика или заказ напрямую не выполняется — сначала подготовь запрос или отправь выбор на согласование.",
      ].filter(Boolean).join(" ")),
    };
  }

  return {
    topic,
    providerCallAllowed: false,
    answer: sanitizeAiRoleScreenAssistantCopy([
      countLine,
      first ? `Первое действие: ${first.primaryActionLabel ?? first.title}. ${first.description}` : null,
      pack.missingData.length ? `Не хватает: ${pack.missingData.map((item) => item.label).join(", ")}.` : null,
      pack.nextActions.length ? `Готовые действия: ${pack.nextActions.slice(0, 3).map((action) => action.label).join(", ")}.` : null,
      "Прямых опасных мутаций не выполняю; всё рискованное остаётся через approval.",
    ].filter(Boolean).join(" ")),
  };
}
