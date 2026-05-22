import fs from "node:fs";
import path from "node:path";

describe("all screens no second AI framework contract", () => {
  it("keeps all-screen acceptance on the existing AI framework and estimate bridge", () => {
    const runner = fs.readFileSync(path.join(process.cwd(), "scripts/e2e/allScreensEnterpriseRuntimeAcceptance.shared.ts"), "utf8");
    expect(runner).not.toMatch(/new\s+OpenAI|new\s+Anthropic|fetch\([^)]*ai/i);
    expect(fs.existsSync(path.join(process.cwd(), "src/features/ai/AIAssistantScreen.tsx"))).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(), "src/lib/ai/estimatePdf"))).toBe(true);
  });
});
