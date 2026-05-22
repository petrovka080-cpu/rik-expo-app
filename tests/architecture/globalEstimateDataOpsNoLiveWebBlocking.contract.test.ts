import fs from "node:fs";
import path from "node:path";

describe("architecture: Global Estimate Data Ops no live web blocking", () => {
  it("keeps source refresh queued and outside the user estimate request path", () => {
    const root = path.resolve(__dirname, "../..");
    const refreshQueue = fs.readFileSync(
      path.join(root, "src/lib/ai/globalEstimate/dataOps/globalEstimateSourceRefreshQueue.ts"),
      "utf8",
    );
    const calculator = fs.readFileSync(
      path.join(root, "src/lib/ai/globalEstimate/globalEstimateCalculator.ts"),
      "utf8",
    );

    expect(refreshQueue).toContain("blocksUserEstimate: false");
    expect(calculator).not.toMatch(/\bfetch\s*\(/);
    expect(calculator).not.toContain("refresh-global-estimate-sources");
  });
});
