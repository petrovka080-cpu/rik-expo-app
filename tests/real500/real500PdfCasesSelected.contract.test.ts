import { REAL_DIVERSE_500_CONSTRUCTION_WORKS } from "../../src/lib/ai/estimatorKernel/fixtures/realDiverse500ConstructionWorks";

test("real 500 fixture selects exactly 75 PDF extraction cases including P0 domains", () => {
  const pdfCases = REAL_DIVERSE_500_CONSTRUCTION_WORKS.filter((item) => item.pdfRequired);
  expect(pdfCases).toHaveLength(75);
  for (const domain of ["paving_landscaping", "canopies", "concrete", "elevators_regulated", "drainage", "waterproofing", "roofing", "flooring", "electrical", "hydropower", "foundation", "ventilation", "asphalt_roadworks", "well_drilling", "solar"]) {
    expect(pdfCases.some((item) => item.domain === domain)).toBe(true);
  }
});
