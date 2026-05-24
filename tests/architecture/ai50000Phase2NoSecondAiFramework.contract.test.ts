import { sourceText } from "./ai50000Phase2TestHelpers";

describe("AI 50000 Phase 2 no second AI framework", () => {
  it("does not create another AI framework", () => {
    expect(sourceText()).not.toContain("createSecondAiFramework(");
  });
});
