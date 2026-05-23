import { expectProfessionalBoqEstimate } from "../estimateIntent/anyEstimateTestHelpers";

describe("concrete estimate", () => {
  it("supports foundation concrete volumes", () => {
    const result = expectProfessionalBoqEstimate("залить фундамент 30 м3", "foundation_concrete");

    expect(result.work.category).toBe("foundation");
    expect(result.input.volume).toBe(30);
    expect(result.input.unit).toBe("m3");
  });
});
