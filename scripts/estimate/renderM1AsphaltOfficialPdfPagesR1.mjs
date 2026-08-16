import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const SCHEMA = "m1-asphalt-five-p0-remediation-r1:official-pdf-render:v1";
const argv = Object.fromEntries(process.argv.slice(2).map((argument) => {
  const [key, ...rest] = argument.replace(/^--/u, "").split("=");
  return [key, rest.join("=") || true];
}));
const sourcePdf = path.resolve(String(argv["source-pdf"] ?? ""));
const pdfjsModule = path.resolve(String(argv["pdfjs-module"] ?? ""));
const canvasModule = path.resolve(String(argv["canvas-module"] ?? ""));
const outputRoot = path.resolve(String(argv["output-root"] ?? ""));
const firstPage = Number(argv["first-page"] ?? 1);
const lastPageArgument = argv["last-page"] === undefined ? null : Number(argv["last-page"]);
const scale = Number(argv.scale ?? 2);

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function writeImmutable(file, content) {
  mkdirSync(path.dirname(file), { recursive: true });
  invariant(!existsSync(file), `IMMUTABLE_RENDER_OUTPUT_ALREADY_EXISTS:${file}`);
  writeFileSync(file, content);
}

for (const [name, value] of [["SOURCE_PDF", sourcePdf], ["PDFJS_MODULE", pdfjsModule], ["CANVAS_MODULE", canvasModule]]) {
  invariant(value && existsSync(value), `${name}_MISSING:${value}`);
}
invariant(argv["output-root"], "OUTPUT_ROOT_REQUIRED");
invariant(Number.isInteger(firstPage) && firstPage >= 1, "FIRST_PAGE_INVALID");
invariant(Number.isFinite(scale) && scale >= 1 && scale <= 4, "SCALE_INVALID");

const { getDocument } = await import(pathToFileURL(pdfjsModule).href);
const require = createRequire(import.meta.url);
const { createCanvas } = require(canvasModule);
const pdfBuffer = readFileSync(sourcePdf);
const pdfSha256 = sha256(pdfBuffer);
const pdfjsPackageRoot = path.resolve(path.dirname(pdfjsModule), "..", "..");
const document = await getDocument({
  data: new Uint8Array(pdfBuffer),
  useSystemFonts: false,
  wasmUrl: pathToFileURL(`${path.join(pdfjsPackageRoot, "wasm")}${path.sep}`).href,
  standardFontDataUrl: pathToFileURL(`${path.join(pdfjsPackageRoot, "standard_fonts")}${path.sep}`).href,
}).promise;
const lastPage = lastPageArgument ?? document.numPages;
invariant(Number.isInteger(lastPage) && lastPage <= document.numPages && lastPage >= firstPage, "LAST_PAGE_INVALID");

const pages = [];
for (let pageNumber = firstPage; pageNumber <= lastPage; pageNumber += 1) {
  const page = await document.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const canvasContext = canvas.getContext("2d");
  await page.render({ canvasContext, viewport }).promise;
  const png = canvas.toBuffer("image/png");
  const relative = `page-${String(pageNumber).padStart(4, "0")}.png`;
  writeImmutable(path.join(outputRoot, relative), png);
  pages.push({
    pageNumber,
    width: canvas.width,
    height: canvas.height,
    bytes: png.length,
    sha256: sha256(png),
    file: relative,
  });
}

const manifest = {
  schemaVersion: SCHEMA,
  sourcePdf: path.basename(sourcePdf),
  sourcePdfSha256: pdfSha256,
  sourcePdfPageCount: document.numPages,
  firstPage,
  lastPage,
  renderedPageCount: pages.length,
  scale,
  pages,
  verdict: pages.length === lastPage - firstPage + 1 ? "GREEN_OFFICIAL_PDF_PAGES_RENDERED" : "RED_RENDER_PAGE_LOSS",
};
writeImmutable(path.join(outputRoot, "RENDER_MANIFEST.json"), `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({
  verdict: manifest.verdict,
  sourcePdfSha256: manifest.sourcePdfSha256,
  sourcePdfPageCount: manifest.sourcePdfPageCount,
  renderedPageCount: manifest.renderedPageCount,
  firstPage,
  lastPage,
  scale,
  totalPngBytes: pages.reduce((sum, page) => sum + page.bytes, 0),
}, null, 2)}\n`);
