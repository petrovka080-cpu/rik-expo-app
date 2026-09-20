import { expectRoleQaRoutesToCanonicalBackendEstimate } from "../estimateIntent/anyEstimateTestHelpers";

describe("any estimate role QA cannot override", () => {
  it("director context still returns backend estimate result", () => {
    const answer = expectRoleQaRoutesToCanonicalBackendEstimate("сколько стоит залить бетонная плита 200 м2", "director");

    expect(answer.globalEstimateResult).toBeUndefined();
    expect(answer.sections[0]?.titleRu).toBe("Каноническая backend-смета");
  });
});
