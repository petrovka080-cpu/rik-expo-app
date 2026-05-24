import type { EstimatePdfValidationResult } from "./estimatePdfTypes";

const MOJIBAKE_TOKENS = ["Ð", "Ñ", "�"];
const BAD_TEXT_TOKENS = ["undefined", "[object Object]", "NaN", "null null"];
const HARD_FAIL_MOJIBAKE_TOKENS = ["\u00D0", "\u00D1", "\uFFFD"];
const KNOWN_WORK_KEYS = new Set([
  "asphalt_paving",
  "carpet_laying",
  "drywall_partition",
  "drywall_ceiling",
  "gable_roof_installation",
  "brick_masonry",
]);

const GENERIC_ROW_PATTERNS = [
  /Основной материал:\s*Строительные работы/i,
  /Подготовка:\s*Строительные работы/i,
  /^Строительные работы$/i,
  /Материалы:\s*Строительные работы/i,
  /Работы:\s*Строительные работы/i,
];

function bytesToAscii(bytes: Uint8Array): string {
  let result = "";
  const chunkSize = 8192;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    result += String.fromCharCode(...bytes.slice(index, index + chunkSize));
  }
  return result;
}

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

export function estimatePdfInputToBytes(input: Uint8Array | string): Uint8Array {
  if (input instanceof Uint8Array) return input;
  if (input.startsWith("data:application/pdf;base64,")) {
    return base64ToBytes(input.slice("data:application/pdf;base64,".length));
  }
  if (input.startsWith("data:application/pdf")) {
    const comma = input.indexOf(",");
    const encoded = comma >= 0 ? input.slice(comma + 1) : "";
    return new TextEncoder().encode(decodeURIComponent(encoded));
  }
  return new TextEncoder().encode(input);
}

function decodePdfTextHex(hex: string): string {
  let output = "";
  for (let index = 0; index + 3 < hex.length; index += 4) {
    const code = Number.parseInt(hex.slice(index, index + 4), 16);
    output += Number.isFinite(code) ? String.fromCharCode(code) : "";
  }
  return output;
}

export function extractEstimatePdfText(input: Uint8Array | string): string {
  const body = bytesToAscii(estimatePdfInputToBytes(input));
  const lines: string[] = [];
  const regex = /<([0-9A-Fa-f]{4,})>\s*Tj/g;
  let match = regex.exec(body);
  while (match) {
    lines.push(decodePdfTextHex(match[1]));
    match = regex.exec(body);
  }
  return lines.join("\n").trim();
}

function hasReadableCyrillic(text: string): boolean {
  return /[А-Яа-яЁё]/.test(text);
}

function hasGenericKnownWorkRow(text: string, knownWorkKey?: string): boolean {
  if (!knownWorkKey || !KNOWN_WORK_KEYS.has(knownWorkKey)) return false;
  return text
    .split(/\r?\n/)
    .filter((line) => /^\s*\d+(?:\.\d+)?\s*\|/.test(line) || /^\s*\d+(?:\.\d+)?\s+/.test(line))
    .some((line) => GENERIC_ROW_PATTERNS.some((pattern) => pattern.test(line.trim())));
}

function normalizeRequiredText(value: string): string {
  return value.replace(/\u00A0/g, " ").replace(/\u00C2\s/g, " ");
}

export function validateEstimatePdf(input: {
  pdf: Uint8Array | string;
  knownWorkKey?: string;
  requiredText?: string[];
}): EstimatePdfValidationResult {
  const bytes = estimatePdfInputToBytes(input.pdf);
  const body = bytesToAscii(bytes);
  const text = extractEstimatePdfText(bytes);
  const failures: string[] = [];
  const binaryValid = body.startsWith("%PDF-");
  const eofPresent = body.includes("%%EOF");
  const textExtractable = text.length > 20;
  const cyrillicReadable = hasReadableCyrillic(text);
  const mojibakeFound = [...MOJIBAKE_TOKENS, ...HARD_FAIL_MOJIBAKE_TOKENS].some((token) => text.includes(token));
  const blankText = text.trim().length === 0;
  const genericConstructionRowsFound = hasGenericKnownWorkRow(text, input.knownWorkKey);
  const normalizedText = normalizeRequiredText(text);
  const requiredTextMissing = (input.requiredText ?? []).filter((token) => !normalizedText.includes(normalizeRequiredText(token)));

  if (!binaryValid) failures.push("PDF_BINARY_HEADER_MISSING");
  if (!eofPresent) failures.push("PDF_EOF_MISSING");
  if (!textExtractable) failures.push("PDF_TEXT_NOT_EXTRACTABLE");
  if (!cyrillicReadable) failures.push("PDF_CYRILLIC_NOT_READABLE");
  if (mojibakeFound) failures.push("PDF_MOJIBAKE_FOUND");
  if (blankText) failures.push("PDF_BLANK_TEXT");
  if (genericConstructionRowsFound) failures.push("GENERIC_CONSTRUCTION_ROW_FOR_KNOWN_WORK");
  for (const token of requiredTextMissing) {
    failures.push(`PDF_REQUIRED_TEXT_MISSING:${token}`);
  }
  for (const token of BAD_TEXT_TOKENS) {
    if (text.includes(token)) failures.push(`PDF_BAD_TEXT_TOKEN:${token}`);
  }

  return {
    valid: failures.length === 0,
    text,
    failures,
    details: {
      binaryValid,
      eofPresent,
      textExtractable,
      cyrillicReadable,
      mojibakeFound,
      blankText,
      genericConstructionRowsFound,
      requiredTextMissing,
    },
  };
}
