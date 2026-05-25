import { makeEditedParityScenario } from "./requestEstimateStateTestHelpers";

describe("request estimate send payload parity", () => {
  it("does not send removed rows and keeps catalog selections", () => {
    const { parity, payloads } = makeEditedParityScenario();

    expect(parity.visibleUiMatchesSend).toBe(true);
    expect(parity.removedItemsNotSent).toBe(true);
    expect(payloads.send_request_payload.draft.items.some((item) => item.rowId === "row_rebar")).toBe(false);
    expect(payloads.send_request_payload.draft.items.some((item) => item.catalogItemId === "catalog_concrete_m300")).toBe(true);
  });
});
