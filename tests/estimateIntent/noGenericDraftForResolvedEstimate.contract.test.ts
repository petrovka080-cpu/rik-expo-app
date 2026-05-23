import { expectRoleQaRoutesToGlobalEstimate } from "./anyEstimateTestHelpers";

describe("no generic draft for resolved estimate", () => {
  it("uses global estimate rows and totals for resolved work", () => {
    const answer = expectRoleQaRoutesToGlobalEstimate("плитка в ванной 40 м2", "consumer");
    const result = answer.globalEstimateResult;

    expect(result?.work.workKey).toBe("bathroom_tile_full");
    expect(result?.sections.flatMap((section) => section.rows).length).toBeGreaterThanOrEqual(4);
    expect(result?.totals.grandTotal).toBeGreaterThan(0);
    expect(answer.shortAnswerRu).toContain("backend");
  });
});
