import { validateAllProductionTemplatesBoq10000 } from "../../src/lib/ai/estimateTemplate10000";

jest.setTimeout(120000);

describe("AI estimate fake area multiplier guard", () => {
  it("rejects all-rows-same-area and fake default price patterns across the 10000 catalog", () => {
    const validation = validateAllProductionTemplatesBoq10000();

    expect(validation.no_templates_generate_all_rows_same_area).toBe(true);
    expect(validation.no_templates_generate_fake_default_price).toBe(true);
    expect(validation.price_nullable_when_missing).toBe(true);
    expect(validation.amount_nullable_when_price_missing).toBe(true);
  });
});
