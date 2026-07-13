import {
  expectNoFakeSupplierText,
  validateAllSeededRates,
} from "./pricebookRatebookTestHelpers";

describe("pricebook ratebook schema contract", () => {
  it("requires source, supplier, region, date, currency, confidence, and status on every seeded verified rate", () => {
    const rows = validateAllSeededRates();
    expect(rows.length).toBeGreaterThan(20);
    expect(rows.flatMap((row) => row.validation.blockers)).toEqual([]);
    expect(rows.every(({ rate }) => rate.price_status === "VERIFIED")).toBe(true);
    expect(rows.every(({ rate }) => Boolean(rate.source_reference && rate.source_type))).toBe(true);
    expect(rows.every(({ rate }) => Boolean(rate.supplier_id && rate.supplier_visible_name))).toBe(true);
    expect(rows.every(({ rate }) => Boolean(rate.region && rate.captured_at && rate.currency))).toBe(true);
    expect(rows.every(({ rate }) => rate.fake_price_claimed === false)).toBe(true);
    expectNoFakeSupplierText(rows.map(({ rate }) => rate.supplier_visible_name));
  });
});
