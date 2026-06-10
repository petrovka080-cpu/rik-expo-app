import { classifyProofLineageChangedFiles, verifyProofLineage } from "../../scripts/release/proofLineageVerifier";

describe("proof lineage verifier", () => {
  it("accepts identical source and current heads without artifact supersession", () => {
    const result = verifyProofLineage({
      wave: "S_TEST",
      sourceCodeHead: "abc123",
      currentHead: "abc123",
      artifactPaths: [],
      allowArtifactOnlySupersession: true,
    });

    expect(result).toMatchObject({
      valid: true,
      reason: null,
      artifactOnlySupersession: false,
      fakeGreenClaimed: false,
    });
  });

  it("classifies named proof artifacts separately from source changes", () => {
    const result = classifyProofLineageChangedFiles({
      changedFiles: [
        "artifacts/S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG/matrix.json",
        "src/lib/ai/globalEstimate/index.ts",
      ],
    });

    expect(result.artifactChangesSinceProof).toEqual([
      "artifacts/S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG/matrix.json",
    ]);
    expect(result.sourceChangesSinceProof).toEqual(["src/lib/ai/globalEstimate/index.ts"]);
  });
});
