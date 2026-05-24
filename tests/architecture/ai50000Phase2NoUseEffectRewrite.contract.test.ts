import { sourceText } from "./ai50000Phase2TestHelpers";

describe("AI 50000 Phase 2 no useEffect rewrite", () => {
  it("does not rewrite answers after render", () => {
    expect(sourceText()).not.toContain("useEffect(() => setAnswer");
  });
});
