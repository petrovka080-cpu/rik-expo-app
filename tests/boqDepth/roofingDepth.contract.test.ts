import { expectProfessionalEstimate, estimateForWorkKey } from "./boqDepthTestHelpers";

describe("roofing BOQ depth and formula quality", () => {
  it("keeps gable roof as a full roofing BOQ with membrane, battens, flashings and labor", () => {
    const estimate = estimateForWorkKey("gable_roof_installation", 100, "sq_m");
    const codes = estimate.sections.flatMap((section) => section.rows).map((row) => row.code).join("|");

    expectProfessionalEstimate(estimate);
    expect(codes).toMatch(/gable_roof_membrane/);
    expect(codes).toMatch(/gable_roof_batten/);
    expect(codes).toMatch(/gable_roof_flashings/);
    expect(codes).toMatch(/gable_roof_covering_install/);
  });
});
