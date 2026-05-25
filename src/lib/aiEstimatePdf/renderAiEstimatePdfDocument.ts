import type { AiEstimatePdfDocument, AiEstimatePdfViewModel } from "./aiEstimatePdfTypes";
import {
  AI_ESTIMATE_PDF_TABLE_COLUMNS,
  aiEstimatePdfCellValue,
  aiEstimatePdfTableWidth,
  fitAiEstimatePdfCellText,
} from "./renderAiEstimatePdfTable";

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const LEFT = 36;
const TOP = 806;
const BOTTOM = 46;
const BODY_FONT = 8;
const SMALL_FONT = 7;
const HEADER_FONT = 16;
const SECTION_FONT = 10;
const ROW_HEIGHT = 22;
const TABLE_HEADER_HEIGHT = 18;

type Page = {
  ops: string[];
  texts: string[];
};

function stablePdfId(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  }
  return `ai_estimate_pdf_${Math.abs(hash)}`;
}

function safeFileName(value: string): string {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 86);
  return `${normalized || "ai_estimate"}.pdf`;
}

function encodePdfTextHex(value: string): string {
  let hex = "";
  for (const char of Array.from(value || " ")) {
    const codePoint = char.codePointAt(0) ?? 0x20;
    hex += codePoint > 0xffff ? "003F" : codePoint.toString(16).toUpperCase().padStart(4, "0");
  }
  return hex || "0020";
}

function asciiToBytes(value: string): Uint8Array {
  const bytes = new Uint8Array(value.length);
  for (let index = 0; index < value.length; index += 1) {
    bytes[index] = value.charCodeAt(index) & 0xff;
  }
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let output = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index];
    const b = index + 1 < bytes.length ? bytes[index + 1] : 0;
    const c = index + 2 < bytes.length ? bytes[index + 2] : 0;
    const triplet = (a << 16) | (b << 8) | c;
    output += alphabet[(triplet >> 18) & 63];
    output += alphabet[(triplet >> 12) & 63];
    output += index + 1 < bytes.length ? alphabet[(triplet >> 6) & 63] : "=";
    output += index + 2 < bytes.length ? alphabet[triplet & 63] : "=";
  }
  return output;
}

function showText(page: Page, x: number, y: number, text: string, size = BODY_FONT): void {
  const clean = String(text ?? "").replace(/\r/g, " ").replace(/\t/g, " ").trim() || " ";
  page.texts.push(clean);
  page.ops.push(`BT /F1 ${size} Tf 1 0 0 1 ${x} ${y} Tm <${encodePdfTextHex(clean)}> Tj ET`);
}

function drawRect(page: Page, x: number, y: number, width: number, height: number): void {
  page.ops.push(`0.55 w ${x} ${y} ${width} ${height} re S`);
}

function fillRect(page: Page, x: number, y: number, width: number, height: number, shade = "0.94 0.94 0.94"): void {
  page.ops.push(`q ${shade} rg ${x} ${y} ${width} ${height} re f Q`);
}

function drawLine(page: Page, x1: number, y1: number, x2: number, y2: number): void {
  page.ops.push(`0.55 w ${x1} ${y1} m ${x2} ${y2} l S`);
}

function uniqueCodePoints(pages: Page[]): number[] {
  const points = new Set<number>();
  for (const char of Array.from(pages.flatMap((page) => page.texts).join("\n"))) {
    const codePoint = char.codePointAt(0);
    if (codePoint !== undefined && codePoint <= 0xffff) points.add(codePoint);
  }
  points.add(0x20);
  return [...points].sort((left, right) => left - right);
}

function buildToUnicodeCMap(pages: Page[]): string {
  const points = uniqueCodePoints(pages);
  const chunks: string[] = [];
  for (let start = 0; start < points.length; start += 100) {
    const chunk = points.slice(start, start + 100);
    chunks.push(`${chunk.length} beginbfchar`);
    for (const point of chunk) {
      const hex = point.toString(16).toUpperCase().padStart(4, "0");
      chunks.push(`<${hex}> <${hex}>`);
    }
    chunks.push("endbfchar");
  }
  return [
    "/CIDInit /ProcSet findresource begin",
    "12 dict begin",
    "begincmap",
    "/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def",
    "/CMapName /AiEstimatePdfUnicode def",
    "/CMapType 2 def",
    "1 begincodespacerange",
    "<0000> <FFFF>",
    "endcodespacerange",
    ...chunks,
    "endcmap",
    "CMapName currentdict /CMap defineresource pop",
    "end",
    "end",
  ].join("\n");
}

function startPage(pages: Page[]): Page {
  const page = { ops: ["q"], texts: [] };
  pages.push(page);
  return page;
}

function finishPages(pages: Page[]): void {
  for (const page of pages) {
    if (page.ops[page.ops.length - 1] !== "Q") page.ops.push("Q");
  }
}

