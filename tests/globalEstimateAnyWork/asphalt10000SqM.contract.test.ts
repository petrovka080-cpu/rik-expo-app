import { expectProfessionalBoqEstimate } from "../estimateIntent/anyEstimateTestHelpers";

describe("asphalt 10000 sq m estimate", () => {
  it("returns professional asphalt BOQ with source evidence and PDF action", () => {
    const result = expectProfessionalBoqEstimate("дай мне смету на прокладку асфальта на 10000 кв метров", "asphalt_paving");

    expect(result.input.volume).toBe(10000);
    expect(result.sections.find((section) => section.type === "materials")?.rows.map((row) => row.code)).toEqual([
      "geotextile",
      "sand_base",
      "crushed_stone_base",
      "bitumen_emulsion",
      "asphalt_lower_coarse",
      "asphalt_top_fine",
      "road_marking_optional",
    ]);
    expect(result.sections.find((section) => section.type === "labor")?.rows.length).toBeGreaterThanOrEqual(10);
  });
});
