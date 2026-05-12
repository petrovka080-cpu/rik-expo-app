import type { AiUserRole } from "../policy/aiRolePolicy";
import { actionsForAiScreenRuntimeEntry } from "./aiScreenRuntimeActionPolicy";
import {
  evidenceIds,
  hasAiScreenRuntimeEvidence,
  normalizeAiScreenRuntimeEvidenceRefs,
  toAiScreenRuntimeEvidenceRefs,
} from "./aiScreenRuntimeEvidence";
import { toAiScreenRuntimeOpaqueHash } from "./aiScreenRuntimeRedaction";
import type {
  AiScreenRuntimeCard,
  AiScreenRuntimeProducer,
  AiScreenRuntimeProducerMetadata,
  AiScreenRuntimeProducerName,
  AiScreenRuntimeProducerResult,
} from "./aiScreenRuntimeTypes";

function metadata(params: Omit<AiScreenRuntimeProducerMetadata, "requiredEvidence" | "mutationCount">): AiScreenRuntimeProducerMetadata {
  return {
    ...params,
    requiredEvidence: true,
    mutationCount: 0,
  };
}

function roleAllowed(role: AiUserRole, roles: readonly AiUserRole[]): boolean {
  return role !== "unknown" && roles.includes(role);
}

function emptyResult(): AiScreenRuntimeProducerResult {
  return { cards: [], evidenceRefs: [], blockedIntents: [] };
}

function cardFromContext(
  context: Parameters<AiScreenRuntimeProducer["produce"]>[0],
): AiScreenRuntimeCard {
  const evidenceRefs = normalizeAiScreenRuntimeEvidenceRefs(context.evidenceRefs);
  return {
    id: `screen-runtime-${context.entry.screenId}`,
    screenId: context.entry.screenId,
    domain: context.entry.domain,
    type: context.entry.cardType,
    title: context.entry.cardTitle,
    summary: context.entry.cardSummary,
    priority: context.entry.priority,
    evidenceRefs,
    allowedActions: actionsForAiScreenRuntimeEntry(context.entry),
    requiresApproval: context.entry.approvalRequired,
    sourceEntityType: context.evidence?.sourceEntityType ?? context.entry.entityTypes[0] ?? "screen_runtime",
    sourceEntityIdHash:
      context.evidence?.sourceEntityIdHash ??
      toAiScreenRuntimeOpaqueHash("screen", context.entry.screenId),
  };
}

function produceOne(
  context: Parameters<AiScreenRuntimeProducer["produce"]>[0],
  roles: readonly AiUserRole[],
): AiScreenRuntimeProducerResult {
  if (!roleAllowed(context.auth.role, roles)) return emptyResult();
  if (!hasAiScreenRuntimeEvidence(context.evidenceRefs)) return emptyResult();

  const card = cardFromContext(context);
  const evidence = toAiScreenRuntimeEvidenceRefs({
    ids: card.evidenceRefs,
    labelPrefix: context.entry.screenId,
    source: "runtime_policy",
  });
  return {
    cards: [card],
    evidenceRefs: evidence,
    blockedIntents: context.entry.blockedIntents.map((intent) => ({
      intent,
      reason: "Blocked by screen runtime action policy.",
    })),
  };
}

function makeProducer(params: {
  name: AiScreenRuntimeProducerName;
  roles: readonly AiUserRole[];
  domain: AiScreenRuntimeProducerMetadata["domain"];
  maxCards: number;
  riskLevel: AiScreenRuntimeProducerMetadata["riskLevel"];
}): AiScreenRuntimeProducer {
  return {
    metadata: metadata({
      name: params.name,
      domain: params.domain,
      allowedRoles: params.roles,
      maxCards: params.maxCards,
      riskLevel: params.riskLevel,
    }),
    produce(context) {
      return produceOne(context, params.roles);
    },
  };
}

const operationsRoles: readonly AiUserRole[] = [
  "director",
  "control",
  "foreman",
  "buyer",
  "accountant",
  "warehouse",
  "contractor",
  "office",
  "admin",
];