function addSectionTitle(page: Page, y: number, title: string): number {
  showText(page, LEFT, y, title, SECTION_FONT);
  drawLine(page, LEFT, y - 4, LEFT + aiEstimatePdfTableWidth(), y - 4);
  return y - 18;
}

function addParagraphList(page: Page, y: number, lines: string[], maxLines: number): number {
  for (const line of lines.slice(0, maxLines)) {
    showText(page, LEFT + 8, y, `- ${line}`, SMALL_FONT);
    y -= 11;
  }
  return y;
}

function drawTableHeader(page: Page, y: number): number {
  let x = LEFT;
  fillRect(page, x, y - TABLE_HEADER_HEIGHT, aiEstimatePdfTableWidth(), TABLE_HEADER_HEIGHT, "0.90 0.92 0.94");
  for (const column of AI_ESTIMATE_PDF_TABLE_COLUMNS) {
    drawRect(page, x, y - TABLE_HEADER_HEIGHT, column.width, TABLE_HEADER_HEIGHT);
    const textX = column.align === "right" ? x + column.width - 8 - (column.title.length * 3.6) : x + 4;
    showText(page, Math.max(x + 4, textX), y - 12, column.title, SMALL_FONT);
    x += column.width;
  }
  return y - TABLE_HEADER_HEIGHT;
}

function drawTableRow(page: Page, y: number, row: AiEstimatePdfViewModel["rows"][number]): number {
  let x = LEFT;
  for (const column of AI_ESTIMATE_PDF_TABLE_COLUMNS) {
    drawRect(page, x, y - ROW_HEIGHT, column.width, ROW_HEIGHT);
    const value = fitAiEstimatePdfCellText(aiEstimatePdfCellValue(row, column), column.width);
    const approxWidth = value.length * 3.7;
    const textX =
      column.align === "right"
        ? x + column.width - 5 - approxWidth
        : column.align === "center"
          ? x + Math.max(4, (column.width - approxWidth) / 2)
          : x + 4;
    showText(page, Math.max(x + 4, textX), y - 13, value, SMALL_FONT);
    x += column.width;
  }
  return y - ROW_HEIGHT;
}

function buildPages(viewModel: AiEstimatePdfViewModel): Page[] {
  const pages: Page[] = [];
  let page = startPage(pages);
  let y = TOP;

  showText(page, LEFT, y, viewModel.title, HEADER_FONT);
  showText(page, LEFT + 372, y + 2, viewModel.status, SECTION_FONT);
  y -= 20;
  showText(page, LEFT, y, `${viewModel.work.title} | ${viewModel.work.inputVolume}`, SECTION_FONT);
  y -= 16;
  drawRect(page, LEFT, y - 70, aiEstimatePdfTableWidth(), 70);
  const leftMeta = viewModel.metadata.slice(0, 4);
  const rightMeta = viewModel.metadata.slice(4, 8);
  leftMeta.forEach((item, index) => showText(page, LEFT + 10, y - 14 - index * 13, `${item.label}: ${item.value}`, BODY_FONT));
  rightMeta.forEach((item, index) => showText(page, LEFT + 278, y - 14 - index * 13, `${item.label}: ${item.value}`, BODY_FONT));
  y -= 90;

  y = addSectionTitle(page, y, "Допущения");
  y = addParagraphList(page, y, viewModel.assumptions, 4) - 8;
  y = addSectionTitle(page, y, "Разделы");
  y = addParagraphList(page, y, ["Материалы", "Работы", "Оборудование / доставка / предупреждения"], 3) - 8;
  y = addSectionTitle(page, y, "Таблица сметы");
  y = drawTableHeader(page, y);
  for (const row of viewModel.rows) {
    if (y - ROW_HEIGHT < BOTTOM + 112) {
      page = startPage(pages);
      y = TOP;
      showText(page, LEFT, y, `${viewModel.title} - продолжение`, SECTION_FONT);
      y -= 22;
      y = drawTableHeader(page, y);
    }
    y = drawTableRow(page, y, row);
  }

  if (y < BOTTOM + 170) {
    page = startPage(pages);
    y = TOP;
  } else {
    y -= 14;
  }

  y = addSectionTitle(page, y, "Итоги");
  const totalBoxWidth = 250;
  viewModel.totals.forEach((total, index) => {
    const rowY = y - index * 18;
    fillRect(page, LEFT, rowY - 15, totalBoxWidth, 18, index === viewModel.totals.length - 1 ? "0.88 0.91 0.88" : "0.97 0.97 0.97");
    drawRect(page, LEFT, rowY - 15, totalBoxWidth, 18);
    showText(page, LEFT + 8, rowY - 10, total.label, BODY_FONT);
    showText(page, LEFT + 145, rowY - 10, total.value, BODY_FONT);
  });
  y -= viewModel.totals.length * 18 + 12;

  y = addSectionTitle(page, y, "Налог / источники / точность");
  showText(page, LEFT + 8, y, "Налоговый статус", BODY_FONT);
  y -= 12;
  showText(page, LEFT + 8, y, `${viewModel.tax.label}: ${viewModel.tax.rate}; ${viewModel.tax.included}; сумма ${viewModel.tax.amount}`, BODY_FONT);
  y -= 12;
  showText(page, LEFT + 8, y, viewModel.tax.warning, BODY_FONT);
  y -= 14;
  showText(page, LEFT + 8, y, `Точность расчёта: ${viewModel.confidence}`, BODY_FONT);
  y -= 12;
  showText(page, LEFT + 8, y, "Источники", BODY_FONT);
  y -= 12;
  y = addParagraphList(page, y, viewModel.sources, 4) - 4;

  y = addSectionTitle(page, y, "Что уточнить");
  y = addParagraphList(page, y, viewModel.clarifyingQuestions, 4) - 8;

  y = addSectionTitle(page, y, "Подписание");
  for (const line of viewModel.footer) {
    showText(page, LEFT + 8, y, line, SMALL_FONT);
    y -= 14;
  }

  pages.forEach((pdfPage, index) => {
    showText(pdfPage, LEFT, 24, `Смета | ${viewModel.documentNumber} | стр. ${index + 1}/${pages.length}`, SMALL_FONT);
    showText(pdfPage, LEFT + 332, 24, `Служебный ID: ${viewModel.runtimeTraceId}`, SMALL_FONT);
  });
  finishPages(pages);
  return pages;
}

