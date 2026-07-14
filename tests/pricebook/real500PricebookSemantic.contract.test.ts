import { buildExactMaterialPriceEstimate } from "../../src/lib/ai/exactMaterialPriceEstimate";
import { real500Cases } from "./pricebookRatebookTestHelpers";

describe("real500 pricebook semantic contract", () => {
  it("keeps real 500 inputs on governed price statuses with no fake prices", () => {
    const failures: string[] = [];
    for (const item of real500Cases()) {
      const result = buildExactMaterialPriceEstimate({ text: item.promptRu });
      if (result.material_lines.length === 0) failures.push(`${item.caseId}:NO_MATERIAL_LINES`);
      if (result.material_lines.some((line) => !["VERIFIED", "PRICE_MISSING", "STALE", "CONFLICTING"].includes(line.price_status))) {
        failures.push(`${item.caseId}:BAD_PRICE_STATUS`);
      }
      if (result.policy.fake_price_claimed || result.policy.fake_supplier_claimed) failures.push(`${item.caseId}:FAKE_CLAIM`);
    }
    expect(failures).toEqual([]);
  });
});
