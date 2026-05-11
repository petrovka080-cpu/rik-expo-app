import {
  buildAssistantSystemPrompt,
  buildOfflineAssistantReply,
} from "./assistantPrompts";
import type { AssistantContext, AssistantMessage, AssistantRole } from "./assistant.types";
import { loadAiConfig, saveAiReport } from "../../lib/ai_reports";
import { recordPlatformObservability } from "../../lib/observability/platformObservability";
import {
  AiModelGateway,
  isAiModelGatewayAvailable,
  resolveLegacyRuntimeAiModelProviderId,
  type AiModelMessage,
} from "./model";

const DEFAULT_MODEL = "gemini-2.5-flash";
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

function getAssistantModel(): string {
  const model = String(process.env.EXPO_PUBLIC_GEMINI_MODEL || DEFAULT_MODEL).trim();
  return model || DEFAULT_MODEL;
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
  return isAiModelGatewayAvailable({
    providerId: resolveLegacyRuntimeAiModelProviderId(process.env),
    legacyGeminiModel: getAssistantModel(),
  });
}

export async function sendAssistantMessage(options: {
  role: AssistantRole;
  context?: AssistantContext;
  message: string;
  history: AssistantMessage[];
  scopedFactsSummary?: string | null;
  scopeKey?: string | null;
  sourceKinds?: string[] | null;
  userId?: string | null;
}): Promise<string> {
  const {
    role,
    context = "unknown",
    message,
    history,
    scopedFactsSummary,
    scopeKey,
    sourceKinds,
    userId,
  } = options;
  const model = getAssistantModel();

  if (!isAssistantConfigured()) {
    return buildOfflineAssistantReply(role, message, context);
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

    const gateway = new AiModelGateway({
      providerId: resolveLegacyRuntimeAiModelProviderId(process.env),
      legacyGeminiModel: model,
    });
    const response = await gateway.generate({
      taskType: "chat",
      messages: [
        { role: "system", content: systemInstruction },
        ...history.slice(-10).map(messageToAiModelMessage),
        { role: "user", content: message },
      ],
      maxOutputTokens: 700,
      temperature: 0.5,
      topP: 0.9,
      timeoutMs: 30000,
      redactionRequired: true,
      traceLabel: "assistant_chat",
    });
    if (response.safety.blocked) {
      throw new Error(response.safety.reason || "AI model provider blocked request.");
    }
    const text = response.text;
    const answer = text || buildOfflineAssistantReply(role, message, context);
    void saveAiReport({
      id: `assistant:${role}:${context}:${Date.now()}`,
      userId: userId || null,
      role,
      context,
      title: `assistant_chat:${role}:${context}`,
      content: answer,
      metadata: {
        model: response.model,
        provider: response.provider,
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
    return buildOfflineAssistantReply(role, message, context);
  }
}
