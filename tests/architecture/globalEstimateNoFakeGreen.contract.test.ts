import fs from "fs";

describe("global estimate no fake green architecture", () => {
  it("requires runtime proof checks before writing the production-safe green matrix", () => {
    const source = fs.readFileSync("scripts/e2e/runGlobalEstimateProductionSafeProof.ts", "utf8");

    expect(source).toContain("buildGlobalEstimateProductionSafeProof");
    expect(source).toContain("runGlobalEstimateB2CRequestProof");
    expect(source).toContain("runGlobalEstimatePdfMarketplaceProof");
    expect(source).toContain("runGlobalEstimateLocalizationRuntimeProof");
    expect(source).toContain("fake_green_claimed: false");
    expect(source).toMatch(/throw new Error|assert\(/);
  });
});
