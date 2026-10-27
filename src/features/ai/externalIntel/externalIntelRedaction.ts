const EXTERNAL_INTEL_SECRET_PATTERN =
  /\b(?:authorization|bearer|apikey|api_key|token|password|secret)\b/i;

export type ExternalIntelRedactionResult = {
  safe: boolean;
  redactedQuery: string;
  reason: string;
};

export function redactExternalIntelQuery(query: string): ExternalIntelRedactionResult {
  const normalized = String(query ?? "").trim();
  if (!normalized) {
    return {
      safe: false,
      redactedQuery: "",
      reason: "External query is empty.",
    };
  }
  if (EXTERNAL_INTEL_SECRET_PATTERN.test(normalized)) {
    return {
      safe: false,
      redactedQuery: "<redacted>",
      reason: "External query contains credential-like text.",
    };
  }
  return {
    safe: true,
    redactedQuery: normalized.slice(0, 240),
    reason: "External query is redacted and bounded.",
  };
}

function stableHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function hashExternalIntelUrl(url: string): string {
  const normalized = String(url ?? "").trim().toLowerCase();
  return `url_${stableHash(normalized)}`;
}

export function redactExternalIntelProviderError(error: unknown): string {
  void error;
  if (error instanceof Error && error.message.trim().length > 0) {
    return "external_provider_error_redacted";
  }
  return "external_provider_error_redacted";
}
