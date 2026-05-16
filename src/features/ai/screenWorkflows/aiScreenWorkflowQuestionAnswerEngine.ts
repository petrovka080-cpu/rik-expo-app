import type { AiAssistantKnowledgeTopic } from "../assistantUx/aiAssistantModuleKnowledge";
import { sanitizeAiScreenWorkflowUserCopy } from "./aiScreenWorkflowUserCopy";
import type { AiScreenWorkflowPack } from "./aiScreenWorkflowTypes";

export type AiScreenWorkflowQuestionAnswer = {
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
  if (domain === "procurement" || domain === "market") return "procurement_workflow";
  if (domain === "warehouse") return "warehouse";
  if (domain === "control" || domain === "approval") return "director";
  return "ai_boundaries";
}

export function answerAiScreenWorkflowQuestion(params: {
  pack: AiScreenWorkflowPack | null | undefined;
  question: string;
}): AiScreenWorkflowQuestionAnswer | null {
  const pack = params.pack;
  if (!pack) return null;
  const question = normalize(params.question);
  if (!question) return null;

  const critical = pack.criticalItems[0];
  const option = pack.readyOptions.find((item) => item.actionKind !== "forbidden") ?? pack.readyOptions[0];
  const missing = pack.missingData[0];
  const approvalActions = pack.actions.filter((action) => action.actionKind === "approval_required");
  const forbiddenActions = pack.actions.filter((action) => action.actionKind === "forbidden");
  const asksAction = /action|button|approval|approve|risk|missing|document|supplier|payment|stock|warehouse|report|summary|critical|first|what|why|which|where|who|how|can|is|draft|prepare|make|queue|urgent|director|amount|norm|artifact|runner|targetability|driver|как|что|почему|риск|документ|оплат|склад|заявк|соглас/i.test(question);
  if (!asksAction) return null;

  const answer = sanitizeAiScreenWorkflowUserCopy([
    `${pack.title}: ${pack.summary}`,
    critical ? `Critical: ${critical.title}. ${critical.reason}.` : null,
    option ? `Ready option: ${option.title}. ${option.description}.` : null,
    missing ? `Missing data: ${missing.label}.` : "Missing data is not invented; absent facts stay marked as missing.",
    approvalActions.length ? `Approval route: ${approvalActions[0]?.label} goes through ${approvalActions[0]?.approvalRoute}.` : null,
    forbiddenActions.length ? `Forbidden direct action: ${forbiddenActions[0]?.label}. Reason: ${forbiddenActions[0]?.forbiddenReason}.` : null,
    `Next buttons: ${pack.actions.slice(0, 4).map((action) => `${action.label} (${action.actionKind})`).join(", ")}.`,
  ].filter(Boolean).join(" "));

  return {
    topic: topicForDomain(pack.domain),
    answer,
    providerCallAllowed: false,
    answeredFromScreenContext: true,
  };
}
