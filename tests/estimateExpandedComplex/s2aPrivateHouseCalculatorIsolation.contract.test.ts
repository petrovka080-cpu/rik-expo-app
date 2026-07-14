import {
  calculateExpandedComplexEstimate,
  getExpandedComplexWorkFamily,
} from "../../src/lib/ai/expandedComplexWorks";
import { allExpandedRows } from "./expandedComplexTestHelpers";

describe("S2A private house calculator isolation", () => {
  it("routes private house and cottage families away from the high-rise calculator", () => {
    expect(getExpandedComplexWorkFamily("private_house_construction")?.calculatorId).toBe("lowRiseBuildingCalculator");
    expect(getExpandedComplexWorkFamily("cottage_construction")?.calculatorId).toBe("lowRiseBuildingCalculator");
    expect(getExpandedComplexWorkFamily("multi_storey_residential_building")?.calculatorId).toBe("highRiseBuildingCalculator");
  });

  it("uses a low-rise composite BOQ for a complete private house prompt", () => {
    const estimate = calculateExpandedComplexEstimate({
      prompt: "Частный дом 180 м² 2 этажа, ленточный фундамент, стены газоблок, двускатная крыша металлочерепица",
    });

    if (!estimate) throw new Error("PRIVATE_HOUSE_ESTIMATE_NOT_RESOLVED");

    const rows = allExpandedRows(estimate);
    const rowCodes = rows.map((row) => row.code);

    expect(estimate.work_family_id).toBe("private_house_construction");
    expect(estimate.calculatorId).toBe("lowRiseBuildingCalculator");
    expect(estimate.calculatorId).not.toBe("highRiseBuildingCalculator");
    expect(rows.length).toBeGreaterThanOrEqual(45);
    expect(rowCodes.some((code) => code.startsWith("lowrise_"))).toBe(true);
    expect(rowCodes.some((code) => code.startsWith("professional_"))).toBe(false);
    expect(estimate.input_parameters.private_house_readiness_status).toBe("PRELIMINARY_BOQ_PRICE_MISSING");
    expect(estimate.price_state.finalTotalAllowed).toBe(false);
  });

  it("keeps known parameters and asks for missing P0 instead of pretending final readiness", () => {
    const estimate = calculateExpandedComplexEstimate({
      prompt: "Частный дом 160 м² 1 этаж, ленточный фундамент, двускатная крыша",
    });

    if (!estimate) throw new Error("PRIVATE_HOUSE_MISSING_P0_NOT_RESOLVED");

    expect(estimate.calculatorId).toBe("lowRiseBuildingCalculator");
    expect(estimate.input_parameters.area_m2).toBe(160);
    expect(estimate.input_parameters.private_house_readiness_status).toBe("PRELIMINARY_REQUIRES_INPUT");
    expect(estimate.missing_design_inputs).toContain("Материал стен");
    expect(estimate.estimate_level).toBe("PRELIMINARY_BOQ");
    expect(estimate.price_state.finalTotalAllowed).toBe(false);
  });

  it("does not steal multi-storey prompts from the high-rise calculator", () => {
    const estimate = calculateExpandedComplexEstimate({
      prompt: "Многоэтажный жилой комплекс 12000 м²",
    });

    if (!estimate) throw new Error("MULTI_STOREY_ESTIMATE_NOT_RESOLVED");

    expect(estimate.work_family_id).toBe("multi_storey_residential_building");
    expect(estimate.calculatorId).toBe("highRiseBuildingCalculator");
  });
});
