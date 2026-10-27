import type { AiDocumentSourceEntry } from "../knowledge/aiKnowledgeTypes";
import { AI_DOCUMENT_SOURCE_REGISTRY, REQUIRED_AI_DOCUMENT_SOURCE_GROUPS } from "../knowledge/aiDocumentSourceRegistry";
import { hasDirectorFullAiAccess } from "../policy/aiRolePolicy";
import type {
  AiDocumentEvidenceRef,
  AiDocumentKnowledgeAuthContext,
  AiDocumentKnowledgeCard,
} from "./aiDocumentKnowledgeTypes";
import {
  AI_DOCUMENT_ROUTE_GREEN_STATUS,
  verifyAiDocumentRouteRegistry,
} from "./aiDocumentRouteRegistry";

export const AI_DOCUMENT_EVIDENCE_CONTRACT = Object.freeze({
  contractId: "ai_document_evidence_resolver_v1",
  evidenceRequired: true,
  redactedOnly: true,
  rawContentReturned: false,
  rawRowsReturned: false,
  secretsReturned: false,
  mutationCount: 0,
  dbWrites: 0,
  externalLiveFetch: false,
} as const);

export type AiDocumentEvidenceResolverStatus = "loaded" | "empty" | "blocked";

export type AiDocumentEvidenceResolverInput = {
  auth: AiDocumentKnowledgeAuthContext | null;
  screenId?: "documents.main";
  query?: string;
  limit?: number;
};

export type AiDocumentEvidenceResolution = {
  status: AiDocumentEvidenceResolverStatus;
  screenId: "documents.main";
  routeFinalStatus: ReturnType<typeof verifyAiDocumentRouteRegistry>["finalStatus"];
  exactReason: string | null;
  canonicalAliasReady: boolean;
  documentsMainUiRouteRegistered: false;
  documentKnowledgeBffReady: boolean;
  documentSearchBffReady: boolean;
  documentSummaryPreviewReady: boolean;
  approvalRouteReady: boolean;
  roleScoped: true;
  evidenceBacked: boolean;
  sourceRegistryGroupsRegistered: boolean;
  sourceIds: readonly string[];
  documentIds: readonly string[];
  evidenceRefs: readonly AiDocumentEvidenceRef[];
  safeReadOnly: true;
  draftOnly: true;
  approvalRequiredForSend: true;
  signingAllowed: false;
  finalSubmitAllowed: false;
  deletionAllowed: false;
  rawContentReturned: false;
  rawRowsReturned: false;
  secretsReturned: false;
  mutationCount: 0;
  dbWrites: 0;
  externalLiveFetch: false;
  providerCalled: false;
  fakeDocuments: false;
};

function normalizeLimit(limit: number | undefined): number {
  if (!Number.isFinite(limit)) return 20;
  return Math.min(50, Math.max(1, Math.floor(limit ?? 20)));
}

function sourceVisibleToRole(source: AiDocumentSourceEntry, auth: AiDocumentKnowledgeAuthContext): boolean {
  return hasDirectorFullAiAccess(auth.role) || source.readableByRoles.includes(auth.role);
}

function matchesEvidenceQuery(source: AiDocumentSourceEntry, query: string): boolean {
  if (!query) return true;
  const haystack = [
    source.sourceId,
    source.kind,
    source.domains.join(" "),
    source.contextPolicy,
  ].join(" ").toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => haystack.includes(token));
}

