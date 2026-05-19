import { buildAiFieldDocumentsReportsMagicMatrix } from "../../scripts/ai/aiFieldDocsMagic";

describe("field documents reports AI evidence truthfulness", () => {
  it("does not invent evidence, construction norms or document content", () => {
    const matrix = buildAiFieldDocumentsReportsMagicMatrix({
      webProofPass: true,
      androidProofPass: true,
      iosTestflightSignoffCurrent: true,
    });

    expect(matrix.fake_evidence_created).toBe(false);
    expect(matrix.fake_construction_norms_created).toBe(false);
    expect(matrix.fake_document_content_created).toBe(false);
    expect(matrix.generic_fallback_used).toBe(false);
  });
});
