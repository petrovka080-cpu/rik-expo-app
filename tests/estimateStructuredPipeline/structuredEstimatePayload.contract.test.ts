import {
  allPayloads,
  expectPayloadVisibleRowsSafe,
  payloadRowsFingerprint,
} from "./structuredPipelineTestHelpers";

describe("structured estimate payload", () => {
  it("builds one structured payload with the validated presentation rows", () => {
    for (const payload of allPayloads()) {
      expect(payload.version).toBe("structured-estimate-v1");
      expect(payload.fakeGreenClaimed).toBe(false);
      expect(payload.presentation.rows).toHaveLength(payload.rows.length);
      expect(payload.fingerprint).toBeTruthy();
      expect(payloadRowsFingerprint(payload)).toBeTruthy();
      expectPayloadVisibleRowsSafe(payload);
    }
  });
});
