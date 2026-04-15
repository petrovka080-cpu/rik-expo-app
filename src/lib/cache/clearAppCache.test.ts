import { clearAppCache } from "./clearAppCache";

const mockReadDirectoryAsync = jest.fn();
const mockGetInfoAsync = jest.fn();
const mockDeleteAsync = jest.fn();

jest.mock("react-native", () => ({
  Platform: {
    OS: "android",
  },
}));

jest.mock("expo-file-system/legacy", () => ({
  readDirectoryAsync: (...args: unknown[]) => mockReadDirectoryAsync(...args),
  getInfoAsync: (...args: unknown[]) => mockGetInfoAsync(...args),
  deleteAsync: (...args: unknown[]) => mockDeleteAsync(...args),
}));

jest.mock("../fileSystemPaths", () => ({
  getFileSystemPaths: jest.fn(() => ({
    cacheDir: "file:///cache/",
    documentDir: "file:///documents/",
  })),
}));

describe("clearAppCache", () => {
  const nowMs = Date.UTC(2026, 3, 13, 12, 0, 0);

  beforeEach(() => {
    jest.spyOn(Date, "now").mockReturnValue(nowMs);
    mockReadDirectoryAsync.mockReset();
    mockGetInfoAsync.mockReset();
    mockDeleteAsync.mockReset();
    mockReadDirectoryAsync.mockResolvedValue(["old.pdf", "fresh.pdf"]);
    mockDeleteAsync.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("keeps startup cleanup TTL-based by default", async () => {
    mockGetInfoAsync
      .mockResolvedValueOnce({
        exists: true,
        modificationTime: (nowMs - 4 * 24 * 60 * 60 * 1000) / 1000,
      })
      .mockResolvedValueOnce({
        exists: true,
        modificationTime: (nowMs - 60 * 1000) / 1000,
      });

    await clearAppCache();

    expect(mockDeleteAsync).toHaveBeenCalledTimes(1);
    expect(mockDeleteAsync).toHaveBeenCalledWith("file:///cache/old.pdf", {
      idempotent: true,
    });
  });

  it("force purges all cache entries on session boundary", async () => {
    mockGetInfoAsync.mockResolvedValue({
      exists: true,
      modificationTime: nowMs / 1000,
    });

    await clearAppCache({ mode: "session", owner: "root_layout:terminal_sign_out" });

    expect(mockDeleteAsync).toHaveBeenCalledTimes(2);
    expect(mockDeleteAsync).toHaveBeenCalledWith("file:///cache/old.pdf", {
      idempotent: true,
    });
    expect(mockDeleteAsync).toHaveBeenCalledWith("file:///cache/fresh.pdf", {
      idempotent: true,
    });
  });
});
