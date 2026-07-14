import { buildExactMaterialPriceEstimate } from "../../src/lib/ai/exactMaterialPriceEstimate";
import { real1000Cases } from "./pricebookRatebookTestHelpers";

describe("real1000 pricebook acceptance contract", () => {
  it("preserves selected work, quantity, and governed price status over the enterprise 1000 corpus", () => {
    const failures: string[] = [];
    for (const item of real1000Cases()) {
      const result = buildExactMaterialPriceEstimate({
        text: item.rawEstimateInput,
        selectedWorkKey: item.selectedWorkKey,
        volume: item.volume,
        unit: item.unit,
      });
      if (result.work.work_key !== item.selectedWorkKey) failures.push(`${item.id}:WORK_KEY`);
      if (result.input.quantity !== item.volume) failures.push(`${item.id}:QUANTITY`);
      if (result.input.unit !== item.unit) failures.push(`${item.id}:UNIT`);
      if (result.material_lines.length === 0) failures.push(`${item.id}:NO_LINES`);
      if (result.material_lines.some((line) => line.fake_price_claimed || line.fake_supplier_claimed)) failures.push(`${item.id}:FAKE_CLAIM`);
    }
    expect(failures).toEqual([]);
  });
});
