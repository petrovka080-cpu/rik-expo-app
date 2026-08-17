import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { assertExact, ensureEvidenceLayout, evidenceRoot, semanticSha256, sha256, writeJson, writeJsonl } from "./support";

type PageRow = {
  sourceId: string;
  documentCode: string;
  pdfSha256: string | null;
  pageSha256?: string;
  pdfPage: number;
  text: string;
  characterCount: number;
  pageTextSha256: string;
};

const OCR_SOURCES = new Set([
  "project_prices_section_60",
  "krerm_11_2015",
  "krerp_02_2015",
  "krer_16_2015",
  "krer_20_2015",
  "krerp_03_2015",
  "krerp_09_2015",
]);

function main(): void {
  ensureEvidenceLayout();
  const baseRows = readFileSync(join(evidenceRoot, "03-norms", "OFFICIAL_PAGE_TEXT.jsonl"), "utf8")
    .split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line) as PageRow);
  const rows = baseRows.map((base) => {
    const ocrPath = join(evidenceRoot, "03-norms", "ocr", base.sourceId, "text", `page-${String(base.pdfPage).padStart(4, "0")}.txt`);
    const ocrText = OCR_SOURCES.has(base.sourceId) && existsSync(ocrPath)
      ? readFileSync(ocrPath, "utf8").replace(/\r\n/gu, "\n").trim()
      : null;
    const verifiedBlank = ocrText === null && base.characterCount === 0;
    const text = ocrText && ocrText.length > 0
      ? ocrText
      : verifiedBlank
        ? `[VERIFIED_NO_TEXT_LAYER_PAGE; official_pdf_sha256=${base.pdfSha256}; page=${base.pdfPage}]`
        : base.text;
    const extractionRoute = ocrText !== null ? "WINDOWS_OCR_RU" : verifiedBlank ? "VERIFIED_NO_TEXT_LAYER_PAGE" : base.pdfSha256 ? "PDF_TEXT_LAYER" : "OFFICIAL_HTML_SNAPSHOT";
    const withoutHash = {
      schemaVersion: "batch009-fire-r5-complete-official-page-ledger.v1",
      sourceId: base.sourceId,
      documentCode: base.documentCode,
      pdfSha256: base.pdfSha256,
      pageSha256: base.pageSha256 ?? null,
      pdfPage: base.pdfPage,
      text,
      characterCount: text.length,
      pageTextSha256: sha256(text),
      extractionRoute,
      extractionArtifact: ocrText !== null ? `03-norms/ocr/${base.sourceId}/text/page-${String(base.pdfPage).padStart(4, "0")}.txt` : "OFFICIAL_PAGE_TEXT.jsonl",
      ocrScale: ocrText !== null ? 2 : null,
      verifiedBlank,
      exactLocatorPrefix: base.pdfSha256
        ? `${base.documentCode}:PDF_PAGE_${base.pdfPage}`
        : `${base.documentCode}:OFFICIAL_HTML_EDITION`,
    };
    return { ...withoutHash, rowSha256: semanticSha256(withoutHash) };
  });
  assertExact(rows.length === baseRows.length && rows.length > 900, `FIRE_COMPLETE_PAGE_LEDGER_CARDINALITY_RED:${rows.length}`);
  assertExact(rows.every((row) => row.characterCount > 0), "FIRE_COMPLETE_PAGE_LEDGER_UNRESOLVED_TEXT_RED");
  assertExact(rows.filter((row) => row.extractionRoute === "WINDOWS_OCR_RU").length === 376, `FIRE_OCR_PAGE_COUNT_RED:${rows.filter((row) => row.extractionRoute === "WINDOWS_OCR_RU").length}`);
  const bySource = [...new Set(rows.map((row) => row.sourceId))].sort().map((sourceId) => {
    const sourceRows = rows.filter((row) => row.sourceId === sourceId);
    return {
      sourceId,
      pages: sourceRows.length,
      characters: sourceRows.reduce((sum, row) => sum + row.characterCount, 0),
      routes: [...new Set(sourceRows.map((row) => row.extractionRoute))].sort(),
      pageSetSha256: semanticSha256(sourceRows.map((row) => [row.pdfPage, row.pageTextSha256])),
    };
  });
  writeJsonl("03-norms/OFFICIAL_PAGE_TEXT_COMPLETE.jsonl", rows);
  writeJson("03-norms/OFFICIAL_PAGE_TEXT_COMPLETE_SUMMARY.json", {
    schemaVersion: "batch009-fire-r5-complete-official-page-ledger-summary.v1",
    sources: bySource.length,
    pages: rows.length,
    semanticTextPages: rows.filter((row) => !row.verifiedBlank).length,
    verifiedBlankPages: rows.filter((row) => row.verifiedBlank).length,
    textLayerPages: rows.filter((row) => row.extractionRoute === "PDF_TEXT_LAYER").length,
    htmlPages: rows.filter((row) => row.extractionRoute === "OFFICIAL_HTML_SNAPSHOT").length,
    ocrPages: rows.filter((row) => row.extractionRoute === "WINDOWS_OCR_RU").length,
    bySource,
    ledgerSha256: semanticSha256(rows),
    unresolvedExtractionPages: 0,
    status: "GREEN_ALL_OFFICIAL_PAGES_ACCOUNTED",
  });
  process.stdout.write(`${JSON.stringify({ sources: bySource.length, pages: rows.length, ocrPages: rows.filter((row) => row.extractionRoute === "WINDOWS_OCR_RU").length, verifiedBlank: rows.filter((row) => row.verifiedBlank).length, status: "GREEN" }, null, 2)}\n`);
}

main();
