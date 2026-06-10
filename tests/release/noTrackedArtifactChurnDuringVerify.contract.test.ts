import fs from "node:fs";
import path from "node:path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

function read(filePath: string): string {
  return fs.readFileSync(path.join(PROJECT_ROOT, filePath), "utf8");
}

describe("no tracked artifact churn during verify", () => {
  it("keeps release verify on read-only runner modes for known churn-heavy proofs", () => {
    const guard = read("scripts/release/releaseGuard.shared.ts");
    const liveRunner = read("scripts/e2e/runLiveRequestEmbeddedAiProfessionalBoqPdfCatalogProof.ts");
    const androidRunner = read("scripts/e2e/runAndroidApi34CanonicalReplayB2cExpandedEstimateBinding.ts");
    const artifactVerifier = read("scripts/release/verifyExistingProofArtifact.ts");

    expect(guard).toContain("--mode=verify");
    expect(guard).toContain("verifyExistingProofArtifact.ts");
    expect(guard).toContain("S_AI_ESTIMATE_CORE_COMPLETION_matrix.json");
    expect(guard).toContain("S_AI_ESTIMATE_PDF_TABULAR_REGRESSION_matrix.json");
    expect(guard).toContain("S_BUILT_IN_AI_10000_POST_BOQ_CATALOG_matrix.json");
    expect(liveRunner).toContain("verifyArtifactsReadOnly");
    expect(androidRunner).toContain("verifyExistingCanonicalReplayReadOnly");
    expect(artifactVerifier).toContain("fs.readFileSync");
    expect(artifactVerifier).not.toContain("fs.writeFileSync");
    expect(liveRunner).toContain("--mode=refresh");
  });
});
