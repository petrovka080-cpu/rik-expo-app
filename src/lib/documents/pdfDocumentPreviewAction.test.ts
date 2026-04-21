import { Platform } from "react-native";

import {
  getPlatformObservabilityEvents,
  resetPlatformObservabilityEvents,
} from "../observability/platformObservability";
import type { DocumentDescriptor } from "./pdfDocument";

const mockCreateDocumentPreviewSession = jest.fn();
const mockCreateInMemoryDocumentPreviewSession = jest.fn();
const mockOpenPdfPreview = jest.fn();
const mockCreatePdfDocumentViewerHref = jest.fn();
const mockPushPdfDocumentViewerRouteSafely = jest.fn();
const mockCheckPdfMobilePreviewEligibility = jest.fn();
const mockRecordPdfPreviewOversizeBlocked = jest.fn();
const mockRecordPdfActionBoundaryEvent = jest.fn();

jest.mock("./pdfDocumentSessions", () => ({
  createDocumentPreviewSession: (...args: unknown[]) => mockCreateDocumentPreviewSession(...args),
  createInMemoryDocumentPreviewSession: (...args: unknown[]) =>
    mockCreateInMemoryDocumentPreviewSession(...args),
}));

jest.mock("../pdfRunner", () => ({
  openPdfPreview: (...args: unknown[]) => mockOpenPdfPreview(...args),
}));

jest.mock("./pdfDocumentViewerEntry", () => ({
  createPdfDocumentViewerHref: (...args: unknown[]) => mockCreatePdfDocumentViewerHref(...args),
  pushPdfDocumentViewerRouteSafely: (...args: unknown[]) =>
    mockPushPdfDocumentViewerRouteSafely(...args),
}));

jest.mock("../pdf/pdfMobilePreviewSizeGuard", () => ({
  checkPdfMobilePreviewEligibility: (...args: unknown[]) =>
    mockCheckPdfMobilePreviewEligibility(...args),
  recordPdfPreviewOversizeBlocked: (...args: unknown[]) =>
    mockRecordPdfPreviewOversizeBlocked(...args),
}));

jest.mock("../pdf/pdfActionBoundary", () => ({
  recordPdfActionBoundaryEvent: (...args: unknown[]) => mockRecordPdfActionBoundaryEvent(...args),
}));

const { executePreviewPdfDocument } = require("./pdfDocumentPreviewAction") as typeof import("./pdfDocumentPreviewAction");

const baseDocument: DocumentDescriptor = {
  uri: "https://example.com/payment.pdf",
  fileSource: {
    kind: "remote-url",
    uri: "https://example.com/payment.pdf",
  },
  title: "Payment PDF",
  fileName: "payment.pdf",
  mimeType: "application/pdf",
  documentType: "payment_order",
  originModule: "accountant",
  source: "generated",
};

