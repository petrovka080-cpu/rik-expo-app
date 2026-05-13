import type {
  AiBusinessDomain,
  AiDocumentSourceEntry,
  AiDocumentSourceKind,
  AiKnowledgeContextPolicy,
} from "../knowledge/aiKnowledgeTypes";
import type { AiUserRole } from "../policy/aiRolePolicy";

export type AiDocumentEvidenceRef = {
  type: "document_source" | "document_card" | "document_summary_preview";
  ref: string;
  sourceId: string;
  redacted: true;
  rawContentReturned: false;
  rawRowsReturned: false;
};

export type AiDocumentKnowledgeCard = {
  documentId: string;
  sourceId: string;
  redactedTitle: string;
  documentType: AiDocumentSourceKind;
  source: "ai_document_source_registry";
  domains: readonly AiBusinessDomain[];
  allowedRoles: readonly AiUserRole[];
  contextPolicy: AiKnowledgeContextPolicy;
  canSummarize: boolean;
  canDraft: boolean;
  sendPolicy: AiDocumentSourceEntry["canSend"];
  evidenceRefs: readonly AiDocumentEvidenceRef[];
  summaryPreview: string;
  rawContentReturned: false;
  rawRowsReturned: false;
  secretsReturned: false;
  mutationCount: 0;
  dbWrites: 0;
  externalLiveFetch: false;
  providerCalled: false;
};

export type AiDocumentKnowledgeEmptyState = {
  reason: string;
  honestEmptyState: true;
  fakeDocuments: false;
};

export type AiDocumentKnowledgeResult = {
  status: "loaded" | "empty";
  cards: readonly AiDocumentKnowledgeCard[];
  emptyState: AiDocumentKnowledgeEmptyState | null;
  roleScoped: true;
  evidenceBacked: true;
  readOnly: true;
  rawContentReturned: false;
  rawRowsReturned: false;
  secretsReturned: false;
  mutationCount: 0;
  dbWrites: 0;
  externalLiveFetch: false;
  providerCalled: false;
  fakeDocuments: false;
};

export type AiDocumentKnowledgeAuthContext = {
  userId: string;
  role: AiUserRole;
};

export type AiDocumentKnowledgeQuery = {
  query?: string;
  sourceIds?: readonly string[];
  documentType?: AiDocumentSourceKind | "any";
  limit?: number;
};

export type AiDocumentSearchPreview = {
  status: "preview" | "empty";
  query: string;
  cards: readonly AiDocumentKnowledgeCard[];
  emptyState: AiDocumentKnowledgeEmptyState | null;
  roleScoped: true;
  evidenceBacked: true;
  readOnly: true;
  rawContentReturned: false;
  rawRowsReturned: false;
  secretsReturned: false;
  mutationCount: 0;
  dbWrites: 0;
  externalLiveFetch: false;
  providerCalled: false;
  fakeDocuments: false;
};

export type AiDocumentSummaryPreview = {
  status: "preview" | "empty" | "blocked";
  documentId: string | null;
  sourceId: string | null;
  redactedTitle: string;
  documentType: AiDocumentSourceKind | null;
  summaryPreview: string;
  evidenceRefs: readonly AiDocumentEvidenceRef[];
  canDraft: boolean;
  sendPolicy: AiDocumentSourceEntry["canSend"] | "never";
  roleScoped: true;
  evidenceBacked: true;
  readOnly: true;
  rawContentReturned: false;
  rawRowsReturned: false;
  secretsReturned: false;
  mutationCount: 0;
  dbWrites: 0;
  externalLiveFetch: false;
  providerCalled: false;
  fakeDocuments: false;
};
