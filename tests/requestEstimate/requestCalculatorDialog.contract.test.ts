import {
  createRealMaterialQuantityPreview,
} from "../../src/lib/ai/professionalEstimateCalculator";

describe("request real quantity calculator dialog", () => {
  it("opens calculator with prefilled prompt values and blocks insertion until required params are filled", () => {
    const preview = createRealMaterialQuantityPreview({
      rawInput: "каменную кладку 400 кв метра",
    });

    expect(preview.status).toBe("NEEDS_PARAMETERS");
    expect(preview.calculatorDialogOpened).toBe(true);
    expect(preview.intent.parameters.area_m2).toBe(400);
    expect(preview.rows).toEqual([]);
    expect(preview.userConfirmationRequired).toBe(true);
    expect(preview.rowsInsertedBeforeConfirmation).toBe(false);
  });
});
