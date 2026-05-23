import { expectProfessionalBoqEstimate } from "../estimateIntent/anyEstimateTestHelpers";

describe("electrical estimate", () => {
  it("supports sockets and marks dangerous work for review", () => {
    const result = expectProfessionalBoqEstimate("электрика 20 розеток", "socket_installation");

    expect(result.work.category).toBe("electrical");
    expect(result.requiresReview).toBe(true);
  });
});
