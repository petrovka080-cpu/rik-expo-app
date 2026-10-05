/* eslint-disable import/first */
const mockGetInfoAsync = jest.fn();
const mockDownloadAsync = jest.fn();
const mockCopyAsync = jest.fn();
const mockRecordPdfCrashBreadcrumb = jest.fn();

jest.mock("react-native", () => ({
  Platform: {
    OS: "android",
  },
}));

jest.mock("expo-file-system/legacy", () => ({
  getInfoAsync: (...args: unknown[]) => mockGetInfoAsync(...args),
  downloadAsync: (...args: unknown[]) => mockDownloadAsync(...args),
  copyAsync: (...args: unknown[]) => mockCopyAsync(...args),
}));

jest.mock("../fileSystemPaths", () => ({
  getFileSystemPaths: jest.fn(() => ({
    cacheDir: "file:///cache/",
    documentDir: "file:///documents/",
    legacyDocumentDirectory: "file:///documents/",
  })),
}));

jest.mock("../pdf/pdfCrashBreadcrumbs", () => ({
  recordPdfCrashBreadcrumb: (...args: unknown[]) =>
    mockRecordPdfCrashBreadcrumb(...args),
}));

import { Platform } from "react-native";
import {
  clearDocumentSessions,
  materializePdfAsset,
  createDocumentSession,
  completeDocumentPreviewSessionAsset,
  failDocumentSession,
  getDocumentSessionSnapshot,
  recoverDocumentSessionAfterNativeOpen,
  createPreparingDocumentPreviewSession,
  materializeDocumentPreviewSessionAsset,
  restoreInMemoryDocumentPreviewSession,
  failDocumentPreparationSession,
  resumeDocumentPreviewSession,
  type DocumentAsset,
} from "./pdfDocumentSessions";
import { clearPdfInstantCacheStateForTests } from "../pdf/pdfInstantCache";
import { buildPdfInstantCacheKey } from "../pdf/pdfInstantCache";
import type { DocumentDescriptor } from "./pdfDocument";

