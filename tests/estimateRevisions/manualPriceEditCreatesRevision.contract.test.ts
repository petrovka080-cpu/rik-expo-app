import { applyEstimateRevisionUnitPriceEdit } from "../../src/lib/ai/estimateRevisions";
import { currentRevision, estimateRevisionState } from "./estimateRevisionTestHelpers";

describe("manual unit price revision", () => {
  it("marks user price without fake supplier evidence", () => {
    const next = applyEstimateRevisionUnitPriceEdit(estimateRevisionState(), {
      row_key: "row_1",
      unit_price: 610,
      actor_id: "consumer-1",
      created_at: "2026-06-15T01:00:00.000Z",
    });
    const row = currentRevision(next).editable_estimate_snapshot.rows[0];

    expect(currentRevision(next).version_number).toBe(2);
    expect(row.unitPrice).toBe(610);
    expect(row.totalPrice).toBe(6100);
    expect(row.priceStatus).toBe("USER_PRICE_OVERRIDE");
    expect(row.priceSource).toBe("user");
    expect(row.priceSourceId).toBeNull();
    expect(row.manualPrice?.actorUserId).toBe("consumer-1");
  });
});
