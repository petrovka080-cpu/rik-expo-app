import fs from "node:fs";
import path from "node:path";

describe("global estimate no hardcoded tax in prompt", () => {
  it("keeps tax rates in tax rules, not formatter or tool schema", () => {
    const formatter = fs.readFileSync(path.join(process.cwd(), "src", "lib", "ai", "globalEstimate", "globalEstimateAnswerFormatter.ts"), "utf8");
    const toolSchema = fs.readFileSync(path.join(process.cwd(), "src", "lib", "ai", "globalEstimate", "globalEstimateToolSchema.ts"), "utf8");
    expect(formatter).not.toMatch(/0\.0825|0\.19|0\.2|0\.09|0\.05|0\.18/);
    expect(toolSchema).not.toMatch(/0\.0825|0\.19|0\.2|0\.09|0\.05|0\.18/);
  });
});
