import fs from "node:fs";
import path from "node:path";

describe("global estimate backend calculation required", () => {
  it("routes compatibility ingress to an exact canonical backend job", () => {
    const compatibilityAdapter = fs.readFileSync(path.join(process.cwd(), "src", "lib", "ai", "globalEstimate", "globalEstimateCalculator.ts"), "utf8");
    const calculator = fs.readFileSync(path.join(process.cwd(), "src", "lib", "estimate", "backendPlatform", "canonicalEstimateHistoricalGlobalProjection.ts"), "utf8");
    const edge = fs.readFileSync(path.join(process.cwd(), "supabase", "functions", "calculate-global-estimate", "index.ts"), "utf8");
    expect(compatibilityAdapter).toContain("canonicalEstimateHistoricalGlobalProjection");
    expect(compatibilityAdapter).not.toContain("resolveGlobalRate");
    expect(calculator).toContain("resolveGlobalRate");
    expect(calculator).toContain("calculateGlobalTax");
    expect(calculator).toContain("evalQuantityFormula");
    expect(edge).toContain("assertCreateRequest");
    expect(edge).toContain("CANONICAL_CATALOG_ID_REQUIRED");
    expect(edge).toContain('client.rpc("estimate_create_compile_job_v1"');
    expect(edge).toContain("backendCanonical: true");
    expect(edge).not.toContain("assertGlobalEstimateResultSafe");
  });
});
