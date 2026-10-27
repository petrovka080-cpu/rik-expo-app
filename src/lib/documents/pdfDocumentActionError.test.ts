import {
  classifyPdfDocumentActionErrorKind,
  getPdfDocumentActionErrorName,
  getPdfFlowErrorMessage,
  normalizePdfDocumentActionError,
} from "./pdfDocumentActionError";

describe("pdfDocumentActionError", () => {
  it("keeps explicit Error messages", () => {
    const error = new Error("Share failed");
    expect(getPdfFlowErrorMessage(error, "fallback")).toBe("Share failed");
    expect(getPdfDocumentActionErrorName(error)).toBe("Error");
  });

  it("uses plain string errors and deterministic fallback for malformed inputs", () => {
    expect(getPdfFlowErrorMessage("Viewer failed", "fallback")).toBe("Viewer failed");
    expect(getPdfFlowErrorMessage({ foo: "bar" }, "fallback")).toBe("fallback");
  });

  it("normalizes unknown values into Error instances", () => {
    expect(normalizePdfDocumentActionError(new Error("Boom"), "fallback")).toBeInstanceOf(Error);
    expect(normalizePdfDocumentActionError("Boom", "fallback")).toBeInstanceOf(Error);
    expect(normalizePdfDocumentActionError({ foo: "bar" }, "fallback").message).toBe("fallback");
  });

  it("classifies user-cancel-like errors separately from hard failures", () => {
    expect(classifyPdfDocumentActionErrorKind(new Error("User cancelled the share sheet"))).toBe(
      "cancelled",
    );
    expect(classifyPdfDocumentActionErrorKind(new Error("PDF share failed"))).toBe("failure");
  });
});

