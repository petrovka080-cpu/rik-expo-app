import {
  allowedProofArtifactPatternsForDiagnostics,
  isAllowedProofArtifactPath,
} from "../../scripts/release/proofArtifactAllowlist";

describe("proof artifact allowlist", () => {
  it("allows only named proof artifact folders", () => {
    expect(isAllowedProofArtifactPath("artifacts/S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG/matrix.json")).toBe(true);
    expect(isAllowedProofArtifactPath("artifacts/S_WORK_ONTOLOGY_10000_REAL_USER_INTENT_RECOGNITION_CORE/matrix.json")).toBe(true);
    expect(isAllowedProofArtifactPath("artifacts/pdf/live-request-embedded-ai-professional-boq-pdf-catalog/sample.pdf")).toBe(true);
    expect(isAllowedProofArtifactPath("artifacts/random-proof/matrix.json")).toBe(false);
    expect(isAllowedProofArtifactPath("scripts/e2e/runLiveRequestEmbeddedAiProfessionalBoqPdfCatalogProof.ts")).toBe(false);
    expect(isAllowedProofArtifactPath("tests/release/proofLineageVerifier.contract.test.ts")).toBe(false);
    expect(isAllowedProofArtifactPath("src/lib/ai/globalEstimate/index.ts")).toBe(false);
    expect(isAllowedProofArtifactPath("app/(tabs)/request/index.tsx")).toBe(false);
  });

  it("does not contain broad artifact or source globs", () => {
    const patterns = allowedProofArtifactPatternsForDiagnostics().join("\n");

    expect(patterns).not.toContain("^artifacts\\/.*");
    expect(patterns).not.toContain("^scripts\\/.*");
    expect(patterns).not.toContain("^tests\\/.*");
    expect(patterns).not.toContain("^src\\/.*");
    expect(patterns).not.toContain("^app\\/.*");
  });
});
