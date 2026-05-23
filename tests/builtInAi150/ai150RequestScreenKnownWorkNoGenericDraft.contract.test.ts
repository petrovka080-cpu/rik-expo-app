import { getAi150Artifacts } from "./ai150TestHelpers";

describe("built-in AI 150 request screen regression", () => {
  it("does not use generic draft for known work on /request", () => {
    const { matrix, requestControls, requestDraftAdapter } = getAi150Artifacts();

    expect(matrix.request_screen_regression_passed).toBe(true);
    expect(matrix.generic_draft_for_known_work_found).toBe(false);
    expect(requestControls.every((trace) => trace.passed)).toBe(true);
    expect(requestDraftAdapter.generic_draft_found).toBe(false);
  });
});
