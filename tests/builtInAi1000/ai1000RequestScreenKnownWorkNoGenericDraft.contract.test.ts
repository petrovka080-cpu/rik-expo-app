import { getAi1000Artifacts } from "./ai1000TestHelpers";

describe("built-in AI 1000 request screen regression", () => {
  it("does not use a generic request draft for known estimate work", () => {
    const { matrix } = getAi1000Artifacts();

    expect(matrix.request_screen_regression_passed).toBe(true);
    expect(matrix.generic_draft_for_known_work_found).toBe(false);
  });
});
