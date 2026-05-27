import { readRepoFile } from "../worldConstruction/worldConstructionTestHelpers";

describe("world estimate architecture - no markdown PDF truth", () => {
  it("maps structured estimates to PDF source instead of parsing markdown tables", () => {
    const resolver = readRepoFile("src/lib/ai/estimatePdf/estimatePdfSourceResolver.ts");

    expect(resolver).toContain("structuredEstimate");
    expect(resolver).not.toMatch(/parseMarkdown|markdownTable|answerTextRu[\s\S]{0,160}pdf/i);
  });
});
