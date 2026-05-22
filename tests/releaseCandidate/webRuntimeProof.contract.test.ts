import { getEnterpriseReleaseCandidateReport } from "./releaseCandidateTestHarness";

describe("enterprise release candidate web proof", () => {
  it("requires web runtime, nav, estimate PDF, marketplace validation and clean labels", () => {
    const web = getEnterpriseReleaseCandidateReport().web;
    expect(web.web_runtime_proof_passed).toBe(true);
    expect(web.bottom_nav_order_correct).toBe(true);
    expect(web.estimate_pdf_opened).toBe(true);
    expect(web.marketplace_validation_blocks_incomplete_listing).toBe(true);
    expect(web.no_raw_route_labels).toBe(true);
  });
});

