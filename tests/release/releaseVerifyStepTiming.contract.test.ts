import fs from "node:fs";
import path from "node:path";

import { buildReleasePipelineNoTimeoutMobileRuntimeReport } from "../../scripts/release/releasePipelineNoTimeoutMobileRuntime.shared";

describe("release verify step timing", () => {
  it("records release:verify by exact step and forbids timeout escape", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "scripts/release/runReleaseVerifyWithStepTiming.ts"),
      "utf8",
    );
    const report = buildReleasePipelineNoTimeoutMobileRuntimeReport();

    expect(source).toContain("REQUIRED_RELEASE_GATES");
    expect(source).toContain("S_RELEASE_PIPELINE_step_timing.json");
    expect(source).toContain("timeout_protocol");
    expect(report.matrix.release_verify_step_timing_enabled).toBe(true);
    expect(report.matrix.release_verify_timeout).toBe(false);
    expect(report.matrix.timeout_escape_used).toBe(false);
  });
});
