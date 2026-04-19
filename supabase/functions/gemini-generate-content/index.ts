// @ts-nocheck

import { classifyGeminiUpstreamError } from "./upstreamError.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type GeminiPart = {
  text: string;
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
          return text ? [{ text }] : [];
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

  const apiKey = String(Deno.env.get("GEMINI_API_KEY") || "").trim();
  const defaultModel = String(Deno.env.get("GEMINI_MODEL_DEFAULT") || "gemini-2.5-flash").trim();

  if (!apiKey) {
    logEdge("error", "missing_api_key", { requestId });
    return json(500, toErrorBody(requestId, "missing_api_key", "Gemini API key is not configured on the server."));
  }

  let payload: GeminiRequest;
  try {
    payload = (await request.json()) as GeminiRequest;
  } catch {
    return json(400, toErrorBody(requestId, "invalid_json", "Invalid JSON body."));
  }

  const model = cleanText(payload.model || defaultModel) || defaultModel;
  const systemInstruction = cleanText(payload.systemInstruction);
  const contents = normalizeContents(payload.contents);
  const generationConfig =
    payload.generationConfig && typeof payload.generationConfig === "object" && !Array.isArray(payload.generationConfig)
      ? payload.generationConfig
      : {};

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
    return json(400, toErrorBody(requestId, "invalid_request", "contents must contain at least one text part."));
  }

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemInstruction }],
          },
          contents,
          generationConfig,
        }),
      },
    );
  } catch (error) {
    logEdge("error", "transport_error", {
      requestId,
      model,
      error: error instanceof Error ? error.message : String(error),
    });
    return json(502, toErrorBody(requestId, "transport_error", "Gemini upstream request failed."));
  }

  const upstreamPayload = await upstreamResponse.json().catch(() => null);
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
});
