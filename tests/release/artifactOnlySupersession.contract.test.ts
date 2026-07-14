import { classifyProofLineageChangedFiles } from "../../scripts/release/proofLineageVerifier";

describe("artifact-only supersession", () => {
  it("accepts a diff made only of allowed proof artifacts", () => {
    const result = classifyProofLineageChangedFiles({
      changedFiles: [
        "artifacts/S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG/web_results.json",
        "artifacts/S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG/android_api34_results.json",
        "artifacts/S_WORK_ONTOLOGY_10000_REAL_USER_INTENT_RECOGNITION_CORE/intent_recognition_10000_results.json",
        "artifacts/S_WORK_ONTOLOGY_NO_HINT_REAL_USER_SEMANTIC_CORE_AUDIT/no_hint_semantic_results.json",
        "artifacts/pdf/live-request-embedded-ai-professional-boq-pdf-catalog/request.pdf",
      ],
    });

    expect(result.sourceChangesSinceProof).toEqual([]);
    expect(result.artifactChangesSinceProof).toHaveLength(5);
  });
});
