import {
  planPdfViewerLoadingTransition,
  planPdfViewerReadyTransition,
  planPdfViewerRenderEventTransition,
  planPdfViewerTimeoutTransition,
} from "../../src/lib/pdf/usePdfViewerOrchestrator";

describe("usePdfViewerOrchestrator transition planners", () => {
  it("plans init/empty versus loading without side effects", () => {
    expect(planPdfViewerLoadingTransition({ hasSession: false })).toEqual({
      action: "show_empty",
    });
    expect(planPdfViewerLoadingTransition({ hasSession: true })).toEqual({
      action: "enter_loading",
    });
  });

  it("plans ready commit with duplicate and post-error suppression", () => {
    expect(
      planPdfViewerReadyTransition({
        readyCommitted: false,
        renderFailed: false,
      }),
    ).toEqual({ action: "commit_ready" });

    expect(
      planPdfViewerReadyTransition({
        readyCommitted: true,
        renderFailed: false,
      }),
    ).toEqual({ action: "skip_ready", reason: "already_committed" });

    expect(
      planPdfViewerReadyTransition({
        readyCommitted: false,
        renderFailed: true,
      }),
    ).toEqual({ action: "skip_ready", reason: "render_failed" });
  });

  it("plans render-event commit with stale and failed render suppression", () => {
    expect(
      planPdfViewerRenderEventTransition({
        isActiveRenderEvent: true,
        renderFailed: false,
      }),
    ).toEqual({ action: "commit_render_event" });

    expect(
      planPdfViewerRenderEventTransition({
        isActiveRenderEvent: false,
        renderFailed: false,
      }),
    ).toEqual({ action: "skip_render_event", reason: "stale_render_key" });

    expect(
      planPdfViewerRenderEventTransition({
        isActiveRenderEvent: true,
        renderFailed: true,
      }),
    ).toEqual({ action: "skip_render_event", reason: "render_failed" });
  });

  it("plans timeout commits only after the active guard accepts the cycle", () => {
    expect(planPdfViewerTimeoutTransition({ shouldCommit: true })).toEqual({
      action: "commit_timeout",
    });
    expect(planPdfViewerTimeoutTransition({ shouldCommit: false })).toEqual({
      action: "skip_timeout",
      reason: "stale_timeout",
    });
  });
});
