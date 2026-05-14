import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("AI dual-platform runtime gate architecture", () => {
  it("requires Android source fingerprint proof and iOS build signoff for QA03", () => {
    const rebuildPolicy = read("scripts/release/requireAndroidRebuildForAiSourceChanges.ts");
    const androidBuild = read("scripts/release/buildInstallAndroidPreviewForEmulator.ts");
    const iosSignoff = read("scripts/release/verifyIosAiRuntimeBuildSignoff.ts");
    const releaseGuard = read("scripts/release/aiMandatoryEmulatorGateEvaluation.ts");

    expect(rebuildPolicy).toContain("readCurrentAiMobileRuntimeSourceFiles");
    expect(rebuildPolicy).toContain("installed_apk_source_fingerprint");
    expect(rebuildPolicy).toContain("BLOCKED_ANDROID_REBUILD_REQUIRED_FOR_DIRTY_AI_WORKTREE");
    expect(androidBuild).toContain("local_android_rebuild_install_after_source_change");
    expect(iosSignoff).toContain("GREEN_AI_QA03_DUAL_PLATFORM_RUNTIME_TARGETABILITY_READY");
    expect(iosSignoff).toContain("GREEN_AI_DUAL_PLATFORM_RUNTIME_SIGNOFF_AND_IOS_SUBMIT_READY");
    expect(iosSignoff).toContain("GREEN_IOS_APP_STORE_CONNECT_SUBMIT_PROOF");
    expect(iosSignoff).toContain("BLOCKED_IOS_BUILD_SIGNOFF_REQUIRED");
    expect(iosSignoff).toContain("ios_build_git_commit_matches_head");
    expect(iosSignoff).toContain("dirty_runtime_files");
    expect(releaseGuard).toContain("AI_QA03_DUAL_PLATFORM_RUNTIME_TARGETABILITY_MATRIX_ARTIFACT");
    expect(releaseGuard).toContain("AI_QA04_FRESH_IOS_BUILD_SIGNOFF_MATRIX_ARTIFACT");
    expect(releaseGuard).toContain("BLOCKED_AI_QA03_FAKE_IOS_PASS");
    expect(releaseGuard).toContain("BLOCKED_AI_QA04_FAKE_IOS_PASS");
  });
});
