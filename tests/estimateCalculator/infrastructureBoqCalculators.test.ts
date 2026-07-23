import {
  buildExpandedComplexBuyerHandoff,
  buildExpandedComplexPdfModel,
  buildExpandedComplexSnapshot,
  calculateExpandedComplexEstimate,
  resolveExpandedComplexWorkFamily,
  type ExpandedComplexCalculatorOutput,
} from "../../src/lib/ai/expandedComplexWorks";

function expectEstimate(prompt: string, familyId: string, calculatorId: string): ExpandedComplexCalculatorOutput {
  const estimate = calculateExpandedComplexEstimate({ prompt });
  if (!estimate) throw new Error(`estimate_missing:${familyId}`);
  expect(estimate.work_family_id).toBe(familyId);
  expect(estimate.calculatorId).toBe(calculatorId);
  expect(estimate.price_state.finalTotalAllowed).toBe(false);
  expect(estimate.material_rows.length).toBeGreaterThan(0);
  expect(estimate.work_rows.length).toBeGreaterThan(0);
  return estimate;
}

function expectPdfBuyer(estimate: ExpandedComplexCalculatorOutput): void {
  const snapshot = buildExpandedComplexSnapshot(estimate);
  const pdf = buildExpandedComplexPdfModel(snapshot);
  const buyer = buildExpandedComplexBuyerHandoff(snapshot);
  const buyerRows = [
    ...buyer.procurement_materials,
    ...buyer.equipment_to_purchase,
    ...buyer.delivery_procurement_services,
  ];

  expect(pdf.rows_equal_snapshot).toBe(true);
  expect(pdf.trace_appendix.length).toBeGreaterThan(0);
  expect(pdf.source_appendix.length).toBeGreaterThan(0);
  expect(buyer.forbidden_rows_present).toBe(false);
  expect(buyerRows.length).toBeGreaterThan(0);
  expect(buyerRows.every((row) => row.lineType !== "work")).toBe(true);
}

describe("infrastructure professional BOQ calculators", () => {
  it.each([
    "асфальтобетонная дорога длина 3000 м ширина 32 м",
    "asphalt concrete pavement length 3000 m width 32 m",
  ])("does not route asphalt concrete language to cement concrete: %s", (prompt) => {
    expect(resolveExpandedComplexWorkFamily(prompt)?.work_family_id).toBe(
      "asphalt_concrete_pavement",
    );
  });

  it("builds village water supply and sewer BOQs with procurement-safe handoff", () => {
    const water = expectEstimate(
      "водоснабжение села 5 км труба ПЭ100 d110 водонапорная башня",
      "village_water_supply",
      "villageWaterSupplyCalculator",
    );
    const sewer = expectEstimate(
      "наружная канализация 2 км труба 160 колодцы каждые 50 м",
      "village_sewer_network",
      "sewerNetworkCalculator",
    );

    expectPdfBuyer(water);
    expectPdfBuyer(sewer);
  });
});
