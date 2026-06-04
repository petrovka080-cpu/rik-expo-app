import type { EstimatePdfDocument, EstimatePdfViewModel } from "./estimatePdfTypes";
import { buildEmbeddedInterPdfFontObjects, collectPdfTextCodePoints, encodePdfInterGlyphTextHex } from "../pdf/embeddedPdfFont";
import { buildPdfTextOperators } from "../pdf/pdfTextEncoding";

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const LEFT = 36;
const TOP = 806;
const BOTTOM = 46;
const LINE_HEIGHT = 12;
const FONT_SIZE = 8;
const SMALL_FONT = 7;
const SECTION_FONT = 10;
const HEADER_FONT = 16;
const ROW_HEIGHT = 22;
const TABLE_HEADER_HEIGHT = 18;
const LINES_PER_PAGE = 62;
const MAX_LINE_LENGTH = 112;

const ESTIMATE_TABLE_COLUMNS = [
  { key: "rowNumber", title: "#", width: 24, align: "center" },
  { key: "name", title: "Наименование", width: 190, align: "left" },
  { key: "quantity", title: "Кол-во", width: 54, align: "right" },
  { key: "unitPrice", title: "Цена", width: 62, align: "right" },
  { key: "total", title: "Сумма", width: 62, align: "right" },
  { key: "source", title: "Источник", width: 130, align: "left" },
] as const;

const ESTIMATE_TABLE_WIDTH = ESTIMATE_TABLE_COLUMNS.reduce((sum, column) => sum + column.width, 0);

type TextPdfInput = {
  pdfId: string;
  title: string;
  fileName: string;
  lines: string[];
};

function stablePdfId(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  }
  return `estimate_pdf_${Math.abs(hash)}`;
}

function safeFileName(value: string): string {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
  return `${normalized || "estimate"}.pdf`;
}

function wrapLine(line: string): string[] {
  if (line.length <= MAX_LINE_LENGTH) return [line];
  const words = line.split(/\s+/);
  const result: string[] = [];
  let current = "";
  for (const word of words) {
    if (!current) {
      current = word;
      continue;
    }
    if (`${current} ${word}`.length > MAX_LINE_LENGTH) {
      result.push(current);
      current = word;
    } else {
      current = `${current} ${word}`;
    }
  }
  if (current) result.push(current);
  return result.length > 0 ? result : [line.slice(0, MAX_LINE_LENGTH)];
}

function normalizeLine(value: unknown): string {
  return String(value ?? "")
    .replace(/\r/g, "")
    .replace(/\t/g, " ")
    .replace(/\s+$/g, "");
}

function asciiToBytes(value: string): Uint8Array {
  const bytes = new Uint8Array(value.length);
  for (let index = 0; index < value.length; index += 1) {
    bytes[index] = value.charCodeAt(index) & 0xff;
  }
  return bytes;
}

function bytesToAscii(bytes: Uint8Array): string {
  let result = "";
  const chunkSize = 8192;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.slice(index, index + chunkSize);
    result += String.fromCharCode(...chunk);
  }
  return result;
}

