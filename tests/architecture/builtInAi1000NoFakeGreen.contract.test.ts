import { getAi1000Artifacts } from "../builtInAi1000/ai1000TestHelpers";

describe("built-in AI 1000 architecture: no fake green", () => {
  it("keeps failures explicit and fake_green_claimed false", () => {
    const { matrix, failures } = getAi1000Artifacts();

    expect(matrix.final_status).toBe("GREEN_BUILT_IN_AI_1000_CONSTRUCTION_WORK_TYPES_REAL_ESTIMATE_OUTPUT_READY");
    expect(matrix.cases_failed).toBe(0);
    expect(failures).toEqual([]);
    expect(matrix.fake_green_claimed).toBe(false);
  });
});
