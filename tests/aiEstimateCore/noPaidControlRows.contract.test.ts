import {
  KNOWN_EXACT_BOQ_WORK_KEYS,
  paidControlRows,
  payloadForKnownWorkKey,
} from "./aiEstimateCoreReal10000HardeningTestHelpers";

describe("AI estimate core paid control row policy", () => {
  it("keeps control/acceptance text out of paid labor and equipment rows", () => {
    for (const workKey of KNOWN_EXACT_BOQ_WORK_KEYS) {
      const { payload } = payloadForKnownWorkKey(workKey);
      expect(paidControlRows(payload)).toEqual([]);
    }
  });
});
