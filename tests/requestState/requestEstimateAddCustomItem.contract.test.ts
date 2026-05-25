import {
  initialRequestEstimateDraftReducerState,
  requestEstimateDraftReducer,
} from "../../src/features/consumerRepair/requestEstimateDraftReducer";
import { makeRequestEstimateDraft } from "./requestEstimateStateTestHelpers";

describe("request estimate add custom item", () => {
  it("marks custom items as low confidence and not catalog-backed", () => {
    let state = requestEstimateDraftReducer(initialRequestEstimateDraftReducerState, { type: "GENERATE_ESTIMATE" });
    state = requestEstimateDraftReducer(state, { type: "ESTIMATE_READY", draft: makeRequestEstimateDraft() });
    state = requestEstimateDraftReducer(state, { type: "ADD_CUSTOM_ITEM" });

    const custom = state.draft?.items.find((item) => item.source === "custom");
    expect(custom?.confidence).toBe("low");
    expect(custom?.catalogItemId).toBeUndefined();
    expect(state.draft?.validation.canSave).toBe(true);
  });
});
