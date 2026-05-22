import fs from "node:fs";
import path from "node:path";

import { buildReleasePipelineNoTimeoutMobileRuntimeReport } from "../../scripts/release/releasePipelineNoTimeoutMobileRuntime.shared";

describe("Android installed runtime proof", () => {
  it("uses installed APK runtime evidence and rejects fake emulator pass", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "scripts/release/verifyAndroidInstalledBuildRuntime.ts"),
      "utf8",
    );
    const report = buildReleasePipelineNoTimeoutMobileRuntimeReport();

    expect(source).toContain("ensureAndroidEmulatorReady");
    expect(source).toContain("fake_emulator_pass");
    expect(source).toContain("GREEN_ANDROID_POST_INSTALL_RUNTIME_SIGNOFF");
    expect(report.matrix.android_runtime_verified).toBe(true);
    expect(report.androidRuntime.source).toHaveProperty("fake_emulator_pass", false);
  });
});
