import { getAi10000Artifacts } from "../builtInAi10000/ai10000TestHelpers";

describe("built-in AI 10000 architecture: no fake green", () => {
  it("keeps failures explicit and fake_green_claimed false", () => {
    const { matrix, failures } = getAi10000Artifacts();

    expect(matrix.final_status).toBe("GREEN_BUILT_IN_AI_10000_REAL_WORLD_WORK_TYPES_READY");
    expect(matrix.cases_failed).toBe(0);
    expect(failures).toEqual([]);
    expect(matrix.fake_green_claimed).toBe(false);
  });
});
