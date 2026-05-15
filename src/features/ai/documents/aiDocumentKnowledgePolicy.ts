import type { AiDocumentEvidenceResolution } from "./aiDocumentEvidenceResolver";

export const AI_DOCUMENT_KNOWLEDGE_POLICY_CONTRACT = Object.freeze({
  contractId: "ai_document_knowledge_policy_v1",
  screenId: "documents.main",
  safeReadOnly: true,
  draftPreviewOnly: true,
  sendRequiresApproval: true,
  signingAllowed: false,
  finalSubmitAllowed: false,
  deletionAllowed: false,
  rawContentAllowed: false,
  rawRowsAllowed: false,
  providerPayloadAllowed: false,
  fakeDocumentsAllowed: false,
  mutationCount: 0,
  dbWrites: 0,
} as const);

export type AiDocumentKnowledgePolicyStatus = "ready" | "blocked";

export type AiDocumentKnowledgePolicy = {
  status: AiDocumentKnowledgePolicyStatus;
  screenId: "documents.main";
  exactReason: string | null;
  canonicalAliasReady: boolean;
  evidenceRequired: true;
  evidenceBacked: boolean;
  safeReadSummaryPolicy: "redacted_metadata_and_evidence_refs_only";
  draftPolicy: "draft_preview_only";
  sendPolicy: "approval_required";
  allowedOperations: readonly [
    "search_document_metadata",
    "summarize_document_preview",
    "draft_document_note_preview",
    "submit_document_candidate_for_approval",
  ];
  forbiddenOperations: readonly [
    "sign_final_document",
    "send_final_document_directly",
    "delete_document",
    "export_raw_document_content",
  ];
  maxCards: number;
  maxEvidenceRefs: number;
  rawContentAllowed: false;
  rawRowsAllowed: false;
  rawPromptAllowed: false;
  providerPayloadAllowed: false;
  signingAllowed: false;
  finalSubmitAllowed: false;
  deletionAllowed: false;
  directDatabaseAccessAllowed: false;
  fakeDocumentsAllowed: false;
  mutationCount: 0;
  dbWrites: 0;
  providerCalled: false;
};

const ALLOWED_OPERATIONS = Object.freeze([
  "search_document_metadata",
  "summarize_document_preview",
  "draft_document_note_preview",
  "submit_document_candidate_for_approval",
] as const);

const FORBIDDEN_OPERATIONS = Object.freeze([
  "sign_final_document",
  "send_final_document_directly",
  "delete_document",
  "export_raw_document_content",
] as const);

export function buildAiDocumentKnowledgePolicy(
  evidence: AiDocumentEvidenceResolution,
): AiDocumentKnowledgePolicy {
  const ready =
    evidence.status === "loaded" &&
    evidence.canonicalAliasReady &&
    evidence.evidenceBacked &&
    evidence.documentKnowledgeBffReady &&
    evidence.documentSearchBffReady &&
    evidence.documentSummaryPreviewReady &&
    evidence.approvalRouteReady &&
    evidence.sourceRegistryGroupsRegistered;

  return {
    status: ready ? "ready" : "blocked",
    screenId: "documents.main",
    exactReason: ready
      ? null
      : evidence.exactReason ?? "AI document knowledge policy requires route alias, BFF coverage, and evidence refs.",
    canonicalAliasReady: evidence.canonicalAliasReady,
    evidenceRequired: true,
    evidenceBacked: evidence.evidenceBacked,
    safeReadSummaryPolicy: "redacted_metadata_and_evidence_refs_only",
    draftPolicy: "draft_preview_only",
    sendPolicy: "approval_required",
    allowedOperations: ALLOWED_OPERATIONS,
    forbiddenOperations: FORBIDDEN_OPERATIONS,
    maxCards: Math.min(20, Math.max(1, evidence.sourceIds.length)),
    maxEvidenceRefs: Math.min(100, Math.max(1, evidence.evidenceRefs.length)),
    rawContentAllowed: false,
    rawRowsAllowed: false,
    rawPromptAllowed: false,
    providerPayloadAllowed: false,
    signingAllowed: false,
    finalSubmitAllowed: false,
    deletionAllowed: false,
    directDatabaseAccessAllowed: false,
    fakeDocumentsAllowed: false,
    mutationCount: 0,
    dbWrites: 0,
    providerCalled: false,
  };
}
