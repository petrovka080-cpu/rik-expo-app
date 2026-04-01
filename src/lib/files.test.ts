const mockOpenAppAttachment = jest.fn();
const mockFetchWithRequestTimeout = jest.fn();
const mockStorageUpload = jest.fn();
const mockStorageGetPublicUrl = jest.fn();
const mockMetadataInsert = jest.fn();

let mockMetadataQueryData: unknown[] = [];
let mockMetadataQueryError: unknown = null;

jest.mock("./documents/attachmentOpener", () => ({
  openAppAttachment: (...args: unknown[]) => mockOpenAppAttachment(...args),
}));

jest.mock("./requestTimeoutPolicy", () => ({
  fetchWithRequestTimeout: (...args: unknown[]) => mockFetchWithRequestTimeout(...args),
}));

jest.mock("./catalog_api", () => ({
  uploadProposalAttachment: jest.fn(),
}));

jest.mock("./api/proposalAttachments.service", () => ({
  ensureProposalAttachmentUrl: jest.fn(),
  getLatestCanonicalProposalAttachment: jest.fn(),
  listCanonicalProposalAttachments: jest.fn(),
  toProposalAttachmentLegacyRow: jest.fn(),
}));

jest.mock("./supabaseClient", () => {
  const createSupplierFilesBuilder = () => {
    const builder: any = {
      insert: (...args: unknown[]) => mockMetadataInsert(...args),
      select: jest.fn(() => builder),
      eq: jest.fn(() => builder),
      order: jest.fn(() => builder),
      limit: jest.fn(() => builder),
      then: (resolve: (value: unknown) => unknown, reject?: (error: unknown) => unknown) =>
        Promise.resolve({
          data: mockMetadataQueryData,
          error: mockMetadataQueryError,
        }).then(resolve, reject),
    };
    return builder;
  };

  return {
    supabase: {
      storage: {
        from: jest.fn(() => ({
          upload: (...args: unknown[]) => mockStorageUpload(...args),
          getPublicUrl: (...args: unknown[]) => mockStorageGetPublicUrl(...args),
        })),
      },
      from: jest.fn(() => createSupplierFilesBuilder()),
    },
  };
});

import { Platform } from "react-native";
import {
  getPlatformObservabilityEvents,
  resetPlatformObservabilityEvents,
} from "./observability/platformObservability";
import {
  listSupplierFilesMeta,
  openSignedUrlUniversal,
  uploadSupplierFile,
} from "./files";

const runtime = globalThis as typeof globalThis & { __DEV__?: boolean };

