import fs from "node:fs";
import path from "node:path";

import {
  GREEN_AI_ESTIMATE_PROFESSIONAL_REAL_QUANTITY_ENGINE_PRODUCTION_SAFE_NO_BUILDS,
  GREEN_PROFESSIONAL_AI_ESTIMATE_REAL_MATERIAL_QUANTITY_ENGINE,
  buildRealMaterialQuantityEngineSummary,
} from "../../src/lib/ai/professionalEstimateCalculator";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

function read(relativePath: string): string {
  return fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");
}

describe("professional AI estimate production-safe runner contract", () => {
  it("uses the canonical production-safe GREEN status while preserving the old export alias", () => {
    const summary = buildRealMaterialQuantityEngineSummary({
      requireSourceGateEvidence: true,
      webSmokePassed: true,
      androidChromeSmokePassed: true,
      ciOfficeMarketPassed: true,
      typecheckPassed: true,
      lintPassed: true,
      diffCheckPassed: true,
      noTestWeakeningPassed: true,
      webPublicSmokePassed: true,
      secretScanPassed: true,
    });

    expect(GREEN_PROFESSIONAL_AI_ESTIMATE_REAL_MATERIAL_QUANTITY_ENGINE).toBe(
      GREEN_AI_ESTIMATE_PROFESSIONAL_REAL_QUANTITY_ENGINE_PRODUCTION_SAFE_NO_BUILDS,
    );
    expect(summary.final_status).toBe(
      GREEN_AI_ESTIMATE_PROFESSIONAL_REAL_QUANTITY_ENGINE_PRODUCTION_SAFE_NO_BUILDS,
    );
    expect(summary.fake_green_claimed).toBe(false);
  });

  it("keeps the exact no-build smoke runner and release-runtime evidence path", () => {
    const runner = read("scripts/e2e/runProfessionalAiEstimateSmoke.ts");
    const packageJson = JSON.parse(read("package.json")) as { scripts: Record<string, string> };

    expect(runner).toContain("ESTIMATE_SMOKE_TARGET");
    expect(runner).toContain("ai-estimate-professional-quantity-engine");
    expect(runner).toContain("native_build_started: false");
    expect(runner).toContain("eas_started: false");
    expect(runner).toContain("release_started: false");
    expect(runner).toContain("full_jest_started: false");
    expect(packageJson.scripts["gate:professional-ai-estimate"]).toBe(
      "tsx scripts/e2e/runProfessionalAiEstimateSmoke.ts",
    );
  });
});
