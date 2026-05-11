import {
  invokeGeminiGateway,
  isGeminiGatewayConfigured,
  type GeminiGatewayContent,
} from "../../../lib/ai/geminiGateway";
import type { AiModelClient } from "./AiModelClient";
import type { AiModelMessage, AiModelRequest, AiModelResponse } from "./AiModelTypes";

const DEFAULT_LEGACY_GEMINI_MODEL = "gemini-2.5-flash";

const toGeminiContent = (message: AiModelMessage): GeminiGatewayContent | null => {
  if (message.role === "system") return null;
  return {
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  };
};

const buildSystemInstruction = (messages: readonly AiModelMessage[]): string =>
  messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .filter(Boolean)
    .join("\n\n");

export class LegacyGeminiModelProvider implements AiModelClient {
  readonly providerId = "legacy_gemini" as const;

  private readonly modelName: string;

  constructor(options?: { model?: string | null }) {
    const configuredModel = String(options?.model ?? process.env.EXPO_PUBLIC_GEMINI_MODEL ?? "").trim();
    this.modelName = configuredModel || DEFAULT_LEGACY_GEMINI_MODEL;
  }

  isConfigured(): boolean {
    return isGeminiGatewayConfigured();
  }

  async generate(request: AiModelRequest): Promise<AiModelResponse> {
    const text = await invokeGeminiGateway({
      model: this.modelName,
      systemInstruction: buildSystemInstruction(request.messages),
      contents: request.messages
        .map(toGeminiContent)
        .filter((content): content is GeminiGatewayContent => content != null),
      generationConfig: {
        temperature: request.temperature,
        topP: request.topP,
        maxOutputTokens: request.maxOutputTokens,
        ...(request.responseFormat === "json" ? { responseMimeType: "application/json" } : {}),
      },
    });

    return {
      provider: "legacy_gemini",
      model: this.modelName,
      text,
      safety: {
        redacted: true,
        blocked: false,
      },
    };
  }
}
