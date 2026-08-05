import {
  allPayloads,
  expectPayloadVisibleRowsSafe,
  payloadRowsFingerprint,
} from "./structuredPipelineTestHelpers";
import { stableStructuredEstimateHash } from "../../src/lib/estimateStructuredPipeline";

describe("structured estimate payload", () => {
  it("keeps the legacy stable fingerprint byte contract without allocating the canonical mega-string", () => {
    expect(stableStructuredEstimateHash("abc")).toBe("b6413aeb");
    expect(stableStructuredEstimateHash([1, "x", null])).toBe("ff7fbf49");
    expect(stableStructuredEstimateHash({ b: 2, a: "x" })).toBe("f7ae4256");
    expect(stableStructuredEstimateHash({
      z: [{ b: true, a: null }],
      a: { d: 4, c: "q" },
    })).toBe("666f665c");
  });

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
