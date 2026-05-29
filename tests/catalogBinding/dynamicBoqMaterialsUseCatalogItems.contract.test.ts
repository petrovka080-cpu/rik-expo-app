import { requestEstimate, UNIVERSAL_PROMPTS } from "../estimatorKernel/universalEstimatorTestHelpers";

describe("dynamic BOQ materials use catalog item path", () => {
  it("emits material keys for automatic catalog binding", () => {
    const estimate = requestEstimate(UNIVERSAL_PROMPTS.drainage);
    const materialRows = estimate.sections.filter((section) => section.type === "materials").flatMap((section) => section.rows);
    expect(materialRows.length).toBeGreaterThan(0);
    expect(materialRows.every((row) => Boolean(row.materialKey))).toBe(true);
  });
});
