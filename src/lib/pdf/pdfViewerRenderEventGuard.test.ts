import { shouldCommitPdfViewerRenderEvent } from "./pdfViewerRenderEventGuard";

describe("pdfViewerRenderEventGuard", () => {
  it("allows events from the active render instance", () => {
    expect(
      shouldCommitPdfViewerRenderEvent({
        activeRenderInstanceKey: "pdf-render:web:session:asset:0",
        eventRenderInstanceKey: "pdf-render:web:session:asset:0",
      }),
    ).toBe(true);
  });

  it("ignores stale events from a previous render instance", () => {
    expect(
      shouldCommitPdfViewerRenderEvent({
        activeRenderInstanceKey: "pdf-render:web:session:asset:1",
        eventRenderInstanceKey: "pdf-render:web:session:asset:0",
      }),
    ).toBe(false);
  });

  it("does not commit when either side is missing", () => {
    expect(
      shouldCommitPdfViewerRenderEvent({
        activeRenderInstanceKey: "",
        eventRenderInstanceKey: "pdf-render:web:session:asset:0",
      }),
    ).toBe(false);
    expect(
      shouldCommitPdfViewerRenderEvent({
        activeRenderInstanceKey: "pdf-render:web:session:asset:0",
        eventRenderInstanceKey: "",
      }),
    ).toBe(false);
  });
});