describe("pdfDocumentPreviewAction", () => {
  const originalPlatformOs = Platform.OS;

  beforeEach(() => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: "web",
    });
    resetPlatformObservabilityEvents();
    mockCreateDocumentPreviewSession.mockReset();
    mockCreateInMemoryDocumentPreviewSession.mockReset();
    mockOpenPdfPreview.mockReset();
    mockCreatePdfDocumentViewerHref.mockReset();
    mockPushPdfDocumentViewerRouteSafely.mockReset();
    mockCheckPdfMobilePreviewEligibility.mockReset();
    mockRecordPdfPreviewOversizeBlocked.mockReset();
    mockRecordPdfActionBoundaryEvent.mockReset();
    mockCreatePdfDocumentViewerHref.mockImplementation((sessionId: string, openToken?: string) => ({
      safeSessionId: sessionId,
      safeOpenToken: String(openToken ?? ""),
      href: `/pdf-viewer?sessionId=${sessionId}&openToken=${String(openToken ?? "")}`,
    }));
    mockCheckPdfMobilePreviewEligibility.mockReturnValue({
      eligible: true,
    });
  });

  afterAll(() => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: originalPlatformOs,
    });
  });

  it("uses the in-memory remote session path for mobile remote PDFs", async () => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: "android",
    });
    mockCreateInMemoryDocumentPreviewSession.mockReturnValue({
      session: {
        sessionId: "session-direct-1",
      },
      asset: {
        assetId: "asset-direct-1",
        uri: baseDocument.uri,
        sourceKind: "remote-url",
        fileName: baseDocument.fileName,
        documentType: baseDocument.documentType,
        originModule: baseDocument.originModule,
        entityId: baseDocument.entityId,
      },
    });

    await executePreviewPdfDocument(
      baseDocument,
      {
        router: { push: jest.fn() },
      },
      {
        persistCriticalPdfBreadcrumb: jest.fn(),
      },
    );

    expect(mockCreateInMemoryDocumentPreviewSession).toHaveBeenCalledWith(baseDocument);
    expect(mockCreateDocumentPreviewSession).not.toHaveBeenCalled();
    expect(mockPushPdfDocumentViewerRouteSafely).toHaveBeenCalled();
    expect(mockOpenPdfPreview).not.toHaveBeenCalled();
  });

  it("uses the stored preview session path when the viewer route is available but in-memory remote is not", async () => {
    mockCreateDocumentPreviewSession.mockResolvedValueOnce({
      session: {
        sessionId: "session-1",
      },
      asset: {
        assetId: "asset-1",
        uri: "file:///cache/payment.pdf",
        sourceKind: "local-file",
        sizeBytes: 100,
        fileName: "payment.pdf",
        documentType: "payment_order",
        originModule: "accountant",
      },
    });

    await executePreviewPdfDocument(
      {
        ...baseDocument,
        uri: "file:///cache/payment.pdf",
        fileSource: {
          kind: "local-file",
          uri: "file:///cache/payment.pdf",
        },
      },
      {
        router: { push: jest.fn() },
      },
      {
        persistCriticalPdfBreadcrumb: jest.fn(),
      },
    );

    expect(mockCreateDocumentPreviewSession).toHaveBeenCalled();
    expect(mockPushPdfDocumentViewerRouteSafely).toHaveBeenCalled();
    expect(mockOpenPdfPreview).not.toHaveBeenCalled();
  });

  it("falls back to direct preview when there is no router", async () => {
    mockCreateDocumentPreviewSession.mockResolvedValueOnce({
      session: {
        sessionId: "session-direct-preview",
      },
      asset: {
        assetId: "asset-1",
        uri: "file:///cache/payment.pdf",
        sourceKind: "local-file",
        sizeBytes: 100,
        fileName: "payment.pdf",
        documentType: "payment_order",
        originModule: "accountant",
      },
    });

    await executePreviewPdfDocument(
      {
        ...baseDocument,
        uri: "file:///cache/payment.pdf",
        fileSource: {
          kind: "local-file",
          uri: "file:///cache/payment.pdf",
        },
      },
      undefined,
      {
        persistCriticalPdfBreadcrumb: jest.fn(),
      },
    );

    expect(mockPushPdfDocumentViewerRouteSafely).not.toHaveBeenCalled();
    expect(mockOpenPdfPreview).toHaveBeenCalledWith("file:///cache/payment.pdf", "payment.pdf");
  });

  it("normalizes viewer navigation failures deterministically", async () => {
    mockCreateDocumentPreviewSession.mockResolvedValueOnce({
      session: {
        sessionId: "session-nav-fail",
      },
      asset: {
        assetId: "asset-1",
        uri: "file:///cache/payment.pdf",
        sourceKind: "local-file",
        sizeBytes: 100,
        fileName: "payment.pdf",
        documentType: "payment_order",
        originModule: "accountant",
      },
    });
    mockPushPdfDocumentViewerRouteSafely.mockRejectedValueOnce(
      new Error("Viewer navigation failed"),
    );

    await expect(
      executePreviewPdfDocument(
        {
          ...baseDocument,
          uri: "file:///cache/payment.pdf",
          fileSource: {
            kind: "local-file",
            uri: "file:///cache/payment.pdf",
          },
        },
        {
          router: { push: jest.fn() },
        },
        {
          persistCriticalPdfBreadcrumb: jest.fn(),
        },
      ),
    ).rejects.toThrow("Viewer navigation failed");
  });

  it("blocks oversized PDFs on iOS before viewer route push", async () => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: "ios",
    });
    mockCreateDocumentPreviewSession.mockResolvedValueOnce({
      session: {
        sessionId: "session-ios-blocked",
      },
      asset: {
        assetId: "asset-1",
        uri: "file:///cache/payment.pdf",
        sourceKind: "local-file",
        sizeBytes: 60,
        fileName: "payment.pdf",
        documentType: "payment_order",
        originModule: "accountant",
      },
    });
    mockCheckPdfMobilePreviewEligibility.mockReturnValueOnce({
      eligible: false,
      sizeBytes: 60,
      limitBytes: 50,
    });
    mockRecordPdfPreviewOversizeBlocked.mockImplementationOnce(
      () => new Error("PDF is too large for iOS preview"),
    );

    await expect(
      executePreviewPdfDocument(
        {
          ...baseDocument,
          uri: "file:///cache/payment.pdf",
          fileSource: {
            kind: "local-file",
            uri: "file:///cache/payment.pdf",
          },
        },
        {
          router: { push: jest.fn() },
        },
        {
          persistCriticalPdfBreadcrumb: jest.fn(),
        },
      ),
    ).rejects.toThrow("PDF is too large for iOS preview");
    expect(mockPushPdfDocumentViewerRouteSafely).not.toHaveBeenCalled();
  });

  it("records preview lifecycle success events on a stable route handoff", async () => {
    mockCreateDocumentPreviewSession.mockResolvedValueOnce({
      session: {
        sessionId: "session-event",
      },
      asset: {
        assetId: "asset-1",
        uri: "file:///cache/payment.pdf",
        sourceKind: "local-file",
        sizeBytes: 100,
        fileName: "payment.pdf",
        documentType: "payment_order",
        originModule: "accountant",
      },
    });

    await executePreviewPdfDocument(
      {
        ...baseDocument,
        uri: "file:///cache/payment.pdf",
        fileSource: {
          kind: "local-file",
          uri: "file:///cache/payment.pdf",
        },
      },
      {
        router: { push: jest.fn() },
      },
      {
        persistCriticalPdfBreadcrumb: jest.fn(),
      },
    );

    expect(
      getPlatformObservabilityEvents().some(
        (event) =>
          event.event === "pdf_preview_output_prepare" && event.result === "success",
      ),
    ).toBe(true);
    expect(
      getPlatformObservabilityEvents().some(
        (event) => event.event === "pdf_preview_open" && event.result === "success",
      ),
    ).toBe(true);
  });
});

