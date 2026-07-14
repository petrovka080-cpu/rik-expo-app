import {
  calculateExpandedComplexEstimate,
  getExpandedComplexWorkFamily,
} from "../../src/lib/ai/expandedComplexWorks";
import {
  s2bWave2KindForFamily,
} from "../../src/lib/ai/expandedComplexWorks/s2b/registry";
import {
  S2B_PROFESSIONAL_MIN_ROWS,
  S2B_REGULATED_SAFETY_NOTICE,
  S2B_WAVE2_CONTROL_CASES,
} from "../../src/lib/ai/expandedComplexWorks/s2b/types";
import { allExpandedRows, expectExpandedSnapshotPdfBuyer } from "./expandedComplexTestHelpers";

describe("S2B infrastructure and engineering professional BOQ wave 2", () => {
  it("keeps private house out of the high-rise calculator before Wave 2 starts", () => {
    const family = getExpandedComplexWorkFamily("private_house_construction");

    expect(family?.calculatorId).toBe("lowRiseBuildingCalculator");
    expect(family?.calculatorId).not.toBe("highRiseBuildingCalculator");
  });

  it("decomposes all Wave 2 control prompts with domain-specific rows and no generic skeleton", () => {
    for (const testCase of S2B_WAVE2_CONTROL_CASES) {
      const estimate = calculateExpandedComplexEstimate({ prompt: testCase.prompt });
      if (!estimate) throw new Error(`S2B_ESTIMATE_NOT_RESOLVED:${testCase.id}`);

      const rows = allExpandedRows(estimate);
      const rowCodes = rows.map((row) => row.code).join("\n");
      const trace = estimate.calculation_trace.join("\n");

      expect(estimate.work_family_id).toBe(testCase.familyId);
      expect(estimate.calculatorId).toBe(testCase.calculatorId);
      expect(s2bWave2KindForFamily(getExpandedComplexWorkFamily(estimate.work_family_id)!)).toBe(testCase.kind);
      expect(rows.length).toBeGreaterThanOrEqual(S2B_PROFESSIONAL_MIN_ROWS);
      expect(rows.some((row) => row.code.startsWith("professional_"))).toBe(false);
      expect(new Set(rows.map((row) => row.code)).size).toBe(rows.length);
      expect(estimate.missing_design_inputs.length).toBeGreaterThan(0);
      expect(estimate.price_state.finalTotalAllowed).toBe(false);
      expect(estimate.calculation_trace).toHaveLength(rows.length);

      for (const token of testCase.requiredCodeTokens) {
        expect(`${rowCodes}\n${trace}`).toContain(token);
      }

      if (testCase.regulated) {
        expect(estimate.limitations).toContain(S2B_REGULATED_SAFETY_NOTICE);
      }

      expectExpandedSnapshotPdfBuyer(estimate);
    }
  });

  it("separates voltage kV from area m2 in electrical prompts", () => {
    const cable = calculateExpandedComplexEstimate({ prompt: "Кабельная линия 10 кВ длиной 2 км" });
    const building = calculateExpandedComplexEstimate({ prompt: "Электрика здания 180 м²" });

    if (!cable || !building) throw new Error("S2B_ELECTRICAL_CASE_NOT_RESOLVED");

    expect(cable.input_parameters.voltage_kv).toBe(10);
    expect(cable.input_parameters.length_m).toBe(2000);
    expect(cable.input_parameters).not.toHaveProperty("area_m2");
    expect(allExpandedRows(cable).filter((row) => /cable|кабель/i.test(`${row.code} ${row.titleRu}`)).every((row) => row.unit !== "m2")).toBe(true);

    expect(building.input_parameters.area_m2).toBe(180);
    expect(building.input_parameters).not.toHaveProperty("voltage_kv");
  });

  it("keeps sewer, stormwater and water supply on separate calculators", () => {
    expect(calculateExpandedComplexEstimate({ prompt: "Водопровод 500 м, ПЭ100 Ø110 мм" })?.calculatorId).toBe("villageWaterSupplyCalculator");
    expect(calculateExpandedComplexEstimate({ prompt: "Канализация 300 м, Ø200 мм, 12 колодцев" })?.calculatorId).toBe("sewerNetworkCalculator");
    expect(calculateExpandedComplexEstimate({ prompt: "Ливневая сеть с дождеприёмниками" })?.calculatorId).toBe("stormwaterNetworkCalculator");
  });
});
