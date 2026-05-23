import { expectProfessionalBoqEstimate } from "../estimateIntent/anyEstimateTestHelpers";

describe("unknown construction estimate fallback", () => {
  it("returns professional BOQ instead of not found", () => {
    const result = expectProfessionalBoqEstimate("смета на сложный ремонт входной группы 120 м2");

    expect(result.work.category).toBe("facade");
    expect(result.confidence).toBe("medium");
  });
});
