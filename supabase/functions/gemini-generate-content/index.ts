// @ts-nocheck

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

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return json(405, { error: "Method not allowed." });
  }

  const apiKey = String(Deno.env.get("GEMINI_API_KEY") || "").trim();
  const defaultModel = String(Deno.env.get("GEMINI_MODEL_DEFAULT") || "gemini-2.5-flash").trim();

  if (!apiKey) {
    return json(500, { error: "Gemini API key is not configured on the server." });
  }

  let payload: GeminiRequest;
  try {
    payload = (await request.json()) as GeminiRequest;
  } catch {
    return json(400, { error: "Invalid JSON body." });
  }

  const model = String(payload.model || defaultModel).trim() || defaultModel;
  const systemInstruction = String(payload.systemInstruction || "").trim();
  const contents = Array.isArray(payload.contents) ? payload.contents : [];

  if (!systemInstruction) {
    return json(400, { error: "systemInstruction is required." });
  }

  if (!contents.length) {
    return json(400, { error: "contents must not be empty." });
  }

  const upstreamResponse = await fetch(
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
        generationConfig: payload.generationConfig ?? {},
      }),
    },
  );

  const upstreamPayload = await upstreamResponse.json().catch(() => null);
  if (!upstreamResponse.ok) {
    const errorMessage = String(upstreamPayload?.error?.message || "").trim();
    return json(upstreamResponse.status, {
      error: errorMessage || `Gemini request failed (${upstreamResponse.status}).`,
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
    return json(502, { error: "Gemini returned empty text." });
  }

  return json(200, { text });
});
