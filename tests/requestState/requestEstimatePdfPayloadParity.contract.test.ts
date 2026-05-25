import { makeEditedParityScenario } from "./requestEstimateStateTestHelpers";

describe("request estimate PDF payload parity", () => {
  it("keeps edited quantity and catalog item in PDF payload", () => {
    const { parity, payloads } = makeEditedParityScenario();
    const concrete = payloads.pdf_payload.draft.items.find((item) => item.rowId === "row_concrete");

    expect(parity.visibleUiMatchesPdf).toBe(true);
    expect(concrete?.quantity).toBe(35);
    expect(concrete?.catalogItemId).toBe("catalog_concrete_m300");
  });
});
