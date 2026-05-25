import {
  initialRequestEstimateDraftReducerState,
  requestEstimateDraftReducer,
} from "../../src/features/consumerRepair/requestEstimateDraftReducer";
import { makeRequestEstimateDraft } from "./requestEstimateStateTestHelpers";

describe("request estimate edit quantity", () => {
  it("recalculates row total through the draft reducer", () => {
    let state = requestEstimateDraftReducer(initialRequestEstimateDraftReducerState, { type: "GENERATE_ESTIMATE" });
    state = requestEstimateDraftReducer(state, { type: "ESTIMATE_READY", draft: makeRequestEstimateDraft() });
    state = requestEstimateDraftReducer(state, { type: "EDIT_QUANTITY", rowId: "row_concrete", quantity: 35 });

    const concrete = state.draft?.items.find((item) => item.rowId === "row_concrete");
    expect(state.status).toBe("editing");
    expect(concrete?.quantity).toBe(35);
    expect(concrete?.total).toBe(295925);
    expect(state.draft?.totals.grandTotal).toBeGreaterThan(0);
  });
});
