import { validateEstimateBoqDepth } from "../../src/lib/ai/globalEstimate";
import { estimateForWorkKey, stripFoundationEstimate } from "./boqDepthTestHelpers";

describe("global estimate BOQ depth validator", () => {
  it("requires rows, materials, labor, equipment or delivery, assumptions, factors, questions, sources and tax", () => {
    const estimate = stripFoundationEstimate();
    const depth = validateEstimateBoqDepth(estimate);

    expect(depth).toMatchObject({
      passed: true,
      minimumRows: 12,
      hasMaterials: true,
      hasLabor: true,
      hasEquipmentOrDeliveryOrWarning: true,
      hasAssumptions: true,
      hasCostFactors: true,
      hasClarifyingQuestions: true,
      hasSourceEvidence: true,
      hasTaxStatusOrWarning: true,
      blockers: [],
    });
  });

  it("blocks a complex work when depth is truncated below policy", () => {
    const estimate = stripFoundationEstimate();
    const invalid = {
      ...estimate,
      regionalRisks: [],
      clarifyingQuestions: [],
      sections: estimate.sections.map((section) => ({
        ...section,
        rows: section.rows.slice(0, section.type === "materials" ? 4 : 0),
      })),
    };

    const depth = validateEstimateBoqDepth(invalid);

    expect(depth.passed).toBe(false);
    expect(depth.blockers).toContain("BOQ_DEPTH_TOO_SHORT:4<12");
    expect(depth.blockers).toContain("BOQ_LABOR_GROUP_MISSING");
    expect(depth.blockers).toContain("BOQ_EQUIPMENT_DELIVERY_OR_WARNING_MISSING");
  });

  it("keeps generated generic complex templates above the configured minimum", () => {
    for (const workKey of ["concrete_slab", "pipe_replacement", "electrical_basic", "mini_chp_preparation"]) {
      const estimate = estimateForWorkKey(workKey, workKey === "pipe_replacement" ? 40 : 100, workKey === "pipe_replacement" ? "linear_m" : "sq_m");
      const depth = validateEstimateBoqDepth(estimate);
      expect({ workKey, depth }).toMatchObject({ depth: { passed: true } });
    }
  });
});
