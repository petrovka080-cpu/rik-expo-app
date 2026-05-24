import { sourceText } from "./ai50000Phase4TestHelpers";

describe("AI 50000 Phase 4 no prompt hardcoded prices", () => {
  it("does not encode prices in prompts", () => {
    expect(sourceText()).not.toContain("promptHardcodedPrices");
  });
});
