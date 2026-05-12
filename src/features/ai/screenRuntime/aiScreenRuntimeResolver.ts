import { canUseAiCapability, type AiCapability, type AiDomain } from "../policy/aiRolePolicy";
import {
  buildAiScreenRuntimeRegistryEvidence,
  evidenceIds,
  normalizeAiScreenRuntimeEvidenceRefs,
} from "./aiScreenRuntimeEvidence";
import { getAiScreenRuntimeEntry } from "./aiScreenRuntimeRegistry";
import { getAiScreenRuntimeProducer } from "./aiScreenRuntimeProducers";
import { assertAiScreenRuntimeResponseSafe, redactAiScreenRuntimeCard } from "./aiScreenRuntimeRedaction";
import type {
  AiScreenRuntimeBlockedIntent,
  AiScreenRuntimeIntent,
  AiScreenRuntimeResolverInput,
  AiScreenRuntimeResponse,
} from "./aiScreenRuntimeTypes";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 20;

function normalizeLimit(limit: number | undefined): number {
  if (!Number.isFinite(limit)) return DEFAULT_LIMIT;
  const whole = Math.trunc(limit ?? DEFAULT_LIMIT);
  if (whole < 1) return 1;
  if (whole > MAX_LIMIT) return MAX_LIMIT;
  return whole;
}

function normalizeCursor(cursor: string | null | undefined): number | null {
  if (cursor === undefined || cursor === null || cursor.trim().length === 0) return 0;
  if (!/^\d+$/.test(cursor.trim())) return null;
  return Number(cursor.trim());
}

function capabilityForIntent(intent: AiScreenRuntimeIntent): AiCapability {
  if (intent === "search") return "search";
  if (intent === "compare") return "compare";
  if (intent === "draft" || intent.startsWith("prepare_")) return "draft";
  if (intent === "submit_for_approval") return "submit_for_approval";
  if (intent === "approve") return "approve_action";
  if (intent === "execute_approved") return "execute_approved_action";
  if (intent === "read") return "read_context";
  return "explain";
}

function blockedResponse(params: {
  input: AiScreenRuntimeResolverInput;
  domain?: AiDomain;
  reason: string;
}): AiScreenRuntimeResponse {
  return assertAiScreenRuntimeResponseSafe({
    status: "blocked",
    screenId: params.input.request.screenId,
    role: params.input.auth?.role ?? "unknown",
    domain: params.domain ?? "control",
    cards: [],
    availableIntents: [],
    blockedIntents: [{ intent: "*", reason: params.reason }],
    evidenceRefs: [],
    nextCursor: null,
    approvalBoundary: {
      requiredForRiskyActions: true,
      finalMutationAllowed: false,
    },
    roleScoped: true,
    evidenceBacked: true,
    readOnly: true,
    mutationCount: 0,
    directMutationAllowed: false,
    silentSubmitAllowed: false,
    providerCalled: false,
    dbAccessedDirectly: false,
    rawDbRowsExposed: false,
    rawPromptExposed: false,
    providerPayloadStored: false,
    fakeCards: false,
    hardcodedAiResponse: false,
    roleLeakageObserved: false,
    source: "runtime:ai_screen_runtime_matrix_v1",
  });
}

function notMountedResponse(input: AiScreenRuntimeResolverInput, reason: string): AiScreenRuntimeResponse {
  const entry = getAiScreenRuntimeEntry(input.request.screenId);
  const evidenceRefs = entry
    ? buildAiScreenRuntimeRegistryEvidence({
        screenId: entry.screenId,
        producerName: entry.producerName,
        entityTypes: entry.entityTypes,
      })
    : [];
  return assertAiScreenRuntimeResponseSafe({
    status: "not_mounted",
    screenId: input.request.screenId,
    role: input.auth?.role ?? "unknown",
    domain: entry?.domain ?? "documents",
    cards: [],
    availableIntents: [],
    blockedIntents: [{ intent: "*", reason }],
    evidenceRefs,
    nextCursor: null,
    approvalBoundary: {
      requiredForRiskyActions: true,
      finalMutationAllowed: false,
    },
    roleScoped: true,
    evidenceBacked: true,
    readOnly: true,
    mutationCount: 0,
    directMutationAllowed: false,
    silentSubmitAllowed: false,
    providerCalled: false,
    dbAccessedDirectly: false,
    rawDbRowsExposed: false,
    rawPromptExposed: false,
    providerPayloadStored: false,
    fakeCards: false,
    hardcodedAiResponse: false,
    roleLeakageObserved: false,
    source: "runtime:ai_screen_runtime_matrix_v1",
  });
}

