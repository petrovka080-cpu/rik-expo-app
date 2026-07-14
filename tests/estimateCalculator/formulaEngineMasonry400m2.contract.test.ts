import {
  createRealMaterialQuantityPreview,
} from "../../src/lib/ai/professionalEstimateCalculator";

describe("real quantity formula engine masonry 400m2", () => {
  it("detects masonry, pre-fills 400 m2, asks missing params, then generates real non-zero rows", () => {
    const dialog = createRealMaterialQuantityPreview({
      rawInput: "каменную кладку 400 кв метра",
    });

    expect(dialog.status).toBe("NEEDS_PARAMETERS");
    expect(dialog.intent.workType).toBe("masonry");
    expect(dialog.intent.areaM2).toBe(400);
    expect(dialog.intent.missingParameters).toEqual(["material_type", "wall_thickness_mm"]);
    expect(dialog.calculatorDialogOpened).toBe(true);
    expect(dialog.rowsInsertedBeforeConfirmation).toBe(false);

    const preview = createRealMaterialQuantityPreview({
      rawInput: "каменную кладку 400 кв метра",
      parameters: {
        material_type: "газоблок",
        wall_thickness_mm: 200,
      },
    });

    expect(preview.status).toBe("NEEDS_USER_CONFIRMATION");
    expect(preview.userConfirmationRequired).toBe(true);
    expect(preview.materialRows.map((row) => row.titleRu)).toEqual(expect.arrayContaining([
      "Газоблок стеновой",
      "Клей для блоков",
      "Армирующая сетка кладочная",
    ]));
    expect(preview.workRows.map((row) => row.titleRu)).toContain("Каменная кладка");
    expect(preview.rows.every((row) => row.quantity > 0)).toBe(true);
    expect(preview.rows.every((row) => row.price === null && row.priceDisplayRu === "Не заполнено")).toBe(true);
    expect(preview.rows.every((row) => row.unitLabelRu && !/sq_m|piece|linear_m/.test(row.unitLabelRu))).toBe(true);
    expect(preview.totalsRecalculated).toBe(true);
  });
});
