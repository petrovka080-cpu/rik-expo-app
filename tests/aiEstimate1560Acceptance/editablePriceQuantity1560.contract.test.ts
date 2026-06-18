import { editablePrice1560 } from "./aiEstimate1560AcceptanceTestHelpers";

describe("1560 acceptance editable price and quantity audit", () => {
  it("supports manual quantity, unit price and line total recalculation without fake prices", () => {
    const audit = editablePrice1560();
    expect(audit.editable_cases_total).toBe(1560);
    expect(audit.quantity_edit_supported).toBe(1560);
    expect(audit.unit_price_edit_supported).toBe(1560);
    expect(audit.line_total_recalculation_supported).toBe(1560);
    expect(audit.fake_prices_found).toBe(0);
    expect(audit.failures).toEqual([]);
  });
});
