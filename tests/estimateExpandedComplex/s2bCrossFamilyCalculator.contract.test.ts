import { calculateExpandedComplexEstimate } from "../../src/lib/ai/expandedComplexWorks";

describe("S2B cross-family calculator isolation", () => {
  it("does not route water, sewer, stormwater, ventilation, wells or private houses through wrong calculators", () => {
    expect(calculateExpandedComplexEstimate({ prompt: "Водопровод Ø110 длиной 1 000 м" })?.calculatorId).toBe("villageWaterSupplyCalculator");
    expect(calculateExpandedComplexEstimate({ prompt: "Канализация Ø200 длиной 800 м, 12 колодцев" })?.calculatorId).toBe("sewerNetworkCalculator");
    expect(calculateExpandedComplexEstimate({ prompt: "Ливневая канализация 500 м с дождеприёмниками" })?.calculatorId).toBe("stormwaterNetworkCalculator");
    expect(calculateExpandedComplexEstimate({ prompt: "Вентиляция кафе 120 м²" })?.calculatorId).toBe("heatingVentilationCalculator");
    expect(calculateExpandedComplexEstimate({ prompt: "Скважина глубиной 80 м" })?.calculatorId).toBe("wellConstructionCalculator");
    expect(calculateExpandedComplexEstimate({ prompt: "Частный дом 160 м², стены газоблок, ленточный фундамент, двускатная крыша" })?.calculatorId).toBe("lowRiseBuildingCalculator");
  });
});
