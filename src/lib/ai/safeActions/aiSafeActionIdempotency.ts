import type { AiSafeActionDraft, AiSafeActionIdempotencyKey, AiSafeActionKind } from "./aiSafeActionTypes";

export function stableAiSafeActionHash(value: string): string {
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function normalizePayload(value: unknown): string {
  if (value == null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(normalizePayload).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${normalizePayload(item)}`)
    .join(",")}}`;
}

export function createAiSafeActionIdempotencyKey(params: {
  actionKind: AiSafeActionKind;
  orgId: string;
  projectId?: string;
  sourceRefIds: readonly string[];
  draftPayload: Record<string, unknown>;
  userId: string;
  questionRu?: string;
}): AiSafeActionIdempotencyKey {
  return {
    actionKind: params.actionKind,
    orgId: params.orgId,
    projectId: params.projectId,
    sourceRefIds: [...params.sourceRefIds].sort(),
    draftPayloadHash: stableAiSafeActionHash(normalizePayload(params.draftPayload)),
    userId: params.userId,
    createdForQuestionHash: stableAiSafeActionHash(params.questionRu ?? ""),
  };
}

export function serializeAiSafeActionIdempotencyKey(key: AiSafeActionIdempotencyKey): string {
  return [
    key.actionKind,
    key.orgId,
    key.projectId ?? "no_project",
    key.userId,
    key.sourceRefIds.join("+"),
    key.draftPayloadHash,
    key.createdForQuestionHash,
  ]
    .join(":")
    .replace(/[^a-zA-Z0-9:._+-]+/g, "_");
}

export function findReusableAiSafeActionDraft(
  existingDrafts: readonly AiSafeActionDraft[],
  candidate: AiSafeActionDraft,
): AiSafeActionDraft | null {
  const candidateKey = serializeAiSafeActionIdempotencyKey(candidate.idempotencyKey);
  return existingDrafts.find((draft) => serializeAiSafeActionIdempotencyKey(draft.idempotencyKey) === candidateKey) ?? null;
}
