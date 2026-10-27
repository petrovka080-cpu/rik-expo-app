import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { beginPdfOpenVisibilityWait, createPdfOpenFlowContext, markPdfOpenVisible, resetPdfOpenFlowStateForTests } from "./pdfOpenFlow";
import { usePdfViewerOrchestrator } from "./usePdfViewerOrchestrator";
import { usePdfViewerExitCancellation } from "./usePdfViewerExitCancellation";

let cancel!: () => boolean;
let renderer: TestRenderer.ReactTestRenderer | undefined;
function Harness({ token }: { token: string }) {
  const viewer = usePdfViewerOrchestrator({
    initialSession: null, initialAsset: null, initialState: "loading", initialErrorText: "",
  });
  cancel = usePdfViewerExitCancellation(token, viewer.isMountedRef);
  return null;
}
function pending() {
  return beginPdfOpenVisibilityWait(createPdfOpenFlowContext({ documentType: "request", originModule: "reports" }));
}
beforeEach(() => resetPdfOpenFlowStateForTests());
afterEach(async () => {
  if (renderer) await act(async () => { renderer!.unmount(); await Promise.resolve(); });
  renderer = undefined;
});

it("settles the actual pending open on Back and refuses a later success", async () => {
  const wait = pending();
  act(() => { renderer = TestRenderer.create(<Harness token={wait.token} />); });
  const refused = expect(wait.promise).rejects.toMatchObject({ name: "PdfOpenCancelledError" });
  act(() => { expect(cancel()).toBe(true); });
  await refused;
  expect(markPdfOpenVisible(wait.token)).toBe(false);
  expect(cancel()).toBe(false);
});

it("does not cancel on ordinary rerenders, but cancels a true unmount", async () => {
  const wait = pending(); let settled = false;
  void wait.promise.then(() => { settled = true; }, () => { settled = true; });
  act(() => { renderer = TestRenderer.create(<React.StrictMode><Harness token={wait.token} /></React.StrictMode>); });
  await act(async () => { renderer!.update(<React.StrictMode><Harness token={wait.token} /></React.StrictMode>); await Promise.resolve(); });
  expect(settled).toBe(false);
  const refused = expect(wait.promise).rejects.toMatchObject({ name: "PdfOpenCancelledError" });
  await act(async () => { renderer!.unmount(); await Promise.resolve(); }); renderer = undefined;
  await refused;
  expect(markPdfOpenVisible(wait.token)).toBe(false);
});

it("cancels only a replaced token and leaves an already visible document settled", async () => {
  const old = pending(), current = pending();
  const refused = expect(old.promise).rejects.toMatchObject({ name: "PdfOpenCancelledError" });
  act(() => { renderer = TestRenderer.create(<Harness token={old.token} />); });
  act(() => { renderer!.update(<Harness token={current.token} />); });
  await refused;
  expect(markPdfOpenVisible(current.token)).toBe(true); await current.promise;
  expect(cancel()).toBe(false);
});
