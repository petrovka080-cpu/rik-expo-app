// @ts-nocheck

import { classifyGeminiUpstreamError } from "./upstreamError.ts";
import {
  GeminiRequestGuardError,
  GEMINI_MAX_TEXT_CHARS,
  boundGeminiGenerationConfig,
  readBoundedGeminiPayload,
  reserveGeminiRequest,
  validateGeminiModel,
  verifyGeminiCaller,
} from "./requestGuard.ts";

const activeUsers = new Set<string>();
const MAX_WORKER_UPSTREAM_REQUESTS = 4;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type GeminiPart =
  | {
      text: string;
    }
  | {
      inlineData: {
        mimeType: string;
        data: string;
      };
    };

type GeminiContent = {
  role: "user" | "model";
  parts: GeminiPart[];
};

type GeminiRequest = {
  model?: string;
  systemInstruction?: string;
  contents?: GeminiContent[];
  generationConfig?: Record<string, unknown>;
};

const cleanText = (value: unknown) => String(value ?? "").trim();

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const normalizeInlineData = (value: unknown): GeminiPart[] => {
  const inlineData = asRecord(value);
  if (!inlineData) return [];
  const mimeType = cleanText(inlineData.mimeType);
  const data = cleanText(inlineData.data);
  if (!["image/jpeg", "image/png", "image/heic"].includes(mimeType)) return [];
  if (!data || data.length > 10 * 1024 * 1024) return [];
  return [{ inlineData: { mimeType, data } }];
};

const toErrorBody = (
  requestId: string,
  errorCategory: string,
  error: string,
) => ({
  requestId,
  errorCategory,
  error,
});

const normalizeContents = (value: unknown): GeminiContent[] => {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry) => {
    const row = asRecord(entry);
    if (!row) return [];

    const role = cleanText(row.role);
    if (role !== "user" && role !== "model") return [];

    const parts = Array.isArray(row.parts)
      ? row.parts.flatMap((part) => {
          const partRow = asRecord(part);
          if (!partRow) return [];
          const text = cleanText(partRow.text);
          if (text) return [{ text }];
          return normalizeInlineData(partRow.inlineData);
        })
      : [];

    if (!parts.length) return [];
    return [{ role, parts }];
  });
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function logEdge(level: "info" | "warn" | "error", message: string, payload?: Record<string, unknown>) {
  const logger = level === "error" ? console.error : level === "warn" ? console.warn : console.info;
  logger(`[gemini-generate-content] ${message}`, payload ?? {});
}

