import {
  hasAndroidPdfRuntimeControlledErrorSignal,
  hasAndroidPdfRuntimeFailureSignal,
  hasAndroidPdfRuntimeReadySignal,
} from "../../scripts/_shared/pdfAndroidRuntimeSignals";

describe("pdf Android runtime signals", () => {
  it("accepts external viewer dispatch as a ready signal on Android", () => {
    expect(
      hasAndroidPdfRuntimeReadySignal(`
        [pdf-viewer] native_handoff_start
        [pdf-runner] android_view_intent_start
      `),
    ).toBe(true);

    expect(
      hasAndroidPdfRuntimeReadySignal(`
        [pdf-viewer] native_handoff_start
        [pdf-runner] android_remote_pdf_open_start
      `),
    ).toBe(true);
  });

  it("keeps post-return ready signals valid", () => {
    expect(
      hasAndroidPdfRuntimeReadySignal("[pdf-viewer] native_handoff_ready"),
    ).toBe(true);
    expect(
      hasAndroidPdfRuntimeReadySignal(
        "[attachment-opener] android_remote_pdf_open_ready",
      ),
    ).toBe(true);
  });

  it("does not treat handoff start alone as settled", () => {
    expect(
      hasAndroidPdfRuntimeReadySignal("[pdf-viewer] native_handoff_start"),
    ).toBe(false);
  });

  it("classifies Android handoff and intent failures as blocking failures", () => {
    expect(
      hasAndroidPdfRuntimeFailureSignal("[pdf-viewer] native_handoff_error"),
    ).toBe(true);
    expect(
      hasAndroidPdfRuntimeFailureSignal(
        "[attachment-opener] android_view_intent_failed",
      ),
    ).toBe(true);
    expect(
      hasAndroidPdfRuntimeFailureSignal(
        "[pdf-runner] android_remote_pdf_open_failed",
      ),
    ).toBe(true);
  });

  it("keeps viewer_error_state and load_error for controlled-error detection", () => {
    expect(
      hasAndroidPdfRuntimeFailureSignal("[pdf-viewer] viewer_error_state"),
    ).toBe(false);
    expect(
      hasAndroidPdfRuntimeControlledErrorSignal("[pdf-viewer] viewer_error_state"),
    ).toBe(true);
    expect(
      hasAndroidPdfRuntimeControlledErrorSignal("[pdf-viewer] load_error"),
    ).toBe(true);
  });
});
