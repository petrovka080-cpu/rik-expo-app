import {
  beginPdfNativeHandoff,
  completePdfNativeHandoff,
  createPdfNativeHandoffGuardState,
  createPdfNativeHandoffKey,
  isPdfNativeHandoffCurrent,
  resetPdfNativeHandoffGuard,
} from "./pdfNativeHandoffGuard";

describe("pdfNativeHandoffGuard", () => {
  it("allows the first native handoff and skips duplicate in-flight starts", () => {
    const state = createPdfNativeHandoffGuardState();
    const key = createPdfNativeHandoffKey({
      assetId: "asset-1",
      sessionId: "session-1",
      uri: "https://example.com/file.pdf",
    });

    expect(beginPdfNativeHandoff(state, key)).toBe("start");
    expect(beginPdfNativeHandoff(state, key)).toBe("skip_in_flight");
  });

  it("marks a successful handoff as settled until the viewer cycle resets", () => {
    const state = createPdfNativeHandoffGuardState();
    const key = createPdfNativeHandoffKey({
      assetId: "asset-1",
      sessionId: "session-1",
      uri: "https://example.com/file.pdf",
    });

    expect(beginPdfNativeHandoff(state, key)).toBe("start");
    completePdfNativeHandoff(state, key, "success");
    expect(beginPdfNativeHandoff(state, key)).toBe("skip_settled");

    resetPdfNativeHandoffGuard(state);
    expect(beginPdfNativeHandoff(state, key)).toBe("start");
  });

  it("allows retry after a failed in-flight handoff", () => {
    const state = createPdfNativeHandoffGuardState();
    const key = createPdfNativeHandoffKey({
      assetId: "asset-1",
      sessionId: "session-1",
      uri: "https://example.com/file.pdf",
    });

    expect(beginPdfNativeHandoff(state, key)).toBe("start");
    completePdfNativeHandoff(state, key, "failure");
    expect(beginPdfNativeHandoff(state, key)).toBe("start");
  });

  it("ignores stale completion after a viewer cycle reset", () => {
    const state = createPdfNativeHandoffGuardState();
    const key = createPdfNativeHandoffKey({
      assetId: "asset-1",
      sessionId: "session-1",
      uri: "https://example.com/file.pdf",
    });

    expect(beginPdfNativeHandoff(state, key)).toBe("start");
    resetPdfNativeHandoffGuard(state);

    expect(completePdfNativeHandoff(state, key, "success")).toBe(false);
    expect(beginPdfNativeHandoff(state, key)).toBe("start");
  });

  it("rejects an old completion when the same document has a new attempt", () => {
    const state = createPdfNativeHandoffGuardState();
    beginPdfNativeHandoff(state, "same-document");
    const oldGeneration = state.generation;
    resetPdfNativeHandoffGuard(state);
    beginPdfNativeHandoff(state, "same-document");
    expect(isPdfNativeHandoffCurrent(state, "same-document", oldGeneration)).toBe(false);
    expect(completePdfNativeHandoff(state, "same-document", "success", oldGeneration)).toBe(false);
    expect(isPdfNativeHandoffCurrent(state, "same-document", state.generation)).toBe(true);
  });

  it("allows manual reopen after settlement but blocks it during an active open", () => {
    const state = createPdfNativeHandoffGuardState();
    beginPdfNativeHandoff(state, "document");
    expect(beginPdfNativeHandoff(state, "document", true)).toBe("skip_in_flight");
    completePdfNativeHandoff(state, "document", "success", state.generation);
    expect(beginPdfNativeHandoff(state, "document")).toBe("skip_settled");
    expect(beginPdfNativeHandoff(state, "document", true)).toBe("start");
    expect(beginPdfNativeHandoff(state, "document", true)).toBe("skip_in_flight");
    expect(beginPdfNativeHandoff(state, "document")).toBe("skip_in_flight");
  });
});
