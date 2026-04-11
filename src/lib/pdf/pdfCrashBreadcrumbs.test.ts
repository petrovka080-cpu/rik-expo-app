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
      openToken: "open-1",
    });
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
});
