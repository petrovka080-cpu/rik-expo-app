import type { AiDocumentSourceKind } from "../knowledge/aiKnowledgeTypes";
import {
  buildAiDocumentCardEvidence,
  aiDocumentEvidenceComplete,
} from "./aiDocumentEvidenceResolver";
import { validateAiDocumentKnowledgeRedaction } from "./aiDocumentRedactionPolicy";
import {
  getAiDocumentKnowledgeCard,
  resolveAiDocumentKnowledge,
} from "./aiDocumentKnowledgeRegistry";
import type {
  AiDocumentKnowledgeAuthContext,
  AiDocumentKnowledgeCard,
  AiDocumentKnowledgeQuery,
  AiDocumentSearchPreview,
  AiDocumentSummaryPreview,
} from "./aiDocumentKnowledgeTypes";

export const AI_DOCUMENT_SEARCH_PREVIEW_CONTRACT = Object.freeze({
  contractId: "ai_document_search_preview_v1",
  backendFirst: true,
  roleScoped: true,
  evidenceBacked: true,
  deterministicPreview: true,
  readOnly: true,
  rawContentReturned: false,
  rawRowsReturned: false,
  secretsReturned: false,
  mutationCount: 0,
  dbWrites: 0,
  externalLiveFetch: false,
  providerCalled: false,
  fakeDocuments: false,
} as const);

function normalizeLimit(limit: number | undefined): number {
  if (!Number.isFinite(limit)) return 20;
  return Math.min(50, Math.max(1, Math.floor(limit ?? 20)));
}

function matchesQuery(card: AiDocumentKnowledgeCard, query: string): boolean {
  if (!query) return true;
  const haystack = [
    card.sourceId,
    card.redactedTitle,
    card.documentType,
    card.domains.join(" "),
    card.contextPolicy,
  ].join(" ").toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => haystack.includes(token));
}

function matchesType(card: AiDocumentKnowledgeCard, type: AiDocumentSourceKind | "any" | undefined): boolean {
  return !type || type === "any" || card.documentType === type;
}

function matchesSource(card: AiDocumentKnowledgeCard, sourceIds: readonly string[] | undefined): boolean {
  if (!sourceIds || sourceIds.length === 0) return true;
  const wanted = new Set(sourceIds.map((id) => id.trim()).filter(Boolean));
  return wanted.size === 0 || wanted.has(card.sourceId) || wanted.has(card.documentId);
}

export function searchAiDocumentKnowledgePreview(
  auth: AiDocumentKnowledgeAuthContext | null,
  input: AiDocumentKnowledgeQuery = {},
): AiDocumentSearchPreview {
  const query = String(input.query ?? "").trim();
  const knowledge = resolveAiDocumentKnowledge(auth);
  const cards = knowledge.cards
    .filter((card) => matchesQuery(card, query))
    .filter((card) => matchesType(card, input.documentType))
    .filter((card) => matchesSource(card, input.sourceIds))
    .slice(0, normalizeLimit(input.limit));

  return {
    status: cards.length > 0 ? "preview" : "empty",
    query,
    cards,
    emptyState:
      cards.length > 0
        ? null
        : {
            reason: knowledge.emptyState?.reason ?? "No role-scoped document knowledge cards matched the preview query.",
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

export function summarizeAiDocumentPreview(
  auth: AiDocumentKnowledgeAuthContext | null,
  documentIdOrSourceId: string,
): AiDocumentSummaryPreview {
  const knowledge = resolveAiDocumentKnowledge(auth);
  const requested = getAiDocumentKnowledgeCard(documentIdOrSourceId);
  const visible = requested
    ? knowledge.cards.find((card) => card.documentId === requested.documentId)
    : null;

  if (!requested) {
    return {
      status: "empty",
      documentId: null,
      sourceId: null,
      redactedTitle: "No document knowledge card",
      documentType: null,
      summaryPreview: "Document knowledge card was not found.",
      evidenceRefs: [],
      canDraft: false,
      sendPolicy: "never",
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

  if (!visible) {
    return {
      status: "blocked",
      documentId: requested.documentId,
      sourceId: requested.sourceId,
      redactedTitle: requested.redactedTitle,
      documentType: requested.documentType,
      summaryPreview: "Document knowledge card is blocked by role scope.",
      evidenceRefs: [],
      canDraft: false,
      sendPolicy: "never",
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

  const evidenceRefs = buildAiDocumentCardEvidence(visible);
  const preview: AiDocumentSummaryPreview = {
    status: visible.canSummarize ? "preview" : "blocked",
    documentId: visible.documentId,
    sourceId: visible.sourceId,
    redactedTitle: visible.redactedTitle,
    documentType: visible.documentType,
    summaryPreview: visible.canSummarize
      ? visible.summaryPreview
      : "This source is registered but summarize preview is disabled by policy.",
    evidenceRefs,
    canDraft: visible.canDraft,
    sendPolicy: visible.sendPolicy,
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
  const redaction = validateAiDocumentKnowledgeRedaction(preview);
  return redaction.ok && aiDocumentEvidenceComplete({ evidenceRefs }) ? preview : {
    ...preview,
    status: "blocked",
    summaryPreview: "Document summary preview was blocked by redaction or evidence policy.",
    evidenceRefs: [],
  };
}
