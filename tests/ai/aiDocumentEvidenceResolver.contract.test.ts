import {
  aiDocumentEvidenceComplete,
  buildAiDocumentCardEvidence,
  buildAiDocumentSourceEvidence,
} from "../../src/features/ai/documents/aiDocumentEvidenceResolver";
import { getAiDocumentKnowledgeCard } from "../../src/features/ai/documents/aiDocumentKnowledgeRegistry";

describe("AI document evidence resolver", () => {
  it("builds redacted evidence refs for source and summary previews", () => {
    const sourceEvidence = buildAiDocumentSourceEvidence({ sourceId: "pdf_exports" });
    const card = getAiDocumentKnowledgeCard("pdf_exports");

    expect(card).not.toBeNull();
    expect(sourceEvidence).toEqual([
      {
        type: "document_source",
        ref: "document_source:pdf_exports",
        sourceId: "pdf_exports",
        redacted: true,
        rawContentReturned: false,
        rawRowsReturned: false,
      },
    ]);
    expect(aiDocumentEvidenceComplete({ evidenceRefs: sourceEvidence })).toBe(true);
    expect(aiDocumentEvidenceComplete({ evidenceRefs: buildAiDocumentCardEvidence(card!) })).toBe(true);
  });

  it("rejects evidence without refs", () => {
    expect(aiDocumentEvidenceComplete({ evidenceRefs: [] })).toBe(false);
  });
});
