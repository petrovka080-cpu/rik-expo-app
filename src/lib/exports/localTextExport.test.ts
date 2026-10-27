import * as FileSystemCompat from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import {
  getPlatformObservabilityEvents,
  resetPlatformObservabilityEvents,
} from "../observability/platformObservability";
import {
  sanitizeLocalTextExportFileName,
  shareLocalTextExport,
} from "./localTextExport";

jest.mock("expo-file-system/legacy", () => ({
  writeAsStringAsync: jest.fn(),
  getInfoAsync: jest.fn(),
}));

jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

jest.mock("../fileSystemPaths", () => ({
  getFileSystemPaths: jest.fn(() => ({
    cacheDir: "file:///cache/",
    documentDir: "file:///documents/",
  })),
}));

const mockWriteAsStringAsync = FileSystemCompat.writeAsStringAsync as jest.Mock;
const mockGetInfoAsync = FileSystemCompat.getInfoAsync as jest.Mock;
const mockIsAvailableAsync = Sharing.isAvailableAsync as jest.Mock;
const mockShareAsync = Sharing.shareAsync as jest.Mock;

describe("localTextExport", () => {
  beforeEach(() => {
    mockWriteAsStringAsync.mockReset();
    mockGetInfoAsync.mockReset();
    mockIsAvailableAsync.mockReset();
    mockShareAsync.mockReset();
    resetPlatformObservabilityEvents();

    mockIsAvailableAsync.mockResolvedValue(true);
    mockGetInfoAsync.mockResolvedValue({ exists: true, size: 16 });
    mockWriteAsStringAsync.mockResolvedValue(undefined);
    mockShareAsync.mockResolvedValue(undefined);
  });

  it("writes, verifies, and shares a local text export through one typed boundary", async () => {
    const result = await shareLocalTextExport({
      fileName: "reports.csv",
      content: "a;b\n1;2",
      mimeType: "text/csv",
      surface: "reports_csv_export",
      dialogTitle: "Export CSV",
    });

    expect(result).toEqual({
      ok: true,
      data: {
        uri: "file:///cache/reports.csv",
        fileName: "reports.csv",
        mimeType: "text/csv",
        byteLength: 7,
      },
    });
    expect(mockIsAvailableAsync).toHaveBeenCalledTimes(1);
    expect(mockWriteAsStringAsync).toHaveBeenCalledWith(
      "file:///cache/reports.csv",
      "a;b\n1;2",
      { encoding: "utf8" },
    );
    expect(mockGetInfoAsync).toHaveBeenCalledWith("file:///cache/reports.csv");
    expect(mockShareAsync).toHaveBeenCalledWith("file:///cache/reports.csv", {
      mimeType: "text/csv",
      dialogTitle: "Export CSV",
    });
    expect(getPlatformObservabilityEvents()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          screen: "reports",
          surface: "reports_csv_export",
          event: "local_text_export_share",
          result: "success",
          sourceKind: "local-file:text",
        }),
      ]),
    );
  });

  it("fails before writing when native sharing is unavailable", async () => {
    mockIsAvailableAsync.mockResolvedValue(false);

    const result = await shareLocalTextExport({
      fileName: "reports.csv",
      content: "a;b",
      mimeType: "text/csv",
    });

    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.error.code).toBe("sharing_unavailable");
      expect(result.error.context).toBe("local_text_export.share_availability");
    }
    expect(mockWriteAsStringAsync).not.toHaveBeenCalled();
    expect(mockShareAsync).not.toHaveBeenCalled();
    expect(getPlatformObservabilityEvents()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: "local_text_export_share",
          result: "error",
          errorStage: "share_availability",
        }),
      ]),
    );
  });

  it("fails in a controlled way when the written file cannot be verified", async () => {
    mockGetInfoAsync.mockResolvedValue({ exists: false, size: 0 });

    const result = await shareLocalTextExport({
      fileName: "reports.csv",
      content: "a;b",
      mimeType: "text/csv",
    });

    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.error.code).toBe("export_file_missing");
      expect(result.error.context).toBe("local_text_export.verify_written_file");
    }
    expect(mockWriteAsStringAsync).toHaveBeenCalledTimes(1);
    expect(mockShareAsync).not.toHaveBeenCalled();
  });

  it("sanitizes path-like file names before writing into cache", async () => {
    expect(sanitizeLocalTextExportFileName("../unsafe/reports.csv")).toBe("_unsafe_reports.csv");

    const result = await shareLocalTextExport({
      fileName: "../unsafe/reports.csv",
      content: "a;b",
      mimeType: "text/csv",
    });

    expect(result.ok).toBe(true);
    expect(mockWriteAsStringAsync).toHaveBeenCalledWith(
      "file:///cache/_unsafe_reports.csv",
      "a;b",
      { encoding: "utf8" },
    );
    expect(mockShareAsync).toHaveBeenCalledWith("file:///cache/_unsafe_reports.csv", {
      mimeType: "text/csv",
      dialogTitle: undefined,
    });
  });
});
