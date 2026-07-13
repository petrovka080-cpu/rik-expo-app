import { resolveGovernedPrice, type GovernedPriceSource } from "../../src/features/estimates/pricing/pricebookResolver";

const source: GovernedPriceSource = {
  price_source_id: "kg-sample-ratebook-2026-q3:masonry_stone_m2",
  price_source_type: "regional_ratebook",
  price_source_version: "2026-q3",
  region: "KG",
  currency: "KGS",
  unit: "m2",
  unit_price: 1200,
  valid_from: "2026-07-01",
  valid_to: null,
  confidence: "medium",
  manual_override: false,
  override_reason: null,
  review_status: "APPROVED_FOR_PRELIMINARY",
};

describe("pricebook resolver governance", () => {
  it("resolves verified ratebook rows and keeps source metadata", () => {
    const resolved = resolveGovernedPrice({ quantity: 10, unit: "m2", region: "KG", currency: "KGS", source });

    expect(resolved.price_status).toBe("PRICE_VERIFIED");
    expect(resolved.total).toBe(12000);
    expect(resolved.price_source_id).toBe(source.price_source_id);
    expect(resolved.price_source_version).toBe("2026-q3");
    expect(resolved.full_total_status).toBe("READY");
  });

  it("rejects AI and historical-only prices", () => {
    const ai = resolveGovernedPrice({
      quantity: 10,
      unit: "m2",
      region: "KG",
      currency: "KGS",
      source: { ...source, price_source_type: "ai_estimated_price" },
    });
    const historical = resolveGovernedPrice({
      quantity: 10,
      unit: "m2",
      region: "KG",
      currency: "KGS",
      source: { ...source, price_source_type: "historical_price_only" },
    });

    expect(ai.price_status).toBe("PRICE_REJECTED");
    expect(ai.rejection_reason).toBe("AI_ESTIMATED_PRICE_REJECTED");
    expect(historical.price_status).toBe("PRICE_REJECTED");
    expect(historical.rejection_reason).toBe("HISTORICAL_UNVERIFIED_PRICE_REJECTED");
  });
});
