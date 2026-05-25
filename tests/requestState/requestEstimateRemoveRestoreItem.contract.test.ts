import {
  initialRequestEstimateDraftReducerState,
  requestEstimateDraftReducer,
} from "../../src/features/consumerRepair/requestEstimateDraftReducer";
import { makeRequestEstimateDraft } from "./requestEstimateStateTestHelpers";

describe("request estimate remove and restore item", () => {
  it("removes a row from active draft and restores it from reducer state", () => {
    let state = requestEstimateDraftReducer(initialRequestEstimateDraftReducerState, { type: "GENERATE_ESTIMATE" });
    state = requestEstimateDraftReducer(state, { type: "ESTIMATE_READY", draft: makeRequestEstimateDraft() });
    state = requestEstimateDraftReducer(state, { type: "REMOVE_ITEM", rowId: "row_rebar" });

    expect(state.draft?.items.some((item) => item.rowId === "row_rebar")).toBe(false);
    expect(state.removedItems.map((item) => item.rowId)).toContain("row_rebar");

    state = requestEstimateDraftReducer(state, { type: "RESTORE_ITEM", rowId: "row_rebar" });
    expect(state.draft?.items.some((item) => item.rowId === "row_rebar")).toBe(true);
    expect(state.removedItems).toHaveLength(0);
  });
});
