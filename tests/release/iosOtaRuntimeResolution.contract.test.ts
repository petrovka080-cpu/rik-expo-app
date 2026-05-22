import fs from "node:fs";
import path from "node:path";

import { buildReleasePipelineNoTimeoutMobileRuntimeReport } from "../../scripts/release/releasePipelineNoTimeoutMobileRuntime.shared";

describe("iOS OTA runtime resolution", () => {
  it("requires exact runtime status and never claims physical iPhone green without proof", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "scripts/release/runIosOtaRuntimeResolutionProof.ts"),
      "utf8",
    );
    const report = buildReleasePipelineNoTimeoutMobileRuntimeReport();

    expect(source).toContain("writeReleasePipelineNoTimeoutMobileRuntimeArtifacts");
    expect(report.matrix.ios_runtime_resolved_or_external_blocker_exact).toBe(true);
    expect(report.matrix.iphone_qa_green_claimed_without_proof).toBe(false);
    expect(report.iosRuntime).toHaveProperty("ios_exact_blocker");
    expect(report.iosRuntime).toHaveProperty("iphone_physical_proof_present");
  });
});
