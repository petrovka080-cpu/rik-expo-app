import {
  KNOWN_EXACT_BOQ_WORK_KEYS,
  payloadForKnownWorkKey,
  weakGenericRows,
} from "./aiEstimateCoreReal10000HardeningTestHelpers";

describe("AI estimate core generic row ban", () => {
  it("does not expose generic material/work rows for known works", () => {
    for (const workKey of KNOWN_EXACT_BOQ_WORK_KEYS) {
      const { payload } = payloadForKnownWorkKey(workKey);
      expect(weakGenericRows(payload)).toEqual([]);
      expect(payload.rows.length).toBeGreaterThanOrEqual(2);
    }
  });
});
