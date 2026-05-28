import fs from "node:fs";
import path from "node:path";

describe("release verify timeout classification", () => {
  it("records named gate, artifact path, tails, and process cleanup on timeout", () => {
    const timedRunner = fs.readFileSync(
      path.join(process.cwd(), "scripts/release/runReleaseVerifyWithStepTiming.ts"),
      "utf8",
    );
    const releaseGuard = fs.readFileSync(path.join(process.cwd(), "scripts/release/run-release-guard.ts"), "utf8");

    expect(timedRunner).toContain("BLOCKED_RELEASE_GATE_TIMEOUT_${gate.name}");
    expect(timedRunner).toContain("release_timing.json");
    expect(timedRunner).toContain("process_cleanup.json");
    expect(timedRunner).toContain("stdout_tail");
    expect(timedRunner).toContain("stderr_tail");
    expect(timedRunner).toContain("artifact_path");
    expect(releaseGuard).toContain("BLOCKED_RELEASE_GATE_TIMEOUT_${gate.name}");
    expect(releaseGuard).toContain("RELEASE_GATE_TIMEOUT_MS");
    expect(releaseGuard).toContain("release_gate_name_captured_on_timeout");
  });
});
