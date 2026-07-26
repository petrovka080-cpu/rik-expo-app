import { expectProfessionalEstimate, estimateForWorkKey } from "./boqDepthTestHelpers";

describe("masonry BOQ depth", () => {
  it("keeps brick masonry at the full-professional depth with materials, labor and delivery/equipment warnings", () => {
    const estimate = estimateForWorkKey("brick_masonry", 74, "sq_m");
    expectProfessionalEstimate(estimate);
    expect(estimate.sections.flatMap((section) => section.rows)).toHaveLength(75);
  });
});
