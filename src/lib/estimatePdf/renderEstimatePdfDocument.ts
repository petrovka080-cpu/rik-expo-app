import type { EstimatePdfDocument, EstimatePdfViewModel } from "./estimatePdfTypes";

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const LEFT = 36;
const TOP = 806;
const LINE_HEIGHT = 12;
const FONT_SIZE = 8;
const LINES_PER_PAGE = 62;
const MAX_LINE_LENGTH = 112;

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

function encodePdfTextHex(value: string): string {
  let hex = "";
  for (const char of Array.from(value)) {
    const codePoint = char.codePointAt(0) ?? 0x20;
    if (codePoint > 0xffff) {
      hex += "003F";
    } else {
      hex += codePoint.toString(16).toUpperCase().padStart(4, "0");
    }
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
      return `BT /F1 ${FONT_SIZE} Tf 1 0 0 1 ${LEFT} ${y} Tm <${encodePdfTextHex(line)}> Tj ET`;
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

  const pageRefs: number[] = [];
  for (const pageLines of pages) {
    const content = buildContentStream(pageLines);
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
          row.sourceLabels.join("; ") || `confidence ${row.confidence}`,
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
    "Источники и точность",
    ...(viewModel.sources.length ? viewModel.sources : ["Источник не указан"]),
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

export function renderEstimatePdfDocument(viewModel: EstimatePdfViewModel): EstimatePdfDocument {
  const pdfId = stablePdfId(`${viewModel.estimateId}:${viewModel.generatedAt}`);
  return renderTextPdfDocument({
    pdfId,
    title: viewModel.title,
    fileName: safeFileName(`${viewModel.workKey}_${viewModel.estimateId}`),
    lines: buildEstimatePdfTextLines(viewModel),
  });
}

export function pdfBytesToBody(bytes: Uint8Array): string {
  return bytesToAscii(bytes);
}
