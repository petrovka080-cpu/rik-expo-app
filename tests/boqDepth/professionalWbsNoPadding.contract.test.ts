import { readFileSync } from "node:fs";
import path from "node:path";

import { validateEstimateBoqDepth } from "../../src/lib/ai/globalEstimate";
import { stripFoundationEstimate } from "./boqDepthTestHelpers";

function sourceFile(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("professional WBS depth is applicability-driven, not row-count padding", () => {
  it("does not keep row-count target padding mechanics in the generator or source audit", () => {
    const calculator = sourceFile("src/lib/ai/globalEstimate/globalEstimateCalculator.ts");
    const passportAudit = sourceFile("scripts/estimate/audit11610ComplexityAdaptiveDeepBoqDepth.ts");
    const passportBuilder = sourceFile("src/lib/estimate/buildProfessionalWorkPassport.ts");

    expect(calculator).not.toMatch(/professionalWbsTargetRows/);
    expect(calculator).not.toMatch(/\btargetRows\b/);
    expect(calculator).not.toMatch(/input\.existingRows/);
    expect(calculator).not.toMatch(/input\.targetRows/);
    expect(calculator).not.toMatch(/while\s*\([^)]*rows\.length\s*<[^)]*(minimum|target)/i);
    expect(calculator).not.toMatch(/rows\.slice\(0,\s*Math\.max\(0,\s*input\.targetRows/);
    expect(calculator).toMatch(/professionalWbsSpecsForScope\(input\)/);
    expect(calculator).toMatch(/specs\.forEach/);
    expect(passportAudit).not.toMatch(/volume:\s*passport\.boqRecipe\.rowCount/);
    expect(passportBuilder).not.toMatch(/while\s*\([^)]*supplemented\.length\s*<\s*minimumRows/i);
    expect(passportBuilder).not.toMatch(/supplemented\.length\s*<\s*minimumRows/);
  });

  it("requires applicability and formula trace on every generated professional WBS row", () => {
    const estimate = stripFoundationEstimate();
    const depth = validateEstimateBoqDepth(estimate);
    const professionalRows = estimate.sections
      .flatMap((section) => section.rows)
      .filter((row) => row.code.startsWith("professional_wbs_"));

    expect(professionalRows.length).toBeGreaterThan(0);
    expect(depth.professionalWbsRowsWithoutApplicability).toEqual([]);
    expect(depth.professionalWbsRowsWithoutSourceApplicability).toEqual([]);
    for (const row of professionalRows) {
      expect(row.applicabilityRule).toBeTruthy();
      expect(row.applicabilityReason).toBeTruthy();
      expect(row.scopeDriver).toBeTruthy();
      expect(row.semanticSignature).toBeTruthy();
      expect(row.quantityFormula).toBeTruthy();
      expect(row.calculationTrace).toBeTruthy();
      expect(row.sourceEvidence.length).toBeGreaterThan(0);
      expect(row.normSourceId).toBeTruthy();
      expect(row.normSourceTitle).toBeTruthy();
      expect(row.normVersion).toBeTruthy();
      expect(row.normReviewStatus).toBe("preliminary_scope_applicability_required");
      expect(row.sourceParameters).toMatchObject({
        normSourceProvenance: "configured_reference_rate_not_normative_pack",
        sourceApplicabilityStatus: "preliminary_reference_requires_project_scope_review_or_rfq",
      });
    }
  });
});
