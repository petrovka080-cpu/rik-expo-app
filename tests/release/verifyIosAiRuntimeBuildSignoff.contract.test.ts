import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("verifyIosAiRuntimeBuildSignoff", () => {
  const source = read("scripts/release/verifyIosAiRuntimeBuildSignoff.ts");

  it("requires iOS build signoff without using OTA or fake physical runtime proof", () => {
    expect(source).toContain("S_AI_QA_03_DUAL_PLATFORM_RUNTIME_TARGETABILITY");
    expect(source).toContain("S_AI_QA_03_REQUIRE_IOS_BUILD_SIGNOFF");
    expect(source).toContain("S_AI_QA_03_IOS_BUILD_APPROVED");
    expect(source).toContain("npx\", [\"eas\", \"build:view\"");
    expect(source).toContain("no_ota_as_native_replacement: true");
    expect(source).toContain("physical_ios_runtime_claimed: false");
    expect(source).toContain("fake_ios_pass: false");
    expect(source).not.toMatch(/fake_ios_pass:\s*true/);
  });

  it("blocks stale runtime builds and submit without explicit approval", () => {
    expect(source).toContain("post_build_runtime_changes");
    expect(source).toContain("isAiRuntimeSourceChange");
    expect(source).toContain("BLOCKED_IOS_BUILD_SIGNOFF_STALE_OR_INVALID");
    expect(source).toContain("BLOCKED_IOS_SUBMIT_APPROVAL_MISSING");
    expect(source).toContain("S_AI_QA_03_APP_STORE_CONNECT_SUBMIT_APPROVED");
    expect(source).toContain("qa04SubmitProofCaptured");
    expect(source).toContain("app_store_connect_submit: submitCaptured ? \"PASS\" : \"NOT_APPROVED\"");
  });

  it("includes dirty runtime worktree changes in iOS stale-build detection", () => {
    expect(source).toContain("readDirtyWorktreeChangedFiles");
    expect(source).toContain("\"diff\", \"--name-only\", \"--diff-filter=ACMR\", \"--cached\"");
    expect(source).toContain("\"ls-files\", \"--others\", \"--exclude-standard\"");
    expect(source).toContain("dirtyRuntimeChanges");
    expect(source).toContain("...dirtyRuntimeChanges");
  });

  it("can discover a fresh current-HEAD production iOS build and bind submit proof to that build", () => {
    expect(source).toContain("findLatestCurrentHeadIosBuild");
    expect(source).toContain("build:list");
    expect(source).toContain("--git-commit-hash");
    expect(source).toContain("findLatestCurrentIosProductionBuild");
    expect(source).toContain("coreArtifactMatchesBuild");
    expect(source).toContain("qa04SubmitPath");
    expect(source).toContain("GREEN_IOS_APP_STORE_CONNECT_SUBMIT_PROOF");
  });

  it("writes QA04 fresh iOS signoff artifacts with current-head and simulator guards", () => {
    expect(source).toContain("S_AI_QA_04_FRESH_IOS_BUILD_SIGNOFF");
    expect(source).toContain("GREEN_AI_DUAL_PLATFORM_RUNTIME_SIGNOFF_AND_IOS_SUBMIT_READY");
    expect(source).toContain("ios_build_git_commit_matches_head");
    expect(source).toContain("dirty_runtime_files");
    expect(source).toContain("simulatorBuildUsed");
    expect(source).toContain("buildGitCommit !== currentHead");
    expect(source).toContain("writeAllQaArtifacts");
  });
});
