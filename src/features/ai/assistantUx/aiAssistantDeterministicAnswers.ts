import type { AssistantContext, AssistantRole } from "../assistant.types";
import {
  getAiAssistantContextPrimer,
  getAiAssistantKnowledgeLines,
  type AiAssistantKnowledgeTopic,
} from "./aiAssistantModuleKnowledge";
import { sanitizeAssistantUserFacingCopy } from "./aiAssistantUserFacingCopyPolicy";

export type AiAssistantDeterministicAnswerRequest = {
  role: AssistantRole;
  context: AssistantContext;
  message: string;
};

export type AiAssistantDeterministicAnswer = {
  topic: AiAssistantKnowledgeTopic;
  answer: string;
  providerCallAllowed: false;
};

function normalizeQuestion(value: string): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[ё]/g, "е")
    .replace(/\s+/g, " ");
}

function includesAny(value: string, tokens: readonly string[]): boolean {
  return tokens.some((token) => value.includes(token));
}

function resolveTopic(question: string, context: AssistantContext): AiAssistantKnowledgeTopic | null {
  if (
    includesAny(question, ["основные модули", "модули приложения", "разделы приложения", "что делают модули"])
  ) {
    return "module_overview";
  }

  if (
    includesAny(question, ["снабжен", "закуп", "входящие позиции", "поставщик", "поставщиков"])
    || context === "buyer"
    || context === "request"
  ) {
    if (
      includesAny(question, ["как лучше разбирать", "что смотреть первым", "входящие", "позиции", "заявк"])
    ) {
      return "procurement_workflow";
    }
  }

  if (includesAny(question, ["что делать в снабжении", "снабжение", "закупки"])) {
    return "procurement_workflow";
  }

  if (includesAny(question, ["склад", "остатк", "приход", "выдач", "дефицит"])) {
    return "warehouse";
  }

  if (includesAny(question, ["бухгалтер", "финанс", "платеж", "оплат", "задолж"])) {
    return "finance";
  }

  if (includesAny(question, ["директор", "директорский", "dashboard", "дашборд"])) {
    return "director";
  }

  if (includesAny(question, ["approval inbox", "очередь соглас", "согласован", "approval"])) {
    return "approval_inbox";
  }

  if (
    includesAny(question, ["что можно делать ai", "что нельзя", "можешь делать", "границы ai", "опасные действия"])
  ) {
    return "ai_boundaries";
  }

  return null;
}

export function getAiAssistantDeterministicAnswer(
  request: AiAssistantDeterministicAnswerRequest,
): AiAssistantDeterministicAnswer | null {
  const question = normalizeQuestion(request.message);
  if (!question) return null;

  const topic = resolveTopic(question, request.context);
  if (!topic) return null;

  const primer = topic === "module_overview" ? null : getAiAssistantContextPrimer(request.context);
  const lines = getAiAssistantKnowledgeLines(topic);
  return {
    topic,
    answer: sanitizeAssistantUserFacingCopy([primer, ...lines].filter(Boolean).join("\n")),
    providerCallAllowed: false,
  };
}
