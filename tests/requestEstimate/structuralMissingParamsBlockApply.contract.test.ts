import { createRealMaterialQuantityPreview } from "../../src/lib/ai/professionalEstimateCalculator";

describe("structural calculator missing params block apply", () => {
  it("opens the calculator and does not insert rows before required masonry params are filled", () => {
    const preview = createRealMaterialQuantityPreview({
      rawInput: "каменную кладку 400 кв метра",
    });

    expect(preview.status).toBe("NEEDS_PARAMETERS");
    expect(preview.calculatorDialogOpened).toBe(true);
    expect(preview.rows).toEqual([]);
    expect(preview.rowsInsertedBeforeConfirmation).toBe(false);
    expect(preview.userConfirmationRequired).toBe(true);
  });
});