describe("pdfDocumentSessions materialization", () => {
  const preparingDoc: DocumentDescriptor = {
    uri: "https://example.test/own-preparation.pdf",
    fileSource: { kind: "remote-url", uri: "https://example.test/own-preparation.pdf" },
    fileName: "own-preparation.pdf", title: "Own estimate", mimeType: "application/pdf",
    documentType: "request", originModule: "reports", source: "generated",
  };
  function deferredDownload() {
    let written = false;
    let finish!: () => void;
    let fail!: (error: Error) => void;
    mockGetInfoAsync.mockImplementation(async () => ({ exists: written, size: 1234 }));
    mockDownloadAsync.mockImplementation((_uri: string, target: string) => new Promise((resolve, reject) => {
      finish = () => { written = true; resolve({ uri: target }); };
      fail = reject;
    }));
    return { finish: () => finish(), fail: (error: Error) => fail(error) };
  }
  async function flushPreparation() { for (let i = 0; i < 20; i += 1) await Promise.resolve(); }
  beforeEach(() => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: "android",
    });
    clearDocumentSessions();
    clearPdfInstantCacheStateForTests();
    mockGetInfoAsync.mockReset();
    mockDownloadAsync.mockReset();
    mockCopyAsync.mockReset();
    mockRecordPdfCrashBreadcrumb.mockReset();
    mockCopyAsync.mockResolvedValue(undefined);
    mockDownloadAsync.mockImplementation(async (_uri: string, target: string) => ({
      uri: target,
    }));
  });

  it("retains a late valid file after timeout without reopening until explicit retry", async () => {
    const download = deferredDownload();
    const { session } = createPreparingDocumentPreviewSession(preparingDoc);
    const work = materializeDocumentPreviewSessionAsset(session.sessionId, preparingDoc, session.preparationToken);
    await flushPreparation();
    expect(mockDownloadAsync).toHaveBeenCalledTimes(1);
    failDocumentSession(session.sessionId, "Preparation timeout");
    download.finish();
    const asset = await work;
    expect(getDocumentSessionSnapshot(session.sessionId)).toMatchObject({ session: { status: "error", errorMessage: "Preparation timeout" }, asset: { assetId: asset.assetId } });
    expect(resumeDocumentPreviewSession(session.sessionId)).toBe(true);
    expect(getDocumentSessionSnapshot(session.sessionId)).toMatchObject({ session: { status: "ready", assetId: asset.assetId } });
    expect(mockDownloadAsync).toHaveBeenCalledTimes(1);
  });

  it("continues the same pending preparation on explicit retry without a second download", async () => {
    const download = deferredDownload();
    const { session } = createPreparingDocumentPreviewSession(preparingDoc);
    const work = materializeDocumentPreviewSessionAsset(session.sessionId, preparingDoc, session.preparationToken);
    await flushPreparation();
    failDocumentSession(session.sessionId, "Preparation timeout");
    expect(resumeDocumentPreviewSession(session.sessionId)).toBe(true);
    expect(getDocumentSessionSnapshot(session.sessionId).session?.status).toBe("preparing");
    download.finish();
    await work;
    expect(getDocumentSessionSnapshot(session.sessionId).session?.status).toBe("ready");
    expect(mockDownloadAsync).toHaveBeenCalledTimes(1);
  });

  it.each(["success", "failure"])("rejects old preparation %s after replacing the session", async (result) => {
    const download = deferredDownload();
    const { session } = createPreparingDocumentPreviewSession(preparingDoc);
    const work = materializeDocumentPreviewSessionAsset(session.sessionId, preparingDoc, session.preparationToken);
    const rejected = expect(work).rejects.toBeInstanceOf(Error);
    await flushPreparation();
    const replacement = restoreInMemoryDocumentPreviewSession({ sessionId: session.sessionId, doc: { ...preparingDoc, uri: "file:///cache/new.pdf", fileSource: { kind: "local-file", uri: "file:///cache/new.pdf" } } });
    if (result === "success") download.finish();
    else download.fail(new Error("Old download failure"));
    await rejected;
    expect(getDocumentSessionSnapshot(session.sessionId)).toMatchObject({ session: { status: "ready", assetId: replacement.asset.assetId }, asset: { uri: "file:///cache/new.pdf" } });
    expect(failDocumentPreparationSession(session.sessionId, session.preparationToken!, "Old producer failure")).toBe(false);
  });

  it("requires a new caller action after failed preparation with no file", () => {
    const { session } = createPreparingDocumentPreviewSession(preparingDoc);
    expect(failDocumentPreparationSession(session.sessionId, session.preparationToken!, "Generation failed")).toBe(true);
    expect(resumeDocumentPreviewSession(session.sessionId)).toBe(false);
    expect(getDocumentSessionSnapshot(session.sessionId).session).toMatchObject({ status: "error", preparationState: "failed" });
  });

  it("recovers a failed native preview only for the same registered ready asset", () => {
    const asset: DocumentAsset = {
      assetId: "own-native-retry", uri: "file:///cache/valid.pdf",
      fileSource: { kind: "local-file", uri: "file:///cache/valid.pdf" },
      sourceKind: "local-file", fileName: "valid.pdf", title: "Own estimate",
      mimeType: "application/pdf", documentType: "request", originModule: "reports",
      source: "generated", createdAt: "2026-10-05T00:00:00.000Z",
    };
    const session = createDocumentSession(asset);
    completeDocumentPreviewSessionAsset(session.sessionId, asset);
    failDocumentSession(session.sessionId, "Previous native viewer failure");
    expect(recoverDocumentSessionAfterNativeOpen(session.sessionId, "replaced-asset")).toBe(false);
    expect(getDocumentSessionSnapshot(session.sessionId).session?.status).toBe("error");
    expect(recoverDocumentSessionAfterNativeOpen(session.sessionId, asset.assetId)).toBe(true);
    expect(getDocumentSessionSnapshot(session.sessionId).session).toMatchObject({ status: "ready", errorMessage: undefined });
    const preparing = createDocumentSession(asset, "preparing");
    expect(recoverDocumentSessionAfterNativeOpen(preparing.sessionId, asset.assetId)).toBe(false);
    expect(getDocumentSessionSnapshot(preparing.sessionId).session?.status).toBe("preparing");
  });

  it("changes the instant-cache identity with revision, renderer, title, or status", () => {
    const base = {
      uri: "https://example.test/artifacts/current.pdf?token=one",
      fileSource: {
        kind: "remote-url" as const,
        uri: "https://example.test/artifacts/current.pdf?token=one",
      },
      fileName: "estimate.pdf",
      title: "Смета — 6 400 м²",
      documentType: "request" as const,
      originModule: "reports" as const,
      entityId: "request-1",
      contentIdentity: {
        revisionId: "revision-149",
        rendererVersion: "canonical-professional-pdf.r4-a10",
        displayTitle: "Смета — 6 400 м²",
        documentStatus: "COMPLETE",
      },
    };
    const original = buildPdfInstantCacheKey(base);

    for (const changed of [
      { ...base, title: "Другой заголовок" },
      { ...base, contentIdentity: { ...base.contentIdentity, revisionId: "revision-150" } },
      { ...base, contentIdentity: { ...base.contentIdentity, rendererVersion: "canonical-professional-pdf.r4-a11" } },
      { ...base, contentIdentity: { ...base.contentIdentity, documentStatus: "PARTIAL_NEEDS_PRICE" } },
    ]) {
      expect(buildPdfInstantCacheKey(changed)).not.toBe(original);
    }
  });

  it("keeps materialization breadcrumbs off the awaited file critical path", async () => {
    mockGetInfoAsync
      .mockResolvedValueOnce({ exists: false })
      .mockResolvedValueOnce({ exists: true, size: 1234 })
      .mockResolvedValueOnce({ exists: true, size: 1234 })
      .mockResolvedValueOnce({ exists: true, size: 1234 })
      .mockResolvedValueOnce({ exists: true, size: 1234 });

    const asset = await materializePdfAsset({
      uri: "file:///tmp/source.pdf",
      fileSource: {
        kind: "local-file",
        uri: "file:///tmp/source.pdf",
      },
      fileName: "source.pdf",
      title: "Source PDF",
      mimeType: "application/pdf",
      documentType: "request",
      source: "generated",
      originModule: "foreman",
      createdAt: "2026-04-19T00:00:00.000Z",
      entityId: "request-1",
    });

    expect(asset.sourceKind).toBe("local-file");
    expect(asset.uri).toContain("file:///cache/pdf_instant_");
    expect(mockCopyAsync).toHaveBeenCalledWith({
      from: "file:///tmp/source.pdf",
      to: expect.stringContaining("file:///cache/pdf_instant_"),
    });
    expect(mockCopyAsync).toHaveBeenCalledWith({
      from: expect.stringContaining(".tmp-"),
      to: expect.stringContaining("file:///cache/pdf_instant_"),
    });
    expect(mockRecordPdfCrashBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        marker: "viewer_materialize_start",
        screen: "foreman",
        previewPath: "materialize_local_pdf_asset",
      }),
    );
    expect(mockRecordPdfCrashBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        marker: "viewer_materialize_success",
        screen: "foreman",
        fileExists: true,
        fileSizeBytes: 1234,
      }),
    );
  });

  it("does not recopy PDFs that already have a ready instant-cache target", async () => {
    mockGetInfoAsync
      .mockResolvedValueOnce({ exists: true, size: 1234 })
      .mockResolvedValueOnce({ exists: true, size: 1234 });
    const sourceUri = "file:///cache/already-ready.pdf";

    const asset = await materializePdfAsset({
      uri: sourceUri,
      fileSource: {
        kind: "local-file",
        uri: sourceUri,
      },
      fileName: "already-ready.pdf",
      title: "Ready PDF",
      mimeType: "application/pdf",
      documentType: "warehouse_document",
      source: "generated",
      originModule: "warehouse",
      createdAt: "2026-04-19T00:00:00.000Z",
      entityId: "warehouse-1",
    });

    expect(asset.uri).toContain("file:///cache/pdf_instant_");
    expect(asset.sourceKind).toBe("local-file");
    expect(asset.sizeBytes).toBe(1234);
    expect(mockCopyAsync).not.toHaveBeenCalled();
    expect(mockRecordPdfCrashBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        marker: "viewer_materialize_success",
        screen: "warehouse",
        uri: expect.stringContaining("file:///cache/pdf_instant_"),
      }),
    );
  });

  it("still copies volatile print-cache PDFs into controlled cache", async () => {
    mockGetInfoAsync
      .mockResolvedValueOnce({ exists: false })
      .mockResolvedValueOnce({ exists: true, size: 1234 })
      .mockResolvedValueOnce({ exists: true, size: 1234 })
      .mockResolvedValueOnce({ exists: true, size: 1234 })
      .mockResolvedValueOnce({ exists: true, size: 1234 });
    const sourceUri = "file:///cache/Caches/Print/output.pdf";

    const asset = await materializePdfAsset({
      uri: sourceUri,
      fileSource: {
        kind: "local-file",
        uri: sourceUri,
      },
      fileName: "print-output.pdf",
      title: "Print Output PDF",
      mimeType: "application/pdf",
      documentType: "request",
      source: "generated",
      originModule: "foreman",
      createdAt: "2026-04-19T00:00:00.000Z",
      entityId: "request-2",
    });

    expect(asset.uri).toContain("file:///cache/pdf_instant_");
    expect(asset.uri).not.toBe(sourceUri);
    expect(mockCopyAsync).toHaveBeenCalledWith({
      from: sourceUri,
      to: expect.stringContaining("file:///cache/pdf_instant_"),
    });
    expect(mockCopyAsync).toHaveBeenCalledWith({
      from: expect.stringContaining(".tmp-"),
      to: expect.stringContaining("file:///cache/pdf_instant_"),
    });
  });
});
