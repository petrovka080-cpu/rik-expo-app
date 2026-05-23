import { getAi1000Artifacts } from "./ai1000TestHelpers";

describe("built-in AI 1000 foreman context regression", () => {
  it("keeps estimate intent stronger than foreman role status QA", () => {
    const { matrix } = getAi1000Artifacts();

    expect(matrix.foreman_context_regression_passed).toBe(true);
    expect(matrix.role_context_override_found).toBe(false);
  });
});