export const directorControlProducer = makeProducer({
  name: "directorControlProducer",
  roles: operationsRoles,
  domain: "control",
  maxCards: 2,
  riskLevel: "approval_required",
});

export const accountantFinanceProducer = makeProducer({
  name: "accountantFinanceProducer",
  roles: ["director", "control", "accountant"],
  domain: "finance",
  maxCards: 2,
  riskLevel: "approval_required",
});

export const buyerProcurementProducer = makeProducer({
  name: "buyerProcurementProducer",
  roles: ["director", "control", "buyer", "foreman"],
  domain: "procurement",
  maxCards: 2,
  riskLevel: "draft_only",
});

export const foremanObjectProducer = makeProducer({
  name: "foremanObjectProducer",
  roles: ["director", "control", "foreman"],
  domain: "projects",
  maxCards: 2,
  riskLevel: "draft_only",
});

export const warehouseStatusProducer = makeProducer({
  name: "warehouseStatusProducer",
  roles: ["director", "control", "warehouse"],
  domain: "warehouse",
  maxCards: 2,
  riskLevel: "approval_required",
});

export const contractorOwnWorkProducer = makeProducer({
  name: "contractorOwnWorkProducer",
  roles: ["director", "control", "contractor"],
  domain: "subcontracts",
  maxCards: 1,
  riskLevel: "approval_required",
});

export const officeAccessProducer = makeProducer({
  name: "officeAccessProducer",
  roles: ["director", "control", "office", "admin"],
  domain: "control",
  maxCards: 1,
  riskLevel: "approval_required",
});

export const mapObjectProducer = makeProducer({
  name: "mapObjectProducer",
  roles: ["director", "control", "buyer", "foreman"],
  domain: "map",
  maxCards: 1,
  riskLevel: "safe_read",
});

export const chatContextProducer = makeProducer({
  name: "chatContextProducer",
  roles: operationsRoles,
  domain: "chat",
  maxCards: 1,
  riskLevel: "approval_required",
});

export const reportsDocumentsProducer = makeProducer({
  name: "reportsDocumentsProducer",
  roles: operationsRoles,
  domain: "reports",
  maxCards: 2,
  riskLevel: "draft_only",
});

export const AI_SCREEN_RUNTIME_PRODUCERS: readonly AiScreenRuntimeProducer[] = [
  directorControlProducer,
  accountantFinanceProducer,
  buyerProcurementProducer,
  foremanObjectProducer,
  warehouseStatusProducer,
  contractorOwnWorkProducer,
  officeAccessProducer,
  mapObjectProducer,
  chatContextProducer,
  reportsDocumentsProducer,
] as const;

export function getAiScreenRuntimeProducer(
  name: AiScreenRuntimeProducerName,
): AiScreenRuntimeProducer | null {
  return AI_SCREEN_RUNTIME_PRODUCERS.find((producer) => producer.metadata.name === name) ?? null;
}

export function allAiScreenRuntimeProducerCardsRequireEvidence(): boolean {
  return AI_SCREEN_RUNTIME_PRODUCERS.every((producer) => {
    const result = producer.produce({
      auth: { userId: "architecture", role: producer.metadata.allowedRoles[0] ?? "unknown" },
      entry: {
        screenId: `architecture.${producer.metadata.name}`,
        domain: producer.metadata.domain,
        mounted: "mounted",
        producerName: producer.metadata.name,
        allowedRoles: producer.metadata.allowedRoles,
        entityTypes: ["architecture"],
        availableIntents: ["read"],
        blockedIntents: [],
        cardType: "task",
        cardTitle: "Architecture runtime",
        cardSummary: "Architecture proof card.",
        priority: "normal",
        approvalRequired: false,
        evidenceRequired: true,
        maxCards: 1,
        source: "ai_cross_screen_runtime_registry_v1",
      },
      evidenceRefs: evidenceIds([]),
      evidence: null,
    });
    return result.cards.length === 0;
  });
}
