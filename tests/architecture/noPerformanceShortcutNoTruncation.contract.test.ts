import { readFileSync } from "node:fs";

const PERFORMANCE_FILES = [
  "scripts/estimate/benchmarkAiEstimateCore.ts",
  "scripts/estimate/benchmarkEstimatePdfBuyerPackages.ts",
  "scripts/estimate/auditApprovedHistoryScalePerformance.ts",
  "scripts/e2e/runAiEstimatePerformanceWebSmoke.ts",
  "scripts/e2e/runAiEstimatePerformanceAndroidSmoke.ts",
];

describe("performance SLO architecture", () => {
  it("does not pass performance by disabling PDF buyer handoff or truncating rows", () => {
    const source = PERFORMANCE_FILES.map((file) => readFileSync(file, "utf8")).join("\n");

    expect(source).not.toMatch(/test\.skip|test\.only/);
    expect(source).not.toMatch(/disablePdf|disableBuyer|skipPdf|skipBuyer/i);
    expect(source).not.toMatch(/rows\.slice\(\s*0\s*,\s*(?:10|25|50|100)\s*\)/);
    expect(source).not.toMatch(/buyer.*slice\(\s*0/i);
    expect(source).not.toMatch(/pdf.*slice\(\s*0/i);
    expect(source).not.toMatch(/route_equivalent_smoke_passed:\s*true/);
  });
});
