import {
  AI_DOCUMENT_KNOWLEDGE_REGISTRY_CONTRACT,
  listAiDocumentKnowledgeCards,
  resolveAiDocumentKnowledge,
} from "../../src/features/ai/documents/aiDocumentKnowledgeRegistry";
import { REQUIRED_AI_DOCUMENT_SOURCE_GROUPS } from "../../src/features/ai/knowledge/aiDocumentSourceRegistry";

describe("AI document knowledge registry", () => {
  it("maps every required document source group into a redacted knowledge card", () => {
    const cards = listAiDocumentKnowledgeCards();
    const sourceIds = new Set(cards.map((card) => card.sourceId));

    for (const sourceId of REQUIRED_AI_DOCUMENT_SOURCE_GROUPS) {
      expect(sourceIds.has(sourceId)).toBe(true);
    }

    expect(AI_DOCUMENT_KNOWLEDGE_REGISTRY_CONTRACT.rawContentReturned).toBe(false);
    expect(AI_DOCUMENT_KNOWLEDGE_REGISTRY_CONTRACT.rawRowsReturned).toBe(false);
    expect(AI_DOCUMENT_KNOWLEDGE_REGISTRY_CONTRACT.fakeDocuments).toBe(false);
    expect(cards.every((card) => card.evidenceRefs.length > 0)).toBe(true);
    expect(cards.every((card) => card.mutationCount === 0 && card.dbWrites === 0)).toBe(true);
  });

  it("role-scopes document cards without claiming runtime role isolation", () => {
    const director = resolveAiDocumentKnowledge({ userId: "director", role: "director" });
    const contractor = resolveAiDocumentKnowledge({ userId: "contractor", role: "contractor" });
    const unknown = resolveAiDocumentKnowledge({ userId: "unknown", role: "unknown" });

    expect(director.cards.map((card) => card.sourceId)).toEqual(
      expect.arrayContaining(REQUIRED_AI_DOCUMENT_SOURCE_GROUPS),
    );
    expect(contractor.cards.map((card) => card.sourceId)).toEqual(
      expect.arrayContaining(["acts", "subcontract_documents", "chat_attachments", "pdf_exports"]),
    );
    expect(contractor.cards.map((card) => card.sourceId)).not.toContain("finance_documents");
    expect(contractor.cards.map((card) => card.sourceId)).not.toContain("director_reports");
    expect(unknown.status).toBe("empty");
    expect(unknown.emptyState?.fakeDocuments).toBe(false);
  });
});
