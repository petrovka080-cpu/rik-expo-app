import {
  applyManualPriceOverrideWithAudit,
  resolveEstimateRowPrice,
} from "../../src/features/estimates/pricing/priceResolutionEngine";

describe("manual price override audit contract", () => {
  it("requires a reason and preserves previous source in audit", () => {
    const row = {
      rowId: "materials:apartment_wall_paint:1",
      code: "apartment_wall_paint",
      quantity: 33.48,
      unit: "l",
      currency: "KGS",
    };
    const previous = resolveEstimateRowPrice(row).priceTrace;

    expect(() => applyManualPriceOverrideWithAudit({
      row: { ...row, priceTrace: previous },
      override: {
        rowId: row.rowId,
        unit_price: 2600,
        price_unit: "canister",
        override_reason: "",
      },
    })).toThrow("MANUAL_PRICE_OVERRIDE_REASON_REQUIRED");

    const override = applyManualPriceOverrideWithAudit({
      row: { ...row, priceTrace: previous },
      override: {
        rowId: row.rowId,
        unit_price: 2600,
        price_unit: "canister",
        source_unit_quantity: 10,
        override_reason: "supplier quote approved by estimator",
        actor_user_id: "user:estimator",
        created_at: "2026-07-02T10:00:00.000Z",
      },
    });

    expect(override.priceTrace.price_source_type).toBe("manual_override");
    expect(override.priceTrace.override_reason).toBe("supplier quote approved by estimator");
    expect(override.auditEvent.previous_source?.price_source_id).toBe(previous.price_source_id);
    expect(override.total).toBe(10400);
  });
});
