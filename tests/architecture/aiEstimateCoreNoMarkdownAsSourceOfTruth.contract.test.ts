import fs from "node:fs";
import path from "node:path";

describe("AI estimate markdown source boundary", () => {
  it("keeps estimate rows sourced from GlobalEstimateResult, not parsed markdown", () => {
    const pdfSource = fs.existsSync(path.join(process.cwd(), "src/lib/ai/estimatePdf/estimatePdfModelMapper.ts"))
      ? fs.readFileSync(path.join(process.cwd(), "src/lib/ai/estimatePdf/estimatePdfModelMapper.ts"), "utf8")
      : "";
    expect(pdfSource).not.toMatch(/parseMarkdown|markdownTable|answerTextRu\.split/i);
  });
});