function renderPdfBody(pages: Page[]): { body: string; bytes: Uint8Array; text: string } {
  const objects: { id: number; body: string }[] = [
    { id: 1, body: "<< /Type /Catalog /Pages 2 0 R >>" },
    { id: 2, body: "" },
    {
      id: 3,
      body: "<< /Type /FontDescriptor /FontName /Helvetica /Flags 4 /FontBBox [-166 -225 1000 931] /ItalicAngle 0 /Ascent 718 /Descent -207 /CapHeight 718 /StemV 88 >>",
    },
  ];
  const toUnicode = buildToUnicodeCMap(pages);
  objects.push({ id: 4, body: `<< /Length ${toUnicode.length} >>\nstream\n${toUnicode}\nendstream` });
  objects.push({
    id: 5,
    body: "<< /Type /Font /Subtype /CIDFontType2 /BaseFont /Helvetica /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor 3 0 R /CIDToGIDMap /Identity /DW 500 >>",
  });
  objects.push({
    id: 6,
    body: "<< /Type /Font /Subtype /Type0 /BaseFont /Helvetica /Encoding /Identity-H /DescendantFonts [5 0 R] /ToUnicode 4 0 R >>",
  });

  const pageRefs: number[] = [];
  for (const pageItem of pages) {
    const content = pageItem.ops.join("\n");
    const contentId = objects.length + 1;
    objects.push({ id: contentId, body: `<< /Length ${content.length} >>\nstream\n${content}\nendstream` });
    const pageId = objects.length + 1;
    pageRefs.push(pageId);
    objects.push({
      id: pageId,
      body: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 6 0 R >> >> /Contents ${contentId} 0 R >>`,
    });
  }
  objects[1].body = `<< /Type /Pages /Kids [${pageRefs.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageRefs.length} >>`;

  let body = "%PDF-1.7\n";
  const offsets = [0];
  for (const object of objects) {
    offsets[object.id] = body.length;
    body += `${object.id} 0 obj\n${object.body}\nendobj\n`;
  }
  const xrefOffset = body.length;
  body += `xref\n0 ${objects.length + 1}\n`;
  body += "0000000000 65535 f \n";
  for (let id = 1; id <= objects.length; id += 1) {
    body += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }
  body += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return {
    body,
    bytes: asciiToBytes(body),
    text: pages.flatMap((pageItem) => pageItem.texts).join("\n"),
  };
}

export function renderAiEstimatePdfDocument(viewModel: AiEstimatePdfViewModel): Omit<AiEstimatePdfDocument, "validation" | "viewModel"> {
  const pages = buildPages(viewModel);
  const rendered = renderPdfBody(pages);
  const base64 = bytesToBase64(rendered.bytes);
  const pdfId = stablePdfId(`${viewModel.estimateId}:${viewModel.generatedAt}:option-b`);
  const fileName = safeFileName(`${viewModel.work.workKey}_${viewModel.documentNumber}`);
  return {
    pdfId,
    title: viewModel.title,
    contentType: "application/pdf",
    bytes: rendered.bytes,
    pdfBytes: rendered.bytes,
    body: rendered.body,
    base64,
    dataUri: `data:application/pdf;base64,${base64}`,
    text: rendered.text,
    mimeType: "application/pdf",
    fileName,
    documentNumber: viewModel.documentNumber,
    estimateId: viewModel.estimateId,
    rendererPath: "OPTION_B_ISOLATED_AI_ESTIMATE_RENDERER",
  };
}
