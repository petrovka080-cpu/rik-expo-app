import fs from "node:fs";

const source = fs.readFileSync("scripts/release/verifyNativeAiReleaseProofBlockers.ts", "utf8");

describe("native AI release proof blockers verifier", () => {
  it("records Android, iOS, and no-fake-native-proof invariants", () => {
    expect(source).toContain("S_NATIVE_AI_RELEASE_PROOF_BLOCKERS_CLOSEOUT");
    expect(source).toContain("BLOCKED_IOS_RUNTIME_PROOF_HOST_UNAVAILABLE");
    expect(source).toContain("BLOCKED_IOS_BUILD_SIGNOFF_REQUIRED");
    expect(source).toContain("BLOCKED_AI_QA04_IOS_BUILD_STALE_COMMIT");
    expect(source).toContain("BLOCKED_AI_QA04_IOS_SUBMIT_PROOF_MISSING");
    expect(source).toContain("android_used_as_ios_proof: false");
    expect(source).toContain("web_used_as_native_proof: false");
    expect(source).toContain("blind_android_rebuild: false");
    expect(source).toContain("blind_ios_build: false");
    expect(source).toContain("blind_ota_publish: false");
    expect(source).toContain("fake_green_claimed: false");
  });

  it("limits the dirty-worktree allowance to this native proof wave", () => {
    expect(source).toContain("currentWaveAllowedDirtyPaths");
    expect(source).toContain("scripts/e2e/runAiRoleScreenKnowledgeMaestro.ts");
    expect(source).toContain("artifacts/S_AI_QA_01_MANDATORY_EMULATOR_RUNTIME_GATE_");
    expect(source).toContain("artifacts/S_ANDROID_MAESTRO_DRIVER_STABILITY_REPAIR_");
    expect(source).toContain("replace(/^[ MADRCU?!]{1,2}\\s+/, \"\")");
    expect(source).toContain("currentWaveAllowedDirtyPrefixes.some");
    expect(source).not.toContain('normalized.startsWith("artifacts/")');
    expect(source).not.toContain('normalized.startsWith("scripts/")');
  });

  it("uses device-side adb shell for uiautomator proof instead of Windows shell chaining", () => {
    expect(source).toContain("androidUiDumpTimeoutMs = 60_000");
    expect(source).toContain("androidUiDumpRetryCount = 1");
    expect(source).toContain('["-s", params.serial, "shell", `uiautomator dump ${params.remotePath} && cat ${params.remotePath}`]');
    expect(source).toContain('["-s", params.serial, "wait-for-device"]');
    expect(source).toContain('shell: shouldUseShell(command)');
  });
});
