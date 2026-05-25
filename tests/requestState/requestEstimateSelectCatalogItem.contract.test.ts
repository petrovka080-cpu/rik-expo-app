import {
  initialRequestEstimateDraftReducerState,
  requestEstimateDraftReducer,
} from "../../src/features/consumerRepair/requestEstimateDraftReducer";
import { makeRequestEstimateDraft } from "./requestEstimateStateTestHelpers";

describe("request estimate select catalog item", () => {
  it("preserves selected catalog item id on the estimate row", () => {
    let state = requestEstimateDraftReducer(initialRequestEstimateDraftReducerState, { type: "GENERATE_ESTIMATE" });
    state = requestEstimateDraftReducer(state, { type: "ESTIMATE_READY", draft: makeRequestEstimateDraft() });
    state = requestEstimateDraftReducer(state, {
      type: "SELECT_CATALOG_ITEM",
      rowId: "row_concrete",
      catalogItemId: "catalog_concrete_m300",
      sourceId: "catalog_items",
    });

    const concrete = state.draft?.items.find((item) => item.rowId === "row_concrete");
    expect(state.status).toBe("catalog_selecting");
    expect(concrete?.catalogItemId).toBe("catalog_concrete_m300");
    expect(concrete?.sourceId).toBe("catalog_items");
  });
});
