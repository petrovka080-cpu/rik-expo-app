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
