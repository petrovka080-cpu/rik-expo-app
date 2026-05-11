import { redactSensitiveRecord } from "../security/redaction";
import {
  AiModelGateway,
  isAiModelGatewayAvailable,
  resolveLegacyRuntimeAiModelProviderId,
} from "../../features/ai/model";
import type {
  AiModelMessage,
  AiModelRequest,
  AiModelResponseFormat,
} from "../../features/ai/model";

export type AiRepositorySourcePath = "assistant_chat" | "foreman_quick_request";

export type AiRepositoryGatewayPart = {
  text: string;
};

export type AiRepositoryGatewayContent = {
  role: "user" | "model";
  parts: AiRepositoryGatewayPart[];
};

export type AiRepositoryGatewayRequest = {
  model?: string;
  systemInstruction: string;
  contents: AiRepositoryGatewayContent[];
  generationConfig?: Record<string, unknown>;
};

const logAiRepository = (payload: Record<string, unknown>) => {
  if (!__DEV__) return;
  console.info("[ai.repository]", redactSensitiveRecord(payload) ?? {});
};

const toAiErrorCategory = (error: unknown): string => {
  const message = String(error instanceof Error ? error.message : error ?? "").trim().toLowerCase();
  if (!message) return "unknown";
  if (message.includes("not configured")) return "missing_env";
  if (message.includes("invalid")) return "invalid_request";
  if (message.includes("empty")) return "empty_response";
  if (message.includes("disabled")) return "provider_disabled";
  if (message.includes("timed out")) return "timeout";
  return "invoke_error";
};

export function isAiBackendAvailable(): boolean {
  return isAiModelGatewayAvailable({
    providerId: resolveLegacyRuntimeAiModelProviderId(process.env),
  });
}

const toFiniteNumber = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toOptionalFiniteNumber = (value: unknown): number | undefined => {
  const parsed = toFiniteNumber(value);
  return parsed == null ? undefined : parsed;
};

const partsToText = (parts: readonly AiRepositoryGatewayPart[]): string =>
  parts.map((part) => String(part.text || "")).join("\n");

const contentsToMessages = (
  systemInstruction: string,
  contents: readonly AiRepositoryGatewayContent[],
): AiModelMessage[] => [
  ...(systemInstruction.trim()
    ? [{ role: "system" as const, content: systemInstruction }]
    : []),
  ...contents.map((content) => ({
    role: content.role === "model" ? "assistant" as const : "user" as const,
    content: partsToText(content.parts),
  })),
];

const responseFormatFromConfig = (
  generationConfig: Record<string, unknown> | undefined,
): AiModelResponseFormat | undefined => {
  const mimeType = String(generationConfig?.responseMimeType || "").trim().toLowerCase();
  return mimeType.includes("json") ? "json" : undefined;
};

const buildModelRequest = (
  request: AiRepositoryGatewayRequest,
  sourcePath: AiRepositorySourcePath,
): AiModelRequest => {
  const generationConfig = request.generationConfig ?? {};
  return {
    taskType: sourcePath === "foreman_quick_request" ? "draft" : "chat",
    messages: contentsToMessages(
      String(request.systemInstruction || ""),
      Array.isArray(request.contents) ? request.contents : [],
    ),
    maxOutputTokens: toFiniteNumber(generationConfig.maxOutputTokens) ?? 700,
    temperature: toFiniteNumber(generationConfig.temperature) ?? 0.5,
    topP: toOptionalFiniteNumber(generationConfig.topP),
    timeoutMs: 30000,
    redactionRequired: true,
    responseFormat: responseFormatFromConfig(generationConfig),
    traceLabel: sourcePath,
  };
};

export async function requestAiGeneratedText(params: {
  request: AiRepositoryGatewayRequest;
  sourcePath: AiRepositorySourcePath;
}): Promise<string> {
  const model = String(params.request.model || "").trim() || null;
  const contentCount = Array.isArray(params.request.contents) ? params.request.contents.length : 0;

  logAiRepository({
    phase: "backend_request_sent",
    sourcePath: params.sourcePath,
    model,
    contentCount,
    hasSystemInstruction: Boolean(String(params.request.systemInstruction || "").trim()),
  });

  try {
    const gateway = new AiModelGateway({
      providerId: resolveLegacyRuntimeAiModelProviderId(process.env),
      legacyGeminiModel: model,
    });
    const response = await gateway.generate(buildModelRequest(params.request, params.sourcePath));
    if (response.safety.blocked) {
      throw new Error(response.safety.reason || "AI model provider blocked request.");
    }
    const text = response.text;
    if (__DEV__) {
      console.info("[AI RESPONSE METADATA]", {
        textLength: text.length,
        sourcePath: params.sourcePath,
        provider: response.provider,
      });
    }
    logAiRepository({
      phase: "backend_success",
      sourcePath: params.sourcePath,
      model,
      contentCount,
      textLength: text.length,
    });
    return text;
  } catch (error) {
    logAiRepository({
      phase: "backend_failed",
      sourcePath: params.sourcePath,
      model,
      contentCount,
      errorCategory: toAiErrorCategory(error),
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
