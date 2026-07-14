import {
  buildExpandedComplexBuyerHandoff,
  buildExpandedComplexPdfModel,
  buildExpandedComplexSnapshot,
  calculateExpandedComplexEstimate,
  type ExpandedComplexBoqRow,
  type ExpandedComplexCalculatorOutput,
} from "../../src/lib/ai/expandedComplexWorks";

export function allExpandedRows(estimate: ExpandedComplexCalculatorOutput): ExpandedComplexBoqRow[] {
  return [
    ...estimate.material_rows,
    ...estimate.work_rows,
    ...estimate.equipment_rows,
    ...estimate.service_rows,
  ];
}

export function requireExpandedEstimate(prompt: string): ExpandedComplexCalculatorOutput {
  const estimate = calculateExpandedComplexEstimate({ prompt });
  if (!estimate) throw new Error(`Expanded complex estimate was not resolved for: ${prompt}`);
  return estimate;
}

export function rowByCode(estimate: ExpandedComplexCalculatorOutput, code: string): ExpandedComplexBoqRow {
  const row = allExpandedRows(estimate).find((candidate) => candidate.code === code);
  if (!row) throw new Error(`Missing expanded complex row: ${code}`);
  return row;
}

export function expectExpandedPrompt(input: {
  prompt: string;
  familyId: string;
  calculatorId: string;
  requiredCodes: string[];
  minRows?: number;
}): ExpandedComplexCalculatorOutput {
  const estimate = requireExpandedEstimate(input.prompt);
  expect(estimate.work_family_id).toBe(input.familyId);
  expect(estimate.calculatorId).toBe(input.calculatorId);
  expect(estimate.estimate_level).toBe("PRELIMINARY_BOQ");
  expect(estimate.missing_design_inputs.length).toBeGreaterThan(0);
  expect(estimate.price_state.finalTotalAllowed).toBe(false);
  expect(allExpandedRows(estimate).length).toBeGreaterThanOrEqual(input.minRows ?? input.requiredCodes.length);
  for (const code of input.requiredCodes) {
    expect(rowByCode(estimate, code).quantity).toBeGreaterThan(0);
  }
  return estimate;
}

export function expectExpandedSnapshotPdfBuyer(estimate: ExpandedComplexCalculatorOutput): void {
  const snapshot = buildExpandedComplexSnapshot(estimate);
  const pdf = buildExpandedComplexPdfModel(snapshot);
  const buyer = buildExpandedComplexBuyerHandoff(snapshot);
  const buyerRows = [
    ...buyer.procurement_materials,
    ...buyer.equipment_to_purchase,
    ...buyer.delivery_procurement_services,
  ];

  expect(snapshot.missing_design_inputs.length).toBeGreaterThan(0);
  expect(pdf.rows_equal_snapshot).toBe(true);
  expect(Object.values(pdf.grouped_quantities).flat().length).toBe(allExpandedRows(estimate).length);
  expect(buyer.forbidden_rows_present).toBe(false);
  expect(buyerRows.length).toBeGreaterThan(0);
  expect(buyerRows.every((row) => row.lineType !== "work")).toBe(true);
  expect(buyerRows.every((row) => row.includedInProcurement)).toBe(true);
}
