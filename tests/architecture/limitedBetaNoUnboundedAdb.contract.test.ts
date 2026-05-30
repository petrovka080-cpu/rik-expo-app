import fs from "node:fs";
import path from "node:path";

test("timed release verify uses bounded step execution instead of unbounded adb loops", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "scripts/release/runReleaseVerifyWithStepTiming.ts"), "utf8");

  expect(source).toContain("DEFAULT_STEP_TIMEOUT_MS");
  expect(source).toContain("setTimeout");
  expect(source).not.toMatch(/while\s*\(\s*true\s*\)[\s\S]*adb/i);
});

