import {
  buildEstimatePriceCatalogBoqProof,
  createAuditedManualPriceOverride,
} from "../../src/lib/ai/estimatePricing/priceCatalogBoq";

describe("director PDF prices contract", () => {
  it("keeps prices, totals, sources, missing states, and manual override markers available for PDF", () => {
    const proof = buildEstimatePriceCatalogBoqProof({
      manualOverrides: [
        createAuditedManualPriceOverride({
          rowKey: "block_masonry_masonry_units",
          unitPrice: 305,
          currency: "KGS",
          overriddenByUserId: "user:director-proof",
          overriddenByRole: "director",
          overrideReason: "director approved supplier estimate",
          overrideCreatedAt: "2026-07-01T12:00:00.000Z",
          oldPriceSourceId: "KG_BISHKEK_2026_06_MARKET_GOVERNED:block_masonry_masonry_units:piece",
        }),
      ],
    });

    expect(proof.director_pdf_has_prices_and_totals).toBe(true);
    expect(proof.price_source_visible).toBe(true);
    expect(proof.manual_price_override_auditable).toBe(true);
    expect(proof.no_question_mark_placeholders).toBe(true);
    expect(proof.no_zero_sum_for_unknown_price).toBe(true);
  });
});
