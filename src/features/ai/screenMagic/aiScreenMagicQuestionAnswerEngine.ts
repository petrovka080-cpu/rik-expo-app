import type { AiAssistantKnowledgeTopic } from "../assistantUx/aiAssistantModuleKnowledge";
import { sanitizeAiScreenMagicUserCopy } from "./aiScreenMagicUserCopy";
import type { AiScreenMagicPack } from "./aiScreenMagicTypes";

export type AiScreenMagicQuestionAnswer = {
  topic: AiAssistantKnowledgeTopic;
  answer: string;
  providerCallAllowed: false;
  answeredFromScreenContext: true;
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

  const asksScreenWork =
    /что|почему|какие|какой|где|кто|как|critical|risk|missing|document|supplier|payment|stock|warehouse|approval|draft|report|summary|first|route|blocker|evidence/i.test(question);
  if (!asksScreenWork) return null;

  const critical = pack.aiPreparedWork.find((item) => item.riskLevel === "critical" || item.riskLevel === "high")
    ?? pack.aiPreparedWork[0];
  const missing = [...new Set(pack.aiPreparedWork.flatMap((item) => item.missingData))].slice(0, 3);
  const approval = pack.buttons.find((button) => button.actionKind === "approval_required");
  const draft = pack.buttons.find((button) => button.actionKind === "draft_only");
  const safeRead = pack.buttons.find((button) => button.actionKind === "safe_read");

  const answer = sanitizeAiScreenMagicUserCopy([
    `${pack.screenSummary}: ${pack.userGoal}`,
    critical ? `Критический фокус: ${critical.title}. ${critical.description}` : null,
    missing.length > 0
      ? `Недостающие данные: ${missing.join("; ")}.`
      : "Недостающие данные не выдумываются; если evidence отсутствует, действие останется в blocker/missing state.",
    safeRead ? `Safe read: ${safeRead.label}.` : null,
    draft ? `Черновик: ${draft.label}; финальная отправка не выполняется.` : null,
    approval ? `Approval: ${approval.label} идёт через ${approval.approvalRoute ?? "approval ledger"}.` : null,
  ].filter(Boolean).join(" "));

  return {
    topic: topicForDomain(pack.domain),
    answer,
    providerCallAllowed: false,
    answeredFromScreenContext: true,
  };
}
