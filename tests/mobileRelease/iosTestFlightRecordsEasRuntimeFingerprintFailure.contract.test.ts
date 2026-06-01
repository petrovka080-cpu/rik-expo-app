import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  artifactDir,
  buildLocalDependencyResolutionReport,
  writeEasRuntimeFingerprintFailureArtifact,
  type RuntimeFingerprintResolution,
} from "../../scripts/release/iosTestFlightInternalQaCore";

const stableRuntimeFingerprint: RuntimeFingerprintResolution = {
  command: "npx expo-updates runtimeversion:resolve --platform ios",
  command_ok: true,
  status: 0,
  runtime_version: "74a280d2882c3ef76937c8704da2fba8dca7d739",
  fingerprint_sources_count: 1,
  stderr: "",
};

describe("iOS TestFlight runtime fingerprint failure artifact", () => {
  it("records the failed EAS mismatch without claiming a retry green", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "ios-testflight-runtime-"));
    const nodeModules = path.join(rootDir, "node_modules");
    const localDependencyResolution = buildLocalDependencyResolutionReport({
      rootDir,
      projectNodeModulesRealpath: nodeModules,
      packageJsonResolutions: {
        expo: path.join(nodeModules, "expo", "package.json"),
        "@expo/fingerprint": path.join(nodeModules, "@expo", "fingerprint", "package.json"),
      },
      runtimeFingerprint: stableRuntimeFingerprint,
    });

    const artifact = writeEasRuntimeFingerprintFailureArtifact(rootDir, localDependencyResolution);
    const artifactPath = path.join(artifactDir(rootDir), "eas_runtime_fingerprint_failure.json");

    expect(fs.existsSync(artifactPath)).toBe(true);
    expect(artifact.final_status).toBe("BLOCKED_IOS_RUNTIME_FINGERPRINT_MISMATCH_PREVENTED_FROM_REPEAT");
    expect(artifact.failed_build_id).toBe("c81edecb-3deb-41d6-9eb0-8ceb87026dc5");
    expect(artifact.failed_phase).toBe("Configure expo-updates");
    expect(artifact.retry_allowed_after_local_gates_green).toBe(false);
    expect(artifact.fake_green_claimed).toBe(false);
  });
});
