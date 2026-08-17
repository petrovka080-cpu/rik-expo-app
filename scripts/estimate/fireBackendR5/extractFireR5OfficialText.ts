import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  assertExact,
  atomicWrite,
  ensureEvidenceLayout,
  evidenceRoot,
  semanticSha256,
  sha256,
  writeJson,
  writeJsonl,
} from "./support";

type Snapshot = {
  sourceId: string;
  documentCode: string;
  titleRu: string;
  officialPageUrl: string;
  contentKind: "PDF" | "HTML";
  officialPdfUrl: string | null;
  pdfSha256: string | null;
  pdfSnapshotRelativePath: string | null;
  textSnapshotRelativePath: string;
  pageSha256: string;
};

async function main(): Promise<void> {
  ensureEvidenceLayout();
  const snapshots = readFileSync(join(evidenceRoot, "03-norms", "OFFICIAL_SOURCE_SNAPSHOTS.jsonl"), "utf8")
    .split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line) as Snapshot);
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const documents = [];
  const pageRows = [];
  for (const source of snapshots) {
    if (source.contentKind === "HTML") {
      const text = readFileSync(join(evidenceRoot, source.textSnapshotRelativePath), "utf8").trim();
      assertExact(text.length > 0, `FIRE_HTML_TEXT_RED:${source.sourceId}`);
      const rowWithoutHash = {
        schemaVersion: "batch009-fire-r5-official-page-text.v1",
        sourceId: source.sourceId,
        documentCode: source.documentCode,
        pdfSha256: null,
        pageSha256: source.pageSha256,
        pdfPage: 1,
        text,
        characterCount: text.length,
        itemCount: text.split(/\s+/u).length,
        pageTextSha256: sha256(text),
        exactLocatorPrefix: `${source.documentCode}:OFFICIAL_HTML_EDITION:SECTION_OR_METADATA`,
      };
      pageRows.push({ ...rowWithoutHash, rowSha256: semanticSha256(rowWithoutHash) });
      documents.push({
        sourceId: source.sourceId,
        documentCode: source.documentCode,
        titleRu: source.titleRu,
        officialPageUrl: source.officialPageUrl,
        officialPdfUrl: null,
        pdfSha256: null,
        pageCount: 1,
        pagesWithText: 1,
        pagesWithoutText: 0,
        extractedCharacterCount: text.length,
        extractedTextSha256: sha256(text),
        extractedTextRelativePath: source.textSnapshotRelativePath,
        textLayerVerdict: "OFFICIAL_HTML_SNAPSHOT",
      });
      process.stdout.write(`${source.sourceId} pages=1 text=1 kind=HTML\n`);
      continue;
    }
    assertExact(Boolean(source.pdfSnapshotRelativePath) && Boolean(source.pdfSha256), `FIRE_PDF_BINDING_RED:${source.sourceId}`);
    const pdfPath = join(evidenceRoot, source.pdfSnapshotRelativePath!);
    const bytes = readFileSync(pdfPath);
    assertExact(sha256(bytes) === source.pdfSha256!, `FIRE_PDF_SNAPSHOT_HASH_RED:${source.sourceId}`);
    const document = await pdfjs.getDocument({ data: new Uint8Array(bytes), useSystemFonts: true }).promise;
    const textParts = [];
    let pagesWithText = 0;
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items.map((item) => String((item as { str?: string }).str ?? "")).join(" ").replace(/\s+/gu, " ").trim();
      if (text) pagesWithText += 1;
      const rowWithoutHash = {
        schemaVersion: "batch009-fire-r5-official-page-text.v1",
        sourceId: source.sourceId,
        documentCode: source.documentCode,
        pdfSha256: source.pdfSha256,
        pdfPage: pageNumber,
        text,
        characterCount: text.length,
        itemCount: content.items.length,
        pageTextSha256: sha256(text),
        exactLocatorPrefix: `${source.documentCode}:PDF_PAGE_${pageNumber}`,
      };
      pageRows.push({ ...rowWithoutHash, rowSha256: semanticSha256(rowWithoutHash) });
      textParts.push(`=== PDF PAGE ${pageNumber} ===\n${text}\n`);
    }
    const extracted = `${textParts.join("\n")}\n`;
    const relativeTextPath = `03-norms/extracted-text/${source.sourceId}.txt`;
    atomicWrite(join(evidenceRoot, relativeTextPath), extracted);
    const result = {
      sourceId: source.sourceId,
      documentCode: source.documentCode,
      titleRu: source.titleRu,
      officialPageUrl: source.officialPageUrl,
      officialPdfUrl: source.officialPdfUrl,
      pdfSha256: source.pdfSha256,
      pageCount: document.numPages,
      pagesWithText,
      pagesWithoutText: document.numPages - pagesWithText,
      extractedCharacterCount: extracted.length,
      extractedTextSha256: sha256(extracted),
      extractedTextRelativePath: relativeTextPath,
      textLayerVerdict: pagesWithText === document.numPages ? "TEXT_LAYER_ALL_PAGES" : pagesWithText > 0 ? "TEXT_LAYER_PARTIAL" : "NO_TEXT_LAYER",
    };
    documents.push(result);
    process.stdout.write(`${source.sourceId} pages=${document.numPages} text=${pagesWithText}\n`);
  }
  writeJsonl("03-norms/OFFICIAL_PAGE_TEXT.jsonl", pageRows);
  writeJson("03-norms/PDF_TEXT_EXTRACTION_INDEX.json", {
    schemaVersion: "batch009-fire-r5-pdf-text-extraction-index.v1",
    sourceCount: snapshots.length,
    documents,
    pageRows: pageRows.length,
    pagesWithText: pageRows.filter((row) => row.characterCount > 0).length,
    pagesWithoutText: pageRows.filter((row) => row.characterCount === 0).length,
    pageLedgerSha256: semanticSha256(pageRows),
    interpretationPerformed: false,
    status: documents.every((document) => document.pagesWithText > 0) ? "GREEN_TEXT_EXTRACTED_OR_PARTIAL_DECLARED" : "RED_NO_TEXT_SOURCE",
  });
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
