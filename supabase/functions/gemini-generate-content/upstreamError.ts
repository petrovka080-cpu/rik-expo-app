const LEAKED_KEY_PATTERNS = [
  "api key was reported as leaked",
  "api_key_invalid",
  "api key not valid",
  "invalid api key",
];

export type GeminiUpstreamErrorClassification = {
  category: "server_secret_invalid" | "upstream_error";
  publicMessage: string;
};

export function classifyGeminiUpstreamError(params: {
  status: number;
  message: string;
}): GeminiUpstreamErrorClassification {
  const normalized = String(params.message || "").trim().toLowerCase();
  const secretInvalid =
    (params.status === 400 || params.status === 403) &&
    LEAKED_KEY_PATTERNS.some((pattern) => normalized.includes(pattern));

  if (secretInvalid) {
    return {
      category: "server_secret_invalid",
      publicMessage: "Gemini server API key is invalid or disabled.",
    };
  }

  return {
    category: "upstream_error",
    publicMessage:
      String(params.message || "").trim() ||
      `Gemini request failed (${params.status}).`,
  };
}
