import { classifyProofLineageChangedFiles } from "../../scripts/release/proofLineageVerifier";

describe("source change after proof", () => {
  it("rejects source, test, runner, package, platform, and env changes", () => {
    const result = classifyProofLineageChangedFiles({
      changedFiles: [
        "app/(tabs)/request/index.tsx",
        "src/lib/ai/globalEstimate/index.ts",
        "scripts/e2e/runLiveRequestEmbeddedAiProfessionalBoqPdfCatalogProof.ts",
        "tests/release/sourceChangeAfterProofRejected.contract.test.ts",
        "android/app/build.gradle",
        "ios/Podfile",
        "package.json",
        ".env.local",
      ],
    });

    expect(result.artifactChangesSinceProof).toEqual([]);
    expect(result.sourceChangesSinceProof).toEqual([
      ".env.local",
      "android/app/build.gradle",
      "app/(tabs)/request/index.tsx",
      "ios/Podfile",
      "package.json",
      "scripts/e2e/runLiveRequestEmbeddedAiProfessionalBoqPdfCatalogProof.ts",
      "src/lib/ai/globalEstimate/index.ts",
      "tests/release/sourceChangeAfterProofRejected.contract.test.ts",
    ]);
  });
});
