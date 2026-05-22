import fs from "node:fs";
import path from "node:path";

describe("release candidate AI framework boundary", () => {
  it("does not create a second AI framework for release readiness", () => {
    const files = [
      "scripts/e2e/enterpriseReleaseCandidate.shared.ts",
      "scripts/e2e/enterpriseReleaseCandidatePolicy.ts",
    ];
    const source = files.map((file) => fs.readFileSync(path.join(process.cwd(), file), "utf8")).join("\n");
    expect(source).not.toMatch(/new\s+AI\s*Framework|SecondAi|provider\.generate|createSecondAi/i);
  });
});
