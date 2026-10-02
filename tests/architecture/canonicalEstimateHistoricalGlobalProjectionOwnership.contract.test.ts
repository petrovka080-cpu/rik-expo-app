import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("canonical historical global projection ownership", () => {
  it("keeps the old calculator thin and routes every internal caller to the canonical owner", () => {
    const root = resolve(__dirname, "../..");
    const compatibilitySource = readFileSync(
      resolve(root, "src/lib/ai/globalEstimate/globalEstimateCalculator.ts"),
      "utf8",
    );
    expect(compatibilitySource).toContain("canonicalEstimateHistoricalGlobalProjection");
    expect(compatibilitySource).not.toMatch(/function\s+calculateGlobalConstructionEstimateSync\s*\(/u);

    const internalCallers = [
      "src/lib/ai/estimatePdf/estimatePdfSourceResolver.ts",
      "src/lib/ai/estimateRouting/universalEstimateIntentRouter.ts",
      "src/lib/ai/exactMaterialPriceEstimate/buildExactMaterialPriceEstimate.ts",
      "src/lib/ai/globalEstimate/globalEstimateClient.ts",
      "src/lib/ai/globalEstimate/globalEstimateDataOpsAdmin.ts",
      "src/lib/ai/globalEstimate/globalEstimateProductionSafety.ts",
      "src/lib/ai/globalEstimate/index.ts",
      "src/lib/consumerRequests/consumerRequestEstimateApplicationService.ts",
      "src/lib/estimate/v4/electrical/buildCanonicalElectricalConsumerRepairAiDraft.ts",
    ];
    for (const relativePath of internalCallers) {
      const source = readFileSync(resolve(root, relativePath), "utf8");
      expect(source).toContain("canonicalEstimateHistoricalGlobalProjection");
      expect(source).not.toMatch(/(?:from|export \*) ["'][^"']*globalEstimateCalculator["']/u);
    }
  });

  it("preserves synchronous, asynchronous and estimator-kernel export identities", () => {
    const compatibility = require("../../src/lib/ai/globalEstimate/globalEstimateCalculator");
    const canonical = require(
      "../../src/lib/estimate/backendPlatform/canonicalEstimateHistoricalGlobalProjection",
    );
    expect(compatibility.calculateGlobalConstructionEstimateSync).toBe(
      canonical.calculateGlobalConstructionEstimateSync,
    );
    expect(compatibility.calculateGlobalConstructionEstimate).toBe(
      canonical.calculateGlobalConstructionEstimate,
    );
    expect(compatibility.buildGlobalEstimateFromEstimatorKernel).toBe(
      canonical.buildGlobalEstimateFromEstimatorKernel,
    );
  });
});
