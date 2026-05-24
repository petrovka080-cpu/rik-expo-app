import { sourceText } from "./ai50000Phase3TestHelpers";

describe("AI 50000 Phase 3 no second AI framework", () => {
  it("does not create another AI framework", () => {
    expect(sourceText()).not.toContain("createSecondAiFramework(");
  });
});
