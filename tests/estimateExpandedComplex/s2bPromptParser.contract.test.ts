import { calculateExpandedComplexEstimate } from "../../src/lib/ai/expandedComplexWorks";

describe("S2B prompt parser", () => {
  it("extracts real numeric values from required prompts", () => {
    expect(calculateExpandedComplexEstimate({ prompt: "Асфальтирование 10 000 м²" })?.input_parameters.road_area_m2).toBe(10000);
    expect(calculateExpandedComplexEstimate({ prompt: "Дорога 1 км шириной 7 м, асфальтобетон, основание щебень" })?.input_parameters.length_m).toBe(1000);
    expect(calculateExpandedComplexEstimate({ prompt: "Водопровод Ø110 длиной 1 000 м" })?.input_parameters.diameter_mm).toBe(110);
    expect(calculateExpandedComplexEstimate({ prompt: "Подпорная стена 80 × 4 м" })?.input_parameters.wall_face_area_m2).toBe(320);
    expect(calculateExpandedComplexEstimate({ prompt: "Солнечная электростанция 30 кВт" })?.input_parameters.capacity_mw).toBe(0.03);
    expect(calculateExpandedComplexEstimate({ prompt: "Скважина глубиной 80 м" })?.input_parameters.depth_m).toBe(80);
  });
});
