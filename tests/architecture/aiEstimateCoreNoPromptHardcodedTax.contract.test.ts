import fs from "node:fs";
import path from "node:path";

describe("AI estimate tax boundary", () => {
  it("does not hardcode tax in prompt formatting", () => {
    const formatter = fs.readFileSync(path.join(process.cwd(), "src/lib/ai/globalEstimate/globalEstimateAnswerFormatter.ts"), "utf8");
    expect(formatter).not.toMatch(/taxRate\s*=\s*0\.\d|НДС\s*=\s*\d|VAT\s*=\s*\d/i);
  });
});
