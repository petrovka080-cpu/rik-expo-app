import { validateEstimateBoqDepth } from "../../src/lib/ai/globalEstimate";
import { estimateForWorkKey, stripFoundationEstimate } from "./boqDepthTestHelpers";

describe("global estimate BOQ depth validator", () => {
  it("requires rows, materials, labor, equipment or delivery, assumptions, factors, questions, sources and tax", () => {
    const estimate = stripFoundationEstimate();
    const depth = validateEstimateBoqDepth(estimate);

    expect(depth).toMatchObject({
      passed: true,
      minimumRows: 0,
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

  it("blocks a truncated complex work by missing technological groups, not by a numeric quota", () => {
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
    expect(depth.actualRows).toBe(4);
    expect(depth.blockers.some((blocker) => blocker.includes("DEPTH_TOO_SHORT"))).toBe(false);
    expect(depth.blockers).toContain("BOQ_LABOR_GROUP_MISSING");
    expect(depth.blockers).toContain("BOQ_EQUIPMENT_DELIVERY_OR_WARNING_MISSING");
    expect(depth.blockers).toContain("BOQ_CLARIFYING_QUESTIONS_MISSING");
  });

  it("keeps generated complex scopes semantically complete without manufactured padding", () => {
    for (const workKey of ["concrete_slab", "pipe_replacement", "electrical_basic", "mini_chp_preparation"]) {
      const estimate = estimateForWorkKey(workKey, workKey === "pipe_replacement" ? 40 : 100, workKey === "pipe_replacement" ? "linear_m" : "sq_m");
      const depth = validateEstimateBoqDepth(estimate);
      expect({ workKey, depth }).toMatchObject({
        depth: {
          passed: true,
          minimumRows: 0,
          genericRows: [],
          artificialPaddingRows: [],
        },
      });
    }
  });
});
