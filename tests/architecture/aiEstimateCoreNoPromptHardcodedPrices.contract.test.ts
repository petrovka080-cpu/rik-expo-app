import fs from "node:fs";
import path from "node:path";

describe("AI estimate prompt pricing boundary", () => {
  it("does not hardcode price tables in prompts or answer formatter", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/lib/ai/globalEstimate/globalEstimateAnswerFormatter.ts"), "utf8");
    expect(source).not.toMatch(/price\s*table|hardcoded\s*price|unitPrice\s*=\s*\d/i);
  });
});
