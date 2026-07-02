import { resolveEstimateRowPrice } from "../../src/features/estimates/pricing/priceResolutionEngine";

describe("estimate pricing unit conversion contract", () => {
  it("converts kg to full bags and calculates amount from sourced bag price", () => {
    const resolved = resolveEstimateRowPrice({
      rowId: "materials:apartment_screed_dry_mix:1",
      code: "apartment_screed_dry_mix",
      visibleName: "Screed dry mix",
      quantity: 972,
      unit: "kg",
      currency: "KGS",
    });

    expect(resolved.priceTrace.price_source_type).toBe("supplier_pricebook");
    expect(resolved.priceTrace.price_unit).toBe("bag");
    expect(resolved.priceTrace.price_unit_conversion?.source_quantity).toBe(39);
    expect(resolved.total).toBe(11115);
    expect(resolved.unitPrice).toBeCloseTo(11115 / 972, 2);
  });

  it("converts liters to canisters and linear meters to pieces", () => {
    const primer = resolveEstimateRowPrice({
      rowId: "materials:apartment_wall_primer:1",
      code: "apartment_wall_primer",
      quantity: 22.68,
      unit: "l",
      currency: "KGS",
    });
    const baseboard = resolveEstimateRowPrice({
      rowId: "materials:apartment_floor_baseboard:1",
      code: "apartment_floor_baseboard",
      quantity: 29.394,
      unit: "linear_m",
      currency: "KGS",
    });

    expect(primer.priceTrace.price_unit_conversion?.rounding_policy).toBe("ceil_to_canister");
    expect(primer.priceTrace.selected_amount).toBe(2940);
    expect(baseboard.priceTrace.price_unit_conversion?.rounding_policy).toBe("ceil_to_piece");
    expect(baseboard.priceTrace.selected_amount).toBe(8280);
  });
});
