import { readFileSync } from "node:fs";
import { basename, join } from "node:path";

import {
  assertExact,
  ensureEvidenceLayout,
  evidenceRoot,
  semanticSha256,
  sha256,
  writeJson,
  writeJsonl,
} from "./support";

type PageRow = {
  sourceId: string;
  documentCode: string;
  pdfSha256: string;
  pdfPage: number;
  text: string;
  characterCount: number;
  pageTextSha256: string;
};

const OCR_SOURCES = new Set([
  "krer_05_2015", "krer_06_2015", "krer_07_2015", "krer_30_2015",
  "krer_37_2015", "krer_46_2015", "krerr_book_1_2015", "krerr_book_2_2015",
]);

const OCR_FALLBACKS = new Map<string, { textDir: string; renderDir: string }>([
  ["sn_kr_52_02_2024", { textDir: "fallback-1-2-text", renderDir: "fallback-1-2-render" }],
  ["sn_kr_20_02_2024_amendment_1", { textDir: "fallback-wasm-1-6-text", renderDir: "fallback-wasm-1-6-render" }],
  ["sp_kr_50_103_2025", { textDir: "fallback-1-1-text", renderDir: "fallback-1-1-render" }],
  ["sp_kr_51_101_2025", { textDir: "fallback-1-1-text", renderDir: "fallback-1-1-render" }],
  ["sp_kr_31_101_2024", { textDir: "fallback-1-1-text", renderDir: "fallback-1-1-render" }],
]);

const VERIFIED_BLANKS = new Set([
  "sp_kr_22_104_2024:4",
  "sp_kr_22_104_2024:84",
  "sp_kr_22_104_2024:88",
  "sp_kr_22_104_2024:167",
]);

function ocrText(sourceId: string, page: number): { text: string; route: string; retry: boolean } {
  const retryPage = sourceId === "krerr_book_2_2015" && (page === 158 || page === 159);
  const file = retryPage
    ? join(evidenceRoot, "03-norms", "ocr", sourceId, `retry-${String(page).padStart(4, "0")}-text`, `page-${String(page).padStart(4, "0")}.txt`)
    : join(evidenceRoot, "03-norms", "ocr", sourceId, "text", `page-${String(page).padStart(4, "0")}.txt`);
  return { text: readFileSync(file, "utf8").replace(/\r\n/g, "\n").trim(), route: file, retry: retryPage };
}

function fallbackText(sourceId: string, page: number): { text: string; route: string; scale: number } | null {
  const fallback = OCR_FALLBACKS.get(sourceId);
  if (!fallback) return null;
  const route = join(evidenceRoot, "03-norms", "ocr", sourceId, fallback.textDir, `page-${String(page).padStart(4, "0")}.txt`);
  return { text: readFileSync(route, "utf8").replace(/\r\n/g, "\n").trim(), route, scale: 3 };
}

function verifiedBlank(sourceId: string, page: number): { text: string; route: string; scale: number } | null {
  if (!VERIFIED_BLANKS.has(`${sourceId}:${page}`)) return null;
  const route = join(evidenceRoot, "03-norms", "ocr", sourceId, `fallback-${page}-${page}-render`, `page-${String(page).padStart(4, "0")}.png`);
  const renderSha256 = sha256(readFileSync(route));
  return {
    text: `[VERIFIED_INTENTIONALLY_BLANK_OFFICIAL_PDF_PAGE; render_sha256=${renderSha256}]`,
    route,
    scale: 3,
  };
}

