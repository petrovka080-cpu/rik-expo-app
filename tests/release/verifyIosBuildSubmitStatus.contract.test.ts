import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("verifyIosBuildSubmitStatus", () => {
  const source = read("scripts/release/verifyIosBuildSubmitStatus.ts");

  it("verifies the submitted iOS build id and rejects simulator or missing-submit proof", () => {
    expect(source).toContain("eas\", \"build:view\"");
    expect(source).toContain("BLOCKED_IOS_BUILD_ID_MISSING");
    expect(source).toContain("BLOCKED_IOS_SUBMIT_NOT_STARTED");
    expect(source).toContain("simulator_build_used_for_submit");
    expect(source).toContain("distribution !== \"STORE\"");
  });

  it("allows post-build proof commits only when they are non-runtime release evidence", () => {
    expect(source).toContain("changedFilesSince");
    expect(source).toContain("isNonRuntimeReleaseProofFile");
    expect(source).toContain("post_build_commits_non_runtime_only");
    expect(source).toContain("fake_submit_pass: false");
    expect(source).not.toMatch(/fake_submit_pass:\s*true/);
  });
});
