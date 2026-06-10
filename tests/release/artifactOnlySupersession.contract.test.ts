import { classifyProofLineageChangedFiles } from "../../scripts/release/proofLineageVerifier";

describe("artifact-only supersession", () => {
  it("accepts a diff made only of allowed proof artifacts", () => {
    const result = classifyProofLineageChangedFiles({
      changedFiles: [
        "artifacts/S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG/web_results.json",
        "artifacts/S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG/android_api34_results.json",
        "artifacts/pdf/live-request-embedded-ai-professional-boq-pdf-catalog/request.pdf",
      ],
    });

    expect(result.sourceChangesSinceProof).toEqual([]);
    expect(result.artifactChangesSinceProof).toHaveLength(3);
  });
});
