import {
  AI_DOCUMENT_SOURCE_REGISTRY,
  REQUIRED_AI_DOCUMENT_SOURCE_GROUPS,
} from "../knowledge/aiDocumentSourceRegistry";
import type { AiDocumentSourceEntry } from "../knowledge/aiKnowledgeTypes";
import { hasDirectorFullAiAccess, type AiUserRole } from "../policy/aiRolePolicy";
import { buildAiDocumentSourceEvidence, aiDocumentEvidenceComplete } from "./aiDocumentEvidenceResolver";
import { validateAiDocumentKnowledgeRedaction } from "./aiDocumentRedactionPolicy";
import type {
  AiDocumentKnowledgeAuthContext,
  AiDocumentKnowledgeCard,
  AiDocumentKnowledgeResult,
} from "./aiDocumentKnowledgeTypes";

export const AI_DOCUMENT_KNOWLEDGE_REGISTRY_CONTRACT = Object.freeze({
  contractId: "ai_document_knowledge_registry_v1",
  requiredSourceGroups: REQUIRED_AI_DOCUMENT_SOURCE_GROUPS.length,
  backendFirst: true,
  roleScoped: true,
  evidenceBacked: true,
  readOnly: true,
  rawContentReturned: false,
  rawRowsReturned: false,
  secretsReturned: false,
  mutationCount: 0,
  dbWrites: 0,
  externalLiveFetch: false,
  providerCalled: false,
  fakeDocuments: false,
  hardcodedAiAnswer: false,
} as const);

function sourceVisibleToRole(source: AiDocumentSourceEntry, role: AiUserRole): boolean {
  return hasDirectorFullAiAccess(role) || source.readableByRoles.includes(role);
}

function titleForSource(source: AiDocumentSourceEntry): string {
  return `redacted document source: ${source.sourceId.replace(/_/g, " ")}`;
}

function summaryForSource(source: AiDocumentSourceEntry): string {
  const domains = source.domains.slice(0, 4).join(", ");
  return [
    `Role-scoped ${source.kind} knowledge source.`,
    `Domains: ${domains || "documents"}.`,
    "Raw document content is unavailable; AI may use only redacted metadata and evidence refs.",
  ].join(" ");
}

export function buildAiDocumentKnowledgeCard(source: AiDocumentSourceEntry): AiDocumentKnowledgeCard {
  return {
    documentId: `docsrc:${source.sourceId}`,
    sourceId: source.sourceId,
    redactedTitle: titleForSource(source),
    documentType: source.kind,
    source: "ai_document_source_registry",
    domains: source.domains,
    allowedRoles: source.readableByRoles,
    contextPolicy: source.contextPolicy,
    canSummarize: source.canSummarize,
    canDraft: source.canDraft,
    sendPolicy: source.canSend,
    evidenceRefs: buildAiDocumentSourceEvidence(source),
    summaryPreview: summaryForSource(source),
    rawContentReturned: false,
    rawRowsReturned: false,
    secretsReturned: false,
    mutationCount: 0,
    dbWrites: 0,
    externalLiveFetch: false,
    providerCalled: false,
  };
}

export function listAiDocumentKnowledgeCards(): AiDocumentKnowledgeCard[] {
  return AI_DOCUMENT_SOURCE_REGISTRY.map(buildAiDocumentKnowledgeCard);
}

export function getAiDocumentKnowledgeCard(documentIdOrSourceId: string): AiDocumentKnowledgeCard | null {
  const normalized = documentIdOrSourceId.trim();
  if (!normalized) return null;
  return (
    listAiDocumentKnowledgeCards().find(
      (card) => card.documentId === normalized || card.sourceId === normalized,
    ) ?? null
  );
}

export function resolveAiDocumentKnowledge(
  auth: AiDocumentKnowledgeAuthContext | null,
): AiDocumentKnowledgeResult {
  const role = auth?.role ?? "unknown";
  const visibleCards = listAiDocumentKnowledgeCards().filter((card) =>
    sourceVisibleToRole(
      {
        sourceId: card.sourceId,
        kind: card.documentType,
        domains: card.domains,
        entities: [],
        readableByRoles: card.allowedRoles,
        contextPolicy: card.contextPolicy,
        canSummarize: card.canSummarize,
        canDraft: card.canDraft,
        canSend: card.sendPolicy,
      },
      role,
    ),
  );
  const safeCards = visibleCards.filter((card) => {
    const redaction = validateAiDocumentKnowledgeRedaction(card);
    return redaction.ok && aiDocumentEvidenceComplete(card);
  });

  return {
    status: safeCards.length > 0 ? "loaded" : "empty",
    cards: safeCards,
    emptyState:
      safeCards.length > 0
        ? null
        : {
            reason: "No role-scoped document knowledge sources are available for this role.",
            honestEmptyState: true,
            fakeDocuments: false,
          },
    roleScoped: true,
    evidenceBacked: true,
    readOnly: true,
    rawContentReturned: false,
    rawRowsReturned: false,
    secretsReturned: false,
    mutationCount: 0,
    dbWrites: 0,
    externalLiveFetch: false,
    providerCalled: false,
    fakeDocuments: false,
  };
}
