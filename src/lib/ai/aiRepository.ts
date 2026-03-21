import {
  GeminiGatewayError,
  invokeGeminiGateway,
  isGeminiGatewayConfigured,
  type GeminiGatewayRequest,
} from "./geminiGateway";

export type AiRepositorySourcePath = "assistant_chat" | "foreman_quick_request";

const logAiRepository = (payload: Record<string, unknown>) => {
  if (!__DEV__) return;
  console.info("[ai.repository]", payload);
};

const toAiErrorCategory = (error: unknown): string => {
  if (error instanceof GeminiGatewayError && error.errorCategory) {
    return error.errorCategory;
  }
  const message = String(error instanceof Error ? error.message : error ?? "").trim().toLowerCase();
  if (!message) return "unknown";
  if (message.includes("not configured")) return "missing_env";
  if (message.includes("invalid")) return "invalid_request";
  if (message.includes("empty")) return "empty_response";
  return "invoke_error";
};

export function isAiBackendAvailable(): boolean {
  return isGeminiGatewayConfigured();
}

export async function requestAiGeneratedText(params: {
  request: GeminiGatewayRequest;
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
    const text = await invokeGeminiGateway(params.request);
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
      edgeFunctionStatus: error instanceof GeminiGatewayError ? error.status : null,
      requestId: error instanceof GeminiGatewayError ? error.requestId : null,
      errorCategory: toAiErrorCategory(error),
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
