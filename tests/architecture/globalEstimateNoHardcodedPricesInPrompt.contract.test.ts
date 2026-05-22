import fs from "node:fs";
import path from "node:path";

describe("global estimate no hardcoded prices in prompt", () => {
  it("keeps numeric rate data in backend seed/rate services, not formatter or tool prompt schema", () => {
    const formatter = fs.readFileSync(path.join(process.cwd(), "src", "lib", "ai", "globalEstimate", "globalEstimateAnswerFormatter.ts"), "utf8");
    const toolSchema = fs.readFileSync(path.join(process.cwd(), "src", "lib", "ai", "globalEstimate", "globalEstimateToolSchema.ts"), "utf8");
    expect(formatter).not.toMatch(/priceDefault|priceMin|priceMax|Configured backend regional reference rate/);
    expect(toolSchema).not.toMatch(/priceDefault|priceMin|priceMax|Configured backend regional reference rate/);
  });
});
