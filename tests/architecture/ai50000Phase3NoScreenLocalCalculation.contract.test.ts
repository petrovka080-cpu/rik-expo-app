import { sourceText } from "./ai50000Phase3TestHelpers";

describe("AI 50000 Phase 3 no screen-local calculation", () => {
  it("keeps estimates in backend/runtime layers", () => {
    expect(sourceText()).not.toContain("calculateEstimateInScreen(");
  });
});
