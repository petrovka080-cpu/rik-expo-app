import { Platform } from "react-native";

import {
  getPlatformObservabilityEvents,
  resetPlatformObservabilityEvents,
} from "../observability/platformObservability";
import type { DocumentDescriptor } from "./pdfDocument";

const mockCreateDocumentPreviewSession = jest.fn();
const mockCreateInstantDocumentPreviewSession = jest.fn();
const mockCreateInMemoryDocumentPreviewSession = jest.fn();
const mockOpenPdfPreview = jest.fn();
const mockCreatePdfDocumentViewerHref = jest.fn();
const mockPushPdfDocumentViewerRouteSafely = jest.fn();
const mockCheckPdfMobilePreviewEligibility = jest.fn();
const mockRecordPdfPreviewOversizeBlocked = jest.fn();
const mockRecordPdfActionBoundaryEvent = jest.fn();
const mockGetDocumentSessionSnapshot = jest.fn();
const mockResumeDocumentPreviewSession = jest.fn();
const mockFailDocumentSession = jest.fn();

jest.mock("./pdfDocumentSessions", () => ({
  createDocumentPreviewSession: (...args: unknown[]) => mockCreateDocumentPreviewSession(...args),
  createInstantDocumentPreviewSession: (...args: unknown[]) =>
    mockCreateInstantDocumentPreviewSession(...args),
  createInMemoryDocumentPreviewSession: (...args: unknown[]) =>
    mockCreateInMemoryDocumentPreviewSession(...args),
  getDocumentSessionSnapshot: (...args: unknown[]) => mockGetDocumentSessionSnapshot(...args),
  resumeDocumentPreviewSession: (...args: unknown[]) => mockResumeDocumentPreviewSession(...args),
  failDocumentSession: (...args: unknown[]) => mockFailDocumentSession(...args),
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

const { executePreviewPdfDocument, retryPdfDocumentViewerSession, failPendingPdfDocumentViewerSession } = require("./pdfDocumentPreviewAction") as typeof import("./pdfDocumentPreviewAction");
import { resolvePdfViewerDirectSnapshot } from "../pdf/pdfViewerContract";

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

  it("marks only the captured pending preparation failed without clearing its producer or overwriting an existing timeout", () => {
    const session = { sessionId: "own", preparationToken: "token-own", preparationState: "pending", status: "preparing", errorMessage: "" };
    mockGetDocumentSessionSnapshot.mockReturnValue({ session, asset: null });
    mockFailDocumentSession.mockImplementation((_id: string, message: string) => { session.status = "error"; session.errorMessage = message; });
    expect(failPendingPdfDocumentViewerSession("own", "token-other", "foreign")).toBe(false);
    expect(mockFailDocumentSession).not.toHaveBeenCalled();
    expect(failPendingPdfDocumentViewerSession("own", "token-own", "Preparation timeout")).toBe(true);
    expect(session).toMatchObject({ status: "error", preparationState: "pending", errorMessage: "Preparation timeout" });
    expect(failPendingPdfDocumentViewerSession("own", "token-own", "Later Back")).toBe(false);
    expect(mockFailDocumentSession).toHaveBeenCalledTimes(1);
    expect(session.errorMessage).toBe("Preparation timeout");
  });

  it("keeps the mobile size guard before recovery of an existing failed asset", () => {
    mockGetDocumentSessionSnapshot.mockReturnValue({ session: { sessionId: "own" }, asset: { sizeBytes: 20_000_000 } });
    mockCheckPdfMobilePreviewEligibility.mockReturnValue({ eligible: false });
    mockResumeDocumentPreviewSession.mockReset();
    expect(retryPdfDocumentViewerSession("own")).toBe("blocked");
    expect(mockResumeDocumentPreviewSession).not.toHaveBeenCalled();
  });

  it("retries the same supported direct URI without requiring a registered session or returning to the caller", () => {
    const direct = resolvePdfViewerDirectSnapshot({ uri: "https://example.test/own.pdf", fileName: "own.pdf" })!;
    mockGetDocumentSessionSnapshot.mockReturnValue({ session: null, asset: null });
    mockCheckPdfMobilePreviewEligibility.mockReturnValue({ eligible: true });
    mockResumeDocumentPreviewSession.mockReset();
    expect(retryPdfDocumentViewerSession(direct.session.sessionId, direct.asset)).toBe("resume");
    expect(mockResumeDocumentPreviewSession).not.toHaveBeenCalled();
    expect(direct.asset.uri).toBe("https://example.test/own.pdf");
    expect(retryPdfDocumentViewerSession("missing-registry-session")).toBe("recreate_required");
  });

  beforeEach(() => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: "web",
    });
    resetPlatformObservabilityEvents();
    mockCreateDocumentPreviewSession.mockReset();
    mockCreateInstantDocumentPreviewSession.mockReset();
    mockCreateInMemoryDocumentPreviewSession.mockReset();
    mockOpenPdfPreview.mockReset();
    mockCreatePdfDocumentViewerHref.mockReset();
    mockPushPdfDocumentViewerRouteSafely.mockReset();
    mockCheckPdfMobilePreviewEligibility.mockReset();
    mockRecordPdfPreviewOversizeBlocked.mockReset();
    mockRecordPdfActionBoundaryEvent.mockReset();
    mockFailDocumentSession.mockReset();
    mockCreatePdfDocumentViewerHref.mockImplementation((
      sessionId: string,
      openToken?: string,
      returnTo?: string,
    ) => ({
      safeSessionId: sessionId,
      safeOpenToken: String(openToken ?? ""),
      href: `/pdf-viewer?sessionId=${sessionId}&openToken=${String(openToken ?? "")}${
        returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : ""
      }`,
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

  it("uses the instant cache-backed session path for mobile remote PDFs", async () => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: "android",
    });
    mockCreateInstantDocumentPreviewSession.mockResolvedValueOnce({
      session: {
        sessionId: "session-cache-1",
      },
      asset: {
        assetId: "asset-cache-1",
        uri: "file:///cache/payment.pdf",
        sourceKind: "local-file",
        fileName: baseDocument.fileName,
        documentType: baseDocument.documentType,
        originModule: baseDocument.originModule,
        entityId: baseDocument.entityId,
      },
      materializationMode: "cache_hit",
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

    expect(mockCreateInstantDocumentPreviewSession).toHaveBeenCalledWith(baseDocument);
    expect(mockCreateInMemoryDocumentPreviewSession).not.toHaveBeenCalled();
    expect(mockCreateDocumentPreviewSession).not.toHaveBeenCalled();
    expect(mockPushPdfDocumentViewerRouteSafely).toHaveBeenCalled();
    expect(mockOpenPdfPreview).not.toHaveBeenCalled();
  });

  it("binds the exact internal return route to the Android viewer entry", async () => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: "android",
    });
    mockCreateInstantDocumentPreviewSession.mockResolvedValueOnce({
      session: { sessionId: "session-return-1" },
      asset: {
        assetId: "asset-return-1",
        uri: "file:///cache/payment.pdf",
        sourceKind: "local-file",
        fileName: baseDocument.fileName,
        documentType: baseDocument.documentType,
        originModule: baseDocument.originModule,
        entityId: baseDocument.entityId,
      },
      materializationMode: "cache_hit",
    });

    await executePreviewPdfDocument(
      baseDocument,
      {
        router: { push: jest.fn() },
        returnTo: "/request?canonicalRevisionId=07918480-b10a-4de8-9525-7366d3c9202f",
        callerRouteKey: "request/index-own-caller",
      },
      { persistCriticalPdfBreadcrumb: jest.fn() },
    );

    expect(mockCreatePdfDocumentViewerHref).toHaveBeenCalledWith(
      "session-return-1",
      undefined,
      "/request?canonicalRevisionId=07918480-b10a-4de8-9525-7366d3c9202f",
      "request/index-own-caller",
    );
    expect(String(mockPushPdfDocumentViewerRouteSafely.mock.calls[0]?.[1])).toContain(
      "returnTo=%2Frequest%3FcanonicalRevisionId%3D07918480-b10a-4de8-9525-7366d3c9202f",
    );
  });

  it("uses the stored preview session path when the viewer route is available but in-memory remote is not", async () => {
    mockCreateInstantDocumentPreviewSession.mockResolvedValueOnce({
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
      materializationMode: "cache_hit",
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

    expect(mockCreateInstantDocumentPreviewSession).toHaveBeenCalled();
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
    mockCreateInstantDocumentPreviewSession.mockResolvedValueOnce({
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
      materializationMode: "cache_hit",
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
    mockCreateInstantDocumentPreviewSession.mockResolvedValueOnce({
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
      materializationMode: "cache_hit",
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
    mockCreateInstantDocumentPreviewSession.mockResolvedValueOnce({
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
      materializationMode: "cache_hit",
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
