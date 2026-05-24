import { sourceText } from "./ai50000Phase2TestHelpers";

describe("AI 50000 Phase 2 no hardcoded prompt tax", () => {
  it("does not encode tax in prompts", () => {
    expect(sourceText()).not.toContain("promptHardcodedTax");
  });
});
