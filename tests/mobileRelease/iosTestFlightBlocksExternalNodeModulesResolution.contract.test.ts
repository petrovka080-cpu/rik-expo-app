import path from "node:path";

import {
  buildLocalDependencyResolutionReport,
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

describe("iOS TestFlight external node_modules guard", () => {
  it("rejects package resolution through C:\\node_modules or the sibling main checkout", () => {
    const rootDir = process.cwd();
    const globalNodeModules = path.join(path.parse(rootDir).root, "node_modules");
    const siblingNodeModules = path.join(path.dirname(rootDir), "rik-expo-app", "node_modules");
    const report = buildLocalDependencyResolutionReport({
      rootDir,
      projectNodeModulesRealpath: globalNodeModules,
      packageJsonResolutions: {
        expo: path.join(globalNodeModules, "expo", "package.json"),
        "@expo/fingerprint": path.join(siblingNodeModules, "@expo", "fingerprint", "package.json"),
      },
      runtimeFingerprint: stableRuntimeFingerprint,
    });

    expect(report.ready).toBe(false);
    expect(report.project_node_modules_within_worktree).toBe(false);
    expect(report.resolved_paths_use_global_node_modules_junction).toBe(true);
    expect(report.resolved_paths_use_sibling_main_checkout).toBe(true);
    expect(report.disallowed_resolution_paths.length).toBeGreaterThanOrEqual(2);
  });
});
