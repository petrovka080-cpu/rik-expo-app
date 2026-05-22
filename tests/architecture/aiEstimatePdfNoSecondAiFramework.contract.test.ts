import * as fs from "fs";
import * as path from "path";

describe("AI estimate PDF no second AI framework contract", () => {
  it("does not import model providers from the PDF action layer", () => {
    const service = fs.readFileSync(path.resolve(process.cwd(), "src/lib/ai/estimatePdf/estimatePdfActionService.ts"), "utf8");

    expect(service).not.toMatch(/openai|anthropic|generateText|streamText/i);
  });
});
