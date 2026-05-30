import fs from "node:fs";
import path from "node:path";

test("internal canary Android proof rejects API36 green", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "scripts/e2e/runAndroidApi34AiEstimateInternalCanarySmoke.ts"),
    "utf8",
  );
  expect(source).toContain("api36_rejected");
  expect(source).toContain("resolveCanonicalApi34Evidence");
});
