import {
  AI_DOCUMENT_SOURCE_REGISTRY,
  getAiDocumentSource,
} from "./aiDocumentSourceRegistry";
import {
  AI_ENTITY_KNOWLEDGE_REGISTRY,
  getAiEntityKnowledge,
} from "./aiEntityRegistry";
import { AI_INTENT_REGISTRY, getAiIntentKnowledge } from "./aiIntentRegistry";
import {
  getAiScreenKnowledge,
} from "./aiScreenKnowledgeRegistry";
import type {
  AiBusinessDomain,
  AiBusinessEntity,
  AiDocumentSourceEntry,
  AiIntent,
  AiKnowledgeResolveParams,
  AiResolvedIntent,
  AiResolvedScreenKnowledge,
} from "./aiKnowledgeTypes";
import { assertAiKnowledgeTextSafe } from "./aiKnowledgeRedaction";
import {
  canUseAiCapability,
  hasDirectorFullAiAccess,
  type AiCapability,
  type AiDomain,
} from "../policy/aiRolePolicy";

const PROFESSIONAL_ANSWER_REQUIREMENTS: readonly string[] = [
  "short conclusion",
  "what was found",
  "risks",
  "next action",
  "approval requirement",
  "hidden or unavailable data by role",
];

const DENIED_SCREEN_TITLE = "Unregistered AI screen";

function mapBusinessDomainToPolicyDomain(domain: AiBusinessDomain): AiDomain {
  switch (domain) {
    case "projects":
      return "projects";
    case "procurement":
      return "procurement";
    case "marketplace":
      return "marketplace";
    case "warehouse":
      return "warehouse";
    case "finance":
      return "finance";
    case "reports":
      return "reports";
    case "documents":
      return "documents";
    case "subcontracts":
    case "contractors":
      return "subcontracts";
    case "map":
      return "map";
    case "chat":
      return "chat";
    case "control":
    case "office":
    case "real_estate_future":
    default:
      return "control";
  }
}

function mapIntentToCapability(intent: AiIntent): AiCapability {
  switch (intent) {
    case "find":
      return "search";
    case "summarize":
      return "summarize";
    case "compare":
      return "compare";
    case "explain":
    case "check_status":
    case "find_risk":
      return "explain";
    case "draft":
    case "prepare_report":
    case "prepare_act":
    case "prepare_request":
      return "draft";
    case "submit_for_approval":
      return "submit_for_approval";
    case "approve":
      return "approve_action";
    case "execute_approved":
      return "execute_approved_action";
    default:
      return "read_context";
  }
}

function uniqueValues<T extends string>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function filterEntitiesByRole(params: {
  role: AiKnowledgeResolveParams["role"];
  entities: readonly AiBusinessEntity[];
  fullDomainKnowledge: boolean;
}): AiBusinessEntity[] {
  if (params.role === "unknown") return [];
  if (params.fullDomainKnowledge) return [...params.entities];

  return params.entities.filter((entity) => {
    const entry = getAiEntityKnowledge(entity);
    if (!entry) return false;
    return entry.readableByRoles.includes(params.role);
  });
}

function resolveDocumentSources(params: {
  role: AiKnowledgeResolveParams["role"];
  sourceIds: readonly string[];
  fullDomainKnowledge: boolean;
}): AiDocumentSourceEntry[] {
  if (params.role === "unknown") return [];

  return uniqueValues(params.sourceIds)
    .map(getAiDocumentSource)
    .filter((entry): entry is AiDocumentSourceEntry => Boolean(entry))
    .filter((entry) => params.fullDomainKnowledge || entry.readableByRoles.includes(params.role));
}

