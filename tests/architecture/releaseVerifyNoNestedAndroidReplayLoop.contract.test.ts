import fs from "node:fs";
import path from "node:path";

describe("release verify Android replay topology", () => {
  it("does not nest the canonical API34 replay runner inside itself or a wrapper loop", () => {
    const canonicalRunner = fs.readFileSync(
      path.join(process.cwd(), "scripts/e2e/runAndroidApi34CanonicalReplayB2cExpandedEstimateBinding.ts"),
      "utf8",
    );
    const timingRunner = fs.readFileSync(
      path.join(process.cwd(), "scripts/release/runReleaseVerifyWithStepTiming.ts"),
      "utf8",
    );
    const releaseGuard = fs.readFileSync(path.join(process.cwd(), "scripts/release/releaseGuard.shared.ts"), "utf8");

    expect(canonicalRunner).not.toMatch(/runAndroidApi34CanonicalReplayB2cExpandedEstimateBinding\.ts/);
    expect(timingRunner).toContain("REQUIRED_RELEASE_GATES");
    expect(timingRunner).not.toMatch(/spawn\([^)]*runAndroidApi34CanonicalReplayB2cExpandedEstimateBinding\.ts/s);
    expect(releaseGuard.match(/runAndroidApi34CanonicalReplayB2cExpandedEstimateBinding\.ts/g) ?? []).toHaveLength(1);
  });
});
