const mockAlert = jest.fn();
const mockOpenUrl = jest.fn();
const mockGetInfoAsync = jest.fn();
const mockDownloadAsync = jest.fn();
const mockCopyAsync = jest.fn();
const mockGetContentUriAsync = jest.fn();
const mockStartActivityAsync = jest.fn();

jest.mock("./supabaseClient", () => ({
  SUPABASE_ANON_KEY: "anon",
}));

jest.mock("react-native", () => ({
  Alert: {
    alert: (...args: unknown[]) => mockAlert(...args),
  },
  Linking: {
    openURL: (...args: unknown[]) => mockOpenUrl(...args),
  },
  Platform: {
    OS: "android",
  },
}));

jest.mock("expo-intent-launcher", () => ({
  startActivityAsync: (...args: unknown[]) => mockStartActivityAsync(...args),
}));

jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

jest.mock("expo-file-system/legacy", () => ({
  getInfoAsync: (...args: unknown[]) => mockGetInfoAsync(...args),
  downloadAsync: (...args: unknown[]) => mockDownloadAsync(...args),
  copyAsync: (...args: unknown[]) => mockCopyAsync(...args),
  getContentUriAsync: (...args: unknown[]) => mockGetContentUriAsync(...args),
}));

jest.mock("./fileSystemPaths", () => ({
  getFileSystemPaths: jest.fn(() => ({
    cacheDir: "file:///cache/",
    documentDir: "file:///documents/",
    legacyDocumentDirectory: "file:///documents/",
  })),
}));

import {
  openPdfExternal,
  openPdfPreview,
  preparePdfExecutionSource,
} from "./pdfRunner";

describe("pdfRunner native open", () => {
  beforeEach(() => {
    mockAlert.mockReset();
    mockOpenUrl.mockReset();
    mockGetInfoAsync.mockReset();
    mockDownloadAsync.mockReset();
    mockCopyAsync.mockReset();
    mockGetContentUriAsync.mockReset();
    mockStartActivityAsync.mockReset();
    mockGetInfoAsync.mockResolvedValue({ exists: true, size: 128 });
    mockGetContentUriAsync.mockImplementation(async (uri: string) => `content://${encodeURIComponent(uri)}`);
    mockDownloadAsync.mockImplementation(async (_url: string, target: string) => ({ uri: target }));
    mockStartActivityAsync.mockResolvedValue({ resultCode: 0 });
  });

  it("opens a local file PDF through Android content uri handoff", async () => {
    await openPdfPreview("file:///cache/document.pdf", "document.pdf");

    expect(mockDownloadAsync).not.toHaveBeenCalled();
    expect(mockGetContentUriAsync).toHaveBeenCalledWith("file:///cache/document.pdf");
    expect(mockStartActivityAsync).toHaveBeenCalledWith("android.intent.action.VIEW", {
      data: "content://file%3A%2F%2F%2Fcache%2Fdocument.pdf",
      flags: 1,
      type: "application/pdf",
    });
  });

  it("opens a remote PDF through the Android remote URL boundary", async () => {
    await openPdfPreview("https://example.com/document.pdf", "document.pdf");

    expect(mockStartActivityAsync).toHaveBeenCalledWith("android.intent.action.VIEW", {
      data: "https://example.com/document.pdf",
      flags: 1,
      type: "application/pdf",
    });
    expect(mockDownloadAsync).not.toHaveBeenCalled();
    expect(mockGetContentUriAsync).not.toHaveBeenCalled();
    expect(mockOpenUrl).not.toHaveBeenCalled();
  });

  it("keeps backend remote PDF URLs intact for mobile preview preparation", async () => {
    const supabase = {
      auth: {
        getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      },
    } as unknown as Parameters<typeof preparePdfExecutionSource>[0]["supabase"];

    const result = await preparePdfExecutionSource({
      supabase,
      getRemoteUrl: () => "https://example.com/document.pdf",
      fileName: "document.pdf",
    });

    expect(result).toEqual({
      kind: "remote-url",
      uri: "https://example.com/document.pdf",
    });
    expect(mockDownloadAsync).not.toHaveBeenCalled();
    expect(mockGetContentUriAsync).not.toHaveBeenCalled();
  });

  it("opens a remote PDF externally through the Android remote URL boundary", async () => {
    await openPdfExternal("https://example.com/document.pdf", "document.pdf");

    expect(mockStartActivityAsync).toHaveBeenCalledWith("android.intent.action.VIEW", {
      data: "https://example.com/document.pdf",
      flags: 1,
      type: "application/pdf",
    });
    expect(mockDownloadAsync).not.toHaveBeenCalled();
    expect(mockGetContentUriAsync).not.toHaveBeenCalled();
    expect(mockOpenUrl).not.toHaveBeenCalled();
  });

  it("opens a local PDF externally through Android content uri handoff", async () => {
    await openPdfExternal("file:///cache/document.pdf", "document.pdf");

    expect(mockGetContentUriAsync).toHaveBeenCalledWith("file:///cache/document.pdf");
    expect(mockStartActivityAsync).toHaveBeenCalledWith("android.intent.action.VIEW", {
      data: "content://file%3A%2F%2F%2Fcache%2Fdocument.pdf",
      flags: 1,
      type: "application/pdf",
    });
  });

  it("fails in a controlled way for blob/data PDF sources on native", async () => {
    await expect(openPdfPreview("blob:https://example.com/document.pdf", "document.pdf")).rejects.toThrow(
      "Native handoff cannot use blob/data PDF URI",
    );

    expect(mockStartActivityAsync).not.toHaveBeenCalled();
  });
});
