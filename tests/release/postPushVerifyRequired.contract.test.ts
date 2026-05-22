import { buildReleasePipelineNoTimeoutMobileRuntimeReport } from "../../scripts/release/releasePipelineNoTimeoutMobileRuntime.shared";

describe("post-push verify requirement", () => {
  it("requires post-push verify and keeps full release gates green", () => {
    const report = buildReleasePipelineNoTimeoutMobileRuntimeReport();

    expect(report.matrix.post_push_verify_passed).toBe(true);
    expect(report.matrix.full_jest_passed).toBe(true);
    expect(report.matrix.release_verify_passed).toBe(true);
    expect(report.postPush.final_status).toBe("GREEN_POST_PUSH_VERIFY_REQUIRED_AND_PASSED");
    expect(report.matrix.fake_green_claimed).toBe(false);
  });
});
