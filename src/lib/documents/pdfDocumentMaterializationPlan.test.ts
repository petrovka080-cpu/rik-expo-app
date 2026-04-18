import {
  isVolatilePdfMaterializationUri,
  resolvePdfLocalMaterializationPlan,
} from "./pdfDocumentMaterializationPlan";

describe("pdfDocumentMaterializationPlan", () => {
  const base = {
    targetUri: "file:///app/cache/pdf_hash_document.pdf",
    cacheDir: "file:///app/cache/",
    documentDir: "file:///app/documents/",
  };

  it("keeps an already materialized target URI", () => {
    expect(
      resolvePdfLocalMaterializationPlan({
        ...base,
        sourceUri: base.targetUri,
      }),
    ).toEqual({
      action: "keep",
      reason: "already_target",
      uri: base.targetUri,
    });
  });

  it("keeps stable PDFs already inside controlled cache storage", () => {
    expect(
      resolvePdfLocalMaterializationPlan({
        ...base,
        sourceUri: "file:///app/cache/report.pdf",
      }),
    ).toEqual({
      action: "keep",
      reason: "controlled_cache",
      uri: "file:///app/cache/report.pdf",
    });
  });

  it("keeps stable PDFs already inside controlled document storage", () => {
    expect(
      resolvePdfLocalMaterializationPlan({
        ...base,
        sourceUri: "file:///app/documents/report.pdf",
      }),
    ).toEqual({
      action: "keep",
      reason: "controlled_document",
      uri: "file:///app/documents/report.pdf",
    });
  });

  it("copies volatile print cache files even when they live under cache", () => {
    expect(isVolatilePdfMaterializationUri("file:///app/cache/Caches/Print/output.pdf")).toBe(true);
    expect(
      resolvePdfLocalMaterializationPlan({
        ...base,
        sourceUri: "file:///app/cache/Caches/Print/output.pdf",
      }),
    ).toEqual({
      action: "copy",
      reason: "volatile_source",
      targetUri: base.targetUri,
    });
  });

  it("copies external local files into controlled cache", () => {
    expect(
      resolvePdfLocalMaterializationPlan({
        ...base,
        sourceUri: "file:///tmp/report.pdf",
      }),
    ).toEqual({
      action: "copy",
      reason: "outside_controlled_storage",
      targetUri: base.targetUri,
    });
  });
});
