/* eslint-disable import/first */
const mockPreparePdfExecutionSource = jest.fn();
const mockOpenPdfPreview = jest.fn();
const mockOpenPdfShare = jest.fn();
const mockOpenPdfExternal = jest.fn();
const mockCreateDocumentPreviewSession = jest.fn();
const mockCreateInMemoryDocumentPreviewSession = jest.fn();

jest.mock("../pdfRunner", () => ({
  preparePdfExecutionSource: (...args: unknown[]) => mockPreparePdfExecutionSource(...args),
  openPdfPreview: (...args: unknown[]) => mockOpenPdfPreview(...args),
  openPdfShare: (...args: unknown[]) => mockOpenPdfShare(...args),
  openPdfExternal: (...args: unknown[]) => mockOpenPdfExternal(...args),
}));

jest.mock("./pdfDocumentSessions", () => ({
  createDocumentPreviewSession: (...args: unknown[]) => mockCreateDocumentPreviewSession(...args),
  createInMemoryDocumentPreviewSession: (...args: unknown[]) =>
    mockCreateInMemoryDocumentPreviewSession(...args),
}));

import { InteractionManager, Platform } from "react-native";
import {
  getPlatformObservabilityEvents,
  resetPlatformObservabilityEvents,
} from "../observability/platformObservability";
import {
  failPdfOpenVisible,
  markPdfOpenVisible,
  resetPdfOpenFlowStateForTests,
} from "../pdf/pdfOpenFlow";
import {
  preparePdfDocument,
  prepareAndPreviewPdfDocument,
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
  entityId: undefined as string | undefined,
};

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
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
    mockCreateInMemoryDocumentPreviewSession.mockReset();
    resetPlatformObservabilityEvents();
    resetPdfOpenFlowStateForTests();
    mockCreateInMemoryDocumentPreviewSession.mockImplementation((doc: typeof baseDocument) => ({
      session: {
        sessionId: "session-direct-1",
        assetId: "asset-direct-1",
        status: "ready",
        createdAt: "2026-03-30T10:00:00.000Z",
      },
      asset: {
        assetId: "asset-direct-1",
        uri: doc.uri,
        fileSource: doc.fileSource,
        sourceKind: doc.fileSource.kind,
        fileName: doc.fileName,
        title: doc.title,
        mimeType: doc.mimeType,
        documentType: doc.documentType,
        originModule: doc.originModule,
        source: doc.source,
        createdAt: "2026-03-30T10:00:00.000Z",
        entityId: doc.entityId,
      },
    }));
    jest.spyOn(InteractionManager, "runAfterInteractions").mockImplementation((callback: () => void) => {
      callback();
      return {
        cancel: jest.fn(),
      } as unknown as ReturnType<typeof InteractionManager.runAfterInteractions>;
    });
    global.requestAnimationFrame = ((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    }) as typeof requestAnimationFrame;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete (global as Partial<typeof globalThis>).requestAnimationFrame;
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

  it("rejects local legacy materialization for canonical role PDF families", async () => {
    mockPreparePdfExecutionSource.mockResolvedValueOnce({
      kind: "local-file",
      uri: "file:///cache/director-report.pdf",
    });

    await expect(
      preparePdfDocument({
        supabase: {},
        descriptor: {
          ...baseDocument,
          uri: "https://example.com/director-report.pdf",
          fileSource: {
            kind: "remote-url",
            uri: "https://example.com/director-report.pdf",
          },
          fileName: "director_report.pdf",
          documentType: "director_report",
          originModule: "director",
        },
      }),
    ).rejects.toThrow("Canonical director director_report PDF must use backend remote-url source");
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

    expect(push).toHaveBeenCalledWith("/pdf-viewer?sessionId=session-1&openToken=");
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
    expect(push).toHaveBeenCalledWith("/pdf-viewer?sessionId=session-supplier-1&openToken=");
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
    expect(push).toHaveBeenCalledWith("/pdf-viewer?sessionId=session-direct-1&openToken=");
    expect(mockCreateInMemoryDocumentPreviewSession).toHaveBeenCalledWith(baseDocument);
    expect(
      getPlatformObservabilityEvents().some(
        (event) =>
          event.event === "pdf_preview_open"
          && event.result === "success"
          && event.extra?.previewSourceMode === "direct_remote_viewer_session_contract",
      ),
    ).toBe(true);
  });

  it("routes iOS remote PDFs through the in-app viewer route instead of direct preview/share", async () => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: "ios",
    });
    const push = jest.fn();

    await previewPdfDocument(baseDocument, {
      router: { push },
    });

    expect(mockCreateDocumentPreviewSession).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/pdf-viewer?sessionId=session-direct-1&openToken=");
    expect(mockCreateInMemoryDocumentPreviewSession).toHaveBeenCalledWith(baseDocument);
    expect(mockOpenPdfPreview).not.toHaveBeenCalled();
    expect(mockOpenPdfShare).not.toHaveBeenCalled();
  });

  it("keeps busy active until first open visible and coalesces duplicate taps into one PDF open flow", async () => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: "android",
    });
    mockPreparePdfExecutionSource.mockResolvedValue({
      kind: "remote-url",
      uri: "https://example.com/prepared.pdf",
    });
    const push = jest.fn();
    const activeKeys = new Set<string>();
    const busy = {
      isBusy: (key?: string) => activeKeys.has(String(key || "busy")),
      run: async <T,>(
        fn: () => Promise<T>,
        opts?: { key?: string },
      ): Promise<T | null> => {
        const key = String(opts?.key || "busy");
        if (activeKeys.has(key)) return null;
        activeKeys.add(key);
        try {
          return await fn();
        } finally {
          activeKeys.delete(key);
        }
      },
    };

    const first = prepareAndPreviewPdfDocument({
      busy,
      supabase: {},
      key: "pdf:dup:1",
      label: "Opening PDF...",
      descriptor: baseDocument,
      getRemoteUrl: () => baseDocument.uri,
      router: { push },
    });
    const second = prepareAndPreviewPdfDocument({
      busy,
      supabase: {},
      key: "pdf:dup:1",
      label: "Opening PDF...",
      descriptor: baseDocument,
      getRemoteUrl: () => baseDocument.uri,
      router: { push },
    });

    await flushPromises();
    expect(push).toHaveBeenCalledTimes(1);
    expect(activeKeys.has("pdf:dup:1")).toBe(true);
    const pushedHref = String(push.mock.calls[0]?.[0] || "");
    const openToken = new URL(pushedHref, "https://example.test").searchParams.get("openToken") || "";
    let firstSettled = false;
    void first.then(() => {
      firstSettled = true;
    });

    await flushPromises();
    expect(firstSettled).toBe(false);

    markPdfOpenVisible(openToken, {
      sourceKind: "remote-url",
    });

    await expect(Promise.all([first, second])).resolves.toHaveLength(2);
    expect(activeKeys.size).toBe(0);
    expect(
      getPlatformObservabilityEvents().some(
        (event) =>
          event.surface === "pdf_open_family"
          && event.event === "tap_start"
          && event.result === "joined_inflight",
      ),
    ).toBe(true);
    expect(
      getPlatformObservabilityEvents().some(
        (event) =>
          event.surface === "pdf_open_family"
          && event.event === "first_open_visible"
          && event.result === "success",
      ),
    ).toBe(true);
    expect(
      getPlatformObservabilityEvents().some(
        (event) =>
          event.surface === "pdf_open_family"
          && event.event === "busy_cleared"
          && event.result === "success",
      ),
    ).toBe(true);
  });

  it("clears busy and reports open failure when viewer visibility fails after navigation", async () => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: "android",
    });
    mockPreparePdfExecutionSource.mockResolvedValue({
      kind: "remote-url",
      uri: "https://example.com/prepared.pdf",
    });
    const push = jest.fn();
    const activeKeys = new Set<string>();
    const busy = {
      isBusy: (key?: string) => activeKeys.has(String(key || "busy")),
      run: async <T,>(
        fn: () => Promise<T>,
        opts?: { key?: string },
      ): Promise<T | null> => {
        const key = String(opts?.key || "busy");
        if (activeKeys.has(key)) return null;
        activeKeys.add(key);
        try {
          return await fn();
        } finally {
          activeKeys.delete(key);
        }
      },
    };

    const promise = prepareAndPreviewPdfDocument({
      busy,
      supabase: {},
      key: "pdf:dup:2",
      label: "Opening PDF...",
      descriptor: baseDocument,
      getRemoteUrl: () => baseDocument.uri,
      router: { push },
    });

    await flushPromises();
    const pushedHref = String(push.mock.calls[0]?.[0] || "");
    const openToken = new URL(pushedHref, "https://example.test").searchParams.get("openToken") || "";
    failPdfOpenVisible(openToken, new Error("viewer failed"), {
      sourceKind: "remote-url",
    });

    await expect(promise).rejects.toThrow("viewer failed");
    expect(activeKeys.size).toBe(0);
    expect(
      getPlatformObservabilityEvents().some(
        (event) =>
          event.surface === "pdf_open_family"
          && event.event === "open_failed"
          && event.result === "error",
      ),
    ).toBe(true);
    expect(
      getPlatformObservabilityEvents().some(
        (event) =>
          event.surface === "pdf_open_family"
          && event.event === "busy_cleared"
          && event.result === "success",
      ),
    ).toBe(true);
  });
});
