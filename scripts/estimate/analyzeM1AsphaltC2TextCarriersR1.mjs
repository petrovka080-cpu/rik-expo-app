import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const SCHEMA = "m1-asphalt-c2-text-carrier-analysis-r1:v2";
const argv = Object.fromEntries(process.argv.slice(2).map((argument) => {
  const [key, ...rest] = argument.replace(/^--/u, "").split("=");
  return [key, rest.join("=") || true];
}));
const repoRoot = process.cwd();
const outputRoot = path.resolve(String(argv["output-root"] ?? path.join(
  ".release-runtime",
  "master-11610-group-batches-r1",
  "03-m1-asphalt-five-p0-remediation-r1",
  "delta-c2",
)));
const fetchManifestPath = path.resolve(String(argv["fetch-manifest"] ?? path.join(
  outputRoot,
  "C2_AUTONOMOUS_SOURCE_FETCH_MANIFEST.json",
)));
const pdfjsModule = path.resolve(String(argv["pdfjs-module"] ?? path.join(
  repoRoot,
  "..",
  "rik-expo-app",
  "node_modules",
  "pdfjs-dist",
  "legacy",
  "build",
  "pdf.mjs",
)));
const artifactTag = String(argv["artifact-tag"] ?? "R2");

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function writeImmutable(relative, value) {
  const file = path.join(outputRoot, relative);
  mkdirSync(path.dirname(file), { recursive: true });
  invariant(!existsSync(file), `IMMUTABLE_C2_TEXT_OUTPUT_ALREADY_EXISTS:${relative}`);
  writeFileSync(file, value);
}

function decodeHtml(buffer, contentType) {
  const declared = /charset\s*=\s*([^;\s]+)/iu.exec(contentType)?.[1]?.replace(/["']/gu, "").toLowerCase();
  if (declared === "windows-1251" || declared === "cp1251") {
    return new TextDecoder("windows-1251").decode(buffer);
  }
  const utf8 = buffer.toString("utf8");
  const replacementRatio = (utf8.match(/\uFFFD/gu)?.length ?? 0) / Math.max(1, utf8.length);
  return replacementRatio > 0.001 ? new TextDecoder("windows-1251").decode(buffer) : utf8;
}

const WINDOWS_1251_ENCODER = (() => {
  const inverse = new Map();
  const decoder = new TextDecoder("windows-1251");
  for (let byte = 0; byte <= 255; byte += 1) {
    inverse.set(decoder.decode(Uint8Array.of(byte)), byte);
  }
  return inverse;
})();

function repairUtf8DecodedAsWindows1251(value) {
  const suspiciousBefore = (value.match(/[РС][\p{L}]/gu)?.length ?? 0);
  if (suspiciousBefore < Math.max(4, value.length * 0.01)) return value;
  const bytes = [];
  for (const character of value) {
    const byte = WINDOWS_1251_ENCODER.get(character);
    if (byte === undefined) return value;
    bytes.push(byte);
  }
  const candidate = Buffer.from(bytes).toString("utf8");
  if (candidate.includes("\uFFFD")) return value;
  const suspiciousAfter = (candidate.match(/[РС][\p{L}]/gu)?.length ?? 0);
  return suspiciousAfter < suspiciousBefore ? candidate : value;
}

function decodeEntities(value) {
  const named = new Map([
    ["nbsp", " "], ["quot", '"'], ["amp", "&"], ["lt", "<"], ["gt", ">"],
    ["laquo", "«"], ["raquo", "»"], ["ndash", "–"], ["mdash", "—"],
  ]);
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/giu, (match, entity) => {
    if (entity.startsWith("#x")) return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    if (entity.startsWith("#")) return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
    return named.get(entity.toLowerCase()) ?? match;
  });
}

function htmlToText(html) {
  return decodeEntities(html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, "\n")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu, "\n")
    .replace(/<(?:br|hr)\b[^>]*\/?>/giu, "\n")
    .replace(/<\/(?:p|div|li|tr|td|th|h[1-6]|pre|section|article)>/giu, "\n")
    .replace(/<[^>]+>/gu, " "))
    .replace(/\r\n?/gu, "\n")
    .replace(/[\t\f\v ]+/gu, " ")
    .replace(/ *\n */gu, "\n")
    .replace(/\n{3,}/gu, "\n\n")
    .trim();
}

