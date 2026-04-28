/* eslint-disable import/first */
const mockGetItem = jest.fn();
const mockSetItem = jest.fn();
const mockRemoveItem = jest.fn();

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: (...args: unknown[]) => mockGetItem(...args),
    setItem: (...args: unknown[]) => mockSetItem(...args),
    removeItem: (...args: unknown[]) => mockRemoveItem(...args),
  },
}));

import {
  clearPdfCrashBreadcrumbs,
  flushPdfCrashBreadcrumbWrites,
  getPdfCrashBreadcrumbs,
  recordPdfCrashBreadcrumb,
  recordPdfCrashBreadcrumbAsync,
} from "./pdfCrashBreadcrumbs";
import { SENSITIVE_REDACTION_MARKER } from "../security/redaction";
import {
  getPlatformObservabilityEvents,
  resetPlatformObservabilityEvents,
} from "../observability/platformObservability";

describe("pdfCrashBreadcrumbs", () => {
  beforeEach(async () => {
    mockGetItem.mockReset();
    mockSetItem.mockReset();
    mockRemoveItem.mockReset();
    mockGetItem.mockResolvedValue(null);
    mockSetItem.mockResolvedValue(undefined);
    mockRemoveItem.mockResolvedValue(undefined);
    resetPlatformObservabilityEvents();
    await clearPdfCrashBreadcrumbs();
    await flushPdfCrashBreadcrumbWrites();
  });

  it("persists async breadcrumbs before continuing critical mobile flow", async () => {
    await recordPdfCrashBreadcrumbAsync({
      marker: "viewer_route_pushed",
      screen: "foreman",
      documentType: "request",
      originModule: "foreman",
      sourceKind: "remote-url",
      uri: "https://example.com/request.pdf",
      fileName: "request.pdf",
      openToken: "open-1",
    });

    expect(mockSetItem).toHaveBeenCalledTimes(1);
    const savedItems = JSON.parse(
      String(mockSetItem.mock.calls[0]?.[1] ?? "[]"),
    );
    expect(savedItems).toHaveLength(1);
    expect(savedItems[0]).toMatchObject({
      marker: "viewer_route_pushed",
      screen: "foreman",
      sourceKind: "remote-url",
      openToken: SENSITIVE_REDACTION_MARKER,
    });
  });

  it("redacts signed URLs, open tokens, and nested diagnostic extras before persistence", async () => {
    await recordPdfCrashBreadcrumbAsync({
      marker: "viewer_route_pushed",
      screen: "warehouse",
      documentType: "warehouse_register",
      originModule: "warehouse",
      sourceKind: "remote-url",
      uri: "https://storage.example.test/register.pdf?token=storage-secret&download=1",
      openToken: "open-secret",
      errorMessage: "failed for Bearer auth-secret",
      extra: {
        signedUrl: "https://storage.example.test/report.pdf?token=nested-secret",
        href: "/pdf-viewer?sessionId=session-1&openToken=route-secret",
      },
    });

    const savedItems = JSON.parse(String(mockSetItem.mock.calls[0]?.[1] ?? "[]"));
    const savedJson = JSON.stringify(savedItems);

    expect(savedJson).not.toContain("storage-secret");
    expect(savedJson).not.toContain("open-secret");
    expect(savedJson).not.toContain("auth-secret");
    expect(savedJson).not.toContain("nested-secret");
    expect(savedJson).not.toContain("route-secret");
    expect(savedItems[0]).toMatchObject({
      openToken: SENSITIVE_REDACTION_MARKER,
      errorMessage: `failed for Bearer ${SENSITIVE_REDACTION_MARKER}`,
      extra: {
        signedUrl: SENSITIVE_REDACTION_MARKER,
        href: `/pdf-viewer?sessionId=session-1&openToken=${SENSITIVE_REDACTION_MARKER}`,
      },
    });
    expect(savedItems[0].uriTail).toContain(`token=${SENSITIVE_REDACTION_MARKER}`);
  });

  it("flushes queued fire-and-forget writes for diagnostics reads", async () => {
    recordPdfCrashBreadcrumb({
      marker: "tap_start",
      screen: "warehouse",
      documentType: "warehouse_register",
      originModule: "warehouse",
      sourceKind: "remote-url",
      uri: "https://example.com/register.pdf",
      fileName: "register.pdf",
    });

    expect(mockSetItem).not.toHaveBeenCalled();

    await flushPdfCrashBreadcrumbWrites();

    expect(mockSetItem).toHaveBeenCalledTimes(1);
    mockGetItem.mockResolvedValue(
      String(mockSetItem.mock.calls[0]?.[1] ?? "[]"),
    );

    await expect(getPdfCrashBreadcrumbs()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          marker: "tap_start",
          screen: "warehouse",
        }),
      ]),
    );
  });

  it("logs breadcrumb storage failures without destabilizing the PDF path", async () => {
    mockSetItem.mockRejectedValueOnce(new Error("storage full"));

    await recordPdfCrashBreadcrumbAsync({
      marker: "pdf_open_tap",
      screen: "warehouse",
      documentType: "warehouse_register",
      originModule: "warehouse",
    });

    expect(getPlatformObservabilityEvents()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          screen: "pdf_viewer",
          surface: "pdf_crash_breadcrumbs",
          event: "pdf_breadcrumb_write_failed",
          result: "error",
          errorClass: "error",
          errorMessage: "storage full",
        }),
      ]),
    );
  });

  it("falls back on corrupted persisted breadcrumbs without logging raw JSON", async () => {
    mockGetItem.mockResolvedValueOnce("{broken");

    await expect(getPdfCrashBreadcrumbs()).resolves.toEqual([]);

    const events = getPlatformObservabilityEvents();
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          screen: "pdf_viewer",
          surface: "pdf_crash_breadcrumbs",
          event: "pdf_breadcrumb_read_failed",
          result: "error",
        }),
      ]),
    );
    expect(JSON.stringify(events)).not.toContain("{broken");
  });
});
