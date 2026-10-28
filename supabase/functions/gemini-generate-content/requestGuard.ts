export const GEMINI_MAX_BODY_BYTES = 12 * 1024 * 1024;
export const GEMINI_MAX_TEXT_CHARS = 128 * 1024;
export const GEMINI_MAX_OUTPUT_TOKENS = 4096;

export class GeminiRequestGuardError extends Error {
  constructor(public status: number, public category: string, message: string) {
    super(message);
    this.name = "GeminiRequestGuardError";
  }
}

type Env = { get(name: string): string | undefined };
type VerifiedCaller = { userId: string; baseUrl: string; anonKey: string; authorization: string };
const record = (v: unknown): Record<string, unknown> | null =>
  v !== null && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : null;

async function guardedJson(url: string, init: RequestInit, timeoutMs = 3000): Promise<{ ok: boolean; status: number; body: unknown }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const body: unknown = await response.json();
    return { ok: response.ok, status: response.status, body };
  }
  catch { throw new GeminiRequestGuardError(503, "authorization_unavailable", "Request authorization is temporarily unavailable."); }
  finally { clearTimeout(timer); }
}

export async function verifyGeminiCaller(request: Request, env: Env): Promise<VerifiedCaller> {
  const authorization = request.headers.get("authorization")?.trim() ?? "";
  if (!/^Bearer\s+\S+$/i.test(authorization)) {
    throw new GeminiRequestGuardError(401, "authentication_required", "Sign in to use this function.");
  }
  const baseUrl = env.get("SUPABASE_URL")?.trim() ?? "";
  const anonKey = env.get("SUPABASE_ANON_KEY")?.trim() ?? "";
  if (!baseUrl || !anonKey) {
    throw new GeminiRequestGuardError(503, "authorization_unavailable", "Request authorization is not configured.");
  }
  let url: URL;
  try { url = new URL("/auth/v1/user", baseUrl); }
  catch { throw new GeminiRequestGuardError(503, "authorization_unavailable", "Request authorization is not configured."); }
  const response = await guardedJson(url.toString(), { method: "GET", headers: { apikey: anonKey, authorization } });
  if (response.status === 401 || response.status === 403) {
    throw new GeminiRequestGuardError(401, "authentication_required", "Your session is not valid. Sign in again.");
  }
  if (!response.ok) throw new GeminiRequestGuardError(503, "authorization_unavailable", "Request authorization is temporarily unavailable.");
  const user = record(response.body);
  if (typeof user?.id !== "string" || !user.id.trim()) {
    throw new GeminiRequestGuardError(401, "authentication_required", "Your session is not valid. Sign in again.");
  }
  return { userId: user.id, baseUrl, anonKey, authorization };
}

export async function readBoundedGeminiPayload(request: Request): Promise<Record<string, unknown>> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > GEMINI_MAX_BODY_BYTES) {
    throw new GeminiRequestGuardError(413, "request_too_large", "The request is too large.");
  }
  const reader = request.body?.getReader();
  if (!reader) throw new GeminiRequestGuardError(400, "invalid_json", "A JSON object is required.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  let timedOut = false;
  const readTimer = setTimeout(() => {
    timedOut = true;
    void reader.cancel().catch(() => undefined);
  }, 10000);
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (timedOut) throw new GeminiRequestGuardError(408, "request_timeout", "The request body did not arrive in time.");
      if (done) break;
      size += value.byteLength;
      if (size > GEMINI_MAX_BODY_BYTES) {
        await reader.cancel().catch(() => undefined);
        throw new GeminiRequestGuardError(413, "request_too_large", "The request is too large.");
      }
      chunks.push(value);
    }
  } finally { clearTimeout(readTimer); reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  let value: unknown;
  try { value = JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw new GeminiRequestGuardError(400, "invalid_json", "Invalid JSON body."); }
  const payload = record(value);
  if (!payload) throw new GeminiRequestGuardError(400, "invalid_request", "A JSON object is required.");
  return payload;
}

export function validateGeminiModel(model: string, defaultModel: string, env: Env): void {
  const allowed = (env.get("GEMINI_ALLOWED_MODELS") || defaultModel).split(",").map(v => v.trim()).filter(Boolean);
  if (!allowed.includes(model) || !/^[a-z0-9][a-z0-9.-]{1,100}$/i.test(model)) {
    throw new GeminiRequestGuardError(400, "invalid_model", "The requested model is not allowed.");
  }
}

export function boundGeminiGenerationConfig(value: unknown): Record<string, unknown> {
  const config = record(value) ?? {};
  const max = config.maxOutputTokens === undefined ? GEMINI_MAX_OUTPUT_TOKENS : Number(config.maxOutputTokens);
  if (!Number.isInteger(max) || max < 1 || max > GEMINI_MAX_OUTPUT_TOKENS ||
      (config.candidateCount !== undefined && config.candidateCount !== 1)) {
    throw new GeminiRequestGuardError(400, "invalid_generation_config", "The output request exceeds the allowed limit.");
  }
  return { ...config, candidateCount: 1, maxOutputTokens: max };
}

/** Durable admission is keyed by auth.uid(), with limits held only in server tables. */
export async function reserveGeminiRequest(caller: VerifiedCaller): Promise<void> {
  const url = new URL("/rest/v1/rpc/admit_gemini_request_v1", caller.baseUrl);
  const response = await guardedJson(url.toString(), {
    method: "POST",
    headers: { apikey: caller.anonKey, authorization: caller.authorization, "content-type": "application/json" },
    body: "{}",
  });
  if (!response.ok) throw new GeminiRequestGuardError(503, "budget_unavailable", "Request limits are temporarily unavailable.");
  const decision = record(response.body);
  if (decision?.allowed === true) return;
  if (decision?.allowed === false) {
    throw new GeminiRequestGuardError(429, "request_limit", "The request limit has been reached. Try again later.");
  }
  throw new GeminiRequestGuardError(503, "budget_unavailable", "Request limits are temporarily unavailable.");
}
