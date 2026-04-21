import {
  getPlatformObservabilityEvents,
  resetPlatformObservabilityEvents,
} from "../observability/platformObservability";
import type { DocumentDescriptor } from "./pdfDocument";

const mockOpenPdfExternal = jest.fn();

jest.mock("../pdfRunner", () => ({
  openPdfExternal: (...args: unknown[]) => mockOpenPdfExternal(...args),
}));

const { executeOpenPdfDocumentExternal } =
  require("./pdfDocumentExternalOpenAction") as typeof import("./pdfDocumentExternalOpenAction");

const baseDocument: DocumentDescriptor = {
  uri: "https://example.com/external.pdf",
  fileSource: {
    kind: "remote-url",
    uri: "https://example.com/external.pdf",
  },
  title: "External PDF",
  fileName: "external.pdf",
  mimeType: "application/pdf",
  documentType: "attachment_pdf",
  originModule: "reports",
  source: "attachment",
};

describe("pdfDocumentExternalOpenAction", () => {
  beforeEach(() => {
    resetPlatformObservabilityEvents();
    mockOpenPdfExternal.mockReset();
  });

  it("keeps the external-open strategy unchanged on success", async () => {
    await executeOpenPdfDocumentExternal(baseDocument);

    expect(mockOpenPdfExternal).toHaveBeenCalledWith(
      "https://example.com/external.pdf",
      "external.pdf",
    );
    expect(
      getPlatformObservabilityEvents().some(
        (event) => event.event === "pdf_external_open" && event.result === "success",
      ),
    ).toBe(true);
  });

  it("keeps external-open failures observable and rejected", async () => {
    mockOpenPdfExternal.mockRejectedValueOnce(new Error("External viewer missing"));

    await expect(executeOpenPdfDocumentExternal(baseDocument)).rejects.toThrow(
      "External viewer missing",
    );
    expect(
      getPlatformObservabilityEvents().some(
        (event) => event.event === "pdf_external_open" && event.result === "error",
      ),
    ).toBe(true);
  });
});

