import { expectProfessionalEstimate, REQUEST_LINOLEUM_PROMPT } from "./liveB2cEstimateRealityTestHelpers";

describe("/request linoleum estimate", () => {
  it("returns an expanded linoleum BOQ instead of template gap", () => {
    const estimate = expectProfessionalEstimate("/request", REQUEST_LINOLEUM_PROMPT, "linoleum_laying");
    expect(estimate.sections.flatMap((section) => section.rows).length).toBeGreaterThanOrEqual(12);
  });
});
