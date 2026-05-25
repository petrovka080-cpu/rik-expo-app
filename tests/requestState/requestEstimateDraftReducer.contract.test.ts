import {
  initialRequestEstimateDraftReducerState,
  requestEstimateDraftReducer,
} from "../../src/features/consumerRepair/requestEstimateDraftReducer";
import { makeRequestEstimateDraft } from "./requestEstimateStateTestHelpers";

describe("request estimate draft reducer", () => {
  it("moves from idle to generated draft without screen-local mutation", () => {
    const generating = requestEstimateDraftReducer(initialRequestEstimateDraftReducerState, { type: "GENERATE_ESTIMATE" });
    const ready = requestEstimateDraftReducer(generating, { type: "ESTIMATE_READY", draft: makeRequestEstimateDraft() });

    expect(generating.status).toBe("generating_estimate");
    expect(ready.status).toBe("draft_ready");
    expect(ready.draft?.validation.canSave).toBe(true);
    expect(ready.draft?.items).toHaveLength(3);
  });
});
