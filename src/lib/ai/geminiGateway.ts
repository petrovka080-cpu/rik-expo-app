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
  errorCategory?: string;
  requestId?: string;
};

export class GeminiGatewayError extends Error {
  status: number | null;
  errorCategory: string | null;
  requestId: string | null;

  constructor(
    message: string,
    options?: {
      status?: number | null;
      errorCategory?: string | null;
      requestId?: string | null;
    },
  ) {
    super(message);
    this.name = "GeminiGatewayError";
    this.status = options?.status ?? null;
    this.errorCategory = options?.errorCategory ?? null;
    this.requestId = options?.requestId ?? null;
  }
}

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error.trim();
  return fallback;
}

const toStatus = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

async function resolveFunctionsInvokeError(error: unknown, fallback: string): Promise<GeminiGatewayError> {
  const baseMessage = toErrorMessage(error, "");
  const directStatus =
    error && typeof error === "object" && "status" in error ? toStatus((error as { status?: unknown }).status) : null;
  const context = typeof error === "object" && error != null ? (error as { context?: unknown }).context : null;
  const contextStatus =
    context && typeof context === "object" && "status" in context
      ? toStatus((context as { status?: unknown }).status)
      : null;
  let errorCategory: string | null = null;
  let requestId: string | null = null;

  if (context && typeof (context as { text?: unknown }).text === "function") {
    try {
      const response = context as { clone?: () => { text: () => Promise<string> }; text: () => Promise<string> };
      const text = await (typeof response.clone === "function" ? response.clone().text() : response.text());
      const raw = String(text || "").trim();
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as {
            error?: unknown;
            errorCategory?: unknown;
            requestId?: unknown;
          };
          const nestedMessage = String(parsed?.error ?? "").trim();
          errorCategory = String(parsed?.errorCategory ?? "").trim() || null;
          requestId = String(parsed?.requestId ?? "").trim() || null;
          if (nestedMessage) {
            return new GeminiGatewayError(nestedMessage, {
              status: directStatus ?? contextStatus,
              errorCategory,
              requestId,
            });
          }
        } catch {
          return new GeminiGatewayError(raw, {
            status: directStatus ?? contextStatus,
            requestId,
          });
        }
      }
    } catch {
      // ignore response body parsing failures
    }
  }

  return new GeminiGatewayError(baseMessage || fallback, {
    status: directStatus ?? contextStatus,
    errorCategory,
    requestId,
  });
}

export function isGeminiGatewayConfigured(): boolean {
  return Boolean(isSupabaseEnvValid);
}

export async function invokeGeminiGateway(
  request: GeminiGatewayRequest,
): Promise<string> {
  if (!isSupabaseEnvValid) {
    throw new GeminiGatewayError("Supabase env is not configured.", {
      errorCategory: "missing_env",
    });
  }

  const { data, error } = await supabase.functions.invoke<GeminiGatewayResponse>(
    "gemini-generate-content",
    {
      body: request,
      headers: {
        Accept: "application/json",
      },
    },
  );

  if (error) {
    throw await resolveFunctionsInvokeError(error, "Gemini gateway request failed.");
  }

  if (data?.error) {
    throw new GeminiGatewayError(String(data.error).trim() || "Gemini gateway returned an error.", {
      errorCategory: String(data.errorCategory ?? "").trim() || null,
      requestId: String(data.requestId ?? "").trim() || null,
    });
  }

  const text = String(data?.text || "").trim();
  if (!text) {
    throw new GeminiGatewayError(String(data?.error || "Gemini gateway returned empty text."), {
      errorCategory: String(data?.errorCategory ?? "").trim() || "empty_response",
      requestId: String(data?.requestId ?? "").trim() || null,
    });
  }

  return text;
}
