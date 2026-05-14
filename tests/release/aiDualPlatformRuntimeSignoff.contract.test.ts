import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("S_AI_QA_04 dual-platform runtime signoff", () => {
  const iosSignoffSource = read("scripts/release/verifyIosAiRuntimeBuildSignoff.ts");
  const releaseGuardSource = read("scripts/release/aiMandatoryEmulatorGateEvaluation.ts");

  it("requires fresh iOS production/TestFlight build proof for current HEAD", () => {
    expect(iosSignoffSource).toContain("S_AI_QA_04_FRESH_IOS_BUILD_SIGNOFF");
    expect(iosSignoffSource).toContain("GREEN_AI_DUAL_PLATFORM_RUNTIME_SIGNOFF_AND_IOS_SUBMIT_READY");
    expect(iosSignoffSource).toContain("buildGitCommit !== currentHead");
    expect(iosSignoffSource).toContain("ios_build_git_commit_matches_head");
    expect(iosSignoffSource).toContain("ios_distribution");
    expect(iosSignoffSource).toContain("ios_build_profile");
  });

  it("requires approved submit proof and blocks fake platform proof", () => {
    expect(iosSignoffSource).toContain("S_AI_QA_04_APP_STORE_CONNECT_SUBMIT_APPROVED");
    expect(iosSignoffSource).toContain("S_AI_QA_04_IOS_SUBMIT_APPROVED");
    expect(iosSignoffSource).toContain("GREEN_IOS_APP_STORE_CONNECT_SUBMIT_PROOF");
    expect(iosSignoffSource).toContain("qa04SubmitProofCaptured");
    expect(iosSignoffSource).toContain("app_store_connect_submit");
    expect(iosSignoffSource).toContain("physical_ios_runtime_claimed: false");
    expect(iosSignoffSource).toContain("fake_ios_pass: false");
    expect(iosSignoffSource).toContain("no_ota_as_native_replacement: true");
    expect(iosSignoffSource).not.toMatch(/fake_ios_pass:\s*true/);
  });

  it("is integrated into release guard as a blocking AI gate artifact", () => {
    expect(releaseGuardSource).toContain("AI_QA04_FRESH_IOS_BUILD_SIGNOFF_MATRIX_ARTIFACT");
    expect(releaseGuardSource).toContain("GREEN_AI_DUAL_PLATFORM_RUNTIME_SIGNOFF_AND_IOS_SUBMIT_READY");
    expect(releaseGuardSource).toContain("BLOCKED_AI_QA04_IOS_SUBMIT_PROOF_MISSING");
    expect(releaseGuardSource).toContain("BLOCKED_AI_QA04_IOS_BUILD_STALE_COMMIT");
    expect(releaseGuardSource).toContain("BLOCKED_AI_QA04_FAKE_IOS_PASS");
  });
});
