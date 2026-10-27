const SENSITIVE_KEYS = new Set([
  "signedUrl",
  "signedURL",
  "storageKey",
  "privateUrl",
  "rawPayload",
  "base64",
]);

export function sanitizeDocumentMetadata(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(input).filter(([key]) => !SENSITIVE_KEYS.has(key)),
  );
}
