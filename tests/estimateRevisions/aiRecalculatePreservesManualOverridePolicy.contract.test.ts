import {
  applyEstimateRevisionAiRecalculation,
  applyEstimateRevisionUnitPriceEdit,
} from "../../src/lib/ai/estimateRevisions";
import { currentRevision, editableRow, editableSnapshot, estimateRevisionState } from "./estimateRevisionTestHelpers";

describe("AI recalculation and manual overrides", () => {
  it("preserves user price override when AI sends a refreshed estimate", () => {
    const manual = applyEstimateRevisionUnitPriceEdit(estimateRevisionState(), {
      row_key: "row_1",
      unit_price: 610,
      actor_id: "consumer-1",
      created_at: "2026-06-15T01:00:00.000Z",
    });
    const aiSnapshot = editableSnapshot([
      editableRow({ rowId: "row_1", requestItemId: "row_1", unitPrice: 700, totalPrice: 7000 }),
    ]);
    const recalculated = applyEstimateRevisionAiRecalculation(manual, {
      ai_snapshot: aiSnapshot,
      created_at: "2026-06-15T02:00:00.000Z",
    });
    const row = currentRevision(recalculated).editable_estimate_snapshot.rows[0];

    expect(currentRevision(recalculated).source).toBe("AI_RECALCULATED");
    expect(row.unitPrice).toBe(610);
    expect(row.totalPrice).toBe(6100);
    expect(row.priceSource).toBe("user");
    expect(row.manualPrice?.unitPrice).toBe(610);
  });
});
