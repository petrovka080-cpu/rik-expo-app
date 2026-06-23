import { calculateHvacCoolingLoad } from "../../src/lib/ai/constructionFormulas";

describe("HVAC cooling load formula", () => {
  it("sizes a 258 m2 air conditioning request with a deterministic preliminary load", () => {
    const result = calculateHvacCoolingLoad({ areaM2: 258 });

    expect(result.areaM2).toBe(258);
    expect(result.wattsPerM2).toBe(120);
    expect(result.coolingLoadKw).toBe(30.96);
    expect(result.indoorUnitsApprox).toBe(7);
    expect(result.outdoorUnitsApprox).toBe(2);
    expect(result.refrigerantLineM).toBe(116.1);
    expect(result.condensateDrainM).toBe(90.3);
  });
});
