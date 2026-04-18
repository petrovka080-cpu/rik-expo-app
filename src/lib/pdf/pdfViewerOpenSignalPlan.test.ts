import { readFileSync } from "fs";
import { join } from "path";

import {
  resolvePdfViewerOpenFailedSignalPlan,
  resolvePdfViewerOpenVisibleSignalPlan,
} from "./pdfViewerOpenSignalPlan";

const asset = {
  sourceKind: "remote-url",
  documentType: "director_report",
  originModule: "director",
  fileName: "report.pdf",
};

describe("pdfViewerOpenSignalPlan", () => {
  it("plans visible signal with the same payload shape as the viewer", () => {
    expect(
      resolvePdfViewerOpenVisibleSignalPlan({
        openToken: "open-1",
        alreadySettled: false,
        sessionId: "session-1",
        asset,
        extra: {
          route: "/pdf-viewer",
          state: "ready",
        },
      }),
    ).toEqual({
      action: "emit_visible",
      openToken: "open-1",
      sourceKind: "remote-url",
      extra: {
        sessionId: "session-1",
        documentType: "director_report",
        originModule: "director",
        fileName: "report.pdf",
        route: "/pdf-viewer",
        state: "ready",
      },
    });
  });

  it("plans failed signal with the same payload shape as the viewer", () => {
    expect(
      resolvePdfViewerOpenFailedSignalPlan({
        openToken: "open-1",
        alreadySettled: false,
        sessionId: "session-1",
        message: "Document loading timed out.",
        asset,
        extra: {
          phase: "timeout",
        },
      }),
    ).toEqual({
      action: "emit_failed",
      openToken: "open-1",
      message: "Document loading timed out.",
      sourceKind: "remote-url",
      extra: {
        sessionId: "session-1",
        documentType: "director_report",
        originModule: "director",
        fileName: "report.pdf",
        phase: "timeout",
      },
    });
  });

  it("preserves caller extra override semantics", () => {
    expect(
      resolvePdfViewerOpenVisibleSignalPlan({
        openToken: "open-1",
        alreadySettled: false,
        sessionId: "session-1",
        asset,
        extra: {
          fileName: "override.pdf",
        },
      }),
    ).toMatchObject({
      extra: {
        fileName: "override.pdf",
      },
    });
  });

  it("skips when there is no open token", () => {
    expect(
      resolvePdfViewerOpenVisibleSignalPlan({
        openToken: "",
        alreadySettled: false,
        sessionId: "session-1",
        asset,
      }),
    ).toEqual({
      action: "skip",
      reason: "missing_open_token",
    });
  });

  it("skips when the signal is already settled", () => {
    expect(
      resolvePdfViewerOpenFailedSignalPlan({
        openToken: "open-1",
        alreadySettled: true,
        sessionId: "session-1",
        message: "failed",
        asset,
      }),
    ).toEqual({
      action: "skip",
      reason: "already_settled",
    });
  });

  it("keeps missing asset fields null but sourceKind undefined", () => {
    expect(
      resolvePdfViewerOpenFailedSignalPlan({
        openToken: "open-1",
        alreadySettled: false,
        sessionId: "",
        message: "failed",
        asset: null,
      }),
    ).toEqual({
      action: "emit_failed",
      openToken: "open-1",
      message: "failed",
      sourceKind: undefined,
      extra: {
        sessionId: "",
        documentType: null,
        originModule: null,
        fileName: null,
      },
    });
  });

  it("stays pure and does not import runtime side-effect APIs", () => {
    const source = readFileSync(
      join(__dirname, "pdfViewerOpenSignalPlan.ts"),
      "utf8",
    );

    expect(source).not.toContain("markPdfOpenVisible");
    expect(source).not.toContain("failPdfOpenVisible");
    expect(source).not.toContain("setState");
    expect(source).not.toContain("setTimeout");
    expect(source).not.toContain("router");
    expect(source).not.toContain("recordPdfCriticalPathEvent");
    expect(source).not.toContain("recordPdfCrashBreadcrumb");
    expect(source).not.toContain("openPdfPreview");
  });
});
