import type { EvidenceRef } from "./aiTaskStreamRuntimeTypes";

const FORBIDDEN_PAYLOAD_KEYS = new Set([
  "rawprompt",
  "raw_prompt",
  "rawcontext",
  "raw_context",
  "providerpayload",
  "provider_payload",
  "rawdbrows",
  "raw_db_rows",
  "dbrows",
  "rows",
]);

export function normalizeAiTaskStreamEvidenceRefs(
  refs: readonly string[] | undefined | null,
): string[] {
  if (!Array.isArray(refs)) return [];
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const ref of refs) {
    const text = String(ref ?? "").trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    normalized.push(text);
  }
  return normalized;
}

export function hasAiTaskStreamEvidence(refs: readonly string[] | undefined | null): boolean {
  return normalizeAiTaskStreamEvidenceRefs(refs).length > 0;
}

export function toAiTaskStreamEvidenceRefs(params: {
  refs: readonly string[];
  source: EvidenceRef["source"];
  labelPrefix: string;
}): EvidenceRef[] {
  return normalizeAiTaskStreamEvidenceRefs(params.refs).map((id, index) => ({
    id,
    source: params.source,
    label: `${params.labelPrefix} ${index + 1}`,
    redacted: true,
    rawPayloadStored: false,
    rawDbRowsExposed: false,
    rawPromptExposed: false,
  }));
}

export function hasUnsafeAiTaskStreamPayload(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(hasUnsafeAiTaskStreamPayload);

  return Object.entries(value as Record<string, unknown>).some(([key, nested]) => {
    const normalizedKey = key.toLowerCase();
    if (FORBIDDEN_PAYLOAD_KEYS.has(normalizedKey)) return true;
    return hasUnsafeAiTaskStreamPayload(nested);
  });
}
