import { expectProfessionalEstimate, estimateForWorkKey } from "./boqDepthTestHelpers";

describe("GKL BOQ depth", () => {
  it("keeps drywall wall cladding/partition with professional material and labor depth", () => {
    const estimate = estimateForWorkKey("drywall_partition", 352, "sq_m");
    expectProfessionalEstimate(estimate);
    expect(estimate.sections.flatMap((section) => section.rows).length).toBeGreaterThanOrEqual(10);
  });
});
