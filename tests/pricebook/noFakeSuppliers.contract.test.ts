import {
  directExactResolution,
  expectNoFakeSupplierText,
  validateAllSeededRates,
} from "./pricebookRatebookTestHelpers";

describe("no fake suppliers contract", () => {
  it("uses transparent governed supplier/source labels and never claims fake suppliers", () => {
    const seeded = validateAllSeededRates().map(({ rate }) => rate);
    const resolution = directExactResolution();

    expect(seeded.every((rate) => rate.supplier_id && rate.supplier_visible_name)).toBe(true);
    expect(resolution.supplier_visible_name).toBeTruthy();
    expect(resolution.fake_supplier_claimed).toBe(false);
    expectNoFakeSupplierText(seeded);
    expectNoFakeSupplierText(resolution);
  });
});
