import {
  initialRequestEstimateDraftReducerState,
  requestEstimateDraftReducer,
} from "../../src/features/consumerRepair/requestEstimateDraftReducer";
import { makeRequestEstimateDraft } from "./requestEstimateStateTestHelpers";

describe("request estimate add manual catalog item", () => {
  it("adds manual materials as real catalog rows with catalogItemId", () => {
    let state = requestEstimateDraftReducer(initialRequestEstimateDraftReducerState, { type: "GENERATE_ESTIMATE" });
    state = requestEstimateDraftReducer(state, { type: "ESTIMATE_READY", draft: makeRequestEstimateDraft() });
    state = requestEstimateDraftReducer(state, { type: "ADD_MANUAL_CATALOG_ITEM" });

    const manualCatalog = state.draft?.items.find((item) => item.source === "catalog_item");
    expect(manualCatalog?.catalogItemId).toBe("catalog_manual_concrete_m300");
    expect(manualCatalog?.confidence).toBe("high");
  });
});
