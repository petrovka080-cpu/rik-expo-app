import { resolveEstimateRowPriceSource } from "../../src/features/estimates/pricing/priceSourceResolver";
import type { EstimateRatebookSource } from "../../src/features/estimates/pricing/ratebookTypes";

const row = {
  row_id: "row-1",
  unit: "m2",
  quantity: 10,
  currency: "KGS",
};

describe("estimate price source policy", () => {
  it("uses missing price state instead of zero or question mark", () => {
    const resolved = resolveEstimateRowPriceSource({ row });

    expect(resolved.price_status).toBe("MISSING_PRICE");
    expect(resolved.unit_price).toBeNull();
    expect(resolved.sum).toBeNull();
    expect(resolved.display).toBe("Цена не заполнена");
    expect(resolved.source_display).toBe("Источник цены не выбран");
  });

  it("rejects historical-only and AI price sources", () => {
    const source: EstimateRatebookSource = {
      price_source_id: "history-only",
      price_source_type: "historical_price_only",
      price_source_version: "2026-q2",
      region: "KG",
      currency: "KGS",
      valid_from: "2026-07-01",
      valid_to: null,
      unit: "m2",
      unit_price: 100,
      confidence: "low",
    };
    expect(resolveEstimateRowPriceSource({ row, source }).rejection_reason).toBe("historical_price_without_ratebook_rejected");
    expect(resolveEstimateRowPriceSource({
      row,
      source: { ...source, price_source_id: "ai", price_source_type: "ai_estimated_price" },
    }).rejection_reason).toBe("ai_price_rejected");
  });
});
