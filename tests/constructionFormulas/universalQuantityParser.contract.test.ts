import { parseUniversalConstructionQuantities } from "../../src/lib/ai/constructionFormulas";

describe("universal construction quantity parser", () => {
  it("parses comma decimals, dimensions, counts, floors, length, area and power", () => {
    expect(parseUniversalConstructionQuantities("0,4x0,5x5 m 10 pcs")).toMatchObject({
      widthM: 0.4,
      lengthM: 0.5,
      heightM: 5,
      count: 10,
    });
    expect(parseUniversalConstructionQuantities("estimate 100 sq m").areaM2).toBe(100);
    expect(parseUniversalConstructionQuantities("drainage channels 120 meters").lengthM).toBe(120);
    expect(parseUniversalConstructionQuantities("lift for 14 floors").floorCount).toBe(14);
    expect(parseUniversalConstructionQuantities("solar panels 30 kW").powerKw).toBe(30);
    expect(parseUniversalConstructionQuantities("solar power plant 100 MW").powerKw).toBe(100000);
  });
});
