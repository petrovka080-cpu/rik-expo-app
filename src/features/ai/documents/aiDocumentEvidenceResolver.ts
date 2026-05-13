import type { AiDocumentSourceEntry } from "../knowledge/aiKnowledgeTypes";
import type { AiDocumentEvidenceRef, AiDocumentKnowledgeCard } from "./aiDocumentKnowledgeTypes";

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
