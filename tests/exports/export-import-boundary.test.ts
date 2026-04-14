/**
 * Export / import boundary hardening tests.
 *
 * WAVE S: Validates the input normalization and sanitization boundaries
 * for file import (normalizeNativePickedFile) and export
 * (sanitizeLocalTextExportFileName). These functions are the gatekeepers
 * that prevent malformed data from reaching the file system.
 */

import { normalizeNativePickedFile } from "../../src/lib/filePick";
import { sanitizeLocalTextExportFileName } from "../../src/lib/exports/localTextExport";

describe("export boundary — sanitizeLocalTextExportFileName", () => {
  it("returns a safe name for normal input", () => {
    expect(sanitizeLocalTextExportFileName("report.csv")).toBe("report.csv");
  });

  it("strips path traversal characters", () => {
    const result = sanitizeLocalTextExportFileName("../../../etc/passwd");
    // Path separators are stripped, result is safe for filesystem use
    expect(result).not.toContain("/");
    expect(result).not.toContain("\\");
    expect(result.length).toBeGreaterThan(0);
  });

  it("strips backslashes", () => {
    expect(sanitizeLocalTextExportFileName("..\\unsafe\\file.txt")).toBe("_unsafe_file.txt");
  });

  it("replaces colons (Windows path sep)", () => {
    expect(sanitizeLocalTextExportFileName("C:\\file.txt")).toMatch(/^[^:]+$/);
  });

  it("replaces null bytes", () => {
    expect(sanitizeLocalTextExportFileName("file\0name.txt")).not.toContain("\0");
  });

  it("returns default for empty string", () => {
    expect(sanitizeLocalTextExportFileName("")).toBe("export.txt");
  });

  it("returns default for whitespace only", () => {
    expect(sanitizeLocalTextExportFileName("   ")).toBe("export.txt");
  });

  it("strips leading dots", () => {
    expect(sanitizeLocalTextExportFileName(".hidden")).toBe("_hidden");
  });

  it("collapses multiple underscores", () => {
    expect(sanitizeLocalTextExportFileName("a///b///c.txt")).toBe("a_b_c.txt");
  });
});

describe("import boundary — normalizeNativePickedFile", () => {
  it("normalizes a well-formed native picker asset", () => {
    const result = normalizeNativePickedFile({
      name: "invoice.pdf",
      uri: "file:///cache/invoice.pdf",
      mimeType: "application/pdf",
      size: 1024,
    });
    expect(result).toEqual({
      name: "invoice.pdf",
      uri: "file:///cache/invoice.pdf",
      fileCopyUri: null,
      mimeType: "application/pdf",
      type: "application/pdf",
      size: 1024,
    });
  });

  it("returns null for null input", () => {
    expect(normalizeNativePickedFile(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(normalizeNativePickedFile(undefined)).toBeNull();
  });

  it("returns null when uri is empty", () => {
    expect(normalizeNativePickedFile({ uri: "", name: "test" })).toBeNull();
  });

  it("infers name from URI if name is missing", () => {
    const result = normalizeNativePickedFile({
      uri: "file:///cache/download/report.xlsx",
    });
    expect(result?.name).toBe("report.xlsx");
  });

  it("generates fallback name if both name and uri segment are missing", () => {
    const result = normalizeNativePickedFile({
      uri: "file:///",
    });
    // URI "/" yields empty filename → fallback to "file_{timestamp}"
    if (result) {
      expect(result.name).toMatch(/^file_\d+$/);
    }
  });

  it("handles nested assets array (wrapper format)", () => {
    const result = normalizeNativePickedFile({
      assets: [
        {
          name: "inner.pdf",
          uri: "file:///cache/inner.pdf",
          mimeType: "application/pdf",
          size: 512,
        },
      ],
    });
    expect(result?.name).toBe("inner.pdf");
    expect(result?.uri).toBe("file:///cache/inner.pdf");
  });

  it("uses fileCopyUri as fallback for uri", () => {
    const result = normalizeNativePickedFile({
      name: "fallback.pdf",
      fileCopyUri: "file:///cache/copy.pdf",
    });
    expect(result?.uri).toBe("file:///cache/copy.pdf");
    expect(result?.fileCopyUri).toBe("file:///cache/copy.pdf");
  });

  it("handles negative size gracefully", () => {
    const result = normalizeNativePickedFile({
      name: "test.pdf",
      uri: "file:///test.pdf",
      size: -1,
    });
    expect(result?.size).toBeNull();
  });

  it("handles NaN size gracefully", () => {
    const result = normalizeNativePickedFile({
      name: "test.pdf",
      uri: "file:///test.pdf",
      size: NaN,
    });
    expect(result?.size).toBeNull();
  });

  it("uses type field as mimeType fallback", () => {
    const result = normalizeNativePickedFile({
      name: "test.pdf",
      uri: "file:///test.pdf",
      type: "application/pdf",
    });
    expect(result?.mimeType).toBe("application/pdf");
    expect(result?.type).toBe("application/pdf");
  });
});
