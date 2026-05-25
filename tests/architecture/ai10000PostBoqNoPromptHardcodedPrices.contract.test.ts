import fs from "node:fs";
import path from "node:path";

describe("AI 10000 post-BOQ architecture: no prompt hardcoded prices", () => {
  it("keeps prices and tax out of generated prompt contracts", () => {
    const generator = fs.readFileSync(path.join(process.cwd(), "src/lib/ai/builtInAi10000/builtInAi10000PostBoqGenerator.ts"), "utf8");
    const domains = fs.readFileSync(path.join(process.cwd(), "src/lib/ai/builtInAi10000/builtInAi10000PostBoqDomains.ts"), "utf8");
    const source = `${generator}\n${domains}`;

    expect(source).not.toMatch(/\b(?:usd|kgs|eur|rub)\s*\d+/i);
    expect(source).not.toMatch(/\b\d+(?:\.\d+)?\s*(?:usd|kgs|eur|rub)\b/i);
    expect(source).not.toContain("prompt-hardcoded prices");
    expect(source).not.toContain("prompt-hardcoded tax");
  });
});
