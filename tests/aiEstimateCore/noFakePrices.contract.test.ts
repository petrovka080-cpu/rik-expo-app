import {
  KNOWN_EXACT_BOQ_WORK_KEYS,
  fakeSupplierClaims,
  payloadForKnownWorkKey,
  pricedRowsWithoutEvidence,
} from "./aiEstimateCoreReal10000HardeningTestHelpers";

describe("AI estimate core no fake prices", () => {
  it("requires source evidence for every priced row and does not claim fake suppliers", () => {
    for (const workKey of KNOWN_EXACT_BOQ_WORK_KEYS) {
      const { payload } = payloadForKnownWorkKey(workKey);
      expect(pricedRowsWithoutEvidence(payload)).toEqual([]);
      expect(fakeSupplierClaims(payload)).toEqual([]);
    }
  });
});
