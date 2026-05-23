import { getAi150Artifacts } from "../builtInAi150/ai150TestHelpers";

describe("built-in AI 150 architecture: no fake green", () => {
  it("keeps failures explicit and fake_green_claimed false", () => {
    const { matrix, failures } = getAi150Artifacts();

    expect(matrix.final_status).toBe("GREEN_BUILT_IN_AI_150_CONSTRUCTION_WORK_TYPES_SOURCE_BACKED_ESTIMATE_READY");
    expect(matrix.cases_failed).toBe(0);
    expect(failures).toEqual([]);
    expect(matrix.fake_green_claimed).toBe(false);
  });
});
