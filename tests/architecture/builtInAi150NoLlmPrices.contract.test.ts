import fs from "node:fs";
import path from "node:path";

describe("built-in AI 150 architecture: no LLM prices", () => {
  it("keeps pricing in seed pricebook/rates and not in the proof runner", () => {
    const runner = fs.readFileSync(path.join(process.cwd(), "scripts/e2e/runBuiltInAi150ConstructionWorkTypesProof.ts"), "utf8");
    const seed = fs.readFileSync(path.join(process.cwd(), "src/lib/ai/globalEstimate/globalEstimateSeedData.ts"), "utf8");

    expect(runner).not.toContain("priceDefault:");
    expect(runner).not.toContain("unitPrice:");
    expect(seed).toContain("GLOBAL_RATE_MATERIALS");
    expect(seed).toContain("GLOBAL_RATE_WORKS");
  });
});
