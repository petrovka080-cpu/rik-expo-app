import { sourceText } from "./ai50000Phase4TestHelpers";

describe("AI 50000 Phase 4 no second AI framework", () => {
  it("does not introduce another AI framework for canary", () => {
    expect(sourceText()).not.toMatch(/createSecondAiFramework|AIFrameworkV2/);
  });
});
