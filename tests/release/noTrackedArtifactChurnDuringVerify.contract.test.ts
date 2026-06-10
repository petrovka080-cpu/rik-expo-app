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

    expect(guard).toContain("--mode=verify");
    expect(liveRunner).toContain("verifyArtifactsReadOnly");
    expect(androidRunner).toContain("verifyExistingCanonicalReplayReadOnly");
    expect(liveRunner).toContain("--mode=refresh");
  });
});
