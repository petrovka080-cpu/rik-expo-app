import type { AiModelClient } from "./AiModelClient";
import { DisabledModelProvider } from "./DisabledModelProvider";
import { LegacyGeminiModelProvider } from "./LegacyGeminiModelProvider";
import {
  resolveAiModelProviderId,
  type AiModelProviderEnv,
} from "./aiModelProviderFlags";
import type {
  AiModelMessage,
  AiModelProviderId,
  AiModelRequest,
  AiModelResponse,
} from "./AiModelTypes";

export const AI_MODEL_MAX_OUTPUT_TOKENS = 2048;
export const AI_MODEL_TIMEOUT_MS = 30000;
export const AI_MODEL_MAX_MESSAGES = 32;
export const AI_MODEL_MESSAGE_CONTENT_CHAR_LIMIT = 12000;

type AiModelGatewayOptions = {
  provider?: AiModelClient;
  providerId?: AiModelProviderId;
  env?: AiModelProviderEnv;
  legacyGeminiModel?: string | null;
};

const blockedResponse = (
  reason: string,
  provider: AiModelProviderId = "disabled",
  model = "blocked",
): AiModelResponse => ({
  provider,
  model,
  text: "",
  safety: {
    redacted: true,
    blocked: true,
    reason,
  },
});

const normalizeMessage = (message: AiModelMessage): AiModelMessage => ({
  role: message.role,
  content: String(message.content ?? ""),
});

const validateRequest = (request: AiModelRequest): string | null => {
  if (request.redactionRequired !== true) {
    return "AI model request redaction is required";
  }
  if (!Array.isArray(request.messages) || request.messages.length === 0) {
    return "AI model request messages are required";
  }
  if (request.messages.length > AI_MODEL_MAX_MESSAGES) {
    return "AI model request message count exceeded";
  }
  if (!Number.isFinite(request.maxOutputTokens) || request.maxOutputTokens <= 0) {
    return "AI model request maxOutputTokens is invalid";
  }
  if (request.maxOutputTokens > AI_MODEL_MAX_OUTPUT_TOKENS) {
    return "AI model request maxOutputTokens exceeded";
  }
  if (!Number.isFinite(request.timeoutMs) || request.timeoutMs <= 0) {
    return "AI model request timeoutMs is invalid";
  }
  if (request.timeoutMs > AI_MODEL_TIMEOUT_MS) {
    return "AI model request timeoutMs exceeded";
  }
  if (!Number.isFinite(request.temperature)) {
    return "AI model request temperature is invalid";
  }
  const oversizedMessage = request.messages.find(
    (message) => String(message.content ?? "").length > AI_MODEL_MESSAGE_CONTENT_CHAR_LIMIT,
  );
  if (oversizedMessage) {
    return "AI model request message content exceeded";
  }
  return null;
};

const withTimeout = async (
  promise: Promise<AiModelResponse>,
  timeoutMs: number,
): Promise<AiModelResponse> =>
  await new Promise<AiModelResponse>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("AI model provider timed out."));
    }, timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });

export class AiModelGateway {
  private readonly client: AiModelClient;

  constructor(options?: AiModelGatewayOptions) {
    this.client = options?.provider ?? AiModelGateway.createProvider(options);
  }

  static createProvider(options?: AiModelGatewayOptions): AiModelClient {
    const providerId = options?.providerId ?? resolveAiModelProviderId(options?.env);
    if (providerId === "legacy_gemini") {
      return new LegacyGeminiModelProvider({ model: options?.legacyGeminiModel });
    }
    return new DisabledModelProvider();
  }

  isAvailable(): boolean {
    if (this.client.providerId === "disabled") return false;
    if (this.client instanceof LegacyGeminiModelProvider) {
      return this.client.isConfigured();
    }
    return true;
  }

  async generate(request: AiModelRequest): Promise<AiModelResponse> {
    const validationError = validateRequest(request);
    if (validationError) {
      return blockedResponse(validationError, this.client.providerId);
    }

    const normalizedRequest: AiModelRequest = {
      ...request,
      messages: request.messages.map(normalizeMessage),
    };

    try {
      const response = await withTimeout(
        this.client.generate(normalizedRequest),
        Math.min(request.timeoutMs, AI_MODEL_TIMEOUT_MS),
      );
      return {
        provider: response.provider,
        model: String(response.model || this.client.providerId),
        text: String(response.text || ""),
        structured: response.structured,
        usage: response.usage,
        safety: {
          redacted: response.safety.redacted === true,
          blocked: response.safety.blocked === true,
          reason: response.safety.reason,
        },
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : "AI model provider failed";
      return blockedResponse(reason, this.client.providerId);
    }
  }
}

export function isAiModelGatewayAvailable(options?: AiModelGatewayOptions): boolean {
  return new AiModelGateway(options).isAvailable();
}
