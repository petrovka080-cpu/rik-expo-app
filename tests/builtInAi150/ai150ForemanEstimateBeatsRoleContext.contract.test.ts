import { getAi150Artifacts } from "./ai150TestHelpers";

describe("built-in AI 150 foreman context regression", () => {
  it("keeps estimate intent stronger than foreman role context", () => {
    const { matrix, foremanControls } = getAi150Artifacts();

    expect(matrix.foreman_context_regression_passed).toBe(true);
    expect(matrix.role_context_override_found).toBe(false);
    expect(foremanControls.every((trace) => trace.selected_tool === "calculate_global_estimate")).toBe(true);
  });
});
