import { PDF_INTER_REGULAR_TTF_BASE64_CHUNKS } from "./embeddedInterRegularFont";

type PdfObject = { id: number; body: string };

type CmapFormat4 = {
  format: 4;
  offset: number;
  segCount: number;
  endCodeOffset: number;
  startCodeOffset: number;
  idDeltaOffset: number;
  idRangeOffsetOffset: number;
};

type CmapFormat12 = {
  format: 12;
  offset: number;
  nGroups: number;
};

type ParsedCmap = CmapFormat4 | CmapFormat12;

let fontBytesCache: Uint8Array | null = null;
let fontBinaryStringCache: string | null = null;
let parsedCmapCache: ParsedCmap | null = null;
const glyphIdCache = new Map<number, number>();

function base64ToBytes(base64: string): Uint8Array {
  const clean = base64.replace(/\s+/g, "");
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const bytes: number[] = [];
  for (let index = 0; index < clean.length; index += 4) {
    const a = alphabet.indexOf(clean[index]);
    const b = alphabet.indexOf(clean[index + 1]);
    const c = clean[index + 2] === "=" ? -1 : alphabet.indexOf(clean[index + 2]);
    const d = clean[index + 3] === "=" ? -1 : alphabet.indexOf(clean[index + 3]);
    const triplet = (a << 18) | (b << 12) | ((c < 0 ? 0 : c) << 6) | (d < 0 ? 0 : d);
    bytes.push((triplet >> 16) & 255);
    if (c >= 0) bytes.push((triplet >> 8) & 255);
    if (d >= 0) bytes.push(triplet & 255);
  }
  return new Uint8Array(bytes);
}

function readU16(bytes: Uint8Array, offset: number): number {
  return ((bytes[offset] ?? 0) << 8) | (bytes[offset + 1] ?? 0);
}

function readI16(bytes: Uint8Array, offset: number): number {
  const value = readU16(bytes, offset);
  return value & 0x8000 ? value - 0x10000 : value;
}

function readU32(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] ?? 0) * 0x1000000) +
    ((bytes[offset + 1] ?? 0) << 16) +
    ((bytes[offset + 2] ?? 0) << 8) +
    (bytes[offset + 3] ?? 0)
  ) >>> 0;
}

function readTag(bytes: Uint8Array, offset: number): string {
  return String.fromCharCode(bytes[offset] ?? 0, bytes[offset + 1] ?? 0, bytes[offset + 2] ?? 0, bytes[offset + 3] ?? 0);
}

function bytesToPdfBinaryString(bytes: Uint8Array): string {
  let result = "";
  const chunkSize = 8192;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    result += String.fromCharCode(...bytes.slice(index, index + chunkSize));
  }
  return result;
}

export function getPdfInterRegularFontBytes(): Uint8Array {
  if (!fontBytesCache) {
    fontBytesCache = base64ToBytes(PDF_INTER_REGULAR_TTF_BASE64_CHUNKS.join(""));
  }
  return fontBytesCache;
}

function getPdfInterRegularFontBinaryString(): string {
  if (!fontBinaryStringCache) {
    fontBinaryStringCache = bytesToPdfBinaryString(getPdfInterRegularFontBytes());
  }
  return fontBinaryStringCache;
}

function tableOffset(bytes: Uint8Array, tag: string): number {
  const numTables = readU16(bytes, 4);
  for (let index = 0; index < numTables; index += 1) {
    const recordOffset = 12 + index * 16;
    if (readTag(bytes, recordOffset) === tag) return readU32(bytes, recordOffset + 8);
  }
  throw new Error(`Embedded PDF font table not found: ${tag}`);
}

function parseCmap(bytes: Uint8Array): ParsedCmap {
  if (parsedCmapCache) return parsedCmapCache;
  const cmapOffset = tableOffset(bytes, "cmap");
  const numTables = readU16(bytes, cmapOffset + 2);
  const candidates: { score: number; offset: number; format: number }[] = [];
  for (let index = 0; index < numTables; index += 1) {
    const recordOffset = cmapOffset + 4 + index * 8;
    const platformId = readU16(bytes, recordOffset);
    const encodingId = readU16(bytes, recordOffset + 2);
    const subtableOffset = cmapOffset + readU32(bytes, recordOffset + 4);
    const format = readU16(bytes, subtableOffset);
    let score = 0;
    if (format === 12 && platformId === 3 && encodingId === 10) score = 100;
    else if (format === 4 && platformId === 3 && encodingId === 1) score = 90;
    else if (format === 4 && platformId === 0) score = 80;
    else if (format === 12) score = 70;
    else if (format === 4) score = 60;
    if (score > 0) candidates.push({ score, offset: subtableOffset, format });
  }
  const selected = candidates.sort((left, right) => right.score - left.score)[0];
  if (!selected) throw new Error("Embedded PDF font has no usable Unicode cmap.");
  if (selected.format === 12) {
    parsedCmapCache = { format: 12, offset: selected.offset, nGroups: readU32(bytes, selected.offset + 12) };
    return parsedCmapCache;
  }
  const segCount = readU16(bytes, selected.offset + 6) / 2;
  const endCodeOffset = selected.offset + 14;
  const startCodeOffset = endCodeOffset + segCount * 2 + 2;
  const idDeltaOffset = startCodeOffset + segCount * 2;
  const idRangeOffsetOffset = idDeltaOffset + segCount * 2;
  parsedCmapCache = {
    format: 4,
    offset: selected.offset,
    segCount,
    endCodeOffset,
    startCodeOffset,
    idDeltaOffset,
    idRangeOffsetOffset,
  };
  return parsedCmapCache;
}

