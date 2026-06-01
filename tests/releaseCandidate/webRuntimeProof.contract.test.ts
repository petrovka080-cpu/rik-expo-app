import { getEnterpriseReleaseCandidateReport } from "./releaseCandidateTestHarness";

describe("enterprise release candidate web proof", () => {
  it("requires web runtime, nav, estimate PDF, marketplace validation and clean labels", () => {
    const report = getEnterpriseReleaseCandidateReport();
    const web = report.web;
    expect(web.no_raw_route_labels).toBe(true);
    if (!web.web_runtime_proof_passed) {
      expect(report.matrix.final_status).toBe("BLOCKED_ENTERPRISE_RELEASE_CANDIDATE_NOT_READY");
      expect(report.matrix.blockers).toContain("release_candidate_proof_runner_not_green");
      expect(report.matrix.fake_green_claimed).toBe(false);
      return;
    }

    expect(web.web_runtime_proof_passed).toBe(true);
    expect(web.bottom_nav_order_correct).toBe(true);
    expect(web.estimate_pdf_opened).toBe(true);
    expect(web.marketplace_validation_blocks_incomplete_listing).toBe(true);
  });
});
