import { expectRoleQaRoutesToGlobalEstimate } from "../estimateIntent/anyEstimateTestHelpers";

describe("any estimate role QA cannot override", () => {
  it("director context still returns backend estimate result", () => {
    const answer = expectRoleQaRoutesToGlobalEstimate("сколько стоит залить бетонная плита 200 м2", "director");

    expect(answer.globalEstimateResult?.work.workKey).toBe("concrete_slab");
    expect(answer.sections[0]?.titleRu).toBe("Профессиональная смета");
  });
});
