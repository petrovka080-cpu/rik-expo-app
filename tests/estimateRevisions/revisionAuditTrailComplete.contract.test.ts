import {
  applyEstimateRevisionQuantityEdit,
  estimateRevisionAuditTrailComplete,
  listEstimateRevisionAuditTrail,
} from "../../src/lib/ai/estimateRevisions";
import { estimateRevisionState } from "./estimateRevisionTestHelpers";

describe("revision audit trail completeness", () => {
  it("has an event for every revision and remains ordered", () => {
    const state = applyEstimateRevisionQuantityEdit(estimateRevisionState(), {
      row_key: "row_1",
      quantity: 12,
      created_at: "2026-06-15T01:00:00.000Z",
    });
    const events = listEstimateRevisionAuditTrail(state);

    expect(estimateRevisionAuditTrailComplete(state)).toBe(true);
    expect(events.map((event) => event.event_type)).toEqual(["AI_ESTIMATE_CREATED", "QUANTITY_CHANGED"]);
    expect(events.every((event) => event.actor)).toBe(true);
  });
});
