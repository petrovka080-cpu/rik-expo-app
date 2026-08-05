type WorkbookColumn = { wch: number };

type ExportAoaWorkbookWebArgs = {
  data: (string | number)[][];
  sheetName: string;
  downloadName: string;
  columns?: WorkbookColumn[];
};

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const MAX_ROWS = 10_000;
const MAX_COLUMNS = 100;
const MAX_CELLS = 500_000;
const MAX_CELL_CHARACTERS = 32_767;
const MAX_WORKSHEET_XML_BYTES = 32 * 1024 * 1024;
const UTF8_FLAG = 0x0800;
const DOS_EPOCH_DATE = 0x0021;
const encoder = new TextEncoder();

type ZipEntry = {
  name: string;
  content: Uint8Array;
};

function xmlEscape(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function canonicalSheetName(value: string): string {
  const sanitized = value
    .replace(/[\u0000-\u001F\u007F:[\]*/?\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 31);
  return sanitized || "Sheet1";
}

function canonicalDownloadName(value: string): string {
  const sanitized = value
    .replace(/[\u0000-\u001F\u007F<>:"/\\|?*]/g, "_")
    .trim()
    .slice(0, 180);
  const nonEmpty = sanitized || "export.xlsx";
  return nonEmpty.toLowerCase().endsWith(".xlsx")
    ? nonEmpty
    : `${nonEmpty}.xlsx`;
}

function columnReference(index: number): string {
  let value = index + 1;
  let result = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result;
}

function cellXml(value: string | number, rowIndex: number, columnIndex: number): string {
  const reference = `${columnReference(columnIndex)}${rowIndex + 1}`;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`XLSX_EXPORT_NON_FINITE_NUMBER:${reference}`);
    }
    return `<c r="${reference}"><v>${value}</v></c>`;
  }
  if (value.length > MAX_CELL_CHARACTERS) {
    throw new Error(`XLSX_EXPORT_CELL_TOO_LARGE:${reference}`);
  }
  // Strings are always inline text. Values beginning with =, +, - or @ are
  // therefore not interpreted as spreadsheet formulas.
  return `<c r="${reference}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;
}

function worksheetXml(args: ExportAoaWorkbookWebArgs): string {
  if (args.data.length > MAX_ROWS) {
    throw new Error(`XLSX_EXPORT_ROW_LIMIT:${args.data.length}:${MAX_ROWS}`);
  }
  const widestRow = args.data.reduce(
    (maximum, row) => Math.max(maximum, row.length),
    0,
  );
  if (widestRow > MAX_COLUMNS) {
    throw new Error(`XLSX_EXPORT_COLUMN_LIMIT:${widestRow}:${MAX_COLUMNS}`);
  }
  const cellCount = args.data.reduce((total, row) => total + row.length, 0);
  if (cellCount > MAX_CELLS) {
    throw new Error(`XLSX_EXPORT_CELL_LIMIT:${cellCount}:${MAX_CELLS}`);
  }
  if ((args.columns?.length ?? 0) > MAX_COLUMNS) {
    throw new Error(
      `XLSX_EXPORT_COLUMN_METADATA_LIMIT:${args.columns?.length ?? 0}:${MAX_COLUMNS}`,
    );
  }

  const columns = args.columns?.length
    ? `<cols>${args.columns
        .map((column, index) => {
          const width = Math.min(255, Math.max(1, Number(column.wch) || 1));
          return `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`;
        })
        .join("")}</cols>`
    : "";
  const rows = args.data
    .map(
      (row, rowIndex) =>
        `<row r="${rowIndex + 1}">${row
          .map((value, columnIndex) => cellXml(value, rowIndex, columnIndex))
          .join("")}</row>`,
    )
    .join("");
  const xml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    columns +
    `<sheetData>${rows}</sheetData>` +
    "</worksheet>";
  if (encoder.encode(xml).byteLength > MAX_WORKSHEET_XML_BYTES) {
    throw new Error(
      `XLSX_EXPORT_WORKSHEET_SIZE_LIMIT:${MAX_WORKSHEET_XML_BYTES}`,
    );
  }
  return xml;
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function uint16(value: number): Uint8Array {
  const bytes = new Uint8Array(2);
  new DataView(bytes.buffer).setUint16(0, value, true);
  return bytes;
}

function uint32(value: number): Uint8Array {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, true);
  return bytes;
}

function concatBytes(parts: readonly Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.byteLength;
  }
  return result;
}

function zipStore(entries: readonly ZipEntry[]): Uint8Array {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let localOffset = 0;

  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const checksum = crc32(entry.content);
    const localHeader = concatBytes([
      uint32(0x04034b50),
      uint16(20),
      uint16(UTF8_FLAG),
      uint16(0),
      uint16(0),
      uint16(DOS_EPOCH_DATE),
      uint32(checksum),
      uint32(entry.content.byteLength),
      uint32(entry.content.byteLength),
      uint16(name.byteLength),
      uint16(0),
      name,
    ]);
    localParts.push(localHeader, entry.content);

    centralParts.push(
      concatBytes([
        uint32(0x02014b50),
        uint16(20),
        uint16(20),
        uint16(UTF8_FLAG),
        uint16(0),
        uint16(0),
        uint16(DOS_EPOCH_DATE),
        uint32(checksum),
        uint32(entry.content.byteLength),
        uint32(entry.content.byteLength),
        uint16(name.byteLength),
        uint16(0),
        uint16(0),
        uint16(0),
        uint16(0),
        uint32(0),
        uint32(localOffset),
        name,
      ]),
    );
    localOffset += localHeader.byteLength + entry.content.byteLength;
  }

  const centralDirectory = concatBytes(centralParts);
  const endOfCentralDirectory = concatBytes([
    uint32(0x06054b50),
    uint16(0),
    uint16(0),
    uint16(entries.length),
    uint16(entries.length),
    uint32(centralDirectory.byteLength),
    uint32(localOffset),
    uint16(0),
  ]);
  return concatBytes([
    ...localParts,
    centralDirectory,
    endOfCentralDirectory,
  ]);
}

export function buildAoaXlsxWorkbook(
  args: ExportAoaWorkbookWebArgs,
): Uint8Array {
  const sheetName = canonicalSheetName(args.sheetName);
  const entries: ZipEntry[] = [
    {
      name: "[Content_Types].xml",
      content: encoder.encode(
        '<?xml version="1.0" encoding="UTF-8"?>' +
          '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
          '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
          '<Default Extension="xml" ContentType="application/xml"/>' +
          '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
          '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
          "</Types>",
      ),
    },
    {
      name: "_rels/.rels",
      content: encoder.encode(
        '<?xml version="1.0" encoding="UTF-8"?>' +
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
          "</Relationships>",
      ),
    },
    {
      name: "xl/workbook.xml",
      content: encoder.encode(
        '<?xml version="1.0" encoding="UTF-8"?>' +
          '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
          'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
          `<sheets><sheet name="${xmlEscape(sheetName)}" sheetId="1" r:id="rId1"/></sheets>` +
          "</workbook>",
      ),
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      content: encoder.encode(
        '<?xml version="1.0" encoding="UTF-8"?>' +
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
          "</Relationships>",
      ),
    },
    {
      name: "xl/worksheets/sheet1.xml",
      content: encoder.encode(worksheetXml(args)),
    },
  ];
  return zipStore(entries);
}

export async function exportAoaWorkbookWeb(
  args: ExportAoaWorkbookWebArgs,
): Promise<void> {
  const workbookBytes = buildAoaXlsxWorkbook(args);
  const workbookBuffer = new ArrayBuffer(workbookBytes.byteLength);
  new Uint8Array(workbookBuffer).set(workbookBytes);
  const blob = new Blob([workbookBuffer], { type: XLSX_MIME });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = canonicalDownloadName(args.downloadName);
  document.body.appendChild(anchor);
  try {
    anchor.click();
  } finally {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }
}