function main(): void {
  ensureEvidenceLayout();
  const baseRows = readFileSync(join(evidenceRoot, "03-norms", "OFFICIAL_PAGE_TEXT.jsonl"), "utf8")
    .split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line) as PageRow);
  const rows = baseRows.map((base) => {
    const ocr = OCR_SOURCES.has(base.sourceId) ? ocrText(base.sourceId, base.pdfPage) : null;
    const fallback = !ocr && base.characterCount === 0 ? fallbackText(base.sourceId, base.pdfPage) : null;
    const blank = !ocr && !fallback && base.characterCount === 0 ? verifiedBlank(base.sourceId, base.pdfPage) : null;
    const text = ocr?.text ?? fallback?.text ?? blank?.text ?? base.text;
    const extractionRoute = ocr
      ? "WINDOWS_OCR_RU"
      : fallback
        ? "WINDOWS_OCR_RU_FALLBACK"
        : blank
          ? "VERIFIED_INTENTIONALLY_BLANK_RENDER"
          : "PDF_TEXT_LAYER";
    const withoutHash = {
      schemaVersion: "batch008-concrete-r5-complete-official-page-ledger.v1",
      sourceId: base.sourceId,
      documentCode: base.documentCode,
      pdfSha256: base.pdfSha256,
      pdfPage: base.pdfPage,
      text,
      characterCount: text.length,
      pageTextSha256: sha256(text),
      extractionRoute,
      extractionArtifact: ocr ? basename(ocr.route) : fallback ? basename(fallback.route) : blank ? basename(blank.route) : "OFFICIAL_PAGE_TEXT.jsonl",
      ocrScale: ocr ? (ocr.retry ? 3 : 2) : fallback?.scale ?? blank?.scale ?? null,
      retryDisposition: ocr?.retry ? "RECOVERED_NONEMPTY_AT_SCALE_3" : null,
      verifiedBlank: Boolean(blank),
      exactLocatorPrefix: `${base.documentCode}:PDF_PAGE_${base.pdfPage}`,
    };
    return { ...withoutHash, rowSha256: semanticSha256(withoutHash) };
  });
  assertExact(rows.length === baseRows.length && rows.length === 3_149, `CONCRETE_COMPLETE_PAGE_LEDGER_CARDINALITY_RED:${rows.length}`);
  assertExact(rows.every((row) => row.characterCount > 0), "CONCRETE_COMPLETE_PAGE_LEDGER_UNRESOLVED_TEXT_RED");
  assertExact(rows.filter((row) => row.verifiedBlank).length === 4, `CONCRETE_COMPLETE_PAGE_LEDGER_VERIFIED_BLANK_COUNT_RED:${rows.filter((row) => row.verifiedBlank).length}`);
  const bySource = [...new Set(rows.map((row) => row.sourceId))].sort().map((sourceId) => {
    const sourceRows = rows.filter((row) => row.sourceId === sourceId);
    return {
      sourceId,
      pages: sourceRows.length,
      nonempty: sourceRows.filter((row) => row.characterCount > 0).length,
      characters: sourceRows.reduce((sum, row) => sum + row.characterCount, 0),
      route: [...new Set(sourceRows.map((row) => row.extractionRoute))],
      pageSetSha256: semanticSha256(sourceRows.map((row) => [row.pdfPage, row.pageTextSha256])),
    };
  });
  writeJsonl("03-norms/OFFICIAL_PAGE_TEXT_COMPLETE.jsonl", rows);
  writeJson("03-norms/OFFICIAL_PAGE_TEXT_COMPLETE_SUMMARY.json", {
    schemaVersion: "batch008-concrete-r5-complete-official-page-ledger-summary.v1",
    sources: bySource.length,
    pages: rows.length,
    semanticTextPages: rows.filter((row) => !row.verifiedBlank).length,
    verifiedBlankPages: rows.filter((row) => row.verifiedBlank).length,
    textLayerPages: rows.filter((row) => row.extractionRoute === "PDF_TEXT_LAYER").length,
    ocrPages: rows.filter((row) => row.extractionRoute === "WINDOWS_OCR_RU").length,
    ocrRetryPages: rows.filter((row) => row.retryDisposition !== null).length,
    bySource,
    ledgerSha256: semanticSha256(rows),
    unresolvedExtractionPages: 0,
    status: "GREEN_ALL_OFFICIAL_PAGES_ACCOUNTED_WITH_FOUR_VERIFIED_BLANKS",
  });
  process.stdout.write(`${JSON.stringify({ sources: bySource.length, pages: rows.length, ocrPages: rows.filter((row) => row.extractionRoute === "WINDOWS_OCR_RU").length, status: "GREEN" }, null, 2)}\n`);
}

main();
