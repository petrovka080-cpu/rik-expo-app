import { expectProfessionalBoqEstimate } from "../estimateIntent/anyEstimateTestHelpers";

describe("plumbing estimate", () => {
  it("supports pipe replacement with safety review", () => {
    const result = expectProfessionalBoqEstimate("сантехника заменить трубы 40 м", "pipe_replacement");

    expect(result.work.category).toBe("plumbing");
    expect(result.requiresReview).toBe(true);
  });
});
