import { readFileSync } from "node:fs";
import path from "node:path";

import {
  buildProfessionalEstimateComplexityProfile,
  ESTIMATE_BOQ_MINIMUM_ROWS,
  classifyEstimateBoqDepth,
  minimumRowsForEstimate,
} from "../../src/lib/ai/globalEstimate";
import { estimateForWorkKey, stripFoundationEstimate } from "./boqDepthTestHelpers";

describe("R5.7 BOQ composition policy", () => {
  it("keeps legacy compatibility fields disabled and never defines row quotas", () => {
    expect(ESTIMATE_BOQ_MINIMUM_ROWS).toEqual({
      local_operation: 0,
      full_professional: 0,
      complex_professional: 0,
      industrial_infrastructure: 0,
      mega_project: 0,
    });
    expect(minimumRowsForEstimate(stripFoundationEstimate())).toBe(0);
    expect(minimumRowsForEstimate(estimateForWorkKey("asphalt_paving", 1000))).toBe(0);
    expect(minimumRowsForEstimate(estimateForWorkKey("mini_chp_preparation"))).toBe(0);
  });

  it("may classify risk and scope without deriving a row count", () => {
    expect(classifyEstimateBoqDepth(stripFoundationEstimate())).toBe("full_professional");
    expect(classifyEstimateBoqDepth(estimateForWorkKey("pipe_replacement", 40, "linear_m"))).toBe("complex_professional");
    expect(classifyEstimateBoqDepth(estimateForWorkKey("asphalt_paving", 1000))).toBe("industrial_infrastructure");
    expect(classifyEstimateBoqDepth(estimateForWorkKey("mini_chp_preparation"))).toBe("mega_project");
  });

  it("does not manufacture passport or runtime rows from a complexity class", () => {
    const passportBuilder = readFileSync(
      path.join(process.cwd(), "src/lib/estimate/buildProfessionalWorkPassport.ts"),
      "utf8",
    );
    const runtimeCalculator = readFileSync(
      path.join(process.cwd(), "src/lib/ai/globalEstimate/globalEstimateCalculator.ts"),
      "utf8",
    );
    expect(passportBuilder).not.toMatch(/complexity_wbs|scope_driver_work|scope_driver_material/);
    expect(runtimeCalculator).not.toMatch(/buildProfessionalWbsSupplementRows|appendProfessionalWbsRows|dynamicRows\.length\s*<\s*100/);
  });

  it("keeps classification independent from generated row count", () => {
    const sourceEstimate = stripFoundationEstimate();
    const base = {
      work: sourceEstimate.work,
      input: sourceEstimate.input,
      requiresReview: sourceEstimate.requiresReview,
    };
    const withFewGeneratedRows = {
      ...base,
      sections: sourceEstimate.sections.map((section) => ({ ...section, rows: section.rows.slice(0, 1) })),
    } as any;
    const withManyGeneratedRows = {
      ...base,
      sections: sourceEstimate.sections.map((section) => ({
        ...section,
        rows: Array.from({ length: 250 }, (_, index) => ({
          ...section.rows[0],
          code: `${section.rows[0]?.code ?? section.type}_${index}`,
          rowNumber: `${section.sectionNumber}.${index + 1}`,
        })),
      })),
    } as any;
    expect(buildProfessionalEstimateComplexityProfile(withFewGeneratedRows)).toEqual(
      buildProfessionalEstimateComplexityProfile(withManyGeneratedRows),
    );
  });
});
