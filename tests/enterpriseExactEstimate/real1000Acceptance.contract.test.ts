import { evaluateSelectedWork1000 } from "../../scripts/e2e/userInputExactMaterialPriceEstimate.shared";

describe("enterprise exact estimate real1000 acceptance", () => {
  jest.setTimeout(180_000);

  it("keeps selected work, quantity, recipes, and PDF model green for 1000 cases", () => {
    const result = evaluateSelectedWork1000();

    expect(result.final_status).toBe("GREEN_EXACT_MATERIAL_PRICE_USER_INPUT_1000_READY");
    expect(result.cases_total).toBeGreaterThanOrEqual(1000);
    expect(result.cases_failed).toBe(0);
    expect(result.selected_work_preserved).toBe(result.cases_total);
    expect(result.quantity_parsed).toBe(result.cases_total);
    expect(result.pdf_generated).toBe(result.cases_total);
    expect(result.failures).toEqual([]);
  });
});
