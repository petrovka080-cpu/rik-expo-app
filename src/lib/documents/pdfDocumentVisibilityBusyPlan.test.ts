import { readFileSync } from "fs";
import { join } from "path";

import {
  resolvePdfDocumentBusyExecutionPlan,
  resolvePdfDocumentBusyRunOutputPlan,
  resolvePdfDocumentManualBusyCleanupPlan,
  resolvePdfDocumentVisibilityFailureRecordPlan,
  resolvePdfDocumentVisibilityFailureSignalPlan,
  resolvePdfDocumentVisibilityStartPlan,
  resolvePdfDocumentVisibilitySuccessPlan,
} from "./pdfDocumentVisibilityBusyPlan";

describe("pdfDocumentVisibilityBusyPlan", () => {
  it("plans router-backed visibility wait start", () => {
    expect(resolvePdfDocumentVisibilityStartPlan({ hasRouter: true })).toEqual({
      action: "begin_visibility_wait",
      reason: "router_available",
    });
  });

  it("plans no-router visible fallback without creating a wait", () => {
    expect(resolvePdfDocumentVisibilityStartPlan({ hasRouter: false })).toEqual({
      action: "skip_visibility_wait",
      reason: "missing_router",
    });
    expect(
      resolvePdfDocumentVisibilitySuccessPlan({ hasVisibilityWait: false }),
    ).toEqual({
      action: "record_no_router_visible",
      stage: "first_open_visible",
      assertStage: "visibility",
    });
  });

  it("plans visibility wait completion when a wait exists", () => {
    expect(
      resolvePdfDocumentVisibilitySuccessPlan({ hasVisibilityWait: true }),
    ).toEqual({
      action: "await_visibility_wait",
      assertStage: "visibility",
    });
  });

  it("plans visibility failure signalling and fallback recording", () => {
    expect(
      resolvePdfDocumentVisibilityFailureSignalPlan({
        visibilityToken: "open-token-1",
      }),
    ).toEqual({
      action: "signal_visibility_failure",
      token: "open-token-1",
    });
    expect(
      resolvePdfDocumentVisibilityFailureRecordPlan({
        signalledFailure: true,
      }),
    ).toEqual({
      recordOpenFailedStage: false,
    });
    expect(
      resolvePdfDocumentVisibilityFailureRecordPlan({
        signalledFailure: false,
      }),
    ).toEqual({
      recordOpenFailedStage: true,
    });
  });

  it("skips visibility failure signalling without a token", () => {
    expect(
      resolvePdfDocumentVisibilityFailureSignalPlan({
        visibilityToken: "",
      }),
    ).toEqual({
      action: "skip_visibility_failure_signal",
      reason: "missing_visibility_token",
    });
  });

  it("plans busy.run execution with the legacy key, label, and min duration", () => {
    expect(
      resolvePdfDocumentBusyExecutionPlan({
        hasBusyRun: true,
        hasBusyShow: true,
        hasBusyHide: true,
        flowKey: "pdf:director:report",
        label: "Opening PDF...",
      }),
    ).toEqual({
      mode: "busy_run",
      key: "pdf:director:report",
      label: "Opening PDF...",
      minMs: 200,
      recordBusyClearedAfterRun: true,
    });
  });

  it("plans manual busy with the legacy fallback key", () => {
    expect(
      resolvePdfDocumentBusyExecutionPlan({
        hasBusyRun: false,
        hasBusyShow: true,
        hasBusyHide: true,
        flowKey: "",
        label: "Opening PDF...",
      }),
    ).toEqual({
      mode: "manual_busy",
      key: "pdf:open",
      label: "Opening PDF...",
      recordBusyClearedInFinally: true,
    });
  });

  it("plans direct execution when there is no complete busy owner", () => {
    expect(
      resolvePdfDocumentBusyExecutionPlan({
        hasBusyRun: false,
        hasBusyShow: true,
        hasBusyHide: false,
        flowKey: "pdf:buyer:proposal",
      }),
    ).toEqual({
      mode: "direct",
      recordBusyCleared: false,
    });
  });

  it("keeps cancelled busy.run output mapped to the legacy error", () => {
    expect(resolvePdfDocumentBusyRunOutputPlan({ hasOutput: true })).toEqual({
      action: "return_output",
    });
    expect(resolvePdfDocumentBusyRunOutputPlan({ hasOutput: false })).toEqual({
      action: "throw_cancelled",
      message: "PDF open cancelled",
    });
  });

  it("plans manual busy cleanup without reading runtime state itself", () => {
    expect(resolvePdfDocumentManualBusyCleanupPlan({ isBusy: true })).toEqual({
      hideBusy: true,
      recordBusyCleared: true,
    });
    expect(resolvePdfDocumentManualBusyCleanupPlan({ isBusy: false })).toEqual({
      hideBusy: false,
      recordBusyCleared: true,
    });
  });

  it("stays pure and does not import runtime side-effect APIs", () => {
    const source = readFileSync(
      join(__dirname, "pdfDocumentVisibilityBusyPlan.ts"),
      "utf8",
    );

    expect(source).not.toContain("Promise");
    expect(source).not.toContain("beginPdfOpenVisibilityWait");
    expect(source).not.toContain("failPdfOpenVisible");
    expect(source).not.toContain("recordPdfOpenStage");
    expect(source).not.toContain("preparePdfDocument");
    expect(source).not.toContain("previewPdfDocument");
    expect(source).not.toContain("Date.now");
  });

  it("keeps prepareAndPreviewPdfDocument effect ownership and order in the viewer boundary", () => {
    const source = readFileSync(
      join(__dirname, "pdfDocumentActions.ts"),
      "utf8",
    );
    const start = source.indexOf("export async function prepareAndPreviewPdfDocument");
    expect(start).toBeGreaterThanOrEqual(0);
    const body = source.slice(start);

    const orderedMarkers = [
      "recordPdfOpenStage({",
      "stage: \"tap_start\"",
      "persistCriticalPdfBreadcrumb({",
      "stage: \"busy_shown\"",
      "preparePdfDocument({",
      "resolvePdfDocumentVisibilityStartPlan",
      "beginPdfOpenVisibilityWait",
      "await previewPdfDocument",
      "resolvePdfDocumentVisibilitySuccessPlan",
      "recordBoundary(\"pdf_terminal_success\"",
      "failPdfOpenVisible",
      "recordBoundary(\"pdf_terminal_failure\"",
      "args.busy.run",
      "args.busy.show",
      "args.busy.hide",
      "stage: \"busy_cleared\"",
    ];

    let cursor = -1;
    for (const marker of orderedMarkers) {
      const next = body.indexOf(marker, cursor + 1);
      expect(next).toBeGreaterThan(cursor);
      cursor = next;
    }
  });
});
