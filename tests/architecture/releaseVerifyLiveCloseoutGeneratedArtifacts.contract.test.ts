import fs from "node:fs";
import path from "node:path";

describe("live B2C release closeout generated artifacts", () => {
  it("does not let release-generated artifacts self-block the closeout gate inside release verify", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "scripts/release/runLiveB2cEstimateRealityReleaseCloseoutProof.ts"),
      "utf8",
    );

    expect(source).toContain("releaseGeneratedArtifactOnlyChanges");
    expect(source).toContain('startsWith("artifacts/")');
    expect(source).toContain('process.env.RELEASE_GUARD_IN_PROGRESS === "1"');
    expect(source).toContain("worktreeClean(insideReleaseVerify)");
  });
});
