import type { AssistantContext, AssistantRole } from "../assistant.types";
import type { AiRoleScreenAssistantPack } from "../realAssistants/aiRoleScreenAssistantTypes";
import { answerAiRoleScreenQuestion } from "../realAssistants/aiRoleScreenQuestionAnswerEngine";
import type { AiScreenNativeAssistantPack } from "../screenNative/aiScreenNativeAssistantTypes";
import { answerAiScreenNativeQuestion } from "../screenNative/aiScreenNativeQuestionAnswerEngine";
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
  scopedFactsSummary?: string | null;
  screenNativeAssistantPack?: AiScreenNativeAssistantPack | null;
  roleScreenAssistantPack?: AiRoleScreenAssistantPack | null;
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

type ReadyBuyOptionLine = {
  supplierName: string;
  coverage: string;
  risks: string;
  action: string;
};

function parseReadyBuyOptionLines(summary: string): ReadyBuyOptionLine[] {
  return summary
    .split(/\n+/)
    .map((line) => {
      const match = line.match(/^-\s+(.+?):\s+покрытие\s+([^;]+);\s+риски:\s+([^;]+);\s+действие:\s+(.+)$/i);
      if (!match) return null;
      return {
        supplierName: match[1].trim(),
        coverage: match[2].trim(),
        risks: match[3].trim(),
        action: match[4].trim(),
      };
    })
    .filter((item): item is ReadyBuyOptionLine => item !== null);
}

function getReadyBuyOptionsAnswer(summary: string): string | null {
  if (!summary.includes("Готовые варианты закупки по заявке")) return null;
  if (summary.includes("Готовые варианты закупки по заявке") && summary.includes(": 0.")) {
    return sanitizeAssistantUserFacingCopy(
      "По этой заявке сначала проверь недостающие данные: внутренних готовых поставщиков не найдено. Следующий безопасный шаг — подготовить запрос на рынок или собрать evidence по поставщикам. Заказ, выбор поставщика, оплата и складское движение напрямую не выполняются.",
    );
  }

  const options = parseReadyBuyOptionLines(summary);
  if (options.length === 0) return null;

  const [first, second] = options;
  const compareLine = second
    ? `затем сравни ${first.supplierName} и ${second.supplierName}. ${first.supplierName}: ${first.coverage}, риски: ${first.risks}. ${second.supplierName}: ${second.coverage}, риски: ${second.risks}.`
    : `затем проверь ${first.supplierName}. ${first.supplierName}: ${first.coverage}, риски: ${first.risks}, действие: ${first.action}.`;

  return sanitizeAssistantUserFacingCopy(
    `Сначала проверь срочные позиции и статус заявки, ${compareLine} Заказ или выбор поставщика напрямую не выполняется — сначала подготовь запрос или отправь выбор на согласование.`,
  );
}

export function getAiAssistantDeterministicAnswer(
  request: AiAssistantDeterministicAnswerRequest,
): AiAssistantDeterministicAnswer | null {
  const question = normalizeQuestion(request.message);
  if (!question) return null;

  const screenNativeAnswer = answerAiScreenNativeQuestion({
    pack: request.screenNativeAssistantPack,
    question: request.message,
  });
  if (screenNativeAnswer) {
    return screenNativeAnswer;
  }

  const roleScreenAnswer = answerAiRoleScreenQuestion({
    pack: request.roleScreenAssistantPack,
    question: request.message,
  });
  if (roleScreenAnswer) {
    return roleScreenAnswer;
  }

  const topic = resolveTopic(question, request.context);
  if (!topic) return null;

  if (topic === "procurement_workflow" && request.scopedFactsSummary) {
    const readyBuyAnswer = getReadyBuyOptionsAnswer(request.scopedFactsSummary);
    if (readyBuyAnswer) {
      return {
        topic,
        answer: readyBuyAnswer,
        providerCallAllowed: false,
      };
    }
  }

  const primer = topic === "module_overview" ? null : getAiAssistantContextPrimer(request.context);
  const lines = getAiAssistantKnowledgeLines(topic);
  return {
    topic,
    answer: sanitizeAssistantUserFacingCopy([primer, ...lines].filter(Boolean).join("\n")),
    providerCallAllowed: false,
  };
}
