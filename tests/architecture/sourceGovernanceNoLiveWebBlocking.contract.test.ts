import fs from "node:fs";
import path from "node:path";

describe("source governance no live web blocking", () => {
  it("does not call network or browser APIs from source policy validation", () => {
    const source = fs.readdirSync(path.resolve(process.cwd(), "src/lib/ai/globalEstimate/sourceGovernance"))
      .filter((name) => name.endsWith(".ts"))
      .map((name) => fs.readFileSync(path.resolve(process.cwd(), "src/lib/ai/globalEstimate/sourceGovernance", name), "utf8"))
      .join("\n");
    expect(source).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|playwright|BASE_URL|page\.goto/);
  });
});
