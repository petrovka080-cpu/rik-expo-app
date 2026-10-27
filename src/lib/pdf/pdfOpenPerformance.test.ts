import {
  buildPdfOpenPerformanceMetrics,
  recordPdfOpenPerformanceMark,
  type PdfOpenPerformanceMarks,
} from "./pdfOpenPerformance";

describe("pdfOpenPerformance", () => {
  it("computes hot-open latency slices from deterministic marks", () => {
    const marks: PdfOpenPerformanceMarks = {};
    recordPdfOpenPerformanceMark(marks, "tap_start", 100);
    recordPdfOpenPerformanceMark(marks, "document_prepare_start", 125);
    recordPdfOpenPerformanceMark(marks, "document_prepare_done", 325);
    recordPdfOpenPerformanceMark(marks, "viewer_route_push_attempt", 350);
    recordPdfOpenPerformanceMark(marks, "viewer_route_mounted", 420);
    recordPdfOpenPerformanceMark(marks, "first_open_visible", 760);

    expect(
      buildPdfOpenPerformanceMetrics({
        marks,
        startedAt: 100,
        terminalAtMs: 760,
        result: "success",
      }),
    ).toEqual({
      tapToSourceReadyMs: 225,
      prepareDurationMs: 200,
      tapToRoutePushMs: 250,
      tapToRouteMountedMs: 320,
      routePushToMountedMs: 70,
      routeMountedToVisibleMs: 340,
      sourceReadyToVisibleMs: 435,
      routePushToVisibleMs: 410,
      tapToVisibleMs: 660,
      tapToTerminalMs: 660,
    });
  });

  it("keeps terminal timing on errors without inventing visible metrics", () => {
    const marks: PdfOpenPerformanceMarks = {
      tap_start: 10,
      document_prepare_start: 20,
      open_failed: 90,
    };

    expect(
      buildPdfOpenPerformanceMetrics({
        marks,
        startedAt: 10,
        terminalAtMs: 90,
        result: "error",
      }),
    ).toMatchObject({
      tapToVisibleMs: null,
      sourceReadyToVisibleMs: null,
      tapToTerminalMs: 80,
    });
  });
});
