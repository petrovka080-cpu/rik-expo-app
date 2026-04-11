import {
  armPdfViewerLoadingTimeout,
  cancelPdfViewerLoadingTimeout,
  createPdfViewerLoadingTimeoutGuardState,
  shouldCommitPdfViewerLoadingTimeout,
} from "./pdfViewerLoadingTimeoutGuard";

describe("pdfViewerLoadingTimeoutGuard", () => {
  it("allows only the currently armed loading timeout to commit", () => {
    const state = createPdfViewerLoadingTimeoutGuardState();

    const firstCycle = armPdfViewerLoadingTimeout(state);
    const secondCycle = armPdfViewerLoadingTimeout(state);

    expect(shouldCommitPdfViewerLoadingTimeout(state, firstCycle)).toBe(false);
    expect(shouldCommitPdfViewerLoadingTimeout(state, secondCycle)).toBe(true);
  });

  it("ignores a queued timeout after the viewer cycle is cancelled", () => {
    const state = createPdfViewerLoadingTimeoutGuardState();
    const cycle = armPdfViewerLoadingTimeout(state);

    cancelPdfViewerLoadingTimeout(state);

    expect(shouldCommitPdfViewerLoadingTimeout(state, cycle)).toBe(false);
  });
});
