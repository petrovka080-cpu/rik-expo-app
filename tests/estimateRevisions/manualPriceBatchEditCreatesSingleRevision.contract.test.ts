import { applyEstimateRevisionUnitPriceBatchEdit } from "../../src/lib/ai/estimateRevisions";
import { currentRevision, editableRow, estimateRevisionState } from "./estimateRevisionTestHelpers";

describe("manual unit price batch revision", () => {
  it("changes every requested row in one immutable revision with row-level diff", () => {
    const initial = estimateRevisionState([
      editableRow({ rowId: "row_1", requestItemId: "item_1", unitPrice: null, totalPrice: null }),
      editableRow({ rowId: "row_2", requestItemId: "item_2", quantity: 4, unitPrice: null, totalPrice: null }),
    ]);
    const next = applyEstimateRevisionUnitPriceBatchEdit(initial, {
      edits: [
        { row_key: "item_1", unit_price: 100 },
        { row_key: "item_2", unit_price: 250 },
      ],
      actor_id: "estimator-1",
      created_at: "2026-06-15T01:00:00.000Z",
    });

    expect(next.revisions).toHaveLength(2);
    expect(currentRevision(next).version_number).toBe(2);
    expect(currentRevision(next).editable_estimate_snapshot.rows).toEqual([
      expect.objectContaining({ rowId: "row_1", unitPrice: 100, totalPrice: 1000, priceSource: "user" }),
      expect.objectContaining({ rowId: "row_2", unitPrice: 250, totalPrice: 1000, priceSource: "user" }),
    ]);
    expect(next.diffs[0].changed_rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_key: "item_1", change_type: "PRICE_CHANGED" }),
      expect.objectContaining({ row_key: "item_2", change_type: "PRICE_CHANGED" }),
    ]));
    expect(next.events.at(-1)).toMatchObject({
      event_type: "UNIT_PRICE_CHANGED",
      after_value: { edited_row_count: 2 },
    });
  });

  it("rejects duplicate aliases of the same canonical row", () => {
    const initial = estimateRevisionState([
      editableRow({ rowId: "row_1", requestItemId: "item_1" }),
    ]);
    expect(() => applyEstimateRevisionUnitPriceBatchEdit(initial, {
      edits: [
        { row_key: "row_1", unit_price: 100 },
        { row_key: "item_1", unit_price: 200 },
      ],
    })).toThrow("EDITABLE_ESTIMATE_DUPLICATE_BATCH_ROW:item_1");
  });
});
