import {
  buildAssistantSystemPrompt,
  buildOfflineAssistantReply,
} from "./assistantPrompts";
import type { AssistantContext, AssistantMessage, AssistantRole } from "./assistant.types";
import { getAiAssistantDeterministicAnswer } from "./assistantUx/aiAssistantDeterministicAnswers";
import { sanitizeAssistantUserFacingCopy } from "./assistantUx/aiAssistantUserFacingCopyPolicy";
import type { AiRoleScreenAssistantPack } from "./realAssistants/aiRoleScreenAssistantTypes";
import type { AiScreenMagicPack } from "./screenMagic/aiScreenMagicTypes";
import type { AiScreenNativeAssistantPack } from "./screenNative/aiScreenNativeAssistantTypes";
import { answerAlwaysOnExternalKnowledgeQuestion } from "../../lib/ai/alwaysOnExternalKnowledge";
import { answerBuiltInAi } from "../../lib/ai/builtInAi";
import { loadAiConfig, saveAiReport } from "../../lib/ai_reports";
import {
  isServerAiModelProviderAvailable,
  ServerAiModelProvider,
} from "../../lib/aiPlatform/providers/ServerAiModelProvider";
import { recordPlatformObservability } from "../../lib/observability/platformObservability";
import type { AiModelMessage } from "./model";

const assistantConfigCache = new Map<string, string | null>();

const recordAssistantClientFallback = (
  event: string,
  error: unknown,
  extra?: Record<string, unknown>,
) =>
  recordPlatformObservability({
    screen: "ai",
    surface: "assistant_client",
    category: "ui",
    event,
    result: "error",
    fallbackUsed: true,
    errorClass: error instanceof Error ? error.name : undefined,
    errorMessage: error instanceof Error ? error.message : String(error ?? "assistant_client_failed"),
    extra: {
      module: "ai.assistantClient",
      route: "/ai",
      role: "ai",
      owner: "assistant_client",
      severity: "error",
      ...extra,
    },
  });

function getAssistantModel(): string | null {
  const model = String(process.env.EXPO_PUBLIC_GEMINI_MODEL || "").trim();
  return model || null;
}

async function loadAssistantPromptConfig(role: AssistantRole, context: AssistantContext): Promise<string | null> {
  const configIds = [
    `assistant_${role}_${context}_v1`,
    `assistant_${role}_v1`,
    "assistant_system_prompt_v1",
    "procurement_system_prompt",
  ];

  for (const configId of configIds) {
    if (assistantConfigCache.has(configId)) {
      const cached = assistantConfigCache.get(configId) ?? null;
      if (cached) return cached;
      continue;
    }

    const loaded = await loadAiConfig(configId).catch((error) => {
      recordAssistantClientFallback("load_prompt_config_failed", error, {
        action: "loadAiConfig",
        configId,
      });
      return null;
    });
    assistantConfigCache.set(configId, loaded);
    if (loaded) return loaded;
  }

  return null;
}

function messageToAiModelMessage(message: AssistantMessage): AiModelMessage {
  return {
    role: message.role,
    content: message.content,
  };
}

export function isAssistantConfigured(): boolean {
  return isServerAiModelProviderAvailable({
    legacyGeminiModel: getAssistantModel(),
  });
}

