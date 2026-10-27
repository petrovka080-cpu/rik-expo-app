import {
  canUseAiCapability,
  getAllowedAiDomainsForRole,
  hasDirectorFullAiAccess,
  type AiUserRole,
} from "../policy/aiRolePolicy";
import { hasAiTaskStreamEvidence } from "./aiTaskStreamEvidence";
import { AI_TASK_STREAM_CARD_PRODUCERS } from "./aiTaskStreamCardProducers";
import type {
  AiTaskStreamCard,
  AiTaskStreamRuntimeInput,
  AiTaskStreamRuntimeResult,
  EvidenceRef,
} from "./aiTaskStreamRuntimeTypes";

export const AI_TASK_STREAM_RUNTIME_CONTRACT = Object.freeze({
  contractId: "ai_task_stream_runtime_v1",
  route: "GET /agent/task-stream",
  source: "runtime:ai_task_stream_v1",
  roleScoped: true,
  evidenceBacked: true,
  readOnly: true,
  mutationCount: 0,
  directMutationAllowed: false,
  providerCalled: false,
  rawDbRowsExposed: false,
  rawPromptExposed: false,
  fakeCards: false,
  hardcodedAiResponse: false,
  producerRegistry: true,
  unknownRoleDenyByDefault: true,
} as const);

function normalizeLimit(value: number | undefined): number {
  if (!Number.isFinite(value)) return 20;
  const whole = Math.trunc(value ?? 20);
  if (whole < 1) return 1;
  if (whole > 50) return 50;
  return whole;
}

function normalizeCursor(value: string | null | undefined): number | null {
  if (value === undefined || value === null || value.trim().length === 0) return 0;
  if (!/^\d+$/.test(value.trim())) return null;
  return Number(value.trim());
}

function emptyCountsByType(): Record<string, number> {
  return {};
}

function countCardsByType(cards: readonly AiTaskStreamCard[]): Record<string, number> {
  return cards.reduce<Record<string, number>>((acc, card) => {
    acc[card.type] = (acc[card.type] ?? 0) + 1;
    return acc;
  }, {});
}

function blockedResult(params: {
  role: AiUserRole;
  screenId: string;
  reason: string;
}): AiTaskStreamRuntimeResult {
  return {
    status: "blocked",
    role: params.role,
    screenId: params.screenId,
    cards: [],
    nextCursor: null,
    countsByType: emptyCountsByType(),
    evidenceRefs: [],
    blockedReason: params.reason,
    producerBlocks: [],
    roleScoped: true,
    evidenceBacked: true,
    readOnly: true,
    mutationCount: 0,
    directMutationAllowed: false,
    providerCalled: false,
    rawDbRowsExposed: false,
    rawPromptExposed: false,
    fakeCards: false,
    hardcodedAiResponse: false,
    source: AI_TASK_STREAM_RUNTIME_CONTRACT.source,
  };
}

function canSeeRuntimeCard(card: AiTaskStreamCard, role: AiUserRole, userId: string): boolean {
  if (!hasAiTaskStreamEvidence(card.evidenceRefs)) return false;
  if (hasDirectorFullAiAccess(role)) return true;
  if (!canUseAiCapability({ role, domain: card.domain, capability: "read_context" })) {
    return false;
  }
  if (card.scope.kind === "cross_domain") return false;
  if (card.scope.kind === "role_domain") return card.scope.allowedRoles.includes(role);
  return card.scope.ownerUserIdHash === userId;
}

function sortCards(cards: readonly AiTaskStreamCard[]): AiTaskStreamCard[] {
  return [...cards].sort((left, right) => {
    const dateDelta = Date.parse(right.createdAt) - Date.parse(left.createdAt);
    if (dateDelta !== 0 && Number.isFinite(dateDelta)) return dateDelta;
    return left.id.localeCompare(right.id);
  });
}

function uniqueEvidenceRefs(refs: readonly EvidenceRef[]): EvidenceRef[] {
  const seen = new Set<string>();
  const unique: EvidenceRef[] = [];
  for (const ref of refs) {
    if (seen.has(ref.id)) continue;
    seen.add(ref.id);
    unique.push(ref);
  }
  return unique;
}

export function loadAiTaskStreamRuntime(
  input: AiTaskStreamRuntimeInput,
): AiTaskStreamRuntimeResult {
  const screenId = input.screenId.trim() || "ai.command.center";
  if (!input.auth || input.auth.userId.trim().length === 0) {
    return blockedResult({
      role: input.auth?.role ?? "unknown",
      screenId,
      reason: "AI task stream runtime requires authenticated role context",
    });
  }

  const auth = input.auth;
  const role = auth.role;
  if (role === "unknown" || getAllowedAiDomainsForRole(role).length === 0) {
    return blockedResult({
      role,
      screenId,
      reason: "Unknown AI role is denied by default",
    });
  }

  const offset = normalizeCursor(input.cursor);
  if (offset === null) {
    return blockedResult({
      role,
      screenId,
      reason: "AI task stream cursor must be a non-negative integer string",
    });
  }

  const context = {
    auth,
    screenId,
    nowIso: input.nowIso ?? new Date().toISOString(),
    evidence: input.evidence ?? {},
  };
  const producerResults = AI_TASK_STREAM_CARD_PRODUCERS.map((producer) =>
    producer.produce(context),
  );
  const producerBlocks = producerResults.flatMap((result) => result.blocks);
  const producedCards = producerResults.flatMap((result) => result.cards);
  const visibleCards = sortCards(
    producedCards.filter((card) => canSeeRuntimeCard(card, role, auth.userId)),
  );
  const limit = normalizeLimit(input.limit);
  const pageCards = visibleCards.slice(offset, offset + limit);
  const nextOffset = offset + pageCards.length;
  const nextCursor = nextOffset < visibleCards.length ? String(nextOffset) : null;
  const evidenceRefs = uniqueEvidenceRefs(
    producerResults.flatMap((result) => result.evidenceRefs),
  ).filter((ref) => pageCards.some((card) => card.evidenceRefs.includes(ref.id)));
  const blockedReason =
    pageCards.length === 0 && producerBlocks.length > 0
      ? producerBlocks.map((block) => block.code).join(",")
      : undefined;

  return {
    status: pageCards.length > 0 ? "loaded" : blockedReason ? "blocked" : "empty",
    role,
    screenId,
    cards: pageCards,
    nextCursor,
    countsByType: countCardsByType(pageCards),
    evidenceRefs,
    blockedReason,
    producerBlocks,
    roleScoped: true,
    evidenceBacked: true,
    readOnly: true,
    mutationCount: 0,
    directMutationAllowed: false,
    providerCalled: false,
    rawDbRowsExposed: false,
    rawPromptExposed: false,
    fakeCards: false,
    hardcodedAiResponse: false,
    source: AI_TASK_STREAM_RUNTIME_CONTRACT.source,
  };
}
