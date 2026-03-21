import { isSupabaseEnvValid, supabase } from "../supabaseClient";

export type GeminiGatewayPart = {
  text: string;
};

export type GeminiGatewayContent = {
  role: "user" | "model";
  parts: GeminiGatewayPart[];
};

export type GeminiGatewayRequest = {
  model?: string;
  systemInstruction: string;
  contents: GeminiGatewayContent[];
  generationConfig?: Record<string, unknown>;
};

type GeminiGatewayResponse = {
  text?: string;
  error?: string;
};

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error.trim();
  return fallback;
}

async function resolveFunctionsInvokeErrorMessage(error: unknown, fallback: string): Promise<string> {
  const baseMessage = toErrorMessage(error, "");
  const context = typeof error === "object" && error != null ? (error as { context?: unknown }).context : null;

  if (context && typeof (context as { text?: unknown }).text === "function") {
    try {
      const response = context as { clone?: () => { text: () => Promise<string> }; text: () => Promise<string> };
      const text = await (typeof response.clone === "function" ? response.clone().text() : response.text());
      const raw = String(text || "").trim();
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as { error?: unknown };
          const nestedMessage = String(parsed?.error ?? "").trim();
          if (nestedMessage) return nestedMessage;
        } catch {
          return raw;
        }
      }
    } catch {
      // ignore response body parsing failures
    }
  }

  return baseMessage || fallback;
}

export function isGeminiGatewayConfigured(): boolean {
  return Boolean(isSupabaseEnvValid);
}

export async function invokeGeminiGateway(
  request: GeminiGatewayRequest,
): Promise<string> {
  if (!isSupabaseEnvValid) {
    throw new Error("Supabase env is not configured.");
  }

  const { data, error } = await supabase.functions.invoke<GeminiGatewayResponse>(
    "gemini-generate-content",
    { body: request },
  );

  if (error) {
    throw new Error(await resolveFunctionsInvokeErrorMessage(error, "Gemini gateway request failed."));
  }

  if (data?.error) {
    throw new Error(String(data.error).trim() || "Gemini gateway returned an error.");
  }

  const text = String(data?.text || "").trim();
  if (!text) {
    throw new Error(String(data?.error || "Gemini gateway returned empty text."));
  }

  return text;
}
