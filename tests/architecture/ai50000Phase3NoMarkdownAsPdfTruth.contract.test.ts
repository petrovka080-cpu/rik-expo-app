import { sourceText } from "./ai50000Phase3TestHelpers";

describe("AI 50000 Phase 3 no markdown-as-PDF truth", () => {
  it("does not parse markdown tables into PDF truth", () => {
    expect(sourceText()).not.toContain("parseMarkdownTable(");
  });
});
