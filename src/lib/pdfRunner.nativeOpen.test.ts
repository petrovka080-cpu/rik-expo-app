const mockAlert = jest.fn();
const mockOpenUrl = jest.fn();
const mockGetInfoAsync = jest.fn();
const mockDownloadAsync = jest.fn();
const mockCopyAsync = jest.fn();
const mockGetContentUriAsync = jest.fn();

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

import { openPdfPreview } from "./pdfRunner";

describe("pdfRunner native open", () => {
  beforeEach(() => {
    mockAlert.mockReset();
    mockOpenUrl.mockReset();
    mockGetInfoAsync.mockReset();
    mockDownloadAsync.mockReset();
    mockCopyAsync.mockReset();
    mockGetContentUriAsync.mockReset();
    mockGetInfoAsync.mockResolvedValue({ exists: true, size: 128 });
    mockGetContentUriAsync.mockImplementation(async (uri: string) => `content://${encodeURIComponent(uri)}`);
    mockDownloadAsync.mockImplementation(async (_url: string, target: string) => ({ uri: target }));
  });

  it("opens a local file PDF through Android content uri handoff", async () => {
    await openPdfPreview("file:///cache/document.pdf", "document.pdf");

    expect(mockDownloadAsync).not.toHaveBeenCalled();
    expect(mockGetContentUriAsync).toHaveBeenCalledWith("file:///cache/document.pdf");
    expect(mockOpenUrl).toHaveBeenCalledWith("content://file%3A%2F%2F%2Fcache%2Fdocument.pdf");
  });

  it("downloads a remote PDF then opens it through Android content uri handoff", async () => {
    await openPdfPreview("https://example.com/document.pdf", "document.pdf");

    expect(mockDownloadAsync).toHaveBeenCalled();
    expect(mockGetContentUriAsync).toHaveBeenCalled();
    expect(mockOpenUrl).toHaveBeenCalled();
  });

  it("fails in a controlled way for blob/data PDF sources on native", async () => {
    await expect(openPdfPreview("blob:https://example.com/document.pdf", "document.pdf")).rejects.toThrow(
      "Native handoff cannot use blob/data PDF URI",
    );

    expect(mockOpenUrl).not.toHaveBeenCalled();
  });
});