function normalizeWords(value) {
  return value.toLocaleLowerCase("ru")
    .normalize("NFKC")
    .replace(/ис меганорм:[^\n]*/giu, " ")
    .replace(/гарант:[^\n]*/giu, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function tokenSet(value) {
  return new Set(normalizeWords(value).split(" ").filter((token) => token.length > 1));
}

function jaccard(leftValue, rightValue) {
  const left = tokenSet(leftValue);
  const right = tokenSet(rightValue);
  if (left.size === 0 && right.size === 0) return 1;
  let intersection = 0;
  for (const token of left) if (right.has(token)) intersection += 1;
  const union = left.size + right.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function sectionTenSlice(text) {
  const startMatch = /(?:^|\n|\s)10\.\s*(?:УСТРОЙСТВО|Устройство)\s+АСФАЛЬТОБЕТОННЫХ/iu.exec(text);
  if (!startMatch) return { found: false, text: "", startOffset: null, endOffset: null };
  const startOffset = startMatch.index;
  const afterStart = text.slice(startOffset + startMatch[0].length);
  const endMatch = /(?:^|\n|\s)11\.1\.\s+/u.exec(afterStart)
    ?? /(?:^|\n|\s)11\.\s*(?:УСТРОЙСТВО|Устройство)\s+ПОВЕРХНОСТНОЙ/iu.exec(afterStart);
  const endOffset = endMatch ? startOffset + startMatch[0].length + endMatch.index : text.length;
  return { found: true, text: text.slice(startOffset, endOffset), startOffset, endOffset };
}

function extractSectionTenClauses(text) {
  const section = sectionTenSlice(text);
  if (!section.found) return { sectionFound: false, clauses: [] };
  const matches = [...section.text.matchAll(/(?:^|\n|\s)(10\.(\d{1,2}))\.\s+/gu)]
    .filter((match) => Number(match[2]) >= 1 && Number(match[2]) <= 99);
  const firstByClause = new Map();
  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    if (firstByClause.has(match[1])) continue;
    const next = matches.slice(index + 1).find((candidate) => candidate[1] !== match[1]);
    const start = match.index + match[0].length;
    const end = next?.index ?? section.text.length;
    const clauseText = section.text.slice(start, end).replace(/\s+/gu, " ").trim();
    firstByClause.set(match[1], {
      clause: match[1],
      characterCount: clauseText.length,
      textSha256: sha256(clauseText),
      normalizedTextSha256: sha256(normalizeWords(clauseText)),
      anchorExcerpt: clauseText.slice(0, 700),
      anchorExcerptSha256: sha256(clauseText.slice(0, 700)),
      text: clauseText,
      sourceOffset: section.startOffset + start,
    });
  }
  return { sectionFound: true, clauses: [...firstByClause.values()] };
}

function pageForOffset(pageOffsets, offset) {
  let selected = null;
  for (const page of pageOffsets) {
    if (page.startOffset <= offset) selected = page;
    else break;
  }
  return selected;
}

invariant(existsSync(fetchManifestPath), `FETCH_MANIFEST_MISSING:${fetchManifestPath}`);
invariant(existsSync(pdfjsModule), `PDFJS_MODULE_MISSING:${pdfjsModule}`);
const fetchManifest = JSON.parse(readFileSync(fetchManifestPath, "utf8"));
const { getDocument } = await import(pathToFileURL(pdfjsModule).href);
const documents = [];

for (const source of fetchManifest.sources.filter((item) => item.ok && item.snapshotFile)) {
  const sourceFile = path.join(outputRoot, source.snapshotFile);
  const buffer = readFileSync(sourceFile);
  if (source.expectedMedia === "pdf" && buffer.subarray(0, 5).toString("ascii") === "%PDF-") {
    const pdf = await getDocument({ data: new Uint8Array(buffer), useSystemFonts: false }).promise;
    const pages = [];
    const fullParts = [];
    const pageOffsets = [];
    let fullLength = 0;
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const fragments = [];
      for (const item of content.items) {
        fragments.push(String(item.str ?? ""));
        fragments.push(item.hasEOL ? "\n" : " ");
      }
      const pageText = repairUtf8DecodedAsWindows1251(fragments.join(""))
        .replace(/[\t\f\v ]+/gu, " ").replace(/ *\n */gu, "\n").trim();
      const marker = `=== PAGE ${pageNumber} ===\n`;
      const part = `${marker}${pageText}\n`;
      pageOffsets.push({ pageNumber, startOffset: fullLength + marker.length, pageTextSha256: sha256(pageText) });
      fullParts.push(part);
      fullLength += part.length;
      pages.push({
        pageNumber,
        characterCount: pageText.length,
        itemCount: content.items.length,
        pageTextSha256: sha256(pageText),
      });
    }
    const fullText = fullParts.join("\n");
    const section = extractSectionTenClauses(fullText);
    const sourceClauses = section.clauses.map((clause) => {
      const page = pageForOffset(pageOffsets, clause.sourceOffset);
      return { ...clause, pageNumber: page?.pageNumber ?? null, pageTextSha256: page?.pageTextSha256 ?? null, renderedPageRequired: true };
    });
    const extractedTextFile = `text-carriers/${source.sourceId}.${source.sha256.slice(0, 16)}.${artifactTag.toLowerCase()}.pages.txt`;
    writeImmutable(extractedTextFile, fullText);
    documents.push({
      sourceId: source.sourceId,
      sourceClass: source.sourceClass,
      sourceFile: source.snapshotFile,
      sourceContentHash: source.sha256,
      mediaType: "application/pdf",
      pageCount: pdf.numPages,
      pagesWithText: pages.filter((page) => page.characterCount > 0).length,
      pagesWithoutText: pages.filter((page) => page.characterCount === 0).length,
      extractedCharacterCount: pages.reduce((sum, page) => sum + page.characterCount, 0),
      extractedTextFile,
      extractedTextSha256: sha256(fullText),
      pages,
      sectionTenFound: section.sectionFound,
      sectionTenClauseCount: sourceClauses.length,
      sectionTenClauses: sourceClauses,
      extractionVerdict: pages.every((page) => page.characterCount > 0)
        ? "TEXT_LAYER_ALL_PAGES"
        : pages.some((page) => page.characterCount > 0)
          ? "TEXT_LAYER_PARTIAL_OCR_REVIEW_REQUIRED"
          : "NO_TEXT_LAYER_OCR_REQUIRED",
    });
    continue;
  }
  if (source.expectedMedia === "html") {
    const html = decodeHtml(buffer, source.contentType ?? "");
    const fullText = htmlToText(html);
    const section = extractSectionTenClauses(fullText);
    const extractedTextFile = `text-carriers/${source.sourceId}.${source.sha256.slice(0, 16)}.${artifactTag.toLowerCase()}.html.txt`;
    writeImmutable(extractedTextFile, fullText);
    documents.push({
      sourceId: source.sourceId,
      sourceClass: source.sourceClass,
      sourceFile: source.snapshotFile,
      sourceContentHash: source.sha256,
      mediaType: "text/html",
      declaredContentType: source.contentType,
      pageCount: null,
      extractedCharacterCount: fullText.length,
      extractedTextFile,
      extractedTextSha256: sha256(fullText),
      sectionTenFound: section.sectionFound,
      sectionTenClauseCount: section.clauses.length,
      sectionTenClauses: section.clauses,
      extractionVerdict: "HTML_TEXT_EXTRACTED_STABLE_ELEMENT_LOCATORS_REVIEW_REQUIRED",
    });
  }
}

const comparisonSources = documents.filter((document) => document.sectionTenFound && document.sectionTenClauseCount > 0);
const clauseIds = [...new Set(comparisonSources.flatMap((document) => document.sectionTenClauses.map((clause) => clause.clause)))]
  .sort((left, right) => Number(left.split(".")[1]) - Number(right.split(".")[1]));
const comparisons = [];
for (let leftIndex = 0; leftIndex < comparisonSources.length; leftIndex += 1) {
  for (let rightIndex = leftIndex + 1; rightIndex < comparisonSources.length; rightIndex += 1) {
    const left = comparisonSources[leftIndex];
    const right = comparisonSources[rightIndex];
    const clauses = clauseIds.map((clauseId) => {
      const leftClause = left.sectionTenClauses.find((clause) => clause.clause === clauseId);
      const rightClause = right.sectionTenClauses.find((clause) => clause.clause === clauseId);
      return {
        clause: clauseId,
        leftPresent: Boolean(leftClause),
        rightPresent: Boolean(rightClause),
        normalizedExactMatch: Boolean(leftClause && rightClause && leftClause.normalizedTextSha256 === rightClause.normalizedTextSha256),
        tokenJaccard: leftClause && rightClause ? Number(jaccard(leftClause.text, rightClause.text).toFixed(6)) : null,
      };
    });
    comparisons.push({
      leftSourceId: left.sourceId,
      rightSourceId: right.sourceId,
      clausesCompared: clauses.filter((clause) => clause.leftPresent && clause.rightPresent).length,
      normalizedExactMatches: clauses.filter((clause) => clause.normalizedExactMatch).length,
      minimumTokenJaccard: Math.min(...clauses.filter((clause) => clause.tokenJaccard !== null).map((clause) => clause.tokenJaccard)),
      averageTokenJaccard: Number((clauses.filter((clause) => clause.tokenJaccard !== null).reduce((sum, clause) => sum + clause.tokenJaccard, 0) / Math.max(1, clauses.filter((clause) => clause.tokenJaccard !== null).length)).toFixed(6)),
      clauses,
    });
  }
}

const index = {
  schemaVersion: SCHEMA,
  fetchManifest: path.relative(repoRoot, fetchManifestPath).replaceAll("\\", "/"),
  fetchManifestSha256: sha256(readFileSync(fetchManifestPath)),
  parserModule: path.relative(repoRoot, pdfjsModule).replaceAll("\\", "/"),
  documentCount: documents.length,
  pdfCount: documents.filter((document) => document.mediaType === "application/pdf").length,
  htmlCount: documents.filter((document) => document.mediaType === "text/html").length,
  documents,
  clauseComparisonCount: comparisons.length,
  comparisons,
  automaticAuthenticationAdmissionPerformed: false,
  verdict: "C2_TEXT_CARRIERS_EXTRACTED_COMPARISON_REVIEW_REQUIRED",
};
writeImmutable(`C2_TEXT_CARRIER_EXTRACTION_AND_COMPARISON_${artifactTag}.json`, `${JSON.stringify(index, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({
  verdict: index.verdict,
  documentCount: index.documentCount,
  pdfCount: index.pdfCount,
  htmlCount: index.htmlCount,
  documents: documents.map((document) => ({
    sourceId: document.sourceId,
    mediaType: document.mediaType,
    pageCount: document.pageCount,
    pagesWithText: document.pagesWithText ?? null,
    pagesWithoutText: document.pagesWithoutText ?? null,
    extractedCharacterCount: document.extractedCharacterCount,
    sectionTenFound: document.sectionTenFound,
    sectionTenClauseCount: document.sectionTenClauseCount,
    extractionVerdict: document.extractionVerdict,
  })),
  comparisons: comparisons.map((comparison) => ({
    leftSourceId: comparison.leftSourceId,
    rightSourceId: comparison.rightSourceId,
    clausesCompared: comparison.clausesCompared,
    normalizedExactMatches: comparison.normalizedExactMatches,
    minimumTokenJaccard: comparison.minimumTokenJaccard,
    averageTokenJaccard: comparison.averageTokenJaccard,
  })),
}, null, 2)}\n`);
