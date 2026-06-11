import {
  internalKeysVisible,
  mojibakeVisible,
  payloadForText,
  REAL_WORK_READING_SMOKE_CASES,
} from "./aiEstimateCoreReal10000HardeningTestHelpers";

describe("AI estimate core structured payload for real work", () => {
  it("builds accepted structured payloads for real free-text work inputs", () => {
    for (const testCase of REAL_WORK_READING_SMOKE_CASES) {
      const payload = payloadForText(testCase.text);
      expect(payload.version).toBe("structured-estimate-v1");
      expect(payload.source).toBe("request");
      expect(payload.workKey).not.toBe(testCase.forbiddenWorkKey);
      expect(payload.classification.status).toBe("accepted");
      expect(payload.quantity).toMatchObject({
        status: "accepted",
        quantity: testCase.expectedQuantity,
        unit: testCase.expectedUnit,
      });
      expect(payload.rows.length).toBeGreaterThan(0);
      expect(payload.fingerprint).toMatch(/^[a-f0-9]{8}$/);
      expect(payload.fakeGreenClaimed).toBe(false);
      expect(internalKeysVisible(payload)).toEqual([]);
      expect(mojibakeVisible(payload)).toEqual([]);
    }
  });
});
