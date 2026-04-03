const mockGetInfoAsync = jest.fn();
const mockReadAsStringAsync = jest.fn();
const mockFetch = jest.fn();

import {
  assertValidLocalPdfFile,
  assertValidRemotePdfResponse,
} from "./pdfSourceValidation";

describe("pdfSourceValidation", () => {
  beforeEach(() => {
    mockGetInfoAsync.mockReset();
    mockReadAsStringAsync.mockReset();
    mockFetch.mockReset();
  });

  it("accepts a non-empty local PDF file with %PDF magic bytes", async () => {
    mockGetInfoAsync.mockResolvedValue({ exists: true, size: 128 });
    mockReadAsStringAsync.mockResolvedValue("JVBERi0xLjc=");

    await expect(
      assertValidLocalPdfFile({
        fileSystem: {
          getInfoAsync: mockGetInfoAsync,
          readAsStringAsync: mockReadAsStringAsync,
        },
        uri: "file:///cache/document.pdf",
      }),
    ).resolves.toMatchObject({
      sizeBytes: 128,
    });
  });

  it("rejects an HTML file masquerading as PDF", async () => {
    mockGetInfoAsync.mockResolvedValue({ exists: true, size: 128 });
    mockReadAsStringAsync.mockResolvedValue("PCFET0NUWVBFIEhUTUw+");

    await expect(
      assertValidLocalPdfFile({
        fileSystem: {
          getInfoAsync: mockGetInfoAsync,
          readAsStringAsync: mockReadAsStringAsync,
        },
        uri: "file:///cache/document.pdf",
        failureLabel: "Native handoff PDF",
      }),
    ).rejects.toThrow("Native handoff PDF contains HTML instead of PDF.");
  });

  it("supports size-only local validation without reading file headers", async () => {
    mockGetInfoAsync.mockResolvedValue({ exists: true, size: 128 });

    await expect(
      assertValidLocalPdfFile({
        fileSystem: {
          getInfoAsync: mockGetInfoAsync,
          readAsStringAsync: mockReadAsStringAsync,
        },
        uri: "file:///cache/document.pdf",
        mode: "size-only",
      }),
    ).resolves.toMatchObject({
      sizeBytes: 128,
      headerAscii: "",
    });
    expect(mockReadAsStringAsync).not.toHaveBeenCalled();
  });

  it("accepts a remote response with PDF content-type from HEAD", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: {
        get: (name: string) =>
          name.toLowerCase() === "content-type" ? "application/pdf" : null,
      },
    });

    await expect(
      assertValidRemotePdfResponse({
        uri: "https://example.com/document.pdf",
        fetchImpl: mockFetch,
      }),
    ).resolves.toMatchObject({
      contentType: "application/pdf",
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("rejects a remote HTML response when HEAD is ambiguous", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: () => "application/octet-stream",
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: () => "text/html; charset=utf-8",
        },
        arrayBuffer: async () => new Uint8Array([60, 104, 116, 109, 108]).buffer,
      });

    await expect(
      assertValidRemotePdfResponse({
        uri: "https://example.com/document.pdf",
        fetchImpl: mockFetch,
        failureLabel: "PDF preview response",
      }),
    ).rejects.toThrow("PDF preview response returned HTML instead of PDF.");
  });
});
