import { expectProfessionalBoqEstimate } from "../estimateIntent/anyEstimateTestHelpers";

describe("carpet estimate", () => {
  it("supports carpet as flooring work, not laminate-only", () => {
    const result = expectProfessionalBoqEstimate("уложить ковролин 100 м2", "carpet_laying");

    expect(result.work.category).toBe("flooring");
    expect(result.sections.flatMap((section) => section.rows).every((row) => row.sourceEvidence.length > 0)).toBe(true);
  });
});
