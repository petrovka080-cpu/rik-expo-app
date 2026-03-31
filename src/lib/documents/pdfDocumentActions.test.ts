const mockPreparePdfExecutionSource = jest.fn();
const mockOpenPdfPreview = jest.fn();
const mockOpenPdfShare = jest.fn();
const mockOpenPdfExternal = jest.fn();
const mockCreateDocumentPreviewSession = jest.fn();

jest.mock("../pdfRunner", () => ({
  preparePdfExecutionSource: (...args: unknown[]) => mockPreparePdfExecutionSource(...args),
  openPdfPreview: (...args: unknown[]) => mockOpenPdfPreview(...args),
  openPdfShare: (...args: unknown[]) => mockOpenPdfShare(...args),
  openPdfExternal: (...args: unknown[]) => mockOpenPdfExternal(...args),
}));

jest.mock("./pdfDocumentSessions", () => ({
  createDocumentPreviewSession: (...args: unknown[]) => mockCreateDocumentPreviewSession(...args),
}));

import { Platform } from "react-native";
import {
  getPlatformObservabilityEvents,
  resetPlatformObservabilityEvents,
} from "../observability/platformObservability";
import {
  preparePdfDocument,
  previewPdfDocument,
} from "./pdfDocumentActions";

const baseDocument = {
  uri: "https://example.com/payment.pdf",
  fileSource: {
    kind: "remote-url" as const,
    uri: "https://example.com/payment.pdf",
  },
  title: "Payment PDF",
  fileName: "payment.pdf",
  mimeType: "application/pdf" as const,
  documentType: "payment_order" as const,
  originModule: "accountant" as const,
  source: "generated" as const,
};