function resolveIntent(params: {
  intent: AiIntent;
  role: AiKnowledgeResolveParams["role"];
  domain: AiBusinessDomain;
  screenAllowed: boolean;
  fullDomainKnowledge: boolean;
}): AiResolvedIntent {
  const intentEntry = getAiIntentKnowledge(params.intent);
  const riskLevel = intentEntry?.defaultRisk ?? "forbidden";
  const requiresApproval = intentEntry?.requiresApproval ?? true;

  if (!intentEntry) {
    return {
      intent: params.intent,
      allowed: false,
      riskLevel: "forbidden",
      requiresApproval: false,
      reason: "Intent is not registered in AI knowledge registry",
    };
  }

  if (params.role === "unknown") {
    return {
      intent: params.intent,
      allowed: false,
      riskLevel,
      requiresApproval,
      reason: "Unknown AI role is denied by default",
    };
  }

  if (!params.screenAllowed) {
    return {
      intent: params.intent,
      allowed: false,
      riskLevel,
      requiresApproval,
      reason: "Intent is blocked by screen knowledge registry",
    };
  }

  const capability = mapIntentToCapability(params.intent);
  const policyDomain = mapBusinessDomainToPolicyDomain(params.domain);
  const capabilityAllowed =
    params.fullDomainKnowledge ||
    canUseAiCapability({
      role: params.role,
      domain: policyDomain,
      capability,
      viaApprovalGate: params.intent === "execute_approved",
    });

  return {
    intent: params.intent,
    allowed: capabilityAllowed,
    riskLevel,
    requiresApproval,
    reason: capabilityAllowed
      ? "Intent allowed by role, screen, and knowledge policy"
      : `Role ${params.role} cannot use ${capability} for ${params.domain}`,
  };
}

function buildFallbackKnowledge(params: AiKnowledgeResolveParams): AiResolvedScreenKnowledge {
  const blockedIntents = AI_INTENT_REGISTRY.map((entry) =>
    resolveIntent({
      intent: entry.intent,
      role: params.role,
      domain: "chat",
      screenAllowed: false,
      fullDomainKnowledge: false,
    }),
  );

  return {
    role: params.role,
    screenId: params.screenId,
    domain: "chat",
    screenTitle: DENIED_SCREEN_TITLE,
    contextPolicy: "none",
    allowedEntities: [],
    allowedIntents: [],
    blockedIntents,
    documentSourceIds: [],
    reportSourceIds: [],
    pdfSourceIds: [],
    approvalBoundarySummary: "No AI app knowledge is available for this unregistered screen.",
    redactionPolicy: "none",
    professionalAnswerRequirements: PROFESSIONAL_ANSWER_REQUIREMENTS,
    fullDomainKnowledge: false,
  };
}

export function resolveAiScreenKnowledge(
  params: AiKnowledgeResolveParams,
): AiResolvedScreenKnowledge {
  const screen = getAiScreenKnowledge(params.screenId);
  if (!screen || params.role === "unknown") {
    return buildFallbackKnowledge(params);
  }

  const fullDomainKnowledge = hasDirectorFullAiAccess(params.role);
  const baseEntities = fullDomainKnowledge
    ? AI_ENTITY_KNOWLEDGE_REGISTRY.map((entry) => entry.entity)
    : screen.availableEntities;
  const allowedEntities = filterEntitiesByRole({
    role: params.role,
    entities: uniqueValues(baseEntities),
    fullDomainKnowledge,
  });
  const knownSourceIds = [
    ...screen.documentSources,
    ...screen.reportSources,
    ...screen.pdfSources,
    ...(fullDomainKnowledge ? AI_DOCUMENT_SOURCE_REGISTRY.map((entry) => entry.sourceId) : []),
  ];
  const documentSources = resolveDocumentSources({
    role: params.role,
    sourceIds: knownSourceIds,
    fullDomainKnowledge,
  });
  const screenIntentSet = new Set(screen.allowedIntents);
  const allowedIntents: AiResolvedIntent[] = [];
  const blockedIntents: AiResolvedIntent[] = [];

  for (const intentEntry of AI_INTENT_REGISTRY) {
    const screenAllowed = fullDomainKnowledge || screenIntentSet.has(intentEntry.intent);
    const resolved = resolveIntent({
      intent: intentEntry.intent,
      role: params.role,
      domain: screen.domain,
      screenAllowed,
      fullDomainKnowledge,
    });
    if (resolved.allowed) {
      allowedIntents.push(resolved);
    } else {
      blockedIntents.push(resolved);
    }
  }

  return {
    role: params.role,
    screenId: screen.screenId,
    domain: screen.domain,
    screenTitle: screen.title,
    contextPolicy: fullDomainKnowledge ? "director_full" : screen.contextPolicy,
    allowedEntities,
    allowedIntents,
    blockedIntents,
    documentSourceIds: uniqueValues(documentSources.map((entry) => entry.sourceId)),
    reportSourceIds: uniqueValues(screen.reportSources.filter((sourceId) => documentSources.some((entry) => entry.sourceId === sourceId))),
    pdfSourceIds: uniqueValues(screen.pdfSources.filter((sourceId) => documentSources.some((entry) => entry.sourceId === sourceId))),
    approvalBoundarySummary:
      "Read, explain, compare, and draft are safe only within role scope. High-risk submit, send, approve, confirm, payment, order, or stock mutation requires aiApprovalGate and audit.",
    redactionPolicy: fullDomainKnowledge ? "director_full" : screen.contextPolicy,
    professionalAnswerRequirements: PROFESSIONAL_ANSWER_REQUIREMENTS,
    fullDomainKnowledge,
  };
}

