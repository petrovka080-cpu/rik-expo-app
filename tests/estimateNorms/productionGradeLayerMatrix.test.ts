import { execFileSync } from "node:child_process";

jest.setTimeout(180_000);

describe("production grade AI estimate layer matrix", () => {
  it("creates a 11610-row production-grade technical matrix with 100 critical runtime cases", () => {
    const output = execFileSync(process.execPath, [
      "--max-old-space-size=6144",
      "node_modules/tsx/dist/cli.mjs",
      "scripts/estimate/buildProductionGradeEstimateLayerMatrix.ts",
      "--write-summary",
    ], {
      cwd: process.cwd(),
      encoding: "utf8",
      timeout: 180_000,
    });
    const summary = JSON.parse(output);

    expect(summary.templates_scanned).toBe(11610);
    expect(summary.ready_production_grade_technical_count).toBe(11610);
    expect(summary.blocked_templates_count).toBe(0);
    expect(summary.sample_outputs_count).toBeGreaterThanOrEqual(25);
    expect(summary.critical_cases_passed).toBe("100/100");
    expect(summary.blockers).toEqual([]);
  });
});
