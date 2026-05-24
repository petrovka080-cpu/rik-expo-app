import { sourceText } from "./ai50000Phase2TestHelpers";

describe("AI 50000 Phase 2 no fake sources", () => {
  it("does not create fake source constants", () => {
    expect(sourceText()).not.toMatch(/\bconst\s+fakeSources\s*=/);
  });
});
