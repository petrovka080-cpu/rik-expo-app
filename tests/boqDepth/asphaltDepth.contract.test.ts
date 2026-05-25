import { expectProfessionalEstimate, estimateForWorkKey } from "./boqDepthTestHelpers";

describe("asphalt BOQ depth and formula quality", () => {
  it("keeps asphalt with base layers, bitumen, asphalt concrete, equipment and compaction", () => {
    const estimate = estimateForWorkKey("asphalt_paving", 1000, "sq_m");
    const codes = estimate.sections.flatMap((section) => section.rows).map((row) => row.code).join("|");

    expectProfessionalEstimate(estimate);
    expect(codes).toMatch(/sand_base/);
    expect(codes).toMatch(/crushed_stone_base/);
    expect(codes).toMatch(/bitumen_emulsion/);
    expect(codes).toMatch(/asphalt_lower|asphalt_top/);
    expect(codes).toMatch(/compaction/);
  });
});
