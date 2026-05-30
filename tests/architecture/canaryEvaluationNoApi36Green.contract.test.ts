import fs from "node:fs";
import path from "node:path";

test("canary evaluation never accepts API36 as green", () => {
  const androidScript = fs.readFileSync(
    path.join(process.cwd(), "scripts", "e2e", "runAndroidApi34AiEstimateCanaryEvaluationSmoke.ts"),
    "utf8",
  );
  expect(androidScript).toContain("api36_rejected");
  expect(androidScript).not.toMatch(/api36_rejected:\s*true/);
});
