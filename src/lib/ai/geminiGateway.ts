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
    throw new Error(toErrorMessage(error, "Gemini gateway request failed."));
  }

  const text = String(data?.text || "").trim();
  if (!text) {
    throw new Error(String(data?.error || "Gemini gateway returned empty text."));
  }

  return text;
}
