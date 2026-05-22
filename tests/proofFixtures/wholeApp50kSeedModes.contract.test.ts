import fs from "node:fs";
import path from "node:path";

import { WHOLE_APP_50K_FIXTURE_MODES } from "../../src/lib/proofFixtures/50kProofFixtureTypes";
import { buildWholeApp50kTzLockMatrix } from "../../src/lib/proofFixtures/50kProofFixtureMatrix";

describe("whole-app 50k seed modes contract", () => {
  it("defines the required smoke, verify, cleanup, verify-empty, and full modes", () => {
    expect([...WHOLE_APP_50K_FIXTURE_MODES]).toEqual(["smoke", "verify", "cleanup", "verify-empty", "full"]);
    expect(buildWholeApp50kTzLockMatrix({ fullJestPassed: true, releaseVerifyPassed: true }).runner_modes_defined).toEqual([
      "smoke",
      "verify",
      "cleanup",
      "verify-empty",
      "full",
    ]);
  });

  it("keeps the runner wired to shared mode definitions and shared seed guards", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "scripts/e2e/seedWholeApp50kSyntheticFixture.ts"),
      "utf8",
    );

    expect(source).toContain("WHOLE_APP_50K_FIXTURE_MODES");
    expect(source).toContain("assertFixtureSeedAllowed");
    expect(source).toContain("--mode smoke|verify|cleanup|verify-empty|full");
  });
});
