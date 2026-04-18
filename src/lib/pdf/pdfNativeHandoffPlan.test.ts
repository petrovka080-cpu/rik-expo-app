import { readFileSync } from "fs";
import { join } from "path";

import {
  PDF_NATIVE_HANDOFF_ERROR_COMMANDS,
  PDF_NATIVE_HANDOFF_PRE_OPEN_COMMANDS,
  PDF_NATIVE_HANDOFF_READY_COMMANDS,
  normalizePdfNativeHandoffErrorMessage,
  planPdfNativeHandoffErrorCompletion,
  planPdfNativeHandoffStart,
  planPdfNativeHandoffSuccessCompletion,
  resolvePdfNativeHandoffDuplicateSkipCommandPlan,
  resolvePdfNativeHandoffErrorCommandPlan,
  resolvePdfNativeHandoffStartCommandPlan,
  resolvePdfNativeHandoffSuccessTelemetryPlan,
} from "./pdfNativeHandoffPlan";

describe("pdfNativeHandoffPlan", () => {
  const asset = {
    documentType: "director_report" as const,
    entityId: "object-1",
    fileName: "director-report.pdf",
    originModule: "director" as const,
    sizeBytes: 12345,
    sourceKind: "remote-url" as const,
    uri: "https://example.com/director-report.pdf",
  };
  const context = {
    diagnosticsScreen: null,
    openToken: "open-1",
    sessionId: "session-1",
    uriKind: "https",
  };

  it("plans the primary trigger start after the guard allows it", () => {
    expect(
      planPdfNativeHandoffStart({
        trigger: "primary",
        guardDecision: "start",
      }),
    ).toEqual({
      action: "start",
      trigger: "primary",
      reason: "primary_guard_start",
      commands: PDF_NATIVE_HANDOFF_PRE_OPEN_COMMANDS,
    });
  });

  it("plans the manual trigger start without a guard decision", () => {
    expect(planPdfNativeHandoffStart({ trigger: "manual" })).toEqual({
      action: "start",
      trigger: "manual",
      reason: "manual_trigger",
      commands: PDF_NATIVE_HANDOFF_PRE_OPEN_COMMANDS,
    });
  });

  it("plans settled primary guard skip as the existing ready branch", () => {
    expect(
      planPdfNativeHandoffStart({
        trigger: "primary",
        guardDecision: "skip_settled",
      }),
    ).toEqual({
      action: "mark_ready",
      trigger: "primary",
      reason: "primary_settled",
    });
  });

  it("plans duplicate in-flight guard skip without opening native preview again", () => {
    expect(
      planPdfNativeHandoffStart({
        trigger: "primary",
        guardDecision: "skip_in_flight",
      }),
    ).toEqual({
      action: "record_duplicate_skip",
      trigger: "primary",
      reason: "primary_in_flight",
    });
  });

  it("keeps timeout and loading reset commands before the native open command", () => {
    expect(
      planPdfNativeHandoffStart({
        trigger: "primary",
        guardDecision: "start",
      }),
    ).toMatchObject({
      commands: [
        "clear_loading_timeout",
        "close_menu",
        "clear_error",
        "set_loading",
        "allow_render",
        "reset_native_handoff_completion",
      ],
    });
  });

  it("plans duplicate skip console and breadcrumb payloads without opening native preview", () => {
    const startPlan = planPdfNativeHandoffStart({
      trigger: "primary",
      guardDecision: "skip_in_flight",
    });

    expect(startPlan.action).toBe("record_duplicate_skip");
    if (startPlan.action !== "record_duplicate_skip") {
      throw new Error("expected duplicate skip plan");
    }

    expect(
      resolvePdfNativeHandoffDuplicateSkipCommandPlan({
        startPlan,
        asset,
        context,
      }),
    ).toEqual({
      action: "record_duplicate_skip",
      trigger: "primary",
      console: {
        label: "[pdf-viewer] native_handoff_duplicate_skipped",
        payload: {
          sessionId: "session-1",
          documentType: "director_report",
          originModule: "director",
          uri: "https://example.com/director-report.pdf",
          sourceKind: "remote-url",
          trigger: "primary",
        },
      },
      breadcrumb: {
        marker: "native_open_duplicate_skipped",
        payload: {
          uri: "https://example.com/director-report.pdf",
          uriKind: "https",
          sourceKind: "remote-url",
          fileSizeBytes: 12345,
          fileExists: true,
          previewPath: "native_handoff",
          extra: {
            trigger: "primary",
            handoffType: "native_handoff",
          },
        },
      },
    });
  });

  it("plans start command payloads while keeping pre-open commands before native open", () => {
    const startPlan = planPdfNativeHandoffStart({
      trigger: "manual",
    });

    expect(startPlan.action).toBe("start");
    if (startPlan.action !== "start") {
      throw new Error("expected start plan");
    }

    expect(
      resolvePdfNativeHandoffStartCommandPlan({
        startPlan,
        asset,
        context,
      }),
    ).toEqual({
      action: "start",
      trigger: "manual",
      commands: PDF_NATIVE_HANDOFF_PRE_OPEN_COMMANDS,
      console: {
        label: "[pdf-viewer] native_handoff_start",
        payload: {
          sessionId: "session-1",
          documentType: "director_report",
          originModule: "director",
          uri: "https://example.com/director-report.pdf",
          scheme: "https",
          sourceKind: "remote-url",
          trigger: "manual",
        },
      },
      breadcrumb: {
        marker: "native_open_start",
        payload: {
          uri: "https://example.com/director-report.pdf",
          uriKind: "https",
          sourceKind: "remote-url",
          fileSizeBytes: 12345,
          fileExists: true,
          previewPath: "native_handoff",
          extra: {
            trigger: "manual",
            handoffType: "native_handoff",
          },
        },
      },
      criticalPath: {
        event: "pdf_render_start",
        screen: "director",
        sourceKind: "remote-url",
        documentType: "director_report",
        originModule: "director",
        entityId: "object-1",
        fileName: "director-report.pdf",
        sessionId: "session-1",
        openToken: "open-1",
        uri: "https://example.com/director-report.pdf",
        uriKind: "https",
        previewPath: "native_handoff",
        extra: {
          trigger: "manual",
          handoffType: "native_handoff",
        },
      },
      openPreview: {
        uri: "https://example.com/director-report.pdf",
        fileName: "director-report.pdf",
      },
    });
  });

  it("plans primary success through mounted check, guard completion, then ready", () => {
    expect(
      planPdfNativeHandoffSuccessCompletion({
        trigger: "primary",
        isMounted: true,
      }),
    ).toEqual({
      action: "complete_guard",
      trigger: "primary",
      result: "success",
    });

    expect(
      planPdfNativeHandoffSuccessCompletion({
        trigger: "primary",
        isMounted: true,
        primaryGuardCompleted: true,
      }),
    ).toEqual({
      action: "commit_ready",
      trigger: "primary",
      commands: PDF_NATIVE_HANDOFF_READY_COMMANDS,
    });
  });

  it("plans manual success directly to ready when the screen is mounted", () => {
    expect(
      planPdfNativeHandoffSuccessCompletion({
        trigger: "manual",
        isMounted: true,
      }),
    ).toEqual({
      action: "commit_ready",
      trigger: "manual",
      commands: PDF_NATIVE_HANDOFF_READY_COMMANDS,
    });
  });

  it("suppresses stale or unmounted success completion", () => {
    expect(
      planPdfNativeHandoffSuccessCompletion({
        trigger: "primary",
        isMounted: false,
      }),
    ).toEqual({
      action: "noop",
      trigger: "primary",
      result: "success",
      reason: "unmounted",
    });

    expect(
      planPdfNativeHandoffSuccessCompletion({
        trigger: "primary",
        isMounted: true,
        primaryGuardCompleted: false,
      }),
    ).toEqual({
      action: "noop",
      trigger: "primary",
      result: "success",
      reason: "stale_completion",
    });
  });

  it("plans success telemetry separately from ready state effects", () => {
    expect(
      resolvePdfNativeHandoffSuccessTelemetryPlan({
        asset,
        context,
        trigger: "primary",
      }),
    ).toEqual({
      action: "record_success",
      trigger: "primary",
      console: {
        label: "[pdf-viewer] native_handoff_ready",
        payload: {
          sessionId: "session-1",
          documentType: "director_report",
          originModule: "director",
          uri: "https://example.com/director-report.pdf",
          sourceKind: "remote-url",
          trigger: "primary",
        },
      },
      breadcrumb: {
        marker: "native_open_success",
        payload: {
          uri: "https://example.com/director-report.pdf",
          uriKind: "https",
          sourceKind: "remote-url",
          fileSizeBytes: 12345,
          fileExists: true,
          previewPath: "native_handoff",
          terminalState: "success",
          extra: {
            trigger: "primary",
            handoffType: "native_handoff",
          },
        },
      },
    });
  });

  it("plans primary failure through mounted check, guard completion, then error", () => {
    const error = new Error("Native viewer failed");

    expect(
      planPdfNativeHandoffErrorCompletion({
        trigger: "primary",
        isMounted: true,
        error,
      }),
    ).toEqual({
      action: "complete_guard",
      trigger: "primary",
      result: "failure",
    });

    expect(
      planPdfNativeHandoffErrorCompletion({
        trigger: "primary",
        isMounted: true,
        primaryGuardCompleted: true,
        error,
      }),
    ).toEqual({
      action: "commit_error",
      trigger: "primary",
      message: "Native viewer failed",
      commands: PDF_NATIVE_HANDOFF_ERROR_COMMANDS,
    });
  });

  it("plans committed error console, breadcrumb, and markError command", () => {
    const errorPlan = planPdfNativeHandoffErrorCompletion({
      trigger: "manual",
      isMounted: true,
      error: new Error("Native viewer failed"),
    });

    expect(errorPlan.action).toBe("commit_error");
    if (errorPlan.action !== "commit_error") {
      throw new Error("expected commit error plan");
    }

    expect(
      resolvePdfNativeHandoffErrorCommandPlan({
        errorPlan,
        asset,
        context,
      }),
    ).toEqual({
      action: "commit_error",
      trigger: "manual",
      commands: PDF_NATIVE_HANDOFF_ERROR_COMMANDS,
      console: {
        label: "[pdf-viewer] native_handoff_error",
        payload: {
          sessionId: "session-1",
          documentType: "director_report",
          originModule: "director",
          uri: "https://example.com/director-report.pdf",
          sourceKind: "remote-url",
          trigger: "manual",
          error: "Native viewer failed",
        },
      },
      breadcrumb: {
        marker: "native_open_error",
        payload: {
          uri: "https://example.com/director-report.pdf",
          uriKind: "https",
          sourceKind: "remote-url",
          fileSizeBytes: 12345,
          fileExists: true,
          previewPath: "native_handoff",
          errorMessage: "Native viewer failed",
          terminalState: "error",
          extra: {
            trigger: "manual",
            handoffType: "native_handoff",
          },
        },
      },
      terminalError: {
        message: "Native viewer failed",
        phase: "render",
      },
    });
  });

  it("plans manual failure directly to error when the screen is mounted", () => {
    expect(
      planPdfNativeHandoffErrorCompletion({
        trigger: "manual",
        isMounted: true,
        error: "manual failed",
      }),
    ).toEqual({
      action: "commit_error",
      trigger: "manual",
      message: "manual failed",
      commands: PDF_NATIVE_HANDOFF_ERROR_COMMANDS,
    });
  });

  it("suppresses stale or unmounted failure completion before message normalization", () => {
    const error = {
      toString: jest.fn(() => "should not be read"),
    };

    expect(
      planPdfNativeHandoffErrorCompletion({
        trigger: "primary",
        isMounted: false,
        error,
      }),
    ).toEqual({
      action: "noop",
      trigger: "primary",
      result: "failure",
      reason: "unmounted",
    });
    expect(error.toString).not.toHaveBeenCalled();

    expect(
      planPdfNativeHandoffErrorCompletion({
        trigger: "primary",
        isMounted: true,
        primaryGuardCompleted: false,
        error,
      }),
    ).toEqual({
      action: "noop",
      trigger: "primary",
      result: "failure",
      reason: "stale_completion",
    });
    expect(error.toString).not.toHaveBeenCalled();
  });

  it("normalizes native handoff errors like the viewer did", () => {
    expect(normalizePdfNativeHandoffErrorMessage(new Error("boom"))).toBe(
      "boom",
    );
    expect(normalizePdfNativeHandoffErrorMessage("plain")).toBe("plain");
    expect(normalizePdfNativeHandoffErrorMessage(null)).toBe("null");
  });

  it("stays pure and does not import runtime side-effect APIs", () => {
    const source = readFileSync(
      join(__dirname, "pdfNativeHandoffPlan.ts"),
      "utf8",
    );

    expect(source).not.toContain("openPdfPreview");
    expect(source).not.toContain("beginPdfNativeHandoff");
    expect(source).not.toContain("completePdfNativeHandoff");
    expect(source).not.toContain("clearLoadingTimeout");
    expect(source).not.toContain("setState");
    expect(source).not.toContain("setNativeHandoffCompleted");
    expect(source).not.toContain("markReady");
    expect(source).not.toContain("markError");
    expect(source).not.toContain("recordViewerBreadcrumb");
    expect(source).not.toContain("recordPdfCriticalPathEvent");
    expect(source).not.toContain("console.");
  });

  it("keeps viewer native handoff effects in the legacy order", () => {
    const source = readFileSync(
      join(__dirname, "..", "..", "..", "app", "pdf-viewer.tsx"),
      "utf8",
    );
    const start = source.indexOf("const handoffPdfPreview = React.useCallback");
    const end = source.indexOf("React.useEffect(() => {", start);
    const block = source.slice(start, end);
    const expectedOrder = [
      "createPdfNativeHandoffKey",
      "planPdfNativeHandoffStart",
      'if (startPlan.action === "mark_ready")',
      "markReady();",
      'if (startPlan.action === "record_duplicate_skip")',
      "resolvePdfNativeHandoffDuplicateSkipCommandPlan",
      "console.info(duplicatePlan.console.label",
      "recordViewerBreadcrumb(",
      "return;",
      "resolvePdfNativeHandoffStartCommandPlan",
      "clearLoadingTimeout();",
      "setMenuOpen(false);",
      'setErrorText("");',
      'setState("loading");',
      "setIsReadyToRender(true);",
      "setNativeHandoffCompleted(false);",
      "console.info(",
      "recordViewerBreadcrumb(",
      "recordPdfCriticalPathEvent(startCommandPlan.criticalPath);",
      "await openPdfPreview(",
      "resolvePdfNativeHandoffSuccessTelemetryPlan",
      "console.info(",
      "recordViewerBreadcrumb(",
      "planPdfNativeHandoffSuccessCompletion",
      "completePdfNativeHandoff",
      "setNativeHandoffCompleted(true);",
      "markReady();",
      "planPdfNativeHandoffErrorCompletion",
      "completePdfNativeHandoff",
      "resolvePdfNativeHandoffErrorCommandPlan",
      "console.error(",
      "recordViewerBreadcrumb(",
      "markError(",
    ];

    let previousIndex = -1;
    for (const marker of expectedOrder) {
      const nextIndex = block.indexOf(marker, previousIndex + 1);
      expect(nextIndex).toBeGreaterThan(previousIndex);
      previousIndex = nextIndex;
    }
  });
});
