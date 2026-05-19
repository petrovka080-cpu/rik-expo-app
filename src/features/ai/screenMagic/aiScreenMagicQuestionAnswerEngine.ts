import type { AiAssistantKnowledgeTopic } from "../assistantUx/aiAssistantModuleKnowledge";
import { buildAiScreenMagicButtonResultCopy } from "./aiScreenMagicButtonResolver";
import { sanitizeAiScreenMagicUserCopy } from "./aiScreenMagicUserCopy";
import type { AiScreenMagicPack } from "./aiScreenMagicTypes";

export type AiScreenMagicQuestionAnswer = {
  topic: AiAssistantKnowledgeTopic;
  answer: string;
  providerCallAllowed: false;
  answeredFromScreenContext: true;
  usedSignals: {
    screenId: string;
    roleScope: string[];
    visibleDomainData: string[];
    preparedWork: string[];
    risks: string[];
    missingData: string[];
    safeActions: string[];
    approvalCandidates: string[];
    exactBlockers: string[];
  };
};

function normalize(value: string): string {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function topicForDomain(domain: string): AiAssistantKnowledgeTopic {
  if (domain === "finance") return "finance";
  if (domain === "procurement" || domain === "marketplace") return "procurement_workflow";
  if (domain === "warehouse") return "warehouse";
  if (domain === "control") return "director";
  if (domain === "documents") return "screen_context";
  return "ai_boundaries";
}

export function answerAiScreenMagicQuestion(params: {
  pack: AiScreenMagicPack | null | undefined;
  question: string;
}): AiScreenMagicQuestionAnswer | null {
  const pack = params.pack;
  const question = normalize(params.question);
  if (!pack || !question) return null;

  const buttonResult = buildAiScreenMagicButtonResultCopy({
    pack,
    buttonIdOrLabel: params.question,
  });
  if (buttonResult) {
    return {
      topic: topicForDomain(pack.domain),
      answer: buttonResult.answer,
      providerCallAllowed: false,
      answeredFromScreenContext: true,
      usedSignals: buildUsedSignals(pack),
    };
  }

  const asksScreenWork =
    /что|почему|какие|какой|где|кто|как|критич|риск|не хватает|недоста|документ|поставщик|платеж|оплат|склад|остат|согласован|черновик|отчет|сводк|перв|маршрут|блокер|доказ|critical|risk|missing|document|supplier|payment|stock|warehouse|approval|draft|report|summary|first|route|blocker|evidence/i.test(question);
  if (!asksScreenWork) return null;

  const critical = pack.aiPreparedWork.find((item) => item.riskLevel === "critical" || item.riskLevel === "high")
    ?? pack.aiPreparedWork[0];
  const missing = [...new Set(pack.aiPreparedWork.flatMap((item) => item.missingData))].slice(0, 3);
  const approval = pack.buttons.find((button) => button.actionKind === "approval_required");
  const draft = pack.buttons.find((button) => button.actionKind === "draft_only");
  const safeRead = pack.buttons.find((button) => button.actionKind === "safe_read");

  const answer = sanitizeAiScreenMagicUserCopy([
    pack.screenSummary,
    `${pack.userHeader}: ${pack.userGoal}`,
    pack.visibleDomainData.length > 0
      ? `Данные экрана: ${pack.visibleDomainData.slice(0, 5).join("; ")}.`
      : null,
    critical ? `Критический фокус: ${critical.title}. ${critical.description}` : null,
    pack.riskSummary.length > 0
      ? `Риски: ${pack.riskSummary.slice(0, 4).join("; ")}.`
      : null,
    missing.length > 0
      ? `Недостающие данные: ${missing.join("; ")}.`
      : "Недостающие данные не выдумываются; если основание отсутствует, действие останется в состоянии понятной блокировки.",
    safeRead ? `Можно показать: ${safeRead.label}.` : null,
    pack.safeActions.length > 0 ? `Безопасно открыть: ${pack.safeActions.slice(0, 3).join("; ")}.` : null,
    draft ? `Черновик: ${draft.label}; финальная отправка не выполняется.` : null,
    approval ? `Согласование: ${approval.label} идёт через ${approval.approvalRoute ?? "журнал согласования"}.` : null,
    pack.exactBlockers.length > 0 ? `Блокер: ${pack.exactBlockers[0]}.` : null,
  ].filter(Boolean).join(" "));

  return {
    topic: topicForDomain(pack.domain),
    answer,
    providerCallAllowed: false,
    answeredFromScreenContext: true,
    usedSignals: buildUsedSignals(pack),
  };
}

function buildUsedSignals(pack: AiScreenMagicPack): AiScreenMagicQuestionAnswer["usedSignals"] {
  return {
    screenId: pack.screenId,
    roleScope: [...pack.roleScope],
    visibleDomainData: [...pack.visibleDomainData],
    preparedWork: pack.aiPreparedWork.map((item) => item.title),
    risks: [...pack.riskSummary],
    missingData: [
      ...new Set([
        ...pack.missingDataSummary,
        ...pack.aiPreparedWork.flatMap((item) => item.missingData),
      ]),
    ],
    safeActions: [...pack.safeActions],
    approvalCandidates: [...pack.approvalCandidates],
    exactBlockers: [...pack.exactBlockers],
  };
}
