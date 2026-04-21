import { normalizePdfViewerError } from "../../src/lib/pdf/pdfViewer.error";

describe("pdfViewer.error", () => {
  it("keeps abort and dismiss paths as intentional detach instead of hard failure", () => {
    expect(
      normalizePdfViewerError({
        error: new Error("Request aborted by user"),
        phase: "action",
      }),
    ).toEqual({
      kind: "intentional_detach",
      phase: "action",
      message: "Request aborted by user",
      isHardFailure: false,
    });

    expect(
      normalizePdfViewerError({
        error: "Preview dismissed by user",
        phase: "render",
      }).isHardFailure,
    ).toBe(false);
  });

  it("preserves validation errors as validation failures", () => {
    expect(
      normalizePdfViewerError({
        error: new Error("Invalid signed URL"),
        phase: "validation",
        kind: "validation",
      }),
    ).toEqual({
      kind: "validation",
      phase: "validation",
      message: "Invalid signed URL",
      isHardFailure: true,
    });
  });

  it("normalizes runtime failures deterministically", () => {
    expect(
      normalizePdfViewerError({
        error: new Error("Remote preview failed"),
        phase: "render",
      }),
    ).toEqual({
      kind: "runtime",
      phase: "render",
      message: "Remote preview failed",
      isHardFailure: true,
    });
  });

  it("uses fallback messages for unknown unsupported errors", () => {
    expect(
      normalizePdfViewerError({
        error: { code: "unsupported" },
        phase: "resolution",
        kind: "unsupported",
        fallbackMessage: "Unsupported viewer path.",
      }),
    ).toEqual({
      kind: "unsupported",
      phase: "resolution",
      message: "Unsupported viewer path.",
      isHardFailure: true,
    });
  });
});
