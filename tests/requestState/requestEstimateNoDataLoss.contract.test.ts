import { makeEditedParityScenario } from "./requestEstimateStateTestHelpers";

describe("request estimate no data loss", () => {
  it("passes full UI/PDF/save/send/runtime parity", () => {
    const { parity } = makeEditedParityScenario();

    expect(parity).toMatchObject({
      passed: true,
      manualCatalogItemNotLost: true,
      editedQuantitiesNotLost: true,
      removedItemsNotSent: true,
      customItemsLowConfidence: true,
      failures: [],
    });
  });
});
