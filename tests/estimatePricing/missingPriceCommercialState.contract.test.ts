import { resolveGovernedPrice } from "../../src/features/estimates/pricing/pricebookResolver";

describe("missing price commercial state", () => {
  it("uses explicit missing state instead of zero or question mark", () => {
    const missing = resolveGovernedPrice({ quantity: 10, unit: "m2", region: "KG", currency: "KGS" });

    expect(missing.price_status).toBe("MISSING_PRICE");
    expect(missing.unit_price_status).toBe("MISSING_PRICE");
    expect(missing.sum_status).toBe("NOT_CALCULATED");
    expect(missing.unit_price).toBeNull();
    expect(missing.total).toBeNull();
    expect(missing.display).toBe("\u0426\u0435\u043d\u0430 \u043d\u0435 \u0437\u0430\u043f\u043e\u043b\u043d\u0435\u043d\u0430");
    expect(missing.source_display).toBe("\u0418\u0441\u0442\u043e\u0447\u043d\u0438\u043a \u0446\u0435\u043d\u044b \u043d\u0435 \u0432\u044b\u0431\u0440\u0430\u043d");
    expect(missing.display).not.toContain("?");
    expect(missing.full_total_status).toBe("NOT_FINAL");
  });
});
