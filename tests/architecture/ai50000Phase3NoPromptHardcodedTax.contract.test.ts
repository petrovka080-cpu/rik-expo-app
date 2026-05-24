import { sourceText } from "./ai50000Phase3TestHelpers";

describe("AI 50000 Phase 3 no prompt hardcoded tax", () => {
  it("does not hardcode tax in prompt fixtures", () => {
    expect(sourceText()).not.toContain("promptHardcodedTax");
  });
});
