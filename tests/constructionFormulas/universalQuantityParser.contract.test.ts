import { parseUniversalConstructionQuantities } from "../../src/lib/ai/constructionFormulas";

describe("universal construction quantity parser", () => {
  it("parses comma decimals, dimensions, counts, floors, length, area and power", () => {
    expect(parseUniversalConstructionQuantities("0,4×0,5×5 м 10 штук")).toMatchObject({
      widthM: 0.4,
      lengthM: 0.5,
      heightM: 5,
      count: 10,
    });
    expect(parseUniversalConstructionQuantities("смета 100 кв м").areaM2).toBe(100);
    expect(parseUniversalConstructionQuantities("дренажные каналы 120 метров").lengthM).toBe(120);
    expect(parseUniversalConstructionQuantities("лифт на 14 этажей").floorCount).toBe(14);
    expect(parseUniversalConstructionQuantities("солнечные панели 30 кВт").powerKw).toBe(30);
  });
});
