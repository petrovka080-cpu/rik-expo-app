import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("canonical historical ingress ownership", () => {
  it("keeps the old path thin and routes all internal consumers to the canonical owner", () => {
    const root = resolve(__dirname, "../..");
    const compatibilitySource = readFileSync(
      resolve(root, "src/lib/estimate/buildEstimateFromInlineWorkPrompt.ts"),
      "utf8",
    );
    expect(compatibilitySource).toContain(
      'export * from "./backendPlatform/canonicalEstimateHistoricalIngress"',
    );
    expect(compatibilitySource).not.toMatch(/function\s+buildEstimateFromInlineWorkPrompt\s*\(/u);

    const internalConsumers = [
      "src/lib/estimate/backendPlatform/canonicalEstimateHistoricalDraftProjection.ts",
      "src/lib/estimate/v4/asphalt/asphaltRelatedProductionBindingV4.ts",
      "src/lib/estimate/v4/asphalt/compileAsphaltRelatedProfessionalEstimateV4.ts",
      "src/lib/estimate/v4/asphalt/compileAsphaltRelatedThroughCoreV4.ts",
      "src/lib/estimate/v4/domains/heatingVentilationComplete/productionBinding.ts",
      "src/lib/estimate/v4/domains/interiorFinishesComplete/productionBinding.ts",
      "src/lib/estimate/v4/domains/interiorFinishesWave1/productionBinding.ts",
      "src/lib/estimate/v4/roadworks/roadworksWaveAProductionBinding.ts",
    ];
    for (const relativePath of internalConsumers) {
      const source = readFileSync(resolve(root, relativePath), "utf8");
      expect(source).toContain("canonicalEstimateHistoricalIngress");
      expect(source).not.toMatch(/from ["'][^"']*buildEstimateFromInlineWorkPrompt["']/u);
    }
  });

  it("preserves the exact compatibility export", () => {
    const compatibility = require("../../src/lib/estimate/buildEstimateFromInlineWorkPrompt");
    const canonical = require(
      "../../src/lib/estimate/backendPlatform/canonicalEstimateHistoricalIngress",
    );
    expect(compatibility.buildEstimateFromInlineWorkPrompt).toBe(
      canonical.buildEstimateFromInlineWorkPrompt,
    );
  });
});
