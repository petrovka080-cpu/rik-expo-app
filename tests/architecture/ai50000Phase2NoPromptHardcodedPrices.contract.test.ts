import { sourceText } from "./ai50000Phase2TestHelpers";

describe("AI 50000 Phase 2 no hardcoded prompt prices", () => {
  it("does not encode prices in prompts", () => {
    expect(sourceText()).not.toContain("promptHardcodedPrices");
  });
});
