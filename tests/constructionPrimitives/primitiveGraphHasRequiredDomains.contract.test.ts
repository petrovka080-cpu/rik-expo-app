import { primitiveGraph, primitiveGraphValidation } from "./primitiveBoqTestHelpers";

describe("construction primitive graph domains", () => {
  it("covers the required open-world construction domains", () => {
    const domains = new Set(primitiveGraph.domains.map((domain) => domain.domain));
    expect(primitiveGraphValidation.passed).toBe(true);
    expect(primitiveGraph.domains.length).toBeGreaterThanOrEqual(35);
    for (const required of [
      "flooring",
      "tiling",
      "drywall",
      "painting",
      "roofing",
      "waterproofing",
      "masonry",
      "concrete",
      "foundations",
      "roadworks",
      "landscaping",
      "steel_structures",
      "canopies",
      "plumbing",
      "ventilation",
      "electrical",
      "low_voltage",
      "solar",
      "hydropower",
      "well_drilling",
      "sewerage",
      "drainage",
      "commercial_fit_out",
      "renovation",
    ]) {
      expect(domains.has(required as never)).toBe(true);
    }
  });
});
