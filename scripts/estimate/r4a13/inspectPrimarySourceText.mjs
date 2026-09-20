import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const pdfPath = resolve(process.argv[2] ?? "");
const pattern = new RegExp(process.argv[3] ?? ".", "iu");
const context = Number.parseInt(process.argv[4] ?? "2500", 10);
const bytes = readFileSync(pdfPath);
const document = await getDocument({
  data: new Uint8Array(bytes),
  useSystemFonts: false,
}).promise;

process.stdout.write(`PAGES ${document.numPages}\n`);
for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
  const page = await document.getPage(pageNumber);
  const content = await page.getTextContent();
  const text = content.items
    .map((item) => String(item.str ?? ""))
    .join(" ")
    .replace(/\s+/gu, " ")
    .trim();
  if (pattern.test(text)) {
    process.stdout.write(`\n=== PAGE ${pageNumber} ===\n${text.slice(0, context)}\n`);
  }
}
