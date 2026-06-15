import { applyEstimateRevisionQuantityEdit } from "../../src/lib/ai/estimateRevisions";
import { estimateRevisionState } from "./estimateRevisionTestHelpers";

describe("revision diff", () => {
  it("shows changed rows and total delta", () => {
    const next = applyEstimateRevisionQuantityEdit(estimateRevisionState(), {
      row_key: "row_1",
      quantity: 12,
      created_at: "2026-06-15T01:00:00.000Z",
    });
    const diff = next.diffs[0];

    expect(diff.changed_rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_key: "row_1", change_type: "QUANTITY_CHANGED" }),
    ]));
    expect(diff.total_before).toBe(5000);
    expect(diff.total_after).toBe(6000);
    expect(diff.total_delta).toBe(1000);
  });
});
