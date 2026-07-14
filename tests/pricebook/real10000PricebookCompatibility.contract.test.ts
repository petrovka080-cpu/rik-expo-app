import { buildExactMaterialPriceEstimate } from "../../src/lib/ai/exactMaterialPriceEstimate";
import { real10000Cases } from "./pricebookRatebookTestHelpers";

describe("real10000 pricebook compatibility contract", () => {
  it("keeps the 10000 real prompt corpus compatible with governed pricebook lookup", () => {
    const failures: string[] = [];
    for (const item of real10000Cases()) {
      const result = buildExactMaterialPriceEstimate({ text: item.promptRu });
      if (!result.estimate_id) failures.push(`${item.caseId}:NO_ID`);
      if (!result.work.work_key) failures.push(`${item.caseId}:NO_WORK`);
      if (result.material_lines.length === 0) failures.push(`${item.caseId}:NO_LINES`);
      if (result.material_lines.some((line) => line.price_value === 0)) failures.push(`${item.caseId}:ZERO_PRICE`);
      if (result.policy.fake_price_claimed || result.policy.fake_supplier_claimed) failures.push(`${item.caseId}:FAKE_CLAIM`);
    }
    expect(failures).toEqual([]);
  });
});
