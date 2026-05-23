import { P0_UNFINISHED_AI_ESTIMATE_CASES, answerCase } from "./aiEstimateCoreTestHelpers";

describe("AI estimate actions", () => {
  it("exposes PDF, save, request, quantity/city refresh actions through structured action ids", () => {
    for (const testCase of P0_UNFINISHED_AI_ESTIMATE_CASES) {
      const actions = answerCase(testCase).actions.filter((action) => action.visible).map((action) => action.id);
      expect(actions).toContain("make_pdf");
      expect(actions).toContain("save_estimate");
      expect(actions).toContain("create_request");
      expect(actions).toContain("clarify_city");
      expect(actions).toContain("refresh_prices");
    }
  });
});
