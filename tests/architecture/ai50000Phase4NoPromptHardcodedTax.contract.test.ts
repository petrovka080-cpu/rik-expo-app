import { sourceText } from "./ai50000Phase4TestHelpers";

describe("AI 50000 Phase 4 no prompt hardcoded tax", () => {
  it("does not encode tax in prompts", () => {
    expect(sourceText()).not.toContain("promptHardcodedTax");
  });
});