Deno.serve(async (request) => {
  const requestId = crypto.randomUUID();

  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return json(405, toErrorBody(requestId, "method_not_allowed", "Method not allowed."));
  }

  try {
  const caller = await verifyGeminiCaller(request, Deno.env);

  const apiKey = String(Deno.env.get("GEMINI_API_KEY") || "").trim();
  const defaultModel = String(Deno.env.get("GEMINI_MODEL_DEFAULT") || "gemini-2.5-flash").trim();

  if (!apiKey) {
    logEdge("error", "missing_api_key", { requestId });
    return json(500, toErrorBody(requestId, "missing_api_key", "Gemini API key is not configured on the server."));
  }

  const payload = await readBoundedGeminiPayload(request) as GeminiRequest;

  const model = cleanText(payload.model || defaultModel) || defaultModel;
  validateGeminiModel(model, defaultModel, Deno.env);
  const systemInstruction = cleanText(payload.systemInstruction);
  if (systemInstruction.length > 32768 || !Array.isArray(payload.contents) || payload.contents.length > 24 ||
      payload.contents.some(content => Array.isArray(content?.parts) && content.parts.length > 32)) {
    return json(400, toErrorBody(requestId, "invalid_request", "The request exceeds the allowed content limit."));
  }
  const contents = normalizeContents(payload.contents);
  const textChars = contents.reduce((total, content) => total + content.parts.reduce((sum, part) => sum + ("text" in part ? part.text.length : 0), 0), 0);
  if (textChars > GEMINI_MAX_TEXT_CHARS) {
    return json(400, toErrorBody(requestId, "invalid_request", "The request exceeds the allowed text limit."));
  }
  const generationConfig = boundGeminiGenerationConfig(payload.generationConfig);

  logEdge("info", "request_received", {
    requestId,
    model,
    contentCount: contents.length,
    hasSystemInstruction: !!systemInstruction,
    generationConfigKeys: Object.keys(generationConfig),
  });

  if (!systemInstruction) {
    logEdge("warn", "invalid_request", { requestId, reason: "missing_system_instruction" });
    return json(400, toErrorBody(requestId, "invalid_request", "systemInstruction is required."));
  }

  if (!contents.length) {
    logEdge("warn", "invalid_request", { requestId, reason: "empty_contents" });
    return json(400, toErrorBody(requestId, "invalid_request", "contents must contain at least one text or image part."));
  }

  if (request.signal.aborted) {
    return json(408, toErrorBody(requestId, "request_cancelled", "The request was cancelled."));
  }

  if (activeUsers.has(caller.userId) || activeUsers.size >= MAX_WORKER_UPSTREAM_REQUESTS) {
    return json(429, toErrorBody(requestId, "request_limit", "Another request is already running. Try again later."));
  }
  // Synchronous reservation before awaiting durable admission prevents same-worker races.
  activeUsers.add(caller.userId);
  try {
  await reserveGeminiRequest(caller);
  if (request.signal.aborted) {
    return json(408, toErrorBody(requestId, "request_cancelled", "The request was cancelled."));
  }
  let upstreamResponse: Response;
  let upstreamPayload: any;
  const controller = new AbortController();
  const cancelUpstream = () => controller.abort();
  request.signal.addEventListener("abort", cancelUpstream, { once: true });
  const upstreamTimer = setTimeout(() => controller.abort(), 20000);
  try {
    upstreamResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemInstruction }],
          },
          contents,
          generationConfig,
        }),
      },
    );
    upstreamPayload = await upstreamResponse.json().catch(error => {
      if (controller.signal.aborted) throw error;
      return null;
    });
  } catch (error) {
    logEdge("error", "transport_error", {
      requestId,
      model,
      error: controller.signal.aborted ? "deadline_exceeded" : "provider_transport_failed",
    });
    return request.signal.aborted
      ? json(408, toErrorBody(requestId, "request_cancelled", "The request was cancelled."))
      : controller.signal.aborted
      ? json(504, toErrorBody(requestId, "upstream_timeout", "Gemini did not respond in time."))
      : json(502, toErrorBody(requestId, "transport_error", "Gemini upstream request failed."));
  } finally {
    clearTimeout(upstreamTimer);
    request.signal.removeEventListener("abort", cancelUpstream);
  }

  if (!upstreamResponse.ok) {
    const errorMessage = cleanText(upstreamPayload?.error?.message);
    const errorClassification = classifyGeminiUpstreamError({
      status: upstreamResponse.status,
      message: errorMessage,
    });
    logEdge("error", "upstream_error", {
      requestId,
      model,
      status: upstreamResponse.status,
      errorCategory: errorClassification.category,
      error: errorMessage || null,
      contentCount: contents.length,
    });
    return json(upstreamResponse.status, {
      ...toErrorBody(
        requestId,
        errorClassification.category,
        errorClassification.publicMessage,
      ),
    });
  }

  const candidates = Array.isArray(upstreamPayload?.candidates) ? upstreamPayload.candidates : [];
  const parts = Array.isArray(candidates[0]?.content?.parts) ? candidates[0].content.parts : [];
  const text = parts
    .map((part: any) => (typeof part?.text === "string" ? part.text : ""))
    .filter(Boolean)
    .join("\n")
    .trim();

  if (!text) {
    logEdge("error", "empty_text", {
      requestId,
      model,
      candidateCount: candidates.length,
    });
    return json(502, toErrorBody(requestId, "empty_response", "Gemini returned empty text."));
  }

  logEdge("info", "success", {
    requestId,
    model,
    textLength: text.length,
  });

  return json(200, { requestId, text });
  } finally {
    activeUsers.delete(caller.userId);
  }
  } catch (error) {
    if (error instanceof GeminiRequestGuardError) {
      return json(error.status, toErrorBody(requestId, error.category, error.message));
    }
    logEdge("error", "request_failed", { requestId });
    return json(500, toErrorBody(requestId, "request_failed", "The request could not be completed."));
  }
});