function buildBlockedEvidenceResolution(
  exactReason: string,
  routeFinalStatus: AiDocumentEvidenceResolution["routeFinalStatus"],
): AiDocumentEvidenceResolution {
  return {
    status: "blocked",
    screenId: "documents.main",
    routeFinalStatus,
    exactReason,
    canonicalAliasReady: false,
    documentsMainUiRouteRegistered: false,
    documentKnowledgeBffReady: false,
    documentSearchBffReady: false,
    documentSummaryPreviewReady: false,
    approvalRouteReady: false,
    roleScoped: true,
    evidenceBacked: false,
    sourceRegistryGroupsRegistered: false,
    sourceIds: [],
    documentIds: [],
    evidenceRefs: [],
    safeReadOnly: true,
    draftOnly: true,
    approvalRequiredForSend: true,
    signingAllowed: false,
    finalSubmitAllowed: false,
    deletionAllowed: false,
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

export function buildAiDocumentSourceEvidence(
  source: Pick<AiDocumentSourceEntry, "sourceId">,
): AiDocumentEvidenceRef[] {
  return [
    {
      type: "document_source",
      ref: `document_source:${source.sourceId}`,
      sourceId: source.sourceId,
      redacted: true,
      rawContentReturned: false,
      rawRowsReturned: false,
    },
  ];
}

export function buildAiDocumentCardEvidence(card: Pick<AiDocumentKnowledgeCard, "documentId" | "sourceId">): AiDocumentEvidenceRef[] {
  return [
    ...buildAiDocumentSourceEvidence({ sourceId: card.sourceId }),
    {
      type: "document_card",
      ref: `document_card:${card.documentId}`,
      sourceId: card.sourceId,
      redacted: true,
      rawContentReturned: false,
      rawRowsReturned: false,
    },
  ];
}

export function aiDocumentEvidenceComplete(card: Pick<AiDocumentKnowledgeCard, "evidenceRefs">): boolean {
  return (
    card.evidenceRefs.length > 0 &&
    card.evidenceRefs.every(
      (evidence) =>
        evidence.redacted === true &&
        evidence.rawContentReturned === false &&
        evidence.rawRowsReturned === false &&
        evidence.ref.trim().length > 0,
    )
  );
}

export function resolveAiDocumentEvidence(
  input: AiDocumentEvidenceResolverInput,
): AiDocumentEvidenceResolution {
  const routeSummary = verifyAiDocumentRouteRegistry();
  if (routeSummary.finalStatus !== AI_DOCUMENT_ROUTE_GREEN_STATUS) {
    return buildBlockedEvidenceResolution(
      routeSummary.exactReason ?? "AI document route registry is not green.",
      routeSummary.finalStatus,
    );
  }

  if (!input.auth || !input.auth.userId.trim() || input.auth.role === "unknown") {
    return buildBlockedEvidenceResolution(
      "AI document evidence requires authenticated role context.",
      routeSummary.finalStatus,
    );
  }

  const query = String(input.query ?? "").trim();
  const visibleSources = AI_DOCUMENT_SOURCE_REGISTRY
    .filter((source) => sourceVisibleToRole(source, input.auth!))
    .filter((source) => matchesEvidenceQuery(source, query))
    .slice(0, normalizeLimit(input.limit));
  const evidenceRefs = visibleSources.flatMap((source) =>
    buildAiDocumentCardEvidence({
      documentId: `docsrc:${source.sourceId}`,
      sourceId: source.sourceId,
    }),
  );
  const sourceRegistryGroupsRegistered = REQUIRED_AI_DOCUMENT_SOURCE_GROUPS.every((sourceId) =>
    AI_DOCUMENT_SOURCE_REGISTRY.some((source) => source.sourceId === sourceId),
  );
  const evidenceBacked = evidenceRefs.length > 0 && aiDocumentEvidenceComplete({ evidenceRefs });

  return {
    status: visibleSources.length > 0 ? "loaded" : "empty",
    screenId: "documents.main",
    routeFinalStatus: routeSummary.finalStatus,
    exactReason:
      visibleSources.length > 0
        ? null
        : "No role-scoped document evidence sources matched the requested document query.",
    canonicalAliasReady: routeSummary.canonicalAliasReady,
    documentsMainUiRouteRegistered: false,
    documentKnowledgeBffReady: routeSummary.requiredBffRoutes.includes("GET /agent/documents/knowledge"),
    documentSearchBffReady: routeSummary.requiredBffRoutes.includes("POST /agent/documents/search"),
    documentSummaryPreviewReady: routeSummary.requiredBffRoutes.includes("POST /agent/documents/summarize-preview"),
    approvalRouteReady: routeSummary.requiredBffRoutes.includes("POST /agent/action/submit-for-approval"),
    roleScoped: true,
    evidenceBacked,
    sourceRegistryGroupsRegistered,
    sourceIds: visibleSources.map((source) => source.sourceId),
    documentIds: visibleSources.map((source) => `docsrc:${source.sourceId}`),
    evidenceRefs,
    safeReadOnly: true,
    draftOnly: true,
    approvalRequiredForSend: true,
    signingAllowed: false,
    finalSubmitAllowed: false,
    deletionAllowed: false,
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
