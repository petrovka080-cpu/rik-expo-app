import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

jest.setTimeout(180_000);

describe("production grade AI estimate layer matrix", () => {
  it("reports the honest 11610-row technical readiness deficit while all critical runtime cases pass", () => {
    const result = spawnSync(process.execPath, [
      "--max-old-space-size=6144",
      "node_modules/tsx/dist/cli.mjs",
      "scripts/estimate/buildProductionGradeEstimateLayerMatrix.ts",
      "--write-summary",
    ], {
      cwd: process.cwd(),
      encoding: "utf8",
      timeout: 180_000,
    });
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    const summary = JSON.parse(result.stdout);

    expect(summary.final_status).toBe(
      "STOP_AI_ESTIMATE_PRODUCTION_GRADE_LAYER_MATRIX_INCOMPLETE",
    );
    expect(summary.templates_scanned).toBe(11610);
    expect(summary.ready_production_grade_technical_count).toBe(1610);
    expect(summary.blocked_templates_count).toBe(10000);
    expect(summary.sample_outputs_count).toBeGreaterThanOrEqual(25);
    expect(summary.critical_cases_passed).toBe("100/100");
    expect(summary.blockers).toEqual([
      "production_grade_ready_count_invalid:1610",
      "blocked_templates:10000",
    ]);

    const artifact = JSON.parse(
      fs.readFileSync(path.resolve(summary.artifact), "utf8"),
    );
    expect(artifact.fake_green_claimed).toBe(false);
    expect(artifact.release_started).toBe(false);
    expect(artifact.production_db_touched).toBe(false);
  });
});
