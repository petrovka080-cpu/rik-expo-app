import fs from "node:fs";
import path from "node:path";

describe("estimate answer formatter architecture", () => {
  it("formats from GlobalEstimateResult sections instead of free markdown source", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/lib/ai/globalEstimate/globalEstimateAnswerFormatter.ts"), "utf8");
    expect(source).toContain("GlobalEstimateResult");
    expect(source).toContain("result.sections");
    expect(source).toContain("result.totals");
  });
});