function glyphIdForFormat4(bytes: Uint8Array, cmap: CmapFormat4, codePoint: number): number {
  for (let index = 0; index < cmap.segCount; index += 1) {
    const endCode = readU16(bytes, cmap.endCodeOffset + index * 2);
    if (codePoint > endCode) continue;
    const startCode = readU16(bytes, cmap.startCodeOffset + index * 2);
    if (codePoint < startCode) return 0;
    const idDelta = readI16(bytes, cmap.idDeltaOffset + index * 2);
    const idRangeOffsetAddress = cmap.idRangeOffsetOffset + index * 2;
    const idRangeOffset = readU16(bytes, idRangeOffsetAddress);
    if (idRangeOffset === 0) return (codePoint + idDelta) & 0xffff;
    const glyphAddress = idRangeOffsetAddress + idRangeOffset + (codePoint - startCode) * 2;
    const glyph = readU16(bytes, glyphAddress);
    return glyph === 0 ? 0 : (glyph + idDelta) & 0xffff;
  }
  return 0;
}

function glyphIdForFormat12(bytes: Uint8Array, cmap: CmapFormat12, codePoint: number): number {
  for (let index = 0; index < cmap.nGroups; index += 1) {
    const groupOffset = cmap.offset + 16 + index * 12;
    const startCharCode = readU32(bytes, groupOffset);
    const endCharCode = readU32(bytes, groupOffset + 4);
    if (codePoint < startCharCode) return 0;
    if (codePoint <= endCharCode) return readU32(bytes, groupOffset + 8) + codePoint - startCharCode;
  }
  return 0;
}

function glyphIdForCodePoint(bytes: Uint8Array, cmap: ParsedCmap, codePoint: number): number {
  if (codePoint <= 0 || codePoint > 0xffff) return 0;
  return cmap.format === 12
    ? glyphIdForFormat12(bytes, cmap, codePoint)
    : glyphIdForFormat4(bytes, cmap, codePoint);
}

export function collectPdfTextCodePoints(lines: string[]): number[] {
  const points = new Set<number>();
  for (const char of Array.from(lines.join("\n"))) {
    const codePoint = char.codePointAt(0);
    if (codePoint !== undefined && codePoint > 0 && codePoint <= 0xffff) points.add(codePoint);
  }
  points.add(0x20);
  points.add(0x3f);
  return [...points].sort((left, right) => left - right);
}

function glyphIdForVisibleCodePoint(codePoint: number): number {
  const cached = glyphIdCache.get(codePoint);
  if (cached !== undefined) return cached;
  const bytes = getPdfInterRegularFontBytes();
  const cmap = parseCmap(bytes);
  const glyphId = glyphIdForCodePoint(bytes, cmap, codePoint);
  const resolved = glyphId > 0 ? glyphId : glyphIdForCodePoint(bytes, cmap, 0x3f) || 0;
  glyphIdCache.set(codePoint, resolved);
  return resolved;
}

export function encodePdfInterGlyphTextHex(value: string): string {
  let hex = "";
  for (const char of Array.from(value || " ")) {
    const codePoint = char.codePointAt(0) ?? 0x20;
    const glyphId = codePoint > 0xffff ? glyphIdForVisibleCodePoint(0x3f) : glyphIdForVisibleCodePoint(codePoint);
    hex += glyphId.toString(16).toUpperCase().padStart(4, "0");
  }
  return hex || glyphIdForVisibleCodePoint(0x20).toString(16).toUpperCase().padStart(4, "0");
}

function buildCidToGidMap(codePoints: number[]): Uint8Array {
  const maxCid = Math.max(0x3f, ...codePoints);
  const map = new Uint8Array((maxCid + 1) * 2);
  for (const cid of codePoints) {
    const glyphId = glyphIdForVisibleCodePoint(cid);
    map[cid * 2] = (glyphId >> 8) & 0xff;
    map[cid * 2 + 1] = glyphId & 0xff;
  }
  return map;
}

export function buildEmbeddedInterPdfFontObjects(input: {
  descriptorId: number;
  fontFileId: number;
  cidToGidMapId: number;
  cidFontId: number;
  type0FontId: number;
  codePoints: number[];
}): PdfObject[] {
  const fontBytes = getPdfInterRegularFontBytes();
  const cidMap = buildCidToGidMap(input.codePoints);
  return [
    {
      id: input.descriptorId,
      body: `<< /Type /FontDescriptor /FontName /InterRegular /Flags 4 /FontBBox [-772 -239 2958 1047] /ItalicAngle 0 /Ascent 969 /Descent -241 /CapHeight 728 /StemV 80 /FontFile2 ${input.fontFileId} 0 R >>`,
    },
    {
      id: input.fontFileId,
      body: `<< /Length ${fontBytes.length} /Length1 ${fontBytes.length} >>\nstream\n${getPdfInterRegularFontBinaryString()}\nendstream`,
    },
    {
      id: input.cidToGidMapId,
      body: `<< /Length ${cidMap.length} >>\nstream\n${bytesToPdfBinaryString(cidMap)}\nendstream`,
    },
    {
      id: input.cidFontId,
      body: `<< /Type /Font /Subtype /CIDFontType2 /BaseFont /InterRegular /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor ${input.descriptorId} 0 R /CIDToGIDMap /Identity /DW 500 >>`,
    },
    {
      id: input.type0FontId,
      body: `<< /Type /Font /Subtype /Type0 /BaseFont /InterRegular /Encoding /Identity-H /DescendantFonts [${input.cidFontId} 0 R] >>`,
    },
  ];
}
