import { buildRoofExactEstimate, expectVisibleClean, visibleTextForExactEstimate } from "./exactEstimateTestHelpers";

describe("no fake suppliers", () => {
  it("does not invent supplier names for seeded pricebook rows", () => {
    const result = buildRoofExactEstimate();

    expect(result.material_lines.every((line) => line.fake_supplier_claimed === false)).toBe(true);
    expect(result.material_lines.every((line) => line.supplier_visible_name == null || !/fake|mock|demo|undefined/i.test(line.supplier_visible_name))).toBe(true);
    expect(visibleTextForExactEstimate(result)).not.toMatch(/undefined supplier|supplier demo|fake supplier|mock supplier/i);
    expectVisibleClean(result);
  });
});
