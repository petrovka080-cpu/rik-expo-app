import {
  normalizeCanonicalPdfInvokePayload,
  resolveCanonicalPdfInvokePayloadContract,
} from "../../src/lib/api/canonicalPdfBackendInvoker";

describe("canonicalPdfBackendInvoker phase 8 payload contract", () => {
  it("classifies null as missing", () => {
    expect(resolveCanonicalPdfInvokePayloadContract(null)).toEqual({
      kind: "missing",
      reason: "missing_payload",
      errorMessage: "Canonical PDF backend payload is missing",
    });
  });

  it("classifies undefined as missing", () => {
    expect(resolveCanonicalPdfInvokePayloadContract(undefined)).toEqual({
      kind: "missing",
      reason: "missing_payload",
      errorMessage: "Canonical PDF backend payload is missing",
    });
  });

  it("keeps a partial payload in the ready non-empty state", () => {
    expect(
      resolveCanonicalPdfInvokePayloadContract({
        requestId: "req-1",
      }),
    ).toEqual({
      kind: "ready",
      payload: {
        requestId: "req-1",
      },
      payloadState: "non_empty",
    });
  });

  it("rejects malformed primitive payloads and invalid array payloads", () => {
    expect(resolveCanonicalPdfInvokePayloadContract("bad payload")).toEqual({
      kind: "invalid",
      reason: "invalid_payload_shape",
      errorMessage: "Canonical PDF backend payload must be an object",
    });
    expect(resolveCanonicalPdfInvokePayloadContract([])).toEqual({
      kind: "invalid",
      reason: "invalid_payload_shape",
      errorMessage: "Canonical PDF backend payload must be an object",
    });
  });

  it("keeps an empty object as a ready empty payload instead of treating it as missing", () => {
    expect(resolveCanonicalPdfInvokePayloadContract({})).toEqual({
      kind: "ready",
      payload: {},
      payloadState: "empty",
    });
  });

  it("normalizes a valid payload without changing its transport shape", () => {
    const payload = {
      requestId: "req-2",
      documentType: "request",
      clientSourceFingerprint: "fingerprint",
    };

    expect(normalizeCanonicalPdfInvokePayload(payload)).toEqual(payload);
  });

  it("keeps terminal rejection explicit for missing and invalid payloads", () => {
    expect(() => normalizeCanonicalPdfInvokePayload(null)).toThrow(
      "Canonical PDF backend payload is missing",
    );
    expect(() => normalizeCanonicalPdfInvokePayload([])).toThrow(
      "Canonical PDF backend payload must be an object",
    );
  });
});
