import fs from "fs";
import path from "path";

describe("BATCH001 R2 no test weakening", () => {
  test("contains no skipped, focused-only, todo or placeholder contract tests", () => {
    const root = path.resolve(__dirname);
    const files = fs.readdirSync(root).filter((name) =>
      name.startsWith("batch001R2") &&
      name.endsWith(".test.ts") &&
      name !== "batch001R2NoTestWeakening.contract.test.ts");
    expect(files.length).toBeGreaterThanOrEqual(25);
    for (const file of files) {
      const source = fs.readFileSync(path.join(root, file), "utf8");
      expect(source).not.toMatch(/\b(?:describe|test|it)\.(?:skip|only|todo)\b/);
      expect(source).not.toMatch(/PLACEHOLDER|TODO_PASS|expect\(true\)\.toBe\(true\)/);
    }
  });
});
