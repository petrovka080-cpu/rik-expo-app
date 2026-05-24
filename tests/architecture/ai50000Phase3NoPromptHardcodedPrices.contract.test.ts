import { sourceText } from "./ai50000Phase3TestHelpers";

describe("AI 50000 Phase 3 no prompt hardcoded prices", () => {
  it("does not hardcode prices in prompt fixtures", () => {
    expect(sourceText()).not.toContain("promptHardcodedPrices");
  });
});
