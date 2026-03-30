const mockOpenUrl = jest.fn();
const mockGetInfoAsync = jest.fn();
const mockDownloadAsync = jest.fn();
const mockCopyAsync = jest.fn();
const mockGetContentUriAsync = jest.fn();
const mockShareAsync = jest.fn();
const mockIsAvailableAsync = jest.fn();
const mockStartActivityAsync = jest.fn();

jest.mock("react-native", () => ({
  Linking: {
    openURL: (...args: unknown[]) => mockOpenUrl(...args),
  },
  Platform: {
    OS: "android",
  },
}));

jest.mock("expo-file-system/legacy", () => ({
  getInfoAsync: (...args: unknown[]) => mockGetInfoAsync(...args),
  downloadAsync: (...args: unknown[]) => mockDownloadAsync(...args),
  copyAsync: (...args: unknown[]) => mockCopyAsync(...args),
  getContentUriAsync: (...args: unknown[]) => mockGetContentUriAsync(...args),
}));

jest.mock("expo-sharing", () => ({
  isAvailableAsync: (...args: unknown[]) => mockIsAvailableAsync(...args),
  shareAsync: (...args: unknown[]) => mockShareAsync(...args),
}));

jest.mock("expo-intent-launcher", () => ({
  startActivityAsync: (...args: unknown[]) => mockStartActivityAsync(...args),
}));

jest.mock("../fileSystemPaths", () => ({
  getFileSystemPaths: jest.fn(() => ({
    cacheDir: "file:///cache/",
    documentDir: "file:///documents/",
    legacyDocumentDirectory: "file:///documents/",
  })),
}));

jest.mock("../supabaseClient", () => ({
  supabase: {
    storage: {
      from: jest.fn(() => ({
        createSignedUrl: jest.fn(async () => ({
          data: { signedUrl: "https://example.com/signed-attachment.pdf" },
          error: null,
        })),
      })),
    },
  },
}));

import { openAppAttachment } from "./attachmentOpener";

describe("attachmentOpener", () => {
  beforeEach(() => {
    mockOpenUrl.mockReset();
    mockGetInfoAsync.mockReset();
    mockDownloadAsync.mockReset();
    mockCopyAsync.mockReset();
    mockGetContentUriAsync.mockReset();
    mockShareAsync.mockReset();
    mockIsAvailableAsync.mockReset();
    mockStartActivityAsync.mockReset();

    mockIsAvailableAsync.mockResolvedValue(true);
    mockGetInfoAsync.mockResolvedValue({ exists: true, size: 128 });
    mockDownloadAsync.mockImplementation(async (_url: string, target: string) => ({ uri: target }));
    mockGetContentUriAsync.mockImplementation(async (uri: string) => `content://${encodeURIComponent(uri)}`);
    mockStartActivityAsync.mockResolvedValue({ resultCode: 0 });
  });

  it("opens a local attachment PDF through Android content uri handoff", async () => {
    await openAppAttachment({
      localUri: "file:///cache/attachment.pdf",
      fileName: "attachment.pdf",
      mimeType: "application/pdf",
    });

    expect(mockDownloadAsync).not.toHaveBeenCalled();
    expect(mockGetContentUriAsync).toHaveBeenCalledWith("file:///cache/attachment.pdf");
    expect(mockStartActivityAsync).toHaveBeenCalledWith("android.intent.action.VIEW", {
      data: "content://file%3A%2F%2F%2Fcache%2Fattachment.pdf",
      flags: 1,
      type: "application/pdf",
    });
    expect(mockOpenUrl).not.toHaveBeenCalled();
  });

  it("opens a remote attachment PDF through the Android remote URL boundary", async () => {
    mockGetInfoAsync.mockResolvedValueOnce({ exists: false, size: 0 });

    await openAppAttachment({
      url: "https://example.com/attachment.pdf",
      fileName: "attachment.pdf",
      mimeType: "application/pdf",
    });

    expect(mockStartActivityAsync).toHaveBeenCalledWith("android.intent.action.VIEW", {
      data: "https://example.com/attachment.pdf",
      flags: 1,
      type: "application/pdf",
    });
    expect(mockDownloadAsync).not.toHaveBeenCalled();
    expect(mockGetContentUriAsync).not.toHaveBeenCalled();
    expect(mockOpenUrl).not.toHaveBeenCalled();
  });

  it("fails in a controlled way for blob/data attachment sources on native", async () => {
    await expect(
      openAppAttachment({
        url: "blob:https://example.com/attachment.pdf",
        fileName: "attachment.pdf",
        mimeType: "application/pdf",
      }),
    ).rejects.toThrow("Attachment handoff cannot use blob/data URI on mobile");

    expect(mockStartActivityAsync).not.toHaveBeenCalled();
    expect(mockOpenUrl).not.toHaveBeenCalled();
  });
});
