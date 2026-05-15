import {
  aiDocumentEvidenceComplete,
  buildAiDocumentCardEvidence,
  buildAiDocumentSourceEvidence,
  resolveAiDocumentEvidence,
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

  it("resolves documents.main evidence through the canonical document knowledge alias", () => {
    const evidence = resolveAiDocumentEvidence({
      auth: { userId: "document-evidence-director", role: "director" },
      query: "pdf",
      limit: 10,
    });

    expect(evidence).toMatchObject({
      status: "loaded",
      screenId: "documents.main",
      canonicalAliasReady: true,
      documentsMainUiRouteRegistered: false,
      documentKnowledgeBffReady: true,
      documentSearchBffReady: true,
      documentSummaryPreviewReady: true,
      approvalRouteReady: true,
      roleScoped: true,
      evidenceBacked: true,
      sourceRegistryGroupsRegistered: true,
      safeReadOnly: true,
      draftOnly: true,
      approvalRequiredForSend: true,
      signingAllowed: false,
      finalSubmitAllowed: false,
      deletionAllowed: false,
      rawContentReturned: false,
      rawRowsReturned: false,
      mutationCount: 0,
      dbWrites: 0,
      providerCalled: false,
      fakeDocuments: false,
    });
    expect(evidence.sourceIds).toContain("pdf_exports");
    expect(evidence.evidenceRefs.length).toBeGreaterThan(0);
  });

  it("blocks unauthenticated document evidence instead of returning raw data", () => {
    const evidence = resolveAiDocumentEvidence({ auth: null });

    expect(evidence.status).toBe("blocked");
    expect(evidence.evidenceRefs).toEqual([]);
    expect(evidence.rawContentReturned).toBe(false);
    expect(evidence.rawRowsReturned).toBe(false);
    expect(evidence.mutationCount).toBe(0);
  });
});
