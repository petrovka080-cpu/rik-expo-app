import { sourceText } from "./ai50000Phase2TestHelpers";

describe("AI 50000 Phase 2 no screen-local calculation", () => {
  it("keeps estimates in backend runtime", () => {
    expect(sourceText()).not.toContain("calculateEstimateInScreen");
  });
});