describe("files boundary observability", () => {
  const originalPlatformOs = Platform.OS;
  const originalWindow = (globalThis as typeof globalThis & { window?: unknown }).window;
  const originalDocument = (globalThis as typeof globalThis & { document?: unknown }).document;

  beforeEach(() => {
    runtime.__DEV__ = false;
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: "android",
    });
    mockMetadataQueryData = [];
    mockMetadataQueryError = null;
    mockOpenAppAttachment.mockReset();
    mockFetchWithRequestTimeout.mockReset();
    mockStorageUpload.mockReset();
    mockStorageGetPublicUrl.mockReset();
    mockMetadataInsert.mockReset();
    resetPlatformObservabilityEvents();
  });

  afterAll(() => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: originalPlatformOs,
    });
    (globalThis as typeof globalThis & { window?: unknown }).window = originalWindow;
    (globalThis as typeof globalThis & { document?: unknown }).document = originalDocument;
  });

  it("keeps the primary native file open path unchanged", async () => {
    await openSignedUrlUniversal("https://example.com/files/native-success.pdf", "native-success.pdf");

    expect(mockOpenAppAttachment).toHaveBeenCalledWith({
      url: "https://example.com/files/native-success.pdf",
      fileName: "native-success.pdf",
    });
    expect(getPlatformObservabilityEvents()).toEqual([]);
  });

  it("reports web fetch fallback failure and still completes the non-fatal direct-link fallback", async () => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: "web",
    });
    const click = jest.fn();
    const appendChild = jest.fn();
    const removeChild = jest.fn();
    const createElement = jest.fn(() => ({
      click,
      set href(_value: string) {},
      set target(_value: string) {},
      set rel(_value: string) {},
      set download(_value: string) {},
    }));
    (globalThis as typeof globalThis & { window?: unknown }).window = {
      open: jest.fn(() => null),
    } as any;
    (globalThis as typeof globalThis & { document?: unknown }).document = {
      createElement,
      body: {
        appendChild,
        removeChild,
      },
    } as any;
    mockFetchWithRequestTimeout.mockRejectedValueOnce(new Error("fetch fallback blocked"));

    await expect(
      openSignedUrlUniversal("https://example.com/files/web-fallback.pdf", "web-fallback.pdf"),
    ).resolves.toBeUndefined();

    expect(mockFetchWithRequestTimeout).toHaveBeenCalled();
    expect(click).toHaveBeenCalledTimes(1);
    expect(
      getPlatformObservabilityEvents(),
    ).toContainEqual(
      expect.objectContaining({
        screen: "request",
        surface: "files_boundary",
        event: "web_open_fetch_fallback_failed",
        result: "error",
        fallbackUsed: true,
        extra: expect.objectContaining({
          scope: "files.open.webFetchFallback",
        }),
      }),
    );
  });

  it("keeps supplier metadata insert as a non-fatal side-effect on upload success", async () => {
    mockStorageUpload.mockResolvedValueOnce({ error: null });
    mockStorageGetPublicUrl.mockReturnValueOnce({
      data: {
        publicUrl: "https://cdn.example.com/supplier/test.pdf",
      },
    });
    mockMetadataInsert.mockResolvedValueOnce({ error: null });

    const result = await uploadSupplierFile("supplier-1", { uri: "file:///tmp/test.pdf" }, "test.pdf", "file");

    expect(result.url).toBe("https://cdn.example.com/supplier/test.pdf");
    expect(result.path).toContain("supplier-1/");
    expect(mockMetadataInsert).toHaveBeenCalled();
    expect(getPlatformObservabilityEvents()).toEqual([]);
  });

  it("reports supplier metadata insert failure but keeps upload success non-fatal", async () => {
    mockStorageUpload.mockResolvedValueOnce({ error: null });
    mockStorageGetPublicUrl.mockReturnValueOnce({
      data: {
        publicUrl: "https://cdn.example.com/supplier/test-metadata.pdf",
      },
    });
    mockMetadataInsert.mockRejectedValueOnce(new Error("insert exploded"));

    const result = await uploadSupplierFile(
      "supplier-2",
      { uri: "file:///tmp/test-metadata.pdf" },
      "test-metadata.pdf",
      "price",
    );

    expect(result.url).toBe("https://cdn.example.com/supplier/test-metadata.pdf");
    expect(result.path).toContain("supplier-2/");
    expect(
      getPlatformObservabilityEvents(),
    ).toContainEqual(
      expect.objectContaining({
        screen: "request",
        surface: "files_boundary",
        event: "supplier_metadata_insert_failed",
        result: "error",
        fallbackUsed: true,
        extra: expect.objectContaining({
          scope: "files.metadata.insert",
          supplierId: "supplier-2",
          group: "price",
        }),
      }),
    );
  });

  it("keeps supplier metadata list failure non-fatal and observable", async () => {
    mockMetadataQueryError = new Error("list exploded");

    await expect(
      listSupplierFilesMeta("supplier-3", { group: "photo", limit: 5 }),
    ).resolves.toEqual([]);

    expect(
      getPlatformObservabilityEvents(),
    ).toContainEqual(
      expect.objectContaining({
        screen: "request",
        surface: "files_boundary",
        event: "supplier_metadata_list_failed",
        result: "error",
        fallbackUsed: true,
        extra: expect.objectContaining({
          scope: "files.metadata.list",
          supplierId: "supplier-3",
          group: "photo",
          limit: 5,
        }),
      }),
    );
  });
});
