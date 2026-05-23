import { expectProfessionalBoqEstimate } from "../estimateIntent/anyEstimateTestHelpers";

describe("roofing estimate", () => {
  it("supports metal roofing", () => {
    const result = expectProfessionalBoqEstimate("крыша металлочерепица 180 м2", "metal_roofing");

    expect(result.work.category).toBe("roofing");
    expect(result.requiresReview).toBe(true);
  });
});
