import { openAppAttachment } from "./attachmentOpener";
import { createAttachmentSignedUrl } from "./attachmentOpener.storage.transport";
import * as fs from "fs";
import * as path from "path";

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

jest.mock("./attachmentOpener.storage.transport", () => ({
  createAttachmentSignedUrl: jest.fn(async () => ({
    data: { signedUrl: "https://example.com/signed-attachment.pdf" },
    error: null,
  })),
}));

const mockCreateAttachmentSignedUrl = createAttachmentSignedUrl as jest.MockedFunction<
  typeof createAttachmentSignedUrl
>;

const getMockPlatform = () =>
  (jest.requireMock("react-native") as { Platform: { OS: string } }).Platform;

describe("attachmentOpener", () => {
  const originalPlatformOs = getMockPlatform().OS;

  beforeEach(() => {
    Object.defineProperty(getMockPlatform(), "OS", {
      configurable: true,
      value: "android",
    });
    mockOpenUrl.mockReset();
    mockGetInfoAsync.mockReset();
    mockDownloadAsync.mockReset();
    mockCopyAsync.mockReset();
    mockGetContentUriAsync.mockReset();
    mockShareAsync.mockReset();
    mockIsAvailableAsync.mockReset();
    mockStartActivityAsync.mockReset();
    mockCreateAttachmentSignedUrl.mockReset();

    mockCreateAttachmentSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://example.com/signed-attachment.pdf" },
      error: null,
    });
    mockIsAvailableAsync.mockResolvedValue(true);
    mockGetInfoAsync.mockResolvedValue({ exists: true, size: 128 });
    mockDownloadAsync.mockImplementation(async (_url: string, target: string) => ({ uri: target }));
    mockGetContentUriAsync.mockImplementation(async (uri: string) => `content://${encodeURIComponent(uri)}`);
    mockStartActivityAsync.mockResolvedValue({ resultCode: 0 });
  });

  afterAll(() => {
    Object.defineProperty(getMockPlatform(), "OS", {
      configurable: true,
      value: originalPlatformOs,
    });
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

  it("resolves storage attachments through the storage transport boundary", async () => {
    mockGetInfoAsync.mockResolvedValueOnce({ exists: false, size: 0 });

    await openAppAttachment({
      bucketId: "proposal_files",
      storagePath: "proposal-1/invoice.pdf",
      fileName: "invoice.pdf",
      mimeType: "application/pdf",
    });

    expect(mockCreateAttachmentSignedUrl).toHaveBeenCalledWith(
      "proposal_files",
      "proposal-1/invoice.pdf",
      60 * 60,
    );
    expect(mockStartActivityAsync).toHaveBeenCalledWith("android.intent.action.VIEW", {
      data: "https://example.com/signed-attachment.pdf",
      flags: 1,
      type: "application/pdf",
    });
    expect(mockDownloadAsync).not.toHaveBeenCalled();
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

  it("blocks iOS attachment share/open handoff when the local file is empty", async () => {
    Object.defineProperty(getMockPlatform(), "OS", {
      configurable: true,
      value: "ios",
    });
    mockGetInfoAsync.mockResolvedValue({ exists: true, size: 0 });

    await expect(
      openAppAttachment({
        localUri: "file:///cache/attachment.pdf",
        fileName: "attachment.pdf",
        mimeType: "application/pdf",
      }),
    ).rejects.toThrow("Attachment handoff file is empty.");

    expect(mockShareAsync).not.toHaveBeenCalled();
    expect(mockOpenUrl).not.toHaveBeenCalled();
  });

  it("blocks native attachment handoff when a downloaded file is missing", async () => {
    mockGetInfoAsync.mockResolvedValue({ exists: false, size: 0 });

    await expect(
      openAppAttachment({
        url: "https://example.com/image.png",
        fileName: "image.png",
        mimeType: "image/png",
      }),
    ).rejects.toThrow("Attachment handoff file is missing.");

    expect(mockDownloadAsync).toHaveBeenCalled();
    expect(mockGetContentUriAsync).not.toHaveBeenCalled();
    expect(mockStartActivityAsync).not.toHaveBeenCalled();
    expect(mockShareAsync).not.toHaveBeenCalled();
  });
});

describe("attachment opener storage transport source contract", () => {
  const root = path.resolve(__dirname, "../../..");
  const read = (relativePath: string) =>
    fs.readFileSync(path.join(root, relativePath), "utf8");

  it("keeps storage provider ownership in the transport only", () => {
    const serviceSource = read("src/lib/documents/attachmentOpener.ts");
    const transportSource = read("src/lib/documents/attachmentOpener.storage.transport.ts");
    const storageToken = "supabase" + ".storage";

    expect(serviceSource).toContain("createAttachmentSignedUrl(bucketId, storagePath, 60 * 60)");
    expect(serviceSource).not.toContain(storageToken);
    expect(transportSource).toContain(storageToken);
    expect(transportSource).toContain(".createSignedUrl(storagePath, expiresInSeconds)");
    expect(transportSource).not.toContain(".insert(");
    expect(transportSource).not.toContain(".update(");
    expect(transportSource).not.toContain(".rpc(");
  });
});
