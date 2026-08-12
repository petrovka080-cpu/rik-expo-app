import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const SCHEMA = "m1-asphalt-five-p0-remediation-r1:official-pdf-text:v1";
const argv = Object.fromEntries(process.argv.slice(2).map((argument) => {
  const [key, ...rest] = argument.replace(/^--/u, "").split("=");
  return [key, rest.join("=") || true];
}));
const repoRoot = process.cwd();
const sourceRoot = path.resolve(String(argv["source-root"] ?? path.join(
  ".release-runtime", "master-11610-group-batches-r1", "03-m1-asphalt-five-p0-remediation-r1", "normative-sources",
)));
const pdfjsModule = path.resolve(String(argv["pdfjs-module"] ?? ""));

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function writeImmutable(relative, content) {
  const file = path.join(sourceRoot, relative);
  mkdirSync(path.dirname(file), { recursive: true });
  invariant(!existsSync(file), `IMMUTABLE_PDF_TEXT_OUTPUT_ALREADY_EXISTS:${relative}`);
  writeFileSync(file, content, "utf8");
}

invariant(argv["pdfjs-module"], "PDFJS_MODULE_REQUIRED");
invariant(existsSync(pdfjsModule), `PDFJS_MODULE_MISSING:${pdfjsModule}`);
const { getDocument } = await import(pathToFileURL(pdfjsModule).href);
const snapshotRoot = path.join(sourceRoot, "snapshots");
const pdfFiles = readdirSync(snapshotRoot).filter((name) => name.endsWith(".pdf")).sort();
invariant(pdfFiles.length > 0, "OFFICIAL_PDF_SNAPSHOTS_MISSING");

const groups = new Map();
for (const name of pdfFiles) {
  const file = path.join(snapshotRoot, name);
  const buffer = readFileSync(file);
  const hash = sha256(buffer);
  const group = groups.get(hash) ?? { sha256: hash, files: [], buffer };
  group.files.push({ file: `snapshots/${name}`, bytes: statSync(file).size });
  groups.set(hash, group);
}

const documents = [];
for (const group of [...groups.values()].sort((left, right) => left.sha256.localeCompare(right.sha256))) {
  const document = await getDocument({ data: new Uint8Array(group.buffer), useSystemFonts: false }).promise;
  const pages = [];
  const textParts = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items.map((item) => String(item.str ?? "")).join(" ").replace(/\s+/gu, " ").trim();
    const pageTextSha256 = sha256(text);
    pages.push({ pageNumber, characterCount: text.length, itemCount: content.items.length, pageTextSha256 });
    textParts.push(`=== PAGE ${pageNumber} ===\n${text}\n`);
  }
  const extractedText = `${textParts.join("\n")}\n`;
  const outputFile = `extracted-text/${group.sha256}.txt`;
  writeImmutable(outputFile, extractedText);
  documents.push({
    pdfSha256: group.sha256,
    sourceFiles: group.files,
    pageCount: document.numPages,
    pagesWithText: pages.filter((page) => page.characterCount > 0).length,
    pagesWithoutText: pages.filter((page) => page.characterCount === 0).length,
    extractedCharacterCount: pages.reduce((sum, page) => sum + page.characterCount, 0),
    extractedTextSha256: sha256(extractedText),
    extractedTextFile: outputFile,
    pages,
    textLayerVerdict: pages.every((page) => page.characterCount > 0) ? "TEXT_LAYER_ALL_PAGES" : pages.some((page) => page.characterCount > 0) ? "TEXT_LAYER_PARTIAL" : "NO_TEXT_LAYER_OCR_REQUIRED",
  });
}

const index = {
  schemaVersion: SCHEMA,
  parserModule: path.relative(repoRoot, pdfjsModule).replaceAll("\\", "/"),
  snapshotFileCount: pdfFiles.length,
  uniquePdfCount: documents.length,
  duplicateSnapshotCount: pdfFiles.length - documents.length,
  documents,
  interpretationPerformed: false,
  verdict: documents.every((document) => document.textLayerVerdict === "TEXT_LAYER_ALL_PAGES")
    ? "GREEN_ALL_OFFICIAL_PDFS_TEXT_EXTRACTED"
    : "BLOCKED_ONE_OR_MORE_OFFICIAL_PDFS_REQUIRE_OCR",
};
writeImmutable("discovery/PDF_TEXT_EXTRACTION_INDEX.json", `${JSON.stringify(index, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({
  verdict: index.verdict,
  snapshotFileCount: index.snapshotFileCount,
  uniquePdfCount: index.uniquePdfCount,
  duplicateSnapshotCount: index.duplicateSnapshotCount,
  documents: documents.map((document) => ({
    pdfSha256: document.pdfSha256,
    sourceFiles: document.sourceFiles.map((source) => source.file),
    pageCount: document.pageCount,
    pagesWithText: document.pagesWithText,
    pagesWithoutText: document.pagesWithoutText,
    extractedCharacterCount: document.extractedCharacterCount,
    textLayerVerdict: document.textLayerVerdict,
  })),
}, null, 2)}\n`);