export function bytesToBase64(bytes: Uint8Array): string {
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

function uniqueCodePoints(lines: string[]): number[] {
  const points = new Set<number>();
  for (const char of Array.from(lines.join("\n"))) {
    const codePoint = char.codePointAt(0);
    if (codePoint !== undefined && codePoint <= 0xffff) points.add(codePoint);
  }
  points.add(0x20);
  return [...points].sort((left, right) => left - right);
}

function buildToUnicodeCMap(lines: string[]): string {
  const points = uniqueCodePoints(lines);
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
    "/CMapName /EstimatePdfUnicode def",
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

function buildContentStream(lines: string[]): string {
  return [
    "q",
    ...lines.map((line, index) => {
      const y = TOP - (index * LINE_HEIGHT);
      return buildPdfTextOperators({ x: LEFT, y, size: FONT_SIZE, visibleText: line, visibleTextHex: encodePdfInterGlyphTextHex(line) });
    }),
    "Q",
  ].join("\n");
}

function chunkPages(lines: string[]): string[][] {
  const pages: string[][] = [];
  for (let index = 0; index < lines.length; index += LINES_PER_PAGE) {
    pages.push(lines.slice(index, index + LINES_PER_PAGE));
  }
  return pages.length > 0 ? pages : [[""]];
}

function renderPdfBody(input: TextPdfInput): { body: string; bytes: Uint8Array; text: string } {
  const preparedLines = input.lines
    .flatMap((line) => wrapLine(normalizeLine(line)))
    .slice(0, LINES_PER_PAGE * 6);
  const pages = chunkPages(preparedLines);
  const objects: { id: number; body: string }[] = [
    { id: 1, body: "<< /Type /Catalog /Pages 2 0 R >>" },
    { id: 2, body: "" },
    {
      id: 3,
      body: "<< /Type /FontDescriptor /FontName /Helvetica /Flags 4 /FontBBox [-166 -225 1000 931] /ItalicAngle 0 /Ascent 718 /Descent -207 /CapHeight 718 /StemV 88 >>",
    },
  ];
  const toUnicode = buildToUnicodeCMap(preparedLines);
  objects.push({ id: 4, body: `<< /Length ${toUnicode.length} >>\nstream\n${toUnicode}\nendstream` });
  objects.push({
    id: 5,
    body: "<< /Type /Font /Subtype /CIDFontType2 /BaseFont /Helvetica /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor 3 0 R /CIDToGIDMap /Identity /DW 500 >>",
  });
  objects.push({
    id: 6,
    body: "<< /Type /Font /Subtype /Type0 /BaseFont /Helvetica /Encoding /Identity-H /DescendantFonts [5 0 R] /ToUnicode 4 0 R >>",
  });
  objects.push(...buildEmbeddedInterPdfFontObjects({
    descriptorId: 7,
    fontFileId: 8,
    cidToGidMapId: 9,
    cidFontId: 10,
    type0FontId: 11,
    codePoints: collectPdfTextCodePoints(preparedLines),
  }));

  const pageRefs: number[] = [];
  for (const pageLines of pages) {
    const content = buildContentStream(pageLines);
    const contentId = objects.length + 1;
    objects.push({ id: contentId, body: `<< /Length ${content.length} >>\nstream\n${content}\nendstream` });
    const pageId = objects.length + 1;
    pageRefs.push(pageId);
    objects.push({
      id: pageId,
      body: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 6 0 R /F2 11 0 R >> >> /Contents ${contentId} 0 R >>`,
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
  const bytes = asciiToBytes(body);
  return {
    body,
    bytes,
    text: preparedLines.join("\n"),
  };
}

export function renderTextPdfDocument(input: TextPdfInput): EstimatePdfDocument {
  const rendered = renderPdfBody(input);
  const base64 = bytesToBase64(rendered.bytes);
  return {
    pdfId: input.pdfId,
    title: input.title,
    fileName: input.fileName,
    contentType: "application/pdf",
    bytes: rendered.bytes,
    body: rendered.body,
    base64,
    dataUri: `data:application/pdf;base64,${base64}`,
    text: rendered.text,
  };
}

export function buildEstimatePdfTextLines(viewModel: EstimatePdfViewModel): string[] {
  const trace = viewModel.runtimeTrace;
  return [
    viewModel.title,
    `ID сметы: ${viewModel.estimateId}`,
    `Код работы: ${viewModel.workKey}`,
    `Работа: ${viewModel.workTitle}`,
    viewModel.originalText ? `Запрос: ${viewModel.originalText}` : null,
    `Дата: ${viewModel.generatedAt}`,
    "",
    "Таблица сметы",
    "№ | Раздел | Наименование | Кол-во | Цена за ед. | Всего | Источник",
    ...viewModel.sections.flatMap((section) => [
      `${section.sectionNumber} | ${section.title}`,
      ...section.rows.map((row) =>
        [
          row.rowNumber,
          row.sectionTitle,
          row.name,
          row.quantity,
          row.unitPrice,
          row.total,
          row.sourceLabels[0] ?? "Источник не указан",
        ].join(" | "),
      ),
    ]),
    "",
    "Итого",
    `Материалы: ${viewModel.totals.materials}`,
    `Работы: ${viewModel.totals.labor}`,
    `Налог: ${viewModel.totals.tax}`,
    `Общий итог: ${viewModel.totals.grand}`,
    "",
    "Налоговый статус",
    [
      viewModel.tax.label,
      viewModel.tax.rate ? `ставка ${viewModel.tax.rate}` : null,
      viewModel.tax.included ? "включен в цену" : "добавлен к итогу",
      `сумма ${viewModel.tax.amount}`,
      viewModel.tax.warning,
    ].filter(Boolean).join("; "),
    "",
    "Допущения",
    ...(viewModel.assumptions.length ? viewModel.assumptions : ["Нет допущений"]),
    "",
    "Факторы удорожания",
    ...(viewModel.costIncreaseFactors.length ? viewModel.costIncreaseFactors : ["Нет факторов"]),
    "",
    "Вопросы для уточнения",
    ...(viewModel.clarifyingQuestions.length ? viewModel.clarifyingQuestions : ["Нет вопросов"]),
    "",
    "Runtime trace",
    `traceId: ${String(trace.traceId ?? "not-recorded")}`,
    `selectedTool: ${String(trace.selectedTool ?? "calculate_global_estimate")}`,
    `route: ${String(trace.selectedRoute ?? "estimate")}`,
  ].filter((line): line is string => line !== null);
}

type StructuredPdfPage = {
  ops: string[];
  texts: string[];
};

type EstimatePdfTableRow = EstimatePdfViewModel["sections"][number]["rows"][number];
type EstimatePdfTableColumnKey = (typeof ESTIMATE_TABLE_COLUMNS)[number]["key"];

function startStructuredPage(pages: StructuredPdfPage[]): StructuredPdfPage {
  const page = { ops: ["q"], texts: [] };
  pages.push(page);
  return page;
}

function finishStructuredPages(pages: StructuredPdfPage[]): void {
  for (const page of pages) {
    if (page.ops[page.ops.length - 1] !== "Q") page.ops.push("Q");
  }
}

function showStructuredText(page: StructuredPdfPage, x: number, y: number, text: string, size = FONT_SIZE): void {
  const clean = String(text ?? "").replace(/\r/g, " ").replace(/\t/g, " ").replace(/\s+/g, " ").trim() || " ";
  page.texts.push(clean);
  page.ops.push(buildPdfTextOperators({ x, y, size, visibleText: clean, visibleTextHex: encodePdfInterGlyphTextHex(clean) }));
}

function drawStructuredRect(page: StructuredPdfPage, x: number, y: number, width: number, height: number): void {
  page.ops.push(`0.55 w ${x} ${y} ${width} ${height} re S`);
}

function fillStructuredRect(page: StructuredPdfPage, x: number, y: number, width: number, height: number, shade = "0.94 0.94 0.94"): void {
  page.ops.push(`q ${shade} rg ${x} ${y} ${width} ${height} re f Q`);
}

function drawStructuredLine(page: StructuredPdfPage, x1: number, y1: number, x2: number, y2: number): void {
  page.ops.push(`0.55 w ${x1} ${y1} m ${x2} ${y2} l S`);
}

function addStructuredSectionTitle(page: StructuredPdfPage, y: number, title: string): number {
  showStructuredText(page, LEFT, y, title, SECTION_FONT);
  drawStructuredLine(page, LEFT, y - 4, LEFT + ESTIMATE_TABLE_WIDTH, y - 4);
  return y - 18;
}

function addStructuredParagraphList(page: StructuredPdfPage, y: number, lines: string[], maxLines: number): number {
  for (const line of lines.slice(0, maxLines)) {
    showStructuredText(page, LEFT + 8, y, `- ${line}`, SMALL_FONT);
    y -= 11;
  }
  return y;
}

function allEstimatePdfRows(viewModel: EstimatePdfViewModel): EstimatePdfTableRow[] {
  return viewModel.sections.flatMap((section) => section.rows);
}

function fitMetaValue(value: string): string {
  const clean = String(value ?? "").replace(/\s+/g, " ").trim();
  if (clean.length <= 58) return clean;
  return `${clean.slice(0, 55).trimEnd()}...`;
}

function drawMetaFields(page: StructuredPdfPage, x: number, y: number, fields: { label: string; value: string }[], maxRows: number): void {
  fields.slice(0, maxRows).forEach((field, index) => {
    showStructuredText(page, x, y - index * 13, `${field.label}: ${fitMetaValue(field.value)}`, FONT_SIZE);
  });
}

function estimatePdfCellValue(row: EstimatePdfTableRow, columnKey: EstimatePdfTableColumnKey): string {
  if (columnKey === "rowNumber") return row.rowNumber;
  if (columnKey === "name") return row.name;
  if (columnKey === "quantity") return row.quantity;
  if (columnKey === "unitPrice") return row.unitPrice;
  if (columnKey === "total") return row.total;
  if (columnKey === "source") return row.sourceLabels[0] ?? "Источник не указан";
  return "";
}

function fitEstimatePdfCellText(value: string, width: number): string {
  const clean = String(value ?? "").replace(/\s+/g, " ").trim();
  const max = Math.max(4, Math.floor((width - 8) / 4.4));
  if (clean.length <= max) return clean;
  return `${clean.slice(0, Math.max(1, max - 3)).trimEnd()}...`;
}

function drawStructuredTableHeader(page: StructuredPdfPage, y: number): number {
  let x = LEFT;
  fillStructuredRect(page, x, y - TABLE_HEADER_HEIGHT, ESTIMATE_TABLE_WIDTH, TABLE_HEADER_HEIGHT, "0.90 0.92 0.94");
  for (const column of ESTIMATE_TABLE_COLUMNS) {
    drawStructuredRect(page, x, y - TABLE_HEADER_HEIGHT, column.width, TABLE_HEADER_HEIGHT);
    const approxWidth = column.title.length * 3.6;
    const textX =
      column.align === "right"
        ? x + column.width - 6 - approxWidth
        : column.align === "center"
          ? x + Math.max(4, (column.width - approxWidth) / 2)
          : x + 4;
    showStructuredText(page, Math.max(x + 4, textX), y - 12, column.title, SMALL_FONT);
    x += column.width;
  }
  return y - TABLE_HEADER_HEIGHT;
}

function drawStructuredTableRow(page: StructuredPdfPage, y: number, row: EstimatePdfTableRow): number {
  let x = LEFT;
  page.texts.push(row.name);
  for (const column of ESTIMATE_TABLE_COLUMNS) {
    drawStructuredRect(page, x, y - ROW_HEIGHT, column.width, ROW_HEIGHT);
    const value = fitEstimatePdfCellText(estimatePdfCellValue(row, column.key), column.width);
    const approxWidth = value.length * 3.7;
    const textX =
      column.align === "right"
        ? x + column.width - 5 - approxWidth
        : column.align === "center"
          ? x + Math.max(4, (column.width - approxWidth) / 2)
          : x + 4;
    showStructuredText(page, Math.max(x + 4, textX), y - 13, value, SMALL_FONT);
    x += column.width;
  }
  return y - ROW_HEIGHT;
}

function buildStructuredEstimatePages(viewModel: EstimatePdfViewModel): StructuredPdfPage[] {
  const pages: StructuredPdfPage[] = [];
  let page = startStructuredPage(pages);
  let y = TOP;

  showStructuredText(page, LEFT, y, viewModel.title, HEADER_FONT);
  y -= 18;
  showStructuredText(page, LEFT, y, viewModel.originalText ? `Запрос: ${viewModel.originalText}` : viewModel.workTitle, SECTION_FONT);
  y -= 16;

  const metaRows = Math.max(4, Math.min(7, viewModel.requestMetaFields.length));
  const metaBoxHeight = 22 + metaRows * 13;
  drawStructuredRect(page, LEFT, y - metaBoxHeight, ESTIMATE_TABLE_WIDTH, metaBoxHeight);
  showStructuredText(page, LEFT + 10, y - 14, `ID сметы: ${viewModel.estimateId}`, FONT_SIZE);
  drawMetaFields(page, LEFT + 10, y - 30, viewModel.requestMetaFields, metaRows);
  drawMetaFields(
    page,
    LEFT + 314,
    y - 14,
    [
      { label: "Материалы", value: viewModel.totals.materials },
      { label: "Работы", value: viewModel.totals.labor },
      { label: "Налог", value: viewModel.totals.tax },
      { label: "Итого", value: viewModel.totals.grand },
    ],
    4,
  );
  y -= metaBoxHeight + 20;

  y = addStructuredSectionTitle(page, y, "Таблица сметы");
  y = drawStructuredTableHeader(page, y);

  for (const section of viewModel.sections) {
    if (y - ROW_HEIGHT < BOTTOM + 120) {
      page = startStructuredPage(pages);
      y = TOP;
      showStructuredText(page, LEFT, y, `${viewModel.title} - продолжение`, SECTION_FONT);
      y -= 22;
      y = drawStructuredTableHeader(page, y);
    }
    fillStructuredRect(page, LEFT, y - 16, ESTIMATE_TABLE_WIDTH, 16, "0.96 0.97 0.98");
    drawStructuredRect(page, LEFT, y - 16, ESTIMATE_TABLE_WIDTH, 16);
    showStructuredText(page, LEFT + 6, y - 11, `${section.sectionNumber}. ${section.title}`, SMALL_FONT);
    y -= 16;
    for (const row of section.rows) {
      if (y - ROW_HEIGHT < BOTTOM + 120) {
        page = startStructuredPage(pages);
        y = TOP;
        showStructuredText(page, LEFT, y, `${viewModel.title} - продолжение`, SECTION_FONT);
        y -= 22;
        y = drawStructuredTableHeader(page, y);
      }
      y = drawStructuredTableRow(page, y, row);
    }
  }

  if (y < BOTTOM + 188) {
    page = startStructuredPage(pages);
    y = TOP;
  } else {
    y -= 14;
  }

  y = addStructuredSectionTitle(page, y, "Итоги");
  [
    ["Материалы", viewModel.totals.materials],
    ["Работы", viewModel.totals.labor],
    ["Налог", viewModel.totals.tax],
    ["Общий итог", viewModel.totals.grand],
  ].forEach(([label, value], index) => {
    const rowY = y - index * 18;
    fillStructuredRect(page, LEFT, rowY - 15, 260, 18, index === 3 ? "0.88 0.91 0.88" : "0.97 0.97 0.97");
    drawStructuredRect(page, LEFT, rowY - 15, 260, 18);
    showStructuredText(page, LEFT + 8, rowY - 10, label, FONT_SIZE);
    showStructuredText(page, LEFT + 150, rowY - 10, value, FONT_SIZE);
  });
  y -= 88;

  y = addStructuredSectionTitle(page, y, "Налог и точность");
  showStructuredText(
    page,
    LEFT + 8,
    y,
    `${viewModel.tax.label}; ${viewModel.tax.rate ? `ставка ${viewModel.tax.rate}; ` : ""}${viewModel.tax.included ? "включён в цену" : "добавлен к итогу"}; сумма ${viewModel.tax.amount}`,
    FONT_SIZE,
  );
  y -= 12;
  if (viewModel.tax.warning) {
    showStructuredText(page, LEFT + 8, y, viewModel.tax.warning, SMALL_FONT);
    y -= 12;
  }
  y = addStructuredSectionTitle(page, y, "Что уточнить");
  y = addStructuredParagraphList(page, y, viewModel.clarifyingQuestions.length ? viewModel.clarifyingQuestions : ["Нет вопросов"], 4) - 8;

  const fullNameRows = allEstimatePdfRows(viewModel);
  if (fullNameRows.length > 0) {
    if (y < BOTTOM + 70) {
      page = startStructuredPage(pages);
      y = TOP;
    }
    y = addStructuredSectionTitle(page, y, "Полные наименования строк");
    for (const row of fullNameRows) {
      if (y < BOTTOM + 24) {
        page = startStructuredPage(pages);
        y = TOP;
        y = addStructuredSectionTitle(page, y, "Полные наименования строк - продолжение");
      }
      showStructuredText(page, LEFT + 8, y, `${row.rowNumber} ${row.name}`, SMALL_FONT);
      y -= 10;
    }
  }

  pages.forEach((pdfPage, index) => {
    showStructuredText(pdfPage, LEFT, 24, `Смета | ${viewModel.estimateId} | стр. ${index + 1}/${pages.length}`, SMALL_FONT);
    showStructuredText(pdfPage, LEFT + 340, 24, `trace: ${String(viewModel.runtimeTrace.traceId ?? "not-recorded")}`, SMALL_FONT);
  });
  finishStructuredPages(pages);
  return pages;
}

function renderStructuredPdfBody(pages: StructuredPdfPage[]): { body: string; bytes: Uint8Array; text: string } {
  const objects: { id: number; body: string }[] = [
    { id: 1, body: "<< /Type /Catalog /Pages 2 0 R >>" },
    { id: 2, body: "" },
    {
      id: 3,
      body: "<< /Type /FontDescriptor /FontName /Helvetica /Flags 4 /FontBBox [-166 -225 1000 931] /ItalicAngle 0 /Ascent 718 /Descent -207 /CapHeight 718 /StemV 88 >>",
    },
  ];
  const allText = pages.flatMap((page) => page.texts);
  const toUnicode = buildToUnicodeCMap(allText);
  objects.push({ id: 4, body: `<< /Length ${toUnicode.length} >>\nstream\n${toUnicode}\nendstream` });
  objects.push({
    id: 5,
    body: "<< /Type /Font /Subtype /CIDFontType2 /BaseFont /Helvetica /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor 3 0 R /CIDToGIDMap /Identity /DW 500 >>",
  });
  objects.push({
    id: 6,
    body: "<< /Type /Font /Subtype /Type0 /BaseFont /Helvetica /Encoding /Identity-H /DescendantFonts [5 0 R] /ToUnicode 4 0 R >>",
  });
  objects.push(...buildEmbeddedInterPdfFontObjects({
    descriptorId: 7,
    fontFileId: 8,
    cidToGidMapId: 9,
    cidFontId: 10,
    type0FontId: 11,
    codePoints: collectPdfTextCodePoints(allText),
  }));

  const pageRefs: number[] = [];
  for (const pageItem of pages) {
    const content = pageItem.ops.join("\n");
    const contentId = objects.length + 1;
    objects.push({ id: contentId, body: `<< /Length ${content.length} >>\nstream\n${content}\nendstream` });
    const pageId = objects.length + 1;
    pageRefs.push(pageId);
    objects.push({
      id: pageId,
      body: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 6 0 R /F2 11 0 R >> >> /Contents ${contentId} 0 R >>`,
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

export function renderEstimatePdfDocument(viewModel: EstimatePdfViewModel): EstimatePdfDocument {
  const pdfId = stablePdfId(`${viewModel.estimateId}:${viewModel.generatedAt}`);
  const rendered = renderStructuredPdfBody(buildStructuredEstimatePages(viewModel));
  const base64 = bytesToBase64(rendered.bytes);
  return {
    pdfId,
    title: viewModel.title,
    fileName: safeFileName(`${viewModel.workKey}_${viewModel.estimateId}`),
    contentType: "application/pdf",
    bytes: rendered.bytes,
    body: rendered.body,
    base64,
    dataUri: `data:application/pdf;base64,${base64}`,
    text: rendered.text,
  };
}

export function pdfBytesToBody(bytes: Uint8Array): string {
  return bytesToAscii(bytes);
}
