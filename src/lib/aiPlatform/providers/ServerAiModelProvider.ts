import {
  AiModelGateway,
  isAiModelGatewayAvailable,
  type AiModelProviderId,
} from "../../../features/ai/model";
import type { AiModelCompleteInput, AiModelCompleteResult, AiModelProviderPort } from "./AiModelProviderPort";

export type ServerAiModelProviderOptions = {
  gateway?: AiModelGateway;
  providerId?: AiModelProviderId;
  legacyGeminiModel?: string | null;
};

export class ServerAiModelProvider implements AiModelProviderPort {
  readonly providerKey = "server_model_gateway";

  private readonly gateway: AiModelGateway;

  constructor(options: ServerAiModelProviderOptions = {}) {
    this.gateway = options.gateway ?? new AiModelGateway({
      providerId: options.providerId,
      legacyGeminiModel: options.legacyGeminiModel,
    });
  }

  async complete(input: AiModelCompleteInput): Promise<AiModelCompleteResult> {
    const response = await this.gateway.generate({
      taskType: "chat",
      messages: input.messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
      maxOutputTokens: input.budget.maxOutputTokens,
      temperature: 0.2,
      timeoutMs: input.budget.timeoutMs,
      redactionRequired: true,
      responseFormat: input.responseContract?.responseFormat,
      traceLabel: `ai_platform:${input.responseContract?.contractId ?? "run"}`,
    });
    return {
      providerKey: response.provider,
      modelKey: response.model || input.modelKey,
      text: response.text,
      structured: response.structured,
      usage: {
        inputChars: input.messages.reduce((total, message) => total + message.content.length, 0),
        outputTokens: response.usage?.outputTokens,
      },
      safety: {
        redacted: true,
        blocked: response.safety.blocked,
        reason: response.safety.reason,
      },
    };
  }
}

export function isServerAiModelProviderAvailable(options: ServerAiModelProviderOptions = {}): boolean {
  return isAiModelGatewayAvailable({
    providerId: options.providerId,
    legacyGeminiModel: options.legacyGeminiModel,
  });
}
