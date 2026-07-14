import { runProductionGradeCriticalCases } from "../../scripts/estimate/productionGradeLayerSealCore";

jest.setTimeout(120_000);

describe("production grade grouped request estimate UI model", () => {
  it("builds grouped sections and editable rows for every critical case", () => {
    const proofs = runProductionGradeCriticalCases();

    expect(proofs.every((proof) => proof.grouped_sections_count > 0)).toBe(true);
    expect(proofs.every((proof) => proof.assumption_rows_count > 0)).toBe(true);
    expect(proofs.every((proof) => proof.work_rows_count > 0)).toBe(true);
    expect(proofs.every((proof) => proof.material_rows_count > 0)).toBe(true);
    expect(proofs.every((proof) => proof.required_row_types_present)).toBe(true);
    expect(proofs.every((proof) => proof.expected_units_present)).toBe(true);
    expect(proofs.every((proof) => proof.forbidden_units_absent)).toBe(true);
  });
});
