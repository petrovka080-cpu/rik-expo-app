import { getEnterpriseReleaseCandidateReport } from "./releaseCandidateTestHarness";

describe("enterprise release candidate observability", () => {
  it("covers core release events and metrics", () => {
    const observability = getEnterpriseReleaseCandidateReport().observability;
    expect(observability.observability_ready).toBe(true);
    expect(observability.events).toContain("estimate_backend_failed");
    expect(observability.events).toContain("estimate_pdf_opened");
    expect(observability.metrics).toContain("release_verify_duration_ms");
  });
});