export function resolveAiRoleScreenIntents(params: AiKnowledgeResolveParams): AiResolvedIntent[] {
  return [...resolveAiScreenKnowledge(params).allowedIntents];
}

export function resolveAiAvailableEntities(params: AiKnowledgeResolveParams): AiBusinessEntity[] {
  return [...resolveAiScreenKnowledge(params).allowedEntities];
}

export function resolveAiDocumentSources(params: AiKnowledgeResolveParams): AiDocumentSourceEntry[] {
  const knowledge = resolveAiScreenKnowledge(params);
  return knowledge.documentSourceIds
    .map(getAiDocumentSource)
    .filter((entry): entry is AiDocumentSourceEntry => Boolean(entry));
}

export function buildAiKnowledgePromptBlock(params: AiKnowledgeResolveParams): string {
  const knowledge = resolveAiScreenKnowledge(params);
  const allowedIntentLabels = knowledge.allowedIntents.map((entry) =>
    entry.requiresApproval ? `${entry.intent}:approval_required` : `${entry.intent}:${entry.riskLevel}`,
  );
  const blockedIntentLabels = knowledge.blockedIntents.map((entry) => `${entry.intent}:${entry.reason}`);
  const lines = [
    "AI APP KNOWLEDGE BLOCK",
    `role: ${knowledge.role}`,
    `screenId: ${knowledge.screenId}`,
    `domain: ${knowledge.domain}`,
    `screenTitle: ${knowledge.screenTitle}`,
    `contextPolicy: ${knowledge.contextPolicy}`,
    `allowedEntities: ${knowledge.allowedEntities.join(", ") || "none"}`,
    `allowedIntents: ${allowedIntentLabels.join(", ") || "none"}`,
    `blockedIntents: ${blockedIntentLabels.join(" | ") || "none"}`,
    `documentSources: ${knowledge.documentSourceIds.join(", ") || "none"}`,
    `reportSources: ${knowledge.reportSourceIds.join(", ") || "none"}`,
    `pdfSources: ${knowledge.pdfSourceIds.join(", ") || "none"}`,
    `approvalBoundary: ${knowledge.approvalBoundarySummary}`,
    `redactionPolicy: ${knowledge.redactionPolicy}`,
    `professionalAnswerRequirements: ${knowledge.professionalAnswerRequirements.join(", ")}`,
    "rawDocumentContent: unavailable",
    "rawPdfContent: unavailable",
    "rawAttachmentContent: unavailable",
  ];
  return assertAiKnowledgeTextSafe({
    text: lines.join("\n"),
    role: params.role,
  }).redactedText;
}
