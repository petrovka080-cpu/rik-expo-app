import {
  runRealQuantityStarterMatrix,
} from "../../src/lib/ai/professionalEstimateCalculator";

describe("real quantity formula engine starter matrix", () => {
  it("generates materials and work rows for every trust starter work", () => {
    const matrix = runRealQuantityStarterMatrix();

    expect(matrix).toHaveLength(6);
    expect(matrix.every((item) => item.work_type_detected)).toBe(true);
    expect(matrix.every((item) => item.calculator_dialog_opened)).toBe(true);
    expect(matrix.every((item) => item.required_params_collected)).toBe(true);
    expect(matrix.every((item) => item.material_rows_generated)).toBe(true);
    expect(matrix.every((item) => item.work_rows_generated)).toBe(true);
    expect(matrix.every((item) => item.quantities_non_zero)).toBe(true);
    expect(matrix.every((item) => item.units_localized)).toBe(true);
    expect(matrix.every((item) => item.fake_green_claimed === false)).toBe(true);
  });
});
