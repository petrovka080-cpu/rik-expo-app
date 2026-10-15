const mockFiles = new Map<string, Buffer>();
const mockDownload = jest.fn();
const mockMove = jest.fn();
const mockCopy = jest.fn();
const mockDelete = jest.fn();
jest.mock("react-native", () => ({ Platform: { OS: "android" } }));
jest.mock("expo-file-system/legacy", () => ({
  getInfoAsync: jest.fn(async (uri: string) => mockFiles.has(uri)
    ? { exists: true, size: mockFiles.get(uri)!.length }
    : { exists: false }),
  readAsStringAsync: jest.fn(async (uri: string, options: { position: number; length: number }) => {
    const bytes = mockFiles.get(uri);
    if (!bytes) throw new Error("MISSING_TEST_FILE");
    return bytes.subarray(options.position, options.position + options.length).toString("base64");
  }),
  downloadAsync: (...args: unknown[]) => mockDownload(...args),
  moveAsync: (...args: unknown[]) => mockMove(...args),
  copyAsync: (...args: unknown[]) => mockCopy(...args),
  deleteAsync: (...args: unknown[]) => mockDelete(...args),
}));
jest.mock("../fileSystemPaths", () => ({
  getFileSystemPaths: () => ({ cacheDir: "file:///cache/" }),
}));
jest.mock("../observability/platformObservability", () => ({ recordPlatformObservability: jest.fn() }));

import { createPdfDocumentDescriptor } from "../documents/pdfDocument";
import {
  buildPdfInstantCacheKey, clearPdfInstantCacheStateForTests,
  ensurePdfInstantCacheAsset, getPdfInstantCacheStatus, getPdfInstantCacheTarget,
} from "./pdfInstantCache";

const pdf = Buffer.from("%PDF-1.7\nA complete immutable estimate test artifact\n%%EOF\n");
function descriptor(signature = "new-signature") {
  return createPdfDocumentDescriptor({
    uri: `https://example.test/artifact-files/immutable.pdf?signature=${signature}`,
    title: "Saved estimate", fileName: "saved.pdf", documentType: "request",
    source: "generated", originModule: "reports", entityId: "request-owned",
    contentIdentity: { revisionId: "immutable-revision", rendererVersion: "unchanged" },
    expectedByteSize: pdf.length,
  });
}
const target = () => getPdfInstantCacheTarget(descriptor()).targetUri;

beforeEach(() => {
  mockFiles.clear(); clearPdfInstantCacheStateForTests();
  mockDownload.mockReset(); mockMove.mockReset(); mockCopy.mockReset(); mockDelete.mockReset();
  mockDownload.mockImplementation(async (_uri: string, uri: string) => {
    mockFiles.set(uri, Buffer.from(pdf)); return { status: 200, uri };
  });
  mockMove.mockImplementation(async ({ from, to }: { from: string; to: string }) => {
    mockFiles.set(to, mockFiles.get(from)!); mockFiles.delete(from);
  });
  mockCopy.mockImplementation(async ({ from, to }: { from: string; to: string }) => {
    mockFiles.set(to, Buffer.from(mockFiles.get(from)!));
  });
  mockDelete.mockImplementation(async (uri: string) => { mockFiles.delete(uri); });
});

it.each([
  ["empty", Buffer.alloc(0)],
  ["interrupted positive PDF prefix", pdf.subarray(0, 15)],
  ["same-length HTML", Buffer.from("<html>".padEnd(pdf.length, "x"))],
])("repairs a %s disk cache after session memory is lost, using the same artifact", async (_label, invalid) => {
  const path = target(); mockFiles.set(path, invalid);
  clearPdfInstantCacheStateForTests();
  expect(await getPdfInstantCacheStatus(descriptor())).toMatchObject({ status: "stale", targetUri: path });
  expect(buildPdfInstantCacheKey(descriptor("old-signature"))).toBe(buildPdfInstantCacheKey(descriptor()));
  const result = await ensurePdfInstantCacheAsset(descriptor());
  expect(result).toMatchObject({ status: "ready", localUri: path, sizeBytes: pdf.length });
  expect(mockDownload).toHaveBeenCalledTimes(1);
  expect(mockDownload.mock.calls[0][0]).toBe(descriptor().uri);
  expect(mockMove).toHaveBeenCalledTimes(1); expect(mockCopy).not.toHaveBeenCalled();
  expect(mockFiles.get(path)).toEqual(pdf);
  expect([...mockFiles.keys()]).toEqual([path]);
});

it("retains a valid disk cache without download, replacement or identity change", async () => {
  const original = Buffer.from(pdf); mockFiles.set(target(), original);
  expect(await getPdfInstantCacheStatus(descriptor())).toMatchObject({ status: "ready", sizeBytes: pdf.length });
  expect(await ensurePdfInstantCacheAsset(descriptor())).toMatchObject({ status: "ready" });
  expect(mockFiles.get(target())).toBe(original);
  expect(mockDownload).not.toHaveBeenCalled(); expect(mockMove).not.toHaveBeenCalled();
  expect(mockDelete).not.toHaveBeenCalled();
});

it.each([0, 403, 503, undefined])("rejects download status %s before publishing its body", async status => {
  mockDownload.mockImplementation(async (_source: string, uri: string) => {
    mockFiles.set(uri, pdf); return { status, uri };
  });
  await expect(ensurePdfInstantCacheAsset(descriptor())).rejects.toThrow("PDF cache download failed");
  expect(mockMove).not.toHaveBeenCalled(); expect(mockFiles.size).toBe(0);
  expect(await getPdfInstantCacheStatus(descriptor())).toMatchObject({ status: "missing" });
});

