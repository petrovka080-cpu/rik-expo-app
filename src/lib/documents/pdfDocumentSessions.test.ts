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
} from "./pdfDocumentSessions";

describe("pdfDocumentSessions materialization", () => {
  beforeEach(() => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: "android",
    });
    clearDocumentSessions();
    mockGetInfoAsync.mockReset();
    mockDownloadAsync.mockReset();
    mockCopyAsync.mockReset();
    mockRecordPdfCrashBreadcrumb.mockReset();
    mockGetInfoAsync.mockResolvedValue({ exists: true, size: 1234 });
    mockCopyAsync.mockResolvedValue(undefined);
    mockDownloadAsync.mockImplementation(async (_uri: string, target: string) => ({
      uri: target,
    }));
  });

  it("keeps materialization breadcrumbs off the awaited file critical path", async () => {
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
    expect(asset.uri).toContain("file:///cache/pdf_");
    expect(mockCopyAsync).toHaveBeenCalledWith({
      from: "file:///tmp/source.pdf",
      to: expect.stringContaining("file:///cache/pdf_"),
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

  it("does not recopy stable PDFs that are already inside controlled cache", async () => {
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

    expect(asset.uri).toBe(sourceUri);
    expect(asset.sourceKind).toBe("local-file");
    expect(asset.sizeBytes).toBe(1234);
    expect(mockCopyAsync).not.toHaveBeenCalled();
    expect(mockRecordPdfCrashBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        marker: "viewer_materialize_success",
        screen: "warehouse",
        uri: sourceUri,
      }),
    );
  });

  it("still copies volatile print-cache PDFs into controlled cache", async () => {
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

    expect(asset.uri).toContain("file:///cache/pdf_");
    expect(asset.uri).not.toBe(sourceUri);
    expect(mockCopyAsync).toHaveBeenCalledWith({
      from: sourceUri,
      to: expect.stringContaining("file:///cache/pdf_"),
    });
  });
});
