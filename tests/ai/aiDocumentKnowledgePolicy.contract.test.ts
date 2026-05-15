import { resolveAiDocumentEvidence } from "../../src/features/ai/documents/aiDocumentEvidenceResolver";
import { buildAiDocumentKnowledgePolicy } from "../../src/features/ai/documents/aiDocumentKnowledgePolicy";

describe("AI document knowledge policy", () => {
  it("allows only safe-read summaries, draft previews, and approval candidates", () => {
    const evidence = resolveAiDocumentEvidence({
      auth: { userId: "document-policy-director", role: "director" },
      query: "pdf",
    });
    const policy = buildAiDocumentKnowledgePolicy(evidence);

    expect(policy).toMatchObject({
      status: "ready",
      screenId: "documents.main",
      canonicalAliasReady: true,
      evidenceRequired: true,
      evidenceBacked: true,
      safeReadSummaryPolicy: "redacted_metadata_and_evidence_refs_only",
      draftPolicy: "draft_preview_only",
      sendPolicy: "approval_required",
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
    });
    expect(policy.allowedOperations).toEqual(
      expect.arrayContaining([
        "search_document_metadata",
        "summarize_document_preview",
        "draft_document_note_preview",
        "submit_document_candidate_for_approval",
      ]),
    );
    expect(policy.forbiddenOperations).toEqual(
      expect.arrayContaining([
        "sign_final_document",
        "send_final_document_directly",
        "delete_document",
        "export_raw_document_content",
      ]),
    );
  });

  it("stays blocked when document evidence is not authenticated", () => {
    const evidence = resolveAiDocumentEvidence({ auth: null });
    const policy = buildAiDocumentKnowledgePolicy(evidence);

    expect(policy.status).toBe("blocked");
    expect(policy.exactReason).toContain("authenticated role context");
    expect(policy.finalSubmitAllowed).toBe(false);
    expect(policy.signingAllowed).toBe(false);
    expect(policy.deletionAllowed).toBe(false);
  });
});
