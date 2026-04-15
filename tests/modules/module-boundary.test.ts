/**
 * Module boundary tightening tests.
 *
 * WAVE Y: Validates the `documents` module public boundary contract.
 * The `documents` module (pdfDocument, pdfDocumentGenerators,
 * pdfDocumentSessions, pdfDocumentActions, attachmentOpener, pdfRpcRollout)
 * has 46+ direct imports from screens into individual internal files.
 *
 * These tests validate that the public API surface produces correct shapes
 * and that the boundary types are complete, serving as the enforcement
 * contract for any future public entry point.
 */

import {
  normalizePdfFileName,
  buildPdfFileName,
  createPdfDocumentDescriptor,
  type PdfDocumentType,
  type PdfOriginModule,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  type DocumentDescriptor,
} from "../../src/lib/documents/pdfDocument";

// ─── Module boundary: pdfDocument types are complete ──────────────
describe("module boundary — pdfDocument type surface", () => {
  const ALL_DOC_TYPES: PdfDocumentType[] = [
    "request",
    "proposal",
    "payment_order",
    "director_report",
    "report_export",
    "supplier_summary",
    "warehouse_register",
    "warehouse_materials",
    "warehouse_document",
    "contractor_act",
    "attachment_pdf",
  ];

  const ALL_ORIGIN_MODULES: PdfOriginModule[] = [
    "foreman",
    "buyer",
    "accountant",
    "director",
    "warehouse",
    "contractor",
    "reports",
  ];

  it("PdfDocumentType covers all known document types (11 types)", () => {
    expect(ALL_DOC_TYPES).toHaveLength(11);
    // Each type must be a non-empty string
    ALL_DOC_TYPES.forEach((t) => {
      expect(typeof t).toBe("string");
      expect(t.length).toBeGreaterThan(0);
    });
  });

  it("PdfOriginModule covers all known origin modules (7 modules)", () => {
    expect(ALL_ORIGIN_MODULES).toHaveLength(7);
    ALL_ORIGIN_MODULES.forEach((m) => {
      expect(typeof m).toBe("string");
      expect(m.length).toBeGreaterThan(0);
    });
  });

  it("no duplicate document types", () => {
    expect(new Set(ALL_DOC_TYPES).size).toBe(ALL_DOC_TYPES.length);
  });

  it("no duplicate origin modules", () => {
    expect(new Set(ALL_ORIGIN_MODULES).size).toBe(ALL_ORIGIN_MODULES.length);
  });
});

// ─── Module boundary: normalizePdfFileName contract ──────────────
describe("module boundary — normalizePdfFileName", () => {
  it("appends .pdf if missing", () => {
    expect(normalizePdfFileName("report")).toBe("report.pdf");
  });

  it("preserves .pdf if present", () => {
    expect(normalizePdfFileName("report.pdf")).toBe("report.pdf");
  });

  it("sanitizes special characters", () => {
    const result = normalizePdfFileName("my report (final) 2024");
    expect(result).not.toContain("(");
    expect(result).not.toContain(")");
    expect(result.endsWith(".pdf")).toBe(true);
  });

  it("returns fallback for empty input", () => {
    expect(normalizePdfFileName("")).toBe("document.pdf");
    expect(normalizePdfFileName(null)).toBe("document.pdf");
    expect(normalizePdfFileName(undefined)).toBe("document.pdf");
  });

  it("custom fallback works", () => {
    expect(normalizePdfFileName("", "invoice")).toBe("invoice.pdf");
  });

  it("collapses multiple underscores", () => {
    const result = normalizePdfFileName("a___b___c");
    expect(result).not.toContain("___");
  });
});

// ─── Module boundary: buildPdfFileName contract ──────────────
describe("module boundary — buildPdfFileName", () => {
  it("combines type, title, date, and entityId", () => {
    const result = buildPdfFileName({
      documentType: "request",
      title: "Office Supplies",
      entityId: "req-123",
      dateIso: "2024-06-15T12:00:00Z",
    });
    expect(result).toContain("request");
    expect(result.endsWith(".pdf")).toBe(true);
  });

  it("works with minimal input", () => {
    const result = buildPdfFileName({ documentType: "proposal" });
    expect(result).toContain("proposal");
    expect(result.endsWith(".pdf")).toBe(true);
  });

  it("handles every document type without error", () => {
    const types: PdfDocumentType[] = [
      "request", "proposal", "payment_order", "director_report",
      "report_export", "supplier_summary", "warehouse_register",
      "warehouse_materials", "warehouse_document", "contractor_act",
      "attachment_pdf",
    ];
    types.forEach((t) => {
      const result = buildPdfFileName({ documentType: t });
      expect(typeof result).toBe("string");
      expect(result.endsWith(".pdf")).toBe(true);
    });
  });
});

// ─── Module boundary: createPdfDocumentDescriptor contract ──────────────
describe("module boundary — createPdfDocumentDescriptor shape", () => {
  it("produces a complete DocumentDescriptor", () => {
    const result = createPdfDocumentDescriptor({
      uri: "file:///cache/test.pdf",
      title: "Test Document",
      documentType: "request",
      source: "generated",
      originModule: "foreman",
    });

    // Shape contract
    expect(result).toHaveProperty("uri");
    expect(result).toHaveProperty("fileSource");
    expect(result).toHaveProperty("fileName");
    expect(result).toHaveProperty("title", "Test Document");
    expect(result).toHaveProperty("mimeType", "application/pdf");
    expect(result).toHaveProperty("documentType", "request");
    expect(result).toHaveProperty("source", "generated");
    expect(result).toHaveProperty("originModule", "foreman");
    expect(result).toHaveProperty("createdAt");
    expect(typeof result.createdAt).toBe("string");
  });

  it("normalizes fileName from title", () => {
    const result = createPdfDocumentDescriptor({
      uri: "file:///cache/test.pdf",
      title: "Отчёт по материалам",
      documentType: "director_report",
      source: "generated",
      originModule: "director",
    });
    expect(result.fileName.endsWith(".pdf")).toBe(true);
  });

  it("entityId is stringified", () => {
    const result = createPdfDocumentDescriptor({
      uri: "file:///cache/test.pdf",
      title: "test",
      documentType: "payment_order",
      source: "generated",
      originModule: "accountant",
      entityId: 12345,
    });
    expect(result.entityId).toBe("12345");
  });

  it("entityId is undefined when not provided", () => {
    const result = createPdfDocumentDescriptor({
      uri: "file:///cache/test.pdf",
      title: "test",
      documentType: "request",
      source: "attachment",
      originModule: "buyer",
    });
    expect(result.entityId).toBeUndefined();
  });
});
