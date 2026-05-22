import fs from "node:fs";
import path from "node:path";

describe("whole-app 50k seed architecture: explicit flag", () => {
  it("requires ALLOW_WHOLE_APP_50K_FIXTURE_SEED before seed operations", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "scripts/e2e/seedWholeApp50kSyntheticFixture.ts"),
      "utf8",
    );

    expect(source).toContain("assertFixtureSeedAllowed(process.env)");
    expect(source).toContain("ALLOW_WHOLE_APP_50K_FIXTURE_SEED");
    expect(source).toContain("BLOCKED_EXTERNAL_ONLY_ALLOW_WHOLE_APP_50K_FIXTURE_SEED_REQUIRED");
  });
});
