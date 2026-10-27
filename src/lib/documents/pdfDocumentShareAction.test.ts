import {
  getPlatformObservabilityEvents,
  resetPlatformObservabilityEvents,
} from "../observability/platformObservability";
import type { DocumentDescriptor } from "./pdfDocument";

const mockOpenPdfShare = jest.fn();

jest.mock("../pdfRunner", () => ({
  openPdfShare: (...args: unknown[]) => mockOpenPdfShare(...args),
}));

const { executeSharePdfDocument } = require("./pdfDocumentShareAction") as typeof import("./pdfDocumentShareAction");

const baseDocument: DocumentDescriptor = {
  uri: "file:///cache/share.pdf",
  fileSource: {
    kind: "local-file",
    uri: "file:///cache/share.pdf",
  },
  title: "Share PDF",
  fileName: "share.pdf",
  mimeType: "application/pdf",
  documentType: "payment_order",
  originModule: "accountant",
  source: "generated",
};

describe("pdfDocumentShareAction", () => {
  beforeEach(() => {
    resetPlatformObservabilityEvents();
    mockOpenPdfShare.mockReset();
  });

  it("keeps the share strategy unchanged on success", async () => {
    await executeSharePdfDocument(baseDocument);

    expect(mockOpenPdfShare).toHaveBeenCalledWith("file:///cache/share.pdf", "share.pdf");
    expect(
      getPlatformObservabilityEvents().some(
        (event) => event.event === "pdf_share_open" && event.result === "success",
      ),
    ).toBe(true);
  });

  it("keeps share failures observable and rejected", async () => {
    mockOpenPdfShare.mockRejectedValueOnce(new Error("Share sheet unavailable"));

    await expect(executeSharePdfDocument(baseDocument)).rejects.toThrow(
      "Share sheet unavailable",
    );
    expect(
      getPlatformObservabilityEvents().some(
        (event) => event.event === "pdf_share_open" && event.result === "error",
      ),
    ).toBe(true);
  });
});

