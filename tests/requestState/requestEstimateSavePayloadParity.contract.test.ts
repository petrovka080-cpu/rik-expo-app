import { makeEditedParityScenario } from "./requestEstimateStateTestHelpers";

describe("request estimate save payload parity", () => {
  it("keeps visible rows aligned with save payload", () => {
    const { parity, payloads } = makeEditedParityScenario();

    expect(parity.visibleUiMatchesSave).toBe(true);
    expect(payloads.save_draft_payload.draft.items.some((item) => item.catalogItemId === "catalog_concrete_m300")).toBe(true);
  });
});