it.each([Buffer.alloc(0), pdf.subarray(0, 15)])("rejects incomplete temporary bytes before final publication", async body => {
  mockDownload.mockImplementation(async (_source: string, uri: string) => {
    mockFiles.set(uri, body); return { status: 200, uri };
  });
  await expect(ensurePdfInstantCacheAsset(descriptor())).rejects.toThrow(/empty|size does not match/);
  expect(mockMove).not.toHaveBeenCalled(); expect(mockFiles.size).toBe(0);
});

it("fails a broken rename and recovers on the next open without publishing a copied final", async () => {
  mockFiles.set(target(), Buffer.alloc(0));
  mockMove.mockRejectedValueOnce(new Error("RENAME_INTERRUPTED"));
  await expect(ensurePdfInstantCacheAsset(descriptor())).rejects.toThrow("RENAME_INTERRUPTED");
  expect(mockCopy).not.toHaveBeenCalled(); expect(mockFiles.size).toBe(0);
  expect(await ensurePdfInstantCacheAsset(descriptor())).toMatchObject({ status: "ready", sizeBytes: pdf.length });
  expect(mockFiles.get(target())).toEqual(pdf);
});

it("never returns a ready asset if the published final file is invalid", async () => {
  mockMove.mockImplementation(async ({ from, to }: { from: string; to: string }) => {
    mockFiles.set(to, Buffer.alloc(0)); mockFiles.delete(from);
  });
  await expect(ensurePdfInstantCacheAsset(descriptor())).rejects.toThrow("PDF cache file is empty");
  expect(await getPdfInstantCacheStatus(descriptor())).toMatchObject({ status: "stale" });
});

it("removes only the interrupted temporary file and retries the same source", async () => {
  const unrelated = "file:///documents/historical.pdf"; mockFiles.set(unrelated, pdf);
  mockDownload.mockImplementationOnce(async (_source: string, uri: string) => {
    mockFiles.set(uri, pdf.subarray(0, 15)); throw new Error("PROCESS_INTERRUPTED");
  });
  await expect(ensurePdfInstantCacheAsset(descriptor())).rejects.toThrow("PROCESS_INTERRUPTED");
  expect([...mockFiles.keys()]).toEqual([unrelated]);
  expect(await ensurePdfInstantCacheAsset(descriptor())).toMatchObject({ status: "ready" });
  expect(mockFiles.get(unrelated)).toBe(pdf);
});

it("does not delete an invalid original local document", async () => {
  for (const uri of ["file:///documents/broken.pdf", target()]) {
    mockFiles.set(uri, Buffer.alloc(0));
    const local = { ...descriptor(), uri, fileSource: { kind: "local-file" as const, uri } };
    await expect(ensurePdfInstantCacheAsset(local)).rejects.toThrow("PDF cache file is empty");
    expect(mockFiles.has(uri)).toBe(true);
  }
  expect(mockDownload).not.toHaveBeenCalled(); expect(mockMove).not.toHaveBeenCalled();
});

it("preserves a valid final that became available while a download was pending", async () => {
  const original = Buffer.from(pdf);
  mockDownload.mockImplementation(async (_source: string, uri: string) => {
    mockFiles.set(uri, pdf); mockFiles.set(target(), original); return { status: 200, uri };
  });
  await expect(ensurePdfInstantCacheAsset(descriptor())).resolves.toMatchObject({ status: "ready" });
  expect(mockFiles.get(target())).toBe(original); expect(mockMove).not.toHaveBeenCalled();
  expect(mockDelete.mock.calls.every(([uri]) => uri !== target())).toBe(true);
});

it("joins concurrent requests without accepting an in-flight file as ready", async () => {
  let release!: () => void;
  mockDownload.mockImplementation((_source: string, uri: string) => new Promise(resolve => {
    release = () => { mockFiles.set(uri, pdf); resolve({ status: 200, uri }); };
  }));
  const first = ensurePdfInstantCacheAsset(descriptor());
  const second = ensurePdfInstantCacheAsset(descriptor());
  await new Promise(resolve => setImmediate(resolve));
  expect(await getPdfInstantCacheStatus(descriptor())).toMatchObject({ status: "fetching" });
  release();
  const [a, b] = await Promise.all([first, second]);
  expect(a).toEqual(b); expect(mockDownload).toHaveBeenCalledTimes(1); expect(mockMove).toHaveBeenCalledTimes(1);
});

it("validates each joined caller's expected size without a second download or deleting the first caller's valid file", async () => {
  let release!: () => void;
  const prefix = pdf.subarray(0, 15);
  mockDownload.mockImplementation((_source: string, uri: string) => new Promise(resolve => {
    release = () => { mockFiles.set(uri, prefix); resolve({ status: 200, uri }); };
  }));
  const first = ensurePdfInstantCacheAsset({ ...descriptor(), expectedByteSize: undefined });
  const joined = ensurePdfInstantCacheAsset(descriptor());
  const refused = expect(joined).rejects.toThrow("size does not match the artifact");
  await new Promise(resolve => setImmediate(resolve)); release();
  await expect(first).resolves.toMatchObject({ status: "ready", sizeBytes: 15 });
  await refused;
  expect(mockDownload).toHaveBeenCalledTimes(1); expect(mockMove).toHaveBeenCalledTimes(1);
  expect(mockFiles.get(target())).toBe(prefix);
  expect(mockDelete.mock.calls.every(([uri]) => uri !== target())).toBe(true);
});

it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])("rejects invalid trusted size %s", expectedByteSize => {
  expect(() => createPdfDocumentDescriptor({ ...descriptor(), expectedByteSize })).toThrow("positive integer");
});
