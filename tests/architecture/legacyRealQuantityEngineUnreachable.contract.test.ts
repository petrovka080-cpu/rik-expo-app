import fs from "node:fs";
import path from "node:path";

import {
  loadEstimateEngineSourceFiles,
  scanLegacyRealQuantityEngineReachability,
} from "../../scripts/estimate/auditNoSecondEstimateEngine";

describe("legacy real-material quantity engine reachability", () => {
  it("retains historical compatibility code without exposing it to product runtime", () => {
    const legacyPath = path.resolve(
      process.cwd(),
      "src/lib/ai/professionalEstimateCalculator/realMaterialQuantityEngine.ts",
    );
    const audit = scanLegacyRealQuantityEngineReachability(
      loadEstimateEngineSourceFiles(["app", "src", "supabase"]),
    );

    expect(fs.existsSync(legacyPath)).toBe(true);
    expect(fs.readFileSync(legacyPath, "utf8")).toContain(
      "Historical compatibility engine retained for test and audit replay only",
    );
    expect(audit).toMatchObject({
      legacy_real_quantity_engine_unreachable: true,
      legacy_real_quantity_engine_barrel_exported: false,
      legacy_real_quantity_engine_product_importers: [],
      violations: [],
    });
  });

  it("rejects both a barrel re-export and a direct product import", () => {
    const audit = scanLegacyRealQuantityEngineReachability([
      {
        filePath: "src/lib/ai/professionalEstimateCalculator/index.ts",
        source: 'export * from "./realMaterialQuantityEngine";',
      },
      {
        filePath: "src/features/consumerRepair/FakeEstimate.ts",
        source: 'import { createRealMaterialQuantityPreview } from "../../lib/ai/professionalEstimateCalculator/realMaterialQuantityEngine";',
      },
    ]);

    expect(audit.legacy_real_quantity_engine_unreachable).toBe(false);
    expect(audit.legacy_real_quantity_engine_barrel_exported).toBe(true);
    expect(audit.legacy_real_quantity_engine_product_importers).toEqual([
      "src/features/consumerRepair/FakeEstimate.ts",
    ]);
    expect(audit.violations).toEqual([
      "src/lib/ai/professionalEstimateCalculator/index.ts:legacy_real_quantity_engine_barrel_export",
      "src/features/consumerRepair/FakeEstimate.ts:legacy_real_quantity_engine_product_reachable",
    ]);
  });
});
