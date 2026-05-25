import fs from "node:fs";
import path from "node:path";

describe("PDF tabular regression no screen-local rows", () => {
  it("does not build PDF estimate rows in screen components", () => {
    const screen = fs.readFileSync(path.resolve(process.cwd(), "src/features/ai/AIAssistantEstimatePdfActions.tsx"), "utf8");
    expect(screen).not.toMatch(/sections\s*:\s*\[|rows\s*:\s*\[|materialKey|rateKey|displayUnitPrice/i);
    expect(screen).toContain("generateAiEstimatePdf");
  });
});
