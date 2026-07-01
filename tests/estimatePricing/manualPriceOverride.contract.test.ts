import {
  buildEstimatePriceCatalogBoqProof,
  createAuditedManualPriceOverride,
} from "../../src/lib/ai/estimatePricing/priceCatalogBoq";

describe("estimate manual price override contract", () => {
  it("requires actor, role, reason, timestamp, and keeps override visible in totals", () => {
    const override = createAuditedManualPriceOverride({
      rowKey: "block_masonry_masonry_units",
      unitPrice: 305,
      currency: "KGS",
      overriddenByUserId: "user:foreman-1",
      overriddenByRole: "foreman",
      overrideReason: "supplier quote received by phone",
      overrideCreatedAt: "2026-07-01T10:00:00.000Z",
      oldPriceSourceId: "KG_BISHKEK_2026_06_MARKET_GOVERNED:block_masonry_masonry_units:piece",
    });
    const proof = buildEstimatePriceCatalogBoqProof({
      manualOverrides: [override],
    });
    const overriddenLine = proof.allRows.find((line) => line.rowKey === override.rowKey);

    expect(proof.manual_price_override_auditable).toBe(true);
    expect(overriddenLine?.priceStatus).toBe("manual_override");
    expect(overriddenLine?.manualOverride?.overrideReason).toBe(override.overrideReason);
    expect(overriddenLine?.unitPrice).toBe(305);
    expect(proof.director_pdf_has_prices_and_totals).toBe(true);
  });
});
