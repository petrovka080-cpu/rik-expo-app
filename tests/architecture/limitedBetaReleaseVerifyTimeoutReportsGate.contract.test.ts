import fs from "node:fs";
import path from "node:path";

test("timed release verify records the exact gate on timeout", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "scripts/release/runReleaseVerifyWithStepTiming.ts"), "utf8");

  expect(source).toContain("BLOCKED_RELEASE_GATE_TIMEOUT_${gate.name}");
  expect(source).toContain("release_gate_name_captured_on_timeout");
  expect(source).toContain("RELEASE_GUARD_CURRENT_GATE");
});

