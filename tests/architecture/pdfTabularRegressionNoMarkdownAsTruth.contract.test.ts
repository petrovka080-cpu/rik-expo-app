import fs from "node:fs";
import path from "node:path";

describe("PDF tabular regression no markdown as truth", () => {
  it("keeps AI Estimate PDF on structuredEstimate and blocks text fallback", () => {
    const source = fs.readFileSync(path.resolve(process.cwd(), "src/lib/ai/estimatePdf/estimatePdfActionService.ts"), "utf8");
    expect(source).toContain("input.source.structuredEstimate");
    expect(source).toContain("structured GlobalEstimateResult payload");
    expect(source).not.toMatch(/parseMarkdownTable|markdown.*PDF|answerText.*generateAiEstimatePdf/i);
  });
});
