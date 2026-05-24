import { sourceText } from "./ai50000Phase3TestHelpers";

describe("AI 50000 Phase 3 no useEffect answer rewrite", () => {
  it("does not rewrite answers after render", () => {
    expect(sourceText()).not.toContain("useEffect(() => setAnswer");
    expect(sourceText()).not.toContain("setMessages(prev => rewrite");
  });
});
