import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("canonical historical recalculation ownership", () => {
  it("keeps the legacy module as a thin re-export and points runtime callers at the canonical owner", () => {
    const root = resolve(__dirname, "../..");
    const compatibilitySource = readFileSync(
      resolve(root, "src/lib/estimate/recalculateEstimateDraftRevision.ts"),
      "utf8",
    );
    expect(compatibilitySource).toContain(
      'from "./backendPlatform/canonicalEstimateHistoricalRecalculation"',
    );
    expect(compatibilitySource).not.toMatch(/function\s+recalculateEstimateDraftRevision\s*\(/u);

    const productCallers = [
      "src/lib/estimate/applyAiEstimateParameterOverrides.ts",
      "src/lib/estimate/revision/applyAiEstimateRevisionPatch.ts",
      "src/lib/estimate/revision/validateAiEstimateRevisionEngineV2.ts",
      "src/lib/estimate/runtime/createAiEstimateRuntime.ts",
      "src/lib/estimate/validateEstimateLineage.ts",
    ];
    for (const relativePath of productCallers) {
      const source = readFileSync(resolve(root, relativePath), "utf8");
      expect(source).toContain("canonicalEstimateHistoricalRecalculation");
      expect(source).not.toMatch(/from ["'][^"']*recalculateEstimateDraftRevision["']/u);
    }
  });

  it("preserves the exact compatibility exports", () => {
    const compatibility = require("../../src/lib/estimate/recalculateEstimateDraftRevision");
    const canonical = require(
      "../../src/lib/estimate/backendPlatform/canonicalEstimateHistoricalRecalculation",
    );
    expect(compatibility.recalculateEstimateDraftRevision).toBe(
      canonical.recalculateEstimateDraftRevision,
    );
    expect(compatibility.recalculateEstimateDraftRevisionBatch).toBe(
      canonical.recalculateEstimateDraftRevisionBatch,
    );
    expect(compatibility.appendRecalculatedEstimateDraftRevision).toBe(
      canonical.appendRecalculatedEstimateDraftRevision,
    );
    expect(compatibility.buildPromptForEstimateDraftRevisionRecalc).toBe(
      canonical.buildPromptForEstimateDraftRevisionRecalc,
    );
  });
});
