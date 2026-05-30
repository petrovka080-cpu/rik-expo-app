import fs from "node:fs";
import path from "node:path";

test("timed release verify writes process cleanup evidence", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "scripts/release/runReleaseVerifyWithStepTiming.ts"), "utf8");

  expect(source).toContain("process_cleanup_ready");
  expect(source).toContain("orphan_processes_left_after_timeout");
  expect(source).toContain("killProcessTree");
});

