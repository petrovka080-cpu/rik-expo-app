import { expectRoleQaRoutesToCanonicalBackendEstimate } from "./anyEstimateTestHelpers";

describe("no generic draft for resolved estimate", () => {
  it("uses global estimate rows and totals for resolved work", () => {
    const answer = expectRoleQaRoutesToCanonicalBackendEstimate("плитка в ванной 40 м2", "consumer");

    expect(answer.globalEstimateResult).toBeUndefined();
    expect(answer.sections[0]?.items[0]?.status).toBe("requires_review");
    expect(answer.shortAnswerRu).toContain("backend");
  });
});