describe("pdfDocumentActions", () => {
  const originalPlatformOs = Platform.OS;

  beforeEach(() => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: "web",
    });
    mockPreparePdfExecutionSource.mockReset();
    mockOpenPdfPreview.mockReset();
    mockOpenPdfShare.mockReset();
    mockOpenPdfExternal.mockReset();
    mockCreateDocumentPreviewSession.mockReset();
    resetPlatformObservabilityEvents();
  });

  afterAll(() => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: originalPlatformOs,
    });
  });

  it("prepares PDF output with typed execution source", async () => {
    mockPreparePdfExecutionSource.mockResolvedValueOnce({
      kind: "remote-url",
      uri: "https://example.com/prepared.pdf",
    });

    const result = await preparePdfDocument({
      supabase: {},
      descriptor: baseDocument,
    });

    expect(result.uri).toBe("https://example.com/prepared.pdf");
    expect(
      getPlatformObservabilityEvents().some(
        (event) => event.event === "pdf_output_prepare" && event.result === "success",
      ),
    ).toBe(true);
  });

  it("navigates to the shared viewer route with a prepared session when router is provided", async () => {
    const push = jest.fn();
    mockCreateDocumentPreviewSession.mockResolvedValueOnce({
      session: {
        sessionId: "session-1",
        assetId: "asset-1",
        status: "ready",
        createdAt: "2026-03-30T10:00:00.000Z",
      },
      asset: {
        assetId: "asset-1",
        uri: "file:///cache/payment.pdf",
        fileSource: {
          kind: "local-file",
          uri: "file:///cache/payment.pdf",
        },
        sourceKind: "local-file",
        fileName: "payment.pdf",
        title: "Payment PDF",
        mimeType: "application/pdf",
        documentType: "payment_order",
        originModule: "accountant",
        source: "generated",
        createdAt: "2026-03-30T10:00:00.000Z",
      },
    });

    await previewPdfDocument(baseDocument, {
      router: { push },
    });

    expect(push).toHaveBeenCalledWith({
      pathname: "/pdf-viewer",
      params: { sessionId: "session-1" },
    });
    expect(mockOpenPdfPreview).not.toHaveBeenCalled();
  });

  it("keeps the web director supplier remote-url path on the shared session viewer contract", async () => {
    const push = jest.fn();
    const supplierDocument = {
      ...baseDocument,
      uri: "https://example.com/director-supplier-summary.pdf",
      fileSource: {
        kind: "remote-url" as const,
        uri: "https://example.com/director-supplier-summary.pdf",
      },
      title: "Supplier Summary PDF",
      fileName: "director_supplier_summary.pdf",
      documentType: "supplier_summary" as const,
      originModule: "director" as const,
      entityId: "Supplier A",
    };

    mockCreateDocumentPreviewSession.mockResolvedValueOnce({
      session: {
        sessionId: "session-supplier-1",
        assetId: "asset-supplier-1",
        status: "ready",
        createdAt: "2026-03-31T06:00:00.000Z",
      },
      asset: {
        assetId: "asset-supplier-1",
        uri: "https://example.com/director-supplier-summary.pdf",
        fileSource: {
          kind: "remote-url",
          uri: "https://example.com/director-supplier-summary.pdf",
        },
        sourceKind: "remote-url",
        fileName: "director_supplier_summary.pdf",
        title: "Supplier Summary PDF",
        mimeType: "application/pdf",
        documentType: "supplier_summary",
        originModule: "director",
        source: "generated",
        entityId: "Supplier A",
        createdAt: "2026-03-31T06:00:00.000Z",
      },
    });

    await previewPdfDocument(supplierDocument, {
      router: { push },
    });

    expect(mockCreateDocumentPreviewSession).toHaveBeenCalledWith(supplierDocument);
    expect(push).toHaveBeenCalledWith({
      pathname: "/pdf-viewer",
      params: { sessionId: "session-supplier-1" },
    });
    expect(mockOpenPdfPreview).not.toHaveBeenCalled();
    expect(
      getPlatformObservabilityEvents().some(
        (event) =>
          event.event === "pdf_preview_open" &&
          event.result === "success" &&
          event.extra?.sessionId === "session-supplier-1",
      ),
    ).toBe(true);
  });

  it("Open fail is visible during direct preview fallback", async () => {
    mockCreateDocumentPreviewSession.mockResolvedValueOnce({
      session: {
        sessionId: "session-1",
        assetId: "asset-1",
        status: "ready",
        createdAt: "2026-03-30T10:00:00.000Z",
      },
      asset: {
        assetId: "asset-1",
        uri: "https://example.com/payment.pdf",
        fileSource: {
          kind: "remote-url",
          uri: "https://example.com/payment.pdf",
        },
        sourceKind: "remote-url",
        fileName: "payment.pdf",
        title: "Payment PDF",
        mimeType: "application/pdf",
        documentType: "payment_order",
        originModule: "accountant",
        source: "generated",
        createdAt: "2026-03-30T10:00:00.000Z",
      },
    });
    mockOpenPdfPreview.mockRejectedValueOnce(new Error("preview blocked"));

    await expect(previewPdfDocument(baseDocument)).rejects.toMatchObject({
      name: "PdfLifecycleError",
      stage: "open_view",
      failureType: "open_fail",
    });

    expect(
      getPlatformObservabilityEvents().some(
        (event) =>
          event.event === "pdf_preview_open"
          && event.result === "error"
          && event.extra?.pdfFailureType === "open_fail",
      ),
    ).toBe(true);
  });

  it("routes mobile remote PDFs directly through the shared viewer contract without local session materialization", async () => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: "android",
    });
    const push = jest.fn();

    await previewPdfDocument(baseDocument, {
      router: { push },
    });

    expect(mockCreateDocumentPreviewSession).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith({
      pathname: "/pdf-viewer",
      params: {
        uri: "https://example.com/payment.pdf",
        fileName: "payment.pdf",
        title: "Payment PDF",
        sourceKind: "remote-url",
        documentType: "payment_order",
        originModule: "accountant",
        source: "generated",
        entityId: "",
      },
    });
    expect(
      getPlatformObservabilityEvents().some(
        (event) =>
          event.event === "pdf_preview_open"
          && event.result === "success"
          && event.extra?.previewSourceMode === "direct_remote_viewer_contract",
      ),
    ).toBe(true);
  });
});
