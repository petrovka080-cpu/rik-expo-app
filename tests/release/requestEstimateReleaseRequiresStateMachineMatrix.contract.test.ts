import { loadRequiredMatrixEvidence } from "../../scripts/release/runRequestEstimateCatalogBoqLiveReleaseGate";

describe("request estimate release gate requires state machine matrix", () => {
  it("requires draft state machine and payload parity proof before release green", () => {
    const matrix = loadRequiredMatrixEvidence().find((item) => item.key === "draft_state_machine");
    expect(matrix).toBeDefined();
    expect(matrix?.present).toBe(true);
    expect(matrix?.green).toBe(true);
    expect(matrix?.finalStatus).toBe("GREEN_REQUEST_ESTIMATE_DRAFT_STATE_MACHINE_READY");
    expect(matrix?.fakeGreenClaimed).toBe(false);
  });
});
