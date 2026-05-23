import fs from "node:fs";
import path from "node:path";

describe("built-in AI 10000 architecture: no LLM prices", () => {
  it("keeps pricing in source-backed rates and not in the 10000 manifest or runner", () => {
    const runner = fs.readFileSync(path.join(process.cwd(), "scripts/e2e/runBuiltInAi10000RealWorldWorkTypesProof.ts"), "utf8");
    const manifest = fs.readFileSync(path.join(process.cwd(), "src/lib/ai/builtInAi10000/builtInAi10000ConstructionCases.ts"), "utf8");
    const seed = fs.readFileSync(path.join(process.cwd(), "src/lib/ai/globalEstimate/globalEstimateSeedData.ts"), "utf8");

    expect(runner).not.toContain("priceDefault:");
    expect(runner).not.toContain("unitPrice:");
    expect(manifest).not.toContain("priceDefault:");
    expect(manifest).not.toContain("unitPrice:");
    expect(seed).toContain("GLOBAL_RATE_MATERIALS");
    expect(seed).toContain("GLOBAL_RATE_WORKS");
  });
});
