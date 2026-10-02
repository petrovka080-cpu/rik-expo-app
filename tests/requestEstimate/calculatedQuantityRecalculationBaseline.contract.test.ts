import { compileCanonicalEstimateCore } from "../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { estimateDeterministicHash } from "../../src/lib/estimate/estimateDeterministicHash";
import {
  PRESSURE_SEWER_PIPELINE_CATALOG_ID,
  PRESSURE_SEWER_PIPELINE_FORMULAS,
  PRESSURE_SEWER_PIPELINE_PARAMETERS,
  PRESSURE_SEWER_PIPELINE_RESOURCES,
  PRESSURE_SEWER_PIPELINE_RUNTIME_INPUT,
  PRESSURE_SEWER_PIPELINE_SHORT_INPUT,
} from "../../src/lib/estimate/v4/pressureSewerPipelineR1";

describe("manual resource quantity versus the current formula baseline", () => {
  it("pins the manual quantity, refreshes the comparison after primary input edit, and resets to the new result", async () => {
    const rowId = "rc09:psp_bedding";
    const compile = (length: number, manualQuantity: string | null) => compileCanonicalEstimateCore({
      operation: "recalculate",
      compilerVersion: "s27-28-manual-baseline-contract",
      catalogId: PRESSURE_SEWER_PIPELINE_CATALOG_ID,
      primaryMeasureParameterId: "psp_route_length_m",
      parameterDefinitions: [...PRESSURE_SEWER_PIPELINE_PARAMETERS],
      formulaDefinitions: [...PRESSURE_SEWER_PIPELINE_FORMULAS],
      resourceDefinitions: [...PRESSURE_SEWER_PIPELINE_RESOURCES],
      submittedParameters: { ...PRESSURE_SEWER_PIPELINE_SHORT_INPUT, psp_route_length_m: length },
      confirmedParameters: { ...PRESSURE_SEWER_PIPELINE_RUNTIME_INPUT },
      currencyCode: "KGS",
      priceItems: [],
      maximumResourceRows: 47,
      rowOverrides: {
        [rowId]: { quantity: manualQuantity, provenance: { kind: "manual", reason: "test-owned quantity correction" } },
      },
      hashJson: async (value) => estimateDeterministicHash(value),
    });
    const first = (await compile(100, "12")).rows.find((row) => row.row_id === rowId)!;
    expect(first.quantity).toBe("12");
    expect(first.calculation_trace).toMatchObject({
      manualQuantityOverride: true, calculatedQuantityBeforeOverride: "7.015",
    });
    const changed = (await compile(200, "12")).rows.find((row) => row.row_id === rowId)!;
    expect(changed.quantity).toBe("12");
    expect(changed.calculation_trace).toMatchObject({
      manualQuantityOverride: true, calculatedQuantityBeforeOverride: "14.03",
    });
    const reset = (await compile(200, null)).rows.find((row) => row.row_id === rowId)!;
    expect(reset.quantity).toBe("14.03");
    expect(reset.calculation_trace).not.toHaveProperty("manualQuantityOverride");
    expect(PRESSURE_SEWER_PIPELINE_RUNTIME_INPUT.psp_bedding_order_factor).toBe(1.15);
  });
});
