import { answerAlwaysOnExternalKnowledgeQuestion } from "../../lib/ai/alwaysOnExternalKnowledge";
import { createAiEstimatePlugin } from "../../lib/aiPlatform/plugins/estimate/AiEstimatePlugin";
import { resolveAiLiveScreenId } from "../../lib/ai/liveScreenCopilot";
import { classifyCanonicalEstimateIntent } from "../../lib/estimate/backendPlatform/canonicalEstimateIntent";
import { adaptCanonicalCompilationToAssistantProjection } from "../../lib/estimate/backendPlatform/canonicalEstimateForemanAdapter";
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

function platformRole(role: AssistantRole) {
  if (role === "foreman" || role === "director" || role === "buyer") return role;
  return "consumer" as const;
}

export async function createBuiltInAiAssistantMessage(input: AssistantAnswerInput): Promise<AssistantMessage | null> {
  const intent = classifyCanonicalEstimateIntent(input.text);
  if (!intent) return null;
  const result = await createAiEstimatePlugin().run({
    runInput: {
      flowId: `assistant-estimate-${Date.now()}`,
      userId: input.userId ?? undefined,
      role: platformRole(input.assistantPresentationRole),
      surface: "estimate",
      intent,
      userText: input.text,
      mode: "draft_only",
      sourceSha: "canonical-estimate-backend-r2",
      runtimeVersion: "ai-platform-kernel-v1",
    },
  });
  const projection = adaptCanonicalCompilationToAssistantProjection(result.draft, input.userId ?? undefined);
  return createMessage(
    "assistant",
    sanitizeAssistantUserFacingCopy(result.userVisibleAnswerRu ?? "Backend сметы не вернул результат."),
    projection ? {
      estimatePdfSource: projection.estimatePdfSource,
      estimatePresentation: projection.presentation,
      actions: projection.actions,
      canonicalEstimateRevisionId: projection.revisionId,
      canonicalEstimateReleaseId: projection.releaseId,
    } : {},
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
  return createMessage("assistant", sanitizeAssistantUserFacingCopy(result.answerTextRu));
}
