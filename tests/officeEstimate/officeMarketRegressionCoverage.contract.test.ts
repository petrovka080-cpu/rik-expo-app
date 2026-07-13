import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

describe("office estimate chain regression coverage", () => {
  it("keeps the office estimate chain in the focused office-market gate", () => {
    const manifest = read("scripts/ci/officeMarketRegressionManifest.ts");

    expect(manifest).toContain('name: "office-estimate-chain"');
    expect(manifest).toContain('owner: "office/estimate"');
    expect(manifest).toContain('path: "tests/officeEstimate"');
    expect(manifest).toContain('path: "tests/foremanAiEstimateChain"');
  });
});
