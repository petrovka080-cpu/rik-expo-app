import {
  buildAssistantSystemPrompt,
  buildOfflineAssistantReply,
} from "./assistantPrompts";
import type { AssistantContext, AssistantMessage, AssistantRole } from "./assistant.types";
import {
  invokeGeminiGateway,
  isGeminiGatewayConfigured,
} from "../../lib/ai/geminiGateway";

const DEFAULT_MODEL = "gemini-2.5-flash";

function getAssistantModel(): string {
  const model = String(process.env.EXPO_PUBLIC_GEMINI_MODEL || DEFAULT_MODEL).trim();
  return model || DEFAULT_MODEL;
}

function messageToContent(message: AssistantMessage): {
  role: "user" | "model";
  parts: { text: string }[];
} {
  return {
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  };
}

export function isAssistantConfigured(): boolean {
  return isGeminiGatewayConfigured();
}

export async function sendAssistantMessage(options: {
  role: AssistantRole;
  context?: AssistantContext;
  message: string;
  history: AssistantMessage[];
}): Promise<string> {
  const { role, context = "unknown", message, history } = options;
  const model = getAssistantModel();

  if (!isGeminiGatewayConfigured()) {
    return buildOfflineAssistantReply(role, message, context);
  }

  try {
    const text = await invokeGeminiGateway({
      model,
      systemInstruction: buildAssistantSystemPrompt(role, context),
      contents: [
        ...history.slice(-10).map(messageToContent),
        { role: "user", parts: [{ text: message }] },
      ],
      generationConfig: {
        temperature: 0.5,
        topP: 0.9,
        maxOutputTokens: 700,
      },
    });
    return text || buildOfflineAssistantReply(role, message, context);
  } catch {
    return buildOfflineAssistantReply(role, message, context);
  }
}
