import { bindWithFixtureCatalog, estimateFor, FOUNDATION_PROMPT } from "./catalogBindingTestHelpers";

describe("catalog binding material rows only", () => {
  it("marks non-material estimate rows as not_material_row", async () => {
    const estimate = estimateFor(FOUNDATION_PROMPT);
    const binding = await bindWithFixtureCatalog(estimate);
    const nonMaterialRows = estimate.sections
      .filter((section) => section.type !== "materials")
      .flatMap((section) => section.rows.map((row) => row.code || row.rowNumber));

    for (const rowId of nonMaterialRows) {
      expect(binding.rows.find((row) => row.rowId === rowId)?.bindingStatus).toBe("not_material_row");
    }
  });
});
