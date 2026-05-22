import fs from "node:fs";
import path from "node:path";

describe("global estimate backend calculation required", () => {
  it("routes quantities, rates, taxes, and guard checks through backend services", () => {
    const calculator = fs.readFileSync(path.join(process.cwd(), "src", "lib", "ai", "globalEstimate", "globalEstimateCalculator.ts"), "utf8");
    const edge = fs.readFileSync(path.join(process.cwd(), "supabase", "functions", "calculate-global-estimate", "index.ts"), "utf8");
    expect(calculator).toContain("resolveGlobalRate");
    expect(calculator).toContain("calculateGlobalTax");
    expect(calculator).toContain("evalQuantityFormula");
    expect(edge).toContain("assertGlobalEstimateResultSafe");
  });
});
