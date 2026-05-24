import { sourceText } from "./ai50000Phase4TestHelpers";

describe("AI 50000 Phase 4 no useEffect answer rewrite", () => {
  it("does not patch AI answers after render", () => {
    expect(sourceText()).not.toContain("useEffect(() => setAnswer");
    expect(sourceText()).not.toContain("setMessages(prev => rewrite");
  });
});
