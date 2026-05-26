import { answerAlwaysOnExternalKnowledgeQuestion } from "../../lib/ai/alwaysOnExternalKnowledge";
import { answerBuiltInAi } from "../../lib/ai/builtInAi";
import {
  buildAiEstimatePdfActions,
  buildAiEstimatePdfSourceFromConstructionEstimate,
  buildAiEstimatePdfSourceFromGlobalEstimate,
} from "../../lib/ai/estimatePdf";
import { buildEstimatePresentationViewModel } from "../../lib/ai/estimatePresentation";
import { resolveAiLiveScreenId } from "../../lib/ai/liveScreenCopilot";
import { createAssistantScreenMessage as createMessage } from "./AIAssistantScreen.helpers";
import type { AssistantContext, AssistantMessage, AssistantRole } from "./assistant.types";
import { sanitizeAssistantUserFacingCopy } from "./assistantUx/aiAssistantUserFacingCopyPolicy";

type AssistantAnswerInput = {
  text: string;
  assistantContext: AssistantContext;
  assistantPresentationRole: AssistantRole;
  routeContext?: string;
  userId: string | null;
};

export function createBuiltInAiAssistantMessage(input: AssistantAnswerInput): AssistantMessage | null {
  const builtInAi = answerBuiltInAi({
    text: input.text,
    screenContext: input.assistantContext,
    route: input.routeContext || "/ai",
    role: input.assistantPresentationRole,
    userId: input.userId,
    countryCode: "KG",
    cityOrRegion: "Bishkek",
  });
  if (!builtInAi.handled) return null;

  const estimate = builtInAi.toolResult.estimate;
  const estimatePdfSource = estimate
    ? buildAiEstimatePdfSourceFromGlobalEstimate(estimate, {
        userId: input.userId ?? undefined,
      })
    : undefined;
  const estimatePresentation = estimate ? buildEstimatePresentationViewModel(estimate) : undefined;
  return createMessage(
    "assistant",
    sanitizeAssistantUserFacingCopy(builtInAi.answerTextRu),
    estimatePdfSource
      ? {
          estimatePdfSource,
          estimatePresentation,
          actions: buildAiEstimatePdfActions(estimatePdfSource),
        }
      : {},
  );
}

export function createExternalKnowledgeAssistantMessage(input: AssistantAnswerInput): AssistantMessage | null {
  const result = answerAlwaysOnExternalKnowledgeQuestion({
    questionRu: input.text,
    screenId: resolveAiLiveScreenId(input.assistantContext),
    role: input.assistantPresentationRole,
    context: input.assistantContext,
    countryCode: "KG",
    cityOrRegion: "Bishkek",
    currency: "KGS",
  });
  if (!result.handled || !result.answerTextRu) return null;

  const estimatePdfSource = result.estimate
    ? buildAiEstimatePdfSourceFromConstructionEstimate(result.estimate, {
        userId: input.userId ?? undefined,
      })
    : undefined;
  return createMessage(
    "assistant",
    sanitizeAssistantUserFacingCopy(result.answerTextRu),
    estimatePdfSource
      ? {
          estimatePdfSource,
          actions: buildAiEstimatePdfActions(estimatePdfSource),
        }
      : {},
  );
}
