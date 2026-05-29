import fs from "node:fs";
import path from "node:path";

test("production canary rejects API36 Android green", () => {
  const android = fs.readFileSync(path.join(process.cwd(), "scripts/e2e/runAndroidApi34AiEstimateProductionCanarySmoke.ts"), "utf8");
  expect(android).toContain("api36_rejected");
  expect(android).toContain("android_sdk");
  expect(android).not.toMatch(/api36_rejected:\s*true\s*,\s*android_api34_tested:\s*true/i);
});
