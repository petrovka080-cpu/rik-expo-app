import { calculateGlobalEstimateToolSchema, mapGlobalEstimateToolInput } from "../../src/lib/ai/globalEstimate";

describe("global estimate tool schema", () => {
  it("defines calculate_global_estimate without forcing AI to invent country_code", () => {
    expect(calculateGlobalEstimateToolSchema.name).toBe("calculate_global_estimate");
    expect(calculateGlobalEstimateToolSchema.parameters.required).toEqual(["work_type", "volume", "unit"]);
    expect(calculateGlobalEstimateToolSchema.parameters.required).not.toContain("country_code");
    expect(mapGlobalEstimateToolInput({
      work_type: "laminate_laying",
      volume: 100,
      unit: "m2",
      original_text: "laminate 100 m2",
    })).toMatchObject({ explicitWorkKey: "laminate_laying", volume: 100, unit: "m2" });
  });
});
