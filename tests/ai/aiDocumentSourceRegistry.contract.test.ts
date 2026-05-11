import {
  AI_DOCUMENT_SOURCE_REGISTRY,
  REQUIRED_AI_DOCUMENT_SOURCE_GROUPS,
  getAiDocumentSource,
} from "../../src/features/ai/knowledge/aiDocumentSourceRegistry";

describe("AI document source registry", () => {
  it("registers every required document, report, PDF, and AI report source group", () => {
    const registered = new Set(AI_DOCUMENT_SOURCE_REGISTRY.map((entry) => entry.sourceId));

    for (const sourceId of REQUIRED_AI_DOCUMENT_SOURCE_GROUPS) {
      expect(registered.has(sourceId)).toBe(true);
    }
  });

  it("knows sources without exposing raw document bodies and keeps send approval-bound", () => {
    expect(getAiDocumentSource("ai_reports")?.canSend).toBe("never");
    expect(getAiDocumentSource("finance_documents")?.contextPolicy).toBe("redacted_finance");
    expect(getAiDocumentSource("subcontract_documents")?.contextPolicy).toBe("own_records_only");

    const serialized = JSON.stringify(AI_DOCUMENT_SOURCE_REGISTRY);
    expect(serialized).not.toContain("rawPdfContent");
    expect(serialized).not.toContain("rawBody");
    expect(serialized).not.toContain("rawAttachment");
    expect(getAiDocumentSource("pdf_exports")?.canSend).toBe("approval_required");
  });
});
