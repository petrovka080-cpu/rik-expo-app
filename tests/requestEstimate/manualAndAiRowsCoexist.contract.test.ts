import {
  createRealMaterialQuantityPreview,
} from "../../src/lib/ai/professionalEstimateCalculator";

describe("request manual and AI calculated rows coexist", () => {
  it("keeps AI rows editable data rows that can coexist with manual rows in the draft", () => {
    const preview = createRealMaterialQuantityPreview({
      rawInput: "плитка 45 м2",
      parameters: {},
    });
    expect(preview.status).toBe("NEEDS_USER_CONFIRMATION");

    const manualRow = {
      rowId: "manual_delivery",
      titleRu: "Доставка вручную",
      quantity: 1,
    };
    const draftRows = preview.status === "NEEDS_USER_CONFIRMATION"
      ? [...preview.rows.map((row) => ({ rowId: row.rowId, titleRu: row.titleRu, quantity: row.quantity })), manualRow]
      : [manualRow];

    expect(draftRows.some((row) => row.rowId === "manual_delivery")).toBe(true);
    expect(draftRows.some((row) => row.rowId === "tile_adhesive")).toBe(true);
    expect(draftRows.every((row) => row.quantity > 0)).toBe(true);
  });
});
