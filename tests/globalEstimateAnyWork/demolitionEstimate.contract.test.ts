import { expectProfessionalBoqEstimate } from "../estimateIntent/anyEstimateTestHelpers";

describe("demolition estimate", () => {
  it("supports tile demolition", () => {
    const result = expectProfessionalBoqEstimate("демонтаж плитки 60 м2", "tile_demolition");

    expect(result.work.category).toBe("demolition");
    expect(result.totals.grandTotal).toBeGreaterThan(0);
  });
});
