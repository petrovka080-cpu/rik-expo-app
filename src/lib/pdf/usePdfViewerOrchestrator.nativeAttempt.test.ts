import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { usePdfViewerOrchestrator } from "./usePdfViewerOrchestrator";
import { beginPdfNativeHandoff, completePdfNativeHandoff, isPdfNativeHandoffCurrent } from "./pdfNativeHandoffGuard";

describe("mounted PDF viewer native attempts", () => {
  let renderer: ReactTestRenderer;
  let viewer: ReturnType<typeof usePdfViewerOrchestrator>;
  function Harness() {
    viewer = usePdfViewerOrchestrator({ initialSession: null, initialAsset: null, initialState: "loading", initialErrorText: "" });
    return null;
  }
  beforeEach(() => { act(() => { renderer = create(React.createElement(Harness)); }); });
  afterEach(() => { act(() => renderer.unmount()); });

  it("lets a new manual attempt become ready after a prior render failure", () => {
    act(() => viewer.commitErrorState("Previous native open failed"));
    expect(viewer.state).toBe("error");
    expect(viewer.claimReadyCommit()).toEqual({ action: "skip_ready", reason: "render_failed" });
    act(() => viewer.resetForNativeHandoffStart());
    expect(viewer.claimReadyCommit()).toEqual({ action: "commit_ready" });
    act(() => { viewer.commitNativeHandoffCompleted(); viewer.commitReadyState(); });
    expect(viewer.state).toBe("ready");
    expect(viewer.nativeHandoffCompleted).toBe(true);
    expect(viewer.errorText).toBe("");
  });

  it("keeps the initial open terminal settled across a retry, then resets for a new session", () => {
    viewer.openSignalSettledRef.current = true;
    act(() => { viewer.retry(); viewer.resetOpenAttemptGuards(false); });
    expect(viewer.loadAttempt).toBe(1);
    expect(viewer.openSignalSettledRef.current).toBe(true);
    act(() => viewer.resetOpenAttemptGuards());
    expect(viewer.openSignalSettledRef.current).toBe(false);
  });

  it("starts the next bootstrap while rejecting a late same-document completion", () => {
    const guard = viewer.nativeHandoffGuardRef.current;
    expect(beginPdfNativeHandoff(guard, "same-document")).toBe("start");
    const oldGeneration = guard.generation;
    act(() => viewer.beginBootstrapCycle());
    expect(beginPdfNativeHandoff(guard, "same-document")).toBe("start");
    const newGeneration = guard.generation;
    expect(isPdfNativeHandoffCurrent(guard, "same-document", oldGeneration)).toBe(false);
    expect(completePdfNativeHandoff(guard, "same-document", "success", oldGeneration)).toBe(false);
    expect(completePdfNativeHandoff(guard, "same-document", "success", newGeneration)).toBe(true);
    act(() => viewer.beginBootstrapCycle());
    expect(beginPdfNativeHandoff(guard, "same-document")).toBe("skip_settled");
    expect(beginPdfNativeHandoff(guard, "same-document", true)).toBe("start");
  });
});