export async function sendAssistantMessage(options: {
  role: AssistantRole;
  context?: AssistantContext;
  message: string;
  history: AssistantMessage[];
  scopedFactsSummary?: string | null;
  screenMagicPack?: AiScreenMagicPack | null;
  screenNativeAssistantPack?: AiScreenNativeAssistantPack | null;
  roleScreenAssistantPack?: AiRoleScreenAssistantPack | null;
  scopeKey?: string | null;
  sourceKinds?: string[] | null;
  userId?: string | null;
  providerApproved?: boolean;
}): Promise<string> {
  const {
    role,
    context = "unknown",
    message,
    history,
    scopedFactsSummary,
    screenMagicPack,
    screenNativeAssistantPack,
    roleScreenAssistantPack,
    scopeKey,
    sourceKinds,
    userId,
  } = options;
  const model = getAssistantModel();
  const builtInAi = answerBuiltInAi({
    text: message,
    screenContext: context,
    route: context === "request" ? "/request" : "/ai",
    role,
    userId,
    countryCode: "KG",
    cityOrRegion: "Bishkek",
  });
  if (builtInAi.handled) {
    return sanitizeAssistantUserFacingCopy(builtInAi.answerTextRu);
  }

  const answerFirst = answerAlwaysOnExternalKnowledgeQuestion({
    questionRu: message,
    screenId: context,
    role,
    context,
    countryCode: "KG",
    cityOrRegion: "Bishkek",
    currency: "KGS",
  });
  if (answerFirst.handled && answerFirst.answerTextRu) {
    return sanitizeAssistantUserFacingCopy(answerFirst.answerTextRu);
  }

  const deterministicAnswer = getAiAssistantDeterministicAnswer({
    role,
    context,
    message,
    scopedFactsSummary,
    screenMagicPack,
    screenNativeAssistantPack,
    roleScreenAssistantPack,
  });

  if (deterministicAnswer) {
    return deterministicAnswer.answer;
  }

  const providerApproved = options.providerApproved === true
    || process.env.EXPO_PUBLIC_AI_ASSISTANT_PROVIDER_APPROVED === "1";

  if (!providerApproved || !isAssistantConfigured()) {
    return sanitizeAssistantUserFacingCopy(buildOfflineAssistantReply(role, message, context));
  }

  try {
    const configPrompt = await loadAssistantPromptConfig(role, context);
    const systemInstruction = [
      buildAssistantSystemPrompt(role, context),
      configPrompt ? `Дополнительная конфигурация роли:\n${configPrompt}` : null,
      scopedFactsSummary
        ? [
          "Ниже backend/read-only факты текущего среза. Используй только их для цифр и выводов.",
          `Scope key: ${String(scopeKey || "assistant_scope")}`,
          `Source kinds: ${(sourceKinds || []).filter(Boolean).join(", ") || "unknown"}`,
          scopedFactsSummary,
        ].join("\n")
        : null,
    ].filter(Boolean).join("\n\n");

    const provider = new ServerAiModelProvider({
      legacyGeminiModel: model,
    });
    const response = await provider.complete({
      modelKey: model ?? "server-default",
      messages: [
        { role: "system", content: systemInstruction },
        ...history.slice(-10).map(messageToAiModelMessage),
        { role: "user", content: message },
      ],
      responseContract: {
        contractId: "assistant_chat",
        version: "ai-platform-kernel-v1",
        responseFormat: "text",
      },
      budget: {
        maxInputChars: 12000,
        maxOutputTokens: 700,
        timeoutMs: 30000,
      },
      redaction: {
        policyId: "assistant-client-redaction",
        version: "v1",
        redactionRequired: true,
      },
      sourceSha: "runtime",
    });
    if (response.safety.blocked) {
      throw new Error(response.safety.reason || "AI model provider blocked request.");
    }
    const text = response.text;
    const answer = sanitizeAssistantUserFacingCopy(text || buildOfflineAssistantReply(role, message, context));
    void saveAiReport({
      id: `assistant:${role}:${context}:${Date.now()}`,
      userId: userId || null,
      role,
      context,
      title: `assistant_chat:${role}:${context}`,
      content: answer,
      metadata: {
        model: response.modelKey,
        provider: response.providerKey,
        scopeKey: scopeKey || null,
        contextPresent: Boolean(scopedFactsSummary),
        sourceKinds: Array.isArray(sourceKinds) ? sourceKinds : [],
      },
    });
    return answer;
  } catch (error) {
    recordAssistantClientFallback("send_assistant_message_failed", error, {
      action: "sendAssistantMessage",
      assistantRole: role,
      assistantContext: context,
      scopeKey: scopeKey || null,
      model,
    });
    return sanitizeAssistantUserFacingCopy(buildOfflineAssistantReply(role, message, context));
  }
}
