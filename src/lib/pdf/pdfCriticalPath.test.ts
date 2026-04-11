import {
  getPlatformObservabilityEvents,
  resetPlatformObservabilityEvents,
} from "../observability/platformObservability";
import { createPdfOpenFlowContext, recordPdfOpenStage } from "./pdfOpenFlow";

describe("pdf critical path observability", () => {
  beforeEach(() => {
    resetPlatformObservabilityEvents();
  });

  it("emits the required PDF open and prepare markers from the open flow", () => {
    const context = createPdfOpenFlowContext({
      key: "buyer:proposal:1",
      documentType: "proposal",
      originModule: "buyer",
      entityId: "proposal-1",
      fileName: "proposal.pdf",
    });

    recordPdfOpenStage({ context, stage: "tap_start" });
    recordPdfOpenStage({ context, stage: "document_prepare_start" });
    recordPdfOpenStage({
      context,
      stage: "document_prepare_done",
      sourceKind: "remote-url",
    });
    recordPdfOpenStage({
      context,
      stage: "viewer_route_push_attempt",
      sourceKind: "remote-url",
      extra: {
        route: "/pdf-viewer",
        sessionId: "session-1",
      },
    });

    expect(getPlatformObservabilityEvents()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          screen: "buyer",
          surface: "pdf_critical_path",
          event: "pdf_open_tap",
          result: "success",
        }),
        expect.objectContaining({
          screen: "buyer",
          surface: "pdf_critical_path",
          event: "pdf_prepare_start",
          result: "success",
        }),
        expect.objectContaining({
          screen: "buyer",
          surface: "pdf_critical_path",
          event: "pdf_prepare_success",
          result: "success",
          sourceKind: "remote-url",
        }),
        expect.objectContaining({
          screen: "buyer",
          surface: "pdf_critical_path",
          event: "pdf_viewer_route_push",
          result: "success",
          sourceKind: "remote-url",
        }),
      ]),
    );
  });

  it("emits typed prepare and terminal failures instead of silent dead ends", () => {
    const context = createPdfOpenFlowContext({
      documentType: "proposal",
      originModule: "buyer",
    });
    const error = Object.assign(new Error("source unavailable"), {
      code: "NETWORK_DOWN",
    });

    recordPdfOpenStage({
      context,
      stage: "document_prepare_fail",
      result: "error",
      error,
    });
    recordPdfOpenStage({
      context,
      stage: "open_failed",
      result: "error",
      error,
    });

    expect(getPlatformObservabilityEvents()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: "pdf_prepare_fail",
          result: "error",
          errorClass: "network_down",
          errorMessage: "source unavailable",
          extra: expect.objectContaining({
            appErrorSeverity: "fatal",
          }),
        }),
        expect.objectContaining({
          event: "pdf_terminal_fail",
          result: "error",
          errorClass: "network_down",
          errorMessage: "source unavailable",
          extra: expect.objectContaining({
            appErrorContext: "pdf_terminal_fail",
          }),
        }),
      ]),
    );
  });
});
