import {
  buildExpandedComplexBuyerHandoff,
  buildExpandedComplexPdfModel,
  buildExpandedComplexSnapshot,
  calculateExpandedComplexEstimate,
  type ExpandedComplexCalculatorOutput,
} from "../../src/lib/ai/expandedComplexWorks";
import { validateProfessionalBoqUnit } from "../../src/lib/estimate/canonicalUnits";

function requireEstimate(prompt: string, familyId: string, calculatorId: string): ExpandedComplexCalculatorOutput {
  const estimate = calculateExpandedComplexEstimate({ prompt });
  if (!estimate) throw new Error(`estimate_missing:${familyId}`);
  expect(estimate.work_family_id).toBe(familyId);
  expect(estimate.calculatorId).toBe(calculatorId);
  expect(estimate.estimate_level).toBe("PRELIMINARY_BOQ");
  expect(estimate.price_state.finalTotalAllowed).toBe(false);
  expect(estimate.material_rows.length).toBeGreaterThan(0);
  expect(estimate.work_rows.length).toBeGreaterThan(0);
  expect(estimate.equipment_rows.length + estimate.service_rows.length).toBeGreaterThan(0);
  return estimate;
}

function allRows(estimate: ExpandedComplexCalculatorOutput) {
  return [
    ...estimate.material_rows,
    ...estimate.work_rows,
    ...estimate.equipment_rows,
    ...estimate.service_rows,
  ];
}

function rowByCode(estimate: ExpandedComplexCalculatorOutput, code: string) {
  const row = allRows(estimate).find((candidate) => candidate.code === code);
  if (!row) throw new Error(`row_missing:${estimate.work_family_id}:${code}`);
  return row;
}

function expectProfessionalHandoff(estimate: ExpandedComplexCalculatorOutput): void {
  const rows = allRows(estimate);
  const snapshot = buildExpandedComplexSnapshot(estimate);
  const pdf = buildExpandedComplexPdfModel(snapshot);
  const buyer = buildExpandedComplexBuyerHandoff(snapshot);
  const buyerRows = [
    ...buyer.procurement_materials,
    ...buyer.equipment_to_purchase,
    ...buyer.delivery_procurement_services,
  ];

  expect(rows.every((row) => row.quantity > 0)).toBe(true);
  expect(rows.every((row) => row.quantityFormula && row.formulaId && row.normId)).toBe(true);
  expect(rows.every((row) => validateProfessionalBoqUnit({
    unit: row.unit,
    rowCode: row.code,
    rowLabel: row.titleRu,
    rowKind: row.lineType,
    workFamily: estimate.work_family_id,
  }).valid)).toBe(true);
  expect(pdf.rows_equal_snapshot).toBe(true);
  expect(Object.values(pdf.grouped_quantities).flat()).toHaveLength(rows.length);
  expect(buyer.forbidden_rows_present).toBe(false);
  expect(buyerRows.length).toBeGreaterThan(0);
  expect(buyerRows.every((row) => row.lineType !== "work")).toBe(true);
  expect(buyerRows.every((row) => row.priceStatus === "PRICE_MISSING")).toBe(true);
}

describe("road, hydraulic and power professional BOQ calculators", () => {
  it("keeps critical infrastructure estimates quantity-only with traceable rows", () => {
    const road = requireEstimate(
      "строительство дороги 1 км ширина 6 м асфальт",
      "road_construction",
      "roadConstructionCalculator",
    );
    const dam = requireEstimate(
      "дамба земляная 200 м высота 5 м",
      "earth_dam",
      "damHydraulicCalculator",
    );
    const powerLine = requireEstimate(
      "ЛЭП 10 кВ 2 км шаг опор 50 м",
      "overhead_power_line_10kv",
      "powerLinePolesCalculator",
    );
    const hydro = requireEstimate(
      "ГЭС 5 МВт деривационный канал 1 км",
      "hydro_power_plant",
      "hydroPowerPlantCalculator",
    );

    expect(rowByCode(road, "road_area_m2").quantity).toBe(6000);
    expect(rowByCode(dam, "embankment_fill_m3").quantity).toBeGreaterThan(20000);
    expect(rowByCode(powerLine, "poles_count").quantity).toBe(41);
    expect(rowByCode(hydro, "turbines_pcs").quantity).toBeGreaterThanOrEqual(1);

    for (const estimate of [road, dam, powerLine, hydro]) {
      expectProfessionalHandoff(estimate);
    }
  });
});
