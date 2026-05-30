import fs from "node:fs";
import path from "node:path";

test("limited public beta rejects API36 Android green", () => {
  const android = fs.readFileSync(path.join(process.cwd(), "scripts/e2e/runAndroidApi34AiEstimateLimitedPublicBetaSmoke.ts"), "utf8");
  const core = fs.readFileSync(path.join(process.cwd(), "scripts/e2e/aiEstimateLimitedPublicBetaExecutionCore.ts"), "utf8");
  expect(`${android}\n${core}`).toContain("api36_rejected");
  expect(`${android}\n${core}`).toContain("android_sdk");
  expect(`${android}\n${core}`).not.toMatch(/api36_rejected:\s*true\s*,\s*android_api34_tested:\s*true/i);
});
