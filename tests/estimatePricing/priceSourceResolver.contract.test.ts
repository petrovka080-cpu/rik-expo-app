import { resolveEstimateRowPriceSource } from "../../src/features/estimates/pricing/priceSourceResolver";
import type { EstimateRatebookSource } from "../../src/features/estimates/pricing/ratebookTypes";

const row = {
  row_id: "profile-sheet-row-1",
  unit: "m2",
  quantity: 12.5,
  currency: "KGS",
};

const source: EstimateRatebookSource = {
  price_source_id: "kg-bishkek-ratebook-2026-q3",
  price_source_type: "regional_ratebook",
  price_source_version: "2026-q3",
  region: "KG-BI",
  currency: "KGS",
  valid_from: "2026-07-01",
  valid_to: "2026-09-30",
  unit: "sqm",
  unit_price: 480,
  confidence: "high",
};

describe("estimate price source resolver", () => {
  it("represents missing price as an explicit missing state", () => {
    const resolved = resolveEstimateRowPriceSource({ row });

    expect(resolved.price_status).toBe("MISSING_PRICE");
    expect(resolved.unit_price_status).toBe("MISSING_PRICE");
    expect(resolved.sum_status).toBe("NOT_CALCULATED");
    expect(resolved.unit_price).toBeNull();
    expect(resolved.sum).toBeNull();
    expect(resolved.display).toBe("Цена не заполнена");
    expect(resolved.source_display).toBe("Источник цены не выбран");
    expect(resolved.display).not.toContain("?");
  });

  it("accepts a sourced ratebook price with matching currency and normalized unit", () => {
    const resolved = resolveEstimateRowPriceSource({ row, source });

    expect(resolved).toMatchObject({
      price_status: "PRICED",
      price_source_id: "kg-bishkek-ratebook-2026-q3",
      price_source_type: "regional_ratebook",
      price_source_version: "2026-q3",
      region: "KG-BI",
      currency: "KGS",
      unit_price: 480,
      sum: 6000,
      rejection_reason: null,
    });
  });

  it("rejects historical-only, AI, currency-mismatched, and unit-mismatched prices", () => {
    expect(
      resolveEstimateRowPriceSource({
        row,
        source: { ...source, price_source_type: "historical_price_only" },
      }).rejection_reason,
    ).toBe("historical_price_without_ratebook_rejected");

    expect(
      resolveEstimateRowPriceSource({
        row,
        source: { ...source, price_source_type: "ai_estimated_price" },
      }).rejection_reason,
    ).toBe("ai_price_rejected");

    expect(
      resolveEstimateRowPriceSource({
        row,
        source: { ...source, currency: "USD" },
      }).rejection_reason,
    ).toBe("currency_mismatch_rejected");

    expect(
      resolveEstimateRowPriceSource({
        row,
        source: { ...source, unit: "piece" },
      }).rejection_reason,
    ).toBe("unit_mismatch_rejected");
  });
});
