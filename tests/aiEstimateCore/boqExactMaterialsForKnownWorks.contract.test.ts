import {
  KNOWN_EXACT_BOQ_WORK_KEYS,
  materialRows,
  payloadForKnownWorkKey,
  weakGenericRows,
} from "./aiEstimateCoreReal10000HardeningTestHelpers";

describe("AI estimate core exact BOQ materials for known works", () => {
  it("uses material-specific rows for known construction work keys", () => {
    for (const workKey of KNOWN_EXACT_BOQ_WORK_KEYS) {
      const { estimate, payload } = payloadForKnownWorkKey(workKey);
      const rows = materialRows(payload);
      expect(estimate.work.workKey).toBe(workKey);
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((row) => row.materialKey || row.rateKey)).toBe(true);
      expect(rows.every((row) => row.visibleName.trim().length > 2)).toBe(true);
      expect(weakGenericRows(payload)).toEqual([]);
    }
  });
});
