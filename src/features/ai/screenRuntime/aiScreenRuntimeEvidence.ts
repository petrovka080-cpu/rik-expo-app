import type { EvidenceRef } from "./aiScreenRuntimeTypes";

const MAX_EVIDENCE_REFS = 20;

function sanitizeEvidencePart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.:-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

export function normalizeAiScreenRuntimeEvidenceRefs(
  refs: readonly string[] | undefined | null,
): string[] {
  return [...new Set((refs ?? []).map((ref) => ref.trim()).filter(Boolean))].slice(0, MAX_EVIDENCE_REFS);
}

export function hasAiScreenRuntimeEvidence(refs: readonly string[] | undefined | null): boolean {
  return normalizeAiScreenRuntimeEvidenceRefs(refs).length > 0;
}

export function buildAiScreenRuntimeRegistryEvidence(params: {
  screenId: string;
  producerName: string;
  entityTypes: readonly string[];
}): EvidenceRef[] {
  const screen = sanitizeEvidencePart(params.screenId);
  const producer = sanitizeEvidencePart(params.producerName);
  const entity = sanitizeEvidencePart(params.entityTypes[0] ?? "screen");
  return [
    {
      id: `screen_runtime:${screen}:registry`,
      source: "runtime_policy",
      label: `${params.screenId} runtime registry`,
      redacted: true,
      rawPayloadStored: false,
      rawDbRowsExposed: false,
      rawPromptExposed: false,
    },
    {
      id: `screen_runtime:${screen}:${producer}:${entity}`,
      source: "runtime_policy",
      label: `${params.producerName} evidence policy`,
      redacted: true,
      rawPayloadStored: false,
      rawDbRowsExposed: false,
      rawPromptExposed: false,
    },
  ];
}

export function toAiScreenRuntimeEvidenceRefs(params: {
  ids: readonly string[];
  labelPrefix: string;
  source?: EvidenceRef["source"];
}): EvidenceRef[] {
  return normalizeAiScreenRuntimeEvidenceRefs(params.ids).map((id, index) => ({
    id,
    source: params.source ?? "safe_read",
    label: `${params.labelPrefix} evidence ${index + 1}`,
    redacted: true,
    rawPayloadStored: false,
    rawDbRowsExposed: false,
    rawPromptExposed: false,
  }));
}

export function evidenceIds(refs: readonly EvidenceRef[]): string[] {
  return normalizeAiScreenRuntimeEvidenceRefs(refs.map((ref) => ref.id));
}
