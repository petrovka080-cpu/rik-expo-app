import { expectProfessionalEstimate, estimateForWorkKey } from "./boqDepthTestHelpers";

describe("tile BOQ depth and formula quality", () => {
  it("keeps tile with waste factor, adhesive, grout, primer and labor", () => {
    const estimate = estimateForWorkKey("ceramic_tile_floor_laying", 174, "sq_m");
    const rows = estimate.sections.flatMap((section) => section.rows);
    const tile = rows.find((row) => /tile_with_waste/.test(row.code));

    expectProfessionalEstimate(estimate);
    expect(tile?.quantity).toBeCloseTo(191.4, 1);
    expect(rows.map((row) => row.code).join("|")).toMatch(/adhesive.*grout.*primer|adhesive|grout|primer/);
  });
});
