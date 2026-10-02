import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("canonical historical expanded projection ownership", () => {
  it("keeps old compiler paths thin and routes internal callers to canonical owners", () => {
    const root = resolve(__dirname, "../..");
    const compilerCompatibility = readFileSync(
      resolve(root, "src/lib/ai/estimateCompiler/expandedEstimateCompiler.ts"),
      "utf8",
    );
    expect(compilerCompatibility).toContain("canonicalEstimateHistoricalExpandedProjection");
    expect(compilerCompatibility).not.toMatch(/function\s+buildProfessionalExpandedGlobalEstimate\s*\(/u);

    const reconciliationCompatibility = readFileSync(
      resolve(root, "src/lib/ai/estimateCompiler/expandedTemplateRowReconciliation.ts"),
      "utf8",
    );
    expect(reconciliationCompatibility).toContain(
      "canonicalEstimateExpandedTemplateRowReconciliation",
    );
    expect(reconciliationCompatibility).not.toMatch(/function\s+reconcileExpandedTemplateRows\s*</u);

    for (const relativePath of [
      "src/lib/ai/builtInAi/builtInAiToolRegistry.ts",
      "src/lib/estimate/backendPlatform/canonicalEstimateHistoricalGlobalProjection.ts",
    ]) {
      const source = readFileSync(resolve(root, relativePath), "utf8");
      expect(source).toContain("canonicalEstimateHistoricalExpandedProjection");
      expect(source).not.toMatch(/from ["'][^"']*expandedEstimateCompiler["']/u);
    }
  });

  it("preserves compiler and reconciler compatibility identities", () => {
    const compatibility = require("../../src/lib/ai/estimateCompiler/expandedEstimateCompiler");
    const canonical = require(
      "../../src/lib/estimate/backendPlatform/canonicalEstimateHistoricalExpandedProjection",
    );
    expect(compatibility.buildProfessionalExpandedGlobalEstimate).toBe(
      canonical.buildProfessionalExpandedGlobalEstimate,
    );
    expect(compatibility.resolveProfessionalExpandedWorkKey).toBe(
      canonical.resolveProfessionalExpandedWorkKey,
    );

    const reconciliationCompatibility = require(
      "../../src/lib/ai/estimateCompiler/expandedTemplateRowReconciliation",
    );
    const reconciliationCanonical = require(
      "../../src/lib/estimate/backendPlatform/canonicalEstimateExpandedTemplateRowReconciliation",
    );
    expect(reconciliationCompatibility.reconcileExpandedTemplateRows).toBe(
      reconciliationCanonical.reconcileExpandedTemplateRows,
    );
  });
});
