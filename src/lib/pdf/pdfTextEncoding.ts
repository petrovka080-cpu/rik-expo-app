const CYRILLIC_UPPER_GLYPHS = [
  "afii10017",
  "afii10018",
  "afii10019",
  "afii10020",
  "afii10021",
  "afii10022",
  "afii10024",
  "afii10025",
  "afii10026",
  "afii10027",
  "afii10028",
  "afii10029",
  "afii10030",
  "afii10031",
  "afii10032",
  "afii10033",
  "afii10034",
  "afii10035",
  "afii10036",
  "afii10037",
  "afii10038",
  "afii10039",
  "afii10040",
  "afii10041",
  "afii10042",
  "afii10043",
  "afii10044",
  "afii10045",
  "afii10046",
  "afii10047",
  "afii10048",
  "afii10049",
];

const CYRILLIC_LOWER_GLYPHS = [
  "afii10065",
  "afii10066",
  "afii10067",
  "afii10068",
  "afii10069",
  "afii10070",
  "afii10072",
  "afii10073",
  "afii10074",
  "afii10075",
  "afii10076",
  "afii10077",
  "afii10078",
  "afii10079",
  "afii10080",
  "afii10081",
  "afii10082",
  "afii10083",
  "afii10084",
  "afii10085",
  "afii10086",
  "afii10087",
  "afii10088",
  "afii10089",
  "afii10090",
  "afii10091",
  "afii10092",
  "afii10093",
  "afii10094",
  "afii10095",
  "afii10096",
  "afii10097",
];

function hexByte(value: number): string {
  return value.toString(16).toUpperCase().padStart(2, "0");
}

function unicodeHex(value: number): string {
  return value.toString(16).toUpperCase().padStart(4, "0");
}

export function encodePdfUnicodeTextHex(value: string): string {
  let hex = "";
  for (const char of Array.from(value || " ")) {
    const codePoint = char.codePointAt(0) ?? 0x20;
    hex += codePoint > 0xffff ? "003F" : unicodeHex(codePoint);
  }
  return hex || "0020";
}

function normalizeVisualPdfText(value: string): string {
  return String(value || " ")
    .replace(/\u00A0/g, " ")
    .replace(/[–—−]/g, "-")
    .replace(/…/g, "...")
    .replace(/•/g, "-")
    .replace(/[“”]/g, "\"")
    .replace(/[‘’]/g, "'")
    .replace(/×/g, "x")
    .replace(/м²/g, "м2")
    .replace(/м³/g, "м3")
    .replace(/₽/g, "RUB");
}

function win1251BytesForChar(char: string): number[] {
  const code = char.codePointAt(0) ?? 0x20;
  if (code >= 0x20 && code <= 0x7e) return [code];
  if (char === "\n" || char === "\r" || char === "\t") return [0x20];
  if (char === "Ё") return [0xa8];
  if (char === "ё") return [0xb8];
  if (char === "№") return [0xb9];
  if (char === "«") return [0xab];
  if (char === "»") return [0xbb];
  if (char === "°") return [0xb0];
  if (char === "±") return [0xb1];
  if (code >= 0x0410 && code <= 0x042f) return [0xc0 + code - 0x0410];
  if (code >= 0x0430 && code <= 0x044f) return [0xe0 + code - 0x0430];
  return [0x3f];
}

export function encodePdfWin1251TextHex(value: string): string {
  let hex = "";
  for (const char of Array.from(normalizeVisualPdfText(value))) {
    for (const byte of win1251BytesForChar(char)) {
      hex += hexByte(byte);
    }
  }
  return hex || "20";
}

export function buildPdfCyrillicEncodingObjectBody(): string {
  return [
    "<< /Type /Encoding /BaseEncoding /WinAnsiEncoding /Differences [",
    "168 /afii10023",
    "184 /afii10071",
    "185 /afii61352",
    `192 ${CYRILLIC_UPPER_GLYPHS.map((glyph) => `/${glyph}`).join(" ")}`,
    `224 ${CYRILLIC_LOWER_GLYPHS.map((glyph) => `/${glyph}`).join(" ")}`,
    "] >>",
  ].join(" ");
}

export function buildPdfTextOperators(args: {
  x: number;
  y: number;
  size: number;
  visibleText: string;
  visibleTextHex?: string;
  extractText?: string;
  visibleFontName?: string;
  extractFontName?: string;
}): string {
  const visibleFontName = args.visibleFontName ?? "F2";
  const extractFontName = args.extractFontName ?? "F1";
  const visible = String(args.visibleText || " ").replace(/\r/g, " ").replace(/\t/g, " ").trim() || " ";
  const extract = String(args.extractText ?? args.visibleText ?? " ").replace(/\r/g, " ").replace(/\t/g, " ").trim() || " ";
  const visibleHex = args.visibleTextHex || encodePdfUnicodeTextHex(visible);
  return [
    `BT /${visibleFontName} ${args.size} Tf 0 Tr 1 0 0 1 ${args.x} ${args.y} Tm [<${visibleHex}>] TJ ET`,
    `BT /${extractFontName} ${args.size} Tf 3 Tr 1 0 0 1 ${args.x} ${args.y} Tm <${encodePdfUnicodeTextHex(extract)}> Tj ET`,
  ].join("\n");
}
