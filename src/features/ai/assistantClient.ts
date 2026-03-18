import Constants from "expo-constants";

import {
  buildAssistantSystemPrompt,
  buildOfflineAssistantReply,
} from "./assistantPrompts";
import type { AssistantContext, AssistantMessage, AssistantRole } from "./assistant.types";

type ExpoExtraConfig = {
  geminiApiKey?: string;
  geminiModel?: string;
};

const DEFAULT_MODEL = "gemini-2.5-flash";

function getAssistantConfig(): { apiKey: string; model: string } {
  const extra = (Constants.expoConfig?.extra || {}) as ExpoExtraConfig;
  const apiKey = String(extra.geminiApiKey || process.env.EXPO_PUBLIC_GEMINI_API_KEY || "").trim();
  const model = String(extra.geminiModel || process.env.EXPO_PUBLIC_GEMINI_MODEL || DEFAULT_MODEL).trim();
  return { apiKey, model: model || DEFAULT_MODEL };
}

function messageToContent(message: AssistantMessage) {
  return {
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  };
}

function extractGeminiText(payload: any): string {
  const candidates = Array.isArray(payload?.candidates) ? payload.candidates : [];
  const parts = Array.isArray(candidates[0]?.content?.parts) ? candidates[0].content.parts : [];
  const text = parts
    .map((part: any) => (typeof part?.text === "string" ? part.text : ""))
    .filter(Boolean)
    .join("\n")
    .trim();
  return text;
}

export function isAssistantConfigured(): boolean {
  return getAssistantConfig().apiKey.length > 0;
}

export async function sendAssistantMessage(options: {
  role: AssistantRole;
  context?: AssistantContext;
  message: string;
  history: AssistantMessage[];
}): Promise<string> {
  const { role, context = "unknown", message, history } = options;
  const { apiKey, model } = getAssistantConfig();

  if (!apiKey) {
    return buildOfflineAssistantReply(role, message, context);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: buildAssistantSystemPrompt(role, context) }],
          },
          contents: [...history.slice(-10).map(messageToContent), { role: "user", parts: [{ text: message }] }],
          generationConfig: {
            temperature: 0.5,
            topP: 0.9,
            maxOutputTokens: 700,
          },
        }),
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      return buildOfflineAssistantReply(role, message, context);
    }

    const payload = await response.json();
    return extractGeminiText(payload) || buildOfflineAssistantReply(role, message, context);
  } catch {
    return buildOfflineAssistantReply(role, message, context);
  } finally {
    clearTimeout(timeout);
  }
}