function allowedIntentsForRole(params: {
  role: NonNullable<AiScreenRuntimeResolverInput["auth"]>["role"];
  domain: AiDomain;
  intents: readonly AiScreenRuntimeIntent[];
}): string[] {
  return params.intents.filter((intent) =>
    canUseAiCapability({
      role: params.role,
      domain: params.domain,
      capability: capabilityForIntent(intent),
      viaApprovalGate: intent === "execute_approved",
    }),
  );
}

function blockedIntentsForRole(params: {
  role: NonNullable<AiScreenRuntimeResolverInput["auth"]>["role"];
  domain: AiDomain;
  availableIntents: readonly AiScreenRuntimeIntent[];
  blockedIntents: readonly AiScreenRuntimeIntent[];
}): AiScreenRuntimeBlockedIntent[] {
  const explicit = params.blockedIntents.map((intent) => ({
    intent,
    reason: "Blocked by screen runtime registry.",
  }));
  const denied = params.availableIntents
    .filter(
      (intent) =>
        !canUseAiCapability({
          role: params.role,
          domain: params.domain,
          capability: capabilityForIntent(intent),
          viaApprovalGate: intent === "execute_approved",
        }),
    )
    .map((intent) => ({
      intent,
      reason: "Blocked by role/domain capability policy.",
    }));
  return [...explicit, ...denied];
}

export function resolveAiScreenRuntime(input: AiScreenRuntimeResolverInput): AiScreenRuntimeResponse {
  if (!input.auth || input.auth.userId.trim().length === 0 || input.auth.role === "unknown") {
    return blockedResponse({
      input,
      reason: "AI screen runtime requires authenticated role context.",
    });
  }

  const entry = getAiScreenRuntimeEntry(input.request.screenId);
  if (!entry) {
    return blockedResponse({
      input,
      reason: "AI screen runtime screenId is not registered.",
    });
  }

  if (entry.mounted !== "mounted") {
    return notMountedResponse(input, "AI screen runtime entry is future_or_not_mounted.");
  }

  if (!entry.allowedRoles.includes(input.auth.role)) {
    return blockedResponse({
      input,
      domain: entry.domain,
      reason: "AI role cannot access this screen runtime.",
    });
  }

  const offset = normalizeCursor(input.request.cursor);
  if (offset === null) {
    return blockedResponse({
      input,
      domain: entry.domain,
      reason: "AI screen runtime cursor must be a non-negative integer string.",
    });
  }

  const registryEvidence = buildAiScreenRuntimeRegistryEvidence({
    screenId: entry.screenId,
    producerName: entry.producerName,
    entityTypes: entry.entityTypes,
  });
  const evidenceRefs = normalizeAiScreenRuntimeEvidenceRefs([
    ...evidenceIds(registryEvidence),
    ...(input.evidence?.evidenceRefs ?? []),
  ]);
  const producer = getAiScreenRuntimeProducer(entry.producerName);
  if (!producer) {
    return blockedResponse({
      input,
      domain: entry.domain,
      reason: "AI screen runtime producer is not registered.",
    });
  }

  const produced = producer.produce({
    auth: input.auth,
    entry,
    evidenceRefs,
    evidence: input.evidence ?? null,
  });
  const safeCards = produced.cards.map(redactAiScreenRuntimeCard);
  const limit = normalizeLimit(input.request.limit);
  const pageCards = safeCards.slice(offset, offset + limit);
  const nextOffset = offset + pageCards.length;
  const nextCursor = nextOffset < safeCards.length ? String(nextOffset) : null;
  const status = pageCards.length > 0 ? "loaded" : "empty";
  const availableIntents = allowedIntentsForRole({
    role: input.auth.role,
    domain: entry.domain,
    intents: entry.availableIntents,
  });
  const blockedIntents = [
    ...blockedIntentsForRole({
      role: input.auth.role,
      domain: entry.domain,
      availableIntents: entry.availableIntents,
      blockedIntents: entry.blockedIntents,
    }),
    ...produced.blockedIntents,
  ];

  return assertAiScreenRuntimeResponseSafe({
    status,
    screenId: entry.screenId,
    role: input.auth.role,
    domain: entry.domain,
    cards: pageCards,
    availableIntents,
    blockedIntents,
    evidenceRefs: [...registryEvidence, ...produced.evidenceRefs],
    nextCursor,
    approvalBoundary: {
      requiredForRiskyActions: true,
      finalMutationAllowed: false,
    },
    roleScoped: true,
    evidenceBacked: true,
    readOnly: true,
    mutationCount: 0,
    directMutationAllowed: false,
    silentSubmitAllowed: false,
    providerCalled: false,
    dbAccessedDirectly: false,
    rawDbRowsExposed: false,
    rawPromptExposed: false,
    providerPayloadStored: false,
    fakeCards: false,
    hardcodedAiResponse: false,
    roleLeakageObserved: false,
    source: "runtime:ai_screen_runtime_matrix_v1",
  });
}
