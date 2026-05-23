import { REQUIRED_RELEASE_GATES } from "../../scripts/release/releaseGuard.shared";
import { readRepoFile } from "./anyEstimateArchitectureTestHelpers";

describe("live acceptance required for green", () => {
  it("keeps live AI estimate PDF reality proof in release verify", () => {
    expect(REQUIRED_RELEASE_GATES).toContainEqual({
      name: "live-ai-estimate-pdf-reality-proof",
      command: "npx tsx scripts/e2e/runLiveAiEstimatePdfRealityProof.ts",
    });
  });

  it("does not allow Android to be green when emulator was not run", () => {
    const proof = readRepoFile("scripts/e2e/runLiveAiEstimatePdfRealityProof.ts");
    expect(proof).toContain("BLOCKED_ANDROID_EMULATOR_NOT_RUN");
    expect(proof).toContain("android_emulator_tested");
  });
});
